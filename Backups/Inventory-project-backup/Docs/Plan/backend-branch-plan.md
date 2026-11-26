# Backend Branch Plan

**Branch:** `feature/starter-backend`  
**Base:** `master` (after stashing/committing current work)  
**Scope:** Express/Drizzle API and business rules for Inventory Starter MVP.

## Includes
- Auth endpoints and user CRUD already in `server/`
- Starter domain services: low-stock alerts, restock list, expiry/FIFO helpers, utang ledger
- API routes under `/api/*`
- Input validation and error handling

## Excludes
- Frontend UI changes
- Database provisioning details
- Cloud-only features (no SMS gateways, no multi-branch auth)

## Merge Notes
- Keep API contracts backward compatible
- Run `npm run lint` and route smoke tests before PR
- Merge after Database branch schema is stable
