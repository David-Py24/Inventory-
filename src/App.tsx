import { useEffect, useMemo, useState } from 'react';
import { Menu } from 'lucide-react';
import {
  AccountRecord,
  GoalItem,
  InventoryItem,
  MonthlyCashFlow,
  PageRoute,
  SinkingFund,
  TransactionRecord,
  UpcomingBill,
  UserAccount,
  UserRole,
  WorkspaceSettings,
} from './types';
import {
  INITIAL_ACCOUNTS,
  INITIAL_GOALS,
  INITIAL_INVENTORY,
  INITIAL_MONTHLY_CASH_FLOW,
  INITIAL_SINKING_FUNDS,
  INITIAL_TRANSACTIONS,
  INITIAL_UPCOMING_BILLS,
  INITIAL_USERS,
} from './data/initialData';
import { setActiveCurrency } from './utils/format';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { InventoryPage } from './pages/InventoryPage';
import { ReportsPage } from './pages/ReportsPage';
import { AccountsPage } from './pages/AccountsPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { AuthPage } from './pages/AuthPage';

const STORAGE_KEY = 'hearthledger_state_v1';

const INITIAL_SETTINGS: WorkspaceSettings = {
  storeName: 'HearthLedger',
  workspaceSubtitle: 'Financial Command Center',
  ownerEmail: 'arb32433@imcc.edu.ph',
  currency: 'USD',
  defaultTimeframe: 'this_month',
  budgetCycleDay: '1',
  defaultReorderPoint: 8,
  lowStockAlerts: true,
  includeBillsInSafeToSpend: false,
};

interface PersistedState {
  accounts: AccountRecord[];
  inventory: InventoryItem[];
  bills: UpcomingBill[];
  sinkingFunds: SinkingFund[];
  goals: GoalItem[];
  transactions: TransactionRecord[];
  monthlyCashFlow: MonthlyCashFlow[];
  users: UserAccount[];
  currentUserId: string | null;
  settings: WorkspaceSettings;
}

function getDefaultState(): PersistedState {
  return {
    accounts: INITIAL_ACCOUNTS,
    inventory: INITIAL_INVENTORY,
    bills: INITIAL_UPCOMING_BILLS,
    sinkingFunds: INITIAL_SINKING_FUNDS,
    goals: INITIAL_GOALS,
    transactions: INITIAL_TRANSACTIONS,
    monthlyCashFlow: INITIAL_MONTHLY_CASH_FLOW,
    users: INITIAL_USERS,
    currentUserId: INITIAL_USERS[0].id,
    settings: INITIAL_SETTINGS,
  };
}

function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultState();
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const users =
      Array.isArray(parsed.users) && parsed.users.length > 0 ? parsed.users : INITIAL_USERS;
    const currentUserId =
      parsed.currentUserId === null
        ? null
        : typeof parsed.currentUserId === 'string' &&
            users.some((u) => u.id === parsed.currentUserId && u.status === 'Active')
          ? parsed.currentUserId
          : users.find((u) => u.status === 'Active')?.id ?? users[0].id;

    return {
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts : INITIAL_ACCOUNTS,
      inventory: Array.isArray(parsed.inventory) ? parsed.inventory : INITIAL_INVENTORY,
      bills: Array.isArray(parsed.bills) ? parsed.bills : INITIAL_UPCOMING_BILLS,
      sinkingFunds: Array.isArray(parsed.sinkingFunds)
        ? parsed.sinkingFunds
        : INITIAL_SINKING_FUNDS,
      goals: Array.isArray(parsed.goals) ? parsed.goals : INITIAL_GOALS,
      transactions: Array.isArray(parsed.transactions)
        ? parsed.transactions
        : INITIAL_TRANSACTIONS,
      monthlyCashFlow: Array.isArray(parsed.monthlyCashFlow)
        ? parsed.monthlyCashFlow
        : INITIAL_MONTHLY_CASH_FLOW,
      users,
      currentUserId,
      settings: parsed.settings ? { ...INITIAL_SETTINGS, ...parsed.settings } : INITIAL_SETTINGS,
    };
  } catch {
    return getDefaultState();
  }
}

