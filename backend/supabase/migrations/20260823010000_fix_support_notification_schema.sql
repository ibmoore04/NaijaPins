-- =============================================================================
-- NaijaPins Migration
-- Fix Support Notification RPC Schema Mismatch
-- Version: 20260823010000
-- =============================================================================
--
-- PURPOSE:
--   Update support RPCs to insert notifications conforming to the actual
--   public.notifications table schema (user_id, type, title, message, memory_id, is_read, created_at),
--   removing invalid references to actor_id and link_url.
--
-- =============================================================================

-- Ensure support notification types are accepted by the constraint
DO $$
BEGIN
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
                'announcement',
                'support_ticket_created',
                'support_ticket_assigned',
                'support_ticket_response',
                'support_ticket_status_changed',
                'support_ticket_more_information',
                'support_ticket_resolved',
                'support_ticket_reopened'
            )
        );
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;


-- 1. CREATE SUPPORT TICKET RPC
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
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Insert Ticket
    INSERT INTO public.support_tickets (
        user_id,
        type,
        subject,
        description,
        status,
        priority,
        related_memory_id,
        related_comment_id,
        related_user_id,
        metadata
    ) VALUES (
        v_user_id,
        p_type,
        trim(p_subject),
        trim(p_description),
        'open',
        p_priority,
        p_related_memory_id,
        p_related_comment_id,
        p_related_user_id,
        p_metadata
    )
    RETURNING id INTO v_ticket_id;

    -- Insert initial opening message
    INSERT INTO public.support_messages (
        ticket_id,
        sender_id,
        message,
        is_internal,
        attachments
    ) VALUES (
        v_ticket_id,
        v_user_id,
        trim(p_description),
        false,
        '[]'::jsonb
    );

    -- Send confirmation notification to contributor using actual notifications columns
    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        memory_id
    ) VALUES (
        v_user_id,
        'support_ticket_created',
        'Support Request Received',
        'We have received your request: "' || trim(p_subject) || '". Our team will review it and notify you when there is an update.',
        p_related_memory_id
    );

    RETURN v_ticket_id;
END;
$$;


-- 2. SEND SUPPORT MESSAGE RPC
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
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF char_length(trim(p_message)) < 1 THEN
        RAISE EXCEPTION 'Message cannot be empty.';
    END IF;

    -- Fetch Ticket
    SELECT * INTO v_ticket
    FROM public.support_tickets
    WHERE id = p_ticket_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Support ticket not found.';
    END IF;

    v_is_staff := public.is_admin_or_staff(v_user_id);

    -- Authorization check
    IF NOT v_is_staff AND v_ticket.user_id <> v_user_id THEN
        RAISE EXCEPTION 'You are not authorized to message on this ticket.';
    END IF;

    -- Contributors CANNOT create internal notes
    IF NOT v_is_staff AND p_is_internal THEN
        RAISE EXCEPTION 'Contributors cannot create internal notes.';
    END IF;

    -- Insert Message
    INSERT INTO public.support_messages (
        ticket_id,
        sender_id,
        message,
        is_internal,
        attachments
    ) VALUES (
        p_ticket_id,
        v_user_id,
        trim(p_message),
        p_is_internal,
        COALESCE(p_attachments, '[]'::jsonb)
    )
    RETURNING id INTO v_message_id;

    -- Update Ticket Timestamp & Status
    IF v_is_staff THEN
        IF NOT p_is_internal THEN
            -- Staff public response -> notify contributor
            UPDATE public.support_tickets
            SET updated_at = timezone('utc'::text, now())
            WHERE id = p_ticket_id;

            INSERT INTO public.notifications (
                user_id,
                type,
                title,
                message,
                memory_id
            ) VALUES (
                v_ticket.user_id,
                'support_ticket_response',
                'NaijaPins Support Responded',
                'Support staff responded to your request: "' || v_ticket.subject || '".',
                v_ticket.related_memory_id
            );
        ELSE
            -- Internal note -> log admin audit
            IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_audit_logs') THEN
                INSERT INTO public.admin_audit_logs (
                    admin_id,
                    action,
                    target_type,
                    target_id,
                    metadata
                ) VALUES (
                    v_user_id,
                    'ADD_INTERNAL_NOTE',
                    'support_ticket',
                    p_ticket_id,
                    jsonb_build_object('ticket_subject', v_ticket.subject)
                );
            END IF;
        END IF;
    ELSE
        -- Contributor reply -> reopen / under review
        UPDATE public.support_tickets
        SET status = CASE 
                WHEN status IN ('waiting_for_contributor', 'resolved', 'closed') THEN 'reopened'::public.support_ticket_status
                ELSE status
            END,
            updated_at = timezone('utc'::text, now())
        WHERE id = p_ticket_id;

        -- Notify assigned admin if exists
        IF v_ticket.assigned_admin_id IS NOT NULL AND v_ticket.assigned_admin_id <> v_user_id THEN
            INSERT INTO public.notifications (
                user_id,
                type,
                title,
                message,
                memory_id
            ) VALUES (
                v_ticket.assigned_admin_id,
                'support_ticket_reopened',
                'Contributor Replied to Ticket',
                'Contributor replied to ticket: "' || v_ticket.subject || '".',
                v_ticket.related_memory_id
            );
        END IF;
    END IF;

    RETURN v_message_id;
