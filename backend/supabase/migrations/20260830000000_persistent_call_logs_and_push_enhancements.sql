-- ============================================================================
-- NAIJAPINS
-- Persistent Call Logs & Unique Constraints Architecture
-- Migration: 20260830000000_persistent_call_logs_and_push_enhancements.sql
-- ============================================================================

BEGIN;

-- 1. Ensure public.calls columns exist
ALTER TABLE public.calls
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc', now());

ALTER TABLE public.calls
ADD COLUMN IF NOT EXISTS ended_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL;

ALTER TABLE public.calls
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0;

-- 2. Extend public.messages with call_id foreign key
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS call_id UUID REFERENCES public.calls(id) ON DELETE SET NULL;

-- 3. Database-level partial unique index to guarantee single call log per call
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_unique_call_id
ON public.messages(call_id)
WHERE call_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_message_type
ON public.messages(message_type);


-- 4. Atomic, Idempotent RPC to log finished calls
CREATE OR REPLACE FUNCTION public.log_call_completion(
    p_call_id UUID,
    p_final_status TEXT,
    p_duration_seconds INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_call RECORD;
    v_msg_id UUID;
    v_content TEXT;
    v_now TIMESTAMPTZ := timezone('utc', now());
    v_existing_msg RECORD;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Fetch the call record
    SELECT * INTO v_call
    FROM public.calls
    WHERE id = p_call_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Call record not found';
    END IF;

    -- Ensure caller or receiver is ending/logging the call
    IF v_call.caller_id != v_user_id AND v_call.receiver_id != v_user_id THEN
        RAISE EXCEPTION 'You are not a participant in this call';
    END IF;

    -- Update public.calls record
    UPDATE public.calls
    SET 
        status = p_final_status,
        ended_at = v_now,
        ended_by = v_user_id,
        duration_seconds = GREATEST(COALESCE(p_duration_seconds, 0), 0),
        updated_at = v_now
    WHERE id = p_call_id;

    -- Check if a call message for this call_id already exists
    SELECT * INTO v_existing_msg
    FROM public.messages
    WHERE call_id = p_call_id
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'message_id', v_existing_msg.id,
            'call_id', p_call_id,
            'already_logged', true
        );
    END IF;

    -- Build structured JSON content for the call log
    v_content := jsonb_build_object(
        'call_id', v_call.id,
        'conversation_id', v_call.conversation_id,
        'caller_id', v_call.caller_id,
        'receiver_id', v_call.receiver_id,
        'call_type', v_call.call_type,
        'status', p_final_status,
        'duration_seconds', GREATEST(COALESCE(p_duration_seconds, 0), 0),
        'started_at', v_call.started_at,
        'ended_at', v_now
    )::text;

    -- Insert into messages with ON CONFLICT safety
    INSERT INTO public.messages (
        conversation_id,
        sender_id,
        content,
        message_type,
        call_id,
        is_read,
        created_at
    )
    VALUES (
        v_call.conversation_id,
        v_call.caller_id,
        v_content,
        'call',
        v_call.id,
        false,
        v_now
    )
    ON CONFLICT (call_id) WHERE call_id IS NOT NULL DO NOTHING
    RETURNING id INTO v_msg_id;

    IF v_msg_id IS NULL THEN
        SELECT id INTO v_msg_id
        FROM public.messages
        WHERE call_id = p_call_id
        LIMIT 1;
    END IF;

    -- Update conversation updated_at
    UPDATE public.conversations
    SET updated_at = v_now
    WHERE id = v_call.conversation_id;

    RETURN jsonb_build_object(
        'success', true,
        'message_id', v_msg_id,
        'call_id', p_call_id,
        'already_logged', false
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_call_completion(UUID, TEXT, INTEGER) TO authenticated;


-- 5. RLS Policy on public.calls to ensure call participants & conversation members can access
DROP POLICY IF EXISTS "Conversation participants can select calls" ON public.calls;
CREATE POLICY "Conversation participants can select calls"
    ON public.calls
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = caller_id 
        OR auth.uid() = receiver_id
        OR (conversation_id IS NOT NULL AND public.is_conversation_member(conversation_id, auth.uid()))
    );

COMMIT;
