# 01 — TallyLedger Retail Architecture, Scope & Planning Decisions

## 1. Executive Summary & Architectural Alignment

TallyLedger is transitioning from a general-purpose financial/equipment tracking template to a **local-first, offline-capable retail POS and inventory ledger** engineered for Philippine micro-enterprises, specifically **Sari-Sari Stores** and their direct operational twins.

Rather than tearing down existing database structures or prematurely introducing multi-tenant cloud sync complexity, this specification establishes a **phased, additive migration path** built on the project's existing authoritative **Drizzle ORM** (`server/db/schema.ts`) and local SQLite + Supabase backup/restore pipeline.

### Core Architectural Principles

- **Edge-first reliability:** The counter terminal's local database (SQLite in `WAL` mode) is the operational source of truth for offline checkout. Checkout latency and power-loss recovery remain targets to measure on the intended hardware; WAL mode is not a zero-corruption guarantee.
- **Drizzle as sole schema authority:** All PostgreSQL and SQLite table definitions, constraints, and migrations stay managed through `server/db/schema.ts` and `npm run db:migrate`, keeping Supabase CLI migrations disabled.
- **Milestone-based evolution:**
  - **Milestone 1 (current focus):** Single-store retail extension on top of existing Drizzle tables (`products`, `inventory_batches`, `utang_customers`, `utang_transactions`) using the existing cloud backup/restore model.
  - **Milestone 2 (future scale):** Multi-store isolation (`store_id` + Supabase Auth RLS) and asynchronous `sync_outbox` replication across secondary stores or a local NAS.

---

## 2. Target Business Verticals ("Direct Twins")

All five retail verticals share the same operational DNA: **high unbarcoded/repacked SKU counts, fractional (*tingi*) unit conversions, informal customer credit (*utang*), and fast counter logging**.

| Business Vertical | `business_type` Flag | Core Unit Conversions (`base_unit`) | Credit & Fulfillment Workflow |
| :--- | :--- | :--- | :--- |
| **Sari-Sari Store** | `SARI_SARI` | `pc`, `pack`, `kg` (repacked rice/sugar), `liter` (oil) | Fast walk-in cash sales + running *suki* *utang* tabs |
| **Hardware & Construction** | `HARDWARE` | `pc`, `kg` (nails), `meter` (wire/hose), `tasa` (paint/solvent) | Contractor credit tabs, partial downpayments, delivery site notes |
| **Agrivet & Poultry Supply** | `AGRIVET` | `sack` (50kg feeds) → `kg` / `g` repacks | Farmer credit tabs tied to harvest cycles |
| **Neighborhood Bakery** | `BAKERY` | `pc` (pandesal/bread), `pack`, `tray` | High-speed keyboard/touch entry + wholesale reseller tabs |
| **School & Office Supplies** | `SCHOOL_SUPPLY` | `ream` (500 sheets) → `sheet`, `box` → `pc` | High-frequency, low-peso-value itemized counter sales |

---

## 3. Resolving the Planning Review Decisions

To align the database design with the current codebase (13 existing tables in Drizzle/Supabase), these five domain decisions govern Milestone 1:

1. **Product scope & current-code boundary:** Retire the equipment-only UI assumption and add retail fields to the live workspace inventory model. The main workspace currently reads/writes SQLite `inventory_items`; the PostgreSQL `products`/`inventory_batches` routes are a separate starter subsystem. Keep both datasets intact in this milestone and defer physical consolidation until an explicit record mapping and consumer cutover are approved.
2. **Data-flow model:** Retain the current **local SQLite + scheduled/manual Supabase backup & restore** pipeline for Milestone 1. Defer the continuous `sync_outbox` daemon until multi-terminal LAN sync is explicitly required.
3. **Sales, discounts & credit derivation:**
   - Store `unit_price` (SRP) and `unit_cost_snapshot` per sale line item to preserve accurate historical profit margins.
   - Represent discounts, voids, and partial payments explicitly via `discount_amount`, `amount_paid`, and non-destructive status transitions (`COMPLETED`, `UTANG`, `PARTIAL`, `VOIDED`) rather than hard `DELETE` queries.
   - Reconcile customer *utang* balances deterministically from `utang_transactions` (charges minus repayments) rather than relying solely on mutable cached balance columns.
4. **Authentication & multi-store scope:** Keep Milestone 1 single-store. Because Express currently connects directly via `DATABASE_URL` without `@supabase/server` user sessions, defer `auth.uid()` Row-Level Security policies until user authentication is introduced.
5. **Reversible cutover:** Replace destructive table drops with **additive Drizzle migrations** (`0005_retail_extensions.sql`) backed by a pre-migration SQLite snapshot and `pg_dump`.

### Implementation boundary (2026-11-27)

- The active offline workspace inventory remains `inventory_items`, extended with retail price, units, aliases, parent/child conversion data, and generated-SKU metadata. Its SQLite rows mirror to PostgreSQL `inventory_items` through the existing backup/restore service.
- PostgreSQL `products` remains used by its existing product/batch API. Fractional product and batch quantities are supported, but this table is not merged with offline `inventory_items` and the batch screen is not yet connected to that local catalog.
- Daily operations remain SQLite-first. Supabase remains backup/restore; the new migration must be applied before using the expanded backup fields.

---

## 4. Three-Layer Hybrid Data Architecture

TallyLedger handles store-to-store operational variations without schema fragmentation by combining three approaches across the database and UI:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ USER & INGESTION LAYER (UI Feature Flags + Approach C Mapping Adapter)      │
│  • Counter UI reads `workspace_settings` to show/hide Customer & Status     │
│  • CSV / Notebook Importer maps arbitrary headers & generates synthetic SKUs│
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Normalized Payload
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ DATABASE LAYER (Approach A Superset Columns + Approach B JSON Metadata)     │
│  • Strict typed columns (`sku`, `qty`, `unit_price`, `unit_cost_snapshot`)  │
│  • Safe defaults (`customer_name = NULL`, `status = 'COMPLETED'`)           │
│  • `extra_metadata` (JSON/JSONB) absorbs vertical-specific fields           │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Approach A — Superset columns + toggles:** Core retail columns live directly on the sales and inventory tables with safe defaults (`status = 'COMPLETED'`, `customer_name = ''`). Store toggles in `workspace_settings` control UI visibility.
- **Approach B — Dynamic metadata bucket:** An `extra_metadata` column (`TEXT` in SQLite / `JSONB` in Postgres) captures vertical-specific attributes (`{"rider": "Kuya Ben"}`, `{"harvest_due": "2026-12-15"}`, `{"notebook_page": 14}`) without requiring schema migrations.
- **Approach C — Staging & normalization adapter:** External CSVs and historical notebook transcriptions pass through a saved column-mapping profile and a **3-tier SKU resolution waterfall** before committing to core tables:
  1. *Exact & alias lookup:* Match normalized product names against `products.canonical_name` and `aliases_json`.
  2. *Deterministic synthetic SKU:* Generate `GEN-<PREFIX>-<SLUG>` (e.g., `GEN-ST01-BEAR-BRAND-33G`) with `is_auto_generated_sku = true` for unbarcoded/repacked items.
  3. *Retroactive barcode merge:* A one-click tool to reassign `GEN-...` historical sales to an official manufacturer barcode (`480...`) once scanned.
