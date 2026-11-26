---
Docs type: Architecture Decision Record
Project: Inventory
Area: Supabase and database migrations
Status: Active
Last reviewed: 2026-11-26
---

# Supabase and database decisions

## Keep Drizzle as the schema authority

- **Decision:** Define application tables in `server/db/schema.ts` and keep versioned migrations in `server/db/migrations/`.
- **Apply locally or in CI:** Use `npm run db:migrate`.
- **Production automation:** `.github/workflows/deploy-db-migrations.yml` runs on relevant pushes to `main` and reads the `SUPABASE_DATABASE_URL` GitHub repository secret.
- **Why:** The application already uses Drizzle and `postgres.js`; one migration history avoids schema drift between Drizzle and Supabase CLI migrations.

## Keep the Supabase CLI folder for project tooling

The root `supabase/` directory contains CLI configuration for linking and backup tasks. Its `db.migrations` and `db.seed` settings are disabled. Do not add a second set of deployable migrations there unless the team deliberately changes the migration source of truth.

The Supabase Dashboard GitHub integration's **Deploy to production** migration path should stay off while Drizzle migrations are deployed by GitHub Actions.

## Separate runtime and CI connection strings

- The backend reads `DATABASE_URL` from its runtime environment.
- GitHub Actions reads `SUPABASE_DATABASE_URL` from repository secrets.
- Use Direct connection only where the runtime has IPv6 or the Supabase IPv4 add-on. Use Session pooler for IPv4-only environments, including standard GitHub-hosted runners.

## Keep credentials and backups out of source

- Keep database passwords and Supabase secret keys in ignored local `.env` files or managed secrets.
- Keep `.env.example` values as placeholders for passwords and secret keys.
- Do not commit database dumps; they may contain customer and operational data.
- Keep Row Level Security enabled. The Express backend accesses Postgres server-side; browser clients should not receive a database password or secret key.

## Related implementation

See [Supabase database implementation](supabase-database-implementation.md) and [Supabase operations plan](supabase-operations-plan.md).
