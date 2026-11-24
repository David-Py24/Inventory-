import { pgTable, uuid, text, boolean, numeric, timestamp, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('Staff'),
  department: text('department').notNull().default(''),
  jobTitle: text('job_title'),
  phone: text('phone'),
  status: text('status').notNull().default('Active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastActive: timestamp('last_active', { withTimezone: true }),
});

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  institution: text('institution').notNull(),
  mask: text('mask').notNull(),
  category: text('category').notNull(),
  isLiability: boolean('is_liability').notNull().default(false),
  balance: numeric('balance', { precision: 14, scale: 2 }).notNull().default('0'),
  apyOrApr: text('apy_or_apr').notNull().default(''),
  lastSynced: text('last_synced').notNull().default(''),
});

export const inventoryItems = pgTable('inventory_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  sku: text('sku').notNull(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  location: text('location').notNull().default(''),
  supplier: text('supplier').notNull().default(''),
  quantity: integer('quantity').notNull().default(0),
  reorderPoint: integer('reorder_point').notNull().default(0),
  unitCost: numeric('unit_cost', { precision: 14, scale: 2 }).notNull().default('0'),
  lastUpdated: text('last_updated').notNull().default(''),
});

export const upcomingBills = pgTable('upcoming_bills', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  dueDate: text('due_date').notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  category: text('category').notNull().default(''),
  paid: boolean('paid').notNull().default(false),
});

export const sinkingFunds = pgTable('sinking_funds', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  saved: numeric('saved', { precision: 14, scale: 2 }).notNull().default('0'),
  target: numeric('target', { precision: 14, scale: 2 }).notNull().default('0'),
});

export const goals = pgTable('goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  saved: numeric('saved', { precision: 14, scale: 2 }).notNull().default('0'),
  target: numeric('target', { precision: 14, scale: 2 }).notNull().default('0'),
});

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  merchant: text('merchant').notNull(),
  date: text('date').notNull(),
  category: text('category').notNull().default(''),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
});

export const monthlyCashFlow = pgTable('monthly_cash_flow', {
  id: uuid('id').primaryKey().defaultRandom(),
  month: text('month').notNull(),
  income: numeric('income', { precision: 14, scale: 2 }).notNull().default('0'),
  expenses: numeric('expenses', { precision: 14, scale: 2 }).notNull().default('0'),
});

export const workspaceSettings = pgTable('workspace_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeName: text('store_name').notNull().default('HearthLedger'),
  workspaceSubtitle: text('workspace_subtitle').notNull().default('Financial Command Center'),
  ownerEmail: text('owner_email').notNull().default(''),
  currency: text('currency').notNull().default('USD'),
  defaultTimeframe: text('default_timeframe').notNull().default('this_month'),
  budgetCycleDay: text('budget_cycle_day').notNull().default('1'),
  defaultReorderPoint: integer('default_reorder_point').notNull().default(8),
  lowStockAlerts: boolean('low_stock_alerts').notNull().default(true),
  includeBillsInSafeToSpend: boolean('include_bills_in_safe_to_spend').notNull().default(false),
});
