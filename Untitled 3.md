
Here is the complete blueprint covering the unified SQLite/PostgreSQL schema, the CSV column-mapping pipeline, and missing-SKU normalization for TallyLedger.

  

### 1. Unified SQLite & PostgreSQL Schema

To keep your local counter SQLite file, your self-hosting laptop, and your Supabase Postgres mirror 100% compatible across different stores, use a **Superset Schema** with store-level feature flags and a `metadata` JSON column for unexpected fields.

  

#### A. Local Counter Schema (SQLite — `WAL` Mode)

SQL

```
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;

-- 1. Store Configuration (Controls UI fields & defaults per store)
CREATE TABLE store_config (
    store_id TEXT PRIMARY KEY,
    store_name TEXT NOT NULL,
    require_customer_name INTEGER NOT NULL DEFAULT 0, -- 0 for Store A, 1 for Store B
    require_status INTEGER NOT NULL DEFAULT 0,        -- 0 for Store A, 1 for Store B
    default_status TEXT NOT NULL DEFAULT 'COMPLETED',
    column_mapping_json TEXT                          -- Saved CSV header mapping per store
);

-- 2. Master Product & SKU Catalog (Handles real barcodes + synthetic SKUs)
CREATE TABLE products (
    product_id TEXT PRIMARY KEY,                      -- UUID
    store_id TEXT NOT NULL,
    sku TEXT NOT NULL,                                -- Real barcode or 'UNMAPPED-...'
    canonical_name TEXT NOT NULL,                     -- Standardized product name
    aliases_json TEXT DEFAULT '[]',                   -- e.g., ["Coke Mismo", "Coke 295ml"]
    default_unit_price REAL NOT NULL DEFAULT 0,
    is_auto_generated_sku INTEGER NOT NULL DEFAULT 0, -- 1 if created from missing-SKU import
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(store_id, sku)
);

-- 3. Unified Sales Table (Superset for Store A, Store B, and Historical Notebooks)
CREATE TABLE sales (
    sale_id TEXT PRIMARY KEY,                         -- UUIDv7 or ULID (collision-free across stores)
    store_id TEXT NOT NULL,
    sku TEXT NOT NULL,                                -- Links to products.sku
    product_name TEXT NOT NULL,                       -- Snapshot of name at time of sale
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    total_amount REAL GENERATED ALWAYS AS (quantity * unit_price) STORED,
    customer_name TEXT,                               -- NULL for Store A; populated for Store B
    status TEXT NOT NULL DEFAULT 'COMPLETED',         -- 'COMPLETED', 'UTANG', 'PARTIAL', 'VOID'
    record_source TEXT NOT NULL DEFAULT 'POS_LIVE',   -- 'POS_LIVE', 'CSV_IMPORT', 'NOTEBOOK_ARCHIVE'
    deduct_stock INTEGER NOT NULL DEFAULT 1,          -- 0 for old 2023 notebooks so 2026 stock stays intact
    extra_metadata TEXT DEFAULT '{}',                 -- JSON string for Store C/D custom fields
    sold_at TEXT NOT NULL,
    synced_at TEXT
);

CREATE INDEX idx_sales_store_date ON sales(store_id, sold_at);
CREATE INDEX idx_sales_store_sku ON sales(store_id, sku);
```

#### B. Central Hub / Supabase Schema (PostgreSQL)

Mirror the exact structure in Postgres with native `JSONB`, `NUMERIC(12,2)` for exact peso currency math, and Row-Level Security (RLS) so each friend's or relative's store only sees its own `store_id`:

  

SQL

```
CREATE TABLE store_config (
    store_id TEXT PRIMARY KEY,
    owner_user_id UUID REFERENCES auth.users(id),
    store_name TEXT NOT NULL,
    require_customer_name BOOLEAN NOT NULL DEFAULT FALSE,
    require_status BOOLEAN NOT NULL DEFAULT FALSE,
    default_status TEXT NOT NULL DEFAULT 'COMPLETED',
    column_mapping_json JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE products (
    product_id UUID PRIMARY KEY,
    store_id TEXT NOT NULL REFERENCES store_config(store_id),
    sku TEXT NOT NULL,
    canonical_name TEXT NOT NULL,
    aliases_json JSONB DEFAULT '[]'::jsonb,
    default_unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    is_auto_generated_sku BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(store_id, sku)
);

CREATE TABLE sales (
    sale_id UUID PRIMARY KEY,
    store_id TEXT NOT NULL REFERENCES store_config(store_id),
    sku TEXT NOT NULL,
    product_name TEXT NOT NULL,
    quantity NUMERIC(10,3) NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL,
    total_amount NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    customer_name TEXT,
    status TEXT NOT NULL DEFAULT 'COMPLETED',
    record_source TEXT NOT NULL DEFAULT 'POS_LIVE',
    deduct_stock BOOLEAN NOT NULL DEFAULT TRUE,
    extra_metadata JSONB DEFAULT '{}'::jsonb,
    sold_at TIMESTAMPTZ NOT NULL,
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Isolate each store via Row-Level Security
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Store owners see only their store" ON sales
    FOR ALL USING (
        store_id IN (SELECT store_id FROM store_config WHERE owner_user_id = auth.uid())
    );
```

