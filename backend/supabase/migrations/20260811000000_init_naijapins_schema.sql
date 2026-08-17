-- ============================================================
-- NaijaPins Migration 20260811000000: Initial Schema & RLS
-- Tagline: "Where Nigeria remembers."
-- ============================================================

-- 1. ENUMS
CREATE TYPE user_role AS ENUM ('visitor', 'authenticated_user', 'moderator', 'admin');
CREATE TYPE memory_status AS ENUM ('draft', 'pending_review', 'published', 'rejected', 'hidden');
CREATE TYPE date_precision AS ENUM ('EXACT_DATE', 'EXACT_YEAR', 'DECADE', 'DATE_RANGE');
CREATE TYPE media_type AS ENUM ('image', 'audio');
CREATE TYPE report_reason AS ENUM ('SPAM', 'HARASSMENT', 'MISINFORMATION', 'PRIVACY_VIOLATION', 'INAPPROPRIATE', 'COPYRIGHT', 'OTHER');
CREATE TYPE report_status AS ENUM ('pending', 'under_review', 'resolved_dismissed', 'resolved_removed');

-- 2. TABLES

-- 2.1 Profiles Table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL CHECK (char_length(trim(full_name)) >= 2),
    avatar_url TEXT,
    bio TEXT CHECK (char_length(bio) <= 500),
    role user_role NOT NULL DEFAULT 'authenticated_user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.2 Categories Table
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    icon TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.3 Locations Table
CREATE TABLE public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country TEXT NOT NULL DEFAULT 'Nigeria',
    state TEXT NOT NULL,
    lga TEXT NOT NULL,
    city TEXT NOT NULL,
    neighborhood TEXT,
    formatted_address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.4 Memories Table
CREATE TABLE public.memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 5 AND 150),
    slug TEXT UNIQUE NOT NULL,
    story TEXT NOT NULL CHECK (char_length(trim(story)) >= 30),
    date_type date_precision NOT NULL DEFAULT 'EXACT_YEAR',
    year INTEGER NOT NULL CHECK (year BETWEEN 1900 AND 2100),
    end_year INTEGER CHECK (end_year >= year),
    exact_date DATE,
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    status memory_status NOT NULL DEFAULT 'published',
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    view_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.5 Memory Media Table
CREATE TABLE public.memory_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
    media_type media_type NOT NULL,
    file_path TEXT NOT NULL,
    file_url TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL CHECK (file_size > 0),
    caption TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.6 Reports Table
CREATE TABLE public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
    reason report_reason NOT NULL,
    details TEXT CHECK (char_length(details) <= 1000),
    status report_status NOT NULL DEFAULT 'pending',
    resolved_by UUID REFERENCES public.profiles(user_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.7 Moderation Logs Table
CREATE TABLE public.moderation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    moderator_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE RESTRICT,
    memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. INDEXES
CREATE INDEX idx_locations_lat_lng ON public.locations(latitude, longitude);
CREATE INDEX idx_locations_state_lga ON public.locations(state, lga);
CREATE INDEX idx_memories_status_deleted ON public.memories(status, is_deleted) WHERE is_deleted = false;
CREATE INDEX idx_memories_location_id ON public.memories(location_id);
CREATE INDEX idx_memories_category_id ON public.memories(category_id);
CREATE INDEX idx_memories_year ON public.memories(year);
CREATE INDEX idx_memories_user_id ON public.memories(user_id);
CREATE INDEX idx_memories_slug ON public.memories(slug);
CREATE INDEX idx_memories_fts ON public.memories USING GIN (to_tsvector('english', title || ' ' || story));
CREATE INDEX idx_memory_media_memory_id ON public.memory_media(memory_id, display_order);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public memories are viewable by everyone" ON public.memories FOR SELECT USING (status = 'published' AND is_deleted = false);
CREATE POLICY "Authors can view own memories" ON public.memories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can create memories" ON public.memories FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);
CREATE POLICY "Authors can update own memories" ON public.memories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Moderators can view all memories" ON public.memories FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('moderator', 'admin')));
CREATE POLICY "Moderators can update any memory" ON public.memories FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('moderator', 'admin')));

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories viewable by everyone" ON public.categories FOR SELECT USING (true);

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Locations viewable by everyone" ON public.locations FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create locations" ON public.locations FOR INSERT WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE public.memory_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Media viewable by everyone" ON public.memory_media FOR SELECT USING (true);
CREATE POLICY "Authors can attach media" ON public.memory_media FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.memories WHERE id = memory_id AND user_id = auth.uid()));
CREATE POLICY "Authors can delete media" ON public.memory_media FOR DELETE USING (EXISTS (SELECT 1 FROM public.memories WHERE id = memory_id AND user_id = auth.uid()));

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can submit reports" ON public.reports FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = reporter_id);
CREATE POLICY "Moderators can view all reports" ON public.reports FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('moderator', 'admin')));
CREATE POLICY "Moderators can update reports" ON public.reports FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('moderator', 'admin')));

