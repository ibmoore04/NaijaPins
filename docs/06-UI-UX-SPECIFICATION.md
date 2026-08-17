# UI/UX & Design System Specification - NaijaPins

> **Tagline:** "Where Nigeria remembers."  
> **Status:** APPROVED & AUTHORITATIVE DESIGN REFERENCE  
> **Target Audience:** UI/UX Designers, Frontend Engineers, Accessibility Specialists, AI Agents  

---

## 1. Visual Brand Identity & Design Philosophy

**NaijaPins** is a community-powered digital memory and heritage platform for Nigeria. It combines the dignity of a digital historical archive with the interactivity of a modern community map and the warmth of human storytelling.

### Core Visual Direction
- **Identity:** Unmistakably Nigerian, human-centered, trustworthy, and modern.
- **Vibe:** Digital Archive + Interactive Map + Community Storytelling.
- **Anti-Patterns:** Avoid looking like a generic social media feed, a cluttered Google Maps clone, a government portal, an administrative SaaS dashboard, or an outdated museum archive.

---

## 2. Official Brand Colors & Visual Balance

The official brand color palette is strictly built around **WHITE + GREEN + BLACK**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        VISUAL BALANCE RATIO                            │
│                                                                        │
│   ████████████████████████████████████████████████  75% WHITE/SURFACE  │
│   ████████████████                                  20% BLACK TYPO     │
│   ████                                              5% GREEN ACCENT    │
└────────────────────────────────────────────────────────────────────────┘
```

- **70–80% WHITE / NEUTRAL SURFACES:** Page canvas, card backgrounds, navigation containers, modals, and content cards.
- **15–20% BLACK / DARK CHARCOAL:** Headings, body text, primary typography, high-contrast UI icons, and dark structural elements.
- **5–10% GREEN BRAND ACCENTS:** Primary action buttons, active navigation indicators, selected filter states, active timeline range, and map pin markers. Green is used as an intentional, purposeful accent.

---

## 3. Design Tokens & Color Palette

### 3.1 CSS Color Variables (`:root`)

```css
:root {
  /* Official Primary Brand Palette */
  --color-green-primary:      #0B6B3A;   /* Primary Nigerian Green */
  --color-green-dark:         #064D2A;   /* Deep Green (Hover/Active) */
  --color-green-light:        #E8F5EE;   /* Light Green Tint (Subtle Fill) */
  --color-green-border:       #A3D9BC;   /* Soft Green Border Accent */

  /* Neutral Backgrounds & Surfaces (70-80% Balance) */
  --color-white:              #FFFFFF;   /* Primary Surface */
  --color-offwhite:           #F8FAF9;   /* Off-white Page Canvas */
  --color-gray-light:         #F3F4F6;   /* Muted Component Background */
  --color-border:             #E5E7EB;   /* Subdivided Border Lines */

  /* Typography & High Contrast (15-20% Balance) */
  --color-black:              #111111;   /* Primary Headings & Bold Text */
  --color-charcoal-dark:      #1F2933;   /* Body Text / Secondary Headers */
  --color-gray-muted:         #64748B;   /* Subtitles, Meta & Captions */

  /* Semantic UI Feedback Tokens */
  --color-status-success:     #0B6B3A;
  --color-status-warning:     #D97706;
  --color-status-error:       #DC2626;
  --color-status-info:        #0284C7;

  /* Category Identity Badges */
  --cat-family:               #7E22CE;
  --cat-school:               #0284C7;
  --cat-business:             #1D4ED8;
  --cat-food:                 #C2410C;
  --cat-landmark:             #047857;
  --cat-community:            #B45309;
  --cat-culture:              #BE123C;
  --cat-event:                #6D28D9;
  --cat-historical:           #78350F;
  --cat-personal:             #BE185D;
}
```

### 3.2 WCAG 2.1 AA Contrast Verification Table

| Foreground Token | Background Token | Calculated Contrast Ratio | Standard Met |
| :--- | :--- | :---: | :---: |
| `#111111` (Black) | `#FFFFFF` (White Surface) | **18.1:1** | Pass (WCAG AAA) |
| `#1F2933` (Charcoal) | `#F8FAF9` (Off-white Canvas) | **13.8:1** | Pass (WCAG AAA) |
| `#0B6B3A` (Green Primary) | `#FFFFFF` (White Text) | **5.4:1** | Pass (WCAG AA Large & Normal) |
| `#FFFFFF` (White Text) | `#0B6B3A` (Green Button) | **5.4:1** | Pass (WCAG AA) |
| `#64748B` (Muted Gray) | `#FFFFFF` (White Surface) | **4.6:1** | Pass (WCAG AA Normal) |

---

## 4. Typography System

- **Heading Font:** `Outfit` or `Plus Jakarta Sans` (Google Font) – Modern, clean geometric structure.
- **Body Font:** `Plus Jakarta Sans` or `Inter` (Google Font) – Highly legible on mobile screens at low resolutions.

