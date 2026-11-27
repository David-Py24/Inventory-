# TallyLedger: Problem Statement & Multi-Store Schema Challenge

## 1. Background & Architectural Context
TallyLedger is a premade retail Point-of-Sale (POS) and ledger application designed around a **local-first, 3-tier relay architecture**:
1. **Edge Tier (Counter Terminal):** Local SQLite database running in `WAL` mode for instant (< 5 ms), offline-first checkout reliability during brownouts or ISP outages.
2. **Local Hub Tier (Self-Hosting Laptop / Dual-Bay NAS):** LAN consolidation node handling hourly SQLite snapshots (`VACUUM INTO`), multi-store batch aggregation, and network retry logic.
3. **Off-Site Disaster Recovery Tier (Supabase PostgreSQL):** Asynchronous cloud mirror using Row-Level Security (`store_id`) and weekly roll-up summaries/compressed archives (`.db.zst`) for long-term sustainability.

Because this stack easily sustains 10 to 15+ neighborhood stores (sari-sari stores) simultaneously while using less than 1% of its write throughput capacity, onboarding friends' and relatives' stores—as well as digitizing legacy sales notebooks—is a core capability.

---

## 2. The Core Problem: Heterogeneous Store Recording Habits
When a premade application ships with rigid, fixed database tables, onboarding multiple independent stores or historical paper notebooks immediately creates **schema friction**. Different stores track different levels of detail at the counter:

* **Store A (Minimalist Cash Counter — 4 Fields):**
  Records only the bare essentials for fast walk-in transactions:
  * `Product Name`
  * `SKU`
  * `Quantity`
  * `Unit Price`
* **Store B (Credit / *Utang* & Order Tracking — 6 Fields):**
  Records customer identity and payment status alongside item math:
  * `Customer Name` (*Suki*)
  * `Product Name`
  * `SKU`
  * `Quantity`
  * `Unit Price`
  * `Status` (e.g., `COMPLETED`, `UTANG`, `PARTIAL`, `VOID`)
* **Store C & Historical Notebooks (Irregular / Unbarcoded Logs):**
  * Future stores may introduce ad-hoc fields (e.g., `Delivery Rider`, `Senior/PWD ID`, or `Notebook Page`).
  * Legacy handwritten notebooks (e.g., Sept 25 – Nov 7, 2023 logs) often list only `Product Name`, `Quantity`, and `Unit Price` with **no SKUs** and **no starting inventory counts**.

---

## 3. What Breaks Without Schema Normalization
If TallyLedger attempts to ingest data from Store A, Store B, and legacy notebooks directly into a naive, rigid `sales` table, four critical failures occur:

1. **Database Constraint Rejections (`NOT NULL` Failures):**
   If the `sales` table enforces `customer_name` or `status` as `NOT NULL` without defaults, every sale logged by Store A is rejected by SQLite/PostgreSQL.
2. **Silent Data Loss & Broken Reporting:**
   If the `sales` table only contains Store A's 4 columns, Store B's `customer_name` and `status` values are dropped or crammed into unstructured text notes—making credit (*utang*) balances impossible to query.
3. **Spreadsheet / CSV Import Crashes:**
   Different stores export spreadsheets with localized or inconsistent column headers (`Paninda`, `Item`, `Product Name`, `Presyo`, `SRP`, `Suki`), causing rigid parsers to fail or misalign columns.
4. **Fragmented SKU Analytics & Phantom Stock Deductions:**
   * Unbarcoded items or handwritten product names (`"Coke Mismo"` vs. `"Coke 295ml"`) fail foreign-key SKU checks or split identical products across separate rows.
   * Importing historical notebook sales without source flags erroneously deducts 2023 sales from live 2026 shelf inventory.