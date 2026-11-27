import type {
  AccountRecord,
  GoalItem,
  InventoryItem,
  MonthlyCashFlow,
  SaleRecord,
  SinkingFund,
  TransactionRecord,
  UpcomingBill,
  UserAccount,
  UserRole,
  WorkspaceSettings,
  UtangCustomer,
  UtangTransaction,
} from '../types';

const TOKEN_STORAGE_KEY = 'tallyledger_auth_token';
const AUTH_MODE_STORAGE_KEY = 'tallyledger_auth_mode';

export type AuthMode = 'offline' | 'online';
export type WorkspaceSnapshot = Record<string, Record<string, unknown>[]>;

async function hostedBackupRequest<T>(
  apiUrl: string,
  accessToken: string,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);
  if (init.body !== undefined) headers.set('Content-Type', 'application/json');
  const baseUrl = apiUrl.trim().replace(/\/+$/, '');
  const response = await fetch(`${baseUrl}/api/backup/cloud${path}`, { ...init, headers });
  if (!response.ok) {
    let message = `Cloud backup request failed (${response.status})`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // Keep the HTTP status message when the service returns a non-JSON response.
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export function getAuthMode(): AuthMode {
  try {
    return localStorage.getItem(AUTH_MODE_STORAGE_KEY) === 'online' ? 'online' : 'offline';
  } catch {
    return 'offline';
  }
}

export function setAuthModeStorage(mode: AuthMode): void {
  try {
    localStorage.setItem(AUTH_MODE_STORAGE_KEY, mode);
  } catch {
    // Ignore storage errors
  }
}

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(path, { ...init, headers });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(message);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export interface WorkspacePayload {
  accounts: AccountRecord[];
  inventory: InventoryItem[];
  sales: SaleRecord[];
  bills: UpcomingBill[];
  sinkingFunds: SinkingFund[];
  goals: GoalItem[];
  transactions: TransactionRecord[];
  monthlyCashFlow: MonthlyCashFlow[];
  users: UserAccount[];
  settings: WorkspaceSettings | null;
}

export const api = {
  login: (
    identifier: string,
    password: string,
    mode: AuthMode = 'offline',
    syncFromCloud = false
  ) =>
    request<{
      user: UserAccount;
      token: string;
      authMode: AuthMode;
      syncedFromCloud?: boolean;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password, mode, syncFromCloud }),
    }),

  signup: (payload: {
    name: string;
    username?: string;
    email?: string;
    password: string;
    role: UserRole;
    department: string;
    mode?: AuthMode;
  }) =>
    request<{ user: UserAccount; token: string; authMode: AuthMode }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  me: () => request<UserAccount>('/api/auth/me'),

  getWorkspace: () => request<WorkspacePayload>('/api/workspace'),

  // Inventory
  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'lastUpdated'>) =>
    request<InventoryItem>('/api/workspace/inventory', {
      method: 'POST',
      body: JSON.stringify(item),
    }),

  updateInventoryItem: (item: InventoryItem) =>
    request<InventoryItem>(`/api/workspace/inventory/${item.id}`, {
      method: 'PATCH',
      body: JSON.stringify(item),
    }),

  adjustInventoryQuantity: (id: string, delta: number) =>
    request<InventoryItem>(`/api/workspace/inventory/${id}/adjust`, {
      method: 'POST',
      body: JSON.stringify({ delta }),
    }),

  breakPack: (parentProductId: string, childProductId: string, parentQty: number) =>
    request<{ parent: InventoryItem; child: InventoryItem }>(`/api/workspace/inventory/${parentProductId}/break-pack`, {
      method: 'POST', body: JSON.stringify({ childProductId, parentQty }),
    }),

  deleteInventoryItem: (id: string) =>
    request<void>(`/api/workspace/inventory/${id}`, {
      method: 'DELETE',
    }),

  // Sales
  addSale: (sale: Omit<SaleRecord, 'id'>, deductInventory: boolean) =>
    request<{ sale: SaleRecord; updatedInventory: InventoryItem | null }>('/api/workspace/sales', {
      method: 'POST',
      body: JSON.stringify({ ...sale, deductInventory }),
    }),

  updateSale: (sale: SaleRecord) =>
    request<SaleRecord>(`/api/workspace/sales/${sale.id}`, {
      method: 'PATCH',
      body: JSON.stringify(sale),
    }),

  deleteSale: (id: string) =>
    request<void>(`/api/workspace/sales/${id}`, {
      method: 'DELETE',
    }),
  importNotebookSales: (importId: string, rows: Array<{ rowNumber: number; date: string; quantity: number; product: string; sales: number }>) =>
    request<{ importId: string; imported: number; skipped: Array<{ row: number; reason: string }>; saleIds: string[] }>('/api/workspace/sales/notebook-import', {
      method: 'POST', body: JSON.stringify({ importId, rows }),
    }),

  // Bills, Funds, Goals
  addBill: (bill: Omit<UpcomingBill, 'id' | 'paid'>) =>
    request<UpcomingBill>('/api/workspace/bills', {
      method: 'POST',
      body: JSON.stringify(bill),
    }),

  toggleBillPaid: (id: string) =>
    request<UpcomingBill>(`/api/workspace/bills/${id}/toggle`, {
      method: 'PATCH',
    }),

  contributeFund: (id: string, amount: number) =>
    request<SinkingFund>(`/api/workspace/sinking-funds/${id}/contribute`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),

  contributeGoal: (id: string, amount: number) =>
    request<GoalItem>(`/api/workspace/goals/${id}/contribute`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),

  // Settings
  saveSettings: (settings: WorkspaceSettings) =>
    request<WorkspaceSettings>('/api/workspace/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  getUtangCustomers: () => request<UtangCustomer[]>('/api/utang/customers'),
  createUtangCustomer: (customer: Pick<UtangCustomer, 'fullName'> & Partial<UtangCustomer>) =>
    request<UtangCustomer>('/api/utang/customers', { method: 'POST', body: JSON.stringify(customer) }),
  postUtangTransaction: (customerId: string, type: 'CREDIT' | 'PAYMENT', amount: number, notes?: string) =>
    request<{ customer: UtangCustomer; transaction: UtangTransaction }>(`/api/utang/customers/${customerId}/transactions`, {
      method: 'POST', body: JSON.stringify({ type, amount, notes }),
    }),

  // Users
  addUser: (user: Omit<UserAccount, 'id' | 'createdAt' | 'lastActive'>) =>
    request<UserAccount>('/api/users', {
      method: 'POST',
      body: JSON.stringify(user),
    }),

  updateUser: (user: UserAccount) =>
    request<UserAccount>(`/api/users/${user.id}`, {
      method: 'PATCH',
      body: JSON.stringify(user),
    }),

  deleteUser: (id: string) =>
    request<void>(`/api/users/${id}`, {
      method: 'DELETE',
    }),

  // Manual desktop SQLite snapshot transfer to the hosted backup service.
  getLocalBackupSnapshot: () =>
    request<{ snapshot: WorkspaceSnapshot; counts: Record<string, number> }>('/api/backup/snapshot'),

  previewHostedCloudBackup: (apiUrl: string, accessToken: string) =>
    hostedBackupRequest<{
      cloudCounts: Record<string, number>;
      backedUpAt: string | null;
      cloudHasData: boolean;
    }>(apiUrl, accessToken, '/preview'),

  uploadHostedCloudBackup: (apiUrl: string, accessToken: string, snapshot: WorkspaceSnapshot) =>
    hostedBackupRequest<{
      ok: boolean;
      backedUpAt: string;
      counts: Record<string, number>;
    }>(apiUrl, accessToken, '/snapshot', {
      method: 'POST',
      body: JSON.stringify({ confirmLocalToCloud: true, snapshot }),
    }),

};
