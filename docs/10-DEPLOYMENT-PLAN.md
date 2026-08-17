# Deployment & Infrastructure Plan - NaijaPins

> **Tagline:** "Where Nigeria remembers."  
> **Status:** APPROVED  
> **Target Audience:** DevOps Engineers, Backend Engineers, System Administrators  

---

## 1. Environment Topology

NaijaPins maintains 3 isolated deployment environments to ensure zero disruption to production users:

| Environment | Purpose | Hosting Platform | Database | Domain URL |
| :--- | :--- | :--- | :--- | :--- |
| **Local Dev** | Local feature development & testing | Vite Dev Server (`localhost:5173`) | Local Dockerized Supabase CLI | `http://localhost:5173` |
| **Staging** | Automated PR preview & QA verification | Vercel Preview Deployments | Supabase Staging Project | `https://staging.naijapins.com` |
| **Production** | Live community-facing application | Vercel Global Edge CDN | Supabase Production Project (HA) | `https://naijapins.com` |

---

## 2. Infrastructure Setup & Hosting

### 2.1 Vercel Deployment Configuration (`vercel.json`)
```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

### 2.2 Supabase Database Migration Pipeline
Database changes are versioned using **Supabase CLI migration files** in `supabase/migrations/`.

```bash
# Applying migrations to remote environments via Supabase CLI
supabase db push --linked
```

---

## 3. Environment Variables & Secrets Management

```
┌────────────────────────────────────────────────────────────────────────┐
│  Variable Name             │ Public / Secret │ Required Environment     │
├────────────────────────────┼─────────────────┼──────────────────────────┤
│ VITE_SUPABASE_URL          │ Public          │ Dev, Staging, Production │
│ VITE_SUPABASE_ANON_KEY     │ Public          │ Dev, Staging, Production │
│ VITE_APP_TITLE             │ Public          │ Dev, Staging, Production │
│ VITE_MAP_TILE_PROVIDER_URL │ Public          │ Dev, Staging, Production │
│ SUPABASE_SERVICE_ROLE_KEY  │ Secret (CI Only)│ GitHub Actions Secrets   │
│ PAYSTACK_SECRET_KEY        │ Secret (Post-MVP)│ Supabase Vault / Vercel  │
└────────────────────────────────────────────────────────────────────────┘
```

*CRITICAL RULE:* `SUPABASE_SERVICE_ROLE_KEY` MUST NEVER be prefixed with `VITE_` and MUST NEVER be exposed in frontend client bundles.

---

## 4. CI/CD GitHub Actions Workflow

```yaml
name: NaijaPins CI/CD Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  validate-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: TypeScript & Lint Audit
        run: npm run lint && npm run typecheck

      - name: Run Vitest Unit & Component Tests
        run: npm run test:unit

      - name: Build Production Bundle Validation
        run: npm run build
```

---

## 5. Disaster Recovery & Rollback Plan

1. **Database Automated Backups:** Supabase Production executes daily point-in-time recovery (PITR) backups retained for 30 days.
2. **Instant Vercel Rollbacks:** If a production deployment exhibits critical errors, DevOps can execute a one-click rollback in Vercel Dashboard to revert traffic to the previous healthy deployment within 5 seconds.
3. **Database Migration Rollbacks:** Every SQL migration file in `supabase/migrations/` MUST include a corresponding down-migration script (`.down.sql`) to safely revert schema changes if required.
