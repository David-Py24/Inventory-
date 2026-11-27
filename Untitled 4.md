
When a premade app like TallyLedger has fixed database tables, different stores logging different fields will cause missing-column errors, messy `NULL` values, or broken imports unless you normalize the data before it hits the core tables.

  

Because your architecture uses a local-first SQLite setup that syncs upward, you can solve this without rewriting TallyLedger's core database schema by combining a **Superset Core Table** with a **Store Mapping & Staging Layer**.

  

### 1. What Happens Without Handling It

- **Store A (4 fields: Product, SKU, Qty, Price):** If TallyLedger expects `customer_name` or `status` as `NOT NULL` fields, Store A's entries will be rejected by the database.
    
- **Store B (6 fields: adds Customer Name & Status):** If TallyLedger only has columns for Store A's 4 fields, Store B's extra data gets dropped or shoved awkwardly into a notes field, breaking credit (_utang_) or order-status tracking.
    

### 2. Three Ways to Address Schema Differences

#### Approach A: Superset Core Table + Nullable Fields (Best for Known Store Variations)

Design TallyLedger's core `sales` table to hold the **union (superset)** of all standard retail columns, making store-specific fields optional (`NULL` or default values) while keeping core math fields strict:

  

- **Required (`NOT NULL`):** `store_id`, `product_name`, `sku`, `quantity`, `unit_price`, `created_at`
    
- **Optional (`NULL` / Defaults):** `customer_name` (defaults to `NULL` or `'Walk-in'`), `status` (defaults to `'COMPLETED'`)
    
- **Store-Level Feature Flags (`store_settings` table):** Store A turns off the Customer and Status inputs in its UI, so the app automatically passes `NULL` and `'COMPLETED'` under the hood. Store B turns both toggles on.
    

#### Approach B: Hybrid Relational + JSON Column (Best for Unpredictable Custom Fields)

Keep the core reporting columns strictly typed for fast SQL math (revenue, stock counts, top SKUs), and add one `metadata` (`TEXT` in SQLite / `JSONB` in Postgres) column to absorb any extra fields a specific store invents later:

  

- Both Store A and Store B write `sku`, `quantity`, and `unit_price` into standard columns so cross-store reports work uniformly.
    
- Store B's extra fields—or Store C's future fields like `delivery_rider` or `senior_id`—get stored cleanly inside `metadata` (e.g., `{"customer_name": "Juan", "status": "UTANG"}`) without altering database tables.
    

#### Approach C: Import Staging & Column-Mapping Adapter (Best for Legacy/Notebook CSV Imports)

If stores are importing existing spreadsheets or digitized notebooks rather than typing directly into TallyLedger:

  

1. **Ingest into a `raw_imports` staging table** first so bad rows never corrupt live ledger tables.
    
2. **Apply a per-store mapping profile** (`{"col_1": "product_name", "col_2": "sku", ...}`) that fills missing fields with defaults (e.g., setting Store A's missing `status` to `'PAID'`) and generates synthetic SKUs if a store only wrote product names.
    
3. **Validate and commit** the normalized rows into TallyLedger's main `sales` table.
    

### How This Fits Your Local-First + Multi-Store Setup

If you onboard friends' or relatives' sari-sari stores alongside your own, keep a `store_config` table in each local SQLite instance and your central hub:

- Every store runs the **exact same TallyLedger database schema** (making local-to-laptop and Supabase sync identical across every device).
    
- Only the **UI visibility and default values** change per `store_id`—Store A sees a fast 4-field counter screen, while Store B sees a 6-field screen with credit/status tracking.