ALTER TABLE public.moderation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Moderators can view logs" ON public.moderation_logs FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('moderator', 'admin')));
CREATE POLICY "Moderators can create logs" ON public.moderation_logs FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('moderator', 'admin')));

-- 5. AUTOMATED TRIGGERS & FUNCTIONS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, avatar_url)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', 'NaijaPins Contributor'),
        new.raw_user_meta_data->>'avatar_url'
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. RPC FUNCTIONS

CREATE OR REPLACE FUNCTION get_map_pins_in_bounds(
    min_lat DOUBLE PRECISION,
    max_lat DOUBLE PRECISION,
    min_lng DOUBLE PRECISION,
    max_lng DOUBLE PRECISION,
    start_year INTEGER DEFAULT 1960,
    end_year INTEGER DEFAULT 2030,
    category_id_filter UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    slug TEXT,
    date_type TEXT,
    year INTEGER,
    city TEXT,
    category_name TEXT,
    category_icon TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    thumbnail_url TEXT,
    has_audio BOOLEAN
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT 
        m.id,
        m.title,
        m.slug,
        m.date_type::TEXT,
        m.year,
        l.city,
        c.name as category_name,
        c.icon as category_icon,
        l.latitude,
        l.longitude,
        (SELECT file_url FROM memory_media mm WHERE mm.memory_id = m.id AND mm.media_type = 'image' ORDER BY display_order ASC LIMIT 1) as thumbnail_url,
        EXISTS(SELECT 1 FROM memory_media mm WHERE mm.memory_id = m.id AND mm.media_type = 'audio') as has_audio
    FROM memories m
    JOIN locations l ON m.location_id = l.id
    JOIN categories c ON m.category_id = c.id
    WHERE m.status = 'published' 
      AND m.is_deleted = false
      AND l.latitude BETWEEN min_lat AND max_lat
      AND l.longitude BETWEEN min_lng AND max_lng
      AND m.year BETWEEN start_year AND end_year
      AND (category_id_filter IS NULL OR m.category_id = category_id_filter);
$$;

-- 7. INITIAL SEED CATEGORIES
INSERT INTO public.categories (name, slug, description, icon) VALUES
('Family', 'family', 'Ancestral homes, family reunions, and personal lineage milestones', 'Home'),
('School', 'school', 'Primary, secondary, and university memories, campus traditions, and alumni stories', 'GraduationCap'),
('Business', 'business', 'Historic markets, pioneer companies, local trades, and commercial legacy', 'Building2'),
('Food', 'food', 'Iconic local eateries, Bukka spots, historic food stalls, and culinary history', 'Utensils'),
('Landmark', 'landmark', 'Monuments, iconic bridges, famous public spaces, and civic architecture', 'MapPin'),
('Community', 'community', 'Neighborhood gatherings, local heroes, town hall meetings, and grassroots stories', 'Users'),
('Culture', 'culture', 'Traditional festivals, music venues, arts, language centers, and heritage', 'Palette'),
('Event', 'event', 'Notable public events, historical parades, sports matches, and political rallies', 'Calendar'),
('Historical', 'historical', 'Major historical milestones, archival photos, and documented city history', 'Scroll'),
('Personal', 'personal', 'Childhood reflections, personal journeys, romances, and personal reflections', 'Heart');
