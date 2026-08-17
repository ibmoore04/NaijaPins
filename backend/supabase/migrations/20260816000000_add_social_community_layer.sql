-- ============================================================
-- NaijaPins Migration: Social Community Layer
-- ============================================================
-- Adds:
--   memory_likes
--   memory_comments
--   comment_likes
--   memory_reposts
--   follows
--   conversations
--   conversation_members
--   messages
--   social notification support
--   community feed RPC
--   secure direct-message RPC
--
-- Designed to be:
--   - rerunnable
--   - RLS protected
--   - compatible with Supabase
--   - safe for authenticated users
-- ============================================================


-- ============================================================
-- 0. EXTENSIONS / BASE SAFETY
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- 1. MEMORY LIKES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.memory_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    memory_id UUID NOT NULL
        REFERENCES public.memories(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES public.profiles(user_id)
        ON DELETE CASCADE,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT memory_likes_unique_user_memory
        UNIQUE (memory_id, user_id)
);


CREATE INDEX IF NOT EXISTS idx_memory_likes_memory_id
    ON public.memory_likes(memory_id);

CREATE INDEX IF NOT EXISTS idx_memory_likes_user_id
    ON public.memory_likes(user_id);

CREATE INDEX IF NOT EXISTS idx_memory_likes_created_at
    ON public.memory_likes(created_at DESC);


ALTER TABLE public.memory_likes
    ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "Public can view memory likes"
    ON public.memory_likes;

CREATE POLICY "Public can view memory likes"
    ON public.memory_likes
    FOR SELECT
    USING (true);


DROP POLICY IF EXISTS "Users can like memories as themselves"
    ON public.memory_likes;

CREATE POLICY "Users can like memories as themselves"
    ON public.memory_likes
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);


DROP POLICY IF EXISTS "Users can unlike memories"
    ON public.memory_likes;

CREATE POLICY "Users can unlike memories"
    ON public.memory_likes
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);


-- ============================================================
-- 2. MEMORY COMMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.memory_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    memory_id UUID NOT NULL
        REFERENCES public.memories(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES public.profiles(user_id)
        ON DELETE CASCADE,

    parent_comment_id UUID
        REFERENCES public.memory_comments(id)
        ON DELETE CASCADE,

    content TEXT NOT NULL,

    is_deleted BOOLEAN NOT NULL DEFAULT false,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT timezone('utc'::text, now()),

    updated_at TIMESTAMPTZ NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT memory_comments_content_length
        CHECK (
            char_length(trim(content)) > 0
            AND char_length(content) <= 2000
        )
);


CREATE INDEX IF NOT EXISTS idx_memory_comments_memory_id
    ON public.memory_comments(memory_id);

CREATE INDEX IF NOT EXISTS idx_memory_comments_user_id
    ON public.memory_comments(user_id);

CREATE INDEX IF NOT EXISTS idx_memory_comments_parent_id
    ON public.memory_comments(parent_comment_id);

CREATE INDEX IF NOT EXISTS idx_memory_comments_created_at
    ON public.memory_comments(created_at DESC);


ALTER TABLE public.memory_comments
    ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "Public can view comments"
    ON public.memory_comments;

CREATE POLICY "Public can view comments"
    ON public.memory_comments
    FOR SELECT
    USING (true);


DROP POLICY IF EXISTS "Authenticated users can post comments"
    ON public.memory_comments;

CREATE POLICY "Authenticated users can post comments"
    ON public.memory_comments
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
    );


DROP POLICY IF EXISTS "Users and moderators can update comments"
    ON public.memory_comments;

CREATE POLICY "Users and moderators can update comments"
    ON public.memory_comments
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE profiles.user_id = auth.uid()
              AND profiles.role IN ('moderator', 'admin')
        )
    )
    WITH CHECK (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE profiles.user_id = auth.uid()
              AND profiles.role IN ('moderator', 'admin')
        )
    );


DROP POLICY IF EXISTS "Users and moderators can delete comments"
    ON public.memory_comments;

CREATE POLICY "Users and moderators can delete comments"
    ON public.memory_comments
    FOR DELETE
    TO authenticated
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE profiles.user_id = auth.uid()
              AND profiles.role IN ('moderator', 'admin')
        )
    );


-- ============================================================
-- 3. COMMENT LIKES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    comment_id UUID NOT NULL
        REFERENCES public.memory_comments(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES public.profiles(user_id)
        ON DELETE CASCADE,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT comment_likes_unique_user_comment
        UNIQUE (comment_id, user_id)
);


CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id
    ON public.comment_likes(comment_id);

CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id
    ON public.comment_likes(user_id);


ALTER TABLE public.comment_likes
    ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "Public can view comment likes"
    ON public.comment_likes;

