# Product Requirements Document (PRD) - NaijaPins

> **Tagline:** "Where Nigeria remembers."  
> **Status:** APPROVED  
> **Target Audience:** Engineering, Product, Design, QA, Leadership  

---

## 1. Executive Summary

**NaijaPins** is a community-powered digital memory and heritage platform for Nigeria. It provides an interactive, place-based repository where Nigerians—at home and across the diaspora—can preserve, discover, and share memories tied to physical locations across the nation.

By integrating **interactive mapping**, **chronological timelines (1960–Present)**, and **human storytelling (text, photos, audio)**, NaijaPins bridges generational and geographical divides. It transforms Nigeria's physical landscape into a living digital archive of personal stories, community milestones, educational heritage, historical events, and cultural landmarks.

---

## 2. Vision & Mission

### 2.1 Vision
To build the definitive digital archive of Nigerian human history, places, and lived experiences—ensuring that no community memory, school legacy, family story, or cultural landmark is forgotten.

### 2.2 Mission
To empower everyday citizens, elders, students, institutions, and organizations to easily record and explore geographical memories across Nigeria through an accessible, mobile-first, community-moderated map interface.

---

## 3. Problem & Opportunity

### 3.1 The Problem
1. **Loss of Oral & Local History:** Rich historical and personal narratives across Nigerian towns, neighborhoods, and institutions are rapidly fading as older generations pass away without structured digital preservation.
2. **Abstract & Fragmented Digital Archives:** Existing social platforms (Instagram, X, Facebook) bury local history in ephemeral feeds without geographic context or temporal indexing.
3. **Decentralized Institutional Heritage:** Alumni memories of secondary schools, pioneer businesses, local food institutions, and municipal landmarks exist only in fragmented physical archives or private memories.
4. **Lack of Geographic Storytelling:** Maps are currently treated strictly as utility navigation tools (e.g., Google Maps) rather than repositories of human experience and cultural heritage.

### 3.2 The Opportunity
1. **Vibrant Nigerian Storytelling Culture:** Nigeria possesses an extraordinarily rich culture of storytelling, nostalgia, and community pride across 36 states and the FCT.
2. **Mass Mobile & Internet Adoption:** High smartphone penetration among Nigerian youth creates an ideal channel for collecting stories from elders and sharing them broadly.
3. **Global Diaspora Connection:** Millions of Nigerians abroad seek authentic, nostalgic connections to their ancestral hometowns, schools, and childhood neighborhoods.
4. **First-Mover Place-Based Archive:** No dedicated, community-driven place-and-time digital memory engine exists specifically built for the Nigerian socio-cultural context.

---

## 4. Product Principles

1. **Community-Driven & Human-Centered:** Authenticity comes from real people sharing lived experiences. User contributions are celebrated while transparently labeled as personal memories rather than peer-reviewed academic facts.
2. **Geographic & Historical First:** Every memory MUST have a physical location (Coordinates + State + LGA + Neighborhood) and a temporal anchor (Exact Year / Decade / Date Range).
3. **Mobile-First & Accessible:** Built for low-bandwidth environments, diverse screen sizes, and intuitive touch interactions.
4. **Privacy-Conscious & Trustworthy:** Strict safeguards against personal data exposure, private residence harassment, content infringement, and hate speech.
5. **Nigerian-Centric Aesthetics & Nuance:** Design, tone, categories, and terminology reflect Nigerian cultural warmth, dignity, and vibrancy.

---

## 5. Target Users & Detailed Personas

NaijaPins serves 12 distinct target user segments across public, educational, institutional, and commercial sectors:

