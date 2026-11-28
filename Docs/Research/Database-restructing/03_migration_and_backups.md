# 03 — Testing-Phase Migration & 3-Tier Backup Playbook

## 1. Clean Reset & Migration Steps (Testing → Retail-Twin Schema)

Because TallyLedger is still in testing without live production ledger locks, execute a clean reset so legacy equipment columns do not linger:

1. **Export any useful test items:** Dump existing test products to CSV if needed (`sku, name, unitCost`).
2. **Reset local counter SQLite:**
   - Close the app/worker so no `-wal` or `-shm` locks remain.
   - Rename the old file (`tallyledger_legacy_test.db.bak`) and initialize a fresh `tallyledger.db` using `02_drop_in_database_template.md`.
   - Seed `store_config` with your store's `store_id` (e.g., `STORE_ILIGAN_01`) and `business_type = 'SARI_SARI'`.
3. **Reset Supabase test tables:**
   - In the Supabase SQL Editor, drop the old equipment test tables (`DROP TABLE IF EXISTS ... CASCADE;`) and run the PostgreSQL DDL from `02_drop_in_database_template.md`.
   - Insert your matching `store_config` row linked to your `auth.uid()`.
4. **Update the data-access layer:**
   - Map snake_case DB columns (`unit_price`, `base_unit`, `deduct_stock`) to camelCase `types.ts` fields (`unitPrice`, `baseUnit`, `deductStock`).
   - Ensure every `INSERT`/`UPDATE` writes a JSON payload to `sync_outbox` inside the same SQLite transaction.

---

## 2. Historical Notebook Ingestion (Sept 25 – Nov 7, 2023 Backlog)

Your handwritten notebooks (`Date | Qty | Product | Sales`) contain ~1,920 to 3,840 entries per 80-leaf book (~20–38 MB per 10 books). Import them without affecting live 2026 inventory:

1. **Transcribe to a 4-column CSV:** `Date, Qty, Product, Sales`.
2. **Normalize during import:**
   - Calculate `unit_price = Sales / Qty`.
   - Check `products` (`canonical_name` and `aliases_json`); if missing, auto-generate a deterministic synthetic SKU `GEN-ST01-<SLUG>` with `is_auto_generated_sku = 1`.
   - Set `record_source = 'NOTEBOOK_ARCHIVE'` and `deduct_stock = 0` so historical revenue builds 2023–2026 trend reports without subtracting from current shelf counts.
3. **Day-0 physical inventory cutover:** Perform one physical count of current shelves, enter opening `stock_qty`, and switch `deduct_stock = 1` for all live POS sales.

---

## 3. 3-Tier Local-First Backup & Sustainability Architecture

This topology keeps checkout 100% offline-capable at the counter while eliminating single-drive hardware risk and staying well within Supabase's Free Tier (500 MB DB + 1 GB Storage) for decades.

```text
┌───────────────────────────┐
│ TIER 1: EDGE COUNTER PC   │  SQLite (WAL Mode) -> < 5 ms offline checkout
│ (Single Source of Truth)  │  Writes to local tables + `sync_outbox`
└─────────────┬─────────────┘
              │ (1) LAN Sync + Hourly `VACUUM INTO` Snapshot
              ▼
┌───────────────────────────┐
│ TIER 2: SELF-HOSTING      │  Receives hourly `.db` snapshots over SMB/LAN
│ LAPTOP (Future RAID1 NAS) │  Runs local Postgres + compresses weekly `.db.zst`
└─────────────┬─────────────┘
              │ (2) Background Relay (when internet available)
              ▼
┌───────────────────────────┐
│ TIER 3: SUPABASE CLOUD    │  • Postgres: `weekly_sales_summary` (~1 MB/yr)
│ (Off-Site Disaster Mirror)│  • Storage: `archive_YYYY_Www.db.zst` (~3 MB/yr)
└───────────────────────────┘
```

### Automated Backup Schedule

**Hourly (Counter PC → Self-Hosting Laptop):** Run SQLite's `VACUUM INTO`, which is safe while the counter is actively selling:

```bash
sqlite3 /data/tallyledger.db "VACUUM INTO '/mnt/laptop_backup/hourly/tally_$(date +%Y%m%d_%H).db';"
```

Retain the last 48 hourly files; delete older hourly files automatically.

**Weekly, Sunday 11:00 PM (Self-Hosting Laptop → Supabase):**

1. **Compress the full database snapshot:** Compress the latest clean SQLite snapshot with Zstandard and upload it to a private `db-archives` bucket in **Supabase Storage** (1 GB free quota = 250+ years). This shrinks ~25 MB/year of raw rows to ~2.5–4 MB/year.

   ```bash
   zstd -19 tally_latest.db -o tally_2026_W48.db.zst
   ```

2. **Upsert the weekly roll-up row:** Push 1 summary row into Supabase Postgres `weekly_sales_summary` (< 1 MB/year = 400+ years inside the 500 MB database cap). This also prevents the Supabase Free Tier from auto-pausing after 7 days of inactivity.

---

## 4. Disaster Recovery Playbook

- **Scenario A — Counter PC SSD dies:** Buy/boot a replacement PC, copy the latest `.db` snapshot from the self-hosting laptop, and reopen the POS in under 15 minutes.
- **Scenario B — Self-hosting laptop fails (or upgrading to a dual-bay NAS):** The counter PC keeps operating offline without interruption. Point the hourly SMB target and outbox worker IP to the replacement laptop or RAID 1 NAS.
- **Scenario C — Total local loss (flood / fire / theft):** Download the latest `tally_YYYY_Www.db.zst` from Supabase Storage, decompress it (`unzstd`), and restore the complete transaction history onto new hardware.
