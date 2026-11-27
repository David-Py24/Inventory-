import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig } from 'motion/react';
import {
  AccountRecord,
  GoalItem,
  InventoryItem,
  LandingSection,
  MonthlyCashFlow,
  PageRoute,
  SaleRecord,
  SinkingFund,
  TransactionRecord,
  UpcomingBill,
  UserAccount,
  UserRole,
  WorkspaceSettings,
} from './types';
import { api, AuthMode, getAuthMode, getAuthToken, setAuthModeStorage, setAuthToken } from './api/client';
import { setActiveCurrency } from './utils/format';
import {
  buildLandingHash,
  isLandingWindowQuery,
  openLandingWindow,
  parseLandingHash,
} from './utils/landingWindow';
import { Sidebar } from './components/Sidebar';
import { ConnectivityToast } from './components/ConnectivityToast';
import { useOnlineStatus } from './hooks/useOnline';
import { PageTransition } from './components/PageTransition';
import { MobileHeader, MobileBottomNav } from './mobile';
import { DashboardPage } from './pages/DashboardPage';
import { InventoryPage } from './pages/InventoryPage';
import { SalesPage } from './pages/SalesPage';
import { ReportsPage } from './pages/ReportsPage';
import { AccountsPage } from './pages/AccountsPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { AuthPage } from './pages/AuthPage';
import { LandingPage } from './pages/LandingPage';

const DEFAULT_SETTINGS: WorkspaceSettings = {
  storeName: 'TallyLedger',
  workspaceSubtitle: 'Financial Command Center',
  ownerEmail: '',
  currency: 'USD',
  defaultTimeframe: 'this_month',
  budgetCycleDay: '1',
  defaultReorderPoint: 8,
  lowStockAlerts: true,
  includeBillsInSafeToSpend: false,
  inventoryColumnLabels: {},
};

interface WorkspaceState {
  accounts: AccountRecord[];
  inventory: InventoryItem[];
  sales: SaleRecord[];
  bills: UpcomingBill[];
  sinkingFunds: SinkingFund[];
  goals: GoalItem[];
  transactions: TransactionRecord[];
  monthlyCashFlow: MonthlyCashFlow[];
  users: UserAccount[];
  currentUser: UserAccount | null;
  settings: WorkspaceSettings;
}

function getEmptyState(): WorkspaceState {
  return {
    accounts: [],
    inventory: [],
    sales: [],
    bills: [],
    sinkingFunds: [],
    goals: [],
    transactions: [],
    monthlyCashFlow: [],
    users: [],
    currentUser: null,
    settings: DEFAULT_SETTINGS,
  };
}

