-- =============================================================================
-- NaijaPins
-- Contributor Support, Reporting & Resolution System
-- Production Migration
-- Version: 20260823000000
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. SUPPORT ENUMS
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'support_ticket_type'
        AND typnamespace = 'public'::regnamespace
    ) THEN
        CREATE TYPE public.support_ticket_type AS ENUM (
            'bug',
            'memory_report',
            'comment_report',
            'user_report',
            'account',
            'security',
            'membership',
            'map_issue',
            'media_issue',
            'feature_request',
            'general'
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'support_ticket_status'
        AND typnamespace = 'public'::regnamespace
    ) THEN
        CREATE TYPE public.support_ticket_status AS ENUM (
            'open',
            'under_review',
            'waiting_for_contributor',
            'resolved',
            'closed',
            'reopened'
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'support_ticket_priority'
        AND typnamespace = 'public'::regnamespace
    ) THEN
        CREATE TYPE public.support_ticket_priority AS ENUM (
            'low',
            'normal',
            'high',
            'urgent'
        );
    END IF;
END
$$;


-- =============================================================================
-- 2. SUPPORT TICKETS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES public.profiles(user_id)
        ON DELETE CASCADE,

    type public.support_ticket_type NOT NULL DEFAULT 'general',

    subject TEXT NOT NULL
        CHECK (
            char_length(trim(subject)) >= 3
            AND char_length(subject) <= 200
        ),

    description TEXT NOT NULL
        CHECK (char_length(trim(description)) >= 5),

    status public.support_ticket_status NOT NULL DEFAULT 'open',

    priority public.support_ticket_priority NOT NULL DEFAULT 'normal',

    assigned_admin_id UUID
        REFERENCES public.profiles(user_id)
        ON DELETE SET NULL,

    related_memory_id UUID
        REFERENCES public.memories(id)
        ON DELETE SET NULL,

    related_comment_id UUID
        REFERENCES public.memory_comments(id)
        ON DELETE SET NULL,

    related_user_id UUID
        REFERENCES public.profiles(user_id)
        ON DELETE SET NULL,

    resolution_notes TEXT,

    resolved_by UUID
        REFERENCES public.profiles(user_id)
        ON DELETE SET NULL,

    resolved_at TIMESTAMPTZ,

    closed_at TIMESTAMPTZ,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT timezone('utc'::text, now()),

    updated_at TIMESTAMPTZ NOT NULL
        DEFAULT timezone('utc'::text, now())
);


-- =============================================================================
-- 3. SUPPORT TICKET INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_support_tickets_user
ON public.support_tickets(user_id);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_status
ON public.support_tickets(user_id, status);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status_priority
ON public.support_tickets(status, priority);

CREATE INDEX IF NOT EXISTS idx_support_tickets_created
ON public.support_tickets(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned
ON public.support_tickets(assigned_admin_id);

CREATE INDEX IF NOT EXISTS idx_support_tickets_memory
ON public.support_tickets(related_memory_id);

CREATE INDEX IF NOT EXISTS idx_support_tickets_comment
ON public.support_tickets(related_comment_id);


-- =============================================================================
-- 4. SUPPORT MESSAGES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ticket_id UUID NOT NULL
        REFERENCES public.support_tickets(id)
        ON DELETE CASCADE,

    sender_id UUID NOT NULL
        REFERENCES public.profiles(user_id)
        ON DELETE CASCADE,

    message TEXT NOT NULL
        CHECK (char_length(trim(message)) >= 1),

    is_internal BOOLEAN NOT NULL DEFAULT false,

    attachments JSONB NOT NULL DEFAULT '[]'::jsonb,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT timezone('utc'::text, now())
);


CREATE INDEX IF NOT EXISTS idx_support_messages_ticket
ON public.support_messages(ticket_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_support_messages_sender
ON public.support_messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_support_messages_internal
ON public.support_messages(ticket_id, is_internal);


-- =============================================================================
-- 5. CONNECT REPORTS TO SUPPORT
-- =============================================================================

ALTER TABLE public.reports
ADD COLUMN IF NOT EXISTS support_ticket_id UUID
REFERENCES public.support_tickets(id)
ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reports_support_ticket
ON public.reports(support_ticket_id);


-- =============================================================================
-- 6. ADMIN / STAFF HELPER
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_admin_or_staff(
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE user_id = p_user_id
        AND role IN (
            'admin',
            'super_admin',
            'platform_admin',
            'moderator',
            'support_admin'
        )
    );
$$;


REVOKE ALL ON FUNCTION public.is_admin_or_staff(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_or_staff(UUID) TO authenticated;


-- =============================================================================
-- 7. RLS
-- =============================================================================

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- SUPPORT TICKETS
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view own support tickets"
ON public.support_tickets;

CREATE POLICY "Users can view own support tickets"
ON public.support_tickets
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR public.is_admin_or_staff(auth.uid())
);


DROP POLICY IF EXISTS "Users can create support tickets"
ON public.support_tickets;

CREATE POLICY "Users can create support tickets"
ON public.support_tickets
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
);


