-- ============================================================================
-- NAIJAPINS
-- FINAL PRODUCTION-SAFE SOCIAL MESSAGING MIGRATION
-- Version: 20260827000000
--
-- IMPORTANT:
-- This migration intentionally DOES NOT:
--   - DROP is_conversation_member()
--   - DROP existing conversation RLS policies
--   - CHANGE existing RPC parameter names
--   - RECREATE existing get_or_create_direct_conversation(UUID)
--
-- It adds/fixes messaging functionality without creating PostgreSQL
-- function-signature conflicts.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. PROFILES — ONLINE / LAST SEEN
-- ============================================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

UPDATE public.profiles
SET last_seen_at = COALESCE(last_seen_at, timezone('utc', now()))
WHERE last_seen_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at
ON public.profiles(last_seen_at DESC);


-- ============================================================================
-- 2. MESSAGES — DELIVERY, READ, EDIT, DELETE, REPLY, ATTACHMENTS
-- ============================================================================

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS deleted_for_all BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS deleted_by UUID[] NOT NULL DEFAULT ARRAY[]::UUID[];

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS reply_to_message_id UUID;

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text';


-- Add FK only if it doesn't already exist.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'messages_reply_to_message_id_fkey'
          AND conrelid = 'public.messages'::regclass
    ) THEN

        ALTER TABLE public.messages
        ADD CONSTRAINT messages_reply_to_message_id_fkey
        FOREIGN KEY (reply_to_message_id)
        REFERENCES public.messages(id)
        ON DELETE SET NULL;

    END IF;
END
$$;


CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
ON public.messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_delivery
ON public.messages(conversation_id, delivered_at);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_read
ON public.messages(conversation_id, is_read);

CREATE INDEX IF NOT EXISTS idx_messages_reply
ON public.messages(reply_to_message_id)
WHERE reply_to_message_id IS NOT NULL;


-- ============================================================================
-- 3. CONVERSATION MEMBERS
-- ============================================================================

ALTER TABLE public.conversation_members
ADD COLUMN IF NOT EXISTS last_delivered_at TIMESTAMPTZ;

ALTER TABLE public.conversation_members
ADD COLUMN IF NOT EXISTS is_muted BOOLEAN NOT NULL DEFAULT false;


-- ============================================================================
-- 4. MESSAGE REACTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    message_id UUID NOT NULL
        REFERENCES public.messages(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES public.profiles(user_id)
        ON DELETE CASCADE,

    reaction TEXT NOT NULL
        CHECK (char_length(trim(reaction)) BETWEEN 1 AND 32),

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT timezone('utc', now()),

    CONSTRAINT message_reactions_unique
        UNIQUE (message_id, user_id, reaction)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message
ON public.message_reactions(message_id);

CREATE INDEX IF NOT EXISTS idx_message_reactions_user
ON public.message_reactions(user_id);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 5. BLOCKED USERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.blocked_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    blocker_id UUID NOT NULL
        REFERENCES public.profiles(user_id)
        ON DELETE CASCADE,

    blocked_user_id UUID NOT NULL
        REFERENCES public.profiles(user_id)
        ON DELETE CASCADE,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT timezone('utc', now()),

    CONSTRAINT blocked_users_unique
        UNIQUE(blocker_id, blocked_user_id),

    CONSTRAINT blocked_users_no_self
        CHECK(blocker_id <> blocked_user_id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker
ON public.blocked_users(blocker_id);

CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked
ON public.blocked_users(blocked_user_id);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 6. REACTION RLS
-- ============================================================================

DROP POLICY IF EXISTS "Conversation members can view message reactions"
ON public.message_reactions;

CREATE POLICY "Conversation members can view message reactions"
ON public.message_reactions
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.messages m
        WHERE m.id = message_reactions.message_id
        AND public.is_conversation_member(
            m.conversation_id,
            auth.uid()
        )
    )
);


DROP POLICY IF EXISTS "Users can add their own reactions"
ON public.message_reactions;

CREATE POLICY "Users can add their own reactions"
ON public.message_reactions
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.messages m
        WHERE m.id = message_reactions.message_id
        AND public.is_conversation_member(
            m.conversation_id,
            auth.uid()
        )
    )
);


DROP POLICY IF EXISTS "Users can remove their own reactions"
ON public.message_reactions;

CREATE POLICY "Users can remove their own reactions"
ON public.message_reactions
FOR DELETE
TO authenticated
USING (
    user_id = auth.uid()
);


-- ============================================================================
-- 7. BLOCKED USERS RLS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their blocked users"
ON public.blocked_users;

