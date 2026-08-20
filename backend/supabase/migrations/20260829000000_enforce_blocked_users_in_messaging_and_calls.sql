-- ============================================================================
-- NAIJAPINS
-- Enforce Blocked Users in Messaging and Realtime Calls at Database & RLS Level
-- Migration: 20260829000000_enforce_blocked_users_in_messaging_and_calls.sql
-- ============================================================================

BEGIN;

-- 1. Helper: Are Users Mutually Blocked (Dynamic check against blocked_users)
CREATE OR REPLACE FUNCTION public.are_users_mutually_blocked(
    p_user_a UUID,
    p_user_b UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.blocked_users
        WHERE (blocker_id = p_user_a AND blocked_user_id = p_user_b)
           OR (blocker_id = p_user_b AND blocked_user_id = p_user_a)
    );
$$;

REVOKE ALL ON FUNCTION public.are_users_mutually_blocked(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.are_users_mutually_blocked(UUID, UUID) TO authenticated, service_role;


-- 2. Helper: Is Conversation Blocked for Sender (Dynamic check)
CREATE OR REPLACE FUNCTION public.is_conversation_blocked_for_sender(
    p_conversation_id UUID,
    p_sender_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_blocked BOOLEAN := false;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.conversation_members cm
        JOIN public.blocked_users bu
          ON (bu.blocker_id = p_sender_id AND bu.blocked_user_id = cm.user_id)
          OR (bu.blocker_id = cm.user_id AND bu.blocked_user_id = p_sender_id)
        WHERE cm.conversation_id = p_conversation_id
        AND cm.user_id <> p_sender_id
    ) INTO v_blocked;

    RETURN v_blocked;
END;
$$;

REVOKE ALL ON FUNCTION public.is_conversation_blocked_for_sender(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_conversation_blocked_for_sender(UUID, UUID) TO authenticated, service_role;


-- 3. Secure RPC: Get Mutual Block Status
CREATE OR REPLACE FUNCTION public.get_mutual_block_status(
    p_target_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_is_blocked_by_me BOOLEAN := false;
    v_is_blocked_by_them BOOLEAN := false;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'is_blocked_by_me', false,
            'is_blocked_by_them', false,
            'is_blocked', false
        );
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.blocked_users
        WHERE blocker_id = v_user_id AND blocked_user_id = p_target_user_id
    ) INTO v_is_blocked_by_me;

    SELECT EXISTS (
        SELECT 1 FROM public.blocked_users
        WHERE blocker_id = p_target_user_id AND blocked_user_id = v_user_id
    ) INTO v_is_blocked_by_them;

    RETURN jsonb_build_object(
        'is_blocked_by_me', v_is_blocked_by_me,
        'is_blocked_by_them', v_is_blocked_by_them,
        'is_blocked', (v_is_blocked_by_me OR v_is_blocked_by_them)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_mutual_block_status(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_mutual_block_status(UUID) TO authenticated;


-- 4. Block User RPC
CREATE OR REPLACE FUNCTION public.block_my_user(
    p_target_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_target_user_id IS NULL THEN
        RAISE EXCEPTION 'Target user is required';
    END IF;

    IF v_user_id = p_target_user_id THEN
        RAISE EXCEPTION 'Cannot block yourself';
    END IF;

    INSERT INTO public.blocked_users (
        blocker_id,
        blocked_user_id
    )
    VALUES (
        v_user_id,
        p_target_user_id
    )
    ON CONFLICT (blocker_id, blocked_user_id)
    DO NOTHING;

    RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.block_my_user(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.block_my_user(UUID) TO authenticated;

-- Alias for compatibility
CREATE OR REPLACE FUNCTION public.block_user(p_target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN public.block_my_user(p_target_user_id);
END;
$$;

REVOKE ALL ON FUNCTION public.block_user(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.block_user(UUID) TO authenticated;


-- 5. Unblock User RPC (Removes row completely from single source of truth)
CREATE OR REPLACE FUNCTION public.unblock_my_user(
    p_target_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_target_user_id IS NULL THEN
        RAISE EXCEPTION 'Target user is required';
    END IF;

    DELETE FROM public.blocked_users
    WHERE blocker_id = v_user_id
    AND blocked_user_id = p_target_user_id;

    RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.unblock_my_user(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unblock_my_user(UUID) TO authenticated;

-- Alias for compatibility
CREATE OR REPLACE FUNCTION public.unblock_user(p_target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN public.unblock_my_user(p_target_user_id);
END;
$$;

REVOKE ALL ON FUNCTION public.unblock_user(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unblock_user(UUID) TO authenticated;


-- 6. Secure RPC: Send My Message (Dynamic Block Check)
CREATE OR REPLACE FUNCTION public.send_my_message(
    p_conversation_id UUID,
    p_content TEXT,
    p_attachments JSONB DEFAULT '[]'::jsonb,
    p_reply_to_id UUID DEFAULT NULL,
    p_message_type TEXT DEFAULT 'text'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_now TIMESTAMPTZ := timezone('utc', now());
    v_trimmed TEXT := trim(COALESCE(p_content, ''));
    v_attachments JSONB := COALESCE(p_attachments, '[]'::jsonb);
    v_msg RECORD;
    v_sender RECORD;
BEGIN
    -- A. Authentication Check
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- B. Empty Content & Attachment Check
    IF v_trimmed = '' AND jsonb_array_length(v_attachments) = 0 THEN
        RAISE EXCEPTION 'Message cannot be empty';
    END IF;

    -- C. Conversation Membership Check
    IF NOT public.is_conversation_member(p_conversation_id, v_user_id) THEN
        RAISE EXCEPTION 'You are not a member of this conversation';
    END IF;

    -- D. Dynamic Block Enforcement Check
    IF public.is_conversation_blocked_for_sender(p_conversation_id, v_user_id) THEN
        RAISE EXCEPTION 'You cannot send messages because communication between these users is blocked';
    END IF;

    -- E. Insert Message
    INSERT INTO public.messages (
        conversation_id,
        sender_id,
        content,
        attachments,
        reply_to_message_id,
        message_type,
        is_read,
        read_at,
        delivered_at,
        created_at,
        updated_at
    )
    VALUES (
        p_conversation_id,
        v_user_id,
        v_trimmed,
        v_attachments,
        p_reply_to_id,
        COALESCE(p_message_type, 'text'),
        false,
        NULL,
        NULL,
        v_now,
        v_now
    )
    RETURNING * INTO v_msg;

    -- F. Update Conversation Timestamp
    UPDATE public.conversations
    SET updated_at = v_now
    WHERE id = p_conversation_id;

    -- G. Load Sender Profile
    SELECT *
    INTO v_sender
    FROM public.profiles
    WHERE user_id = v_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', jsonb_build_object(
            'id', v_msg.id,
            'conversation_id', v_msg.conversation_id,
            'sender_id', v_msg.sender_id,
            'content', v_msg.content,
            'attachments', v_msg.attachments,
            'reply_to_message_id', v_msg.reply_to_message_id,
            'message_type', v_msg.message_type,
            'is_read', v_msg.is_read,
            'read_at', v_msg.read_at,
            'delivered_at', v_msg.delivered_at,
            'created_at', v_msg.created_at,
            'updated_at', v_msg.updated_at,
            'status', 'sent',
            'sender', to_jsonb(v_sender)
        )
    );
END;
$$;

REVOKE ALL ON FUNCTION public.send_my_message(UUID, TEXT, JSONB, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_my_message(UUID, TEXT, JSONB, UUID, TEXT) TO authenticated;


-- 7. Clean all conflicting INSERT policies on public.messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Conversation members can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages to their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Prevent message insertion if blocked" ON public.messages;

CREATE POLICY "Prevent message insertion if blocked"
    ON public.messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = sender_id
        AND public.is_conversation_member(conversation_id, auth.uid())
        AND NOT public.is_conversation_blocked_for_sender(conversation_id, auth.uid())
    );


-- 8. Secure RPC: Initiate Call Record
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc', now());

CREATE OR REPLACE FUNCTION public.initiate_my_call_record(
    p_conversation_id UUID,
    p_receiver_id UUID,
    p_call_type TEXT DEFAULT 'voice'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_call_id UUID;
    v_now TIMESTAMPTZ := timezone('utc', now());
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_receiver_id IS NULL THEN
        RAISE EXCEPTION 'Receiver ID is required';
    END IF;

    IF v_user_id = p_receiver_id THEN
        RAISE EXCEPTION 'Cannot call yourself';
    END IF;

    -- Dynamic Block Enforcement
    IF public.are_users_mutually_blocked(v_user_id, p_receiver_id) THEN
        RAISE EXCEPTION 'Cannot start call because communication between these users is blocked';
    END IF;

    INSERT INTO public.calls (
        conversation_id,
        caller_id,
        receiver_id,
        call_type,
        status,
        started_at,
        created_at
    )
    VALUES (
        p_conversation_id,
        v_user_id,
        p_receiver_id,
        p_call_type,
        'ringing',
        v_now,
        v_now
    )
    RETURNING id INTO v_call_id;

    RETURN jsonb_build_object(
        'success', true,
        'call_id', v_call_id
    );
END;
$$;

REVOKE ALL ON FUNCTION public.initiate_my_call_record(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.initiate_my_call_record(UUID, UUID, TEXT) TO authenticated;


-- 9. Clean all conflicting INSERT policies on public.calls
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Conversation members can create calls" ON public.calls;
DROP POLICY IF EXISTS "Users can initiate calls" ON public.calls;
DROP POLICY IF EXISTS "Prevent call creation if blocked" ON public.calls;

CREATE POLICY "Prevent call creation if blocked"
    ON public.calls
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = caller_id
        AND NOT public.are_users_mutually_blocked(caller_id, receiver_id)
    );


-- 10. Fix SELECT policy on blocked_users so both parties can query their mutual block state
DROP POLICY IF EXISTS "Users can view their blocked users" ON public.blocked_users;
DROP POLICY IF EXISTS "Users can view relevant blocked users" ON public.blocked_users;

CREATE POLICY "Users can view relevant blocked users"
    ON public.blocked_users
    FOR SELECT
    TO authenticated
    USING (
        blocker_id = auth.uid() OR blocked_user_id = auth.uid()
    );

NOTIFY pgrst, 'reload schema';

COMMIT;
