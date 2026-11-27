Here is a clean, structured Markdown blueprint consolidating our technical decisions, domain scope, database architecture, and migration/backup plan into an actionable specification ready for your `/docs` directory.

  

Markdown

````
# TallyLedger: Retail Architecture, Schema & Migration Specification

## 1. Executive Summary & Architectural Alignment

TallyLedger is transitioning from a general-purpose financial/equipment tracking template to a **local-first, offline-capable retail POS and inventory ledger** engineered for Philippine micro-enterprises—specifically **Sari-Sari Stores** and their direct operational twins.

Rather than tearing down existing database structures or prematurely introducing multi-tenant cloud sync complexity, this specification establishes a **phased, additive migration path** built on the project's existing authoritative **Drizzle ORM** (`server/db/schema.ts`) and local SQLite + Supabase backup/restore pipeline.

### Core Architectural Principles
* **Edge-First Reliability:** The counter terminal's local database (SQLite in `WAL` mode) serves as the single source of truth for daily operations, guaranteeing sub-5ms offline checkout speed and resilience against ISP drops or sudden power interruptions.
* **Drizzle as Sole Schema Authority:** All PostgreSQL and SQLite table definitions, constraints, and migrations remain strictly managed through `server/db/schema.ts` and `npm run db:migrate`, keeping Supabase CLI migrations disabled.
* **Milestone-Based Evolution:**
  * **Milestone 1 (Current Focus):** Single-store retail extension on top of existing Drizzle tables (`products`, `inventory_batches`, `utang_customers`, `utang_transactions`) using the existing cloud backup/restore model[cite: 2, 3].
  * **Milestone 2 (Future Scale):** Multi-store isolation (`store_id` + Supabase Auth RLS) and asynchronous `sync_outbox` replication across secondary stores or a local NAS[cite: 2, 4, 6].

---

## 2. Target Business Verticals ("Direct Twins")

All five retail verticals below share identical operational DNA: **high unbarcoded/repacked SKU counts, fractional (*tingi*) unit conversions, informal customer credit (*utang*), and fast counter logging**.

| Business Vertical | `business_type` Flag | Core Unit Conversions (`base_unit`) | Credit & Fulfillment Workflow |
| :--- | :--- | :--- | :--- |
| **Sari-Sari Store** | `SARI_SARI` | `pc`, `pack`, `kg` (repacked rice/sugar), `liter` (oil) | Fast walk-in cash sales + running *suki* *utang* tabs |
| **Hardware & Construction** | `HARDWARE` | `pc`, `kg` (nails), `meter` (wire/hose), `tasa` (paint/solvent) | Contractor credit tabs, partial downpayments, delivery site notes |
| **Agrivet & Poultry Supply** | `AGRIVET` | `sack` (50kg feeds) $\rightarrow$ `kg` / `g` repacks | Farmer credit tabs tied to harvest cycles |
| **Neighborhood Bakery** | `BAKERY` | `pc` (pandesal/bread), `pack`, `tray` | High-speed keyboard/touch entry + wholesale reseller tabs |
| **School & Office Supplies** | `SCHOOL_SUPPLY` | `ream` (500 sheets) $\rightarrow$ `sheet`, `box` $\rightarrow$ `pc` | High-frequency, low-peso-value itemized counter sales |

---

## 3. Resolving the Planning Review Decisions

To align the database design with the current codebase (`13` existing tables in Drizzle/Supabase), the following five domain decisions govern Milestone 1[cite: 2, 3]:

1. **Product Scope & Table Consolidation:** Retire legacy equipment/asset assumptions (`InventoryCategory` locked to `'Equipment' | 'Electronics'`, missing retail selling prices)[cite: 1, 2]. Standardize retail inventory and sales around the existing `products`, `inventory_batches`, `utang_customers`, and `utang_transactions` tables rather than maintaining duplicate `inventory_items` and `products` models[cite: 2, 3].
2. **Data-Flow Model:** Retain the current **Local SQLite + Scheduled/Manual Supabase Backup & Restore** pipeline for Milestone 1[cite: 2, 3]. Defer the continuous `sync_outbox` daemon until multi-terminal LAN sync is explicitly required[cite: 2].
3. **Sales, Discounts & Credit Derivation:**
   * Store `unit_price` (SRP) and `unit_cost_snapshot` per sale line item to preserve accurate historical profit margins.
   * Represent discounts, voids, and partial payments explicitly via `discount_amount`, `amount_paid`, and non-destructive status transitions (`COMPLETED`, `UTANG`, `PARTIAL`, `VOIDED`) rather than hard `DELETE` queries[cite: 2, 6].
   * Reconcile customer *utang* balances deterministically from `utang_transactions` (charges minus repayments) rather than relying solely on mutable cached balance columns[cite: 2, 3].