| Token / Role | Size (px / rem) | Weight | Line Height | Letter Spacing | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display H1** | 36px / 2.25rem | Bold (700) | 1.15 | -0.02em | Hero Section Headline |
| **Heading H2** | 28px / 1.75rem | Bold (700) | 1.2 | -0.01em | Page Titles, Drawer Header |
| **Heading H3** | 22px / 1.375rem | SemiBold (600) | 1.25 | 0em | Section Headers, Modal Title |
| **Heading H4** | 18px / 1.125rem | SemiBold (600) | 1.3 | 0em | Card Titles, Subheaders |
| **Body Base** | 16px / 1.0rem | Regular (400) | 1.5 | 0em | Primary Story Text, Form Input |
| **Body Small** | 14px / 0.875rem | Regular (400) | 1.4 | 0em | Secondary Descriptions, Meta |
| **Caption** | 12px / 0.75rem | Medium (500) | 1.3 | 0.01em | Timestamps, Map Marker Tags |
| **Button Text** | 14px / 0.875rem | SemiBold (600) | 1.2 | 0.02em | Action Buttons & Tab Triggers |

---

## 5. Spacing Scale, Radii, & Elevation Tokens

### 5.1 Spacing Scale (`4px` Base Grid)

```
space-1  (4px)   ─ Micro padding, badge gap
space-2  (8px)   ─ Button icon gap, list item padding
space-3  (12px)  ─ Form field internal padding
space-4  (16px)  ─ Standard card padding, input height inset
space-5  (20px)  ─ Section inner gap
space-6  (24px)  ─ Grid column gap, modal padding
space-8  (32px)  ─ Major component spacing
space-10 (40px)  ─ Layout block margin
space-12 (48px)  ─ Section padding (Mobile)
space-16 (64px)  ─ Hero section padding (Desktop)
space-20 (80px)  ─ Page layout outer margin
```

### 5.2 Border Radius System

- **`radius-sm` (4px):** Checkboxes, tooltips, small badges.
- **`radius-md` (8px):** Form inputs, buttons, standard cards, dropdown menus.
- **`radius-lg` (12px):** Modals, side drawers, hero feature cards.
- **`radius-pill` (9999px):** Search pills, category filters, avatar containers.

### 5.3 Elevation & Shadow Tokens

- **`shadow-none`:** Flat border-only elements.
- **`shadow-sm`:** `0 1px 2px 0 rgba(0, 0, 0, 0.05)` (Cards, form inputs).
- **`shadow-md`:** `0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)` (Hovered cards, map controls, popovers).
- **`shadow-lg`:** `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)` (Floating drawers, modals).

---

## 6. Three-Layer Component Architecture

NaijaPins follows a strict **3-Layer Component Architecture** to ensure zero code duplication.

```
┌────────────────────────────────────────────────────────────────────────┐
│                     LAYER 3 — FEATURE COMPONENTS                       │
│  (MemoryCreationForm, ModerationPanel, MemoryDetails, AdminReview)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Composes
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     LAYER 2 — SHARED COMPONENTS                        │
│  (Navbar, SearchBar, MemoryCard, Timeline, MapControls, FilterBar)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Composes
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     LAYER 1 — UI PRIMITIVES                            │
│  (Button, Input, Badge, Card, Dialog, Tooltip, Drawer, Skeleton)       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Comprehensive Reusable Component Inventory

| Component Name | Layer | Reusable? | Primary Responsibility / Used By |
| :--- | :--- | :---: | :--- |
| **`Button`** | Primitive | Yes | Base action trigger with variants (`primary`, `secondary`, `outline`, `ghost`, `destructive`). Used everywhere. |
| **`Input` / `Textarea`** | Primitive | Yes | Accessible text entry fields with hover, focus, error, and disabled states. |
| **`Card`** | Primitive | Yes | Surface wrapper (`CardHeader`, `CardContent`, `CardFooter`) with border and soft shadow. |
| **`Dialog` / `Modal`** | Primitive | Yes | Accessible overlay container with focus lock and background backdrop. |
| **`Drawer` / `BottomSheet`**| Primitive | Yes | Mobile-first bottom sheet overlay sliding up from bottom edge. |
| **`Badge`** | Primitive | Yes | Status and category pill indicator wrapper. |
| **`Tooltip`** | Primitive | Yes | Micro-hover context message. |
| **`Skeleton`** | Primitive | Yes | Animated content placeholder loading state. |
| **`MemoryCard`** | Shared | Yes | Composes Card, Media, YearBadge, and CategoryBadge. Used in Explore map drawer, search, profile, and home. |
| **`MemoryPreview`** | Shared | Yes | Compact map drawer preview card. |
| **`MemoryAudioPlayer`**| Shared | Yes | Custom accessible audio control with Play/Pause, scrubber, and time indicator. |
| **`MemoryGallery`** | Shared | Yes | Multi-photo image thumbnail grid with fullscreen lightbox. |
| **`MapContainer`** | Shared | Yes | Leaflet map wrapper managing tile rendering and viewport events. |
| **`MemoryMarker`** | Shared | Yes | Custom category-icon green map pin indicator. |
| **`MemoryMarkerCluster`**| Shared | Yes | Aggregated map pin cluster circle badge. |
| **`TimelineSlider`** | Shared | Yes | Dual-thumb slider control covering 1960 to Present. |
| **`SearchBar`** | Shared | Yes | Debounced search input with clear trigger. |
| **`CategoryFilterBar`** | Shared | Yes | Scrollable horizontal pill selector for 10 categories. |
| **`Navbar`** | Shared | Yes | Application header bar composing logo, search trigger, and Auth modal button. |
| **`AdminTable`** | Shared | Yes | Data table for moderation reports, users, and memories with pagination. |
| **`MemoryCreationWizard`** | Feature | Domain | Multi-step form flow for creating place-bound memories. |
| **`ModerationPanel`** | Feature | Domain | Admin dashboard panel for reviewing community content reports. |

---

## 8. Specific System Component Designs

### 8.1 Button System (`Button.tsx`)
- **Primary:** Background `#0B6B3A`, Text `#FFFFFF`, Hover `#064D2A`, Active `#04381E`.
- **Secondary:** Background `#E8F5EE`, Text `#0B6B3A`, Hover `#D1EBE0`.
- **Outline:** Background `#FFFFFF`, Border `#E5E7EB`, Text `#111111`, Hover `#F3F4F6`.
- **Ghost:** Transparent background, Text `#1F2933`, Hover `#F3F4F6`.
- **Destructive:** Background `#DC2626`, Text `#FFFFFF`, Hover `#B91C1C`.
- **Sizes:** Small (32px height), Medium (40px height), Large (48px height / mobile primary).
- **States:** Default, Hover, Active, Focus Ring (`ring-2 ring-offset-2 ring-primary`), Disabled (`opacity-50 cursor-not-allowed`), Loading (shows inline spinner).

