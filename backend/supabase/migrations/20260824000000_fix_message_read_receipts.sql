-- ============================================================================
-- NAIJAPINS MIGRATION: Fix Message Read Receipts & Delivery Status
-- File: 20260824000000_fix_message_read_receipts.sql
-- ============================================================================

-- 1. FIX MESSAGES RLS POLICIES FOR READ RECEIPTS
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
DROP POLICY IF EXISTS "Conversation members can update messages" ON public.messages;

CREATE POLICY "Conversation members can update messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (
    sender_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.conversation_members cm
        WHERE cm.conversation_id = messages.conversation_id
          AND cm.user_id = auth.uid()
    )
)
WITH CHECK (
    sender_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.conversation_members cm
        WHERE cm.conversation_id = messages.conversation_id
          AND cm.user_id = auth.uid()
    )
);

-- 2. SECURITY DEFINER RPC: mark_conversation_as_read
CREATE OR REPLACE FUNCTION public.mark_conversation_as_read(p_conversation_id UUID)
RETURNS VOID
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

    -- Verify user is member of conversation
    IF NOT EXISTS (
        SELECT 1 FROM public.conversation_members
        WHERE conversation_id = p_conversation_id
          AND user_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'Not a member of this conversation';
    END IF;

    -- 1. Update conversation member last_read_at
    UPDATE public.conversation_members
    SET last_read_at = timezone('utc'::text, now())
    WHERE conversation_id = p_conversation_id
      AND user_id = v_user_id;

    -- 2. Mark all incoming unread messages as read
    UPDATE public.messages
    SET is_read = true, updated_at = timezone('utc'::text, now())
    WHERE conversation_id = p_conversation_id
      AND sender_id != v_user_id
      AND is_read = false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_conversation_as_read(UUID) TO authenticated;
