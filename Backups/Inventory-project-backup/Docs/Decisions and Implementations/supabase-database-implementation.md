---
Docs type: Implementation Record
Project: Inventory
Area: Supabase and database migrations
Status: In progress
Last reviewed: 2026-11-26
---

# Supabase database implementation

## Current architecture

The Express backend uses Drizzle ORM with `postgres.js`. `server/db/client.ts` reads `DATABASE_URL`; routes in `server/routes/` use the shared Drizzle client. The app does not currently use `@supabase/server` for database queries.

The authoritative table definitions and migrations are:

- Schema: `server/db/schema.ts`
- Migration configuration: `drizzle.config.ts`
- Migration files: `server/db/migrations/`
- Migration command: `npm run db:migrate`

## Supabase database state

- Four checked-in Drizzle migrations were applied to the connected Supabase project.
- The public schema contains 13 application tables: `accounts`, `goals`, `inventory_batches`, `inventory_items`, `monthly_cash_flow`, `products`, `sinking_funds`, `transactions`, `upcoming_bills`, `users`, `utang_customers`, `utang_transactions`, and `workspace_settings`.
- Row Level Security was enabled on all 13 tables. At verification time, `anon` and `authenticated` had no direct `SELECT` permission.
- No seed data was inserted.

## Migration automation

`.github/workflows/deploy-db-migrations.yml` installs dependencies and runs `npm run db:migrate` on pushes to `main` when migration, Drizzle configuration, or dependency files change. Both workflow steps read `SUPABASE_DATABASE_URL` from GitHub repository secrets. The workflow has not yet been verified by a GitHub Actions run.

Use a Session pooler connection string for this secret on standard GitHub-hosted runners, which support IPv4. Direct connections require IPv6 unless the project has the IPv4 add-on. The app runtime may use a different connection string appropriate to its hosting network.

## Supabase CLI configuration

The root `supabase/` directory was initialized with the Supabase CLI. `supabase/config.toml` identifies the project and disables CLI migrations and seeding so Drizzle remains the sole migration system. The folder is not yet linked with an authenticated Supabase CLI session, and no backup dump has been created.

## Verification record

- A read-only `SELECT 1` succeeded through the direct database connection from the development machine before the latest credential update; retest using the current local `.env` value.
- The migration command completed successfully; a read-only check confirmed 13 tables and four migration records.
- Production Cloud Run connectivity and the GitHub Actions workflow have not been verified from their respective runtimes.

## Credential handling

Use placeholders in `.env.example`. Store actual database URLs only in ignored local `.env` files, GitHub Actions secrets, or deployment secrets. Do not paste credentials into source files, documentation, screenshots, or logs.
