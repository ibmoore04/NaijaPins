-- ============================================================
-- NaijaPins Migration Seed File: Curated Historical Memories
-- Tagline: "Where Nigeria remembers."
-- ============================================================

-- 1. Insert Initial Locations
INSERT INTO public.locations (id, country, state, lga, city, neighborhood, formatted_address, latitude, longitude) VALUES
('a1010101-0000-0000-0000-000000000001', 'Nigeria', 'Ogun', 'Abeokuta South', 'Abeokuta', 'Itoku', 'The Old CMS Grammar School, Abeokuta', 7.1475, 3.3619),
('a1010101-0000-0000-0000-000000000002', 'Nigeria', 'Lagos', 'Eti-Osa', 'Ikoyi', 'Ikoyi', 'St. Gregorys College, Obalande, Ikoyi', 6.4500, 3.4167),
('a1010101-0000-0000-0000-000000000003', 'Nigeria', 'Lagos', 'Lagos Island', 'Lagos Island', 'Balogun', 'Balogun Market, Lagos Island', 6.4550, 3.3841),
('a1010101-0000-0000-0000-000000000004', 'Nigeria', 'Lagos', 'Surulere', 'Lagos', 'Surulere', 'National Stadium, Surulere, Lagos', 6.4969, 3.3644),
('a1010101-0000-0000-0000-000000000005', 'Nigeria', 'Lagos', 'Yaba', 'Lagos', 'Sabo Yaba', 'Commercial Avenue, Yaba, Lagos', 6.5095, 3.3785),
('a1010101-0000-0000-0000-000000000006', 'Nigeria', 'Oyo', 'Ibadan North', 'Ibadan', 'Agodi', 'University of Ibadan, Agodi, Ibadan', 7.4443, 3.8998),
('a1010101-0000-0000-0000-000000000007', 'Nigeria', 'Rivers', 'Port Harcourt', 'Port Harcourt', 'Old Port Harcourt', 'Aggrey Road, Port Harcourt', 4.8156, 7.0498),
('a1010101-0000-0000-0000-000000000008', 'Nigeria', 'Enugu', 'Enugu North', 'Enugu', 'Independence Layout', 'Coal City Heritage Centre, Enugu', 6.4584, 7.5464),
('a1010101-0000-0000-0000-000000000009', 'Nigeria', 'Kano', 'Kano Municipal', 'Kano', 'Ancient City', 'Kano Emirate Palace, Kano', 12.0022, 8.5919),
('a1010101-0000-0000-0000-000000000010', 'Nigeria', 'FCT - Abuja', 'Abuja Municipal', 'Abuja', 'Maitama', 'National Mosque & Heritage Center, Abuja', 9.0765, 7.3986);

-- 2. Note: Seed queries ready for Supabase local migrations and production environments.
