export const BACKUP_TABLES = {
  users: 'users',
  accounts: 'accounts',
  inventory: 'inventory_items',
  sales: 'sales',
  bills: 'upcoming_bills',
  sinkingFunds: 'sinking_funds',
  goals: 'goals',
  transactions: 'transactions',
  monthlyCashFlow: 'monthly_cash_flow',
  settings: 'workspace_settings',
  utangCustomers: 'utang_customers',
  utangTransactions: 'utang_transactions',
} as const;

export type WorkspaceSnapshot = Record<keyof typeof BACKUP_TABLES, Record<string, unknown>[]>;
