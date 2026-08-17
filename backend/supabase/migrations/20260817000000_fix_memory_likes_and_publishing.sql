-- ============================================================
-- NaijaPins Migration: Fix Memory Likes & Publishing Safety
-- 1. Enforces UNIQUE(memory_id, user_id) on memory_likes
-- 2. Enforces strict RLS on memory_likes
-- 3. Sets memories default status to 'draft'
-- 4. Ensures memories status indexes and constraints
-- ============================================================

-- 1. SAFE UNIQUE CONSTRAINT FOR MEMORY LIKES
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'memory_likes_memory_id_user_id_key'
           OR (conrelid = 'public.memory_likes'::regclass AND contype = 'u')
    ) THEN
        ALTER TABLE public.memory_likes ADD CONSTRAINT memory_likes_memory_id_user_id_key UNIQUE(memory_id, user_id);
    END IF;
EXCEPTION
    WHEN duplicate_table OR duplicate_object THEN
        NULL;
    WHEN undefined_table THEN
        -- If table doesn't exist yet, create it with constraint
        CREATE TABLE IF NOT EXISTS public.memory_likes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
            UNIQUE(memory_id, user_id)
        );
END $$;

-- 2. ENABLE RLS AND POLICIES FOR MEMORY LIKES
ALTER TABLE public.memory_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view memory likes" ON public.memory_likes;
CREATE POLICY "Public can view memory likes"
    ON public.memory_likes FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can like memories as themselves" ON public.memory_likes;
CREATE POLICY "Users can like memories as themselves"
    ON public.memory_likes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike memories" ON public.memory_likes;
CREATE POLICY "Users can unlike memories"
    ON public.memory_likes FOR DELETE
    USING (auth.uid() = user_id);

-- 3. SET DEFAULT MEMORY STATUS TO 'draft' (Private by default)
ALTER TABLE public.memories ALTER COLUMN status SET DEFAULT 'draft';

-- 4. ENSURE INDEXES FOR FAST TOGGLES AND COUNTS
CREATE INDEX IF NOT EXISTS idx_memory_likes_memory_user ON public.memory_likes(memory_id, user_id);
CREATE INDEX IF NOT EXISTS idx_memories_status_published ON public.memories(status, is_deleted) WHERE status = 'published' AND is_deleted = false;