function parseHashRoute(): PageRoute {
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
  if (
    hash === 'inventory' ||
    hash === 'sales' ||
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
  const [state, setState] = useState<WorkspaceState>(() => getEmptyState());
  const [authMode, setAuthMode] = useState<AuthMode>(() => getAuthMode());
  const [booting, setBooting] = useState<boolean>(() => Boolean(getAuthToken()));
  const [route, setRoute] = useState<PageRoute>(() => parseHashRoute());
  const [landingSection, setLandingSection] = useState<LandingSection | null>(() => {
    const fromHash = parseLandingHash(window.location.hash);
    if (fromHash) return fromHash;
    return isLandingWindowQuery() ? 'overview' : null;
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isOnline = useOnlineStatus();

  // Ensure active currency is applied synchronously before child components render
  setActiveCurrency(state.settings.currency);

  const currentUser = state.currentUser;
  const isAuthenticated = currentUser !== null;

  const loadWorkspaceFromBackend = useCallback(async (meUser?: UserAccount) => {
    const [me, workspace] = await Promise.all([
      meUser ? Promise.resolve(meUser) : api.me(),
      api.getWorkspace(),
    ]);
    const nextSettings = workspace.settings
      ? { ...DEFAULT_SETTINGS, ...workspace.settings }
      : DEFAULT_SETTINGS;
    setActiveCurrency(nextSettings.currency);
    setState({
      accounts: workspace.accounts,
      inventory: workspace.inventory,
      sales: workspace.sales,
      bills: workspace.bills,
      sinkingFunds: workspace.sinkingFunds,
      goals: workspace.goals,
      transactions: workspace.transactions,
      monthlyCashFlow: workspace.monthlyCashFlow,
      users: workspace.users,
      currentUser: me,
      settings: nextSettings,
    });
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setBooting(false);
      return;
    }

    let cancelled = false;
    loadWorkspaceFromBackend()
      .catch(() => {
        if (!cancelled) {
          setAuthToken(null);
          setState(getEmptyState());
        }
      })
      .finally(() => {
        if (!cancelled) setBooting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [loadWorkspaceFromBackend]);

  useEffect(() => {
    document.title =
      landingSection !== null
        ? `${state.settings.storeName} — Overview & Documentation`
        : `${state.settings.storeName} — ${state.settings.workspaceSubtitle}`;
  }, [landingSection, state.settings.storeName, state.settings.workspaceSubtitle]);

  // Auth gate on hash routing: AuthPage (#/login) is strictly locked behind logging off,
  // while LandingPage (#/landing or ?window=landing) remains accessible in its own view/window.
  useEffect(() => {
    if (booting) return;
    const syncFromHash = () => {
      const nextLanding = parseLandingHash(window.location.hash);
      if (nextLanding) {
        setLandingSection(nextLanding);
        return;
      }
      if (isLandingWindowQuery() && window.location.hash === '') {
        setLandingSection('overview');
        window.location.hash = '#/landing';
        return;
      }
      setLandingSection(null);
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
  }, [isAuthenticated, booting]);

  const navigate = (nextRoute: PageRoute) => {
    if (!isAuthenticated) return;
    setRoute(nextRoute);
    window.location.hash = `#/${nextRoute}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Auth handlers
  const handleLogin = async (
    identifier: string,
    password: string,
    mode: AuthMode,
    syncFromCloud: boolean
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      const { user, token, authMode: resolvedMode } = await api.login(
        identifier,
        password,
        mode,
        syncFromCloud
      );
      setAuthToken(token);
      setAuthModeStorage(resolvedMode);
      setAuthMode(resolvedMode);
      await loadWorkspaceFromBackend(user);
      setRoute('dashboard');
      window.location.hash = '#/dashboard';
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Login failed.' };
    }
  };

  const handleSignUp = async (payload: {
    name: string;
    username?: string;
    email?: string;
    password: string;
    role: UserRole;
    department: string;
    mode: AuthMode;
  }): Promise<{ ok: boolean; error?: string }> => {
    try {
      const { user, token, authMode: resolvedMode } = await api.signup(payload);
      setAuthToken(token);
      setAuthModeStorage(resolvedMode);
      setAuthMode(resolvedMode);
      await loadWorkspaceFromBackend(user);
      setRoute('dashboard');
      window.location.hash = '#/dashboard';
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Sign up failed.' };
    }
  };

  const handleLogout = () => {
    setMobileMenuOpen(false);
    setAuthToken(null);
    setState(getEmptyState());
    window.location.hash = '#/login';
  };

  // User/Admin CRUD handlers
  const handleAddUser = async (user: Omit<UserAccount, 'id' | 'createdAt' | 'lastActive'>) => {
    const created = await api.addUser(user);
    setState((prev) => ({
      ...prev,
      users: [created, ...prev.users],
    }));
  };

  const handleUpdateUser = async (updated: UserAccount) => {
    const saved = await api.updateUser(updated);
    setState((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === saved.id ? saved : u)),
      currentUser: prev.currentUser?.id === saved.id ? saved : prev.currentUser,
    }));
  };

  const handleDeleteUser = async (id: string) => {
    await api.deleteUser(id);
    setState((prev) => ({
      ...prev,
      users: prev.users.filter((u) => u.id !== id),
    }));
  };

  // Dashboard handlers
  const handleToggleBillPaid = async (id: string) => {
    const updated = await api.toggleBillPaid(id);
    setState((prev) => ({
      ...prev,
      bills: prev.bills.map((b) => (b.id === id ? updated : b)),
    }));
  };

  const handleAddBill = async (bill: Omit<UpcomingBill, 'id' | 'paid'>) => {
    const created = await api.addBill(bill);
    setState((prev) => ({
      ...prev,
      bills: [...prev.bills, created],
    }));
  };

  const handleContributeFund = async (id: string, amount: number) => {
    const updated = await api.contributeFund(id, amount);
    setState((prev) => ({
      ...prev,
      sinkingFunds: prev.sinkingFunds.map((f) => (f.id === id ? updated : f)),
    }));
  };

  const handleContributeGoal = async (id: string, amount: number) => {
    const updated = await api.contributeGoal(id, amount);
    setState((prev) => ({
      ...prev,
      goals: prev.goals.map((g) => (g.id === id ? updated : g)),
    }));
  };

  // Inventory handlers
  const handleAddInventoryItem = async (item: Omit<InventoryItem, 'id' | 'lastUpdated'>) => {
    const created = await api.addInventoryItem(item);
    setState((prev) => ({
      ...prev,
      inventory: [created, ...prev.inventory],
    }));
  };

  const handleUpdateInventoryItem = async (updated: InventoryItem) => {
    const saved = await api.updateInventoryItem(updated);
    setState((prev) => ({
      ...prev,
      inventory: prev.inventory.map((i) => (i.id === saved.id ? saved : i)),
    }));
  };

  const handleDeleteInventoryItem = async (id: string) => {
    await api.deleteInventoryItem(id);
    setState((prev) => ({
      ...prev,
      inventory: prev.inventory.filter((i) => i.id !== id),
    }));
  };

  const handleAdjustInventoryQuantity = async (id: string, delta: number) => {
    const updated = await api.adjustInventoryQuantity(id, delta);
    setState((prev) => ({
      ...prev,
      inventory: prev.inventory.map((i) => (i.id === id ? updated : i)),
    }));
  };

  // Sales handlers
  const handleAddSale = async (sale: Omit<SaleRecord, 'id'>, deductInventory: boolean) => {
    const { sale: createdSale, updatedInventory } = await api.addSale(sale, deductInventory);
    setState((prev) => ({
      ...prev,
      sales: [createdSale, ...prev.sales],
      inventory: updatedInventory
        ? prev.inventory.map((item) =>
            item.id === updatedInventory.id ? updatedInventory : item
          )
        : prev.inventory,
    }));
  };

  const handleUpdateSale = async (updated: SaleRecord) => {
    const saved = await api.updateSale(updated);
    setState((prev) => ({
      ...prev,
      sales: prev.sales.map((s) => (s.id === saved.id ? saved : s)),
    }));
  };

  const handleDeleteSale = async (id: string) => {
    await api.deleteSale(id);
    setState((prev) => ({
      ...prev,
      sales: prev.sales.filter((s) => s.id !== id),
    }));
  };

  // Settings handlers
  const handleSaveSettings = async (nextSettings: WorkspaceSettings) => {
    const saved = await api.saveSettings(nextSettings);
    const merged = { ...DEFAULT_SETTINGS, ...saved };
    setActiveCurrency(merged.currency);
    setState((prev) => ({ ...prev, settings: merged }));
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
      const parsed = JSON.parse(jsonText) as Partial<WorkspaceState>;
      if (!Array.isArray(parsed.accounts) || !Array.isArray(parsed.inventory)) {
        return false;
      }
      const nextSettings = parsed.settings
        ? { ...DEFAULT_SETTINGS, ...parsed.settings }
        : state.settings;
      setActiveCurrency(nextSettings.currency);
      setState((prev) => ({
        ...prev,
        accounts: parsed.accounts!,
        inventory: parsed.inventory!,
        sales: Array.isArray(parsed.sales) ? parsed.sales : prev.sales,
        bills: Array.isArray(parsed.bills) ? parsed.bills : prev.bills,
        sinkingFunds: Array.isArray(parsed.sinkingFunds)
          ? parsed.sinkingFunds
          : prev.sinkingFunds,
        goals: Array.isArray(parsed.goals) ? parsed.goals : prev.goals,
        transactions: Array.isArray(parsed.transactions)
          ? parsed.transactions
          : prev.transactions,
        monthlyCashFlow: Array.isArray(parsed.monthlyCashFlow)
          ? parsed.monthlyCashFlow
          : prev.monthlyCashFlow,
        settings: nextSettings,
      }));
      return true;
    } catch {
      return false;
    }
  };

  const handleRefreshFromBackend = () => {
    loadWorkspaceFromBackend().catch(() => {
      // ignore transient refresh failure
    });
  };

  const clearWindowQueryIfPresent = () => {
    if (window.location.search) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  const handleEnterWorkspaceFromLanding = () => {
    clearWindowQueryIfPresent();
    setLandingSection(null);
    setRoute('dashboard');
    window.location.hash = '#/dashboard';
  };

  const handleOpenLoginFromLanding = () => {
    clearWindowQueryIfPresent();
    setLandingSection(null);
    window.location.hash = '#/login';
  };

  const handleDownloadStarterBundle = () => {
    const starterBundle = {
      exportedAt: new Date().toISOString(),
      accounts: state.accounts,
      inventory: state.inventory,
      sales: state.sales,
      bills: state.bills,
      sinkingFunds: state.sinkingFunds,
      goals: state.goals,
      transactions: state.transactions,
      monthlyCashFlow: state.monthlyCashFlow,
      settings: state.settings,
    };
    const blob = new Blob([JSON.stringify(starterBundle, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${state.settings.storeName.toLowerCase().replace(/\s+/g, '-')}-workspace-starter.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (booting) {
    return (
      <div className="min-h-screen bg-[#1F221B] text-[#F5F2EB] flex items-center justify-center text-sm tracking-wide">
        Loading workspace…
      </div>
    );
  }

  if (landingSection !== null) {
    return (
      <MotionConfig reducedMotion="user">
        <AnimatePresence mode="wait" initial>
          <PageTransition key="landing">
            <LandingPage
              storeName={state.settings.storeName}
              workspaceSubtitle={state.settings.workspaceSubtitle}
              isAuthenticated={isAuthenticated}
              initialSection={landingSection}
              onChangeSection={(nextSection) => {
                setLandingSection(nextSection);
                window.location.hash = buildLandingHash(nextSection);
              }}
              onEnterWorkspace={handleEnterWorkspaceFromLanding}
              onOpenLogin={handleOpenLoginFromLanding}
              onDownloadStarterBundle={handleDownloadStarterBundle}
            />
          </PageTransition>
        </AnimatePresence>
      </MotionConfig>
    );
  }

  // Render standalone Log In / Sign Up page ONLY when logged off
  if (!isAuthenticated || !currentUser) {
    return (
      <MotionConfig reducedMotion="user">
        <AnimatePresence mode="wait" initial>
          <PageTransition key="auth">
            <AuthPage
              storeName={state.settings.storeName}
              workspaceSubtitle={state.settings.workspaceSubtitle}
              initialAuthMode={authMode}
              isOnline={isOnline}
              onOpenLanding={() => openLandingWindow('overview')}
              onLogin={handleLogin}
              onSignUp={handleSignUp}
            />
          </PageTransition>
        </AnimatePresence>
        <ConnectivityToast isOnline={isOnline} authMode={authMode} />
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[#F5F1E8] text-[#23281E] flex flex-col md:flex-row">
        <Sidebar
          activeRoute={route}
          onNavigate={navigate}
          onResetDemoData={handleRefreshFromBackend}
          onOpenLanding={() => openLandingWindow('overview')}
          storeName={state.settings.storeName}
          workspaceSubtitle={state.settings.workspaceSubtitle}
          authMode={authMode}
          isOnline={isOnline}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        <MobileHeader
          currentUser={currentUser}
          authMode={authMode}
          isOnline={isOnline}
          onOpenProfile={() => navigate('profile')}
          onOpenMenu={() => setMobileMenuOpen(true)}
        />

        <main className="flex-1 min-w-0 px-4 py-5 pb-24 sm:px-6 sm:py-6 md:pb-6 lg:px-8 lg:py-7">
          <div className="mx-auto w-full max-w-[1280px]">
            <AnimatePresence mode="wait" initial>
              <PageTransition key={route}>
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
                    columnLabels={state.settings.inventoryColumnLabels}
                    onAddItem={handleAddInventoryItem}
                    onUpdateItem={handleUpdateInventoryItem}
                    onDeleteItem={handleDeleteInventoryItem}
                    onAdjustQuantity={handleAdjustInventoryQuantity}
                  />
                )}

                {route === 'sales' && (
                  <SalesPage
                    sales={state.sales}
                    inventory={state.inventory}
                    onAddSale={handleAddSale}
                    onUpdateSale={handleUpdateSale}
                    onDeleteSale={handleDeleteSale}
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
                    isOnline={isOnline}
                    onSaveSettings={handleSaveSettings}
                    onExportBackup={handleExportBackup}
                    onImportBackup={handleImportBackup}
                    onResetAll={handleRefreshFromBackend}
                  />
                )}
              </PageTransition>
            </AnimatePresence>
          </div>
        </main>

        <MobileBottomNav activeRoute={route} onNavigate={navigate} />
        <ConnectivityToast isOnline={isOnline} authMode={authMode} />
      </div>
    </MotionConfig>
  );
}
