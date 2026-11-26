---
Docs type: Operations Plan
Project: Inventory
Area: Supabase migrations, backups, and runtime checks
Status: Active
Last reviewed: 2026-11-26
---

# Supabase operations plan

## 1. Complete migration automation

- [ ] Ensure `.github/workflows/deploy-db-migrations.yml` is merged or pushed to `main`.
- [ ] Set `SUPABASE_DATABASE_URL` in GitHub repository Actions secrets to the Session pooler URL for the Supabase project. The secret's value cannot be inspected after saving.
- [ ] Confirm the Supabase Dashboard GitHub integration's **Deploy to production** migration option is disabled, leaving Drizzle as the only production migration path.
- [ ] Run the workflow from a commit that changes a matching path and confirm the migration step succeeds. The initial run should find the four already-applied migrations; future commits should apply only new migrations.

## 2. Recheck runtime connectivity

- [ ] Rotate the database password if that has not already been done, then replace the value in local `.env` and the Cloud Run secret.
- [ ] Verify the deployed backend can query the database from Cloud Run. A successful local connection does not prove Cloud Run network reachability.
- [ ] Use Direct connection only if Cloud Run has IPv6 connectivity or the project's IPv4 add-on; otherwise configure its runtime with Session pooler.

## 3. Establish backups

- [ ] Link the local Supabase CLI project using `supabase link --project-ref <project-ref>` when CLI authentication and the current database password are available.
- [ ] Create a repeatable logical export for schema and data with the Supabase CLI. The CLI backup flow uses Docker; see the [Supabase backup and restore guide](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).
- [ ] Store backup artifacts in encrypted storage outside the Git repository. Do not place data dumps in `supabase/` or commit them.
- [ ] Periodically restore a backup to a non-production project and verify the app schema and data.

Supabase's [backup guide](https://supabase.com/docs/guides/platform/backups) recommends regular exports for Free plan projects. Database dumps do not include objects stored through Supabase Storage; back those up separately if the app begins using Storage.

## 4. Keep migration history consistent

- Generate and review Drizzle migrations from `server/db/schema.ts`.
- Apply migrations through `npm run db:migrate` locally or through the GitHub Actions workflow on `main`.
- Do not run `db:push` or create parallel Supabase CLI migrations as routine production deployment steps.
