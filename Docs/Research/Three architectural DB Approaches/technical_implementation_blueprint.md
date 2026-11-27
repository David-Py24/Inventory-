# TallyLedger: Technical Implementation Blueprint

## 1. Unified SQLite (Edge) & PostgreSQL (Hub/Cloud) Schema

### A. Local Counter Schema (SQLite — `WAL` Mode)
Designed for zero-downtime edge writes, power-loss durability, and complete schema parity with the central hub.

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA busy_timeout = 5000;
PRAGMA foreign_keys = ON;

-- 1. Store Configuration (Controls UI visibility, defaults, & CSV maps)
CREATE TABLE store_config (
    store_id TEXT PRIMARY KEY,
    store_name TEXT NOT NULL,
    require_customer_name INTEGER NOT NULL DEFAULT 0, -- 0: Store A, 1: Store B
    require_status INTEGER NOT NULL DEFAULT 0,        -- 0: Store A, 1: Store B
    default_status TEXT NOT NULL DEFAULT 'COMPLETED',
    column_mapping_json TEXT DEFAULT '{}'
);

-- 2. Master Product & SKU Catalog (Supports real barcodes + deterministic synthetic SKUs)
CREATE TABLE products (
    product_id TEXT PRIMARY KEY,                      -- UUIDv7
    store_id TEXT NOT NULL,
    sku TEXT NOT NULL,                                -- Real barcode or 'GEN-...'
    canonical_name TEXT NOT NULL,                     -- Standardized display name
    aliases_json TEXT NOT NULL DEFAULT '[]',          -- Known name variations
    default_unit_price REAL NOT NULL DEFAULT 0,
    is_auto_generated_sku INTEGER NOT NULL DEFAULT 0, -- 1 if auto-generated
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(store_id, sku)
);

-- 3. Unified Sales Ledger (Superset Core + JSON Extensibility + Historical Protection)
CREATE TABLE sales (
    sale_id TEXT PRIMARY KEY,                         -- UUIDv7 (collision-free)
    store_id TEXT NOT NULL,
    sku TEXT NOT NULL,
    product_name TEXT NOT NULL,                       -- Historical name snapshot
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    total_amount REAL GENERATED ALWAYS AS (quantity * unit_price) STORED,
    customer_name TEXT,                               -- NULL for Store A
    status TEXT NOT NULL DEFAULT 'COMPLETED',         -- COMPLETED, UTANG, PARTIAL, VOID
    record_source TEXT NOT NULL DEFAULT 'POS_LIVE',   -- POS_LIVE, CSV_IMPORT, NOTEBOOK_ARCHIVE
    deduct_stock INTEGER NOT NULL DEFAULT 1,          -- 0 for pre-cutover notebook archives
    extra_metadata TEXT NOT NULL DEFAULT '{}',        -- JSON string for custom fields
    sold_at TEXT NOT NULL,
    synced_at TEXT
);

