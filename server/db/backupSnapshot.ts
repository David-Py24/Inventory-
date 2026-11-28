import { sqlite, withSqliteTransaction } from './sqlite.js';
import { BACKUP_TABLES, type WorkspaceSnapshot } from './backupTables.js';

export function readWorkspaceSnapshot(): { snapshot: WorkspaceSnapshot; counts: Record<string, number> } {
  const snapshot = {} as WorkspaceSnapshot;
  const counts: Record<string, number> = {};
  for (const [key, table] of Object.entries(BACKUP_TABLES) as [keyof typeof BACKUP_TABLES, string][]) {
    const rows = sqlite.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];
    snapshot[key] = rows;
    counts[key] = rows.length;
  }
  return { snapshot, counts };
}

const DELETE_ORDER: (keyof typeof BACKUP_TABLES)[] = [
  'sales',
  'utangTransactions',
  'utangCustomers',
  'inventory',
  'accounts',
  'bills',
  'sinkingFunds',
  'goals',
  'transactions',
  'monthlyCashFlow',
  'settings',
  'users',
];

const INSERT_ORDER: (keyof typeof BACKUP_TABLES)[] = [
  'users',
  'accounts',
  'inventory',
  'utangCustomers',
  'utangTransactions',
  'sales',
  'bills',
  'sinkingFunds',
  'goals',
  'transactions',
  'monthlyCashFlow',
  'settings',
];

/** Replace the request-local SQLite projection with a persisted workspace snapshot. */
export function restoreWorkspaceSnapshot(value: unknown): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Persisted workspace state is invalid.');
  }
  const snapshot = value as Partial<WorkspaceSnapshot>;
  for (const key of Object.keys(BACKUP_TABLES) as (keyof typeof BACKUP_TABLES)[]) {
    if (!Array.isArray(snapshot[key])) {
      throw new Error(`Persisted workspace state is missing table ${key}.`);
    }
  }

  withSqliteTransaction(() => {
    for (const key of DELETE_ORDER) {
      sqlite.exec(`DELETE FROM ${BACKUP_TABLES[key]}`);
    }

    for (const key of INSERT_ORDER) {
      const table = BACKUP_TABLES[key];
      const availableColumns = new Set(
        (sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map((column) => column.name)
      );
      const rows = snapshot[key] as Record<string, unknown>[];
      for (const row of rows) {
        if (!row || typeof row !== 'object' || Array.isArray(row)) {
          throw new Error(`Persisted workspace state contains an invalid row in ${key}.`);
        }
        const columns = Object.keys(row).filter((column) => availableColumns.has(column));
        if (columns.length === 0) continue;
        const placeholders = columns.map(() => '?').join(', ');
        const values = columns.map((column) => row[column] ?? null);
        sqlite
          .prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`)
          .run(...values);
      }
    }
  });
}
