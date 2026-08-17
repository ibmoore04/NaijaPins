# NaijaPins Backend Architecture (Supabase Engine)

> **Tagline:** "Where Nigeria remembers."
> **Database:** Supabase PostgreSQL with PostGIS Spatial Extensions & Full-Text Search.

---

## 📂 Backend Directory Structure

```
backend/
├── supabase/
│   ├── migrations/
│   │   └── 20260811000000_init_naijapins_schema.sql  # 7 Core Tables, RLS Policies & Spatial RPC
│   └── seed.sql                                      # Initial Curated Memory Seed Data
└── README.md
```

---

## 🗄️ Database Tables & Schema Overview

1. **`public.profiles`**: Synchronized automatically via PostgreSQL trigger (`on_auth_user_created`) when users sign up.
2. **`public.categories`**: 10 pre-seeded categories (*Family, School, Business, Food, Landmark, Community, Culture, Event, Historical, Personal*).
3. **`public.locations`**: Geographic coordinates (`latitude`, `longitude`), `state`, `lga`, `city`, `neighborhood`, and `formatted_address`. Indexed with spatial index (`idx_locations_lat_lng`).
4. **`public.memories`**: Main story repository storing `title`, `slug`, `story`, `date_type`, `year`, `status`, `is_deleted`, `view_count`, and GIN Full-Text Search (`idx_memories_fts`).
5. **`public.memory_media`**: Media uploads (*images and voice note audio recordings*).
6. **`public.reports`**: Community content moderation flags.
7. **`public.moderation_logs`**: Audit trail of moderator action triggers.

---

## 🔒 Row Level Security (RLS) & RPC Functions

- **Public Read Access**: Published, non-deleted memories (`status = 'published' AND is_deleted = false`) are readable by all users.
- **Author Writes**: Only the memory owner (`auth.uid() = user_id`) can modify or soft-delete memories.
- **Spatial RPC**: `get_map_pins_in_bounds(min_lat, max_lat, min_lng, max_lng, start_year, end_year, category_id_filter)` for fast viewport querying.

---

## 🚀 Connecting Frontend to Backend

The frontend connects to this Supabase backend via `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `frontend/.env`.
