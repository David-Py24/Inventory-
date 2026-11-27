# Decision records

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