### 8.2 Map & Marker Design
- **Marker Color:** Official Brand Green `#0B6B3A` with crisp white inner icon.
- **Marker States:**
  - **Default:** 36x36px green teardrop pin with white central category icon.
  - **Hover:** 42x42px pin with elevated drop shadow.
  - **Selected:** 44x44px pin with subtle pulse ring animation.
  - **Cluster:** Circular green badge (`#0B6B3A`) with white bold text count and translucent outer ring.

### 8.3 Timeline Slider Design
- **Range:** **1960 → Present**.
- **Track:** Off-white background (`#F3F4F6`) with dark decade notch markers (`1960`, `1970`, `1980`, `1990`, `2000`, `2010`, `2020`, `Present`).
- **Active Selection Range:** Highlighted in solid Brand Green (`#0B6B3A`).
- **Thumbs:** Dual circular white thumbs (`#FFFFFF`) with 2px Green border (`#0B6B3A`) and shadow.

---

## 9. Page Layout Designs & Wireframe Architecture

### 9.1 Landing Page Hero Section (`/`)
```
┌────────────────────────────────────────────────────────────────────────┐
│                              NAVBAR                                    │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│                NAIJAPINS: WHERE NIGERIA REMEMBERS                       │
│     Discover, preserve, and share memories tied to real places.        │
│                                                                        │
│        [ Explore Memories Map ]      [ Add Your Memory ]               │
│                                                                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ Memory: Yaba 1984│  │ Memory: Epe 1972 │  │Memory: Ikeja 1995│  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### 9.2 Explore Map Page (`/explore`)
- **Desktop:** Split View – 70% Map Canvas on left, 30% Right-hand Memory Drawer & Filter Panel.
- **Mobile:** 100% Fullscreen Map Canvas with floating top Search/Category Bar and bottom-sheet Memory Preview Drawer.

### 9.3 Memory Details Page (`/memory/:slug`)
- Designed like opening a digital historical artifact.
- **Top:** Large high-res hero image / gallery preview.
- **Header:** Category badge, Date badge (e.g., `1984 Era`), Title, Location hierarchy (`Yaba, Lagos Mainland, Lagos`).
- **Body:** Full story text with elevated typography, embedded audio player (if present), contributor profile summary card, WhatsApp share button, and report trigger.

---

## 10. Anti-Duplication & Refactoring Rules

1. **SEARCH FIRST RULE:** Before writing any new UI component, search the existing component library in `src/components/ui/` and `src/components/shared/`.
2. **REUSE BEFORE CREATING:** If a similar component exists, pass configuration props rather than duplicating markup.
3. **THREE-OCCURRENCE RULE:** If a UI snippet or business logic block appears in 3 or more places, stop immediately and extract it into a shared primitive component or custom hook.
4. **ZERO MONOLITHS:** Components must not mix raw map logic, API calls, database queries, and form UI in a single file. Follow clean layer separation defined in [03-SAD.md](file:///c:/Users/USER/Naijapins/docs/03-SAD.md).
