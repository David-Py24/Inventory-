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

## 2026-11-27 — Build the manual desktop-to-cloud snapshot path

- The desktop can package local SQLite tables into a preview, compare local counts with the hosted workspace's latest snapshot, and upload after a second confirmation. Uploads create append-only snapshots; earlier cloud copies are retained. The Vercel API uses a backup-only Express app, requires a server token of at least 32 characters, selects the workspace from server configuration, validates snapshot shape and size, and stores data in a Supabase table with RLS enabled and public roles revoked.
- The desktop Settings page accepts a hosted API URL and backup token for the current in-memory session; only the non-secret URL is remembered. Snapshots include local user records and password hashes. This is a one-client prototype credential model, not multi-user identity or continuous synchronization.
- The Vercel config now routes `/api/*` to the backup-only service and all other paths to the static Vite app; the new frontend route will take effect after redeployment. Its workspace/auth API still uses the local SQLite backend and is not part of this Vercel deployment; only the token-protected `/api/backup/cloud` endpoints are hosted. No service binding is required. Do not enable a Vercel authentication gate on the API deployment because the desktop client authenticates with the backup token rather than a Vercel browser session.
- The Vercel API service uses `build:vercel-api` to bundle its configured `server/index.ts` entrypoint, avoiding a second Vite build and avoiding the unrelated desktop server bundle during deployment.
- Local verification: `npm run build:vercel-api` and the existing desktop `server.ts` bundle command passed. The deployment config parses; Vercel redeployment and runtime checks remain pending.
- Applied pending migrations `0005`–`0008` to Supabase after confirming the affected workspace tables were empty and migration `0005` would backfill zero rows. Verified `workspace_backup_snapshots` exists, RLS is enabled, `anon`/`authenticated` cannot select it, and it contains zero snapshots. Use `npm run db:migrate:supabase` for future Supabase migrations; plain `db:migrate` reads `DATABASE_URL`.
- Configure `SUPABASE_DATABASE_URL`, `CLOUD_BACKUP_TOKEN`, and `CLOUD_BACKUP_WORKSPACE_ID` on the Vercel API service. The supplied Vercel log shows both service builds and deployment completed; no runtime request check, remote backup write, installer build, or device UI check was run.
- Verification: `npm run build`, `npm run lint`, and `git diff --check` passed. Vite emitted its existing config-loader and large-chunk warnings.

## 2026-11-27 — Run the offline API inside the desktop app

- Packaged/local Electron builds now start the Express API in the Electron runtime, serve the built UI over a loopback-only ephemeral port, and close the server on app exit. The desktop package now includes the bundled `server.js` entry point.
- The desktop SQLite database is stored in Electron's per-user app data folder so installations do not write into the install directory. Cloud backup remains a later follow-up.
- Verification: `npm run build`, `npm run lint`, and `git diff --check` passed. The Windows installer/package build and installed-device signup flow were not run.

## 2026-11-27 — Separate retail preferences and dashboard views

- Moved Sales and Inventory display and shortcut preferences out of General into their own Settings sidebar sections. Updated table visibility controls to use stable draft updates and immediate local feedback in each page’s View menu.
- Dashboard Overview now contains the sales and inventory cards; Budget contains Net Worth, Cash Flow, Left to Spend, and Debt Payoff.
- Verification: `npm run lint` and `git diff --check` passed. No application tests or visual checks were run.

## 2026-11-27 — Connect retail workflows and configurable tables

- Added a compact sale-status dropdown beside the channel filter, persisted sales and inventory field visibility, page-level display controls, and editable keyboard shortcuts. Inventory base and default selling units, aliases, and parent-product links are saved through the local SQLite workspace.
- Added row selection and multi-edit actions (sales channel and inventory category), with keyboard shortcuts to open records, focus search, and select rows. Dashboard and Reports now summarize and list sales alongside live inventory data from the shared app state.
- Extended the local SQLite schema to version 3 and cloud backup/restore mappings for selling units and user preferences. Existing workspaces are backed up before the additive schema upgrade. Generated Drizzle migration `0007_hard_wind_dancer.sql` for PostgreSQL; it has not been applied.
- Verification: `npm run lint` and `git diff --check` passed. No application tests or database migration apply were run.

## 2026-11-27 — Implement single-store retail ledger foundations

- Extended the local workspace inventory and sales model with retail selling prices, units, aliases, fractional quantities, cost snapshots, discounts, payment/source metadata, and transactional bulk-to-tingi conversion. Blank SKUs now receive deterministic generated identifiers. Existing SQLite files are snapshotted with `VACUUM INTO` before the additive retail startup migration.
- Added a local utang customer/transaction ledger, customer-backed credit sales, notebook CSV import that leaves live stock unchanged, and matching Supabase backup/restore fields.
- Added Drizzle migrations `0005_retail_ledger_extensions.sql` and `0006_fractional_product_stock.sql`. They were generated and reviewed but not applied to a database. The PostgreSQL `products`/batch subsystem remains separate pending explicit data mapping.
- Verification: `npm run lint` passed. No tests, migration apply, backup rehearsal, or restore drill were run.

