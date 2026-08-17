-- =============================================================================
-- NaijaPins — Social Community + Chat RLS Fix
-- =============================================================================
-- Goals:
-- 1. A user can only like a memory once.
-- 2. A memory does NOT enter Community just because an admin publishes it.
-- 3. community_posted is controlled separately from status.
-- 4. Community feed requires:
--      status = 'published'
--      is_deleted = false
--      community_posted = true
-- 5. Users can create memories as themselves.
-- 6. Users can update their own memories.
-- 7. Chat membership checks use SECURITY DEFINER helper functions.
-- 8. Direct-message RPC works through PostgREST.
-- 9. Chat RLS does not recursively depend on itself.
-- 10. Migration is safe to rerun.
-- =============================================================================


-- ============================================================================
-- 1. MEMORIES: COMMUNITY POST FLAG
-- ============================================================================

ALTER TABLE public.memories
ADD COLUMN IF NOT EXISTS community_posted BOOLEAN NOT NULL DEFAULT false;


-- Keep the column independent from status.
--
-- IMPORTANT:
-- Publishing a memory MUST NOT automatically set community_posted = true.


CREATE INDEX IF NOT EXISTS idx_memories_community_feed
ON public.memories (
    created_at DESC
)
WHERE
    status = 'published'
    AND is_deleted = false
    AND community_posted = true;


-- ============================================================================
-- 2. MEMORY LIKES: PREVENT DUPLICATE LIKES
-- ============================================================================

ALTER TABLE public.memory_likes
ENABLE ROW LEVEL SECURITY;


-- Remove duplicate rows first.
-- This keeps the earliest like for each user/memory combination.
DELETE FROM public.memory_likes a
USING public.memory_likes b
WHERE
    a.memory_id = b.memory_id
    AND a.user_id = b.user_id
    AND a.ctid > b.ctid;


-- Remove old versions of the constraint if they exist.
ALTER TABLE public.memory_likes
DROP CONSTRAINT IF EXISTS memory_likes_memory_id_user_id_key;

ALTER TABLE public.memory_likes
DROP CONSTRAINT IF EXISTS memory_likes_unique_user_memory;


-- Add the definitive unique constraint.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.memory_likes'::regclass
          AND contype = 'u'
          AND conkey = ARRAY[
              (
                  SELECT attnum
                  FROM pg_attribute
                  WHERE attrelid = 'public.memory_likes'::regclass
                    AND attname = 'memory_id'
              ),
              (
                  SELECT attnum
                  FROM pg_attribute
                  WHERE attrelid = 'public.memory_likes'::regclass
                    AND attname = 'user_id'
              )
          ]::smallint[]
    ) THEN
        ALTER TABLE public.memory_likes
        ADD CONSTRAINT memory_likes_memory_id_user_id_key
        UNIQUE (memory_id, user_id);
    END IF;
END $$;


CREATE INDEX IF NOT EXISTS idx_memory_likes_memory_id
ON public.memory_likes(memory_id);

CREATE INDEX IF NOT EXISTS idx_memory_likes_user_id
ON public.memory_likes(user_id);


-- ============================================================================
-- 3. MEMORY LIKES RLS
-- ============================================================================

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
WITH CHECK (
    auth.uid() = user_id
);


DROP POLICY IF EXISTS "Users can unlike memories"
ON public.memory_likes;

CREATE POLICY "Users can unlike memories"
ON public.memory_likes
FOR DELETE
TO authenticated
USING (
    auth.uid() = user_id
);


-- ============================================================================
-- 4. MEMORIES RLS
-- ============================================================================

ALTER TABLE public.memories
ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "Public memories are viewable by everyone"
ON public.memories;

DROP POLICY IF EXISTS "Authors can view own memories"
ON public.memories;

DROP POLICY IF EXISTS "Moderators can view all memories"
ON public.memories;

DROP POLICY IF EXISTS "Authenticated users can create memories"
ON public.memories;

