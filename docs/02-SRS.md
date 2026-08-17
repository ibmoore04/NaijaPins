# Software Requirements Specification (SRS) - NaijaPins

> **Tagline:** "Where Nigeria remembers."  
> **Status:** APPROVED  
> **Target Audience:** Frontend Engineers, Backend Engineers, QA Engineers, Security Auditors  

---

## 1. Introduction

This document details the functional (`FR-*`) and non-functional (`NFR-*`) requirements for the **NaijaPins** platform. Every requirement in this specification is assigned a unique, testable identifier and includes explicit acceptance criteria.

---

## 2. Functional Requirements

### 2.1 Authentication & User Management (`FR-AUTH`)

#### `FR-AUTH-001`: Email & Password Registration
- **Description:** System shall allow visitors to create an account using a valid email address and a password meeting security criteria.
- **Inputs:** Email, Password (min 8 chars, 1 number, 1 special char), Display Name.
- **Validation:** Email format, uniqueness check against Supabase Auth.
- **Outputs:** Account creation confirmation, verification email trigger, initial `profiles` row generation.
- **Acceptance Criteria:**
  1. User receives a verification email within 30 seconds of registration.
  2. Unverified users cannot create memories or submit reports.
  3. Duplicate email registration returns user-friendly error `EMAIL_ALREADY_EXISTS`.

#### `FR-AUTH-002`: User Authentication & Session Management
- **Description:** System shall authenticate users via Supabase Auth and manage persistent JWT sessions.
- **Inputs:** Email, Password.
- **Outputs:** JWT access token, refresh token stored securely in HTTP-only/secure cookies or local session storage.
- **Acceptance Criteria:**
  1. Valid credentials log user in and update header UI state without full page reload.
  2. Sessions persist across browser reloads until explicit logout or token expiry (30 days refresh token window).
  3. Logout clears all tokens and client-side cached stores.

#### `FR-AUTH-003`: Password Reset Flow
- **Description:** Users shall be able to request a password reset email and update their password.
- **Inputs:** Email address.
- **Outputs:** Signed password reset link delivered via email.
- **Acceptance Criteria:**
  1. Reset token expires after 60 minutes.
  2. Updating password revokes all active refresh tokens for the user account.

---

### 2.2 Memory Management (`FR-MEM`)

#### `FR-MEM-001`: Memory Creation Wizard
- **Description:** Authenticated users shall be able to create a new place-bound memory using a multi-step form wizard.
- **Inputs:**
  - Location: Coordinates (`latitude`, `longitude`), `formatted_address`, `city`, `lga`, `state`.
  - Content: `title` (10–120 chars), `story` (50–5,000 chars), `category_id`.
  - Time Anchor: `date_type` (`EXACT_DATE`, `EXACT_YEAR`, `DECADE`, `DATE_RANGE`), `year`, `exact_date`, `end_year`.
  - Media: Images (1–5 JPG/PNG/WebP, max 5MB each), Audio (Optional MP3/M4A/AAC, max 10MB).
- **Outputs:** New record in `memories` (Status: `PUBLISHED` for clean content, or `PENDING_REVIEW` if flagged by automated heuristics).
- **Acceptance Criteria:**
  1. Submitting without required fields prevents submission and highlights invalid steps.
  2. Location can be set via interactive map pin placement, current device GPS, or geocoding search.
  3. Memory creation generates a unique human-readable slug (e.g., `yaba-tech-hostel-life-1984`).

#### `FR-MEM-002`: Memory Reading & View Counter
- **Description:** Any visitor (authenticated or anonymous) shall be able to view full memory details.
- **Outputs:** Memory title, story text, image gallery, audio player, geographic tags, date badge, contributor profile summary, share links.
- **Acceptance Criteria:**
  1. Viewing a memory increments its `view_count` by 1 via a debounced RPC function (max 1 count per IP/session per hour).
  2. Audio player supports Play, Pause, Seek, Mute, and Duration display.

