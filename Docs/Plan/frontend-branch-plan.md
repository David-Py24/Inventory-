# Frontend Branch Plan

**Branch:** `feature/starter-frontend`  
**Base:** `master` (after stashing/committing current work)  
**Scope:** React UI for Inventory Starter MVP closing routine.

## Includes
- Low-stock alert banner and quick-deduct mode
- Restock shopping list view
- Expiration/FIFO status badges
- Utang customer ledger UI
- Mobile closing flow refinements

## Excludes
- Backend API implementation
- Database schema changes
- Replacement of core app shell/navigation on `main`

## Merge Notes
- Keep `main` deployable and stable
- Use feature flags for incomplete flows
- Merge only after backend and database branches are stable
- Run `npm run lint` and manual smoke test before PR
