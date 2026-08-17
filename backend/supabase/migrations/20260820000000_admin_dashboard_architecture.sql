-- =============================================================================
-- NaijaPins Migration
-- Admin Dashboard Architecture & Role-Based Security
-- Version: 20260820000000
-- =============================================================================
--
-- PURPOSE
--   Build the secure database foundation for the unified NaijaPins Admin
--   Dashboard.
--
-- ADMIN ROLES
--   1. super_admin
--   2. platform_admin
--   3. moderator
--   4. support_admin
--
-- SECURITY PRINCIPLE
--   Frontend route guards and UI permissions are UX protections only.
--   PostgreSQL RPC/RLS authorization remains the final security boundary.
--
-- IMPORTANT
--   community_posted and moderation status remain completely independent.
--
-- =============================================================================


-- =============================================================================
-- 1. EXTEND USER ROLE ENUM
-- =============================================================================

DO $$
BEGIN

    IF EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'user_role'
    ) THEN

        BEGIN
            ALTER TYPE public.user_role
            ADD VALUE IF NOT EXISTS 'super_admin';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;

        BEGIN
            ALTER TYPE public.user_role
            ADD VALUE IF NOT EXISTS 'platform_admin';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;

        BEGIN
            ALTER TYPE public.user_role
            ADD VALUE IF NOT EXISTS 'support_admin';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;

    END IF;

END
$$;


-- =============================================================================
-- 2. ADMIN AUDIT LOGS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    admin_id UUID NOT NULL
        REFERENCES public.profiles(user_id)
        ON DELETE CASCADE,

    action TEXT NOT NULL,

    target_type TEXT NOT NULL,

    target_id TEXT,

    details JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT timezone('utc'::text, now())
);


-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id
ON public.admin_audit_logs(admin_id);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action
ON public.admin_audit_logs(action);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at
ON public.admin_audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target
ON public.admin_audit_logs(target_type, target_id);


-- Enable RLS
ALTER TABLE public.admin_audit_logs
ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 3. AUDIT LOG POLICIES
-- =============================================================================

DROP POLICY IF EXISTS "Admins can view audit logs"
ON public.admin_audit_logs;

CREATE POLICY "Admins can view audit logs"
ON public.admin_audit_logs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.user_id = auth.uid()
        AND p.role IN (
            'super_admin',
            'platform_admin',
            'moderator',
            'support_admin',
            'admin'
        )
    )
);


-- Do NOT expose a general audit-log INSERT capability to the frontend.
--
-- Administrative actions should create their own audit entries through
-- SECURITY DEFINER RPCs.
--
-- Remove any old direct INSERT policy if it exists.

DROP POLICY IF EXISTS "Admins can insert audit logs"
ON public.admin_audit_logs;


-- =============================================================================
-- 4. REPORTS TABLE ENHANCEMENTS
-- =============================================================================

DO $$
BEGIN

    -- Add comment_id when missing
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'reports'
        AND column_name = 'comment_id'
    ) THEN

        ALTER TABLE public.reports
        ADD COLUMN comment_id UUID
        REFERENCES public.memory_comments(id)
        ON DELETE CASCADE;

    END IF;


    -- Add resolution notes when missing
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'reports'
        AND column_name = 'resolution_notes'
    ) THEN

        ALTER TABLE public.reports
        ADD COLUMN resolution_notes TEXT;

    END IF;

END
$$;


-- =============================================================================
-- 5. REPORTS RLS
-- =============================================================================

ALTER TABLE public.reports
ENABLE ROW LEVEL SECURITY;


-- Users can create reports for themselves
DROP POLICY IF EXISTS "Users can create reports"
ON public.reports;

CREATE POLICY "Users can create reports"
ON public.reports
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = reporter_id
);


-- Users can view their own reports
DROP POLICY IF EXISTS "Reporters can view their own reports"
ON public.reports;

CREATE POLICY "Reporters can view their own reports"
ON public.reports
FOR SELECT
TO authenticated
USING (
    auth.uid() = reporter_id
);


