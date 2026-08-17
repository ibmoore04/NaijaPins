-- ============================================================
-- NaijaPins Migration: Premium Membership & Payment System
-- Adds: plans, user_memberships, payment_transactions, and RLS policies
-- ============================================================

-- 1. PLANS TABLE
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'NGN',
    billing_interval TEXT NOT NULL CHECK (billing_interval IN ('month', 'year', 'lifetime', 'free')),
    paystack_plan_code TEXT,
    features JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active plans are viewable by everyone" ON public.plans;
CREATE POLICY "Active plans are viewable by everyone"
    ON public.plans FOR SELECT
    USING (is_active = true);

-- 2. USER MEMBERSHIPS TABLE
CREATE TABLE IF NOT EXISTS public.user_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.plans(id),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'cancelled', 'expired', 'failed')),
    provider TEXT NOT NULL DEFAULT 'paystack',
    provider_customer_id TEXT,
    provider_subscription_id TEXT,
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_user_memberships_user_id ON public.user_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memberships_status ON public.user_memberships(status);

ALTER TABLE public.user_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own membership status" ON public.user_memberships;
CREATE POLICY "Users can view their own membership status"
    ON public.user_memberships FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own membership record" ON public.user_memberships;
CREATE POLICY "Users can insert their own membership record"
    ON public.user_memberships FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own membership record" ON public.user_memberships;
CREATE POLICY "Users can update their own membership record"
    ON public.user_memberships FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 3. PAYMENT TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.plans(id),
    provider TEXT NOT NULL DEFAULT 'paystack',
    reference TEXT NOT NULL UNIQUE,
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'NGN',
    status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
    provider_transaction_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON public.payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_reference ON public.payment_transactions(reference);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own payment transactions" ON public.payment_transactions;
CREATE POLICY "Users can view their own payment transactions"
    ON public.payment_transactions FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own payment transactions" ON public.payment_transactions;
CREATE POLICY "Users can insert their own payment transactions"
    ON public.payment_transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own payment transactions" ON public.payment_transactions;
CREATE POLICY "Users can update their own payment transactions"
    ON public.payment_transactions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. SEED PLANS (Free, Premium Monthly, Premium Yearly)
INSERT INTO public.plans (id, name, slug, description, price, currency, billing_interval, features, is_active)
VALUES
    (
        'a0000000-0000-0000-0000-000000000001',
        'Free Contributor',
        'free',
        'Essential heritage memory pinning & community access across Nigeria.',
        0.00,
        'NGN',
        'free',
        '{
            "monthly_memory_limit": 10,
            "max_photos_per_memory": 3,
            "max_photo_size_mb": 5,
            "advanced_analytics": false,
            "premium_profile_badge": false,
            "advanced_map_filters": false,
            "featured_memory_eligibility": false
        }'::jsonb,
        true
    ),
    (
        'a0000000-0000-0000-0000-000000000002',
        'Premium Monthly',
        'premium-monthly',
        'High submission limits, advanced performance analytics, premium badge & priority discovery.',
        2500.00,
        'NGN',
        'month',
        '{
            "monthly_memory_limit": 100,
            "max_photos_per_memory": 10,
            "max_photo_size_mb": 15,
            "advanced_analytics": true,
            "premium_profile_badge": true,
            "advanced_map_filters": true,
            "featured_memory_eligibility": true
        }'::jsonb,
        true
    ),
    (
        'a0000000-0000-0000-0000-000000000003',
        'Premium Yearly',
        'premium-yearly',
        'Save 17% with annual billing! Full premium analytics, higher memory pinning & priority support.',
        25000.00,
        'NGN',
        'year',
        '{
            "monthly_memory_limit": 100,
            "max_photos_per_memory": 10,
            "max_photo_size_mb": 15,
            "advanced_analytics": true,
            "premium_profile_badge": true,
            "advanced_map_filters": true,
            "featured_memory_eligibility": true
        }'::jsonb,
        true
    )
