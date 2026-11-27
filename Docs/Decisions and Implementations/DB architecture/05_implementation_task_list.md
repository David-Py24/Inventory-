# 05 — Retail Database Restructuring Task List

**Date:** 2026-11-27  
**Status:** Implementation in progress
**Scope:** Single-store retail MVP on the existing local SQLite + Drizzle/PostgreSQL + Supabase backup/restore architecture

## Delivery rules

- Keep `server/db/schema.ts` and checked-in Drizzle migrations as the schema authority.
- Extend existing tables and services; do not create parallel product, customer, sales, or payment models without an approved mapping decision.
- Preserve existing user data. No table drops or clean resets as part of this work.
- Keep `sync_outbox`, multi-store RLS, LAN replication, and NAS relay outside this milestone.
- Generate and review migrations before applying them to any shared or hosted database.

## Progress snapshot — 2026-11-27

| Task | Status | Notes |
|---|---|---|
| DB-01 | Complete | Confirmed SQLite workspace routes are operational inventory/sales source; PostgreSQL `products`/batches is a separate path. |
| DB-02 | Partial | Units, conversion direction, line math, and credit limits are implemented. Refund allocation and sale-to-payment allocation remain open. |
| DB-03 | Complete for this implementation | Schema extensions match the active `inventory_items` and `sales` tables. PostgreSQL `products` is preserved as a separate existing subsystem. |
| DB-04 | Complete | Drizzle schema and local SQLite startup migrations are implemented. |
| DB-05 | Complete | Additive Drizzle migrations `0005` and `0006` were generated and reviewed; neither has been applied to a shared database. |
| DB-06 | Partial | Main workspace now uses the extended local inventory catalog. A physical merge with PostgreSQL `products` remains deferred pending data/consumer mapping. |
| DB-07 | Complete for workspace inventory | Fractional stock, non-negative adjustments, and transactional break-pack are implemented locally. |
| DB-08 | Partial | Live/archive sale fields and stock snapshots are implemented. Refund flow and credit-sale financial edits remain restricted pending allocation rules. |
| DB-09 | Partial | Utang is ledger-backed locally and included in backup/restore. Credit sales add charges; repayments are customer-ledger entries and are not allocated to individual sales. |
| DB-10 | Partial | Notebook CSV import supports the four core fields, name/alias matching, deterministic SKU generation, and no-stock archive rows. Saved mapping profiles and import preview are not yet connected. |
| DB-11 | Partial | Existing SQLite databases will be snapshotted before the local additive startup migration; no rehearsal was run against representative local and cloud data. |
| DB-12 | Pending | Migrations have not been applied to local PostgreSQL or Supabase. |
| DB-13 | Partial | Backup/restore field mappings are implemented. Schedule, retention, and restore drill remain operational work. |

## Phase 0 — Establish the current-state baseline

### DB-01: Inventory the authoritative runtime and data paths

- **Work:** Trace current SQLite and PostgreSQL schemas, migrations, routes, and backup/restore behavior for products, inventory, sales, and utang. Identify which database is used by each runtime and how local/cloud divergence is handled.
- **Primary locations:** `server/db/schema.ts`, `server/db/sqlite.ts`, `server/db/syncService.ts`, `server/routes/`, `server/db/migrations/`.
- **Depends on:** None.
- **Acceptance:** A reviewed table/field/consumer mapping is recorded; differences between SQLite and PostgreSQL and any existing data that needs conversion are listed.

### DB-02: Define the retail domain contract

- **Work:** Finalize supported business types and units; quantity precision; parent-to-child conversion semantics; sale line and receipt grouping; discount and payment calculations; allowed status transitions; refund/void behavior; and the utang ledger/balance rule.
- **Primary location:** `Docs/Decisions and Implementations/DB architecture/`.
- **Depends on:** DB-01.
- **Acceptance:** Terms, fields, calculations, and validation rules agree across the architecture and schema-extension documents. Existing `utang_transactions` is explicitly reconciled with the proposed payment flow.

## Phase 1 — Extend the database safely

### DB-03: Design additive Drizzle schema extensions

- **Work:** Update the schema extension proposal to match actual table and column names. Decide fields for `workspace_settings`, `products`, `sales`, and any required existing ledger tables. Define SQLite/PostgreSQL types, defaults, nullability, indexes, and constraints.
- **Depends on:** DB-01, DB-02.
- **Acceptance:** The proposed schema uses canonical names (including `current_qty` unless an explicit rename is planned), contains no duplicate customer/payment domain, and has a documented backfill for every new non-null field.

### DB-04: Implement and review Drizzle schema changes

