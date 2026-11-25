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

**Module**: Inventory  
**Role**: Main application  
**Focus Area**: Full-stack inventory management  
**Stack**: React, TypeScript, Vite, Express, Drizzle, PostgreSQL

---

## 1. Scope & Purpose

Inventory web application: React frontend (src/) and Express/Drizzle backend (server/).

---

## 2. Progress Log

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