ON CONFLICT (slug) DO UPDATE SET
    price = EXCLUDED.price,
    features = EXCLUDED.features,
    updated_at = timezone('utc'::text, now());

-- 5. RPC FUNCTION: GET OR CREATE DEFAULT FREE MEMBERSHIP
CREATE OR REPLACE FUNCTION public.get_or_create_user_membership(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result_membership RECORD;
    free_plan RECORD;
BEGIN
    -- Check existing membership
    SELECT m.*, p.slug as plan_slug, p.name as plan_name, p.features as plan_features
    INTO result_membership
    FROM public.user_memberships m
    JOIN public.plans p ON m.plan_id = p.id
    WHERE m.user_id = target_user_id;

    IF result_membership.id IS NOT NULL THEN
        RETURN to_jsonb(result_membership);
    END IF;

    -- If missing, create default Free membership
    SELECT * INTO free_plan FROM public.plans WHERE slug = 'free' LIMIT 1;

    INSERT INTO public.user_memberships (user_id, plan_id, status)
    VALUES (target_user_id, free_plan.id, 'active')
    ON CONFLICT (user_id) DO NOTHING;

    SELECT m.*, p.slug as plan_slug, p.name as plan_name, p.features as plan_features
    INTO result_membership
    FROM public.user_memberships m
    JOIN public.plans p ON m.plan_id = p.id
    WHERE m.user_id = target_user_id;

    RETURN to_jsonb(result_membership);
END;
$$;

-- 6. RPC FUNCTION: ATOMIC RECORD & ACTIVATE PAYMENT
CREATE OR REPLACE FUNCTION public.record_and_activate_payment(
    p_user_id UUID,
    p_plan_id UUID,
    p_reference TEXT,
    p_amount NUMERIC,
    p_provider TEXT DEFAULT 'paystack',
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_plan RECORD;
    period_end TIMESTAMPTZ;
    now_ts TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    -- Fetch plan
    SELECT * INTO target_plan FROM public.plans WHERE id = p_plan_id;
    IF target_plan.id IS NULL THEN
        RAISE EXCEPTION 'Target plan not found';
    END IF;

    -- Calculate period end
    IF target_plan.billing_interval = 'year' THEN
        period_end := now_ts + INTERVAL '1 year';
    ELSE
        period_end := now_ts + INTERVAL '1 month';
    END IF;

    -- 1. Insert or update transaction record to success
    INSERT INTO public.payment_transactions (
        user_id, plan_id, provider, reference, amount, currency, status, metadata, updated_at
    )
    VALUES (
        p_user_id, p_plan_id, p_provider, p_reference, p_amount, target_plan.currency, 'success', p_metadata, now_ts
    )
    ON CONFLICT (reference) DO UPDATE SET
        status = 'success',
        updated_at = now_ts;

    -- 2. Upsert user membership to active
    INSERT INTO public.user_memberships (
        user_id, plan_id, status, provider, provider_subscription_id,
        current_period_start, current_period_end, cancel_at_period_end, updated_at
    )
    VALUES (
        p_user_id, p_plan_id, 'active', p_provider, p_reference,
        now_ts, period_end, false, now_ts
    )
    ON CONFLICT (user_id) DO UPDATE SET
        plan_id = EXCLUDED.plan_id,
        status = 'active',
        provider = EXCLUDED.provider,
        provider_subscription_id = EXCLUDED.provider_subscription_id,
        current_period_start = EXCLUDED.current_period_start,
        current_period_end = EXCLUDED.current_period_end,
        cancel_at_period_end = false,
        updated_at = now_ts;

    -- 3. Insert welcome notification
    INSERT INTO public.notifications (
        user_id, type, title, message, created_at
    )
    VALUES (
        p_user_id,
        'announcement',
        '🌟 Welcome to NaijaPins Premium!',
        'Your ' || target_plan.name || ' subscription is now active. Enjoy higher memory submission limits, advanced analytics, and your Premium profile badge!',
        now_ts
    );

    RETURN TRUE;
END;
$$;
