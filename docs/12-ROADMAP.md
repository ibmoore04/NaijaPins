# Strategic Product Roadmap - NaijaPins

> **Tagline:** "Where Nigeria remembers."  
> **Status:** APPROVED  
> **Target Audience:** Leadership, Product Managers, Investors, Engineering Leads  

---

## 1. Product Vision & Milestone Timeline

```
┌────────────────────────────────────────────────────────────────────────┐
│  PHASE 0: ARCHITECTURE & DOCS (Q3 2026)                               │
│  - Complete 15-file specifications, DB RLS, & API schemas              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: LAGOS MVP LAUNCH (Q3-Q4 2026)                                │
│  - Interactive Map + 1960-Present Timeline                            │
│  - Story Creation (Text + Photos + Audio)                             │
│  - WhatsApp Virality & Community Moderation Queue                      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Network Density Established
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│  PHASE 2: NATIONAL EXPANSION & COMMUNITY GROWTH (Q1-Q2 2027)            │
│  - Ibadan, Port Harcourt, Kano, Enugu, & Abuja FCT Launch             │
│  - Contributor Reputation Badges & Offline PWA Capabilities            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Institutional Demand
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│  PHASE 3: INSTITUTIONAL & B2B ARCHIVES (Q3-Q4 2027)                    │
│  - School & Alumni Legacy Portals                                      │
│  - Museum Curated Walking Trails & Paystack Subscriptions              │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. MVP Scope Boundaries (Strict Policy)

To ensure rapid market entry, high product quality, and focused community density, the MVP adheres to strict scope boundaries:

### In-Scope for MVP
- **Geography:** Lagos State launch focus (architecture supports 36 states + FCT).
- **Core Engine:** Interactive Leaflet map with pin clustering and spatial bounding-box querying.
- **Story Creation:** Title, story text, category, 1960–Present date precision, up to 5 images, optional audio recording.
- **Search & Filters:** Keyword search, category pills, dual-thumb decade/year timeline slider.
- **Auth & Profiles:** Supabase Email/Password registration, verification, user profiles.
- **Virality:** Shareable URLs, WhatsApp deep-link preview generator.
- **Safety:** Public content report modal and Moderator review queue dashboard.

### Explicitly Excluded from MVP (Post-MVP Horizon)
- ❌ Video uploads or video streaming infrastructure.
- ❌ Paystack payment gateways or paid subscriptions.
- ❌ Private user-to-user messaging.
- ❌ Native iOS/Android App Store builds (Web & PWA focus).
- ❌ Automated AI story generation or synthetic voice cloning.

---

## 3. Feature Prioritization Matrix

```
       HIGH VALUE
           │
           │  [MVP] Interactive Map & Pins       [MVP] Story Creation & Media
           │  [MVP] Timeline 1960-Present        [MVP] WhatsApp Virality
           │  [Post-MVP] National Expansion      [Post-MVP] School Legacy Archives
           │
LOW ───────┼─────────────────────────────────────────────────────────────── HIGH
EFFORT     │                                                               EFFORT
           │  [MVP] Category Pills & Search       [Post-MVP] AI Audio Transcription
           │  [MVP] Community Reporting           [Post-MVP] Native Mobile Apps
           │  [Post-MVP] Contributor Badges       [Post-MVP] Video Attachments
           │
       LOW VALUE
```

---

## 4. Post-MVP Feature Expansion Roadmap

### Phase 2: National Expansion (Months 4–8)
1. **Multi-City Rollout:** Dedicated city portals for Ibadan, Port Harcourt, Kano, Kaduna, Enugu, Calabar, and Abuja FCT.
2. **Progressive Web App (PWA):** Offline map caching and background media upload sync for low-connectivity environments.
3. **Indigenous Language Support:** Multi-language interface toggles (Yoruba, Hausa, Igbo, Nigerian Pidgin).

### Phase 3: Institutional & Organizational Portals (Months 9–14)
1. **Verified Alumni School Portals:** Custom portals for iconic secondary schools (e.g., King's College, Queen's College, Barewa College, CKC Onitsha).
2. **Heritage Trails & Digital Museum Exhibits:** QR-code-activated heritage routes for museums and historical sites.
3. **Paystack Monitored Subscriptions:** Seamless self-serve billing for institutions.

### Phase 4: AI & Advanced Media (Months 15+)
1. **AI Speech-to-Text Transcription:** Automated Yoruba/Igbo/Hausa/Pidgin oral history audio transcription to searchable text.
2. **Historical Photo Restoration:** Integrated AI photo enhancement for damaged vintage 1960s/1970s family photos.
