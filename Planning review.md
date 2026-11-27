## Planning review

I reviewed the three documents in `Docs/Research/Database-restructing/` against the current Drizzle schema, SQLite setup, and Supabase implementation notes. **The proposal has useful retail requirements, but it is not ready to use as an implementation plan.** It describes a different architecture from the app’s current one and combines several large changes that should be decided and planned separately.

### What fits the current app

- The app already has local SQLite, a PostgreSQL schema managed by Drizzle migrations, and a Supabase backup/restore path. So SQLite plus Postgres is not entirely new.
- The existing schema already includes products, sales, inventory batches, and utang customers and transactions. The proposed domain features would extend existing concepts, not start from scratch.
- Selling prices, cost snapshots, fractional quantities, product aliases, and historical sales imports are reasonable requirements to assess for the retail MVP.

The current implementation and decisions are documented in [supabase-database-implementation.md](/C:/Users/Ghing/Documents/Inventory/Docs/Decisions and Implementations/supabase-database-implementation.md) and the schema is in [server/db/schema.ts](/C:/Users/Ghing/Documents/Inventory/server/db/schema.ts).

### Decisions to make before designing migrations

1. **Confirm the target product and users.** The proposal assumes a sari-sari store and related retail businesses. Confirm that this is the intended direction for the current TallyLedger app before replacing or expanding its existing financial-workspace model.
2. **Choose the data-flow model.** The app currently uses local SQLite with cloud backup/restore. The proposal adds an outbox and ongoing counter-to-cloud sync. Those are different operational models with different conflict, retry, and recovery requirements.
3. **Define the sales and credit model.** Decide whether sales are one row per item or have a sale header with multiple line items, how payments apply to sales, and how balances are derived. The proposed `current_balance` duplicates information that could also be derived from sales and payments.
4. **Scope multi-store access.** The proposal adds `store_id` and RLS, but the app’s current direct database connection does not establish an authenticated Supabase user context for those policies. Tenant isolation needs an end-to-end design, not just policies in the DDL.
5. **Plan data migration and cutover.** The proposed “clean reset” could discard useful local and cloud data. Inventory, sales, and utang records need an explicit export, mapping, reconciliation, backup, and rollback plan before any reset or migration.

### Issues to resolve in the draft

- The SQLite schema, PostgreSQL schema, and TypeScript interfaces use different names, enums, and nullability. Define one canonical contract and generate or validate each layer against it.
- Unit conversions need explicit direction and stock rules. The break-pack example should check available stock and prevent invalid or negative inventory changes.
- The sales model needs to clarify discounts, refunds/voids, payment allocation, and whether `total_amount` can be represented as quantity × unit price alone.
- The backup section mixes database snapshots, ongoing sync, and summary replication. Specify which copy is authoritative, how restores work, and how the outbox stays consistent with database writes.
- Claims about recovery time, storage limits, write speed, and long-term retention need measurement or verification; treat them as targets, not guarantees.

### Suggested planning order

1. Confirm retail scope and deployment model.
2. Write the domain decisions for products, units, sales, payments, and historical imports.
3. Map existing tables and data to the proposed model; identify what is preserved, transformed, or retired.
4. Decide whether the first milestone is a schema extension on the existing backup/restore architecture or a separately planned offline-sync redesign.
5. Produce reviewed migrations and a reversible cutover plan before changing data.

I made **no file changes**. This was a planning review; I did not run tests or apply migrations.