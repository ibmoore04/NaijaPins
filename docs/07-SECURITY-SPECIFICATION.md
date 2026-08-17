# Security & Privacy Specification - NaijaPins

> **Tagline:** "Where Nigeria remembers."  
> **Status:** APPROVED  
> **Target Audience:** Security Engineers, Backend Developers, Compliance Officers  

---

## 1. Threat Model (STRIDE Analysis)

| Threat Category | Potential Risk in NaijaPins | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Spoofing** | Attacker impersonates another contributor to publish fake or offensive historical stories. | High | Strict Supabase JWT authentication, mandatory email verification, immutable `user_id` assignment in RLS. |
| **Tampering** | User alters another user's memory or modifies moderation flags via API manipulation. | High | Database Row Level Security (RLS) policies enforce `auth.uid() = user_id` for updates; zero client write access to moderation tables. |
| **Repudiation** | Moderator hides or deletes legitimate memories without administrative accountability. | Medium | All administrative status changes automatically append immutable records to `moderation_logs`. |
| **Information Disclosure** | Exposure of user email addresses or precise private residential addresses. | High | Sensitive fields excluded from public API projections. Explicit user guidance to avoid pinning private residences. |
| **Denial of Service** | Malicious script spams spatial bounding box RPC queries or uploads gigabytes of junk media files. | Medium | Rate limiting on API gateway; client-side media byte size limits (5MB image / 10MB audio); Supabase storage MIME validation. |
| **Elevation of Privilege** | Normal user tampers with JWT role claims to gain Admin dashboard access. | Critical | Roles managed exclusively in PostgreSQL `profiles.role` column guarded by RLS. JWT claims re-validated on every request. |

---

## 2. Authentication & Credential Architecture

1. **Zero Client Secret Exposure:** The Supabase `service_role` key MUST NEVER be included in frontend environment variables, Vite bundles, or client-side code. The frontend client relies exclusively on the public `VITE_SUPABASE_ANON_KEY`.
2. **Session Security:** Access JWT tokens are short-lived (1 hour expiry), paired with secure HTTP-only refresh tokens.
3. **Password Enforcements:** Minimum 8 characters, requiring at least one numeric digit and one special character (`@#$%^&*`). Passwords are hashed by Supabase Auth using `bcrypt`.

---

## 3. Row Level Security (RLS) Deep-Dive

Row Level Security is the primary security boundary of NaijaPins. RLS policies are enforced directly inside the PostgreSQL kernel, ensuring that even if an attacker crafts custom PostgREST API requests, they cannot bypass authorization constraints.

```
[ Incoming Client Request ]
           │
           ▼
[ Postgres Engine Evaluates JWT `sub` Claim ]
           │
           ├──► Is query a SELECT for published memory? ──► ALLOW (Public Read)
           │
           ├──► Is query an UPDATE for `memories`?
           │         │
           │         ├──► Does `auth.uid() == memories.user_id`? ──► ALLOW (Author Edit)
           │         └──► Does `profiles.role IN ('moderator', 'admin')`? ──► ALLOW (Staff Edit)
           │         └──► Else ──► REJECT (403 Forbidden)
```

---

## 4. Storage & Media Security

1. **Bucket Policies:** Storage buckets (`memory-images`, `memory-audio`, `avatars`) use explicit RLS rules allowing public reads, but limiting `INSERT` and `DELETE` strictly to authenticated users uploading into their designated user directory path (`/public/{user_id}/*`).
2. **MIME Type Validation:** Storage bucket configuration rejects any file extension or MIME type not explicitly whitelisted:
   - Images: `image/jpeg`, `image/png`, `image/webp`
   - Audio: `audio/mpeg` (MP3), `audio/mp4` (M4A), `audio/aac`
3. **File Signature Audit:** Client uploads execute byte-header validation (magic numbers) prior to network submission to prevent file extension spoofing (e.g., disguising an executable `.exe` as a `.jpg`).

---

## 5. Input Sanitization & XSS Prevention

1. **Story Content Sanitization:** All user story text, captions, and profile bios pass through **DOMPurify** before rendering. Direct HTML insertion (`dangerouslySetInnerHTML`) is strictly prohibited.
2. **SQL Injection Prevention:** All database operations utilize parameterized queries handled natively by Supabase PostgREST and PostGIS RPC functions. Raw SQL string concatenation is forbidden.

---

## 6. Privacy, Minor Protection, & Data Deletion

1. **Private Residence Policy:** Memory creation wizard explicitly warns users: *"Do not publish exact personal addresses or photos of private residences without explicit owner consent."*
2. **Protection of Minors:** Content involving minors requires mandatory consent declarations. Photos displaying identifiable children in non-public settings are subject to immediate takedown upon report.
3. **User Account Deletion (Right to be Forgotten):** Users can request account deletion via Profile Settings. Deleting an account executes a cascade purge of `profiles` and soft-deletes associated `memories` while anonymizing author attribution to `"Formerly Contributed Memory"`.

---

## 7. Abuse Prevention & Rate Limiting

- **Auth Attempt Throttling:** Supabase Auth automatically throttles failed login attempts (max 5 attempts per 5-minute window per IP).
- **Report Throttling:** Authenticated users may submit a maximum of 5 content reports per hour to prevent report-spamming harassment campaigns.
- **Debounced View Count RPC:** `increment_memory_view_count` uses an internal Redis/Postgres lock to ensure a single IP address can only increment a memory's view count once per hour.