DROP POLICY IF EXISTS "Staff can update support tickets"
ON public.support_tickets;

CREATE POLICY "Staff can update support tickets"
ON public.support_tickets
FOR UPDATE
TO authenticated
USING (
    public.is_admin_or_staff(auth.uid())
)
WITH CHECK (
    public.is_admin_or_staff(auth.uid())
);


-- ---------------------------------------------------------------------------
-- SUPPORT MESSAGES
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view their support messages"
ON public.support_messages;

CREATE POLICY "Users can view their support messages"
ON public.support_messages
FOR SELECT
TO authenticated
USING (
    public.is_admin_or_staff(auth.uid())
    OR (
        is_internal = false
        AND EXISTS (
            SELECT 1
            FROM public.support_tickets t
            WHERE t.id = support_messages.ticket_id
            AND t.user_id = auth.uid()
        )
    )
);


DROP POLICY IF EXISTS "Users can send support messages"
ON public.support_messages;

CREATE POLICY "Users can send support messages"
ON public.support_messages
FOR INSERT
TO authenticated
WITH CHECK (
    sender_id = auth.uid()
    AND (
        (
            is_internal = false
            AND EXISTS (
                SELECT 1
                FROM public.support_tickets t
                WHERE t.id = support_messages.ticket_id
                AND t.user_id = auth.uid()
            )
        )
        OR public.is_admin_or_staff(auth.uid())
    )
);


-- =============================================================================
-- 8. CREATE SUPPORT TICKET
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_support_ticket(
    p_type public.support_ticket_type,
    p_subject TEXT,
    p_description TEXT,
    p_priority public.support_ticket_priority DEFAULT 'normal',
    p_related_memory_id UUID DEFAULT NULL,
    p_related_comment_id UUID DEFAULT NULL,
    p_related_user_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_ticket_id UUID;
BEGIN

    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF char_length(trim(p_subject)) < 3 THEN
        RAISE EXCEPTION 'Subject must contain at least 3 characters';
    END IF;

    IF char_length(trim(p_description)) < 5 THEN
        RAISE EXCEPTION 'Description must contain at least 5 characters';
    END IF;

    INSERT INTO public.support_tickets (
        user_id,
        type,
        subject,
        description,
        priority,
        related_memory_id,
        related_comment_id,
        related_user_id,
        metadata
    )
    VALUES (
        v_user_id,
        p_type,
        trim(p_subject),
        trim(p_description),
        p_priority,
        p_related_memory_id,
        p_related_comment_id,
        p_related_user_id,
        COALESCE(p_metadata, '{}'::jsonb)
    )
    RETURNING id INTO v_ticket_id;


    INSERT INTO public.support_messages (
        ticket_id,
        sender_id,
        message
    )
    VALUES (
        v_ticket_id,
        v_user_id,
        trim(p_description)
    );


    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        memory_id
    )
    VALUES (
        v_user_id,
        'support_ticket_created',
        'Support Request Received',
        'Your support request has been received. Our team will review it and notify you when there is an update.',
        p_related_memory_id
    );


    RETURN v_ticket_id;
END;
$$;


-- =============================================================================
-- 9. SEND SUPPORT MESSAGE
-- =============================================================================

