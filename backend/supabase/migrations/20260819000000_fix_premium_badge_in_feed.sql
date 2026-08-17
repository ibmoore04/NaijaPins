-- =============================================================================
-- NaijaPins Migration: Fix Premium Badge Calculation in Community Feed
-- =============================================================================
-- Problem:
-- A user on the Free plan has status = 'active' and current_period_end = NULL.
-- The previous get_community_feed() treated status = 'active' AND current_period_end IS NULL
-- as premium, incorrectly showing the premium crown badge for Free users.
--
-- Fix:
-- Update get_community_feed() to check the actual plan slug (excluding 'free').
-- =============================================================================

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
     * 1. FOLLOWING TAB
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
                    EXISTS (
                        SELECT 1
                        FROM public.user_memberships um2
                        JOIN public.plans pl
                            ON pl.id = um2.plan_id
                        WHERE um2.user_id = m.user_id
                          AND um2.status = 'active'
                          AND LOWER(COALESCE(pl.slug, 'free')) <> 'free'
                          AND (
                              um2.current_period_end IS NULL
                              OR um2.current_period_end > now()
                          )
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

            WHERE
                m.status = 'published'
                AND m.is_deleted = false
                AND m.community_posted = true

            ORDER BY m.created_at DESC

            LIMIT p_limit
            OFFSET p_offset

        ) feed_item;


    /*
     * 2. POPULAR TAB
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
                    EXISTS (
                        SELECT 1
                        FROM public.user_memberships um2
                        JOIN public.plans pl
                            ON pl.id = um2.plan_id
                        WHERE um2.user_id = m.user_id
                          AND um2.status = 'active'
                          AND LOWER(COALESCE(pl.slug, 'free')) <> 'free'
                          AND (
                              um2.current_period_end IS NULL
                              OR um2.current_period_end > now()
                          )
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
     * 3. FOR YOU / RECENT TAB
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
                    EXISTS (
                        SELECT 1
                        FROM public.user_memberships um2
                        JOIN public.plans pl
                            ON pl.id = um2.plan_id
                        WHERE um2.user_id = m.user_id
                          AND um2.status = 'active'
                          AND LOWER(COALESCE(pl.slug, 'free')) <> 'free'
                          AND (
                              um2.current_period_end IS NULL
                              OR um2.current_period_end > now()
                          )
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

REVOKE ALL ON FUNCTION public.get_community_feed(TEXT, UUID, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_community_feed(TEXT, UUID, INT, INT) TO anon, authenticated;

-- Reload schema in PostgREST
NOTIFY pgrst, 'reload schema';