CREATE POLICY "Users can view their blocked users"
ON public.blocked_users
FOR SELECT
TO authenticated
USING (
    blocker_id = auth.uid()
);


DROP POLICY IF EXISTS "Users can block other users"
ON public.blocked_users;

CREATE POLICY "Users can block other users"
ON public.blocked_users
FOR INSERT
TO authenticated
WITH CHECK (
    blocker_id = auth.uid()
    AND blocked_user_id <> auth.uid()
);


DROP POLICY IF EXISTS "Users can unblock other users"
ON public.blocked_users;

CREATE POLICY "Users can unblock other users"
ON public.blocked_users
FOR DELETE
TO authenticated
USING (
    blocker_id = auth.uid()
);


-- ============================================================================
-- 8. SAFE RPC — START DIRECT CONVERSATION
--
-- IMPORTANT:
-- New function name intentionally avoids conflict with your existing
-- get_or_create_direct_conversation(UUID).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.start_direct_conversation(
    p_target_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_conversation_id UUID;
    v_blocked BOOLEAN;
    v_now TIMESTAMPTZ := timezone('utc', now());
BEGIN

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_target_user_id IS NULL THEN
        RAISE EXCEPTION 'Target user is required';
    END IF;

    IF v_user_id = p_target_user_id THEN
        RAISE EXCEPTION 'Cannot start a conversation with yourself';
    END IF;


    SELECT EXISTS (
        SELECT 1
        FROM public.blocked_users
        WHERE
            (
                blocker_id = v_user_id
                AND blocked_user_id = p_target_user_id
            )
            OR
            (
                blocker_id = p_target_user_id
                AND blocked_user_id = v_user_id
            )
    )
    INTO v_blocked;

    IF v_blocked THEN
        RAISE EXCEPTION 'Messaging is unavailable because one user has blocked the other';
    END IF;


    SELECT c.id
    INTO v_conversation_id
    FROM public.conversations c
    WHERE
        public.is_conversation_member(c.id, v_user_id)
        AND public.is_conversation_member(c.id, p_target_user_id)
        AND (
            SELECT COUNT(*)
            FROM public.conversation_members cm
            WHERE cm.conversation_id = c.id
        ) = 2
    LIMIT 1;


    IF v_conversation_id IS NOT NULL THEN
        RETURN v_conversation_id;
    END IF;


    INSERT INTO public.conversations (
        created_at,
        updated_at
    )
    VALUES (
        v_now,
        v_now
    )
    RETURNING id
    INTO v_conversation_id;


    INSERT INTO public.conversation_members (
        conversation_id,
        user_id,
        joined_at,
        last_read_at,
        last_delivered_at,
        is_muted
    )
    VALUES
    (
        v_conversation_id,
        v_user_id,
        v_now,
        v_now,
        v_now,
        false
    ),
    (
        v_conversation_id,
        p_target_user_id,
        v_now,
        v_now,
        v_now,
        false
    );


    RETURN v_conversation_id;

END;
$$;

REVOKE ALL
ON FUNCTION public.start_direct_conversation(UUID)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.start_direct_conversation(UUID)
TO authenticated;


-- ============================================================================
-- 9. MARK MESSAGE DELIVERY
-- ============================================================================

CREATE OR REPLACE FUNCTION public.mark_conversation_as_delivered(
    p_conversation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_now TIMESTAMPTZ := timezone('utc', now());
    v_count INTEGER := 0;
BEGIN

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF NOT public.is_conversation_member(
        p_conversation_id,
        v_user_id
    ) THEN
        RAISE EXCEPTION 'Not a member of this conversation';
    END IF;


    UPDATE public.conversation_members
    SET last_delivered_at = v_now
    WHERE conversation_id = p_conversation_id
    AND user_id = v_user_id;


    WITH updated AS (
        UPDATE public.messages
        SET
            delivered_at = v_now,
            updated_at = v_now
        WHERE conversation_id = p_conversation_id
        AND sender_id <> v_user_id
        AND delivered_at IS NULL
        RETURNING id
    )
    SELECT COUNT(*)
    INTO v_count
    FROM updated;


    RETURN jsonb_build_object(
        'success', true,
        'delivered_count', v_count,
        'timestamp', v_now
    );

END;
$$;

REVOKE ALL
ON FUNCTION public.mark_conversation_as_delivered(UUID)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.mark_conversation_as_delivered(UUID)
TO authenticated;


-- ============================================================================
-- 10. MARK CONVERSATION AS READ
-- ============================================================================

CREATE OR REPLACE FUNCTION public.mark_conversation_as_read(
    p_conversation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_now TIMESTAMPTZ := timezone('utc', now());
    v_count INTEGER := 0;
BEGIN

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF NOT public.is_conversation_member(
        p_conversation_id,
        v_user_id
    ) THEN
        RAISE EXCEPTION 'Not a member of this conversation';
    END IF;


    UPDATE public.conversation_members
    SET
        last_read_at = v_now,
        last_delivered_at = v_now
    WHERE conversation_id = p_conversation_id
    AND user_id = v_user_id;


    WITH updated AS (
        UPDATE public.messages
        SET
            is_read = true,
            read_at = v_now,
            delivered_at = COALESCE(delivered_at, v_now),
            updated_at = v_now
        WHERE conversation_id = p_conversation_id
        AND sender_id <> v_user_id
        AND (
            is_read = false
            OR read_at IS NULL
        )
        RETURNING id
    )
    SELECT COUNT(*)
    INTO v_count
    FROM updated;


    RETURN jsonb_build_object(
        'success', true,
        'read_count', v_count,
        'timestamp', v_now
    );

END;
$$;

REVOKE ALL
ON FUNCTION public.mark_conversation_as_read(UUID)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.mark_conversation_as_read(UUID)
TO authenticated;


-- ============================================================================
-- 11. UPDATE LAST SEEN
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_my_last_seen()
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_now TIMESTAMPTZ := timezone('utc', now());
BEGIN

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    UPDATE public.profiles
    SET last_seen_at = v_now
    WHERE user_id = v_user_id;

    RETURN v_now;

END;
$$;

REVOKE ALL
ON FUNCTION public.update_my_last_seen()
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.update_my_last_seen()
TO authenticated;


-- ============================================================================
-- 12. TOGGLE MUTE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.toggle_my_conversation_mute(
    p_conversation_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_muted BOOLEAN;
BEGIN

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF NOT public.is_conversation_member(
        p_conversation_id,
        v_user_id
    ) THEN
        RAISE EXCEPTION 'Not a member of this conversation';
    END IF;


    UPDATE public.conversation_members
    SET is_muted = NOT COALESCE(is_muted, false)
    WHERE conversation_id = p_conversation_id
    AND user_id = v_user_id
    RETURNING is_muted
    INTO v_muted;


    RETURN v_muted;

END;
$$;

REVOKE ALL
ON FUNCTION public.toggle_my_conversation_mute(UUID)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.toggle_my_conversation_mute(UUID)
TO authenticated;


-- ============================================================================
-- 13. TOGGLE REACTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.toggle_my_message_reaction(
    p_message_id UUID,
    p_reaction TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_conversation_id UUID;
    v_exists BOOLEAN;
BEGIN

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT conversation_id
    INTO v_conversation_id
    FROM public.messages
    WHERE id = p_message_id;


    IF v_conversation_id IS NULL THEN
        RAISE EXCEPTION 'Message not found';
    END IF;


    IF NOT public.is_conversation_member(
        v_conversation_id,
        v_user_id
    ) THEN
        RAISE EXCEPTION 'Not a member of this conversation';
    END IF;


    SELECT EXISTS (
        SELECT 1
        FROM public.message_reactions
        WHERE message_id = p_message_id
        AND user_id = v_user_id
        AND reaction = trim(p_reaction)
    )
    INTO v_exists;


    IF v_exists THEN

        DELETE FROM public.message_reactions
        WHERE message_id = p_message_id
        AND user_id = v_user_id
        AND reaction = trim(p_reaction);

        RETURN jsonb_build_object(
            'success', true,
            'action', 'removed'
        );

    ELSE

        INSERT INTO public.message_reactions (
            message_id,
            user_id,
            reaction
        )
        VALUES (
            p_message_id,
            v_user_id,
            trim(p_reaction)
        );

        RETURN jsonb_build_object(
            'success', true,
            'action', 'added'
        );

    END IF;

END;
$$;

REVOKE ALL
ON FUNCTION public.toggle_my_message_reaction(UUID, TEXT)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.toggle_my_message_reaction(UUID, TEXT)
TO authenticated;


-- ============================================================================
-- 14. EDIT MESSAGE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.edit_my_message(
    p_message_id UUID,
    p_content TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_now TIMESTAMPTZ := timezone('utc', now());
BEGIN

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF trim(COALESCE(p_content, '')) = '' THEN
        RAISE EXCEPTION 'Message cannot be empty';
    END IF;


    UPDATE public.messages
    SET
        content = trim(p_content),
        edited_at = v_now,
        updated_at = v_now
    WHERE id = p_message_id
    AND sender_id = v_user_id;


    IF NOT FOUND THEN
        RAISE EXCEPTION 'Message not found or unauthorized';
    END IF;


    RETURN jsonb_build_object(
        'success', true,
        'message_id', p_message_id,
        'content', trim(p_content),
        'edited_at', v_now
    );

END;
$$;

REVOKE ALL
ON FUNCTION public.edit_my_message(UUID, TEXT)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.edit_my_message(UUID, TEXT)
TO authenticated;


-- ============================================================================
-- 15. DELETE MESSAGE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_my_message(
    p_message_id UUID,
    p_delete_for_all BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_sender_id UUID;
    v_now TIMESTAMPTZ := timezone('utc', now());
BEGIN

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;


    SELECT sender_id
    INTO v_sender_id
    FROM public.messages
    WHERE id = p_message_id;


    IF v_sender_id IS NULL THEN
        RAISE EXCEPTION 'Message not found';
    END IF;


    IF p_delete_for_all THEN

        IF v_sender_id <> v_user_id THEN
            RAISE EXCEPTION 'Only the sender can delete for everyone';
        END IF;


        UPDATE public.messages
        SET
            is_deleted = true,
            deleted_for_all = true,
            content = 'This message was deleted.',
            attachments = '[]'::jsonb,
            updated_at = v_now
        WHERE id = p_message_id;

    ELSE

        UPDATE public.messages
        SET
            deleted_by = CASE
                WHEN v_user_id = ANY(COALESCE(deleted_by, ARRAY[]::UUID[]))
                THEN deleted_by
                ELSE array_append(
                    COALESCE(deleted_by, ARRAY[]::UUID[]),
                    v_user_id
                )
            END,
            updated_at = v_now
        WHERE id = p_message_id;

    END IF;


    RETURN jsonb_build_object(
        'success', true,
        'message_id', p_message_id,
        'deleted_for_all', p_delete_for_all
    );

END;
$$;

REVOKE ALL
ON FUNCTION public.delete_my_message(UUID, BOOLEAN)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.delete_my_message(UUID, BOOLEAN)
TO authenticated;


-- ============================================================================
-- 16. BLOCK USER
-- ============================================================================

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

REVOKE ALL
ON FUNCTION public.block_my_user(UUID)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.block_my_user(UUID)
TO authenticated;


-- ============================================================================
-- 17. UNBLOCK USER
-- ============================================================================

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


    DELETE FROM public.blocked_users
    WHERE blocker_id = v_user_id
    AND blocked_user_id = p_target_user_id;


    RETURN true;

END;
$$;

REVOKE ALL
ON FUNCTION public.unblock_my_user(UUID)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.unblock_my_user(UUID)
TO authenticated;


-- ============================================================================
-- 18. STORAGE BUCKET
-- ============================================================================

INSERT INTO storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
VALUES (
    'chat-attachments',
    'chat-attachments',
    true,
    52428800,
    ARRAY[
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'audio/webm',
        'audio/ogg',
        'audio/mp4',
        'audio/mpeg',
        'audio/wav',
        'application/pdf',
        'text/plain'
    ]
)
ON CONFLICT (id)
DO UPDATE SET
    public = true,
    file_size_limit = 52428800;


-- ============================================================================
-- 19. STORAGE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can upload chat attachments"
ON storage.objects;

CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'chat-attachments'
);


DROP POLICY IF EXISTS "Public can view chat attachments"
ON storage.objects;

CREATE POLICY "Public can view chat attachments"
ON storage.objects
FOR SELECT
USING (
    bucket_id = 'chat-attachments'
);


DROP POLICY IF EXISTS "Users can delete their own chat attachments"
ON storage.objects;

CREATE POLICY "Users can delete their own chat attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'chat-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
);


-- ============================================================================
-- 20. REALTIME
--
-- Add tables to the realtime publication only if they are not already there.
-- ============================================================================

DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'messages'
    ) THEN

        ALTER PUBLICATION supabase_realtime
        ADD TABLE public.messages;

    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'message_reactions'
    ) THEN

        ALTER PUBLICATION supabase_realtime
        ADD TABLE public.message_reactions;

    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'conversation_members'
    ) THEN

        ALTER PUBLICATION supabase_realtime
        ADD TABLE public.conversation_members;

    END IF;

END
$$;


-- ============================================================================
-- 21. POSTGREST RELOAD
-- ============================================================================

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================================================
-- END
-- ============================================================================
