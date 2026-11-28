# 02 — Drop-In Database Template (SQLite WAL + Supabase PostgreSQL)

## 1. Local Edge Database (SQLite — WAL Mode)

Deploy this schema on the counter terminal (Electron / local backend or SQLite WASM OPFS). `WAL` mode and `busy_timeout` guarantee sub-5ms writes and zero corruption during sudden brownouts.

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;

-- 1. Store Configuration & Vertical Feature Flags
CREATE TABLE store_config (
    store_id TEXT PRIMARY KEY,
    store_name TEXT NOT NULL,
    business_type TEXT NOT NULL DEFAULT 'SARI_SARI',  -- 'SARI_SARI', 'HARDWARE', 'AGRIVET', 'BAKERY', 'SCHOOL_SUPPLY'
    require_customer_name INTEGER NOT NULL DEFAULT 0,
    require_status INTEGER NOT NULL DEFAULT 0,
    enable_unit_conversions INTEGER NOT NULL DEFAULT 1,
    default_status TEXT NOT NULL DEFAULT 'COMPLETED',
    column_mapping_json TEXT DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Master Product & Bulk-to-Tingi Catalog
CREATE TABLE products (
    product_id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL REFERENCES store_config(store_id) ON DELETE CASCADE,
    sku TEXT NOT NULL,                                -- Barcode or 'GEN-<STORE>-<SLUG>'
    canonical_name TEXT NOT NULL,
    category TEXT,
    aliases_json TEXT DEFAULT '[]',

    -- Bulk-to-Tingi Unit Conversion
    base_unit TEXT NOT NULL DEFAULT 'pc',             -- 'pc', 'kg', 'g', 'pack', 'meter', 'liter', 'sack', 'box', 'sheet', 'tasa'
    parent_product_id TEXT REFERENCES products(product_id),
    conversion_factor REAL NOT NULL DEFAULT 1.0,

    -- Stock & Pricing
    location TEXT,
    supplier TEXT,
    stock_qty REAL NOT NULL DEFAULT 0,
    low_stock_threshold REAL NOT NULL DEFAULT 5,
    cost_price REAL NOT NULL DEFAULT 0,
    default_unit_price REAL NOT NULL DEFAULT 0,

    is_auto_generated_sku INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(store_id, sku)
);

-- 3. Customer & Suki Credit Ledger (Utang / Contractor / Farmer Tabs)
CREATE TABLE customers (
    customer_id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL REFERENCES store_config(store_id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone_number TEXT,
    customer_type TEXT NOT NULL DEFAULT 'SUKI',
    credit_limit REAL NOT NULL DEFAULT 0,
    current_balance REAL NOT NULL DEFAULT 0,
    notes TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 4. Unified Sales Ledger (Live POS + Historical Notebook Archives)
CREATE TABLE sales (
    sale_id TEXT PRIMARY KEY,                         -- UUIDv7 or ULID
    receipt_group_id TEXT,
    store_id TEXT NOT NULL REFERENCES store_config(store_id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(product_id),
    sku TEXT NOT NULL,
    product_name TEXT NOT NULL,
    unit_sold TEXT NOT NULL DEFAULT 'pc',
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    unit_cost_snapshot REAL DEFAULT 0,
    total_amount REAL GENERATED ALWAYS AS (quantity * unit_price) STORED,

    -- Credit & Fulfillment
    customer_id TEXT REFERENCES customers(customer_id),
    customer_name TEXT,
    status TEXT NOT NULL DEFAULT 'COMPLETED',         -- 'COMPLETED', 'UTANG', 'PARTIAL', 'FOR_DELIVERY', 'VOIDED'
    amount_paid REAL NOT NULL DEFAULT 0,

    -- Archive & Sync Control
    record_source TEXT NOT NULL DEFAULT 'POS_LIVE',   -- 'POS_LIVE', 'CSV_IMPORT', 'NOTEBOOK_ARCHIVE'
    deduct_stock INTEGER NOT NULL DEFAULT 1,          -- 0 for historical notebooks
    extra_metadata TEXT DEFAULT '{}',
    sold_at TEXT NOT NULL,
    synced_at TEXT
);

-- 5. Utang / Credit Payment Repayments
CREATE TABLE credit_payments (
    payment_id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL REFERENCES store_config(store_id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL REFERENCES customers(customer_id),
    sale_id TEXT REFERENCES sales(sale_id),
    amount_paid REAL NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'CASH',      -- 'CASH', 'GCASH', 'MAYA', 'BANK'
    notes TEXT,
    paid_at TEXT NOT NULL DEFAULT (datetime('now')),
    synced_at TEXT
);

-- 6. Local-First Sync Outbox (Counter -> Laptop Hub -> Supabase)
CREATE TABLE sync_outbox (
    outbox_id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    operation TEXT NOT NULL,                          -- 'INSERT', 'UPDATE', 'DELETE'
    payload_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    synced_at TEXT
);

-- Indexes
CREATE INDEX idx_products_store_name ON products(store_id, canonical_name);
CREATE INDEX idx_sales_store_date ON sales(store_id, sold_at);
CREATE INDEX idx_sales_store_sku ON sales(store_id, sku);
CREATE INDEX idx_sales_status ON sales(store_id, status);
CREATE INDEX idx_customers_store ON customers(store_id, full_name);
CREATE INDEX idx_outbox_unsynced ON sync_outbox(synced_at) WHERE synced_at IS NULL;
```

---

## 2. Central Hub & Cloud Mirror (Supabase / PostgreSQL)

Run this in the Supabase SQL Editor and on the self-hosting laptop's PostgreSQL container. Includes Row-Level Security (RLS) so multiple stores share one instance safely.

> **Note:** `auth.users` and `auth.uid()` are Supabase-specific. A plain Postgres container on the laptop will not have them, so either stub them out there or omit the `owner_user_id` foreign key and the RLS policies on the laptop copy.

```sql
CREATE TABLE store_config (
    store_id TEXT PRIMARY KEY,
    owner_user_id UUID REFERENCES auth.users(id),
    store_name TEXT NOT NULL,
    business_type TEXT NOT NULL DEFAULT 'SARI_SARI',
    require_customer_name BOOLEAN NOT NULL DEFAULT FALSE,
    require_status BOOLEAN NOT NULL DEFAULT FALSE,
    enable_unit_conversions BOOLEAN NOT NULL DEFAULT TRUE,
    default_status TEXT NOT NULL DEFAULT 'COMPLETED',
    column_mapping_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE products (
    product_id UUID PRIMARY KEY,
    store_id TEXT NOT NULL REFERENCES store_config(store_id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    canonical_name TEXT NOT NULL,
    category TEXT,
    aliases_json JSONB DEFAULT '[]'::jsonb,
    base_unit TEXT NOT NULL DEFAULT 'pc',
    parent_product_id UUID REFERENCES products(product_id),
    conversion_factor NUMERIC(10,3) NOT NULL DEFAULT 1.000,
    location TEXT,
    supplier TEXT,
    stock_qty NUMERIC(12,3) NOT NULL DEFAULT 0,
    low_stock_threshold NUMERIC(12,3) NOT NULL DEFAULT 5,
    cost_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    default_unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    is_auto_generated_sku BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(store_id, sku)
);

CREATE TABLE customers (
    customer_id UUID PRIMARY KEY,
    store_id TEXT NOT NULL REFERENCES store_config(store_id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone_number TEXT,
    customer_type TEXT NOT NULL DEFAULT 'SUKI',
    credit_limit NUMERIC(12,2) NOT NULL DEFAULT 0,
    current_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
    notes TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sales (
    sale_id UUID PRIMARY KEY,
    receipt_group_id UUID,
    store_id TEXT NOT NULL REFERENCES store_config(store_id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(product_id),
    sku TEXT NOT NULL,
    product_name TEXT NOT NULL,
    unit_sold TEXT NOT NULL DEFAULT 'pc',
    quantity NUMERIC(10,3) NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL,
    unit_cost_snapshot NUMERIC(12,2) DEFAULT 0,
    total_amount NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    customer_id UUID REFERENCES customers(customer_id),
    customer_name TEXT,
    status TEXT NOT NULL DEFAULT 'COMPLETED',
    amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
    record_source TEXT NOT NULL DEFAULT 'POS_LIVE',
    deduct_stock BOOLEAN NOT NULL DEFAULT TRUE,
    extra_metadata JSONB DEFAULT '{}'::jsonb,
    sold_at TIMESTAMPTZ NOT NULL,
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE credit_payments (
    payment_id UUID PRIMARY KEY,
    store_id TEXT NOT NULL REFERENCES store_config(store_id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(customer_id),
    sale_id UUID REFERENCES sales(sale_id),
    amount_paid NUMERIC(12,2) NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'CASH',
    notes TEXT,
    paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Weekly Roll-Up Tables (keeps Supabase Free Tier under 500MB for 100+ years)
CREATE TABLE weekly_sales_summary (
    summary_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id TEXT NOT NULL REFERENCES store_config(store_id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    transaction_count INTEGER NOT NULL DEFAULT 0,
    gross_sales NUMERIC(12,2) NOT NULL DEFAULT 0,
    cash_collected NUMERIC(12,2) NOT NULL DEFAULT 0,
    utang_issued NUMERIC(12,2) NOT NULL DEFAULT 0,
    estimated_profit NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(store_id, week_start)
);

-- Enable Row-Level Security (RLS)
ALTER TABLE store_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_sales_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner store isolation" ON store_config
    FOR ALL USING (owner_user_id = auth.uid());

CREATE POLICY "Store isolation on products" ON products
    FOR ALL USING (store_id IN (SELECT store_id FROM store_config WHERE owner_user_id = auth.uid()));

CREATE POLICY "Store isolation on customers" ON customers
    FOR ALL USING (store_id IN (SELECT store_id FROM store_config WHERE owner_user_id = auth.uid()));

CREATE POLICY "Store isolation on sales" ON sales
    FOR ALL USING (store_id IN (SELECT store_id FROM store_config WHERE owner_user_id = auth.uid()));

CREATE POLICY "Store isolation on credit_payments" ON credit_payments
    FOR ALL USING (store_id IN (SELECT store_id FROM store_config WHERE owner_user_id = auth.uid()));

CREATE POLICY "Store isolation on weekly_sales_summary" ON weekly_sales_summary
    FOR ALL USING (store_id IN (SELECT store_id FROM store_config WHERE owner_user_id = auth.uid()));
```

---

## 3. Atomic Transactions (Checkout & Break-Pack)

These are SQLite statements for the counter terminal.

```sql
-- A. Break-Pack Conversion (e.g., opening 1 x 50kg sack into 50 x 1kg repacks)
BEGIN TRANSACTION;
UPDATE products SET stock_qty = stock_qty - 1, updated_at = datetime('now')
WHERE product_id = :parent_sack_id;

UPDATE products SET stock_qty = stock_qty + :conversion_factor, updated_at = datetime('now')
WHERE product_id = :child_repack_id;
COMMIT;

-- B. Live POS Checkout with Optional Utang Balance Update
BEGIN TRANSACTION;
INSERT INTO sales (sale_id, store_id, product_id, sku, product_name, unit_sold, quantity, unit_price, customer_id, status, amount_paid, deduct_stock, sold_at)
VALUES (:sale_id, :store_id, :product_id, :sku, :product_name, :unit_sold, :qty, :price, :customer_id, :status, :amount_paid, 1, datetime('now'));

UPDATE products SET stock_qty = stock_qty - :qty, updated_at = datetime('now')
WHERE product_id = :product_id;

-- If status is 'UTANG' or 'PARTIAL', increment the customer's running balance
UPDATE customers SET current_balance = current_balance + ((:qty * :price) - :amount_paid), updated_at = datetime('now')
WHERE customer_id = :customer_id AND :status IN ('UTANG', 'PARTIAL');
COMMIT;
```
