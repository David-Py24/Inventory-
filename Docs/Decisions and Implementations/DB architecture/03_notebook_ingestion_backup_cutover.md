# 03 — Historical Notebook Ingestion, 3-Tier Backup & Cutover Checklist

## 1. Importing Legacy Sales Notebooks (Zero Stock Distortion)

For itemized handwritten sales logs (e.g., Sept 25 – Nov 7, 2023 records formatted as `Date | Qty | Product | Sales`):

1. **Derive unit price:** Compute `unit_price = Sales / Qty` during CSV staging.
2. **Protect live shelf counts:** Set `record_source = 'NOTEBOOK_ARCHIVE'` and `deduct_stock = false` so historical revenue powers YoY seasonality and SKU velocity reports without subtracting from current physical inventory.
3. **Establish inventory cutover day:** Perform one physical shelf count before the live POS launch to set opening `stock_qty` (Day 0), then enable `deduct_stock = true` for all subsequent `POS_LIVE` transactions.

---

## 2. 3-Tier Storage & Backup Topology (3-2-1 Resilience)

Capacity benchmarks put ~32,000 sales entries/year at **~20–35 MB/year** in SQLite/Postgres. That allows decades of operation on modest local hardware and within Supabase's 500 MB Free Tier.

```text
┌─────────────────────────────┐
│ TIER 1: EDGE COUNTER DEVICE │  SQLite (WAL Mode, synchronous = NORMAL)
│ (Authoritative Operational) │  • Instant offline counter writes
└──────────────┬──────────────┘
               │ Hourly `VACUUM INTO` snapshot over LAN
               ▼
┌─────────────────────────────┐
│ TIER 2: LOCAL HUB / LAPTOP  │  Local backup host (upgradeable to RAID 1 NAS)
│ (On-Premise Redundancy)     │  • Stores hourly `.db` snapshots + weekly `.db.zst`
└──────────────┬──────────────┘
               │ Scheduled backup / weekly roll-up
               ▼
┌─────────────────────────────┐
│ TIER 3: SUPABASE CLOUD      │  • Postgres: Drizzle-managed tables + weekly summaries
│ (Off-Site Disaster Mirror)  │  • Storage: Zstd-compressed `.db.zst` archives (~3 MB/yr)
└─────────────────────────────┘
```

---

## 3. Migration & Cutover Checklist

1. **Back up current state:** Create a timestamped copy of the local SQLite database file and verify connectivity to `DATABASE_URL`. Also take a `pg_dump` before touching Supabase.
2. **Generate the Drizzle migration:** Update `server/db/schema.ts` with the additive columns from `02_drizzle_schema_extensions.md`, then run:

   ```bash
   npx drizzle-kit generate
   ```

3. **Apply and verify locally:** Run `npm run db:migrate` against the local development database and confirm existing records keep valid defaults (`deduct_stock = true`, `conversion_factor = 1.000`).
4. **Deploy to Supabase:** Push the checked-in migration file (e.g., `0005_retail_extensions.sql`) to `main` to trigger `.github/workflows/deploy-db-migrations.yml` (using the IPv4 Session Pooler `SUPABASE_DATABASE_URL`), then confirm schema alignment.
