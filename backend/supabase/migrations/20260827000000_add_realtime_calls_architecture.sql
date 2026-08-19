-- ============================================================================
-- NAIJAPINS
-- Real-time Calls Architecture (WebRTC Voice & Video Calls)
-- Migration: 20260827000000_add_realtime_calls_architecture.sql
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    caller_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    call_type TEXT NOT NULL CHECK (call_type IN ('voice', 'video')),
    status TEXT NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'accepted', 'rejected', 'missed', 'ended', 'cancelled')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    answered_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    ended_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    duration_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_calls_conversation ON public.calls(conversation_id);
CREATE INDEX IF NOT EXISTS idx_calls_caller ON public.calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_calls_receiver ON public.calls(receiver_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON public.calls(status);

ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Call participants can view calls" ON public.calls;
CREATE POLICY "Call participants can view calls"
    ON public.calls
    FOR SELECT
    TO authenticated
    USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Callers can insert calls" ON public.calls;
CREATE POLICY "Callers can insert calls"
    ON public.calls
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = caller_id);

DROP POLICY IF EXISTS "Call participants can update calls" ON public.calls;
CREATE POLICY "Call participants can update calls"
    ON public.calls
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'calls'
    ) THEN
        ALTER PUBLICATION supabase_realtime
        ADD TABLE public.calls;
    END IF;
END
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
