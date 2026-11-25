**Yes — altering actual PostgreSQL column names from user settings is high-risk and not recommended.**  

However, **letting users customize column display names (and persisting those custom names in the database) is completely safe** if you store them as **metadata** rather than running `ALTER TABLE ... RENAME COLUMN` on the schema.

  

---

  

### Why Renaming Real Database Columns Is Risky

  

1. **Breaks Drizzle ORM & TypeScript Contracts**

   - [server/db/schema.ts](file:///c:/Users/Ghing/Documents/Inventory/server/db/schema.ts) (`inventoryItems`, `products`) and [src/types.ts](file:///c:/Users/Ghing/Documents/Inventory/src/types.ts) (`InventoryItem`) statically bind code to fixed column names (`sku`, `location`, `reorder_point`, `unit_cost`, etc.).

   - Renaming a column at runtime causes Drizzle queries, inserts, `drizzle-kit generate`, and `drizzle-kit push` to fail or drift out of sync with the database.

2. **Concurrent / Multi-User Breakage**

   - A schema change affects the entire table globally—if one user renames a column, in-flight API requests, reports, and other users' sessions break immediately.

3. **Migration, Seed, & Export Drift**

   - Existing migrations (`server/db/migrations/`), [server/db/seed.ts](file:///c:/Users/Ghing/Documents/Inventory/server/db/seed.ts), CSV exports, and JSON backup imports ([src/App.tsx](file:///c:/Users/Ghing/Documents/Inventory/src/App.tsx)) expect stable internal property keys.

4. **DDL & Identifier Hazards**

   - User-supplied strings in `ALTER TABLE` statements introduce SQL-injection risk if improperly escaped and can collide with PostgreSQL reserved words (`user`, `order`, `group`) or duplicate column names.

  

---

  

### Recommended Safe Architecture (Plan)

  

Keep all physical database column names fixed, and store user-customized column names as **persisted label mappings** in the database:

  

1. **Database Schema ([server/db/schema.ts](file:///c:/Users/Ghing/Documents/Inventory/server/db/schema.ts))**

   - Add a `jsonb` column (e.g., `inventory_column_labels`) to `workspace_settings` storing a map of internal key → display label:

     ```json

     {

       "sku": "Item Code",

       "location": "Warehouse Bin",

       "unitCost": "Wholesale Cost"

     }

     ```

   - *(Optional)* If users also want **new** custom columns later, add a `custom_fields` `jsonb` column on `inventory_items` / `products` and a `custom_field_definitions` `jsonb` array on `workspace_settings`—again avoiding `ALTER TABLE`.

  

2. **Frontend Types & Defaults ([src/types.ts](file:///c:/Users/Ghing/Documents/Inventory/src/types.ts) & [src/App.tsx](file:///c:/Users/Ghing/Documents/Inventory/src/App.tsx))**

   - Add `inventoryColumnLabels?: Partial<Record<InventoryColumnKey, string>>` to `WorkspaceSettings` with a `DEFAULT_INVENTORY_COLUMN_LABELS` fallback map.

  

3. **Settings UI ([src/pages/SettingsPage.tsx](file:///c:/Users/Ghing/Documents/Inventory/src/pages/SettingsPage.tsx))**

   - Add an **Inventory Columns** card where admins/managers can rename each column's display label (with validation for non-empty names and a **Reset to Defaults** action).

  

4. **Inventory UI & CSV Export ([src/pages/InventoryPage.tsx](file:///c:/Users/Ghing/Documents/Inventory/src/pages/InventoryPage.tsx))**

   - Read column headers, Add/Edit modal labels, mobile card labels, and CSV export headers from the label map (`settings.inventoryColumnLabels[key] ?? DEFAULT_LABELS[key]`).

   - All sorting, filtering, stock alerts, and backend queries continue using the stable internal keys without any risk.

  

If you'd like, I can implement this safe metadata-based column customization plan next.