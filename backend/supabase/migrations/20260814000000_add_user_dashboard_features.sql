-- ============================================================
-- NaijaPins Migration: User Dashboard Features, Moderation Workflow & Storage Policies
-- Adds: saved_memories, notifications, subscriptions, avatars & memory_media storage RLS policies.
-- ============================================================

-- 1. SAVED MEMORIES TABLE
CREATE TABLE IF NOT EXISTS public.saved_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, memory_id)
);

-- Index for fast user bookmark lookups
CREATE INDEX IF NOT EXISTS idx_saved_memories_user_id ON public.saved_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_memories_memory_id ON public.saved_memories(memory_id);

-- Enable RLS
ALTER TABLE public.saved_memories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for saved_memories (idempotent)
DROP POLICY IF EXISTS "Users can view their own saved memories" ON public.saved_memories;
CREATE POLICY "Users can view their own saved memories"
    ON public.saved_memories FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can bookmark memories for themselves" ON public.saved_memories;
CREATE POLICY "Users can bookmark memories for themselves"
    ON public.saved_memories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove their own saved memories" ON public.saved_memories;
CREATE POLICY "Users can remove their own saved memories"
    ON public.saved_memories FOR DELETE
    USING (auth.uid() = user_id);

-- 2. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('submission', 'approval', 'rejection', 'report_update', 'announcement')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    memory_id UUID REFERENCES public.memories(id) ON DELETE SET NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id, is_read);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications (idempotent)
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert notifications for themselves" ON public.notifications;
CREATE POLICY "Users can insert notifications for themselves"
    ON public.notifications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can mark their own notifications as read" ON public.notifications;
CREATE POLICY "Users can mark their own notifications as read"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- 3. SUBSCRIPTIONS PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    newsletter_subscribed BOOLEAN NOT NULL DEFAULT true,
    submission_updates BOOLEAN NOT NULL DEFAULT true,
    community_updates BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions (idempotent)
DROP POLICY IF EXISTS "Users can view their own subscription preferences" ON public.subscriptions;
CREATE POLICY "Users can view their own subscription preferences"
    ON public.subscriptions FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own subscription preferences" ON public.subscriptions;
CREATE POLICY "Users can insert their own subscription preferences"
    ON public.subscriptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own subscription preferences" ON public.subscriptions;
CREATE POLICY "Users can update their own subscription preferences"
    ON public.subscriptions FOR UPDATE
    USING (auth.uid() = user_id);

-- 4. UPDATE MEMORIES DEFAULT STATUS TO PENDING_REVIEW FOR COMMUNITY MODERATION
ALTER TABLE public.memories ALTER COLUMN status SET DEFAULT 'pending_review';

-- 5. AVATARS STORAGE BUCKET & RLS POLICIES
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Public Read Access for Avatar Images
DROP POLICY IF EXISTS "Public Read Access for Avatars" ON storage.objects;
CREATE POLICY "Public Read Access for Avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

-- User Insert Policy: Users can only upload into avatars/{user_id}/
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- User Update Policy: Users can only replace their own avatar
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- User Delete Policy: Users can only delete their own avatar
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- 6. MEMORY MEDIA STORAGE BUCKET & RLS POLICIES
INSERT INTO storage.buckets (id, name, public)
VALUES ('memory_media', 'memory_media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public Read Access for Memory Media
DROP POLICY IF EXISTS "Public Read Access for Memory Media" ON storage.objects;
CREATE POLICY "Public Read Access for Memory Media"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'memory_media');

-- Authenticated Users can upload memory media
DROP POLICY IF EXISTS "Authenticated users can upload memory media" ON storage.objects;
CREATE POLICY "Authenticated users can upload memory media"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'memory_media' AND auth.role() = 'authenticated');

-- Authenticated Users can update memory media
DROP POLICY IF EXISTS "Authenticated users can update memory media" ON storage.objects;
CREATE POLICY "Authenticated users can update memory media"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'memory_media' AND auth.role() = 'authenticated');

-- Authenticated Users can delete memory media
DROP POLICY IF EXISTS "Authenticated users can delete memory media" ON storage.objects;
CREATE POLICY "Authenticated users can delete memory media"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'memory_media' AND auth.role() = 'authenticated');