-- Staff can view reports
DROP POLICY IF EXISTS "Staff can view all reports"
ON public.reports;

CREATE POLICY "Staff can view all reports"
ON public.reports
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.user_id = auth.uid()
        AND p.role IN (
            'super_admin',
            'platform_admin',
            'moderator',
            'support_admin',
            'admin'
        )
    )
);


-- Direct staff UPDATE access is intentionally removed.
--
-- Reports should be resolved through the secure RPC:
-- public.admin_resolve_report()

DROP POLICY IF EXISTS "Staff can update reports"
ON public.reports;


-- =============================================================================
-- 6. CATEGORY ADMIN POLICIES
-- =============================================================================

ALTER TABLE public.categories
ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "Admins can insert categories"
ON public.categories;

CREATE POLICY "Admins can insert categories"
ON public.categories
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.user_id = auth.uid()
        AND p.role IN (
            'super_admin',
            'platform_admin',
            'admin'
        )
    )
);


DROP POLICY IF EXISTS "Admins can update categories"
ON public.categories;

CREATE POLICY "Admins can update categories"
ON public.categories
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.user_id = auth.uid()
        AND p.role IN (
            'super_admin',
            'platform_admin',
            'admin'
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.user_id = auth.uid()
        AND p.role IN (
            'super_admin',
            'platform_admin',
            'admin'
        )
    )
);


-- =============================================================================
-- 7. ADMIN OVERVIEW KPI STATISTICS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_admin_overview_stats()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$

DECLARE

    caller_role public.user_role;

    v_total_users INT DEFAULT 0;
    v_active_users INT DEFAULT 0;
    v_new_users_week INT DEFAULT 0;

    v_total_memories INT DEFAULT 0;
    v_published_memories INT DEFAULT 0;
    v_pending_memories INT DEFAULT 0;
    v_rejected_memories INT DEFAULT 0;
    v_memories_week INT DEFAULT 0;

    v_open_reports INT DEFAULT 0;

    v_premium_members INT DEFAULT 0;
    v_free_members INT DEFAULT 0;

    v_total_likes INT DEFAULT 0;
    v_total_comments INT DEFAULT 0;
    v_total_reposts INT DEFAULT 0;

