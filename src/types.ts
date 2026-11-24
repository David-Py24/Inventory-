export type PageRoute = 'dashboard' | 'inventory' | 'reports' | 'accounts' | 'settings' | 'profile';

export type TimeframeKey = 'this_month' | 'last_month' | 'quarter' | 'ytd';

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'PHP' | 'CAD' | 'AUD' | 'JPY';

export interface WorkspaceSettings {
  storeName: string;
  workspaceSubtitle: string;
  ownerEmail: string;
  currency: CurrencyCode;
  defaultTimeframe: TimeframeKey;
  budgetCycleDay: '1' | '15' | 'last';
  defaultReorderPoint: number;
  lowStockAlerts: boolean;
  includeBillsInSafeToSpend: boolean;
}

export interface SpendingCategory {
  id: string;
  name: string;
  percentage: number;
  amount: number;
  color: string;
}

export interface MonthlyCashFlow {
  month: string;
  income: number;
  expenses: number;
}

export interface UpcomingBill {
  id: string;
  name: string;
  dueDate: string;
  amount: number;
  category: string;
  paid: boolean;
}

export interface SinkingFund {
  id: string;
  name: string;
  saved: number;
  target: number;
}

export interface GoalItem {
  id: string;
  name: string;
  saved: number;
  target: number;
}

export interface TransactionRecord {
  id: string;
  merchant: string;
  date: string;
  category: string;
  amount: number;
}

export type InventoryStatus = 'In Stock' | 'Low Stock' | 'Out of Stock';

export type InventoryCategory =
  | 'Equipment'
  | 'Electronics'
  | 'Office & Studio'
  | 'Packaging'
  | 'Raw Materials';

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: InventoryCategory;
  location: string;
  supplier: string;
  quantity: number;
  reorderPoint: number;
  unitCost: number;
  lastUpdated: string;
}

export type AccountCategory = 'Checking' | 'Savings' | 'Investment' | 'Credit' | 'Loan';

export interface AccountRecord {
  id: string;
  name: string;
  institution: string;
  mask: string;
  category: AccountCategory;
  isLiability: boolean;
  balance: number;
  apyOrApr: string;
  lastSynced: string;
}

export type UserRole = 'Admin' | 'Manager' | 'Staff';

export type UserStatus = 'Active' | 'Suspended';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department: string;
  jobTitle?: string;
  phone?: string;
  status: UserStatus;
  createdAt: string;
  lastActive: string;
}