DROP POLICY IF EXISTS "Authors can update own memories"
ON public.memories;

DROP POLICY IF EXISTS "Moderators can update any memory"
ON public.memories;


-- Public can view published memories.
-- This is intentionally NOT tied to community_posted.
--
-- This means:
--
-- published + community_posted=false
--     => visible as a normal published memory
--
-- published + community_posted=true
--     => visible as a normal memory AND Community post
--
-- The Community RPC applies the additional community_posted filter.

CREATE POLICY "Public memories are viewable by everyone"
ON public.memories
FOR SELECT
USING (
    (
        status = 'published'
        AND is_deleted = false
    )
    OR
    (
        auth.uid() IS NOT NULL
        AND auth.uid() = user_id
    )
    OR
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.user_id = auth.uid()
          AND p.role IN ('moderator', 'admin')
    )
);


-- Authenticated users can create their own memories.

CREATE POLICY "Authenticated users can create memories"
ON public.memories
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id
);


-- Users can update their own memories.
--
-- Moderators/admins can update any memory.
--
-- NOTE:
-- The frontend should NOT automatically change community_posted when
-- changing status.

CREATE POLICY "Authors can update own memories"
ON public.memories
FOR UPDATE
TO authenticated
USING (
    auth.uid() = user_id
    OR
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.user_id = auth.uid()
          AND p.role IN ('moderator', 'admin')
    )
)
WITH CHECK (
    auth.uid() = user_id
    OR
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.user_id = auth.uid()
          AND p.role IN ('moderator', 'admin')
    )
);


-- ============================================================================
-- 5. HELPER: CHECK IF USER IS A CONVERSATION MEMBER
-- ============================================================================
--
-- SECURITY DEFINER prevents conversation RLS policies from recursively
-- querying conversation_members through another RLS policy.
--

CREATE OR REPLACE FUNCTION public.is_conversation_member(
    p_conversation_id UUID,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.conversation_members cm
        WHERE cm.conversation_id = p_conversation_id
          AND cm.user_id = p_user_id
    );
$$;


REVOKE ALL
ON FUNCTION public.is_conversation_member(UUID, UUID)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.is_conversation_member(UUID, UUID)
TO authenticated;


-- ============================================================================
-- 6. CONVERSATIONS RLS
-- ============================================================================

ALTER TABLE public.conversations
ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "Members can view their conversations"
ON public.conversations;

CREATE POLICY "Members can view their conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (
    public.is_conversation_member(id, auth.uid())
);


DROP POLICY IF EXISTS "Members can update their conversations"
ON public.conversations;

CREATE POLICY "Members can update their conversations"
ON public.conversations
FOR UPDATE
TO authenticated
USING (
    public.is_conversation_member(id, auth.uid())
)
WITH CHECK (
    public.is_conversation_member(id, auth.uid())
);


-- ============================================================================
-- 7. CONVERSATION MEMBERS RLS
-- ============================================================================

ALTER TABLE public.conversation_members
ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "Members can view conversation members"
ON public.conversation_members;

CREATE POLICY "Members can view conversation members"
ON public.conversation_members
FOR SELECT
TO authenticated
USING (
    public.is_conversation_member(conversation_id, auth.uid())
);


DROP POLICY IF EXISTS "Members can update their own member record"
ON public.conversation_members;

CREATE POLICY "Members can update their own member record"
ON public.conversation_members
FOR UPDATE
TO authenticated
USING (
    auth.uid() = user_id
)
WITH CHECK (
    auth.uid() = user_id
);


DROP POLICY IF EXISTS "Users can leave conversations"
ON public.conversation_members;

CREATE POLICY "Users can leave conversations"
ON public.conversation_members
FOR DELETE
TO authenticated
USING (
    auth.uid() = user_id
);


-- ============================================================================
-- 8. MESSAGES RLS
-- ============================================================================

ALTER TABLE public.messages
ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "Conversation members can view messages"
ON public.messages;