BEGIN

    -- Authentication
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: authentication required';
    END IF;


    -- Get caller role
    SELECT role
    INTO caller_role
    FROM public.profiles
    WHERE user_id = auth.uid();


    -- Staff authorization
    IF caller_role IS NULL
       OR caller_role NOT IN (
            'super_admin',
            'platform_admin',
            'moderator',
            'support_admin',
            'admin'
       )
    THEN
        RAISE EXCEPTION 'Forbidden: administrator access required';
    END IF;


    -- Total users
    SELECT COUNT(*)::INT
    INTO v_total_users
    FROM public.profiles;


    -- New users in last 7 days
    SELECT COUNT(*)::INT
    INTO v_new_users_week
    FROM public.profiles
    WHERE created_at >= now() - interval '7 days';


    -- Active users in last 30 days
    SELECT COUNT(DISTINCT user_id)::INT
    INTO v_active_users
    FROM (

        SELECT user_id
        FROM public.memories
        WHERE created_at >= now() - interval '30 days'

        UNION

        SELECT user_id
        FROM public.memory_comments
        WHERE created_at >= now() - interval '30 days'

        UNION

        SELECT user_id
        FROM public.memory_likes
        WHERE created_at >= now() - interval '30 days'

    ) active_pool;


    -- Total memories
    SELECT COUNT(*)::INT
    INTO v_total_memories
    FROM public.memories
    WHERE is_deleted = false;


    -- Published
    SELECT COUNT(*)::INT
    INTO v_published_memories
    FROM public.memories
    WHERE is_deleted = false
    AND status = 'published';


    -- Pending
    SELECT COUNT(*)::INT
    INTO v_pending_memories
    FROM public.memories
    WHERE is_deleted = false
    AND status = 'pending_review';


    -- Rejected
    SELECT COUNT(*)::INT
    INTO v_rejected_memories
    FROM public.memories
    WHERE is_deleted = false
    AND status = 'rejected';


    -- Memories created this week
    SELECT COUNT(*)::INT
    INTO v_memories_week
    FROM public.memories
    WHERE is_deleted = false
    AND created_at >= now() - interval '7 days';


    -- Open reports
    SELECT COUNT(*)::INT
    INTO v_open_reports
    FROM public.reports
    WHERE status IN (
        'pending',
        'under_review'
    );


    -- =========================================================================
    -- PREMIUM USERS
    -- =========================================================================
    --
    -- IMPORTANT:
    -- A Free plan is NEVER premium.
    --
    -- Premium requires:
    --   status = active
    --   plan slug != free
    --   subscription is not expired
    --

    SELECT COUNT(DISTINCT um.user_id)::INT
    INTO v_premium_members
    FROM public.user_memberships um
    JOIN public.plans pl
        ON pl.id = um.plan_id
    WHERE um.status = 'active'
    AND LOWER(COALESCE(pl.slug, 'free')) <> 'free'
    AND (
        um.current_period_end IS NULL
        OR um.current_period_end > now()
    );


    -- Free users
    v_free_members :=
        GREATEST(
            v_total_users - v_premium_members,
            0
        );


    -- Engagement totals
    SELECT COUNT(*)::INT
    INTO v_total_likes
    FROM public.memory_likes;


    SELECT COUNT(*)::INT
    INTO v_total_comments
    FROM public.memory_comments
    WHERE is_deleted = false;


    SELECT COUNT(*)::INT
    INTO v_total_reposts
    FROM public.memory_reposts;


    RETURN jsonb_build_object(

        'total_users',
        v_total_users,

        'active_users',
        v_active_users,

        'new_users_week',
        v_new_users_week,

        'total_memories',
        v_total_memories,

        'published_memories',
        v_published_memories,

        'pending_memories',
        v_pending_memories,

        'rejected_memories',
        v_rejected_memories,

        'memories_week',
        v_memories_week,

        'open_reports',
        v_open_reports,

        'premium_members',
        v_premium_members,

        'free_members',
        v_free_members,

        'total_likes',
        v_total_likes,

        'total_comments',
        v_total_comments,

        'total_reposts',
        v_total_reposts

    );

END;
$$;


-- =============================================================================
-- 8. ADMIN ANALYTICS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_admin_analytics()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$

DECLARE

    caller_role public.user_role;

    v_categories JSONB;
    v_states JSONB;
    v_status_dist JSONB;
    v_growth JSONB;

BEGIN

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;


    SELECT role
    INTO caller_role
    FROM public.profiles
    WHERE user_id = auth.uid();


    IF caller_role IS NULL
       OR caller_role NOT IN (
            'super_admin',
            'platform_admin',
            'admin'
       )
    THEN
        RAISE EXCEPTION 'Forbidden: analytics access required';
    END IF;


    -- =========================================================================
    -- MEMORIES BY CATEGORY
    -- =========================================================================

    SELECT COALESCE(
        jsonb_agg(cat_row),
        '[]'::jsonb
    )
    INTO v_categories

    FROM (

        SELECT
            c.id,
            c.name,
            c.slug,
            c.icon,
            COUNT(m.id)::INT AS count

        FROM public.categories c

        LEFT JOIN public.memories m
            ON m.category_id = c.id
            AND m.is_deleted = false

        GROUP BY
            c.id,
            c.name,
            c.slug,
            c.icon

        ORDER BY count DESC

    ) cat_row;


    -- =========================================================================
    -- MEMORIES BY NIGERIAN STATE
    -- =========================================================================

    SELECT COALESCE(
        jsonb_agg(state_row),
        '[]'::jsonb
    )
    INTO v_states

    FROM (

        SELECT
            l.state,
            COUNT(m.id)::INT AS count

        FROM public.locations l

        JOIN public.memories m
            ON m.location_id = l.id
            AND m.is_deleted = false

        WHERE
            l.state IS NOT NULL
            AND trim(l.state) <> ''

        GROUP BY l.state

        ORDER BY count DESC

        LIMIT 10

    ) state_row;


    -- =========================================================================
    -- MEMORY STATUS DISTRIBUTION
    -- =========================================================================

    SELECT COALESCE(
        jsonb_agg(status_row),
        '[]'::jsonb
    )
    INTO v_status_dist

    FROM (

        SELECT
            m.status,
            COUNT(*)::INT AS count

        FROM public.memories m

        WHERE m.is_deleted = false

        GROUP BY m.status

    ) status_row;


    -- =========================================================================
    -- MONTHLY MEMORY GROWTH
    -- =========================================================================

    SELECT COALESCE(
        jsonb_agg(g_row),
        '[]'::jsonb
    )
    INTO v_growth

    FROM (

        SELECT
            to_char(
                date_trunc('month', m.created_at),
                'Mon YYYY'
            ) AS month_label,

            COUNT(m.id)::INT AS memories_count

        FROM public.memories m

        WHERE
            m.created_at >= now() - interval '6 months'
            AND m.is_deleted = false

        GROUP BY
            date_trunc('month', m.created_at)

        ORDER BY
            date_trunc('month', m.created_at) ASC

    ) g_row;


    RETURN jsonb_build_object(

        'categories',
        v_categories,

        'states',
        v_states,

        'status_distribution',
        v_status_dist,

        'monthly_growth',
        v_growth

    );