| Persona | Key Problems & Pain Points | Core Motivations | Primary Needs | Why NaijaPins Matters |
| :--- | :--- | :--- | :--- | :--- |
| **1. Everyday Nigerians** | Memories of childhood neighborhoods fade as cities modernize. | Nostalgia, community pride, leaving a mark. | Simple way to pin photos/stories to places they grew up. | Reconnects them to childhood locations and shared community roots. |
| **2. Students** | Local history taught in schools feels abstract and disconnected from real places. | Homework, local history projects, campus curiosity. | Searchable historical pins near their school or town. | Brings textbook history to life right on their phone screen. |
| **3. Researchers** | Primary oral history sources are unindexed, unmapped, and difficult to access. | Academic documentation, cultural preservation. | Structured geographical and temporal search filters. | Provides raw, citizen-sourced qualitative data tied to exact coordinates. |
| **4. Families** | Family photos and audio recordings sit buried in old photo albums and WhatsApp groups. | Preserving family lineage, honoring elders. | Shared family memory tags tied to ancestral homes/hometowns. | Creates a digital heritage legacy for children and future generations. |
| **5. Older Contributors** | Technology feels overwhelming; valuable historical memories are unrecorded. | Passing down wisdom, being remembered. | Accessible, high-contrast, simple mobile/voice contribution flow. | Gives elders a platform to speak their history into the permanent record. |
| **6. Young Nigerians** | Disconnected from how iconic Lagos/Nigerian places looked and felt 30–50 years ago. | Curiosity, pop-culture history, retro aesthetics. | Engaging map discovery, audio clips, viral social sharing. | Makes Nigerian history cool, visual, and shareable on social platforms. |
| **7. Schools** | School history (founding dates, pioneer principals, alumni memories) is lost over time. | Alumni engagement, institution pride. | Institutional profile tags for school landmarks. | Preserves school legacies and connects past alumni with current students. |
| **8. Universities** | Decades of campus traditions, student union milestones, and hall stories disappear. | Campus culture preservation, academic archive. | Categorized campus memory maps (e.g., UNILAG 1970s vs 2000s). | Serves as a digital museum of university life and student history. |
| **9. Museums** | Artifacts sit behind glass; context of original locations in towns is missing. | Extending reach beyond physical museum walls. | Verified institutional memory pins linking artifacts to places. | Extends museum curation into the real physical environment. |
| **10. Cultural Orgs** | Intangible heritage (festivals, traditional crafts, language centers) lacks spatial maps. | Preserving indigenous Nigerian culture. | Rich audio/photo pins for cultural heritage sites. | Maps intangible cultural heritage across states and LGAs. |
| **11. Businesses** | Historic brand origins (e.g., 50-year-old bakeries, famous markets) are unchronicled. | Brand heritage, storytelling marketing. | Verified business milestone pins on historical maps. | Anchors commercial legacy to physical urban history. |
| **12. Tourists** | Standard travel apps show only modern hotels, lacking deep cultural context. | Authentic cultural exploration, learning true local context. | Geolocated historical guides and audio memories. | Offers an authentic human-narrated guide to Nigerian cities. |

---

## 6. Geographic Strategy

### 6.1 MVP Scope: Lagos-First Focus
To ensure dense network effects, high pin quality, and focused community moderation, the MVP will launch with an initial geographical focus on **Lagos State** (Ikeja, Lagos Island, Yaba, Surulere, Victoria Island, Lekki, Epe, Badagry, etc.).

### 6.2 National Scale Architecture
The underlying database schema, API contracts, and spatial query index MUST support seamless Nigeria-wide scaling without structural refactoring.

All memory locations enforce a mandatory 7-tier geographic hierarchy:
1. `country` (Default: "Nigeria")
2. `state` (e.g., "Lagos", "Oyo", "Kano", "Rivers", "Enugu")
3. `lga` (Local Government Area, e.g., "Lagos Mainland", "Ikeja")
4. `city` / `town` (e.g., "Yaba", "Ikeja", "Epe")
5. `neighborhood` / `district` (e.g., "Sabo", "Allen Avenue", "Ojuelegba")
6. `latitude` (Decimal degrees, WGS84, e.g., `6.5244`)
7. `longitude` (Decimal degrees, WGS84, e.g., `3.3792`)

---

## 7. Product Features & MVP Scope

### 7.1 In-Scope for MVP (Phase 1)

1. **Interactive Explore Map:**
   - Fullscreen Leaflet map centered over Nigeria (initial bounds set to Lagos State).
   - Dynamic marker clustering for dense location pins.
   - Click-to-preview memory drawer/card with image, title, year, category, and audio indicator.
2. **Memory Pins & Details:**
   - Detailed memory page with full story text, multi-image gallery, optional audio player, contributor attribution, location badge, and date badge.
3. **Add Memory Creation Wizard:**
   - 4-step modal/page flow: Location Selection (Map click, GPS, or Search) → Story & Metadata (Title, Story, Category, Date/Year) → Media Upload (Images up to 5MB, Audio up to 10MB) → Preview & Submit.
4. **Chronological Timeline Filter:**
   - Dual-slider timeline covering **1960 to Present**.
   - Supports filtering by Exact Year (e.g., `1977`), Decade (e.g., `1970s`), or Custom Range (e.g., `1980–1995`).
5. **Search & Category Filtering:**
   - Search by keyword, location name, or tag.
   - Quick category pills: `Family`, `School`, `Business`, `Food`, `Landmark`, `Community`, `Culture`, `Event`, `Historical`, `Personal`.
6. **Authentication & User Profiles:**
   - Email & Password sign-up/login via Supabase Auth with email verification.
   - User profile management (display name, avatar, bio, list of created memories).
7. **Social Sharing & Virality:**
   - Shareable direct URLs (`/memory/:id`).
   - Dedicated WhatsApp share button formatted with custom preview text and open-graph image metadata.
8. **Community Reporting & Moderation:**
   - Public "Report Memory" modal with options (Spam, Harassment, Misinformation, Privacy, Inappropriate).
   - Admin/Moderator dashboard to review, approve, reject, hide, or restore flagged pins.
9. **Basic Admin & Analytics Dashboard:**
   - Stats on total memories, active users, reported items, and category distribution.

