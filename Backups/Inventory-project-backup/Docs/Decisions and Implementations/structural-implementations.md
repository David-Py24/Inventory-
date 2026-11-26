# Structural Implementations

## Branches

- `backup/pre-starter-20261125`: backup of the pre-scaffold state.
- `feature/starter-database`: Supabase/PostgreSQL schema, migrations, and seed data.
- `feature/starter-backend`: Express/Drizzle APIs for starter MVP priorities.
- `feature/starter-frontend`: React Stocks view integrated into Inventory.

## Database

Tables:
- `products`
- `inventory_batches`
- `utang_customers`
- `utang_transactions`

Migrations:
- `server/db/migrations/0001_remarkable_starbolt.sql`
- `server/db/migrations/0002_lucky_ma_gnuci.sql`

## Backend

Registered routers:
- `/api/products`
- `/api/batches`
- `/api/utang`

Key endpoints:
- `GET /api/products/low-stock`
- `GET /api/products/restock-list`
- `POST /api/batches/mark-restocked`
- `GET /api/batches/expiring`
- `GET /api/batches/fifo/:productId`
- `GET/POST/PATCH/DELETE /api/utang/customers`
- `POST /api/utang/customers/:id/transactions`
- `GET /api/utang/customers/:id/reminder`

## Frontend

- Starter MVP UI is combined into `src/pages/InventoryPage.tsx` as the Stocks view.
- `src/pages/StarterPage.tsx` remains the reusable Stocks component.
- Navigation uses an in-page toggle instead of a separate route.