END;
$$;


-- =============================================================================
-- 9. ADMIN MEMORY STATUS UPDATE
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_update_memory_status(
    p_memory_id UUID,
    p_status TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$

DECLARE

    caller_role public.user_role;
    old_status TEXT;

BEGIN

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;


    SELECT role
    INTO caller_role
    FROM public.profiles
    WHERE user_id = auth.uid();


    IF caller_role IS NULL
       OR caller_role NOT IN (
            'super_admin',
            'platform_admin',
            'moderator',
            'admin'
       )
    THEN
        RAISE EXCEPTION 'Forbidden: insufficient moderation permissions';
    END IF;


    -- Validate status
    IF p_status NOT IN (
        'draft',
        'pending_review',
        'published',
        'rejected',
        'hidden'
    )
    THEN
        RAISE EXCEPTION 'Invalid memory status: %', p_status;
    END IF;


    -- Get current status
    SELECT status::TEXT
    INTO old_status
    FROM public.memories
    WHERE id = p_memory_id;


    IF old_status IS NULL THEN
        RAISE EXCEPTION 'Memory not found';
    END IF;


    -- Update moderation status ONLY.
    --
    -- community_posted remains untouched.

    UPDATE public.memories

    SET
        status = p_status::public.memory_status,
        updated_at = timezone('utc'::text, now())

    WHERE id = p_memory_id;


    -- Audit log
    INSERT INTO public.admin_audit_logs (
        admin_id,
        action,
        target_type,
        target_id,
        details
    )

    VALUES (
        auth.uid(),
        'UPDATE_MEMORY_STATUS',
        'memory',
        p_memory_id::TEXT,

        jsonb_build_object(
            'old_status',
            old_status,

            'new_status',
            p_status,

            'notes',
            p_notes
        )
    );


    RETURN jsonb_build_object(

        'success',
        true,

        'memory_id',
        p_memory_id,

        'status',
        p_status

    );

END;
$$;


-- =============================================================================
-- 10. ADMIN TOGGLE COMMUNITY POSTED
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_toggle_community_posted(
    p_memory_id UUID,
    p_community_posted BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$

DECLARE

    caller_role public.user_role;
    old_value BOOLEAN;

BEGIN

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;


    SELECT role
    INTO caller_role
    FROM public.profiles
    WHERE user_id = auth.uid();


    IF caller_role IS NULL
       OR caller_role NOT IN (
            'super_admin',
            'platform_admin',
            'moderator',
            'admin'
       )
    THEN
        RAISE EXCEPTION 'Forbidden: insufficient moderation permissions';
    END IF;


    SELECT community_posted
    INTO old_value
    FROM public.memories
    WHERE id = p_memory_id;


    IF old_value IS NULL THEN
        RAISE EXCEPTION 'Memory not found';
    END IF;


    UPDATE public.memories

    SET
        community_posted = p_community_posted,
        updated_at = timezone('utc'::text, now())

    WHERE id = p_memory_id;


    INSERT INTO public.admin_audit_logs (
        admin_id,
        action,
        target_type,
        target_id,
        details
    )

    VALUES (
        auth.uid(),
        'TOGGLE_COMMUNITY_POSTED',
        'memory',
        p_memory_id::TEXT,

        jsonb_build_object(
            'old_value',
            old_value,

            'new_value',
            p_community_posted
        )
    );


    RETURN jsonb_build_object(

        'success',
        true,

        'memory_id',
        p_memory_id,

        'community_posted',
        p_community_posted

    );

END;
$$;


-- =============================================================================
-- 11. ADMIN USER ROLE UPDATE
-- SUPER ADMIN ONLY
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_update_user_role(
    p_target_user_id UUID,
    p_new_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$

DECLARE

    caller_role public.user_role;
    old_role TEXT;

BEGIN

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;


    SELECT role
    INTO caller_role
    FROM public.profiles
    WHERE user_id = auth.uid();


    -- STRICT SUPER ADMIN ONLY
    IF caller_role IS NULL
       OR caller_role <> 'super_admin'
    THEN
        RAISE EXCEPTION
            'Forbidden: only super administrators can change user roles';
    END IF;


    -- Prevent assigning arbitrary values
    IF p_new_role NOT IN (
        'visitor',
        'authenticated_user',
        'moderator',
        'support_admin',
        'platform_admin',
        'super_admin',
        'admin'
    )
    THEN
        RAISE EXCEPTION 'Invalid user role: %', p_new_role;
    END IF;


    -- Prevent self-demotion
    IF p_target_user_id = auth.uid()
       AND p_new_role <> 'super_admin'
    THEN
        RAISE EXCEPTION
            'Super administrators cannot remove their own super administrator role';
    END IF;


    SELECT role::TEXT
    INTO old_role
    FROM public.profiles
    WHERE user_id = p_target_user_id;


    IF old_role IS NULL THEN
        RAISE EXCEPTION 'Target user not found';
    END IF;


    UPDATE public.profiles

    SET
        role = p_new_role::public.user_role,
        updated_at = timezone('utc'::text, now())

    WHERE user_id = p_target_user_id;


    INSERT INTO public.admin_audit_logs (
        admin_id,
        action,
        target_type,
        target_id,
        details
    )

    VALUES (
        auth.uid(),
        'UPDATE_USER_ROLE',
        'user',
        p_target_user_id::TEXT,

        jsonb_build_object(
            'old_role',
            old_role,

            'new_role',
            p_new_role
        )
    );


    RETURN jsonb_build_object(

        'success',
        true,

        'user_id',
        p_target_user_id,

        'role',
        p_new_role

    );

END;
$$;


-- =============================================================================
-- 12. ADMIN RESOLVE REPORT
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_resolve_report(
    p_report_id UUID,
    p_status TEXT,
    p_resolution_notes TEXT DEFAULT NULL,
    p_memory_action TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$

DECLARE

    caller_role public.user_role;

    v_memory_id UUID;
    v_comment_id UUID;

BEGIN

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;


    SELECT role
    INTO caller_role
    FROM public.profiles
    WHERE user_id = auth.uid();


    IF caller_role IS NULL
       OR caller_role NOT IN (
            'super_admin',
            'platform_admin',
            'moderator',
            'support_admin',
            'admin'
       )
    THEN
        RAISE EXCEPTION 'Forbidden: report management requires staff access';
    END IF;


    -- Validate report status
    IF p_status NOT IN (
        'pending',
        'under_review',
        'resolved_dismissed',
        'resolved_removed'
    )
    THEN
        RAISE EXCEPTION 'Invalid report status: %', p_status;
    END IF;


    -- Validate memory action
    IF p_memory_action IS NOT NULL
       AND p_memory_action NOT IN (
            'hide',
            'delete',
            'unpost_community',
            'none'
       )
    THEN
        RAISE EXCEPTION 'Invalid memory action: %', p_memory_action;
    END IF;


    -- Moderation actions require moderation permissions.
    IF p_memory_action IN (
        'hide',
        'delete',
        'unpost_community'
    )
    AND caller_role NOT IN (
        'super_admin',
        'platform_admin',
        'moderator',
        'admin'
    )
    THEN
        RAISE EXCEPTION
            'Forbidden: this report action requires moderation permissions';
    END IF;


    -- Get report target
    SELECT
        memory_id,
        comment_id
    INTO
        v_memory_id,
        v_comment_id

    FROM public.reports

    WHERE id = p_report_id;


    IF v_memory_id IS NULL
       AND v_comment_id IS NULL
    THEN
        RAISE EXCEPTION 'Report not found or has no valid target';
    END IF;


    -- Update report
    UPDATE public.reports

    SET
        status = p_status::public.report_status,
        resolved_by = auth.uid(),
        resolution_notes = p_resolution_notes,
        updated_at = timezone('utc'::text, now())

    WHERE id = p_report_id;


    -- =========================================================================
    -- MEMORY ACTIONS
    -- =========================================================================

    IF v_memory_id IS NOT NULL
       AND p_memory_action IS NOT NULL
    THEN

        IF p_memory_action = 'hide' THEN

            UPDATE public.memories

            SET
                status = 'hidden',
                updated_at = timezone('utc'::text, now())

            WHERE id = v_memory_id;


        ELSIF p_memory_action = 'delete' THEN

            UPDATE public.memories

            SET
                is_deleted = true,
                updated_at = timezone('utc'::text, now())

            WHERE id = v_memory_id;


        ELSIF p_memory_action = 'unpost_community' THEN

            UPDATE public.memories

            SET
                community_posted = false,
                updated_at = timezone('utc'::text, now())

            WHERE id = v_memory_id;

        END IF;

    END IF;


    -- =========================================================================
    -- AUDIT
    -- =========================================================================

    INSERT INTO public.admin_audit_logs (
        admin_id,
        action,
        target_type,
        target_id,
        details
    )

    VALUES (
        auth.uid(),
        'RESOLVE_REPORT',
        'report',
        p_report_id::TEXT,

        jsonb_build_object(

            'status',
            p_status,

            'notes',
            p_resolution_notes,

            'memory_action',
            p_memory_action,

            'memory_id',
            v_memory_id,

            'comment_id',
            v_comment_id

        )
    );


    RETURN jsonb_build_object(

        'success',
        true,

        'report_id',
        p_report_id,

        'status',
        p_status

    );

END;
$$;


-- =============================================================================
-- 13. ADMIN CATEGORY UPSERT
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_upsert_category(
    p_id UUID DEFAULT NULL,
    p_name TEXT DEFAULT '',
    p_slug TEXT DEFAULT '',
    p_description TEXT DEFAULT NULL,
    p_icon TEXT DEFAULT 'MapPin',
    p_is_active BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$

DECLARE

    caller_role public.user_role;
    ret_id UUID;

BEGIN

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;


    SELECT role
    INTO caller_role
    FROM public.profiles
    WHERE user_id = auth.uid();


    IF caller_role IS NULL
       OR caller_role NOT IN (
            'super_admin',
            'platform_admin',
            'admin'
       )
    THEN
        RAISE EXCEPTION
            'Forbidden: category management requires admin privileges';
    END IF;


    -- Validate name
    IF trim(COALESCE(p_name, '')) = '' THEN
        RAISE EXCEPTION 'Category name is required';
    END IF;


    -- Validate slug
    IF trim(COALESCE(p_slug, '')) = '' THEN
        RAISE EXCEPTION 'Category slug is required';
    END IF;


    -- Update existing category
    IF p_id IS NOT NULL THEN

        UPDATE public.categories

        SET
            name = trim(p_name),
            slug = lower(trim(p_slug)),
            description = p_description,
            icon = p_icon,
            is_active = p_is_active

        WHERE id = p_id

        RETURNING id
        INTO ret_id;


        IF ret_id IS NULL THEN
            RAISE EXCEPTION 'Category not found';
        END IF;


        INSERT INTO public.admin_audit_logs (
            admin_id,
            action,
            target_type,
            target_id,
            details
        )

        VALUES (
            auth.uid(),
            'UPDATE_CATEGORY',
            'category',
            ret_id::TEXT,

            jsonb_build_object(
                'name',
                p_name,

                'slug',
                p_slug,

                'is_active',
                p_is_active
            )
        );


    ELSE

        -- Create category
        INSERT INTO public.categories (
            name,
            slug,
            description,
            icon,
            is_active
        )

        VALUES (
            trim(p_name),
            lower(trim(p_slug)),
            p_description,
            p_icon,
            p_is_active
        )

        RETURNING id
        INTO ret_id;


        INSERT INTO public.admin_audit_logs (
            admin_id,
            action,
            target_type,
            target_id,
            details
        )

        VALUES (
            auth.uid(),
            'CREATE_CATEGORY',
            'category',
            ret_id::TEXT,

            jsonb_build_object(
                'name',
                p_name,

                'slug',
                p_slug,

                'is_active',
                p_is_active
            )
        );

    END IF;


    RETURN jsonb_build_object(

        'success',
        true,

        'category_id',
        ret_id

    );

END;
$$;


-- =============================================================================
-- 14. FUNCTION PERMISSIONS
-- =============================================================================

REVOKE ALL
ON FUNCTION public.get_admin_overview_stats()
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.get_admin_overview_stats()
TO authenticated;


REVOKE ALL
ON FUNCTION public.get_admin_analytics()
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.get_admin_analytics()
TO authenticated;


REVOKE ALL
ON FUNCTION public.admin_update_memory_status(UUID, TEXT, TEXT)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.admin_update_memory_status(UUID, TEXT, TEXT)
TO authenticated;


REVOKE ALL
ON FUNCTION public.admin_toggle_community_posted(UUID, BOOLEAN)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.admin_toggle_community_posted(UUID, BOOLEAN)
TO authenticated;


REVOKE ALL
ON FUNCTION public.admin_update_user_role(UUID, TEXT)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.admin_update_user_role(UUID, TEXT)
TO authenticated;


REVOKE ALL
ON FUNCTION public.admin_resolve_report(UUID, TEXT, TEXT, TEXT)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.admin_resolve_report(UUID, TEXT, TEXT, TEXT)
TO authenticated;


REVOKE ALL
ON FUNCTION public.admin_upsert_category(
    UUID,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    BOOLEAN
)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.admin_upsert_category(
    UUID,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    BOOLEAN
)
TO authenticated;


-- =============================================================================
-- 15. SECURITY HARDENING
-- =============================================================================

-- Prevent anonymous execution
REVOKE ALL
ON FUNCTION public.get_admin_overview_stats()
FROM anon;

REVOKE ALL
ON FUNCTION public.get_admin_analytics()
FROM anon;

REVOKE ALL
ON FUNCTION public.admin_update_memory_status(UUID, TEXT, TEXT)
FROM anon;

REVOKE ALL
ON FUNCTION public.admin_toggle_community_posted(UUID, BOOLEAN)
FROM anon;

REVOKE ALL
ON FUNCTION public.admin_update_user_role(UUID, TEXT)
FROM anon;

REVOKE ALL
ON FUNCTION public.admin_resolve_report(UUID, TEXT, TEXT, TEXT)
FROM anon;

REVOKE ALL
ON FUNCTION public.admin_upsert_category(
    UUID,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    BOOLEAN
)
FROM anon;


-- =============================================================================
-- 16. POSTGREST SCHEMA RELOAD
-- =============================================================================

NOTIFY pgrst, 'reload schema';


-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================