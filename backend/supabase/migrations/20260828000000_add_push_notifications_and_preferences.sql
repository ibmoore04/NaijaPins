-- ============================================================================
-- NAIJAPINS
-- Push Notifications Subscriptions and User Notification Preferences
-- Migration: 20260828000000_add_push_notifications_and_preferences.sql
-- ============================================================================

BEGIN;

-- 1. Push Subscriptions Table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    device_info JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT push_subscriptions_user_endpoint_unique UNIQUE(user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_sub_user ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_sub_active ON public.push_subscriptions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_push_sub_endpoint ON public.push_subscriptions(endpoint);

-- 2. Notification Preferences Table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    messages_enabled BOOLEAN NOT NULL DEFAULT true,
    voice_calls_enabled BOOLEAN NOT NULL DEFAULT true,
    video_calls_enabled BOOLEAN NOT NULL DEFAULT true,
    social_enabled BOOLEAN NOT NULL DEFAULT true,
    email_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3. Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for Push Subscriptions
DROP POLICY IF EXISTS "Users manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users manage own push subscriptions"
    ON public.push_subscriptions
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 5. RLS Policies for Notification Preferences
DROP POLICY IF EXISTS "Users manage own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users manage own notification preferences"
    ON public.notification_preferences
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 6. RPC: Upsert Push Subscription
CREATE OR REPLACE FUNCTION public.upsert_my_push_subscription(
    p_endpoint TEXT,
    p_p256dh_key TEXT,
    p_auth_key TEXT,
    p_device_info JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_sub_id UUID;
    v_now TIMESTAMPTZ := timezone('utc', now());
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_endpoint IS NULL OR p_p256dh_key IS NULL OR p_auth_key IS NULL THEN
        RAISE EXCEPTION 'Invalid push subscription parameters';
    END IF;

    INSERT INTO public.push_subscriptions (
        user_id,
        endpoint,
        p256dh_key,
        auth_key,
        device_info,
        is_active,
        last_used_at,
        created_at,
        updated_at
    )
    VALUES (
        v_user_id,
        p_endpoint,
        p_p256dh_key,
        p_auth_key,
        COALESCE(p_device_info, '{}'::jsonb),
        true,
        v_now,
        v_now,
        v_now
    )
    ON CONFLICT (user_id, endpoint)
    DO UPDATE SET
        p256dh_key = EXCLUDED.p256dh_key,
        auth_key = EXCLUDED.auth_key,
        device_info = EXCLUDED.device_info,
        is_active = true,
        last_used_at = v_now,
        updated_at = v_now
    RETURNING id INTO v_sub_id;

    RETURN v_sub_id;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_my_push_subscription(TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_my_push_subscription(TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- 7. RPC: Deactivate Push Subscription
CREATE OR REPLACE FUNCTION public.deactivate_my_push_subscription(
    p_endpoint TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    UPDATE public.push_subscriptions
    SET
        is_active = false,
        updated_at = timezone('utc', now())
    WHERE user_id = v_user_id
    AND endpoint = p_endpoint;

    RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.deactivate_my_push_subscription(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deactivate_my_push_subscription(TEXT) TO authenticated;

-- 8. RPC: Get Notification Preferences (with auto-initialization)
CREATE OR REPLACE FUNCTION public.get_my_notification_preferences()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_prefs RECORD;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_prefs
    FROM public.notification_preferences
    WHERE user_id = v_user_id;

    IF NOT FOUND THEN
        INSERT INTO public.notification_preferences (user_id)
        VALUES (v_user_id)
        RETURNING * INTO v_prefs;
    END IF;

    RETURN to_jsonb(v_prefs);
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_notification_preferences() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_notification_preferences() TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