4. **Authentication & Multi-Store Scope:** Keep Milestone 1 single-store[cite: 2]. Because Express currently connects directly via `DATABASE_URL` without `@supabase/server` user sessions, defer `auth.uid()` Row-Level Security policies until user authentication is introduced[cite: 2, 3].
5. **Reversible Cutover:** Replace destructive table drops with **additive Drizzle migrations** (`0005_retail_extensions.sql`) backed by a pre-migration SQLite snapshot and `pg_dump`[cite: 2, 3].

---

## 4. Three-Layer Hybrid Data Architecture

TallyLedger handles store-to-store operational variations without schema fragmentation by combining three layers across the database and UI:

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
│  • Safe defaults (`customer_name = NULL`, `status = 'COMPLETED'`)            │
│  • `extra_metadata` (JSON/JSONB) absorbs vertical-specific fields           │
└─────────────────────────────────────────────────────────────────────────────┘
````

- **Approach A (Superset Columns + Toggles):** Core retail columns live directly on the sales and product tables with safe defaults (`status = 'COMPLETED'`, `customer_name = NULL`). Store toggles in `workspace_settings` control UI visibility.
    
- **Approach B (Dynamic Metadata Bucket):** An `extra_metadata` (`TEXT` in SQLite / `JSONB` in Postgres) column captures vertical-specific attributes (`{"rider": "Kuya Ben"}`, `{"harvest_due": "2026-12-15"}`, `{"notebook_page": 14}`) without requiring schema migrations[cite: 4].
    
- **Approach C (Staging & Normalization Adapter):** External CSVs and historical notebook transcriptions pass through a saved column-mapping profile and a **3-Tier SKU Resolution Waterfall** before committing to core tables[cite: 4]:
    
    1. _Exact & Alias Lookup:_ Match normalized product names against `products.canonical_name` and `aliases_json`[cite: 4].
        
    2. _Deterministic Synthetic SKU:_ Generate `GEN-<PREFIX>-<SLUG>` (e.g., `GEN-ST01-BEAR-BRAND-33G`) with `is_auto_generated_sku = true` for unbarcoded/repacked items[cite: 4].
        
    3. _Retroactive Barcode Merge:_ One-click tool to reassign `GEN-...` historical sales to an official manufacturer barcode (`480...`) once scanned[cite: 4].
        

## 5. Canonical Schema Extensions (Drizzle ORM Contract)

All column additions below extend existing tables in `server/db/schema.ts` using consistent snake_case SQL naming mapped to camelCase TypeScript interfaces[cite: 2, 3].

  

### 5.1 `workspace_settings` Extensions

TypeScript

```
// Additive columns for server/db/schema.ts -> workspace_settings
businessType: text('business_type').notNull().default('SARI_SARI'), // 'SARI_SARI' | 'HARDWARE' | 'AGRIVET' | 'BAKERY' | 'SCHOOL_SUPPLY'
requireCustomerName: boolean('require_customer_name').notNull().default(false),
requireSaleStatus: boolean('require_sale_status').notNull().default(false),
enableUnitConversions: boolean('enable_unit_conversions').notNull().default(true),
columnMappingJson: jsonb('column_mapping_json').$type<Record<string, string>>().default({}),
```

### 5.2 `products` Extensions (Retail Pricing & Bulk-to-_Tingi_)

TypeScript

```
// Additive columns for server/db/schema.ts -> products
aliasesJson: jsonb('aliases_json').$type<string[]>().default([]),
baseUnit: text('base_unit').notNull().default('pc'), // 'pc' | 'kg' | 'g' | 'pack' | 'meter' | 'liter' | 'sack' | 'box' | 'sheet' | 'tasa'
parentProductId: uuid('parent_product_id').references(() => products.id), // Points to bulk sack/box
conversionFactor: numeric('conversion_factor', { precision: 10, scale: 3 }).notNull().default('1.000'),
defaultUnitPrice: numeric('default_unit_price', { precision: 12, scale: 2 }).notNull().default('0.00'),
isAutoGeneratedSku: boolean('is_auto_generated_sku').notNull().default(false),
```