function parseHashRoute(): PageRoute {
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
  if (
    hash === 'inventory' ||
    hash === 'reports' ||
    hash === 'accounts' ||
    hash === 'profile' ||
    hash === 'settings'
  ) {
    return hash;
  }
  return 'dashboard';
}

export default function App() {
  const [state, setState] = useState<PersistedState>(() => loadState());
  const [route, setRoute] = useState<PageRoute>(() => parseHashRoute());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Ensure active currency is applied synchronously before child components render
  setActiveCurrency(state.settings.currency);

  const currentUser = useMemo(() => {
    if (!state.currentUserId) return null;
    return (
      state.users.find((u) => u.id === state.currentUserId && u.status === 'Active') ?? null
    );
  }, [state.users, state.currentUserId]);

  const isAuthenticated = currentUser !== null;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
  }, [state]);

  useEffect(() => {
    document.title = `${state.settings.storeName} — ${state.settings.workspaceSubtitle}`;
  }, [state.settings.storeName, state.settings.workspaceSubtitle]);

  // Auth gate on hash routing: AuthPage (#/login) is strictly locked behind logging off
  useEffect(() => {
    const syncFromHash = () => {
      const rawHash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
      if (!isAuthenticated) {
        if (rawHash !== 'login') {
          window.location.hash = '#/login';
        }
        return;
      }
      if (rawHash === 'login' || rawHash === 'auth' || rawHash === '') {
        window.location.hash = '#/dashboard';
        setRoute('dashboard');
        return;
      }
      setRoute(parseHashRoute());
    };

    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, [isAuthenticated]);

  const navigate = (nextRoute: PageRoute) => {
    if (!isAuthenticated) return;
    setRoute(nextRoute);
    window.location.hash = `#/${nextRoute}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Auth handlers
  const handleLogin = (email: string, password: string): { ok: boolean; error?: string } => {
    const found = state.users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (!found || found.password !== password) {
      return { ok: false, error: 'Incorrect email address or password.' };
    }
    if (found.status !== 'Active') {
      return {
        ok: false,
        error: 'This account is currently suspended. Contact an administrator.',
      };
    }

    setState((prev) => ({
      ...prev,
      currentUserId: found.id,
      users: prev.users.map((u) =>
        u.id === found.id ? { ...u, lastActive: 'Active now' } : u
      ),
    }));
    setRoute('dashboard');
    window.location.hash = '#/dashboard';
    return { ok: true };
  };

  const handleSignUp = (payload: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    department: string;
  }): { ok: boolean; error?: string } => {
    const exists = state.users.some(
      (u) => u.email.toLowerCase() === payload.email.trim().toLowerCase()
    );
    if (exists) {
      return { ok: false, error: 'An account with that email address already exists.' };
    }

    const nowDate = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });

    const newUser: UserAccount = {
      id: `usr-${Date.now()}`,
      name: payload.name,
      email: payload.email,
      password: payload.password,
      role: payload.role,
      department: payload.department,
      status: 'Active',
      createdAt: nowDate,
      lastActive: 'Active now',
    };

    setState((prev) => ({
      ...prev,
      users: [...prev.users, newUser],
      currentUserId: newUser.id,
    }));
    setRoute('dashboard');
    window.location.hash = '#/dashboard';
    return { ok: true };
  };

  const handleLogout = () => {
    setMobileMenuOpen(false);
    setState((prev) => ({
      ...prev,
      currentUserId: null,
    }));
    window.location.hash = '#/login';
  };

  // User/Admin CRUD handlers
  const handleAddUser = (user: Omit<UserAccount, 'id' | 'createdAt' | 'lastActive'>) => {
    const nowDate = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
    const nextUser: UserAccount = {
      ...user,
      id: `usr-${Date.now()}`,
      createdAt: nowDate,
      lastActive: 'Just added',
    };
    setState((prev) => ({
      ...prev,
      users: [nextUser, ...prev.users],
    }));
  };

  const handleUpdateUser = (updated: UserAccount) => {
    setState((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === updated.id ? updated : u)),
    }));
  };

  const handleDeleteUser = (id: string) => {
    setState((prev) => ({
      ...prev,
      users: prev.users.filter((u) => u.id !== id),
    }));
  };

  // Dashboard handlers
  const handleToggleBillPaid = (id: string) => {
    setState((prev) => ({
      ...prev,
      bills: prev.bills.map((b) => (b.id === id ? { ...b, paid: !b.paid } : b)),
    }));
  };

  const handleAddBill = (bill: Omit<UpcomingBill, 'id' | 'paid'>) => {
    setState((prev) => ({
      ...prev,
      bills: [...prev.bills, { ...bill, id: `bill-${Date.now()}`, paid: false }],
    }));
  };

  const handleContributeFund = (id: string, amount: number) => {
    setState((prev) => ({
      ...prev,
      sinkingFunds: prev.sinkingFunds.map((f) =>
        f.id === id ? { ...f, saved: Math.min(f.target, Math.max(0, f.saved + amount)) } : f
      ),
    }));
  };

  const handleContributeGoal = (id: string, amount: number) => {
    setState((prev) => ({
      ...prev,
      goals: prev.goals.map((g) =>
        g.id === id ? { ...g, saved: Math.min(g.target, Math.max(0, g.saved + amount)) } : g
      ),
    }));
  };

  // Inventory handlers
  const handleAddInventoryItem = (item: Omit<InventoryItem, 'id' | 'lastUpdated'>) => {
    const today = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
    setState((prev) => ({
      ...prev,
      inventory: [{ ...item, id: `inv-${Date.now()}`, lastUpdated: today }, ...prev.inventory],
    }));
  };

  const handleUpdateInventoryItem = (updated: InventoryItem) => {
    setState((prev) => ({
      ...prev,
      inventory: prev.inventory.map((i) => (i.id === updated.id ? updated : i)),
    }));
  };

  const handleDeleteInventoryItem = (id: string) => {
    setState((prev) => ({
      ...prev,
      inventory: prev.inventory.filter((i) => i.id !== id),
    }));
  };

  const handleAdjustInventoryQuantity = (id: string, delta: number) => {
    const today = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
    setState((prev) => ({
      ...prev,
      inventory: prev.inventory.map((i) =>
        i.id === id
          ? { ...i, quantity: Math.max(0, i.quantity + delta), lastUpdated: today }
          : i
      ),
    }));
  };

  // Settings handlers
  const handleSaveSettings = (nextSettings: WorkspaceSettings) => {
    setActiveCurrency(nextSettings.currency);
    setState((prev) => ({ ...prev, settings: nextSettings }));
  };

  const handleExportBackup = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${state.settings.storeName.toLowerCase().replace(/\s+/g, '-')}-backup.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (jsonText: string): boolean => {
    try {
      const parsed = JSON.parse(jsonText) as Partial<PersistedState>;
      if (!Array.isArray(parsed.accounts) || !Array.isArray(parsed.inventory)) {
        return false;
      }
      const nextSettings = parsed.settings
        ? { ...INITIAL_SETTINGS, ...parsed.settings }
        : state.settings;
      setActiveCurrency(nextSettings.currency);
      setState({
        accounts: parsed.accounts,
        inventory: parsed.inventory,
        bills: Array.isArray(parsed.bills) ? parsed.bills : state.bills,
        sinkingFunds: Array.isArray(parsed.sinkingFunds)
          ? parsed.sinkingFunds
          : state.sinkingFunds,
        goals: Array.isArray(parsed.goals) ? parsed.goals : state.goals,
        transactions: Array.isArray(parsed.transactions)
          ? parsed.transactions
          : state.transactions,
        monthlyCashFlow: Array.isArray(parsed.monthlyCashFlow)
          ? parsed.monthlyCashFlow
          : state.monthlyCashFlow,
        users: Array.isArray(parsed.users) && parsed.users.length > 0 ? parsed.users : state.users,
        currentUserId:
          typeof parsed.currentUserId === 'string' ? parsed.currentUserId : state.currentUserId,
        settings: nextSettings,
      });
      return true;
    } catch {
      return false;
    }
  };

  const handleResetDemoData = () => {
    const fresh = getDefaultState();
    setActiveCurrency(fresh.settings.currency);
    setState(fresh);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  };

  // Render standalone Log In / Sign Up page ONLY when logged off
  if (!isAuthenticated || !currentUser) {
    return (
      <AuthPage
        storeName={state.settings.storeName}
        workspaceSubtitle={state.settings.workspaceSubtitle}
        onLogin={handleLogin}
        onSignUp={handleSignUp}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8] text-[#23281E] flex flex-col md:flex-row">
      <Sidebar
        activeRoute={route}
        onNavigate={navigate}
        onResetDemoData={handleResetDemoData}
        storeName={state.settings.storeName}
        workspaceSubtitle={state.settings.workspaceSubtitle}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Mobile Header (< md) */}
      <header className="sticky top-0 z-30 flex h-[52px] items-center justify-between border-b border-[#E6E0D3] bg-[#2C3327] px-4 text-[#F5F2EB] md:hidden">
        <button
          type="button"
          onClick={() => navigate('dashboard')}
          className="font-serif text-[18px] font-semibold tracking-tight text-[#F6F3EC] truncate"
        >
          {state.settings.storeName}
        </button>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open navigation menu"
          className="rounded-lg p-1.5 text-[#C8C7BD] hover:bg-white/10 hover:text-white transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      <main className="flex-1 min-w-0 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
        <div className="mx-auto w-full max-w-[1280px]">
          {route === 'dashboard' && (
            <DashboardPage
              accounts={state.accounts}
              monthlyCashFlow={state.monthlyCashFlow}
              bills={state.bills}
              sinkingFunds={state.sinkingFunds}
              goals={state.goals}
              transactions={state.transactions}
              defaultTimeframe={state.settings.defaultTimeframe}
              includeBillsInSafeToSpend={state.settings.includeBillsInSafeToSpend}
              onToggleBillPaid={handleToggleBillPaid}
              onAddBill={handleAddBill}
              onContributeFund={handleContributeFund}
              onContributeGoal={handleContributeGoal}
              onNavigate={navigate}
            />
          )}

          {route === 'inventory' && (
            <InventoryPage
              items={state.inventory}
              defaultReorderPoint={state.settings.defaultReorderPoint}
              lowStockAlerts={state.settings.lowStockAlerts}
              onAddItem={handleAddInventoryItem}
              onUpdateItem={handleUpdateInventoryItem}
              onDeleteItem={handleDeleteInventoryItem}
              onAdjustQuantity={handleAdjustInventoryQuantity}
            />
          )}

          {route === 'reports' && (
            <ReportsPage
              accounts={state.accounts}
              inventory={state.inventory}
              monthlyCashFlow={state.monthlyCashFlow}
            />
          )}

          {route === 'accounts' && (
            <AccountsPage
              users={state.users}
              currentUser={currentUser}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              onOpenProfile={() => navigate('profile')}
              onLogout={handleLogout}
            />
          )}

          {route === 'profile' && (
            <ProfilePage
              currentUser={currentUser}
              users={state.users}
              onUpdateUser={handleUpdateUser}
              onBackToAccounts={() => navigate('accounts')}
              onLogout={handleLogout}
            />
          )}

          {route === 'settings' && (
            <SettingsPage
              settings={state.settings}
              onSaveSettings={handleSaveSettings}
              onExportBackup={handleExportBackup}
              onImportBackup={handleImportBackup}
              onResetAll={handleResetDemoData}
            />
          )}
        </div>
      </main>
    </div>
  );
}
