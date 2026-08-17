# 📍 NaijaPins

> **Tagline:** "Where Nigeria remembers."  
> **Mission:** A community-powered digital heritage platform mapping real stories, photos, and voice notes across Nigeria.

---

## 📖 Table of Contents

- [Project Overview](#-project-overview)
- [User Navigation & Information Architecture Flow](#-user-navigation--information-architecture-flow)
- [Architecture & Directory Structure](#-architecture--directory-structure)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Supabase Backend Setup](#-supabase-backend-setup)
- [Environment Variables](#-environment-variables)
- [Available Scripts](#-available-scripts)
- [Database Schema & RLS Security](#-database-schema--rls-security)

---

## 🌟 Project Overview

**NaijaPins** is an interactive, geography-anchored memory archive preserving Nigerian history, family recollections, alumni memories, and cultural events. Users can pin stories to real geographic locations across Nigeria's 36 states and FCT Abuja, attach photographs and audio voice note recordings, filter by decade era (1960s to Present), and participate in community content moderation.

---

## 🗺️ User Navigation & Information Architecture Flow

```
                         NaijaPins
                            │
             ┌──────────────┴──────────────┐
             │                             │
          Public                        Account
             │                             │
      ┌──────┼──────┐              ┌───────┼────────┐
      │      │      │              │       │        │
    Home  Explore  Memory        Dashboard Memories Profile
                    │              │
                    │        ┌─────┼─────┐
                    │        │     │     │
                    │       Saved Activity Settings
                    │
              Add Memory
                    │
              Review System
                    │
              Moderation
```

---

## 📂 Architecture & Directory Structure

The repository is structured into decoupled **`frontend/`** and **`backend/`** modules:

```
Naijapins/
├── frontend/                                   # 🎨 CLIENT WEB APPLICATION
│   ├── src/
│   │   ├── components/                         # UI Primitives, Layout, Map Engine & Modals
│   │   │   ├── auth/                           # AuthModal (Login/Register/Reset)
│   │   │   ├── layout/                         # Header & Navigation
│   │   │   ├── map/                            # Leaflet MapView, TimelineFilterBar, PinPreviewDrawer
│   │   │   ├── memory/                         # AudioPlayer, ReportModal, ShareModal, LocationPickerStep, StoryFormStep, MediaUploadStep, ReviewSubmitStep
│   │   │   └── ui/                             # Button, Badge, Card, Input Primitives
│   │   ├── context/                            # AuthContext (Supabase Auth State)
│   │   ├── hooks/                              # useAuth, useMapPins, useFilterStore
│   │   ├── lib/                                # supabase.ts (Supabase JS Client)
│   │   ├── pages/                              # HomePage, ExplorePage, AddMemoryWizard, MemoryDetailPage, ProfilePage, DashboardPage, AdminDashboardPage
│   │   └── types/                              # TypeScript Database Interfaces & Enums
│   ├── .env                                    # Active Supabase API Credentials
│   ├── .env.example                            # Template Environment File
│   ├── index.html                              # Root HTML Entry
│   ├── package.json                            # Client Dependencies & Scripts
│   ├── tailwind.config.js                      # Tailwind CSS Theme & Custom Tokens
│   ├── tsconfig.json                           # TypeScript Configuration
│   ├── vercel.json                             # Vercel SPA Rewrites & Headers
│   └── vite.config.ts                          # Vite Bundler Setup
│
├── backend/                                    # 🗄️ SUPABASE BACKEND ARCHITECTURE
│   ├── supabase/
│   │   ├── migrations/
│   │   │   └── 20260811000000_init_naijapins_schema.sql  # 7 Core Tables, Indexes, RLS Policies & Spatial RPC
│   │   └── seed.sql                            # Curated Historical Memories Seed SQL Script
│   └── README.md                               # Backend Architecture & SQL Setup Guide
│
├── docs/                                       # 📚 15-File System Specification & Roadmap Docs
│   ├── 01-PRD.md
│   ├── 04-DATABASE-DESIGN.md
│   ├── 05-API-SPECIFICATION.md
│   ├── 06-UI-UX-SPECIFICATION.md
│   └── 11-PROJECT-DEVELOPMENT-TRACKER.md
│
└── package.json                                # Root Script Delegation Runner
```

---

## 🔥 Key Features

1. **Interactive Spatial Map Canvas (`/explore`)**:
   - Leaflet map with custom brand markers, marker clustering, bounding-box RPC queries, decade timeline slider (1960–2020s+), category chips, and slide-over memory preview drawer.

2. **Pixel-Perfect Home Page (`/`)**:
   - Interactive hero map preview, green feature highlight bar, 3-step how-it-works, recent community memories grid, newsletter banner, and dark luxury footer.

3. **Multi-Step Memory Creation Wizard (`/add-memory`)**:
   - **Step 1**: Interactive location pin drag & GPS geocoding.
   - **Step 2**: Story title, category selection, and time anchor precision (*Exact Date, Exact Year, Decade, Date Range*).
   - **Step 3**: Drag-and-drop photograph upload and voice note audio recorder.
   - **Step 4**: Preview card and database submission.

4. **Memory Details Page & Voice Player (`/memory/:slug`)**:
   - Full story view with photograph gallery, lightbox photo modal, view count tracking, custom accessible audio player for voice notes, social share modal, and community report modal.

5. **Personal Account Dashboard (`/dashboard`)**:
   - Tabbed account management hub allowing users to manage **My Memories**, inspect **Saved Pins**, view **Recent Activity**, and update **Account Settings**.

6. **Community Content Moderation (`/admin`)**:
   - Moderation queue dashboard guarded by Row Level Security (`moderator`/`admin` role) allowing moderators to review community flags and execute resolution actions (*Dismiss*, *Hide*, *Delete*).

7. **Social Sharing & Contributor Profiles (`/profile`)**:
   - One-click WhatsApp deep-link preview text generation, X share trigger, direct link copying, and editable user contributor profile pages.

---

## 🛠️ Tech Stack

### Frontend:
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Vanilla CSS Design Tokens
- **Map Engine**: Leaflet + React-Leaflet + Leaflet.MarkerCluster
- **State & Data Fetching**: Zustand + TanStack React Query v5
- **Icons**: Lucide React
- **Testing**: Vitest

### Backend (Supabase):
- **Database**: PostgreSQL 15 + PostGIS Spatial Extensions
- **Authentication**: Supabase Auth (JWT & Session Sync)
- **Security**: PostgreSQL Row Level Security (RLS) Policies
- **Storage**: Supabase Storage (`memory_media` public bucket)

---

## 🚀 Getting Started

### Prerequisites:
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Installation:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/NaijaPins.git
   cd NaijaPins
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file inside the `frontend/` directory (or edit `frontend/.env`):
   ```env
   VITE_SUPABASE_URL=https://zxmutikpnqaamypqyfgi.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Open **[http://localhost:5173/](http://localhost:5173/)** in your browser.

---

## 🗄️ Supabase Backend Setup

To connect a new or existing Supabase project:

1. **Execute Schema Migration**:
   - Open your Supabase Dashboard -> **SQL Editor**.
   - Copy and run [backend/supabase/migrations/20260811000000_init_naijapins_schema.sql](file:///c:/Users/USER/Naijapins/backend/supabase/migrations/20260811000000_init_naijapins_schema.sql).

2. **Seed Initial Historical Memories**:
   - Copy and run [backend/supabase/seed.sql](file:///c:/Users/USER/Naijapins/backend/supabase/seed.sql) in the SQL Editor.

3. **Create Storage Bucket**:
   - Go to **Storage -> New Bucket**, name it **`memory_media`**, and set it as **Public**.

---

## 💻 Available Scripts

Run these commands from the root directory:

| Command | Action |
| :--- | :--- |
| `npm run dev` | Launches Vite dev server at `http://localhost:5173/` |
| `npm run build` | Compiles TypeScript and creates optimized production bundle in `frontend/dist` |
| `npm run test:unit` | Executes Vitest unit testing suite |
| `npm run preview` | Previews production build locally |

---

## 🔒 Database Schema & RLS Security

| Table | Description | RLS Policy |
| :--- | :--- | :--- |
| `public.profiles` | User profiles synced automatically via auth trigger | Public Read / Owner Update |
| `public.categories` | 10 pre-seeded heritage categories | Public Read |
| `public.locations` | Coordinates and address data with spatial index | Public Read / Authenticated Insert |
| `public.memories` | Main memory stories with Full-Text Search index | Public Read (Published) / Author Update & Delete |
| `public.memory_media` | Image & audio attachment records | Public Read / Author Insert |
| `public.reports` | Flagged community reports | Authenticated Insert / Moderator Read & Update |
| `public.moderation_logs` | Audit log tracking moderator actions | Moderator Read & Insert |

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

*Made with ❤️ for Nigeria.*