### 2. CSV Column Mapper Pipeline

Instead of forcing every store to edit their spreadsheets before uploading, build a **3-Stage Staging & Mapping Adapter** inside TallyLedger:

  

1. **Stage 1 — Raw Header Inspection:** When Store A or Store B uploads a CSV, read only row 1 (headers) and 5 preview rows. Auto-suggest matches using a synonym dictionary:
    
    - `product_name` ← `["item", "product", "product name", "description", "paninda"]`
        
    - `sku` ← `["sku", "barcode", "code", "item code", "plu"]`
        
    - `quantity` ← `["qty", "quantity", "pcs", "count", "bilang"]`
        
    - `unit_price` ← `["price", "unit price", "srp", "presyo", "amount"]`
        
    - `customer_name` ← `["customer", "customer name", "buyer", "suki", "name"]`
        
    - `status` ← `["status", "payment", "type", "remarks", "utang"]`
        
2. **Stage 2 — Save Mapping Profile per `store_id`:** Save the confirmed mapping in `store_config.column_mapping_json` so the store only maps its columns **once**:
    
    - **Store A Profile:** `{"Product": "product_name", "Code": "sku", "Qty": "quantity", "Price": "unit_price"}` → automatically injects `customer_name = null`, `status = "COMPLETED"`.
        
    - **Store B Profile:** `{"Buyer": "customer_name", "Item": "product_name", "SKU": "sku", "Count": "quantity", "SRP": "unit_price", "State": "status"}` → maps any unmapped extra column (e.g., `"Rider"`) into `extra_metadata`.
        
3. **Stage 3 — Atomic Batch Validation:** Parse all rows in memory (or a temporary `staging_sales` table), clean currency symbols (`₱25.00` → `25.00`), flag rows with missing `product_name` or invalid numbers for user review, and commit valid rows inside a single SQLite `BEGIN TRANSACTION ... COMMIT` block.
    

### 3. Handling Missing SKUs (Notebooks & Unbarcoded Items)

Sari-sari stores frequently sell repacked goods (repacked sugar, cooking oil, tingi items) or have old notebook logs with only product names and no barcodes. Use a **3-Tier SKU Resolution Waterfall** during import or checkout:

1. **Tier 1 — Exact & Alias Lookup (`products` table):** Normalize the incoming product name (`LOWER(TRIM(name))` + collapse double spaces) and check `canonical_name` and `aliases_json` for that `store_id`. If `"coke mismo"` or `"Coke 295ml"` already exists in `products`, reuse its existing `sku`.
    
2. **Tier 2 — Deterministic Synthetic SKU Generation:** If no match exists, generate a deterministic slug-based SKU so identical unbarcoded names always group together cleanly in sales reports:
    
    - Formula: `GEN-<STORE_PREFIX>-<CLEAN_SLUG>`
        
    - Example: `"Bear Brand Swak 33g"` in Store A becomes `GEN-SA-BEAR-BRAND-SWAK-33G` (with `is_auto_generated_sku = 1`).
        
    - Because it is deterministic, importing `"Bear Brand Swak 33g"` again next week automatically resolves to the exact same synthetic SKU without creating duplicates.
        
3. **Tier 3 — Later Barcode Merge Tool:** When a store eventually scans the real manufacturer barcode (e.g., `4800361390811`) for `"Bear Brand Swak 33g"`, provide a one-click **"Merge SKU"** action that runs:
    
    SQL
    
    ```
    UPDATE sales SET sku = '4800361390811' WHERE store_id = ? AND sku = 'GEN-SA-BEAR-BRAND-SWAK-33G';
    DELETE FROM products WHERE store_id = ? AND sku = 'GEN-SA-BEAR-BRAND-SWAK-33G';
    ```
    
    This retroactively unifies all historical notebook and unbarcoded sales under the official barcode.