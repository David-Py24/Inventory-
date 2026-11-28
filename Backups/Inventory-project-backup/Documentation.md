---
Docs type: Documentation Template
DocsID: DOCS-20261125-init-INVENTORY
Module: Inventory
Repository: Inventory
Role: Main application
Stack: React, TypeScript, Vite, Express, Drizzle, PostgreSQL
Last reviewed: 2026-11-25
---

# Inventory Documentation & Progress Log

**Module**: Inventory  
**Role**: Main application  
**Focus Area**: Full-stack inventory management  
**Stack**: React, TypeScript, Vite, Express, Drizzle, PostgreSQL

---

## 1. Scope & Purpose

Inventory web application: React frontend (src/) and Express/Drizzle backend (server/).

---

## 2. Progress Log

### `2026-11-26` — Document Supabase decisions, implementation, and operations

- **Action**: Added reusable Supabase decision, implementation, and operations notes under `Docs/`.
- **Files**: `Docs/supabase-decisions.md`, `Docs/supabase-database-implementation.md`, and `Docs/supabase-operations-plan.md`.
- **Verification**: Reviewed the notes against the current Drizzle migrations, workflow, CLI config, and recorded database migration state. No application tests were run.

### `2026-11-25` — Initialize local Supabase CLI project

- **Action**: Added the root `supabase/` CLI configuration for project linking and backup workflows.
- **Changes**:
  - Set the local project reference to the connected Supabase project.
  - Disabled Supabase CLI migrations and seeding so Drizzle remains the sole schema migration workflow.
- **Verification**: Initialized the folder with Supabase CLI and reviewed the config. No remote link or backup dump was run.
- **Notes**: Do not commit database dumps; they may contain sensitive application data.

### `2026-11-25` — Automate Supabase migrations on main

- **Action**: Added a GitHub Actions workflow to apply Drizzle migrations when relevant changes reach `main`.
- **Changes**:
  - Added `.github/workflows/deploy-db-migrations.yml` with least-privilege repository read access, serialized migration runs, and `npm ci --legacy-peer-deps` for the existing dependency tree.
  - The workflow reads `SUPABASE_DATABASE_URL` from GitHub repository secrets and invokes `npm run db:migrate`.
- **Verification**: Reviewed the workflow configuration. The repository secret was added, but no GitHub Actions run has been verified yet.
- **Notes**: Use the Session pooler URL for standard GitHub-hosted runners. The workflow only triggers on pushes to `main` that change migration/config/dependency files.

### `2026-11-25` — Apply Inventory schema to Supabase

- **Action**: Applied the checked-in Drizzle migrations to the configured Supabase PostgreSQL database.
- **Changes**:
  - Added `npm run db:migrate` for repeatable migration application.
  - Created the app's 13 schema tables and recorded all 4 migrations in Supabase.
- **Verification**: Confirmed all 13 tables and four migration records exist. Confirmed Row Level Security is enabled and the `anon` and `authenticated` roles lack direct `SELECT` permission on the tables.
- **Notes**: No seed data was inserted. The Express backend continues to access the database server-side via `DATABASE_URL`.

### `2026-11-25` — Add project direct database URL to environment example

- **Action**: Updated the example `DATABASE_URL` with the Supabase direct connection host and parameters provided by the user.
- **Verification**: Initially the local `.env` pointed to `localhost`; after the complete URL was supplied, it was moved to the ignored local `.env` and the direct connection was verified.
- **Notes**: `.env.example` retains a password placeholder. Production Cloud Run connectivity remains separate from the local direct-connection check.

### `2026-11-25` — Add Supabase server package configuration

- **Action**: Added `@supabase/server` and documented Supabase backend environment variables.
- **Changes**:
  - Added `@supabase/server` to runtime dependencies and updated the lockfile.
  - Added safe Supabase variable placeholders to `.env.example`; configured the provided project URL, publishable key, and JWKS URL in the ignored local `.env`.
- **Verification**: Confirmed the dependency and lockfile entry. Standard npm install hit an existing Vite/esbuild peer dependency conflict; installation completed with `--legacy-peer-deps`. No application build or tests were run.
- **Notes**: The provided secret key was masked, so `SUPABASE_SECRET_KEY` still needs its actual value in the local environment. The optional `supabase/server` coding skill was not installed.

### `2026-11-25` — Inventory Starter MVP scaffold across database, backend, and frontend

- **Action**: Created branch plans and implemented the Starter MVP database, backend APIs, and frontend Stocks view.
- **Changes**:
  - Added Supabase/PostgreSQL tables, migrations, and seed data for products, inventory batches, utang customers, and utang transactions.
  - Added Express/Drizzle routes for products, low-stock alerts, restock list, FIFO/expiry batches, and utang ledger/reminders.
  - Added an in-page Stocks view inside Inventory with low-stock quick deduct, restock list, expiry badges, and utang tracking.
  - Renamed Starter MVP entry to Stocks and moved its button beside the category filter.
- **Files**:
  - `server/db/schema.ts`
  - `server/db/seed.ts`
  - `server/db/migrations/0001_remarkable_starbolt.sql`
  - `server/db/migrations/0002_lucky_ma_gnuci.sql`
  - `server/routes/products.ts`
  - `server/routes/batches.ts`
  - `server/routes/utang.ts`
  - `server/app.ts`
  - `src/pages/InventoryPage.tsx`
  - `src/pages/StarterPage.tsx`
  - `Docs/backend-branch-plan.md`
  - `Docs/database-branch-plan.md`
  - `Docs/frontend-branch-plan.md`
- **Verification**: `npm run lint`, `npm run db:generate`, `npm run db:push`, `npm run db:seed`, backend API smoke tests, and `npm run build` passed.
- **Notes**: Branches created: `backup/pre-starter-20261125`, `feature/starter-database`, `feature/starter-backend`, and `feature/starter-frontend`.

---

## 3. Repository Structure

```text
Inventory/
{{STRUCTURE_TREE}}
```

## 4. Key Decisions

| Date | Decision | Rationale | Status |
|---|---|---|---|
| 2026-11-25 | {{DECISION}} | {{RATIONALE}} | Active |

## 5. Open Questions

- **{{QUESTION}}**
  - *Owner*: {{OWNER}}
  - *Next step*: {{NEXT_STEP}}

## 6. Verification

- [ ] {{CHECK_1}}
- [ ] {{CHECK_2}}

## 7. Commits

1. {{COMMIT_1}}
2. {{COMMIT_2}}

---

*Document progress at [Documentation-Main.md](../Documentation-Main.md) for workspace-level milestones.*
