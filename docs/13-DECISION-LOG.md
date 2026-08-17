# Architecture Decision Log (ADR) - NaijaPins

> **Tagline:** "Where Nigeria remembers."  
> **Status:** APPROVED & FROZEN  
> **Purpose:** Formal record of architectural, technical, and product design decisions.  

---

## ADR Index

- [ADR-001: Frontend Architecture Choice (Vite + React vs Next.js)](#adr-001-frontend-architecture-choice-vite--react-vs-nextjs)
- [ADR-002: Mapping Engine & Tile Provider Selection](#adr-002-mapping-engine--tile-provider-selection)
- [ADR-003: Backend Engine & Database Platform Selection](#adr-003-backend-engine--database-platform-selection)
- [ADR-004: Styling & UI Component Framework](#adr-004-styling--ui-component-framework)
- [ADR-005: Geographic Strategy & Launch Boundaries](#adr-005-geographic-strategy--launch-boundaries)
- [ADR-006: MVP Media Attachment Scope](#adr-006-mvp-media-attachment-scope)
- [ADR-007: Authentication & Authorization Strategy](#adr-007-authentication--authorization-strategy)

---

## ADR-001: Frontend Architecture Choice (Vite + React vs Next.js)

- **Date:** 2026-08-11
- **Status:** APPROVED
- **Context:** We require a highly responsive, mobile-first frontend application for rendering complex canvas maps, real-time spatial bounding box updates, and interactive story creation wizards.
- **Options Evaluated:**
  1. Next.js (App Router / SSR)
  2. React 18 + Vite (SPA Client-side)
- **Chosen Option:** **React 18 + Vite (SPA Client-side)**
- **Rationale:** The core interface of NaijaPins is an interactive map engine (Leaflet). Leaflet relies heavily on direct DOM canvas manipulation and browser window APIs (`window`, `navigator.geolocation`), which present hydration mismatches in server-rendered environments like Next.js. Vite delivers instant HMR, smaller bundle overhead, simplified client-side state management, and seamless static hosting on Vercel CDN.
- **Consequences:** Deep public memory URLs (`/memory/:slug`) use Vercel Edge functions for generating static OpenGraph meta tags for social media previews.

---

## ADR-002: Mapping Engine & Tile Provider Selection

- **Date:** 2026-08-11
- **Status:** APPROVED
- **Context:** The interactive map is the foundational interface of NaijaPins. We need an interactive mapping solution with zero vendor lock-in, low tile bandwidth consumption, and strong mobile gesture support.
- **Options Evaluated:**
  1. Mapbox GL JS (Proprietary vector tiles)
  2. Leaflet + React Leaflet + OpenStreetMap-compatible tile provider
  3. Google Maps JavaScript API
- **Chosen Option:** **Leaflet + React Leaflet + OpenStreetMap-compatible tile provider**
- **Rationale:** Mapbox and Google Maps enforce strict usage billing thresholds that introduce financial vulnerability for a community platform. Leaflet is lightweight (39KB), battle-tested, open-source, and decouples the rendering engine from the tile provider. We can switch tile servers (OpenStreetMap, MapTiler, Stamen) instantly via config without changing application code.
- **Consequences:** Marker clustering relies on `Leaflet.markercluster` plugin, requiring careful DOM lifecycle cleanup in React `useEffect` wrappers.

---

## ADR-003: Backend Engine & Database Platform Selection

- **Date:** 2026-08-11
- **Status:** APPROVED
- **Context:** We need a robust relational database with spatial coordinate indexing, native authentication, object storage, and granular security policies.
- **Options Evaluated:**
  1. Supabase (Managed PostgreSQL + PostGIS + RLS + Auth + Storage)
  2. Custom Node.js/Express API + MongoDB Atlas
  3. Firebase / Firestore
- **Chosen Option:** **Supabase (Managed PostgreSQL + PostGIS + RLS)**
- **Rationale:** Relational integrity is essential for linking memories to profiles, locations, categories, media, and reports. PostgreSQL provides native PostGIS spatial querying (`ST_MakeEnvelope`, lat/lng indexing). Row Level Security (RLS) pushes authorization into the database layer, eliminating boilerplate Express CRUD backend code.
- **Consequences:** Database migrations must be maintained rigorously using Supabase CLI.

---

## ADR-004: Styling & UI Component Framework

- **Date:** 2026-08-11
- **Status:** APPROVED
- **Context:** We require a modern, responsive, accessible design system matching our Nigerian brand identity.
- **Options Evaluated:**
  1. Tailwind CSS + shadcn/ui
  2. Material UI (MUI)
  3. Custom CSS Modules
- **Chosen Option:** **Tailwind CSS + shadcn/ui**
- **Rationale:** shadcn/ui provides unstyled, accessible Radix UI primitives that live directly inside our codebase, allowing total visual customization to match our brand palette (`brand-green`, `brand-orange`, `canvas-offwhite`). Tailwind CSS allows rapid utility-first responsive styling without CSS bundle bloat.
- **Consequences:** Requires setting up Radix UI primitives (`@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`).

---

## ADR-005: Geographic Strategy & Launch Boundaries

- **Date:** 2026-08-11
- **Status:** APPROVED
- **Context:** Launching across all 36 states simultaneously risks sparse pin density and weak network effects.
- **Options Evaluated:**
  1. Simultaneous Nigeria-wide launch
  2. Lagos-First Focus with Nigeria-wide Database Schema
- **Chosen Option:** **Lagos-First Focus with Nigeria-wide Database Schema**
- **Rationale:** Concentrating community storytelling and seed content in Lagos State builds rapid pin density and viral network effects. However, the database schema MUST enforce a 7-tier geographic hierarchy (`country`, `state`, `lga`, `city`, `neighborhood`, `latitude`, `longitude`) to allow instant expansion to Ibadan, Port Harcourt, and Abuja without schema migrations.
- **Consequences:** Initial marketing and seed pins focus exclusively on Lagos locations.

---

## ADR-006: MVP Media Attachment Scope

- **Date:** 2026-08-11
- **Status:** APPROVED
- **Context:** Deciding which media types to support in the MVP creation wizard.
- **Options Evaluated:**
  1. Photos Only
  2. Photos + Audio Clips
  3. Photos + Audio Clips + Video Uploads
- **Chosen Option:** **Photos + Audio Clips (Max 5 Photos / Max 10MB Audio)**
- **Rationale:** Audio recordings (oral storytelling, elder voices, background music) add immense emotional depth to place-bound memories while keeping storage costs manageable. Video uploads introduce expensive transcoding pipelines, high bandwidth costs, and complex moderation challenges that would delay MVP launch.
- **Consequences:** Client wizard includes an HTML5 audio recorder and player component.

---

## ADR-007: Authentication & Authorization Strategy

- **Date:** 2026-08-11
- **Status:** APPROVED
- **Context:** Establishing user registration and role management.
- **Options Evaluated:**
  1. Email/Password + Supabase Auth + Postgres RLS
  2. Third-Party Social OAuth Only (Google/Facebook)
- **Chosen Option:** **Email/Password + Supabase Auth + Postgres RLS**
- **Rationale:** Email/password ensures accessibility for all Nigerian demographics, including users who do not maintain social media accounts or prefer pseudo-anonymous email registration. User roles (`visitor`, `authenticated_user`, `moderator`, `admin`) are stored in `profiles.role` and strictly validated in Postgres RLS policies.
- **Consequences:** Email verification flow must be configured via Supabase SMTP templates.

---

## ADR-008: Final Pre-Implementation Audit & RLS Enforcements

- **Date:** 2026-08-11
- **Status:** APPROVED
- **Context:** Final verification sweep across all documentation to ensure zero missing RLS policies, zero missing tasks, and 100% PRD/SRS/SAD/DB/Tracker parity before coding.
- **Options Evaluated:**
  1. Proceed with minor implied RLS policies and condensed task index.
  2. Explicitly document full RLS SQL blocks for all 7 database tables and expand all 28 implementation tasks with explicit acceptance criteria.
- **Chosen Option:** **Option 2: Explicit RLS SQL for all 7 tables and 28 fully-detailed tasks.**
- **Rationale:** Explicit database policies eliminate developer ambiguity during coding and prevent accidental authorization leaks. Fully specified task blocks enable autonomous execution by Antigravity with verifiable acceptance criteria.
- **Consequences:** Database migrations include full RLS statements for `locations`, `categories`, `memory_media`, `reports`, and `moderation_logs`.

---

## ADR-009: Official Brand Palette & 3-Layer Component Architecture

- **Date:** 2026-08-11
- **Status:** APPROVED
- **Context:** Establishing the official brand color system, visual surface ratio, and reusable component layer architecture.
- **Options Evaluated:**
  1. Multi-color rainbow palette with heavy accent usage.
  2. Strict WHITE + GREEN + BLACK palette with 75% White surface balance, 20% Black typography balance, and 5-10% Green action accent balance.
- **Chosen Option:** **Option 2: Strict WHITE + GREEN + BLACK palette with 3-Layer Component Architecture.**
- **Rationale:** White surface dominance creates an open, modern digital archive feel. Green serves as an intentional action accent (`#0B6B3A`), and black charcoal (`#111111`, `#1F2933`) ensures AAA WCAG typography contrast. The 3-layer component architecture (Primitives → Shared → Feature) guarantees "Build Once → Reuse Everywhere" without code duplication.
- **Consequences:** All components compose Layer 1 primitives (`Button`, `Input`, `Card`, `Dialog`, `Badge`) and reference semantic tokens.
