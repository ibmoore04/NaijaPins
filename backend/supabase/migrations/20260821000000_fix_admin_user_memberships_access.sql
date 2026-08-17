-- ============================================================================
-- Migration: 20260821000000_fix_admin_user_memberships_access.sql
-- Description:
-- 1. Adds staff RLS SELECT policy on public.user_memberships so administrators
--    and moderators can inspect memberships across all users.
-- 2. Adds get_admin_users RPC function with SECURITY DEFINER to atomically and
--    reliably resolve user profiles, memory counts, and actual plan memberships.
-- ============================================================================

-- 1. Ensure Staff can SELECT user_memberships for admin operations
DROP POLICY IF EXISTS "Staff can view all user memberships" ON public.user_memberships;
CREATE POLICY "Staff can view all user memberships"
    ON public.user_memberships FOR SELECT
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
              AND profiles.role IN ('super_admin', 'platform_admin', 'moderator', 'support_admin', 'admin')
        )
    );

-- 2. Ensure Staff can SELECT payment_transactions if needed
DROP POLICY IF EXISTS "Staff can view all payment transactions" ON public.payment_transactions;
CREATE POLICY "Staff can view all payment transactions"
    ON public.payment_transactions FOR SELECT
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
              AND profiles.role IN ('super_admin', 'platform_admin', 'moderator', 'support_admin', 'admin')
        )
    );

-- 3. Atomic Admin Users RPC with accurate plan and memory resolution
CREATE OR REPLACE FUNCTION public.get_admin_users(
    p_page integer DEFAULT 1,
    p_limit integer DEFAULT 15,
    p_search text DEFAULT NULL,
    p_role text DEFAULT NULL,
    p_plan_type text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_offset integer;
    v_total_count bigint;
    v_users jsonb;
    v_caller_role text;
BEGIN
    -- Verify caller has staff permissions
    SELECT role::text INTO v_caller_role
    FROM public.profiles
    WHERE user_id = auth.uid();

    IF v_caller_role IS NULL OR v_caller_role NOT IN ('super_admin', 'platform_admin', 'moderator', 'support_admin', 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: Administrative access required.';
    END IF;

    v_offset := GREATEST((COALESCE(p_page, 1) - 1) * COALESCE(p_limit, 15), 0);

    -- Base user count and records query using CTE
    WITH ranked_memberships AS (
        SELECT
            um.user_id,
            um.status,
            um.current_period_end,
            um.created_at,
            um.updated_at,
            pl.name AS plan_name,
            pl.slug AS plan_slug,
            (
                um.status = 'active'
                AND LOWER(COALESCE(pl.slug, 'free')) <> 'free'
                AND (um.current_period_end IS NULL OR um.current_period_end > now())
            ) AS is_premium,
            ROW_NUMBER() OVER (
                PARTITION BY um.user_id
                ORDER BY
                    -- Prioritize active premium first
                    CASE WHEN (um.status = 'active' AND LOWER(COALESCE(pl.slug, 'free')) <> 'free' AND (um.current_period_end IS NULL OR um.current_period_end > now())) THEN 1 ELSE 0 END DESC,
                    -- Prioritize active status
                    CASE WHEN um.status = 'active' THEN 1 ELSE 0 END DESC,
                    -- Prioritize latest current_period_end / updated_at
                    COALESCE(um.current_period_end, um.updated_at, um.created_at) DESC
            ) AS rn
        FROM public.user_memberships um
        LEFT JOIN public.plans pl ON pl.id = um.plan_id
    ),
    filtered_users AS (
        SELECT
            p.id,
            p.user_id,
            p.full_name,
            p.avatar_url,
            p.bio,
            p.role::text AS role,
            p.created_at,
            p.updated_at,
            COALESCE(mem_cnt.count, 0) AS memories_count,
            COALESCE(rm.is_premium, false) AS is_premium,
            COALESCE(rm.plan_name, CASE WHEN COALESCE(rm.is_premium, false) THEN 'Premium' ELSE 'Free' END) AS plan_name,
            COALESCE(rm.plan_slug, CASE WHEN COALESCE(rm.is_premium, false) THEN 'premium' ELSE 'free' END) AS plan_slug,
            COALESCE(rm.status, 'active') AS membership_status,
            rm.current_period_end
        FROM public.profiles p
        LEFT JOIN ranked_memberships rm ON rm.user_id = p.user_id AND rm.rn = 1
        LEFT JOIN (
            SELECT user_id, COUNT(*) AS count
            FROM public.memories
            WHERE is_deleted = false
            GROUP BY user_id
        ) mem_cnt ON mem_cnt.user_id = p.user_id
        WHERE
            (p_search IS NULL OR p_search = '' OR (
                p.full_name ILIKE '%' || p_search || '%' OR
                p.bio ILIKE '%' || p_search || '%' OR
                p.role::text ILIKE '%' || p_search || '%'
            ))
            AND (p_role IS NULL OR p_role = '' OR p_role = 'all' OR p.role::text = p_role)
            AND (
                p_plan_type IS NULL OR p_plan_type = '' OR p_plan_type = 'all'
                OR (p_plan_type = 'premium' AND COALESCE(rm.is_premium, false) = true)
                OR (p_plan_type = 'free' AND COALESCE(rm.is_premium, false) = false)
            )
    )
    SELECT
        COUNT(*),
        COALESCE(
            jsonb_agg(
                to_jsonb(u.*)
                ORDER BY u.created_at DESC
            ) FILTER (WHERE u.user_id IS NOT NULL),
            '[]'::jsonb
        )
    INTO v_total_count, v_users
    FROM (
        SELECT *
        FROM filtered_users
        ORDER BY created_at DESC
        LIMIT COALESCE(p_limit, 15)
        OFFSET v_offset
    ) u;

    -- Return JSON payload with pagination metadata and items
    RETURN jsonb_build_object(
        'users', COALESCE(v_users, '[]'::jsonb),
        'total_count', COALESCE(v_total_count, 0),
        'page', COALESCE(p_page, 1),
        'limit', COALESCE(p_limit, 15),
        'total_pages', CEIL(COALESCE(v_total_count, 0)::numeric / GREATEST(COALESCE(p_limit, 15), 1)::numeric)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_users(integer, integer, text, text, text) TO authenticated;
