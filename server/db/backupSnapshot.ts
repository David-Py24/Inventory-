import { sqlite } from './sqlite.js';
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
