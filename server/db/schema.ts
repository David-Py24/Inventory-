import { pgTable, uuid, text, boolean, numeric, timestamp, integer, date, check, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  username: text('username').unique(),
  email: text('email').unique(),
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
  storeName: text('store_name').notNull().default('TallyLedger'),
  workspaceSubtitle: text('workspace_subtitle').notNull().default('Financial Command Center'),
  ownerEmail: text('owner_email').notNull().default(''),
  currency: text('currency').notNull().default('USD'),
  defaultTimeframe: text('default_timeframe').notNull().default('this_month'),
  budgetCycleDay: text('budget_cycle_day').notNull().default('1'),
  defaultReorderPoint: integer('default_reorder_point').notNull().default(8),
  lowStockAlerts: boolean('low_stock_alerts').notNull().default(true),
  includeBillsInSafeToSpend: boolean('include_bills_in_safe_to_spend').notNull().default(false),
  // Display-only label overrides keyed by stable inventory column keys (never renames SQL columns)
  inventoryColumnLabels: jsonb('inventory_column_labels')
    .$type<Record<string, string>>()
    .notNull()
    .default(sql`'{}'::jsonb`),
});

// Starter MVP: master product catalog
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  skuCode: text('sku_code').unique(),
  name: text('name').notNull(),
  category: text('category').notNull().default('General'),
  costPrice: numeric('cost_price', { precision: 14, scale: 2 }).notNull().default('0'),
  retailPrice: numeric('retail_price', { precision: 14, scale: 2 }).notNull().default('0'),
  currentQty: integer('current_qty').notNull().default(0),
  reorderLevel: integer('reorder_level').notNull().default(5),
  isPinnedRestock: boolean('is_pinned_restock').notNull().default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Starter MVP: inventory batches for FIFO/expiration tracking
export const inventoryBatches = pgTable('inventory_batches', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  qtyRemaining: integer('qty_remaining').notNull().default(0),
  costPrice: numeric('cost_price', { precision: 14, scale: 2 }).notNull().default('0'),
  expiryDate: date('expiry_date'),
  receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
});

// Starter MVP: utang customer accounts
export const utangCustomers = pgTable('utang_customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  fullName: text('full_name').notNull(),
  alias: text('alias'),
  contactNumber: text('contact_number'),
  creditLimit: numeric('credit_limit', { precision: 14, scale: 2 }).notNull().default('500'),
  currentBalance: numeric('current_balance', { precision: 14, scale: 2 }).notNull().default('0'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Starter MVP: utang transaction ledger
export const utangTransactions = pgTable(
  'utang_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => utangCustomers.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    typeCheck: check('utang_transactions_type_check', sql`${table.type} IN ('CREDIT', 'PAYMENT')`),
  })
);

export const sales = pgTable('sales', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderNumber: text('order_number').notNull(),
  customerName: text('customer_name').notNull(),
  channel: text('channel').notNull().default('In-Store'),
  inventoryItemId: uuid('inventory_item_id').references(() => inventoryItems.id, {
    onDelete: 'set null',
  }),
  itemName: text('item_name').notNull(),
  sku: text('sku'),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: numeric('unit_price', { precision: 14, scale: 2 }).notNull().default('0'),
  status: text('status').notNull().default('Completed'),
  date: text('date').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