CREATE INDEX idx_sales_store_date ON sales(store_id, sold_at);
CREATE INDEX idx_sales_store_sku ON sales(store_id, sku);
CREATE INDEX idx_sales_store_status ON sales(store_id, status);
```

### B. Central Hub / Supabase Schema (PostgreSQL)
Uses `NUMERIC(12,2)` for exact currency arithmetic, native `JSONB`, and Row-Level Security (RLS) to isolate multi-store data.

```sql
CREATE TABLE store_config (
    store_id TEXT PRIMARY KEY,
    owner_user_id UUID REFERENCES auth.users(id),
    store_name TEXT NOT NULL,
    require_customer_name BOOLEAN NOT NULL DEFAULT FALSE,
    require_status BOOLEAN NOT NULL DEFAULT FALSE,
    default_status TEXT NOT NULL DEFAULT 'COMPLETED',
    column_mapping_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE products (
    product_id UUID PRIMARY KEY,
    store_id TEXT NOT NULL REFERENCES store_config(store_id),
    sku TEXT NOT NULL,
    canonical_name TEXT NOT NULL,
    aliases_json JSONB NOT NULL DEFAULT '[]'::jsonb,
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
    extra_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    sold_at TIMESTAMPTZ NOT NULL,
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Multi-Store Isolation via Row-Level Security
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Store owners access only their own store" ON sales
    FOR ALL USING (
        store_id IN (SELECT store_id FROM store_config WHERE owner_user_id = auth.uid())
    );
```

---

## 2. CSV Column Mapper Specification

### Header Auto-Detection Dictionary
When a user uploads a CSV file, TallyLedger inspects row 1 and auto-maps headers using normalized lowercase matching:

| Target TallyLedger Column | Accepted Header Synonyms (English & Filipino Retail) | Fallback Behavior if Unmapped |
| :--- | :--- | :--- |
| `product_name` | `product`, `product name`, `item`, `description`, `paninda` | **Required** (Row flagged if blank) |
| `sku` | `sku`, `barcode`, `code`, `item code`, `plu` | Triggers 3-Tier SKU Resolution |
| `quantity` | `qty`, `quantity`, `pcs`, `count`, `bilang` | **Required** (Defaults to `1` if configured) |
| `unit_price` | `price`, `unit price`, `srp`, `presyo`, `amount` | **Required** (Strips `₱` and commas) |
| `customer_name` | `customer`, `customer name`, `buyer`, `suki`, `name` | Sets to `NULL` |
| `status` | `status`, `payment`, `state`, `type`, `utang` | Sets to `store_config.default_status` |
| `sold_at` | `date`, `time`, `sold_at`, `timestamp`, `petsa` | Sets to import batch timestamp |
| *(Any Unmapped Column)* | e.g., `rider`, `page_no`, `remarks` | Packed into `extra_metadata` JSON |

---

## 3. Missing-SKU Normalization & Historical Notebook Rules

### A. 3-Tier SKU Resolution Waterfall
Whenever a sale is logged or imported without a barcode:
1. **Tier 1 — Exact & Alias Lookup:**
   Normalize input (`LOWER(TRIM(product_name))` with collapsed whitespace) and query `products` for matching `canonical_name` or entries inside `aliases_json` for that `store_id`. If found, reuse the existing `sku`.
2. **Tier 2 — Deterministic Synthetic SKU Generation:**
   If no match exists, generate a deterministic slug-based SKU so repeated unbarcoded entries group cleanly in analytics:
   $$\text{Synthetic SKU} = \texttt{GEN-} + \text{STORE\_PREFIX} + \texttt{-} + \text{CLEAN\_SLUG}$$
   * *Example:* `"Bear Brand Swak 33g"` in Store A resolves to `GEN-SA-BEAR-BRAND-SWAK-33G` with `is_auto_generated_sku = 1`.
3. **Tier 3 — Non-Destructive Barcode Merge:**
   When a real barcode (e.g., `4800361390811`) is later scanned for an item that previously used a synthetic SKU, execute an atomic merge:
   ```sql
   BEGIN TRANSACTION;
   UPDATE sales
      SET sku = '4800361390811'
    WHERE store_id = :store_id AND sku = 'GEN-SA-BEAR-BRAND-SWAK-33G';

   DELETE FROM products
    WHERE store_id = :store_id AND sku = 'GEN-SA-BEAR-BRAND-SWAK-33G';
   COMMIT;
   ```

### B. Protecting Live Inventory During Historical Notebook Imports
When digitizing legacy sales notebooks (such as the Sept 25 – Nov 7, 2023 archive that lacks stock counts):
* Set `record_source = 'NOTEBOOK_ARCHIVE'` and `deduct_stock = 0` (`FALSE`).
* Financial reports (daily/weekly revenue, YoY seasonal trends, top-selling velocity) include all `NOTEBOOK_ARCHIVE` rows, while live shelf inventory calculations filter strictly on `WHERE deduct_stock = 1` starting from the store's physical count cutover date.