CREATE POLICY "Conversation members can view messages"
ON public.messages
FOR SELECT
TO authenticated
USING (
    public.is_conversation_member(
        conversation_id,
        auth.uid()
    )
);


DROP POLICY IF EXISTS "Conversation members can send messages"
ON public.messages;

CREATE POLICY "Conversation members can send messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
    sender_id = auth.uid()
    AND
    public.is_conversation_member(
        conversation_id,
        auth.uid()
    )
);


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


DROP POLICY IF EXISTS "Users can delete their own messages"
ON public.messages;

CREATE POLICY "Users can delete their own messages"
ON public.messages
FOR DELETE
TO authenticated
USING (
    sender_id = auth.uid()
);


-- ============================================================================
-- 9. DIRECT CONVERSATION RPC
-- ============================================================================
--
-- The authenticated user must be one of the two participants.
--
-- This function creates:
--
-- conversations
--      ↓
-- conversation_members
--      ├── user_a
--      └── user_b
--
-- SECURITY DEFINER allows the function to create the records without
-- depending on INSERT policies for conversations/members.
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_or_create_direct_conversation(UUID, UUID);

CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(
    user_a UUID,
    user_b UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller UUID;
    existing_conversation UUID;
    new_conversation UUID;
    now_utc TIMESTAMPTZ;
BEGIN
    caller := auth.uid();

    IF caller IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF user_a IS NULL OR user_b IS NULL THEN
        RAISE EXCEPTION 'Both participant IDs are required';
    END IF;

    IF user_a = user_b THEN
        RAISE EXCEPTION 'Cannot create a conversation with yourself';
    END IF;

    IF caller <> user_a AND caller <> user_b THEN
        RAISE EXCEPTION 'You must be a participant in the conversation';
    END IF;

    /*
     * Find an existing conversation containing exactly these two users.
     */
    SELECT c.id
    INTO existing_conversation
    FROM public.conversations c
    WHERE EXISTS (
        SELECT 1
        FROM public.conversation_members cm
        WHERE cm.conversation_id = c.id
          AND cm.user_id = user_a
    )
    AND EXISTS (
        SELECT 1
        FROM public.conversation_members cm
        WHERE cm.conversation_id = c.id
          AND cm.user_id = user_b
    )
    AND (
        SELECT COUNT(*)
        FROM public.conversation_members cm
        WHERE cm.conversation_id = c.id
    ) = 2
    LIMIT 1;

    IF existing_conversation IS NOT NULL THEN
        RETURN existing_conversation;
    END IF;


    now_utc := timezone('utc', now());

    /*
     * Create conversation.
     */
    INSERT INTO public.conversations (
        id,
        created_at,
        updated_at
    )
    VALUES (
        gen_random_uuid(),
        now_utc,
        now_utc
    )
    RETURNING id
    INTO new_conversation;


    /*
     * Add both participants.
     */
    INSERT INTO public.conversation_members (
        conversation_id,
        user_id,
        joined_at,
        last_read_at
    )
    VALUES
    (
        new_conversation,
        user_a,
        now_utc,
        now_utc
    ),
    (
        new_conversation,
        user_b,
        now_utc,
        now_utc
    );


    RETURN new_conversation;
END;
$$;


REVOKE ALL
ON FUNCTION public.get_or_create_direct_conversation(UUID, UUID)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.get_or_create_direct_conversation(UUID, UUID)
TO authenticated;


-- ============================================================================
-- 10. SINGLE-PARAMETER DIRECT CHAT RPC
-- ============================================================================
--
-- Frontend can call:
--
-- get_or_create_direct_conversation(target_user_id)
--
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_or_create_direct_conversation(UUID);

CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(
    target_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller UUID;
BEGIN
    caller := auth.uid();

    IF caller IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'Target user is required';
    END IF;

    IF caller = target_user_id THEN
        RAISE EXCEPTION 'Cannot start a conversation with yourself';
    END IF;

    RETURN public.get_or_create_direct_conversation(
        caller,
        target_user_id
    );
END;
$$;


REVOKE ALL
ON FUNCTION public.get_or_create_direct_conversation(UUID)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.get_or_create_direct_conversation(UUID)
TO authenticated;


-- ============================================================================
-- 11. COMMUNITY FEED
-- ============================================================================
--
-- IMPORTANT:
--
-- Community ONLY shows:
--
-- status = published
-- is_deleted = false
-- community_posted = true
--
-- Therefore an admin publishing a memory DOES NOT automatically put it
-- into Community.
-- ============================================================================

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

    p_limit := LEAST(GREATEST(COALESCE(p_limit, 15), 1), 50);
    p_offset := GREATEST(COALESCE(p_offset, 0), 0);


    /*
     * FOLLOWING
     */
    IF feed_tab = 'following' THEN

        SELECT COALESCE(jsonb_agg(feed_item), '[]'::jsonb)
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
                m.community_posted,
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
                    WHEN current_user_id IS NOT NULL THEN EXISTS (
                        SELECT 1
                        FROM public.memory_likes ml
                        WHERE ml.memory_id = m.id
                          AND ml.user_id = current_user_id
                    )
                    ELSE false
                END AS has_liked,

                CASE
                    WHEN current_user_id IS NOT NULL THEN EXISTS (
                        SELECT 1
                        FROM public.memory_reposts mr
                        WHERE mr.memory_id = m.id
                          AND mr.user_id = current_user_id
                    )
                    ELSE false
                END AS has_reposted,

                CASE
                    WHEN current_user_id IS NOT NULL THEN EXISTS (
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
                ON p.user_id = m.user_id

            JOIN public.locations l
                ON l.id = m.location_id

            JOIN public.categories c
                ON c.id = m.category_id

            JOIN public.follows f
                ON f.following_id = m.user_id
               AND f.follower_id = current_user_id

            LEFT JOIN public.user_memberships um
                ON um.user_id = m.user_id

            WHERE
                m.status = 'published'
                AND m.is_deleted = false
                AND m.community_posted = true

            ORDER BY m.created_at DESC

            LIMIT p_limit
            OFFSET p_offset

        ) feed_item;


    /*
     * POPULAR
     */
    ELSIF feed_tab = 'popular' THEN

        SELECT COALESCE(jsonb_agg(feed_item), '[]'::jsonb)
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
                m.community_posted,
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
                    WHEN current_user_id IS NOT NULL THEN EXISTS (
                        SELECT 1
                        FROM public.memory_likes ml
                        WHERE ml.memory_id = m.id
                          AND ml.user_id = current_user_id
                    )
                    ELSE false
                END AS has_liked,

                CASE
                    WHEN current_user_id IS NOT NULL THEN EXISTS (
                        SELECT 1
                        FROM public.memory_reposts mr
                        WHERE mr.memory_id = m.id
                          AND mr.user_id = current_user_id
                    )
                    ELSE false
                END AS has_reposted,

                CASE
                    WHEN current_user_id IS NOT NULL THEN EXISTS (
                        SELECT 1
                        FROM public.saved_memories sm
                        WHERE sm.memory_id = m.id
                          AND sm.user_id = current_user_id
                    )
                    ELSE false
                END AS has_saved,

                CASE
                    WHEN current_user_id IS NOT NULL THEN EXISTS (
                        SELECT 1
                        FROM public.follows f
                        WHERE f.follower_id = current_user_id
                          AND f.following_id = m.user_id
                    )
                    ELSE false
                END AS is_following_author

            FROM public.memories m

            JOIN public.profiles p
                ON p.user_id = m.user_id

            JOIN public.locations l
                ON l.id = m.location_id

            JOIN public.categories c
                ON c.id = m.category_id

            LEFT JOIN public.user_memberships um
                ON um.user_id = m.user_id

            WHERE
                m.status = 'published'
                AND m.is_deleted = false
                AND m.community_posted = true

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
                    ) * 4
                    +
                    (
                        SELECT COUNT(*)
                        FROM public.memory_reposts mr
                        WHERE mr.memory_id = m.id
                    ) * 5
                    +
                    COALESCE(m.view_count, 0)
                ) DESC,
                m.created_at DESC

            LIMIT p_limit
            OFFSET p_offset

        ) feed_item;


    /*
     * FOR YOU / RECENT
     */
    ELSE

        SELECT COALESCE(jsonb_agg(feed_item), '[]'::jsonb)
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
                m.community_posted,
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
                    WHEN current_user_id IS NOT NULL THEN EXISTS (
                        SELECT 1
                        FROM public.memory_likes ml
                        WHERE ml.memory_id = m.id
                          AND ml.user_id = current_user_id
                    )
                    ELSE false
                END AS has_liked,

                CASE
                    WHEN current_user_id IS NOT NULL THEN EXISTS (
                        SELECT 1
                        FROM public.memory_reposts mr
                        WHERE mr.memory_id = m.id
                          AND mr.user_id = current_user_id
                    )
                    ELSE false
                END AS has_reposted,

                CASE
                    WHEN current_user_id IS NOT NULL THEN EXISTS (
                        SELECT 1
                        FROM public.saved_memories sm
                        WHERE sm.memory_id = m.id
                          AND sm.user_id = current_user_id
                    )
                    ELSE false
                END AS has_saved,

                CASE
                    WHEN current_user_id IS NOT NULL THEN EXISTS (
                        SELECT 1
                        FROM public.follows f
                        WHERE f.follower_id = current_user_id
                          AND f.following_id = m.user_id
                    )
                    ELSE false
                END AS is_following_author

            FROM public.memories m

            JOIN public.profiles p
                ON p.user_id = m.user_id

            JOIN public.locations l
                ON l.id = m.location_id

            JOIN public.categories c
                ON c.id = m.category_id

            LEFT JOIN public.user_memberships um
                ON um.user_id = m.user_id

            WHERE
                m.status = 'published'
                AND m.is_deleted = false
                AND m.community_posted = true

            ORDER BY m.created_at DESC

            LIMIT p_limit
            OFFSET p_offset

        ) feed_item;

    END IF;


    RETURN COALESCE(result_json, '[]'::jsonb);

