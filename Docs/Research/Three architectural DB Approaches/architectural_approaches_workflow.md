# TallyLedger: Three-Layer Architectural Approaches & Workflow

## 1. Core Design Philosophy: Unified Layers, Not Competing Options
Approaches A, B, and C are **not mutually exclusive menu choices**. Instead, they operate together as a single cohesive pipeline split between **TallyLedger's permanent database schema** and **the user-facing UI/import layer**:

* **Inside the Database (Approaches A + B):** Every counter terminal, self-hosting laptop, and Supabase instance runs the **exact same database schema**. Sync workers never have to translate between different table structures across stores.
* **On the User's End (UI Feature Flags + Approach C):** Store owners never see database columns they do not use. Configuration flags and an import mapping adapter dynamically shape the user's screen and normalize incoming data before it touches the database.

---

## 2. Detailed Breakdown of the Three Approaches

### Approach A: Superset Core Table + Nullable Defaults (Database Layer)
TallyLedger's core `sales` table is built as the **superset (union)** of all standard retail fields, separating strict mathematical columns from optional store-specific columns:
* **Strict Core Fields (`NOT NULL`):** `sale_id`, `store_id`, `sku`, `product_name`, `quantity`, `unit_price`, `sold_at`.
* **Optional Superset Fields (`NULL` / Defaults):** `customer_name` (defaults to `NULL`), `status` (defaults to `'COMPLETED'`).

```text
[ STORE A UI: 4 Fields ]                    [ STORE B UI: 6 Fields ]
  Product, SKU, Qty, Price                    Customer, Product, SKU, Qty, Price, Status
         │                                           │
         ▼                                           ▼
  (store_config fills defaults)              (All 6 fields passed directly)
   + customer_name = NULL
   + status        = 'COMPLETED'
         │                                           │
         └─────────────────────┬─────────────────────┘
                               ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ TALLYLEDGER CORE TABLE: sales (Superset Schema)                            │
├──────────┬───────────────┬──────────────┬─────┬───────┬───────────┬────────┤
│ store_id │ sku           │ product_name │ qty │ price │ customer  │ status │
├──────────┼───────────────┼──────────────┼─────┼───────┼───────────┼────────┤
│ STORE_A  │ 4801981116014 │ Coke Mismo   │  2  │ 15.00 │ NULL      │ COMP.. │
│ STORE_B  │ 4800361390811 │ Bear Brand.. │  5  │ 12.00 │ Juan Cruz │ UTANG  │
└──────────┴───────────────┴──────────────┴─────┴───────┴───────────┴────────┘
```

### Approach B: Hybrid Relational + JSON Column (Database Extensibility Layer)
To prevent future schema migrations when Store C or D introduces custom fields (such as `delivery_rider`, `senior_id`, or `notebook_page`), the `sales` table includes a single `extra_metadata` column (`TEXT` JSON in SQLite, `JSONB` in PostgreSQL):
* Universal reporting columns (`quantity`, `unit_price`, `total_amount`, `sku`) remain strictly typed for fast SQL aggregation across all stores.
* Store-specific custom attributes are packed cleanly into `extra_metadata` (e.g., `{"delivery_rider": "Kuya Ben", "notebook_page": 14}`).

### Approach C: Import Staging & Column-Mapping Adapter (Ingestion Layer)
When stores upload existing spreadsheets or transcribed notebook CSVs, raw files never write directly to live POS tables. Instead, data passes through a 3-stage pipeline:
1. **Quarantine / Staging (`raw_imports`):** Ingests raw rows safely so malformed numbers or missing text never corrupt active ledger balances.
2. **Per-Store Mapping Profile (`store_config.column_mapping_json`):** Translates store-specific headers (e.g., `Paninda` $\rightarrow$ `product_name`, `SRP` $\rightarrow$ `unit_price`), injects missing defaults (`status = 'COMPLETED'`), and resolves missing SKUs.
3. **Atomic Transaction Commit:** Validates all rows and commits clean records into `sales` inside a single SQLite `BEGIN TRANSACTION ... COMMIT` block.

---

## 3. Application Logic (`if-else` Handshake)
At the counter, `store_config` drives a simple conditional payload builder on the user's device, producing a uniform object that executes the **exact same `INSERT` query** regardless of store type:

```javascript
function buildSalePayload(currentStore, formInput) {
  // Base payload (Approach A defaults + Approach B JSON bucket)
  const saleRecord = {
    sale_id: generateUUIDv7(),
    store_id: currentStore.store_id,
    sku: resolveSKU(currentStore.store_id, formInput.productName, formInput.sku),
    product_name: formInput.productName.trim(),
    quantity: Number(formInput.qty),
    unit_price: Number(formInput.price),
    customer_name: null,
    status: currentStore.default_status, // 'COMPLETED'
    record_source: 'POS_LIVE',
    deduct_stock: true,
    extra_metadata: {},
    sold_at: new Date().toISOString()
  };

  // Conditional branch for Store B+ features
  if (currentStore.require_customer_name && formInput.customerName) {
    saleRecord.customer_name = formInput.customerName.trim();
  }

  if (currentStore.require_status && formInput.status) {
    saleRecord.status = formInput.status; // e.g., 'UTANG', 'PARTIAL', 'PAID'
  }

  // Conditional branch for custom store metadata (Approach B)
  if (formInput.customFields && Object.keys(formInput.customFields).length > 0) {
    saleRecord.extra_metadata = formInput.customFields;
  }

  // Uniform database write across every store installation
  return db.insert('sales', saleRecord);
}
```