CREATE OR REPLACE FUNCTION public.send_support_message(
    p_ticket_id UUID,
    p_message TEXT,
    p_is_internal BOOLEAN DEFAULT false,
    p_attachments JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_is_staff BOOLEAN;
    v_ticket RECORD;
    v_message_id UUID;
BEGIN

    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF char_length(trim(p_message)) < 1 THEN
        RAISE EXCEPTION 'Message cannot be empty';
    END IF;


    SELECT *
    INTO v_ticket
    FROM public.support_tickets
    WHERE id = p_ticket_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Support ticket not found';
    END IF;


    v_is_staff := public.is_admin_or_staff(v_user_id);


    IF NOT v_is_staff
       AND v_ticket.user_id <> v_user_id THEN
        RAISE EXCEPTION 'You are not authorized to message this ticket';
    END IF;


    IF NOT v_is_staff AND p_is_internal THEN
        RAISE EXCEPTION 'Contributors cannot create internal notes';
    END IF;


    INSERT INTO public.support_messages (
        ticket_id,
        sender_id,
        message,
        is_internal,
        attachments
    )
    VALUES (
        p_ticket_id,
        v_user_id,
        trim(p_message),
        p_is_internal,
        COALESCE(p_attachments, '[]'::jsonb)
    )
    RETURNING id INTO v_message_id;


    UPDATE public.support_tickets
    SET updated_at = timezone('utc'::text, now())
    WHERE id = p_ticket_id;


    -- -------------------------------------------------------------------------
    -- STAFF RESPONSE
    -- -------------------------------------------------------------------------

    IF v_is_staff THEN

        IF NOT p_is_internal THEN

            INSERT INTO public.notifications (
                user_id,
                type,
                title,
                message,
                memory_id
            )
            VALUES (
                v_ticket.user_id,
                'support_ticket_response',
                'NaijaPins Support Responded',
                'Support responded to your request: "' ||
                v_ticket.subject || '".',
                v_ticket.related_memory_id
            );

        END IF;


    -- -------------------------------------------------------------------------
    -- CONTRIBUTOR RESPONSE
    -- -------------------------------------------------------------------------

    ELSE

        IF v_ticket.status IN (
            'resolved',
            'closed',
            'waiting_for_contributor'
        ) THEN

            UPDATE public.support_tickets
            SET status = 'reopened'
            WHERE id = p_ticket_id;

        END IF;


        IF v_ticket.assigned_admin_id IS NOT NULL THEN

            INSERT INTO public.notifications (
                user_id,
                type,
                title,
                message,
                memory_id
            )
            VALUES (
                v_ticket.assigned_admin_id,
                'support_ticket_reopened',
                'Contributor Replied',
                'A contributor replied to support ticket "' ||
                v_ticket.subject || '".',
                v_ticket.related_memory_id
            );

        END IF;

    END IF;


    RETURN v_message_id;
END;
$$;


-- =============================================================================
-- 10. UPDATE SUPPORT TICKET
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_support_ticket_status(
    p_ticket_id UUID,
    p_status public.support_ticket_status,
    p_priority public.support_ticket_priority DEFAULT NULL,
    p_assigned_admin_id UUID DEFAULT NULL,
    p_resolution_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_ticket RECORD;
    v_old_status public.support_ticket_status;
BEGIN

    v_user_id := auth.uid();

    IF v_user_id IS NULL
       OR NOT public.is_admin_or_staff(v_user_id) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;


    SELECT *
    INTO v_ticket
    FROM public.support_tickets
    WHERE id = p_ticket_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Support ticket not found';
    END IF;


    v_old_status := v_ticket.status;


    -- Validate assigned admin
    IF p_assigned_admin_id IS NOT NULL
       AND NOT public.is_admin_or_staff(p_assigned_admin_id) THEN
        RAISE EXCEPTION 'Assigned user must be an administrator or support staff member';
    END IF;


    UPDATE public.support_tickets
    SET
        status = p_status,
        priority = COALESCE(p_priority, priority),
        assigned_admin_id =
            CASE
                WHEN p_assigned_admin_id IS NOT NULL
                THEN p_assigned_admin_id
                ELSE assigned_admin_id
            END,
        resolution_notes =
            CASE
                WHEN p_resolution_notes IS NOT NULL
                THEN trim(p_resolution_notes)
                ELSE resolution_notes
            END,
        resolved_by =
            CASE
                WHEN p_status = 'resolved'
                THEN v_user_id
                ELSE resolved_by
            END,
        resolved_at =
            CASE
                WHEN p_status = 'resolved'
                THEN timezone('utc'::text, now())
                ELSE resolved_at
            END,
        closed_at =
            CASE
                WHEN p_status = 'closed'
                THEN timezone('utc'::text, now())
                ELSE closed_at
            END,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_ticket_id;


    -- -------------------------------------------------------------------------
    -- RESOLVED
    -- -------------------------------------------------------------------------

    IF p_status = 'resolved'
       AND v_old_status <> 'resolved' THEN

        INSERT INTO public.notifications (
            user_id,
            type,
            title,
            message,
            memory_id
        )
        VALUES (
            v_ticket.user_id,
            'support_ticket_resolved',
            'Support Request Resolved',
            'Your support request "' ||
            v_ticket.subject ||
            '" has been resolved. Tap to view the response.',
            v_ticket.related_memory_id
        );

    -- -------------------------------------------------------------------------
    -- MORE INFORMATION
    -- -------------------------------------------------------------------------

    ELSIF p_status = 'waiting_for_contributor'
       AND v_old_status <> 'waiting_for_contributor' THEN

        INSERT INTO public.notifications (
            user_id,
            type,
            title,
            message,
            memory_id
        )
        VALUES (
            v_ticket.user_id,
            'support_ticket_more_information',
            'More Information Needed',
            'NaijaPins Support needs more information about "' ||
            v_ticket.subject ||
            '".',
            v_ticket.related_memory_id
        );

    END IF;


    -- -------------------------------------------------------------------------
    -- ASSIGNMENT
    -- -------------------------------------------------------------------------

    IF p_assigned_admin_id IS NOT NULL
       AND (
            v_ticket.assigned_admin_id IS NULL
            OR v_ticket.assigned_admin_id <> p_assigned_admin_id
       ) THEN

        INSERT INTO public.notifications (
            user_id,
            type,
            title,
            message,
            memory_id
        )
        VALUES (
            p_assigned_admin_id,
            'support_ticket_assigned',
            'Support Ticket Assigned',
            'A support ticket has been assigned to you: "' ||
            v_ticket.subject ||
            '".',
            v_ticket.related_memory_id
        );

    END IF;


    -- -------------------------------------------------------------------------
    -- AUDIT LOG
    -- -------------------------------------------------------------------------

    IF to_regclass('public.admin_audit_logs') IS NOT NULL THEN

        INSERT INTO public.admin_audit_logs (
            admin_id,
            action,
            target_type,
            target_id,
            details
        )
        VALUES (
            v_user_id,
            'UPDATE_SUPPORT_TICKET',
            'support_ticket',
            p_ticket_id::text,
            jsonb_build_object(
                'old_status', v_old_status,
                'new_status', p_status,
                'priority', COALESCE(p_priority, v_ticket.priority),
                'assigned_admin_id', p_assigned_admin_id,
                'resolution_notes', p_resolution_notes
            )
        );

    END IF;


    RETURN true;
END;
$$;


-- =============================================================================
-- 11. ADMIN SUPPORT OVERVIEW
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_admin_support_overview_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_open BIGINT;
    v_under_review BIGINT;
    v_waiting BIGINT;
    v_urgent BIGINT;
    v_resolved_week BIGINT;
    v_total BIGINT;
BEGIN

    IF NOT public.is_admin_or_staff(auth.uid()) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;


    SELECT COUNT(*)
    INTO v_total
    FROM public.support_tickets;


    SELECT COUNT(*)
    INTO v_open
    FROM public.support_tickets
    WHERE status = 'open';


    SELECT COUNT(*)
    INTO v_under_review
    FROM public.support_tickets
    WHERE status = 'under_review';


    SELECT COUNT(*)
    INTO v_waiting
    FROM public.support_tickets
    WHERE status = 'waiting_for_contributor';


    SELECT COUNT(*)
    INTO v_urgent
    FROM public.support_tickets
    WHERE priority = 'urgent'
    AND status NOT IN ('resolved', 'closed');


    SELECT COUNT(*)
    INTO v_resolved_week
    FROM public.support_tickets
    WHERE status = 'resolved'
    AND resolved_at >= timezone('utc'::text, now()) - interval '7 days';


    RETURN jsonb_build_object(
        'total_tickets', v_total,
        'open_tickets', v_open,
        'under_review', v_under_review,
        'waiting_for_contributor', v_waiting,
        'urgent_tickets', v_urgent,
        'resolved_this_week', v_resolved_week
    );
END;
$$;


-- =============================================================================
-- 12. PERMISSIONS
-- =============================================================================

REVOKE ALL ON FUNCTION public.create_support_ticket(
    public.support_ticket_type,
    TEXT,
    TEXT,
    public.support_ticket_priority,
    UUID,
    UUID,
    UUID,
    JSONB
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_support_ticket(
    public.support_ticket_type,
    TEXT,
    TEXT,
    public.support_ticket_priority,
    UUID,
    UUID,
    UUID,
    JSONB
) TO authenticated;


REVOKE ALL ON FUNCTION public.send_support_message(
    UUID,
    TEXT,
    BOOLEAN,
    JSONB
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.send_support_message(
    UUID,
    TEXT,
    BOOLEAN,
    JSONB
) TO authenticated;


REVOKE ALL ON FUNCTION public.update_support_ticket_status(
    UUID,
    public.support_ticket_status,
    public.support_ticket_priority,
    UUID,
    TEXT
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.update_support_ticket_status(
    UUID,
    public.support_ticket_status,
    public.support_ticket_priority,
    UUID,
    TEXT
) TO authenticated;


REVOKE ALL ON FUNCTION public.get_admin_support_overview_stats()
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_admin_support_overview_stats()
TO authenticated;


-- =============================================================================
-- 13. UPDATED_AT TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_support_ticket_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS trg_support_ticket_updated_at
ON public.support_tickets;

CREATE TRIGGER trg_support_ticket_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_support_ticket_timestamp();


-- =============================================================================
-- 14. POSTGREST SCHEMA RELOAD
-- =============================================================================

NOTIFY pgrst, 'reload schema';

COMMIT;