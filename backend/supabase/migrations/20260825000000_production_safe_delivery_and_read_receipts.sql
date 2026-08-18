-- ============================================================================
-- NAIJAPINS
-- Production-Safe Message Delivery & Read Receipts
-- Migration: 20260825000000_production_safe_delivery_and_read_receipts.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. MESSAGE STATUS COLUMNS
-- ============================================================================

ALTER TABLE public.messages
    ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;


-- ============================================================================
-- 2. CONVERSATION MEMBER DELIVERY TRACKING
-- ============================================================================

ALTER TABLE public.conversation_members
    ADD COLUMN IF NOT EXISTS last_delivered_at TIMESTAMPTZ;


-- ============================================================================
-- 3. DATA CONSISTENCY
-- ============================================================================

-- A message cannot be read before it is delivered.
UPDATE public.messages
SET delivered_at = COALESCE(delivered_at, read_at)
WHERE read_at IS NOT NULL
  AND delivered_at IS NULL;

-- Ensure existing read messages have read_at.
UPDATE public.messages
SET read_at = COALESCE(read_at, updated_at, created_at)
WHERE is_read = true
  AND read_at IS NULL;


-- ============================================================================
-- 4. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_messages_conversation_status
ON public.messages (
    conversation_id,
    sender_id,
    is_read,
    delivered_at,
    read_at
);

CREATE INDEX IF NOT EXISTS idx_messages_unread
ON public.messages (
    conversation_id,
    sender_id,
    is_read
)
WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_messages_undelivered
ON public.messages (
    conversation_id,
    sender_id,
    delivered_at
)
WHERE delivered_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conversation_members_read
ON public.conversation_members (
    conversation_id,
    user_id,
    last_read_at
);

CREATE INDEX IF NOT EXISTS idx_conversation_members_delivered
ON public.conversation_members (
    conversation_id,
    user_id,
    last_delivered_at
);


-- ============================================================================
-- 5. RLS — MESSAGES
-- ============================================================================

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- SELECT
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Conversation members can view messages"
ON public.messages;

CREATE POLICY "Conversation members can view messages"
ON public.messages
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.conversation_members cm
        WHERE cm.conversation_id = messages.conversation_id
          AND cm.user_id = auth.uid()
    )
);


-- ---------------------------------------------------------------------------
-- INSERT
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Conversation members can send messages"
ON public.messages;

CREATE POLICY "Conversation members can send messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.conversation_members cm
        WHERE cm.conversation_id = messages.conversation_id
          AND cm.user_id = auth.uid()
    )
);


-- ---------------------------------------------------------------------------
-- UPDATE
-- ---------------------------------------------------------------------------
-- IMPORTANT:
-- Normal clients cannot directly update delivery/read status.
-- Receipt updates happen through SECURITY DEFINER RPCs.
-- This policy only permits the sender to update their own message.

DROP POLICY IF EXISTS "Conversation members can update messages"
ON public.messages;

DROP POLICY IF EXISTS "Users can update their own messages"
ON public.messages;

CREATE POLICY "Users can update their own messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (
    sender_id = auth.uid()
)
WITH CHECK (
    sender_id = auth.uid()
);


-- ============================================================================
-- 6. MARK CONVERSATION AS DELIVERED
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
    v_updated_count INTEGER := 0;
BEGIN

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;


    -- Verify conversation membership.
    IF NOT EXISTS (
        SELECT 1
        FROM public.conversation_members
        WHERE conversation_id = p_conversation_id
          AND user_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'User is not a member of this conversation';
    END IF;


    -- Update recipient delivery checkpoint.
    UPDATE public.conversation_members
    SET last_delivered_at = v_now
    WHERE conversation_id = p_conversation_id
      AND user_id = v_user_id;


    -- Mark incoming messages as delivered.
    UPDATE public.messages
    SET delivered_at = v_now,
        updated_at = v_now
    WHERE conversation_id = p_conversation_id
      AND sender_id <> v_user_id
      AND delivered_at IS NULL
      AND created_at <= v_now;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;


    RETURN jsonb_build_object(
        'success', true,
        'conversation_id', p_conversation_id,
        'delivered_count', v_updated_count,
        'timestamp', v_now
    );

END;
$$;


-- ============================================================================
-- 7. MARK CONVERSATION AS READ
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
    v_updated_count INTEGER := 0;
BEGIN

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;


    -- Verify conversation membership.
    IF NOT EXISTS (
        SELECT 1
        FROM public.conversation_members
        WHERE conversation_id = p_conversation_id
          AND user_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'User is not a member of this conversation';
    END IF;


    -- Update both delivery and read checkpoints.
    UPDATE public.conversation_members
    SET last_delivered_at = v_now,
        last_read_at = v_now
    WHERE conversation_id = p_conversation_id
      AND user_id = v_user_id;


    -- Mark incoming messages as read.
    -- Preserve the original read timestamp on repeated calls.
    UPDATE public.messages
    SET is_read = true,
        delivered_at = COALESCE(delivered_at, v_now),
        read_at = COALESCE(read_at, v_now),
        updated_at = v_now
    WHERE conversation_id = p_conversation_id
      AND sender_id <> v_user_id
      AND (
          is_read = false
          OR read_at IS NULL
      )
      AND created_at <= v_now;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;


    RETURN jsonb_build_object(
        'success', true,
        'conversation_id', p_conversation_id,
        'read_count', v_updated_count,
        'timestamp', v_now
    );

END;
$$;


-- ============================================================================
-- 8. PERMISSIONS
-- ============================================================================

REVOKE ALL
ON FUNCTION public.mark_conversation_as_delivered(UUID)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.mark_conversation_as_delivered(UUID)
TO authenticated;


REVOKE ALL
ON FUNCTION public.mark_conversation_as_read(UUID)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.mark_conversation_as_read(UUID)
TO authenticated;


-- ============================================================================
-- 9. SECURITY DEFINER FUNCTION HARDENING
-- ============================================================================

REVOKE ALL
ON FUNCTION public.mark_conversation_as_delivered(UUID)
FROM anon;

REVOKE ALL
ON FUNCTION public.mark_conversation_as_read(UUID)
FROM anon;


-- ============================================================================
-- 10. POSTGREST SCHEMA RELOAD
-- ============================================================================

NOTIFY pgrst, 'reload schema';


COMMIT;
