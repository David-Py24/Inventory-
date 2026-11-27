# 04 — Database Restructuring Planning Review

**Review date:** 2026-11-27  
**Status:** Planning review; proposed architecture is not yet an implementation decision

## Summary

The retail direction is a plausible extension of TallyLedger, and the architecture notes correctly favor additive Drizzle migrations and defer multi-store sync. The proposal is not yet ready to implement as written. Several details conflict with the current schema or make guarantees that the current implementation and evidence do not support.

The current application already has local SQLite, Drizzle-managed PostgreSQL, and Supabase backup/restore. Its source of truth for database definitions is `server/db/schema.ts`; migrations live in `server/db/migrations/`. Existing retail-adjacent tables include `products`, `inventory_batches`, `utang_customers`, `utang_transactions`, and `sales`. The work should extend and reconcile these models rather than introduce a parallel schema.

## Findings to resolve

### 1. Confirm scope and architecture

- Confirm that the target is a retail POS for sari-sari stores and related verticals, rather than the broader financial workspace described by parts of the existing app.
- Milestone 1's proposed SQLite plus scheduled/manual cloud backup model matches the current topology better than the original always-on outbox proposal. Keep `sync_outbox` deferred until multi-device/LAN replication is a concrete requirement.
- Define which database is authoritative during ordinary use and how backup/restore handles changes made independently in local SQLite and cloud PostgreSQL.

### 2. Reconcile the existing schema before adding fields

- `products` and `inventory_items` currently coexist. The planning decision to standardize on `products` needs an explicit mapping for current UI/API consumers and existing rows before retiring or sidelining `inventory_items`.
- Existing utang uses `utang_customers` and `utang_transactions`; the new `customers` and `credit_payments` proposal would duplicate that domain unless the plan explicitly maps or replaces it.
- Existing `sales` stores one product line per row today, but the documents should state whether an order can contain multiple lines and how `order_number`/receipt grouping works.
- The proposed `stock_qty` name in SQL examples does not match the current `products.current_qty` field. Keep migration examples aligned with the actual Drizzle table and choose one canonical name.

### 3. Define sales and credit accounting

- Specify the calculation for line total, discount, amount due, and amount paid, including rounding and partial payment allocation.
- Define how voids, refunds, and corrections affect inventory and credit history. Preserve an auditable history rather than deleting completed records.
- Treat a stored customer balance as a cache if `utang_transactions` is the ledger of record; define how the cache is reconciled and repaired.
- Add constraints or service-level validation for positive quantities/prices, payment limits, and valid status transitions.

### 4. Tighten units and stock handling

- The unit catalog is inconsistent: the vertical overview includes `tray` and `ream`, while the schema list omits them. Choose and document the supported unit set.
- Define `conversion_factor` direction and whether it converts parent units to child units. Ensure product identity and unit pricing remain unambiguous when a bulk product is repacked.
- Run break-pack updates in a transaction, verify both product rows exist, check sufficient parent stock, and fail/rollback if either update does not affect exactly one row.
- Decide whether stock quantities must be integers or can be fractional, then align Drizzle, SQLite, validation, and UI types.

### 5. Bound the migration and cutover

- Keep the migration additive and reversible where practical. Before any destructive cleanup, take and verify a local SQLite backup and a PostgreSQL dump; document restore steps and a rollback point.
- Backfill new non-null columns before enforcing `NOT NULL`. In particular, `unit_price` cannot simply be added as non-null without a defined value for existing sales rows.
- Inventory a representative local database and cloud database to determine which records, if any, need mapping. Do not assume testing data is disposable.
- Separate schema migration from physical stock cutover and notebook ingestion. Each needs its own validation/reconciliation procedure.

### 6. Validate backup claims and guarantees

- Describe WAL as a durability/performance mode, not a guarantee of zero corruption or sub-5ms writes. Treat performance and recovery times as targets to measure on the intended counter hardware.
- `VACUUM INTO` can create a consistent SQLite snapshot, but the operational plan still needs error handling, destination-space checks, retention verification, and restore drills.
- The topology currently mixes full database archives, a PostgreSQL mirror, and weekly summaries. State which data each tier contains, how often it is refreshed, and the maximum acceptable data-loss window.
- Verify current Supabase plan quotas and inactivity behavior before using the capacity and pause statements as planning assumptions. Do not rely on writing a summary row as a substitute for checking the service's current policy.
- Keep backups containing customer or transaction information private, access-controlled, and excluded from source control.

## Recommended next planning sequence

1. Confirm retail MVP scope and single-store deployment assumptions.
2. Produce a table-by-table mapping from current Drizzle tables to the intended retail model, including consumers and data backfills.
3. Finalize rules for sale lines, units/conversions, inventory adjustments, and utang/payment accounting.
4. Choose migration and rollback steps using representative SQLite and PostgreSQL data.
5. Specify backup retention, recovery objectives, and a restore drill; verify performance and hosted-service assumptions separately.
6. Only then implement the reviewed Drizzle schema changes and generated migration.

## Review boundary

This document records planning feedback only. It does not approve a destructive reset, select a production rollout date, or authorize changes to the application schema. No code, migrations, or data were changed as part of this review.