#### `FR-MEM-003`: Memory Editing & Deletion
- **Description:** Memory author or authorized Admins/Moderators shall be able to edit or delete existing memories.
- **Acceptance Criteria:**
  1. Authors can update title, story, category, date, and replace media.
  2. Deletion performs a soft delete (`is_deleted = true`), hiding it from public queries while preserving audit integrity.
  3. Non-owners attempting edit/delete via API receive `403 Forbidden` enforced by Supabase RLS.

---

### 2.3 Interactive Map & Geolocation (`FR-MAP`)

#### `FR-MAP-001`: Interactive Map Canvas
- **Description:** System shall render a responsive interactive Leaflet map pre-centered on Lagos (`lat: 6.5244, lng: 3.3792, zoom: 11`), supporting pan, zoom, and tile rendering.
- **Acceptance Criteria:**
  1. Map renders tile layer within 1.0s on 3G connections.
  2. Map bounds update asynchronously triggers TanStack Query to fetch pins within visible bounding box (`northEast`, `southWest`).

#### `FR-MAP-002`: Marker Clustering & Pin Previews
- **Description:** Nearby memory markers shall cluster dynamically at higher zoom levels and expand upon zoom/click.
- **Acceptance Criteria:**
  1. Clicking a cluster zooms into the constituent pins.
  2. Clicking an individual pin opens a bottom drawer (mobile) or side popover (desktop) displaying memory preview (thumbnail, title, year, category, audio badge).

---

### 2.4 Timeline & Search Filters (`FR-TIMELINE`, `FR-SEARCH`)

#### `FR-TIMELINE-001`: Chronological Timeline Filter
- **Description:** System shall provide an interactive timeline control spanning **1960 to Present**.
- **Acceptance Criteria:**
  1. Adjusting timeline limits filters visible map pins and search results instantly (< 200ms client state update).
  2. Supports toggling between All Years, Specific Decade (e.g., 1970s), or Custom Range (e.g., 1982–1990).

#### `FR-SEARCH-001`: Multi-Facet Search & Category Filter
- **Description:** Users shall be able to search memories by text query, location, category, and date range.
- **Acceptance Criteria:**
  1. Search input debounces queries by 300ms before executing.
  2. Category selector allows single or multi-select filtering.
  3. Empty search results display a warm, helpful empty state encouraging the user to pin a memory at that location.

---

### 2.5 Moderation & Reporting (`FR-ADMIN`, `FR-REPORT`)

#### `FR-REPORT-001`: Community Content Reporting
- **Description:** Users can report memories violating community guidelines.
- **Inputs:** `reason` (`SPAM`, `HARASSMENT`, `MISINFORMATION`, `PRIVACY_VIOLATION`, `INAPPROPRIATE`, `COPYRIGHT`), `details` (optional text).
- **Acceptance Criteria:**
  1. Reporting creates a `reports` entry and notifies the moderation queue.
  2. If a memory receives ≥ 3 distinct reports, its status automatically switches to `UNDER_REVIEW`, temporarily hiding it from public map feeds pending moderator action.

#### `FR-ADMIN-001`: Moderator Dashboard Queue
- **Description:** Moderators and Admins shall have a secure dashboard to review reported memories and take administrative action (`APPROVE`, `REJECT`, `HIDE`, `RESTORE`, `DELETE`).
- **Acceptance Criteria:**
  1. Access restricted strictly to users with `role IN ('moderator', 'admin')` via RLS policies.
  2. All moderator actions write an entry into `moderation_logs`.

---

### 2.6 User Profiles & Virality (`FR-PROFILE`, `FR-SHARE`)

#### `FR-PROFILE-001`: Public & Private Profile Management
- **Description:** Users can view public contributor profiles and manage their private account settings.
- **Acceptance Criteria:**
  1. Public profile shows display name, avatar, bio, total pinned memories, and list of public memories.
  2. Private settings allow avatar upload (max 2MB), display name edit, and account deletion request.

#### `FR-SHARE-001`: Social Sharing & Open-Graph Metadata
- **Description:** System shall generate social preview meta tags and direct share triggers.
- **Acceptance Criteria:**
  1. Share modal provides quick copy URL, WhatsApp share button, and X (Twitter) share button.
  2. WhatsApp link formats message text: `"Discover this memory from [Year] in [Location] on NaijaPins: [URL]"`.