## 2026-11-27 — Repair Electron prototype preview launch

- Made Electron resolve the project root relative to `electron/main.cjs`, so launching that entry file no longer points at an incorrect `electron/dist` folder.
- Updated the desktop preview launcher to reuse an active renderer server or start its own on port 8081 by default. Its Vite dependency cache and HMR port are isolated to avoid conflicts with another running preview.
- Verification: Electron script syntax checks passed. A local preview launch was attempted, but this environment could not open its localhost socket; startup also encountered a locked shared Vite cache, which motivated isolating the preview cache. Re-run `npm run desktop:preview` on the host to confirm the window opens.

## 2026-11-27 — Apply geometric warm-gold logo

- Replaced the prior temporary mark with the geometric symbol from the supplied inspiration image, excluding its sample text/tagline. Recolored it to muted warm gold (`#9E825E`) and used a dark olive app-icon background (`#262A21`).
- Configured electron-builder's Windows icon explicitly as `public/app-icon.ico` and set the Electron window/taskbar icon from the PNG packaged in `dist/`. Updated the browser favicon and shared `BrandLogo` asset.
- Verification: `npm run build` and `npx vite build --mode desktop` succeeded; confirmed the ICO contains sizes through 256×256 and the packaged desktop output includes `dist/app-icon.png`. `npm run desktop:build` reached electron-builder but could not finish because GitHub DNS was unavailable while fetching a Windows packaging dependency. Installer rebuild and Windows shell icon refresh are still required to see the new icon on the test PC.

## 2026-11-26 — Temporary app logo and icon

- Prepared the supplied logo as a clean transparent mark for the shared `BrandLogo` component and as a dark-backed PNG/ICO for the app and Windows installer. Added the site favicon link and wired the existing Electron Windows icon setting to the generated ICO.
- Verification: both `npm run build` and `npx vite build --mode desktop` succeeded. Both builds emitted the logo as a bundled asset. Installer generation and installed-app visual verification were not run.

## 2026-11-26 — Desktop release workflow

- Added a hot-reload Electron preview command that manages the development server lifecycle.
- Added a Windows NSIS build command with Electron-safe relative asset paths, deterministic installer naming, and interactive per-user install settings. Web build paths remain unchanged.
- Made automatic update check failures visible in stderr. A GitHub release feed, code signing, clean-machine install/upgrade verification, and end-to-end installer build remain release tasks.
- Verification: `npm run build` passed. `npm run desktop:build` reached electron-builder but could not download a packaging dependency because DNS/network access to GitHub is unavailable in this environment.

## 2026-11-26 — Fix Electron startup path error

- Removed the unsupported `gpuCache` app path override that caused the installed app to throw before creating its window. Kept Electron's writable cache override.
- Verification: `node --check electron/main.cjs` passed. Rebuilding the installer remains blocked because electron-builder cannot resolve GitHub to download its Windows packaging dependency, so the fix has not yet been verified in an installed build.

**Module**: Inventory  
**Role**: Main application  
**Focus Area**: Full-stack inventory management  
**Stack**: React, TypeScript, Vite, Express, Drizzle, PostgreSQL

---

## 1. Scope & Purpose

Inventory web application: React frontend (src/) and Express/Drizzle backend (server/).

---

## 2. Progress Log

### `2026-11-26` — Align Supabase schema with cloud backup

- **Action**: Investigated the backup failure shown in the app and prepared the missing Drizzle schema migration.
- **Finding**: Supabase `public.users` lacked `username`; the backup schema also expects a `sales` table that was absent. This explains the failed upsert after the database connectivity check passed.
- **Changes**: Generated `0004_add_backup_username_and_sales.sql`; added an explicit `db:migrate:supabase` command/config; changed server errors to avoid returning SQL parameters or password hashes to the UI.
- **Verification**: Read-only Supabase metadata confirmed the missing column/table before migration and their presence afterward. `npm run lint` passed; Drizzle migration `0004` applied successfully and the ledger advanced to five entries. No backup/restore write was performed; Supabase `public.users` remains empty until the next cloud backup.

### `2026-11-26` — Separate cloud backup connection from local PostgreSQL

- **Action**: Routed cloud backup, restore, and online-account cloud lookups through the dedicated `SUPABASE_DATABASE_URL` setting. The general `DATABASE_URL` remains available to existing backend routes.
- **Reason**: The local `.env` configured `DATABASE_URL` for `localhost:5432/tallyledger`, so the backup code could reach a local PostgreSQL database while the Supabase dashboard remained empty.
- **Changes**: Added a lazy Supabase Drizzle client, updated backup status to identify Supabase configuration/reachability accurately, and documented a safe pooler URL placeholder in `.env.example`.
- **Verification**: Read-only inspection found 2 local SQLite users and 6 rows in the reachable local PostgreSQL `public.users`; the local configuration has no `SUPABASE_DATABASE_URL`. `npm run lint` passed. No remote Supabase writes or app tests were run.

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
