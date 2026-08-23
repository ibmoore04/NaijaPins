-- 20260831000000_add_newsletter_subscribers.sql
-- Newsletter subscribers table with public insert policy and admin read policy

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    source TEXT DEFAULT 'homepage_footer',
    CONSTRAINT newsletter_subscribers_email_unique UNIQUE (email)
);

-- Enable RLS
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Allow anyone (authenticated or anonymous) to subscribe
CREATE POLICY "Allow public insert to newsletter_subscribers"
    ON public.newsletter_subscribers
    FOR INSERT
    WITH CHECK (true);

-- Allow authenticated staff/admins to view subscribers
CREATE POLICY "Allow admin read newsletter_subscribers"
    ON public.newsletter_subscribers
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'superadmin', 'moderator')
        )
    );