### 7.2 Explicitly Out-of-Scope for MVP (Post-MVP / Future)
- Video upload & processing pipelines.
- Paid subscriptions, Paystack payment processing, and organization accounts.
- Direct user-to-user private messaging.
- Native iOS/Android apps (MVP is a progressive web app).
- Automated AI story generation or automated voice synthesis.

---

## 8. Initial Categories & Timeline Rules

### 8.1 Categories
- 🏠 **Family:** Ancestral memories, family homes, reunions, personal milestones.
- 🏫 **School:** Primary, secondary, and university memories, alumni stories.
- 🏢 **Business:** Historic stores, markets, pioneer companies, local trade.
- 🍲 **Food:** Iconic local eateries, bukka spots, historic food markets.
- 📍 **Landmark:** Monuments, bridges, famous buildings, public spaces.
- 👥 **Community:** Neighborhood gatherings, local heroes, town hall history.
- 🎨 **Culture:** Festivals, music scenes, traditional ceremonies, arts.
- 📅 **Event:** Notable public events, parades, sports matches, political rallies.
- 📜 **Historical:** Major historical milestones, archival documentation.
- ✍️ **Personal:** Childhood reflections, romance, personal life stories.

### 8.2 Timeline Specification
- **Boundaries:** October 1, 1960 (Nigerian Independence) to Current Year.
- **Date Precision Models:**
  - `EXACT_DATE`: Full date (`YYYY-MM-DD`).
  - `EXACT_YEAR`: Specific year (`YYYY`).
  - `DECADE`: 10-year span (`1960s`, `1970s`, `1980s`, `1990s`, `2000s`, `2010s`, `2020s`).
  - `DATE_RANGE`: Custom start/end years (e.g., `1967–1970`).

---

## 9. Growth Loops & Virality

```
[ Discover Memory on Map / Social ]
              │
              ▼
[ Read Story / Listen to Audio ]
              │
              ▼
[ Click "Share on WhatsApp / X" ]
              │
              ▼
[ Recipient Opens Public Memory URL ]
              │
              ▼
[ Spurred Nostalgia / Local Pride ]
              │
              ▼
[ Clicks "Add Your Memory" ] ────► [ Map Grows & Richer Discovery ]
```

### Key Growth Features
1. **WhatsApp Deep Integration:** Customized preview cards optimized for Nigerian WhatsApp groups.
2. **SEO-Optimized Public Memory Pages:** Server-rendered meta tags for Google indexing of local search queries (e.g., "Yaba Lagos in 1980s").
3. **Public Contributor Profiles:** Showcases top memory contributors with shareable profile badges.

---

## 10. Monetization Strategy (Long-Term Hypotheses)

Monetization will **NOT** disrupt the core public archiving experience during MVP. Future monetization channels will be validated via Paystack:

1. **Premium Family Archives:** Private, invite-only family memory maps with expanded storage.
2. **Institutional & School Subscriptions:** Verified school badge pages, custom domain embeds, and historical archive hosting for alumni associations.
3. **Business Heritage Pages:** Verified heritage profiles for legacy Nigerian brands, markets, and hospitality establishments.
4. **Cultural Tourism & Museum Partnerships:** Curated digital heritage trails co-branded with tourism boards and cultural institutes.

---

## 11. Key Performance Indicators (KPIs)

| Metric Category | Target MVP Metric | Measurement Frequency |
| :--- | :--- | :--- |
| **Engagement** | 1,000+ Published Memories (Lagos Launch) | Monthly |
| **Quality** | > 60% of memories include image or audio | Weekly |
| **Virality** | > 2.5 shares per memory view | Weekly |
| **Retention** | > 35% 30-day returning visitor rate | Monthly |
| **Safety** | < 1% published memories flagged as inappropriate | Real-time |
| **Performance** | < 1.8s Initial Map Page Load Time on 3G | Continuous |

---

## 12. Risk Assessment & Mitigations

| Risk | Impact | Likelihood | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Inappropriate / Hate Content** | High | Medium | Pre/post-moderation pipeline, strict RLS, community reporting, quick admin takedown. |
| **Privacy Violations (Private Homes)** | High | Medium | Explicit user guidance on public vs private spaces; pin blur/jitter option for residential areas. |
| **Copyright Infringement (Photos)** | Medium | High | DMCA/Takedown notice policy; mandatory user declaration of ownership upon submission. |
| **Low Initial Memory Density** | High | High | Seed Lagos with 50+ curated historical memories across iconic landmarks before launch. |
| **High Audio Storage Costs** | Medium | Low | Strict 10MB audio limit, client-side AAC/MP3 compression, audio length capped at 3 mins. |

---

## 13. Acceptance Criteria for PRD Approval

- [x] All 12 personas specified with explicit problems, needs, and motivations.
- [x] Geographic strategy explicitly detailed (Lagos-first, national schema).
- [x] Timeline specifications defined (1960–Present with exact, decade, and range support).
- [x] Clear boundary established between MVP and Future Scope.
- [x] Growth loops and long-term monetization hypotheses defined.