#### Break-Pack Guardrail Rule

When converting 1 bulk unit (e.g., `50kg Feed Sack`) into _tingi_ child units (`50 x 1kg Repack`), execute inside a single atomic transaction with a strict non-negative stock check:

  

SQL

```
-- Fails safely if parent stock < 1
UPDATE products
SET stock_qty = stock_qty - 1, updated_at = NOW()
WHERE id = :parent_product_id AND stock_qty >= 1;

-- Only increment child stock if parent row was updated (ROW_COUNT = 1)
UPDATE products
SET stock_qty = stock_qty + :conversion_factor, updated_at = NOW()
WHERE id = :child_product_id;
```

### 5.3 Sales & Historical Archive Extensions

TypeScript

```
// Additive columns for sales / transaction line items
unitSold: text('unit_sold').notNull().default('pc'),
unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
unitCostSnapshot: numeric('unit_cost_snapshot', { precision: 12, scale: 2 }).notNull().default('0.00'),
discountAmount: numeric('discount_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
amountPaid: numeric('amount_paid', { precision: 12, scale: 2 }).notNull().default('0.00'),
recordSource: text('record_source').notNull().default('POS_LIVE'), // 'POS_LIVE' | 'CSV_IMPORT' | 'NOTEBOOK_ARCHIVE'
deductStock: boolean('deduct_stock').notNull().default(true),
extraMetadata: jsonb('extra_metadata').$type<Record<string, unknown>>().default({}),
```

## 6. Historical Notebook Ingestion & 3-Tier Backup Strategy

### 6.1 Importing Legacy Sales Notebooks (Zero Stock Distortion)

For itemized handwritten sales logs (e.g., Sept 25 – Nov 7, 2023 records formatted as `Date | Qty | Product | Sales`):

  

1. **Derive Unit Price:** Compute `unit_price = Sales / Qty` during CSV staging.
    
2. **Protect Live Shelf Counts:** Set `record_source = 'NOTEBOOK_ARCHIVE'` and `deduct_stock = false` so historical revenue powers YoY seasonality and SKU velocity reports without subtracting from current physical inventory.
    
3. **Establish Inventory Cutover Day:** Perform one physical shelf count prior to live POS launch to set opening `stock_qty` (`Day 0`), enabling `deduct_stock = true` for all subsequent `POS_LIVE` transactions.
    

### 6.2 3-Tier Storage & Backup Topology (3-2-1 Resilience)

Capacity benchmarks confirm that ~32,000 sales entries/year occupy **~20–35 MB/year** in SQLite/Postgres—allowing decades of operation on modest local hardware and within Supabase's 500 MB Free Tier[cite: 6].

Plaintext

```
┌─────────────────────────────┐
│ TIER 1: EDGE COUNTER DEVICE │  SQLite (WAL Mode, synchronous = NORMAL)
│ (Authoritative Operational) │  • Instant offline counter writes
└──────────────┬──────────────┘
               │ Hourly `VACUUM INTO` snapshot over LAN
               ▼
┌─────────────────────────────┐
│ TIER 2: LOCAL HUB / LAPTOP  │  Local Backup Host (Upgradeable to RAID 1 NAS)
│ (On-Premise Redundancy)     │  • Stores hourly `.db` snapshots + weekly `.db.zst`
└──────────────┬──────────────┘
               │ Scheduled Backup / Weekly Roll-Up
               ▼
┌─────────────────────────────┐
│ TIER 3: SUPABASE CLOUD      │  • Postgres: Drizzle-managed tables + weekly summaries
│ (Off-Site Disaster Mirror)  │  • Storage: Zstd-compressed `.db.zst` archives (~3 MB/yr)
└─────────────────────────────┘
```

### 6.3 Migration & Cutover Checklist

1. **Backup Current State:** Create a timestamped copy of the local SQLite database file and verify connectivity to `DATABASE_URL`.
    
2. **Generate Drizzle Migration:** Update `server/db/schema.ts` with the additive columns in Section 5 and run `npx drizzle-kit generate`.
    
3. **Apply & Verify Locally:** Run `npm run db:migrate` against the local development database and verify existing records retain valid defaults (`deduct_stock = true`, `conversion_factor = 1.000`).
    
4. **Deploy to Supabase:** Push the checked-in migration file to `main` to trigger `.github/workflows/deploy-db-migrations.yml` (using the IPv4 Session Pooler `SUPABASE_DATABASE_URL`) and confirm schema alignment[cite: 3].