- **Work:** Implement the approved additions in `server/db/schema.ts`; retain single-store behavior. Do not add multi-store RLS or outbox synchronization in this phase.
- **Depends on:** DB-03.
- **Acceptance:** Schema types match the finalized domain contract, existing rows remain valid, and `npm run lint` passes.

### DB-05: Generate the additive migration and rollback notes

- **Work:** Generate the next Drizzle migration (expected sequence: `0005`), review SQL for safe defaults/backfills, and document rollback/recovery steps.
- **Depends on:** DB-04.
- **Acceptance:** Migration is checked in with Drizzle metadata, contains no unintended destructive operations, and has a clear recovery procedure for partial application.

## Phase 2 — Implement retail inventory and sales behavior

### DB-06: Consolidate product access on the selected model

- **Work:** Route retail product reads/writes through the selected canonical product model. Map any required `inventory_items` data and consumers; do not remove the legacy table until its usage and data are accounted for.
- **Depends on:** DB-05.
- **Acceptance:** Existing product and inventory screens/API behavior remain usable; SKU uniqueness and generated-SKU rules are enforced consistently.

### DB-07: Add unit-aware inventory operations

- **Work:** Implement product unit fields and atomic break-pack adjustments with stock checks. Keep parent decrement and child increment in one transaction, and reject missing rows or insufficient stock.
- **Depends on:** DB-06.
- **Acceptance:** Valid conversions change stock by the documented factor; invalid or partial conversions roll back without changing either product.

### DB-08: Record sales with historical price and cost

- **Work:** Extend sale creation to record unit, quantity, selling price, cost snapshot, discount, amount paid, source, and stock-deduction behavior. Define item/receipt grouping and persist changes transactionally with inventory effects.
- **Depends on:** DB-02, DB-05, DB-06, DB-07.
- **Acceptance:** A sale preserves the price and cost used at sale time; totals reconcile with the documented rounding rules; archive sales do not change current stock; live sale failure cannot leave a partial ledger update.

### DB-09: Integrate credit and payments with the existing utang ledger

- **Work:** Implement credit sale and repayment writes using `utang_customers` and `utang_transactions` or the approved replacement mapping. Avoid independently maintained balances without a reconciliation rule.
- **Depends on:** DB-02, DB-05, DB-08.
- **Acceptance:** Charges and repayments are auditable, partial payments reconcile, invalid overpayments/status transitions are rejected according to the approved rules, and customer balances can be recomputed from the ledger.

## Phase 3 — Imports and operational cutover

### DB-10: Build a staged CSV/notebook import path

- **Work:** Parse mapped columns into a reviewable staging format; validate dates, quantities, product matches, and sales totals; resolve products by canonical name/alias; generate deterministic synthetic SKUs only when needed.
- **Depends on:** DB-02, DB-06, DB-08.
- **Acceptance:** Invalid rows are reported without partial import; duplicate/re-run behavior is deterministic; imported archive rows are marked as historical and cannot deduct current stock.

### DB-11: Prepare and rehearse the inventory cutover

- **Work:** Document/export any needed test records, take and verify SQLite and PostgreSQL backups, perform a physical opening-stock count, and rehearse migration and restore on non-production data.
- **Depends on:** DB-05 through DB-10 as applicable.
- **Acceptance:** Rehearsal records pre/post counts, reconciliation results, rollback trigger, and restore steps. No production or user data is reset as part of rehearsal.

### DB-12: Verify and deploy the migration

- **Work:** Apply migration to a disposable/local database, verify retained data and defaults, then follow the established reviewed deployment path for Supabase.
- **Depends on:** DB-11.
- **Acceptance:** Local migration and schema checks pass; hosted migration completion and schema alignment are confirmed before enabling dependent app behavior.

### DB-13: Define backup and recovery operations

- **Work:** Specify snapshot frequency, retention, access controls, destination checks, failure reporting, restore procedure, and recovery objectives for the existing SQLite/Supabase topology. Treat NAS relay and full archive upload as future scope unless separately approved.
- **Depends on:** DB-01, DB-11.
- **Acceptance:** A restore drill succeeds from a retained backup; backup claims are measured or documented as targets, and current hosted-service quotas/policies are verified before being used in capacity planning.

## Deferred milestone — Multi-device and multi-store

Do not start these tasks as part of the single-store MVP:

- Add authenticated tenant identity and enforce access boundaries end to end.
- Design conflict handling and introduce transactional outbox replication for multiple devices.
- Define local hub/NAS relay, cloud archive format, retention, and disaster recovery for that topology.

These require a separate architecture review and explicit acceptance criteria.

## Completion gate

The retail database milestone is complete when DB-01 through DB-13 are either accepted or explicitly marked out of scope with a documented reason, the migration is applied to the intended environment, existing records are reconciled, and the backup/restore procedure has been rehearsed. No destructive reset is implied by this task list.
