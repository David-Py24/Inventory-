# Database Branch Plan

**Branch:** `feature/starter-database`  
**Base:** `master` (after stashing/committing current work)  
**Scope:** Supabase/PostgreSQL schema, migrations, seed data, and backup strategy.

## Includes
- Tables: `products`, `inventory_batches`, `utang_customers`, `utang_transactions`
- Drizzle schema and generated migrations
- Demo seed data for starter MVP
- Export/import backup procedure

## Excludes
- Frontend UI changes
- Backend route implementation details
- Production data migration from existing app

## Merge Notes
- One database branch per feature branch
- Apply migrations in Supabase branch first
- Validate with `npm run db:push` / `npm run db:studio` before PR
- Keep local-first guardrails unless product decision changes
