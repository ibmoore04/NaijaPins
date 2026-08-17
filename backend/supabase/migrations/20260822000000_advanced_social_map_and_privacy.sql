-- =============================================================================
-- Migration: Advanced Social Map, Strict Privacy Enforcement & Discovery Engine
-- =============================================================================

-- 1. Performance Indexes for Social Map and Discovery Queries
CREATE INDEX IF NOT EXISTS idx_memories_map_social_discovery 
ON public.memories (status, is_deleted, community_posted, user_id);

CREATE INDEX IF NOT EXISTS idx_memories_year_status 
ON public.memories (year, status, is_deleted);

CREATE INDEX IF NOT EXISTS idx_locations_lat_lng 
ON public.locations (latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_memory_likes_memory_id 
ON public.memory_likes (memory_id);

CREATE INDEX IF NOT EXISTS idx_memory_comments_memory_id 
ON public.memory_comments (memory_id);

CREATE INDEX IF NOT EXISTS idx_memory_reposts_original_memory_id 
ON public.memory_reposts (original_memory_id);

CREATE INDEX IF NOT EXISTS idx_follows_follower_following 
ON public.follows (follower_id, following_id);

-- 2. Enhanced get_map_pins_in_bounds RPC with Strict Database-level Privacy Enforcement
CREATE OR REPLACE FUNCTION public.get_map_pins_in_bounds(
    min_lat DOUBLE PRECISION DEFAULT NULL,
    max_lat DOUBLE PRECISION DEFAULT NULL,
    min_lng DOUBLE PRECISION DEFAULT NULL,
    max_lng DOUBLE PRECISION DEFAULT NULL,
    start_year INTEGER DEFAULT 1960,
    end_year INTEGER DEFAULT 2030,
    category_id_filter UUID DEFAULT NULL,
    p_current_user_id UUID DEFAULT NULL,
    p_social_filter TEXT DEFAULT 'all',
    p_user_id_filter UUID DEFAULT NULL,
    p_search_query TEXT DEFAULT NULL,
    p_hashtag TEXT DEFAULT NULL,
    p_center_lat DOUBLE PRECISION DEFAULT NULL,
    p_center_lng DOUBLE PRECISION DEFAULT NULL,
    p_radius_km DOUBLE PRECISION DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    slug TEXT,
    story_preview TEXT,
    date_type TEXT,
    year INTEGER,
    city TEXT,
    state TEXT,
    category_name TEXT,
    category_icon TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    thumbnail_url TEXT,
    has_audio BOOLEAN,
    author_id UUID,
    author_name TEXT,
    author_avatar_url TEXT,
    author_role TEXT,
    author_is_premium BOOLEAN,
    is_following BOOLEAN,
    is_follower BOOLEAN,
    is_own BOOLEAN,
    likes_count BIGINT,
    comments_count BIGINT,
    reposts_count BIGINT,
    engagement_score BIGINT,
    created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    WITH base_memories AS (
        SELECT 
            m.id,
            m.title,
            m.slug,
            substring(m.story from 1 for 180) as story_preview,
            m.date_type::TEXT,
            m.year,
            l.city,
            l.state,
            c.name as category_name,
            c.icon as category_icon,
            l.latitude,
            l.longitude,
            (
                SELECT mm.file_url 
                FROM public.memory_media mm 
                WHERE mm.memory_id = m.id AND mm.media_type = 'image' 
                ORDER BY mm.display_order ASC 
                LIMIT 1
            ) as thumbnail_url,
            EXISTS(
                SELECT 1 
                FROM public.memory_media mm 
                WHERE mm.memory_id = m.id AND mm.media_type = 'audio'
            ) as has_audio,
            p.user_id as author_id,
            p.full_name as author_name,
            p.avatar_url as author_avatar_url,
            p.role as author_role,
            EXISTS (
                SELECT 1
                FROM public.user_memberships um
                JOIN public.plans pl ON pl.id = um.plan_id
                WHERE um.user_id = m.user_id
                  AND um.status = 'active'
                  AND LOWER(COALESCE(pl.slug, 'free')) <> 'free'
                  AND (um.current_period_end IS NULL OR um.current_period_end > now())
            ) as author_is_premium,
            CASE 
                WHEN p_current_user_id IS NOT NULL THEN
                    EXISTS(SELECT 1 FROM public.follows f WHERE f.follower_id = p_current_user_id AND f.following_id = m.user_id)
                ELSE false
            END as is_following,
            CASE 
                WHEN p_current_user_id IS NOT NULL THEN
                    EXISTS(SELECT 1 FROM public.follows f WHERE f.follower_id = m.user_id AND f.following_id = p_current_user_id)
                ELSE false
            END as is_follower,
            CASE 
                WHEN p_current_user_id IS NOT NULL THEN (m.user_id = p_current_user_id)
                ELSE false
            END as is_own,
            (SELECT COUNT(*)::BIGINT FROM public.memory_likes lk WHERE lk.memory_id = m.id) as likes_count,
            (SELECT COUNT(*)::BIGINT FROM public.memory_comments cm WHERE cm.memory_id = m.id) as comments_count,
            (SELECT COUNT(*)::BIGINT FROM public.memory_reposts rp WHERE rp.original_memory_id = m.id) as reposts_count,
            (
                (SELECT COUNT(*)::BIGINT FROM public.memory_likes lk WHERE lk.memory_id = m.id) * 3 +
                (SELECT COUNT(*)::BIGINT FROM public.memory_comments cm WHERE cm.memory_id = m.id) * 4 +
                (SELECT COUNT(*)::BIGINT FROM public.memory_reposts rp WHERE rp.original_memory_id = m.id) * 5 +
                COALESCE(m.view_count, 0)
            ) as engagement_score,
            m.created_at
        FROM public.memories m
        JOIN public.locations l ON m.location_id = l.id
        JOIN public.categories c ON m.category_id = c.id
        JOIN public.profiles p ON m.user_id = p.user_id
        WHERE 
            -- BASE VISIBILITY CONSTRAINT: Published and Not Deleted
            m.status = 'published'
            AND m.is_deleted = false
            -- Valid Coordinates Required
            AND l.latitude IS NOT NULL
            AND l.longitude IS NOT NULL
            -- STRICT PRIVACY & COMMUNITY POSTED ENFORCEMENT:
            -- An owner may see their own non-community memory ONLY when 'my_memories' or 'social' filter is active.
            -- All other users and public views (all, following, followers, recent, popular, near_me, search, hashtags, and p_user_id_filter)
            -- STRICTLY require m.community_posted = true.
            AND (
                (m.community_posted = true)
                OR 
                (p_current_user_id IS NOT NULL AND m.user_id = p_current_user_id AND (p_social_filter = 'my_memories' OR p_social_filter = 'social'))
            )
            -- Geographic Bounding Box Check (when bounds provided)
            AND (min_lat IS NULL OR l.latitude BETWEEN min_lat AND max_lat)
            AND (min_lng IS NULL OR l.longitude BETWEEN min_lng AND max_lng)
            -- Year / Era Range Filter
            AND (start_year IS NULL OR m.year >= start_year)
            AND (end_year IS NULL OR m.year <= end_year)
            -- Category Filter
            AND (category_id_filter IS NULL OR m.category_id = category_id_filter)
            -- User Profile Filter ("View All Pins from User")
            -- Even if p_user_id_filter is provided, non-community memories remain protected by the community_posted check above
            AND (p_user_id_filter IS NULL OR m.user_id = p_user_id_filter)
            -- Search Query Filter (Searched only on visible memories)
            AND (
                p_search_query IS NULL 
                OR p_search_query = ''
                OR m.title ILIKE '%' || p_search_query || '%'
                OR m.story ILIKE '%' || p_search_query || '%'
                OR l.city ILIKE '%' || p_search_query || '%'
                OR l.state ILIKE '%' || p_search_query || '%'
                OR p.full_name ILIKE '%' || p_search_query || '%'
            )
            -- Hashtag Filter
            AND (
                p_hashtag IS NULL
                OR p_hashtag = ''
                OR m.story ILIKE '%#' || replace(p_hashtag, '#', '') || '%'
                OR m.title ILIKE '%#' || replace(p_hashtag, '#', '') || '%'
            )
            -- Proximity / "Near Me" Radius Filter with Safe Coordinate Boundary Check
            AND (
                p_center_lat IS NULL 
                OR p_center_lng IS NULL 
                OR p_radius_km IS NULL
                OR (
                    6371 * acos(
                        LEAST(1.0, GREATEST(-1.0,
                            cos(radians(p_center_lat)) * cos(radians(l.latitude)) * 
                            cos(radians(l.longitude) - radians(p_center_lng)) + 
                            sin(radians(p_center_lat)) * sin(radians(l.latitude))
                        ))
                    )
                ) <= p_radius_km
            )
    )
    SELECT 
        bm.id,
        bm.title,
        bm.slug,
        bm.story_preview,
        bm.date_type,
        bm.year,
        bm.city,
        bm.state,
        bm.category_name,
        bm.category_icon,
        bm.latitude,
        bm.longitude,
        bm.thumbnail_url,
        bm.has_audio,
        bm.author_id,
        bm.author_name,
        bm.author_avatar_url,
        bm.author_role,
        bm.author_is_premium,
        bm.is_following,
        bm.is_follower,
        bm.is_own,
        bm.likes_count,
        bm.comments_count,
        bm.reposts_count,
        bm.engagement_score,
        bm.created_at
    FROM base_memories bm
    WHERE 
        -- SOCIAL FILTER APPLICATION
        CASE 
            WHEN p_social_filter = 'following' THEN bm.is_following = true
            WHEN p_social_filter = 'followers' THEN bm.is_follower = true
            WHEN p_social_filter = 'my_memories' THEN bm.is_own = true
            WHEN p_social_filter = 'social' THEN (bm.is_following = true OR bm.is_follower = true OR bm.is_own = true)
            ELSE true
        END
    ORDER BY 
        CASE 
            WHEN p_social_filter = 'popular' THEN bm.engagement_score 
            ELSE 0 
        END DESC,
        bm.created_at DESC
    LIMIT 300;
$$;
