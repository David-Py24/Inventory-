# Decision records

## 2026-11-27 — Expose the Vite app and backup API on Vercel

- **Decision:** Route `/api/*` to the backup API service and all remaining public paths to the static Vite app in the Vercel Services deployment.
- **Reason:** Services are private unless exposed by top-level rewrites; the supplied successful build had no route for the app service.
- **Consequences:** After redeploying this config, the website shell will be reachable on the deployment domain. Workspace/auth routes still require a hosted persistent backend; Vercel currently hosts only the token-protected cloud backup API. Verify runtime requests after redeploying.
- **Status:** Active for the Vercel deployment

## 2026-11-27 — Keep desktop cloud backup manual and append-only

- **Decision:** Upload a reviewed local SQLite snapshot to the configured cloud workspace only after explicit confirmation. Keep snapshots append-only and do not enable background synchronization. The hosted backup API uses a manually provisioned long token; Supabase credentials remain server-side.
- **Reason:** Desktop accounts are local and are not cloud identities yet. A reviewed, append-only snapshot avoids merging with unrelated rows or losing prior cloud copies.
- **Consequences:** Configure the hosted API URL in the desktop and provision its token/workspace ID on Vercel. Replace this one-client credential model with per-user/workspace authorization before broader use.
- **Status:** Active for the prototype

## 2026-11-27 — Use the Supabase-specific Drizzle config for cloud migrations

- **Decision:** Apply Supabase migrations with `npm run db:migrate:supabase`, which explicitly loads `drizzle.supabase.config.ts`; keep `db:migrate` for the `DATABASE_URL` target.
- **Reason:** The workspace has separate general and Supabase database URLs, and the default Drizzle command does not infer the cloud target.
- **Consequences:** Check the selected database target before applying migrations; use the explicit Supabase script for cloud schema changes.
- **Status:** Active

## 2026-11-27 — Bundle the local API runtime with desktop builds

- **Decision:** Electron builds without an external renderer URL start the Express API in-process and serve the built UI from a loopback-only ephemeral port. Keep operational data in SQLite under Electron's per-user app data directory.
- **Reason:** Offline signup and workspace requests use the local API; a file-loaded renderer has no API server to receive them.
- **Consequences:** Include the generated `server.js` bundle in the desktop package. Hosted backup/sync is a separate later milestone.
- **Status:** Active for offline desktop prototyping

Add newest decisions at the top using the template. Mark a decision superseded when it changes; preserve the earlier rationale for traceability.

## 2026-11-27 — Keep retail workspace operations SQLite-first

- **Decision:** The main retail workspace continues to read and write its operational inventory, sales, and utang ledger in local SQLite. Drizzle PostgreSQL mirrors those records through the existing backup/restore path. Extend the active `inventory_items` model rather than silently merging it with PostgreSQL `products`.
- **Reason:** The main Inventory and Sales pages use SQLite workspace routes. PostgreSQL `products` and `inventory_batches` are a separate existing subsystem with different consumers and data; merging them without an explicit mapping could overwrite or orphan records.
- **Consequences:** The app gains retail price/unit/SKU fields, fractional quantities, sale snapshots, archive imports, and local credit-ledger support. Existing SQLite files are snapshotted before the additive startup migration. PostgreSQL `products` remains separate until its consumers and data are mapped. Multi-store RLS and continuous outbox sync remain deferred. Apply Drizzle migrations `0005` and `0006` before using extended cloud backup/restore fields.
- **Status:** Active for the single-store retail milestone

## 2026-11-26 — Use a dedicated Supabase connection for cloud backups

- **Decision:** Cloud backup, restore, reachability checks, and cloud-account lookups use `SUPABASE_DATABASE_URL`; `DATABASE_URL` remains the app's general PostgreSQL connection.
- **Reason:** Local development may point `DATABASE_URL` at a local PostgreSQL service. Treating any reachable PostgreSQL server as Supabase can make backup status appear healthy while writing to the wrong database.
- **Consequences:** Configure the Supabase Session Pooler URL as `SUPABASE_DATABASE_URL` in each runtime that offers cloud backup. Keep its value out of source control. Apply the Drizzle migrations to Supabase before backup/restore; existing installs without this value report Supabase as unconfigured and cannot use cloud backup until configured.
- **Status:** Active

## 2026-11-25 — Apply Supabase schema through Drizzle migrations

- **Decision:** Manage the app's Supabase PostgreSQL schema through versioned Drizzle migrations, applying them with `npm run db:migrate` locally and from GitHub Actions on `main`.
- **Reason:** This keeps the deployed schema traceable to the repository and repeatable across environments.
- **Consequences:** Generate and review migrations before applying them; add the Session pooler connection as the `SUPABASE_DATABASE_URL` GitHub repository secret because standard GitHub-hosted runners use IPv4. Use `db:push` only for deliberate schema push workflows, not routine deployment.
- **Status:** Active

## 2026-11-25 — Use Supabase/PostgreSQL with branch-per-feature workflow

- **Decision:** Use Supabase/PostgreSQL (not local SQLite) for Inventory Starter MVP and pair DB/backend/frontend branches.
- **Reason:** Team chose Supabase for managed Postgres and easier shared environments; branch isolation reduces migration risk.
- **Consequences:** Guardrails shift from zero-cloud to managed-cloud; migrations must be applied per branch and reviewed before merge.
- **Status:** Superseded for daily retail workspace operations by the 2026-11-27 SQLite-first decision; PostgreSQL remains the cloud mirror and separate batch subsystem.

## 2026-11-25 — {{DECISION_TITLE}}

- **Decision:** {{DECISION_STATEMENT}}
- **Reason:** {{REASON}}
- **Consequences:** {{CONSEQUENCES}}
- **Status:** Active
