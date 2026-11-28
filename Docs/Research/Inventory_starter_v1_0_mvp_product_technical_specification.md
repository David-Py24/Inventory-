# Inventory Starter (v1.0) — MVP Product & Technical Specification

**Target Tier:** Tindahan Starter (₱249 – ₱299/month B2B tier; ₱0 Founding Pilot for Sterling Sari-Sari Store)  
**Architecture:** Local-First Desktop/Web App (SQLite + Local Storage, Zero Cloud Hosting Overhead)  
**Design Goal:** Fit seamlessly into a **5–15 minute daily closing routine** with zero rush-hour counter friction.

---

## 1. Core MVP Priorities (The 4 Pillars)

### Pillar 1: Low-Stock Alerts
* **Objective:** Prevent unexpected stockouts of fast-moving consumer goods (coffee sachets, soft drinks, canned goods, load).
* **How It Works:**
  * Every SKU has a `current_qty` and a user-defined `reorder_level` (e.g., alert when *Kopiko Black 3-in-1* drops to `<= 10` sachets).
  * Dashboard displays a top-level alert banner divided into **Out of Stock (`0`)** and **Running Low (`<= reorder_level`)**.
  * Includes a **Quick-Deduct Closing Mode** (`-1`, `-5`, `-10` tap buttons) so owners can update daily movement in under 3 minutes at closing time without needing per-second POS scanning.

### Pillar 2: Restock Shopping List
* **Objective:** Replace manual weekly physical counts with an instant, actionable wholesaler/grocery checklist.
* **How It Works:**
  * Auto-populates all items where `current_qty <= reorder_level` OR items manually flagged via a **"Pin to Restock"** quick toggle during the day.
  * Displays `Item Name`, `Current Stock`, `Suggested Buy Qty`, `Last Unit Cost (Puhunan)`, and `Estimated Subtotal`.
  * Calculates **Total Estimated Puhunan Needed** at the bottom so the owner knows exact cash to bring to the wholesaler.
  * Supports one-click **Print / Copy to Messenger** formatting and a **"Mark Restocked"** button that automatically adds purchased quantities back into active inventory.

### Pillar 3: Expiration Date Tracker (FIFO Helper)
* **Objective:** Eliminate silent losses from expired or damaged goods sitting at the back of storage shelves.
* **How It Works:**
  * When logging newly purchased stock, the owner can optionally enter a `batch_expiry_date`.
  * Active batches are sorted chronologically by earliest expiration date.
  * Visual status badges automatically flag items:
    * **Red (`Expired` / `<= 7 days`):** Pull from shelf immediately or discount to clear.
    * **Amber (`8 – 30 days`):** Move to front display (First-In, First-Out priority).
    * **Green (`> 30 days`):** Safe stock.

### Pillar 4: Utang (Store Credit) Tracker
* **Objective:** Provide a dispute-proof digital ledger for neighboring sari-sari stores that extend credit to regular *suki* customers (essential for B2B scalability).
* **How It Works:**
  * Customer profiles store `Full Name`, `Nickname/Alias`, `Phone Number`, optional `Credit Limit`, and `Current Balance`.
  * Two primary action buttons per customer: **`+ Add Utang`** (with optional item note) and **`- Record Payment`**.
  * Immutable timestamped transaction history prevents arguments over old balances.
  * One-click **"Copy Payment Reminder"** generates a polite Tagalog/Bisaya/English SMS or Messenger note with the customer's exact balance.

---

## 2. Minimal-Risk SQLite Database Schema (For Reference only)

Designed for speed, zero external server dependencies, and easy single-file backups.
*(We'll use Supabase for it's Database)*

```sql
-- 1. Master Product Catalog
CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku_code TEXT UNIQUE,                  -- Optional barcode or short code
    name TEXT NOT NULL,                    -- e.g., "Great Taste White Twin Pack"
    category TEXT DEFAULT 'General',       -- Drinks, Sachets, Canned, Snacks, Load
    cost_price REAL NOT NULL DEFAULT 0,    -- Puhunan per piece/unit
    retail_price REAL NOT NULL DEFAULT 0,  -- Presyo per piece/unit
    current_qty INTEGER NOT NULL DEFAULT 0,
    reorder_level INTEGER NOT NULL DEFAULT 5,
    is_pinned_restock INTEGER DEFAULT 0,   -- 1 = Manually flagged for restock
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Inventory Batches (For Expiration Date Tracking)
CREATE TABLE inventory_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    qty_remaining INTEGER NOT NULL,
    cost_price REAL NOT NULL,
    expiry_date DATE,                      -- NULL if non-perishable
    received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 3. Utang Customer Accounts
CREATE TABLE utang_customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    alias TEXT,                            -- e.g., "Ate Jing - Kanto"
    contact_number TEXT,
    credit_limit REAL DEFAULT 500.00,
    current_balance REAL NOT NULL DEFAULT 0.00,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Utang Transaction Ledger
CREATE TABLE utang_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    type TEXT CHECK(type IN ('CREDIT', 'PAYMENT')) NOT NULL,
    amount REAL NOT NULL,
    notes TEXT,                            -- e.g., "2x Sardines, 1x Bigas 1kg"
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES utang_customers(id) ON DELETE CASCADE
);
```

---

## 3. Daily Store Workflow (Under 10 Minutes/Day)

1. **During Store Hours (Zero Friction):**
   * Store operates normally using cash/GCash.
   * If a customer takes *utang*, log it in `< 30 seconds` on the Utang tab.
   * If a shelf jar looks empty, tap **"Pin to Restock"** on that item.
2. **At Closing Time (5–10 Minutes):**
   * Open **Quick-Deduct Mode** and tap down daily movement on fast-moving items.
   * Review **Low-Stock Alerts** and **Expiring Soon** cards on the dashboard.
3. **Before Wholesaler / Grocery Run (2 Minutes):**
   * Open the **Restock Shopping List**, review total estimated *puhunan*, copy/print the list, and tap **"Mark Restocked"** (with optional expiry dates) once groceries arrive.

---

## 4. Strict v1.0 Guardrails (What NOT to Build Yet)
* **No Cloud Sync / Multi-Branch Auth:** Keep data 100% local on the store's laptop/PC with a simple "Export Backup" button.
* **No Automated SMS Gateways:** Use copy-paste message templates instead of paying telecom API fees.
* **No Complex Accounting / Tax Modules:** Stick strictly to *Puhunan*, *Presyo*, stock counts, and *Utang* balances.