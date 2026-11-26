import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';

const defaultDbPath = path.resolve(process.cwd(), 'data', 'tallyledger.db');
export const SQLITE_DB_PATH = process.env.SQLITE_DB_PATH || defaultDbPath;

fs.mkdirSync(path.dirname(SQLITE_DB_PATH), { recursive: true });

export const sqlite = new DatabaseSync(SQLITE_DB_PATH);
sqlite.exec('PRAGMA journal_mode = WAL;');
sqlite.exec('PRAGMA foreign_keys = ON;');

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Staff',
    department TEXT NOT NULL DEFAULT '',
    job_title TEXT,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TEXT NOT NULL,
    last_active TEXT
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    institution TEXT NOT NULL,
    mask TEXT NOT NULL,
    category TEXT NOT NULL,
    is_liability INTEGER NOT NULL DEFAULT 0,
    balance REAL NOT NULL DEFAULT 0,
    apy_or_apr TEXT NOT NULL DEFAULT '',
    last_synced TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS inventory_items (
    id TEXT PRIMARY KEY,
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    location TEXT NOT NULL DEFAULT '',
    supplier TEXT NOT NULL DEFAULT '',
    quantity INTEGER NOT NULL DEFAULT 0,
    reorder_point INTEGER NOT NULL DEFAULT 0,
    unit_cost REAL NOT NULL DEFAULT 0,
    last_updated TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    order_number TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'In-Store',
    inventory_item_id TEXT REFERENCES inventory_items(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    sku TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Completed',
    date TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS upcoming_bills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    due_date TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL DEFAULT '',
    paid INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS sinking_funds (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    saved REAL NOT NULL DEFAULT 0,
    target REAL NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    saved REAL NOT NULL DEFAULT 0,
    target REAL NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    merchant TEXT NOT NULL,
    date TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT '',
    amount REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS monthly_cash_flow (
    id TEXT PRIMARY KEY,
    month TEXT NOT NULL,
    income REAL NOT NULL DEFAULT 0,
    expenses REAL NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS workspace_settings (
    id TEXT PRIMARY KEY,
    store_name TEXT NOT NULL DEFAULT 'TallyLedger',
    workspace_subtitle TEXT NOT NULL DEFAULT 'Financial Command Center',
    owner_email TEXT NOT NULL DEFAULT '',
    currency TEXT NOT NULL DEFAULT 'USD',
    default_timeframe TEXT NOT NULL DEFAULT 'this_month',
    budget_cycle_day TEXT NOT NULL DEFAULT '1',
    default_reorder_point INTEGER NOT NULL DEFAULT 8,
    low_stock_alerts INTEGER NOT NULL DEFAULT 1,
    include_bills_in_safe_to_spend INTEGER NOT NULL DEFAULT 0,
    inventory_column_labels TEXT NOT NULL DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS sync_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

export function newId(): string {
  return crypto.randomUUID();
}

export function withSqliteTransaction<T>(fn: () => T): T {
  sqlite.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    sqlite.exec('COMMIT');
    return result;
  } catch (err) {
    sqlite.exec('ROLLBACK');
    throw err;
  }
}

export function getSyncMeta(key: string): string | null {
  const row = sqlite.prepare('SELECT value FROM sync_metadata WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  return row ? row.value : null;
}

export function setSyncMeta(key: string, value: string): void {
  sqlite
    .prepare(
      `INSERT INTO sync_metadata (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
    .run(key, value, new Date().toISOString());
}

// Migrate existing users table if created before username / nullable email
function ensureUsersSchemaMigration(): void {
  const cols = sqlite.prepare('PRAGMA table_info(users)').all() as Array<{
    name: string;
    notnull: number;
  }>;
  const hasUsername = cols.some((c) => c.name === 'username');
  const emailCol = cols.find((c) => c.name === 'email');
  if (hasUsername && emailCol && emailCol.notnull === 0) return;

  sqlite.exec('PRAGMA foreign_keys = OFF;');
  sqlite.exec('BEGIN IMMEDIATE;');
  try {
    sqlite.exec(`
      CREATE TABLE users_migrated (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        username TEXT UNIQUE,
        email TEXT UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'Staff',
        department TEXT NOT NULL DEFAULT '',
        job_title TEXT,
        phone TEXT,
        status TEXT NOT NULL DEFAULT 'Active',
        created_at TEXT NOT NULL,
        last_active TEXT
      );
    `);

    if (hasUsername) {
      sqlite.exec(`
        INSERT INTO users_migrated (id, name, username, email, password_hash, role, department, job_title, phone, status, created_at, last_active)
        SELECT id, name, username, email, password_hash, role, department, job_title, phone, status, created_at, last_active FROM users;
      `);
    } else {
      sqlite.exec(`
        INSERT INTO users_migrated (id, name, username, email, password_hash, role, department, job_title, phone, status, created_at, last_active)
        SELECT id, name,
          CASE WHEN email = 'admin@tallyledger.local' THEN 'admin' ELSE NULL END,
          email, password_hash, role, department, job_title, phone, status, created_at, last_active FROM users;
      `);
    }

    sqlite.exec('DROP TABLE users;');
    sqlite.exec('ALTER TABLE users_migrated RENAME TO users;');
    sqlite.exec('COMMIT;');
  } catch (err) {
    sqlite.exec('ROLLBACK;');
    throw err;
  } finally {
    sqlite.exec('PRAGMA foreign_keys = ON;');
  }
}

ensureUsersSchemaMigration();

// Seed default local admin & settings if database is brand new (offline-first ready)
function ensureLocalBootstrap(): void {
  const existingUser = sqlite.prepare('SELECT id FROM users LIMIT 1').get();
  if (!existingUser) {
    const passwordHash = bcrypt.hashSync('password123', 10);
    const now = new Date().toISOString();
    sqlite
      .prepare(
        `INSERT INTO users (id, name, username, email, password_hash, role, department, status, created_at, last_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        newId(),
        'Demo Admin',
        'admin',
        'admin@tallyledger.local',
        passwordHash,
        'Admin',
        'Finance',
        'Active',
        now,
        now
      );
  }

  const existingSettings = sqlite.prepare('SELECT id FROM workspace_settings LIMIT 1').get();
  if (!existingSettings) {
    sqlite
      .prepare(
        `INSERT INTO workspace_settings (
          id, store_name, workspace_subtitle, owner_email, currency,
          default_timeframe, budget_cycle_day, default_reorder_point,
          low_stock_alerts, include_bills_in_safe_to_spend, inventory_column_labels
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        newId(),
        'TallyLedger',
        'Financial Command Center',
        'admin@tallyledger.local',
        'USD',
        'this_month',
        '1',
        8,
        1,
        0,
        '{}'
      );
  }
}

ensureLocalBootstrap();