END;
$$;


-- 3. UPDATE SUPPORT TICKET STATUS & ASSIGNMENT (STAFF ONLY)
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
    IF v_user_id IS NULL OR NOT public.is_admin_or_staff(v_user_id) THEN
        RAISE EXCEPTION 'Unauthorized: Only support staff and admins can manage tickets.';
    END IF;

    SELECT * INTO v_ticket
    FROM public.support_tickets
    WHERE id = p_ticket_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Support ticket not found.';
    END IF;

    v_old_status := v_ticket.status;

    UPDATE public.support_tickets
    SET status = p_status,
        priority = COALESCE(p_priority, priority),
        assigned_admin_id = CASE WHEN p_assigned_admin_id IS NOT NULL THEN p_assigned_admin_id ELSE assigned_admin_id END,
        resolution_notes = COALESCE(p_resolution_notes, resolution_notes),
        resolved_by = CASE WHEN p_status = 'resolved' THEN v_user_id ELSE resolved_by END,
        resolved_at = CASE WHEN p_status = 'resolved' THEN timezone('utc'::text, now()) ELSE resolved_at END,
        closed_at = CASE WHEN p_status = 'closed' THEN timezone('utc'::text, now()) ELSE closed_at END,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_ticket_id;

    -- Audit log
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_audit_logs') THEN
        INSERT INTO public.admin_audit_logs (
            admin_id,
            action,
            target_type,
            target_id,
            metadata
        ) VALUES (
            v_user_id,
            'UPDATE_SUPPORT_STATUS',
            'support_ticket',
            p_ticket_id,
            jsonb_build_object(
                'old_status', v_old_status,
                'new_status', p_status,
                'priority', COALESCE(p_priority, v_ticket.priority)
            )
        );
    END IF;

    -- Contributor Notifications on key transitions using actual notifications schema
    IF p_status = 'resolved' AND v_old_status <> 'resolved' THEN
        INSERT INTO public.notifications (
            user_id,
            type,
            title,
            message,
            memory_id
        ) VALUES (
            v_ticket.user_id,
            'support_ticket_resolved',
            'Support Request Resolved',
            'Your support ticket "' || v_ticket.subject || '" has been resolved. Tap to view the resolution.',
            v_ticket.related_memory_id
        );
    ELSIF p_status = 'waiting_for_contributor' AND v_old_status <> 'waiting_for_contributor' THEN
        INSERT INTO public.notifications (
            user_id,
            type,
            title,
            message,
            memory_id
        ) VALUES (
            v_ticket.user_id,
            'support_ticket_more_information',
            'More Information Needed',
            'NaijaPins Support requested more information on your request: "' || v_ticket.subject || '".',
            v_ticket.related_memory_id
        );
    END IF;

    -- Staff Assignment Notification
    IF p_assigned_admin_id IS NOT NULL AND (v_ticket.assigned_admin_id IS NULL OR v_ticket.assigned_admin_id <> p_assigned_admin_id) THEN
        INSERT INTO public.notifications (
            user_id,
            type,
            title,
            message,
            memory_id
        ) VALUES (
            p_assigned_admin_id,
            'support_ticket_assigned',
            'Support Ticket Assigned',
            'A support ticket has been assigned to you: "' || v_ticket.subject || '".',
            v_ticket.related_memory_id
        );
    END IF;

    RETURN true;
END;
$$;