END;
$$;


REVOKE ALL
ON FUNCTION public.get_community_feed(TEXT, UUID, INT, INT)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.get_community_feed(TEXT, UUID, INT, INT)
TO anon, authenticated;


-- ============================================================================
-- 12. SECURITY: PREVENT NORMAL USERS FROM ACCIDENTALLY PROMOTING MEMORIES
-- ============================================================================
--
-- We intentionally DO NOT create a trigger that automatically changes
-- community_posted when status changes.
--
-- Therefore:
--
-- status = published
-- DOES NOT mean
-- community_posted = true
--
-- The frontend must explicitly set community_posted = true when the user
-- chooses "Post to Community".
-- ============================================================================


-- ============================================================================
-- 13. HELPFUL INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_memories_user_id
ON public.memories(user_id);

CREATE INDEX IF NOT EXISTS idx_memories_status
ON public.memories(status);

CREATE INDEX IF NOT EXISTS idx_memories_community_posted
ON public.memories(community_posted);

CREATE INDEX IF NOT EXISTS idx_conversation_members_user_id
ON public.conversation_members(user_id);

CREATE INDEX IF NOT EXISTS idx_conversation_members_conversation_id
ON public.conversation_members(conversation_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
ON public.messages(conversation_id);


-- ============================================================================
-- 14. POSTGREST SCHEMA RELOAD
-- ============================================================================

NOTIFY pgrst, 'reload schema';


-- ============================================================================
-- END
-- ============================================================================