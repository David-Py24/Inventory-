# Decision records

Add newest decisions at the top using the template. Mark a decision superseded when it changes; preserve the earlier rationale for traceability.

## 2026-11-25 — Apply Supabase schema through Drizzle migrations

- **Decision:** Manage the app's Supabase PostgreSQL schema through versioned Drizzle migrations, applying them with `npm run db:migrate` locally and from GitHub Actions on `main`.
- **Reason:** This keeps the deployed schema traceable to the repository and repeatable across environments.
- **Consequences:** Generate and review migrations before applying them; add the Session pooler connection as the `SUPABASE_DATABASE_URL` GitHub repository secret because standard GitHub-hosted runners use IPv4. Use `db:push` only for deliberate schema push workflows, not routine deployment.
- **Status:** Active

## 2026-11-25 — Use Supabase/PostgreSQL with branch-per-feature workflow

- **Decision:** Use Supabase/PostgreSQL (not local SQLite) for Inventory Starter MVP and pair DB/backend/frontend branches.
- **Reason:** Team chose Supabase for managed Postgres and easier shared environments; branch isolation reduces migration risk.
- **Consequences:** Guardrails shift from zero-cloud to managed-cloud; migrations must be applied per branch and reviewed before merge.
- **Status:** Active

## 2026-11-25 — {{DECISION_TITLE}}

- **Decision:** {{DECISION_STATEMENT}}
- **Reason:** {{REASON}}
- **Consequences:** {{CONSEQUENCES}}
- **Status:** Active
