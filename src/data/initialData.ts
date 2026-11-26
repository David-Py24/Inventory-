import {
  AccountRecord,
  GoalItem,
  InventoryItem,
  MonthlyCashFlow,
  SaleRecord,
  SinkingFund,
  SpendingCategory,
  TimeframeKey,
  TransactionRecord,
  UpcomingBill,
  UserAccount,
} from '../types';

export const TIMEFRAME_METRICS: Record<
  TimeframeKey,
  {
    label: string;
    cashFlow: number;
    amountLeftToSpend: number;
    totalSpent: number;
    incomeLeftToBudget: number;
    budgetedExpenses: number;
    plannedBudget: number;
    spentBudget: number;
    spendingBreakdown: SpendingCategory[];
  }
> = {
  this_month: {
    label: 'This Month',
    cashFlow: 0,
    amountLeftToSpend: 0,
    totalSpent: 0,
    incomeLeftToBudget: 0,
    budgetedExpenses: 0,
    plannedBudget: 0,
    spentBudget: 0,
    spendingBreakdown: [],
  },
  last_month: {
    label: 'Last Month',
    cashFlow: 0,
    amountLeftToSpend: 0,
    totalSpent: 0,
    incomeLeftToBudget: 0,
    budgetedExpenses: 0,
    plannedBudget: 0,
    spentBudget: 0,
    spendingBreakdown: [],
  },
  quarter: {
    label: 'This Quarter',
    cashFlow: 0,
    amountLeftToSpend: 0,
    totalSpent: 0,
    incomeLeftToBudget: 0,
    budgetedExpenses: 0,
    plannedBudget: 0,
    spentBudget: 0,
    spendingBreakdown: [],
  },
  ytd: {
    label: 'Year to Date',
    cashFlow: 0,
    amountLeftToSpend: 0,
    totalSpent: 0,
    incomeLeftToBudget: 0,
    budgetedExpenses: 0,
    plannedBudget: 0,
    spentBudget: 0,
    spendingBreakdown: [],
  },
};

export const INITIAL_MONTHLY_CASH_FLOW: MonthlyCashFlow[] = [];

export const INITIAL_UPCOMING_BILLS: UpcomingBill[] = [];

export const INITIAL_SINKING_FUNDS: SinkingFund[] = [];

export const INITIAL_GOALS: GoalItem[] = [];

export const INITIAL_TRANSACTIONS: TransactionRecord[] = [];

export const INITIAL_ACCOUNTS: AccountRecord[] = [];

export const INITIAL_INVENTORY: InventoryItem[] = [];

export const INITIAL_USERS: UserAccount[] = [
  {
    id: 'usr-1',
    name: 'Alex David Bariua',
    email: 'arb32433@imcc.edu.ph',
    password: 'admin123',
    role: 'Admin',
    department: 'Executive & Finance',
    status: 'Active',
    createdAt: 'Jan 12, 2026',
    lastActive: 'Active now',
  },
];

export const INITIAL_SALES: SaleRecord[] = [];
