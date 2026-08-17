# Testing Strategy & Quality Assurance Plan - NaijaPins

> **Tagline:** "Where Nigeria remembers."  
> **Status:** APPROVED  
> **Target Audience:** QA Engineers, Frontend Engineers, Backend Engineers, DevOps  

---

## 1. Testing Philosophy & Testing Pyramid

NaijaPins enforces a rigorous multi-layered testing strategy to guarantee stability, security, accessibility, and performance across desktop and mobile devices.

```
                  /\
                 /  \       E2E Tests (Playwright)
                /    \      - Critical User Journeys (Auth, Memory Creation, Moderation)
               /------\
              /        \    Integration Tests (Vitest + Supabase RLS)
             /          \   - Database Policies, API Service Wrappers, Storage
            /------------\
           /              \ Component Tests (React Testing Library)
          /                \ - UI Primitives, Memory Cards, Timeline Slider, Drawers
         /------------------\
        /                    \ Unit Tests (Vitest)
       /                      \ - Formatters, Geocoding Utils, Zustand Stores, Schemas
      /------------------------\
```

---

## 2. Test Layer Specifications

### 2.1 Unit Testing (`Vitest`)
- **Scope:** Pure utility functions, date formatters, geo-distance calculations, Zod form validation schemas, and Zustand UI state store actions.
- **Coverage Target:** ≥ 85% line coverage.
- **Command:** `npm run test:unit`

```typescript
// Example: Testing date precision parser
describe('formatMemoryDate', () => {
  it('correctly formats DECADE date precision', () => {
    const result = formatMemoryDate({ dateType: 'DECADE', year: 1970 });
    expect(result).toBe('1970s Era');
  });
});
```

### 2.2 Component & UI Testing (`React Testing Library`)
- **Scope:** Individual React components in isolation. Verifies rendering, prop handling, user event simulation, and accessibility roles.
- **Components Tested:** `MemoryCard`, `TimelineSlider`, `CategoryBadge`, `AudioPlayer`, `SearchInput`.
- **Command:** `npm run test:components`

### 2.3 Integration Testing (`Supabase Local CLI`)
- **Scope:** Validating PostgreSQL Row Level Security (RLS) policies and database RPC functions against a local Dockerized Supabase instance.
- **Key Test Cases:**
  1. Verify anonymous user cannot `INSERT` into `memories`.
  2. Verify authenticated user can only `UPDATE` their own `memories` row.
  3. Verify `get_map_pins_in_bounds` correctly filters pins inside bounding box.

### 2.4 End-to-End (E2E) Testing (`Playwright`)
- **Scope:** Full end-to-end browser automation covering critical user journeys across Chrome, Firefox, and Mobile Safari viewports.
- **Command:** `npm run test:e2e`

---

## 3. Critical User Journey E2E Test Cases

| Test Case ID | User Journey | Steps Executed in Test Script | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **`E2E-JOURNEY-01`** | **User Registration & Login** | Open `/login` → Fill new email/password → Submit form → Receive verification mock → Verify header displays user avatar. | User successfully authenticated; session persisted in local storage. |
| **`E2E-JOURNEY-02`** | **Memory Creation Flow** | Click "Add Memory" → Click map location (Yaba) → Fill Title, Story, Category ('School'), Year (1984) → Upload mock image → Click "Publish". | Memory pin appears on map at exact Yaba coordinates; URL redirects to `/memory/yaba-school-1984`. |
| **`E2E-JOURNEY-03`** | **Timeline & Search Filter** | Open `/explore` → Adjust timeline slider to `1970–1980` → Select category 'Food'. | Map re-renders showing strictly pins matching 1970–1980 Food categories. |
| **`E2E-JOURNEY-04`** | **Content Reporting** | Open Memory Drawer → Click "Report Memory" → Select "Spam" → Submit details. | Report saved in database; toast confirmation displayed to user. |
| **`E2E-JOURNEY-05`** | **Admin Moderation** | Login as Admin → Open `/admin` → View pending reports → Click "Approve Memory" or "Hide Memory". | Memory status updated in DB; `moderation_logs` audit entry appended. |

---

## 4. Accessibility (A11y) & Performance Testing

1. **Automated Accessibility Audits:** `playwright-axe` runs automated WCAG 2.1 AA scans on every major route (`/`, `/explore`, `/memory/:id`, `/add-memory`). Zero `Critical` or `Serious` violations permitted.
2. **Keyboard Navigation Checklists:** Manual QA verification that all map controls, popups, timeline sliders, and modal dialogs are fully navigable via `Tab`, `Enter`, `Space`, and `Arrow` keys.
3. **Lighthouse Performance CI:** Automated Lighthouse checks on Vercel preview deployments enforcing:
   - Performance Score ≥ 90
   - Accessibility Score ≥ 95
   - Best Practices Score ≥ 95
   - SEO Score ≥ 95

---

## 5. Release Quality Gates

Before any git branch can be merged into `main` or deployed to Production, it MUST pass the following automated GitHub Actions CI pipeline:

```
[ Git Push / PR Created ]
           │
           ├──► 1. ESLint & TypeScript Compilation Check (`tsc --noEmit`)
           ├──► 2. Vitest Unit & Component Tests
           ├──► 3. Supabase RLS Policy Integration Tests
           ├──► 4. Playwright E2E Test Suite (Headless Chrome/Mobile Safari)
           └──► 5. Lighthouse CI Web Vitals Audit
           │
           ▼
[ ALL CHECKS PASSED ] ──► Auto-Deploy to Vercel Staging Environment
```