CREATE POLICY "Public can view comment likes"
    ON public.comment_likes
    FOR SELECT
    USING (true);


DROP POLICY IF EXISTS "Users can like comments"
    ON public.comment_likes;

CREATE POLICY "Users can like comments"
    ON public.comment_likes
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);


DROP POLICY IF EXISTS "Users can unlike comments"
    ON public.comment_likes;

CREATE POLICY "Users can unlike comments"
    ON public.comment_likes
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);


-- ============================================================
-- 4. MEMORY REPOSTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.memory_reposts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    memory_id UUID NOT NULL
        REFERENCES public.memories(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES public.profiles(user_id)
        ON DELETE CASCADE,

    comment TEXT,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT memory_reposts_unique_user_memory
        UNIQUE (memory_id, user_id),

    CONSTRAINT memory_reposts_comment_length
        CHECK (
            comment IS NULL
            OR char_length(comment) <= 1000
        )
);


CREATE INDEX IF NOT EXISTS idx_memory_reposts_memory_id
    ON public.memory_reposts(memory_id);

CREATE INDEX IF NOT EXISTS idx_memory_reposts_user_id
    ON public.memory_reposts(user_id);

CREATE INDEX IF NOT EXISTS idx_memory_reposts_created_at
    ON public.memory_reposts(created_at DESC);


ALTER TABLE public.memory_reposts
    ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "Public can view reposts"
    ON public.memory_reposts;

CREATE POLICY "Public can view reposts"
    ON public.memory_reposts
    FOR SELECT
    USING (true);


DROP POLICY IF EXISTS "Users can create reposts"
    ON public.memory_reposts;

CREATE POLICY "Users can create reposts"
    ON public.memory_reposts
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);


DROP POLICY IF EXISTS "Users can delete their reposts"
    ON public.memory_reposts;

CREATE POLICY "Users can delete their reposts"
    ON public.memory_reposts
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);


-- ============================================================
-- 5. FOLLOWS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    follower_id UUID NOT NULL
        REFERENCES public.profiles(user_id)
        ON DELETE CASCADE,

    following_id UUID NOT NULL
        REFERENCES public.profiles(user_id)
        ON DELETE CASCADE,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT follows_unique_relationship
        UNIQUE (follower_id, following_id),

    CONSTRAINT follows_no_self_follow
        CHECK (follower_id <> following_id)
);


CREATE INDEX IF NOT EXISTS idx_follows_follower_id
    ON public.follows(follower_id);

CREATE INDEX IF NOT EXISTS idx_follows_following_id
    ON public.follows(following_id);


ALTER TABLE public.follows
    ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "Public can view follow connections"
    ON public.follows;

CREATE POLICY "Public can view follow connections"
    ON public.follows
    FOR SELECT
    USING (true);


DROP POLICY IF EXISTS "Users can follow other contributors"
    ON public.follows;

CREATE POLICY "Users can follow other contributors"
    ON public.follows
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = follower_id
        AND follower_id <> following_id
    );


DROP POLICY IF EXISTS "Users can unfollow contributors"
    ON public.follows;

CREATE POLICY "Users can unfollow contributors"
    ON public.follows
    FOR DELETE
    TO authenticated
    USING (auth.uid() = follower_id);


-- ============================================================
-- 6. CONVERSATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT timezone('utc'::text, now()),

    updated_at TIMESTAMPTZ NOT NULL
        DEFAULT timezone('utc'::text, now())
);


ALTER TABLE public.conversations
    ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 7. CONVERSATION MEMBERS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.conversation_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    conversation_id UUID NOT NULL
        REFERENCES public.conversations(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES public.profiles(user_id)
        ON DELETE CASCADE,

    joined_at TIMESTAMPTZ NOT NULL
        DEFAULT timezone('utc'::text, now()),

    last_read_at TIMESTAMPTZ NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT conversation_members_unique
        UNIQUE (conversation_id, user_id)
);


CREATE INDEX IF NOT EXISTS idx_conversation_members_conv
    ON public.conversation_members(conversation_id);

CREATE INDEX IF NOT EXISTS idx_conversation_members_user
    ON public.conversation_members(user_id);


ALTER TABLE public.conversation_members
    ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 8. MESSAGES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    conversation_id UUID NOT NULL
        REFERENCES public.conversations(id)
        ON DELETE CASCADE,

    sender_id UUID NOT NULL
        REFERENCES public.profiles(user_id)
        ON DELETE CASCADE,

    content TEXT NOT NULL,

    is_read BOOLEAN NOT NULL DEFAULT false,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT timezone('utc'::text, now()),

    updated_at TIMESTAMPTZ NOT NULL
        DEFAULT timezone('utc'::text, now()),

    CONSTRAINT messages_content_length
        CHECK (
            char_length(trim(content)) > 0
            AND char_length(content) <= 5000
        )
);


CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
    ON public.messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id
    ON public.messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_messages_created_at
    ON public.messages(created_at DESC);


ALTER TABLE public.messages
    ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 9. CONVERSATION RLS
-- ============================================================

DROP POLICY IF EXISTS "Members can view their conversations"
    ON public.conversations;

CREATE POLICY "Members can view their conversations"
    ON public.conversations
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.conversation_members cm
            WHERE cm.conversation_id = conversations.id
              AND cm.user_id = auth.uid()
        )
    );


DROP POLICY IF EXISTS "Authenticated users can create conversations"
    ON public.conversations;

CREATE POLICY "Authenticated users can create conversations"
    ON public.conversations
    FOR INSERT
    TO authenticated
    WITH CHECK (true);


DROP POLICY IF EXISTS "Members can update their conversations"
    ON public.conversations;

CREATE POLICY "Members can update their conversations"
    ON public.conversations
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.conversation_members cm
            WHERE cm.conversation_id = conversations.id
              AND cm.user_id = auth.uid()
        )
    );


-- ============================================================
-- 10. CONVERSATION MEMBER RLS
-- ============================================================

DROP POLICY IF EXISTS "Members can view conversation members"
    ON public.conversation_members;

CREATE POLICY "Members can view conversation members"
    ON public.conversation_members
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.conversation_members cm
            WHERE cm.conversation_id = conversation_members.conversation_id
              AND cm.user_id = auth.uid()
        )
    );


DROP POLICY IF EXISTS "Users can add themselves to conversations"
    ON public.conversation_members;

CREATE POLICY "Users can add themselves to conversations"
    ON public.conversation_members
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
    );


DROP POLICY IF EXISTS "Members can update their own member record"
    ON public.conversation_members;

CREATE POLICY "Members can update their own member record"
    ON public.conversation_members
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


DROP POLICY IF EXISTS "Users can leave conversations"
    ON public.conversation_members;

CREATE POLICY "Users can leave conversations"
    ON public.conversation_members
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);


-- ============================================================
-- 11. MESSAGE RLS
-- ============================================================

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


DROP POLICY IF EXISTS "Conversation members can send messages"
    ON public.messages;

CREATE POLICY "Conversation members can send messages"
    ON public.messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1
            FROM public.conversation_members cm
            WHERE cm.conversation_id = messages.conversation_id
              AND cm.user_id = auth.uid()
        )
    );


DROP POLICY IF EXISTS "Users can update their own messages"
    ON public.messages;

CREATE POLICY "Users can update their own messages"
    ON public.messages
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = sender_id)
    WITH CHECK (auth.uid() = sender_id);


DROP POLICY IF EXISTS "Users can delete their own messages"
    ON public.messages;

CREATE POLICY "Users can delete their own messages"
    ON public.messages
    FOR DELETE
    TO authenticated
    USING (auth.uid() = sender_id);


-- ============================================================
-- 12. NOTIFICATION TYPES
-- ============================================================

ALTER TABLE public.notifications
    DROP CONSTRAINT IF EXISTS notifications_type_check;


ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_type_check
    CHECK (
        type IN (
            'like',
            'comment',
            'reply',
            'repost',
            'follow',
            'message',
            'submission',
            'approval',
            'rejection',
            'report_update',
            'announcement'
        )
    );


