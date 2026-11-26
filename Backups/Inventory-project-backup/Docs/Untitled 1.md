**Yes — splitting the work across `feature/starter-database` and `feature/starter-frontend` keeps `master` completely safe**, provided you still use the **metadata (`jsonb`) approach** rather than renaming physical SQL columns (since `ALTER TABLE RENAME COLUMN` would still break Drizzle, TypeScript, and seeds on the feature branch itself).

### **Two Isolation Rules to Keep in Mind**

1. **Clean working tree before switching branches:** You are currently on `feature/starter-frontend` with uncommitted edits in both `src/` and `server/`. Commit or stash those changes before checking out `feature/starter-database` so edits don't leak across branches.
2. **Git branches don't isolate PostgreSQL:** As noted in Docs/database-branch-plan.md, test migrations on a **separate Supabase branch or local dev DB** (`DATABASE_URL` in `.env`) before touching the main database.

---

### **Two-Branch Execution Plan**

#### **1. `feature/starter-database` — Schema & Migration**

- **Goal:** Add the persisted column-label metadata without altering existing column names.
- **Steps:**
    1. Commit/stash current work on `feature/starter-frontend`, then switch to `feature/starter-database`.
    2. In server/db/schema.ts, add a `jsonb` column (e.g., `inventory_column_labels`) to `workspaceSettings` defaulting to `{}`.
    3. Run `npm run db:generate` and validate against your dev/Supabase branch with `npm run db:push` and `npm run db:studio`.
    4. Commit only the schema, generated migration (`server/db/migrations/`), and any seed updates.

#### **2. `feature/starter-frontend` — Settings UI & Inventory Labels**

- **Goal:** Let users customize and reset column display names while keeping `localStorage` fallback intact.
- **Steps:**
    1. Switch back to `feature/starter-frontend` (and optionally merge/rebase `feature/starter-database` once ready).
    2. Add `inventoryColumnLabels?: Partial<Record<InventoryColumnKey, string>>` to `WorkspaceSettings` in src/types.ts and default labels in src/App.tsx.
    3. Add an **Inventory Columns** section in src/pages/SettingsPage.tsx with inputs for each column label and a **Reset to Defaults** button.
    4. Update src/pages/InventoryPage.tsx (desktop table headers, mobile cards, Add/Edit modal labels, and CSV export headers) to read from `settings.inventoryColumnLabels` with fallback to defaults.
    5. Verify with `npm run lint` and `npm run build`.

#### **3. Safe Merge Order into `master`**

1. Merge `feature/starter-database` → `master` and apply the migration to the target DB.
2. _(If backend routes are updated for `workspace_settings`)_ Merge `feature/starter-backend` → `master`.
3. Merge `feature/starter-frontend` → `master`.

This guarantees `master` always has the schema in place before the UI/API reads or writes `inventory_column_labels`, and you can roll back or discard either feature branch without affecting `master`.