#### `FR-LANDING-001`: Public Landing & Hero Discovery
- **Description:** System shall render a welcoming, high-impact landing page hero introducing the tagline "Where Nigeria remembers" with quick call-to-action buttons to explore the map or contribute a memory.
- **Acceptance Criteria:**
  1. Hero section displays brand tagline, featured memory highlights, and instant `[ Explore Map ]` button.
  2. Mobile hero maintains fast FCP (< 1.2s).

#### `FR-ANALYTICS-001`: Basic Admin Analytics Summary
- **Description:** Admin dashboard shall render key platform metrics (total memories, published memories, pending reports, active contributors, top category).
- **Acceptance Criteria:**
  1. Metrics fetched via RPC function `get_admin_dashboard_stats`.
  2. Data updates upon dashboard refresh without client calculation overhead.

---

## 3. Non-Functional Requirements

### 3.1 Performance Requirements (`NFR-PERF`)

| Identifier | Metric / Target | Verification Method |
| :--- | :--- | :--- |
| `NFR-PERF-001` | First Contentful Paint (FCP) < 1.2 seconds on 4G | Lighthouse CI |
| `NFR-PERF-002` | Interactive Map Time-To-Interactive (TTI) < 1.8 seconds | Web Vitals / Playwright |
| `NFR-PERF-003` | Map Pin Fetching RPC query execution < 150ms for 1,000 spatial pins | Supabase Query Analyzer |
| `NFR-PERF-004` | Image payload optimization (converted to WebP, responsive srcsets) | Automated Media Test |

---

### 3.2 Security & Data Protection (`NFR-SEC`)

| Identifier | Requirement Description | Enforcement Mechanism |
| :--- | :--- | :--- |
| `NFR-SEC-001` | Row Level Security (RLS) enabled on all database tables | Postgres Migration Assertions |
| `NFR-SEC-002` | Zero exposure of Supabase Service Role Key to frontend client | Secret Audit / CI Scan |
| `NFR-SEC-003` | XSS prevention on user stories & captions | DOMPurify / Sanitization Pipeline |
| `NFR-SEC-004` | Media upload restricted strictly to image/jpeg, image/png, image/webp, audio/mpeg, audio/mp4 | Supabase Bucket Mime Rules |

---

### 3.3 Accessibility Requirements (`NFR-A11Y`)

| Identifier | Requirement Description | Standard Compliance |
| :--- | :--- | :--- |
| `NFR-A11Y-001` | Minimum contrast ratio of 4.5:1 for normal text, 3:1 for large text | WCAG 2.1 AA |
| `NFR-A11Y-002` | All interactive map markers and controls operable via Keyboard (Tab, Enter, Space, Arrow keys) | Manual & axe-core E2E |
| `NFR-A11Y-003` | Screen reader announcements (`aria-live`) for drawer state changes and search updates | VoiceOver / NVDA test |
| `NFR-A11Y-004` | Audio player controls must include accessible labels and visual time indicators | axe-core Audit |

---

### 3.4 Responsive Design & Cross-Device (`NFR-RESP`)

- `NFR-RESP-001`: Mobile-First Design supporting Viewport Widths: 320px (Mobile Small), 375px (Mobile Standard), 768px (Tablet), 1024px+ (Desktop).
- `NFR-RESP-002`: Map drawer must seamlessly transition between bottom-sheet (Mobile) and side-panel (Desktop) layouts without losing active state.

---

## 4. Requirements Traceability Matrix Summary

| Requirement ID | Module | Primary User Persona | Target Test Suite |
| :--- | :--- | :--- | :--- |
| `FR-AUTH-001` | Auth | Everyday Nigerians, Students | Vitest / Playwright Auth |
| `FR-MEM-001` | Memory Creation | Older Contributors, Families | Playwright Wizard E2E |
| `FR-MAP-001` | Map Engine | All Personas | Vitest Component / RTL |
| `FR-TIMELINE-001`| Timeline | Researchers, Young Nigerians | Vitest State Store |
| `FR-ADMIN-001` | Moderation | Admin / Moderators | Playwright Admin E2E |
| `FR-SHARE-001` | Virality | Young Nigerians, Tourists | Integration / Social Meta |