-- ============================================================
-- 13. SECURE DIRECT CONVERSATION RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(
    target_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id UUID;
    existing_conversation UUID;
    new_conversation UUID;
BEGIN

    current_user_id := auth.uid();

    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'Target user is required';
    END IF;

    IF current_user_id = target_user_id THEN
        RAISE EXCEPTION 'You cannot start a conversation with yourself';
    END IF;


    -- Find existing 1-to-1 conversation.
    SELECT cm1.conversation_id
    INTO existing_conversation
    FROM public.conversation_members cm1
    JOIN public.conversation_members cm2
        ON cm1.conversation_id = cm2.conversation_id
    WHERE cm1.user_id = current_user_id
      AND cm2.user_id = target_user_id
      AND (
          SELECT COUNT(*)
          FROM public.conversation_members cm3
          WHERE cm3.conversation_id = cm1.conversation_id
      ) = 2
    LIMIT 1;


    IF existing_conversation IS NOT NULL THEN
        RETURN existing_conversation;
    END IF;


    -- Create conversation.
    INSERT INTO public.conversations
        (created_at, updated_at)
    VALUES
        (
            timezone('utc'::text, now()),
            timezone('utc'::text, now())
        )
    RETURNING id INTO new_conversation;


    -- Add current user.
    INSERT INTO public.conversation_members
        (conversation_id, user_id)
    VALUES
        (new_conversation, current_user_id);


    -- Add target user.
    INSERT INTO public.conversation_members
        (conversation_id, user_id)
    VALUES
        (new_conversation, target_user_id);


    RETURN new_conversation;

END;
$$;


-- ============================================================
-- 14. COMMUNITY FEED RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_community_feed(
    feed_tab TEXT DEFAULT 'for_you',
    current_user_id UUID DEFAULT NULL,
    p_limit INT DEFAULT 15,
    p_offset INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result_json JSONB;
BEGIN

    -- Safety limits.
    p_limit := LEAST(GREATEST(p_limit, 1), 50);
    p_offset := GREATEST(p_offset, 0);


    IF feed_tab = 'following' THEN

        SELECT jsonb_agg(feed_item)
        INTO result_json
        FROM (
            SELECT
                m.id,
                m.user_id,
                m.title,
                m.slug,
                m.story,
                m.date_type,
                m.year,
                m.end_year,
                m.view_count,
                m.created_at,

                jsonb_build_object(
                    'user_id', p.user_id,
                    'full_name', p.full_name,
                    'avatar_url', p.avatar_url,
                    'role', p.role,
                    'is_premium',
                    COALESCE(
                        um.status = 'active'
                        AND (
                            um.current_period_end IS NULL
                            OR um.current_period_end > now()
                        ),
                        false
                    )
                ) AS author,

                jsonb_build_object(
                    'id', l.id,
                    'city', l.city,
                    'state', l.state,
                    'country', l.country,
                    'formatted_address', l.formatted_address
                ) AS location,

                jsonb_build_object(
                    'id', c.id,
                    'name', c.name,
                    'slug', c.slug,
                    'icon', c.icon
                ) AS category,

                COALESCE(
                    (
                        SELECT jsonb_agg(
                            jsonb_build_object(
                                'id', mm.id,
                                'file_url', mm.file_url,
                                'media_type', mm.media_type,
                                'caption', mm.caption
                            )
                            ORDER BY mm.display_order ASC
                        )
                        FROM public.memory_media mm
                        WHERE mm.memory_id = m.id
                    ),
                    '[]'::jsonb
                ) AS media,

                (
                    SELECT COUNT(*)::INT
                    FROM public.memory_likes ml
                    WHERE ml.memory_id = m.id
                ) AS likes_count,

                (
                    SELECT COUNT(*)::INT
                    FROM public.memory_comments mc
                    WHERE mc.memory_id = m.id
                      AND mc.is_deleted = false
                ) AS comments_count,

                (
                    SELECT COUNT(*)::INT
                    FROM public.memory_reposts mr
                    WHERE mr.memory_id = m.id
                ) AS reposts_count,

                CASE
                    WHEN current_user_id IS NOT NULL
                    THEN EXISTS (
                        SELECT 1
                        FROM public.memory_likes ml
                        WHERE ml.memory_id = m.id
                          AND ml.user_id = current_user_id
                    )
                    ELSE false
                END AS has_liked,

                CASE
                    WHEN current_user_id IS NOT NULL
                    THEN EXISTS (
                        SELECT 1
                        FROM public.memory_reposts mr
                        WHERE mr.memory_id = m.id
                          AND mr.user_id = current_user_id
                    )
                    ELSE false
                END AS has_reposted,

                CASE
                    WHEN current_user_id IS NOT NULL
                    THEN EXISTS (
                        SELECT 1
                        FROM public.saved_memories sm
                        WHERE sm.memory_id = m.id
                          AND sm.user_id = current_user_id
                    )
                    ELSE false
                END AS has_saved,

                true AS is_following_author

            FROM public.memories m

            JOIN public.profiles p
                ON m.user_id = p.user_id

            JOIN public.locations l
                ON m.location_id = l.id

            JOIN public.categories c
                ON m.category_id = c.id

            LEFT JOIN public.user_memberships um
                ON m.user_id = um.user_id

            JOIN public.follows f
                ON f.following_id = m.user_id
                AND f.follower_id = current_user_id

            WHERE m.status = 'published'
              AND m.is_deleted = false

            ORDER BY m.created_at DESC

            LIMIT p_limit
            OFFSET p_offset

        ) feed_item;


    ELSIF feed_tab = 'popular' THEN

        SELECT jsonb_agg(feed_item)
        INTO result_json
        FROM (
            SELECT
                m.id,
                m.user_id,
                m.title,
                m.slug,
                m.story,
                m.date_type,
                m.year,
                m.end_year,
                m.view_count,
                m.created_at,

                jsonb_build_object(
                    'user_id', p.user_id,
                    'full_name', p.full_name,
                    'avatar_url', p.avatar_url,
                    'role', p.role,
                    'is_premium',
                    COALESCE(
                        um.status = 'active'
                        AND (
                            um.current_period_end IS NULL
                            OR um.current_period_end > now()
                        ),
                        false
                    )
                ) AS author,

                jsonb_build_object(
                    'id', l.id,
                    'city', l.city,
                    'state', l.state,
                    'country', l.country,
                    'formatted_address', l.formatted_address
                ) AS location,

                jsonb_build_object(
                    'id', c.id,
                    'name', c.name,
                    'slug', c.slug,
                    'icon', c.icon
                ) AS category,

                COALESCE(
                    (
                        SELECT jsonb_agg(
                            jsonb_build_object(
                                'id', mm.id,
                                'file_url', mm.file_url,
                                'media_type', mm.media_type,
                                'caption', mm.caption
                            )
                            ORDER BY mm.display_order ASC
                        )
                        FROM public.memory_media mm
                        WHERE mm.memory_id = m.id
                    ),
                    '[]'::jsonb
                ) AS media,

                (
                    SELECT COUNT(*)::INT
                    FROM public.memory_likes ml
                    WHERE ml.memory_id = m.id
                ) AS likes_count,

                (
                    SELECT COUNT(*)::INT
                    FROM public.memory_comments mc
                    WHERE mc.memory_id = m.id
                      AND mc.is_deleted = false
                ) AS comments_count,

                (
                    SELECT COUNT(*)::INT
                    FROM public.memory_reposts mr
                    WHERE mr.memory_id = m.id
                ) AS reposts_count,

                CASE
                    WHEN current_user_id IS NOT NULL
                    THEN EXISTS (
                        SELECT 1
                        FROM public.memory_likes ml
                        WHERE ml.memory_id = m.id
                          AND ml.user_id = current_user_id
                    )
                    ELSE false
                END AS has_liked,

                CASE
                    WHEN current_user_id IS NOT NULL
                    THEN EXISTS (
                        SELECT 1
                        FROM public.memory_reposts mr
                        WHERE mr.memory_id = m.id
                          AND mr.user_id = current_user_id
                    )
                    ELSE false
                END AS has_reposted,

                CASE
                    WHEN current_user_id IS NOT NULL
                    THEN EXISTS (
                        SELECT 1
                        FROM public.saved_memories sm
                        WHERE sm.memory_id = m.id
                          AND sm.user_id = current_user_id
                    )
                    ELSE false
                END AS has_saved,

                CASE
                    WHEN current_user_id IS NOT NULL
                    THEN EXISTS (
                        SELECT 1
                        FROM public.follows f
                        WHERE f.follower_id = current_user_id
                          AND f.following_id = m.user_id
                    )
                    ELSE false
                END AS is_following_author

            FROM public.memories m

            JOIN public.profiles p
                ON m.user_id = p.user_id

            JOIN public.locations l
                ON m.location_id = l.id

            JOIN public.categories c
                ON m.category_id = c.id

            LEFT JOIN public.user_memberships um
                ON m.user_id = um.user_id

            WHERE m.status = 'published'
              AND m.is_deleted = false

            ORDER BY
                (
                    (
                        SELECT COUNT(*)
                        FROM public.memory_likes ml
                        WHERE ml.memory_id = m.id
                    ) * 3

                    +

                    (
                        SELECT COUNT(*)
                        FROM public.memory_comments mc
                        WHERE mc.memory_id = m.id
                          AND mc.is_deleted = false
                    ) * 5

                    +

                    (
                        SELECT COUNT(*)
                        FROM public.memory_reposts mr
                        WHERE mr.memory_id = m.id
                    ) * 4

                    +

                    COALESCE(m.view_count, 0)
                ) DESC,

                m.created_at DESC

            LIMIT p_limit
            OFFSET p_offset

        ) feed_item;


    ELSE

        SELECT jsonb_agg(feed_item)
        INTO result_json
        FROM (
            SELECT
                m.id,
                m.user_id,
                m.title,
                m.slug,
                m.story,
                m.date_type,
                m.year,
                m.end_year,
                m.view_count,
                m.created_at,

                jsonb_build_object(
                    'user_id', p.user_id,
                    'full_name', p.full_name,
                    'avatar_url', p.avatar_url,
                    'role', p.role,
                    'is_premium',
                    COALESCE(
                        um.status = 'active'
                        AND (
                            um.current_period_end IS NULL
                            OR um.current_period_end > now()
                        ),
                        false
                    )
                ) AS author,

                jsonb_build_object(
                    'id', l.id,
                    'city', l.city,
                    'state', l.state,
                    'country', l.country,
                    'formatted_address', l.formatted_address
                ) AS location,

                jsonb_build_object(
                    'id', c.id,
                    'name', c.name,
                    'slug', c.slug,
                    'icon', c.icon
                ) AS category,

                COALESCE(
                    (
                        SELECT jsonb_agg(
                            jsonb_build_object(
                                'id', mm.id,
                                'file_url', mm.file_url,
                                'media_type', mm.media_type,
                                'caption', mm.caption
                            )
                            ORDER BY mm.display_order ASC
                        )
                        FROM public.memory_media mm
                        WHERE mm.memory_id = m.id
                    ),
                    '[]'::jsonb
                ) AS media,

                (
                    SELECT COUNT(*)::INT
                    FROM public.memory_likes ml
                    WHERE ml.memory_id = m.id
                ) AS likes_count,

                (
                    SELECT COUNT(*)::INT
                    FROM public.memory_comments mc
                    WHERE mc.memory_id = m.id
                      AND mc.is_deleted = false
                ) AS comments_count,

                (
                    SELECT COUNT(*)::INT
                    FROM public.memory_reposts mr
                    WHERE mr.memory_id = m.id
                ) AS reposts_count,

                CASE
                    WHEN current_user_id IS NOT NULL
                    THEN EXISTS (
                        SELECT 1
                        FROM public.memory_likes ml
                        WHERE ml.memory_id = m.id
                          AND ml.user_id = current_user_id
                    )
                    ELSE false
                END AS has_liked,

                CASE
                    WHEN current_user_id IS NOT NULL
                    THEN EXISTS (
                        SELECT 1
                        FROM public.memory_reposts mr
                        WHERE mr.memory_id = m.id
                          AND mr.user_id = current_user_id
                    )
                    ELSE false
                END AS has_reposted,

                CASE
                    WHEN current_user_id IS NOT NULL
                    THEN EXISTS (
                        SELECT 1
                        FROM public.saved_memories sm
                        WHERE sm.memory_id = m.id
                          AND sm.user_id = current_user_id
                    )
                    ELSE false
                END AS has_saved,

                CASE
                    WHEN current_user_id IS NOT NULL
                    THEN EXISTS (
                        SELECT 1
                        FROM public.follows f
                        WHERE f.follower_id = current_user_id
                          AND f.following_id = m.user_id
                    )
                    ELSE false
                END AS is_following_author

            FROM public.memories m

            JOIN public.profiles p
                ON m.user_id = p.user_id

            JOIN public.locations l
                ON m.location_id = l.id

            JOIN public.categories c
                ON m.category_id = c.id

            LEFT JOIN public.user_memberships um
                ON m.user_id = um.user_id

            WHERE m.status = 'published'
              AND m.is_deleted = false

            ORDER BY m.created_at DESC

            LIMIT p_limit
            OFFSET p_offset

        ) feed_item;

    END IF;


    RETURN COALESCE(result_json, '[]'::jsonb);

END;
$$;


-- ============================================================
-- 15. RPC PERMISSIONS
-- ============================================================

REVOKE ALL
ON FUNCTION public.get_or_create_direct_conversation(UUID)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.get_or_create_direct_conversation(UUID)
TO authenticated;


REVOKE ALL
ON FUNCTION public.get_community_feed(TEXT, UUID, INT, INT)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.get_community_feed(TEXT, UUID, INT, INT)
TO anon, authenticated;


-- ============================================================
-- 16. SOCIAL NOTIFICATION FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_social_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_memory_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

    IF p_user_id IS NULL THEN
        RETURN;
    END IF;

    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        memory_id
    )
    VALUES (
        p_user_id,
        p_type,
        p_title,
        p_message,
        p_memory_id
    );

END;
$$;


-- ============================================================
-- 17. LIKE NOTIFICATION
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_memory_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    memory_owner UUID;
    liker_name TEXT;
BEGIN

    SELECT m.user_id
    INTO memory_owner
    FROM public.memories m
    WHERE m.id = NEW.memory_id;


    SELECT COALESCE(p.full_name, 'Someone')
    INTO liker_name
    FROM public.profiles p
    WHERE p.user_id = NEW.user_id;


    IF memory_owner IS NOT NULL
       AND memory_owner <> NEW.user_id THEN

        PERFORM public.create_social_notification(
            memory_owner,
            'like',
            'Someone liked your memory',
            liker_name || ' liked your memory.',
            NEW.memory_id
        );

    END IF;

    RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS trigger_memory_like_notification
ON public.memory_likes;

CREATE TRIGGER trigger_memory_like_notification
AFTER INSERT ON public.memory_likes
FOR EACH ROW
EXECUTE FUNCTION public.notify_memory_like();


-- ============================================================
-- 18. COMMENT NOTIFICATION
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_memory_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    memory_owner UUID;
    commenter_name TEXT;
    notification_type TEXT;
    notification_title TEXT;
    notification_message TEXT;
BEGIN

    SELECT m.user_id
    INTO memory_owner
    FROM public.memories m
    WHERE m.id = NEW.memory_id;


    SELECT COALESCE(p.full_name, 'Someone')
    INTO commenter_name
    FROM public.profiles p
    WHERE p.user_id = NEW.user_id;


    IF NEW.parent_comment_id IS NOT NULL THEN

        notification_type := 'reply';
        notification_title := 'New reply to your comment';
        notification_message :=
            commenter_name || ' replied to a comment on your memory.';

    ELSE

        notification_type := 'comment';
        notification_title := 'New comment on your memory';
        notification_message :=
            commenter_name || ' commented on your memory.';

    END IF;


    IF memory_owner IS NOT NULL
       AND memory_owner <> NEW.user_id THEN

        PERFORM public.create_social_notification(
            memory_owner,
            notification_type,
            notification_title,
            notification_message,
            NEW.memory_id
        );

    END IF;


    RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS trigger_memory_comment_notification
ON public.memory_comments;

CREATE TRIGGER trigger_memory_comment_notification
AFTER INSERT ON public.memory_comments
FOR EACH ROW
EXECUTE FUNCTION public.notify_memory_comment();


-- ============================================================
-- 19. REPOST NOTIFICATION
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_memory_repost()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    memory_owner UUID;
    reposter_name TEXT;
BEGIN

    SELECT m.user_id
    INTO memory_owner
    FROM public.memories m
    WHERE m.id = NEW.memory_id;


    SELECT COALESCE(p.full_name, 'Someone')
    INTO reposter_name
    FROM public.profiles p
    WHERE p.user_id = NEW.user_id;


    IF memory_owner IS NOT NULL
       AND memory_owner <> NEW.user_id THEN

        PERFORM public.create_social_notification(
            memory_owner,
            'repost',
            'Your memory was reposted',
            reposter_name || ' reposted your memory.',
            NEW.memory_id
        );

    END IF;


    RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS trigger_memory_repost_notification
ON public.memory_reposts;

CREATE TRIGGER trigger_memory_repost_notification
AFTER INSERT ON public.memory_reposts
FOR EACH ROW
EXECUTE FUNCTION public.notify_memory_repost();


-- ============================================================
-- 20. FOLLOW NOTIFICATION
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_new_follow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    follower_name TEXT;
BEGIN

    SELECT COALESCE(p.full_name, 'Someone')
    INTO follower_name
    FROM public.profiles p
    WHERE p.user_id = NEW.follower_id;


    IF NEW.following_id <> NEW.follower_id THEN

        PERFORM public.create_social_notification(
            NEW.following_id,
            'follow',
            'New follower',
            follower_name || ' started following you.',
            NULL
        );

    END IF;


    RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS trigger_new_follow_notification
ON public.follows;

CREATE TRIGGER trigger_new_follow_notification
AFTER INSERT ON public.follows
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_follow();


-- ============================================================
-- 21. MESSAGE NOTIFICATION
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    recipient_id UUID;
    sender_name TEXT;
BEGIN

    SELECT cm.user_id
    INTO recipient_id
    FROM public.conversation_members cm
    WHERE cm.conversation_id = NEW.conversation_id
      AND cm.user_id <> NEW.sender_id
    ORDER BY cm.joined_at
    LIMIT 1;


    SELECT COALESCE(p.full_name, 'Someone')
    INTO sender_name
    FROM public.profiles p
    WHERE p.user_id = NEW.sender_id;


    IF recipient_id IS NOT NULL THEN

        PERFORM public.create_social_notification(
            recipient_id,
            'message',
            'New message',
            sender_name || ' sent you a message.',
            NULL
        );

    END IF;


    UPDATE public.conversations
    SET updated_at = timezone('utc'::text, now())
    WHERE id = NEW.conversation_id;


    RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS trigger_new_message_notification
ON public.messages;

CREATE TRIGGER trigger_new_message_notification
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_message();


-- ============================================================
-- 22. FOLLOWER / FOLLOWING COUNTS
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_profile_social_stats(
    target_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    followers_count INT;
    following_count INT;
    memories_count INT;
    is_following BOOLEAN;
BEGIN

    SELECT COUNT(*)::INT
    INTO followers_count
    FROM public.follows
    WHERE following_id = target_user_id;


    SELECT COUNT(*)::INT
    INTO following_count
    FROM public.follows
    WHERE follower_id = target_user_id;


    SELECT COUNT(*)::INT
    INTO memories_count
    FROM public.memories
    WHERE user_id = target_user_id
      AND status = 'published'
      AND is_deleted = false;


    SELECT EXISTS (
        SELECT 1
        FROM public.follows
        WHERE follower_id = auth.uid()
          AND following_id = target_user_id
    )
    INTO is_following;


    RETURN jsonb_build_object(
        'followers_count', followers_count,
        'following_count', following_count,
        'memories_count', memories_count,
        'is_following', COALESCE(is_following, false)
    );
END;
$$;


REVOKE ALL
ON FUNCTION public.get_profile_social_stats(UUID)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.get_profile_social_stats(UUID)
TO anon, authenticated;


-- ============================================================
-- 23. COMMENTS / LIKES / REPOSTS COUNTS
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_memory_engagement(
    target_memory_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    likes_count INT;
    comments_count INT;
    reposts_count INT;
    has_liked BOOLEAN;
    has_reposted BOOLEAN;
    has_saved BOOLEAN;
BEGIN

    SELECT COUNT(*)::INT
    INTO likes_count
    FROM public.memory_likes
    WHERE memory_id = target_memory_id;


    SELECT COUNT(*)::INT
    INTO comments_count
    FROM public.memory_comments
    WHERE memory_id = target_memory_id
      AND is_deleted = false;


    SELECT COUNT(*)::INT
    INTO reposts_count
    FROM public.memory_reposts
    WHERE memory_id = target_memory_id;


    SELECT EXISTS (
        SELECT 1
        FROM public.memory_likes
        WHERE memory_id = target_memory_id
          AND user_id = auth.uid()
    )
    INTO has_liked;


    SELECT EXISTS (
        SELECT 1
        FROM public.memory_reposts
        WHERE memory_id = target_memory_id
          AND user_id = auth.uid()
    )
    INTO has_reposted;


    SELECT EXISTS (
        SELECT 1
        FROM public.saved_memories
        WHERE memory_id = target_memory_id
          AND user_id = auth.uid()
    )
    INTO has_saved;


    RETURN jsonb_build_object(
        'likes_count', likes_count,
        'comments_count', comments_count,
        'reposts_count', reposts_count,
        'has_liked', COALESCE(has_liked, false),
        'has_reposted', COALESCE(has_reposted, false),
        'has_saved', COALESCE(has_saved, false)
    );
END;
$$;


REVOKE ALL
ON FUNCTION public.get_memory_engagement(UUID)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.get_memory_engagement(UUID)
TO anon, authenticated;


-- ============================================================
-- 24. UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;


-- Comments
DROP TRIGGER IF EXISTS trigger_memory_comments_updated_at
ON public.memory_comments;

CREATE TRIGGER trigger_memory_comments_updated_at
BEFORE UPDATE ON public.memory_comments
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


-- Messages
DROP TRIGGER IF EXISTS trigger_messages_updated_at
ON public.messages;

CREATE TRIGGER trigger_messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


-- Conversations
DROP TRIGGER IF EXISTS trigger_conversations_updated_at
ON public.conversations;

CREATE TRIGGER trigger_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- 25. REALTIME SUPPORT
-- ============================================================
-- Add social tables to Supabase Realtime publication.
-- These are safe to run repeatedly.

DO $$
BEGIN

    BEGIN
        ALTER PUBLICATION supabase_realtime
        ADD TABLE public.memory_likes;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;


    BEGIN
        ALTER PUBLICATION supabase_realtime
        ADD TABLE public.memory_comments;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;


    BEGIN
        ALTER PUBLICATION supabase_realtime
        ADD TABLE public.memory_reposts;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;


    BEGIN
        ALTER PUBLICATION supabase_realtime
        ADD TABLE public.follows;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;


    BEGIN
        ALTER PUBLICATION supabase_realtime
        ADD TABLE public.messages;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;

END $$;


-- ============================================================
-- 26. FINAL GRANTS
-- ============================================================

GRANT SELECT
ON public.memory_likes,
   public.memory_comments,
   public.comment_likes,
   public.memory_reposts,
   public.follows
TO anon, authenticated;


GRANT INSERT, DELETE
ON public.memory_likes,
   public.comment_likes,
   public.memory_reposts,
   public.follows
TO authenticated;


GRANT SELECT, INSERT, UPDATE, DELETE
ON public.memory_comments
TO authenticated;


GRANT SELECT
ON public.conversations,
   public.conversation_members,
   public.messages
TO authenticated;


-- ============================================================
-- END OF NaijaPins SOCIAL COMMUNITY MIGRATION
-- ============================================================