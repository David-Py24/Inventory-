import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Calendar,
  ChevronDown,
  ChevronRight,
  Package,
  PieChart,
  Plus,
  Receipt,
  Search,
  Sparkles,
  Target,
  Wallet,
  X,
} from 'lucide-react';
import {
  AccountRecord,
  GoalItem,
  MonthlyCashFlow,
  PageRoute,
  SinkingFund,
  TimeframeKey,
  TransactionRecord,
  UpcomingBill,
} from '../types';
import { TIMEFRAME_METRICS } from '../data/initialData';
import { formatCurrency, getActiveCurrency } from '../utils/format';
import { DonutSpendingChart } from '../components/DonutSpendingChart';
import { CashFlowBarChart } from '../components/CashFlowBarChart';

interface DashboardPageProps {
  accounts: AccountRecord[];
  monthlyCashFlow: MonthlyCashFlow[];
  bills: UpcomingBill[];
  sinkingFunds: SinkingFund[];
  goals: GoalItem[];
  transactions: TransactionRecord[];
  defaultTimeframe?: TimeframeKey;
  includeBillsInSafeToSpend?: boolean;
  onToggleBillPaid: (id: string) => void;
  onAddBill: (bill: Omit<UpcomingBill, 'id' | 'paid'>) => void;
  onContributeFund: (id: string, amount: number) => void;
  onContributeGoal: (id: string, amount: number) => void;
  onNavigate: (route: PageRoute) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  accounts,
  monthlyCashFlow,
  bills,
  sinkingFunds,
  goals,
  transactions,
  defaultTimeframe = 'this_month',
  includeBillsInSafeToSpend = false,
  onToggleBillPaid,
  onAddBill,
  onContributeFund,
  onContributeGoal,
  onNavigate,
}) => {
  const [viewMode, setViewMode] = useState<'overview' | 'budget'>('overview');
  const [timeframe, setTimeframe] = useState<TimeframeKey>(defaultTimeframe);
  const [txSearch, setTxSearch] = useState('');
  const [activeModal, setActiveModal] = useState<'bills' | 'funds' | 'goals' | null>(null);

  const [newBillName, setNewBillName] = useState('');
  const [newBillDate, setNewBillDate] = useState('Jul 24');
  const [newBillAmount, setNewBillAmount] = useState('');
  const [contributionInputs, setContributionInputs] = useState<Record<string, string>>({});
  const [selectedMobileBarIdx, setSelectedMobileBarIdx] = useState<number>(
    Math.max(0, monthlyCashFlow.length - 1)
  );

  const periodData = TIMEFRAME_METRICS[timeframe];

  const unpaidBillsTotal = useMemo(
    () => bills.filter((b) => !b.paid).reduce((sum, b) => sum + b.amount, 0),
    [bills]
  );

  const effectiveSafeToSpend = includeBillsInSafeToSpend
    ? Math.max(0, periodData.amountLeftToSpend - unpaidBillsTotal)
    : periodData.amountLeftToSpend;

  const { netWorth, debtPayoffPercent, debtPaidAmount, debtOriginalTotal } = useMemo(() => {
    const assets = accounts
      .filter((a) => !a.isLiability)
      .reduce((sum, a) => sum + a.balance, 0);
    const liabilities = accounts
      .filter((a) => a.isLiability)
      .reduce((sum, a) => sum + a.balance, 0);

    const originalDebtBaseline = 16400;
    const paidOff = Math.max(0, originalDebtBaseline - liabilities);
    const pct = Math.min(100, Math.max(0, Math.round((paidOff / originalDebtBaseline) * 100)));

    return {
      netWorth: assets - liabilities,
      debtPayoffPercent: pct,
      debtPaidAmount: paidOff,
      debtOriginalTotal: originalDebtBaseline,
    };
  }, [accounts]);

  const filteredTransactions = useMemo(() => {
    const q = txSearch.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter(
      (t) =>
        t.merchant.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.date.toLowerCase().includes(q)
    );
  }, [transactions, txSearch]);

  const remainingBudget = Math.max(0, periodData.plannedBudget - periodData.spentBudget);
  const assignedPercent = 91;
  const leftToAssign = 1121.65;
  const perDaySafe = effectiveSafeToSpend / 30;
  const topPriorityBill = bills.find((b) => !b.paid) ?? bills[0];

  const handleCreateBill = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(newBillAmount);
    if (!newBillName.trim() || Number.isNaN(amt) || amt <= 0) return;
    onAddBill({
      name: newBillName.trim(),
      dueDate: newBillDate.trim() || 'Jul 28',
      amount: amt,
      category: 'General',
    });
    setNewBillName('');
    setNewBillAmount('');
  };

  const maxMonthlyExpense = useMemo(
    () => Math.max(1, ...monthlyCashFlow.map((m) => m.expenses)),
    [monthlyCashFlow]
  );
  const activeMobileBar =
    monthlyCashFlow[selectedMobileBarIdx] ?? monthlyCashFlow[monthlyCashFlow.length - 1];

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ================= MOBILE LAYOUT (< md) ================= */}
      <div className="md:hidden space-y-4">
        {/* Hero Forest Balance Card */}
        <section className="rounded-[22px] bg-gradient-to-br from-[#2C3327] via-[#212A1E] to-[#172116] p-5 text-[#F5F2EB] shadow-[0_14px_30px_rgba(27,34,23,0.22)]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#B5BAAC]">
              Total Balance
            </span>
            <div className="relative">
              <select
                aria-label="Select mobile reporting timeframe"
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value as TimeframeKey)}
                className="appearance-none rounded-full bg-[#E0B75E] py-1 pl-2.5 pr-6 text-[10.5px] font-semibold text-[#1F221B] focus:outline-none"
              >
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="quarter">Quarter</option>
                <option value="ytd">YTD</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#1F221B]" />
            </div>
          </div>

          <div className="mt-1.5 text-[31px] font-semibold tracking-tight text-white tabular-nums leading-tight">
            {formatCurrency(netWorth)}
          </div>

          <div className="mt-1 flex items-center justify-between text-[11.5px] text-[#C2C7B9]">
            <span className="tabular-nums">
              •••• 4821 · Safe {formatCurrency(effectiveSafeToSpend, { maximumFractionDigits: 0 })}
            </span>
            <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#E6E2D8]">
              {getActiveCurrency()}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setActiveModal('bills')}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#E0B75E] py-2.5 px-3 text-[12.5px] font-semibold text-[#1F221B] hover:bg-[#D5AA4E] transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Bill</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveModal('funds')}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/12 py-2.5 px-3 text-[12.5px] font-medium text-[#F5F2EB] hover:bg-white/18 transition-colors"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>Sinking Funds</span>
            </button>
          </div>
        </section>

        {/* 4-Column Quick Actions */}
        <section aria-label="Quick Actions" className="grid grid-cols-4 gap-2.5 text-center">
          <button
            type="button"
            onClick={() => setViewMode('overview')}
            className="flex flex-col items-center gap-1.5"
          >
            <div
              className={`flex h-13 w-full items-center justify-center rounded-2xl border transition-colors ${
                viewMode === 'overview'
                  ? 'border-[#2C3327] bg-[#2C3327] text-[#F5F2EB]'
                  : 'border-[#E6E0D3] bg-[#FCFBF8] text-[#2C3327]'
              }`}
            >
              <Wallet className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-medium text-[#4B4E44]">Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('budget')}
            className="flex flex-col items-center gap-1.5"
          >
            <div
              className={`flex h-13 w-full items-center justify-center rounded-2xl border transition-colors ${
                viewMode === 'budget'
                  ? 'border-[#2C3327] bg-[#2C3327] text-[#F5F2EB]'
                  : 'border-[#E6E0D3] bg-[#FCFBF8] text-[#2C3327]'
              }`}
            >
              <PieChart className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-medium text-[#4B4E44]">Insights</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveModal('goals')}
            className="flex flex-col items-center gap-1.5"
          >
            <div className="flex h-13 w-full items-center justify-center rounded-2xl bg-[#E0B75E] text-[#1F221B] shadow-xs">
              <Target className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-medium text-[#4B4E44]">Goals</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('inventory')}
            className="flex flex-col items-center gap-1.5"
          >
            <div className="flex h-13 w-full items-center justify-center rounded-2xl border border-[#E6E0D3] bg-[#FCFBF8] text-[#2C3327]">
              <Package className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-medium text-[#4B4E44]">Inventory</span>
          </button>
        </section>

        {viewMode === 'overview' ? (
          <>
            {/* Monthly Spending & Rounded Bar Card */}
            <section className="rounded-[20px] border border-[#E6E0D3] bg-[#FCFBF8] p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#7D8075]">
                    {periodData.label} · Spending
                  </div>
                  <div className="mt-1 text-[23px] font-semibold tracking-tight text-[#23281E] tabular-nums leading-none">
                    {formatCurrency(periodData.totalSpent)}
                  </div>
                </div>
                <span className="rounded-full bg-[#E8F0E7] px-2.5 py-1 text-[10.5px] font-semibold text-[#2E5A36] tabular-nums">
                  {formatCurrency(perDaySafe)}/day safe
                </span>
              </div>

              <div className="mt-5 grid grid-cols-6 items-end gap-2.5 h-[106px]">
                {monthlyCashFlow.map((entry, idx) => {
                  const pct = Math.max(24, Math.round((entry.expenses / maxMonthlyExpense) * 100));
                  const isSelected = idx === selectedMobileBarIdx;
                  return (
                    <button
                      key={entry.month}
                      type="button"
                      onClick={() => setSelectedMobileBarIdx(idx)}
                      className="flex h-full flex-col items-center justify-end gap-1.5 focus:outline-none"
                    >
                      <div className="flex w-full flex-1 items-end justify-center">
                        <div
                          className={`w-full max-w-[26px] rounded-t-lg rounded-b-sm transition-all duration-200 ${
                            isSelected ? 'bg-[#D8A84E]' : 'bg-[#BDD0BD]'
                          }`}
                          style={{ height: `${pct}%` }}
                        />
                      </div>
                      <span
                        className={`text-[10px] font-semibold tracking-wide ${
                          isSelected ? 'text-[#23281E]' : 'text-[#8E9086]'
                        }`}
                      >
                        {entry.month.slice(0, 3)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {activeMobileBar && (
                <div className="mt-3 flex items-center gap-2 border-t border-[#EFEAE0] pt-2.5 text-[11.5px] text-[#6E7166] tabular-nums">
                  <span className="h-2 w-2 shrink-0 rounded-xs bg-[#D8A84E]" aria-hidden="true" />
                  <span>
                    {activeMobileBar.month} cash flow:{' '}
                    <strong className="font-medium text-[#23281E]">
                      {formatCurrency(activeMobileBar.income, { maximumFractionDigits: 0 })}
                    </strong>{' '}
                    in ·{' '}
                    <strong className="font-medium text-[#23281E]">
                      {formatCurrency(activeMobileBar.expenses, { maximumFractionDigits: 0 })}
                    </strong>{' '}
                    out
                  </span>
                </div>
              )}
            </section>

            {/* Recent Activity & Upcoming Bills */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between px-0.5">
                <h2 className="font-serif text-[17px] font-semibold text-[#23281E]">
                  Recent activity
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveModal('bills')}
                  className="inline-flex items-center gap-0.5 text-[12px] font-medium text-[#2E5A36]"
                >
                  <span>See all</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-2">
                {transactions.slice(0, 3).map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-[#E6E0D3] bg-[#FCFBF8] px-3.5 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFEAE0] text-[#2C3327]">
                        <Receipt className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[13.5px] font-semibold text-[#23281E]">
                          {tx.merchant}
                        </div>
                        <div className="truncate text-[11.5px] text-[#7D8075]">
                          {tx.category} · {tx.date}
                        </div>
                      </div>
                    </div>
                    <span className="shrink-0 text-[13.5px] font-semibold text-[#23281E] tabular-nums">
                      -{formatCurrency(tx.amount)}
                    </span>
                  </div>
                ))}

                {bills.slice(0, 2).map((bill) => (
                  <button
                    key={bill.id}
                    type="button"
                    onClick={() => onToggleBillPaid(bill.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[#E6E0D3] bg-[#FCFBF8] px-3.5 py-3 text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          bill.paid
                            ? 'bg-[#E8F0E7] text-[#2E5A36]'
                            : 'bg-[#F5EBD6] text-[#8C6D43]'
                        }`}
                      >
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div
                          className={`truncate text-[13.5px] font-semibold ${
                            bill.paid ? 'line-through text-[#8E9086]' : 'text-[#23281E]'
                          }`}
                        >
                          {bill.name}
                        </div>
                        <div className="truncate text-[11.5px] text-[#7D8075]">
                          {bill.paid ? 'Paid' : `Due ${bill.dueDate}`} · Tap to toggle
                        </div>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 text-[13.5px] font-semibold tabular-nums ${
                        bill.paid ? 'text-[#8E9086]' : 'text-[#23281E]'
                      }`}
                    >
                      {formatCurrency(bill.amount)}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </>
        ) : (
          /* Mobile Insights & Budget View (3rd Template Screen) */
          <>
            <section className="rounded-[20px] border border-[#E6E0D3] bg-[#FCFBF8] p-4">
              <div className="flex items-center gap-4">
                <div className="relative h-[108px] w-[108px] shrink-0">
                  <svg viewBox="0 0 108 108" className="h-full w-full -rotate-90">
                    <circle cx="54" cy="54" r="40" fill="none" stroke="#EFEAE0" strokeWidth="16" />
                    {(() => {
                      const c = 2 * Math.PI * 40;
                      let offsetPct = 0;
                      return periodData.spendingBreakdown.map((cat) => {
                        const dashLen = (cat.percentage / 100) * c;
                        const dashOffset = -((offsetPct / 100) * c);
                        offsetPct += cat.percentage;
                        return (
                          <circle
                            key={cat.id}
                            cx="54"
                            cy="54"
                            r="40"
                            fill="none"
                            stroke={cat.color}
                            strokeWidth="16"
                            strokeDasharray={`${dashLen} ${c}`}
                            strokeDashoffset={dashOffset}
                          />
                        );
                      });
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[14px] font-semibold text-[#23281E] tabular-nums">
                      {formatCurrency(periodData.totalSpent, { maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-[9.5px] text-[#7D8075]">spent</span>
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#7D8075]">
                    Total Spent · {periodData.label}
                  </div>
                  <div className="mt-1 text-[22px] font-semibold tracking-tight text-[#23281E] tabular-nums">
                    {formatCurrency(periodData.totalSpent)}
                  </div>
                  <div className="mt-1 inline-flex items-center rounded-full bg-[#E8F0E7] px-2 py-0.5 text-[10.5px] font-semibold text-[#2E5A36] tabular-nums">
                    {formatCurrency(effectiveSafeToSpend)} safe to spend
                  </div>
                  <div className="mt-1.5 text-[11px] text-[#7D8075] tabular-nums">
                    {assignedPercent}% assigned · {formatCurrency(remainingBudget)} remaining
                  </div>
                </div>
              </div>
            </section>

            {/* Dark Forest Smart Insight Card */}
            <section className="rounded-[20px] bg-gradient-to-br from-[#2C3327] to-[#1D2419] p-4 text-[#F5F2EB]">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-[9.5px] font-semibold tracking-[0.14em] uppercase text-[#E0B75E]">
                <Sparkles className="h-3 w-3" />
                <span>Smart Summary</span>
              </div>
              <p className="mt-2.5 font-serif text-[14.5px] italic leading-relaxed text-[#F5F2EB]">
                You have {formatCurrency(effectiveSafeToSpend)} available ({formatCurrency(perDaySafe)}
                /day) with {formatCurrency(remainingBudget)} remaining across your planned budget.
              </p>
              <div className="mt-2 text-[11px] text-[#A8AA9D]">
                Cash flow: {formatCurrency(periodData.cashFlow)} · Priority bill:{' '}
                {topPriorityBill ? topPriorityBill.name : 'None'}
              </div>
            </section>

            {/* By Category Segmented Bar Card */}
            <section className="rounded-[20px] border border-[#E6E0D3] bg-[#FCFBF8] p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <h2 className="text-[13.5px] font-semibold text-[#23281E]">By category</h2>
                <span className="text-[11px] text-[#7D8075]">
                  {periodData.spendingBreakdown.length} categories
                </span>
              </div>

              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[#EFEAE0] gap-0.5">
                {periodData.spendingBreakdown.map((cat) => (
                  <div
                    key={cat.id}
                    style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                    className="h-full first:rounded-l-full last:rounded-r-full"
                  />
                ))}
              </div>

              <div className="divide-y divide-[#EFEAE0]">
                {periodData.spendingBreakdown.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between py-2.5 text-[13px]"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="font-medium text-[#23281E]">{cat.name}</span>
                    </div>
                    <div className="text-right tabular-nums">
                      <span className="font-semibold text-[#23281E]">
                        {formatCurrency(cat.amount, { maximumFractionDigits: 0 })}
                      </span>
                      <span className="ml-2 text-[11.5px] text-[#7D8075]">
                        {cat.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>

      {/* ================= DESKTOP LAYOUT (>= md, unchanged) ================= */}
      <div className="hidden md:block space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-serif text-[24px] sm:text-[26px] font-semibold tracking-tight text-[#23281E]">
          {viewMode === 'overview' ? 'Overview' : 'Safe to Spend'}
        </h1>

        <div className="flex items-center justify-between sm:justify-end gap-2.5">
          <div
            role="group"
            aria-label="Dashboard view mode"
            className="inline-flex items-center gap-1 rounded-lg bg-[#EAE4D7] p-1"
          >
            <button
              type="button"
              onClick={() => setViewMode('overview')}
              className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'overview'
                  ? 'bg-[#FCFBF8] text-[#23281E] shadow-xs'
                  : 'text-[#6E7166] hover:text-[#23281E]'
              }`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setViewMode('budget')}
              className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'budget'
                  ? 'bg-[#FCFBF8] text-[#23281E] shadow-xs'
                  : 'text-[#6E7166] hover:text-[#23281E]'
              }`}
            >
              Budget
            </button>
          </div>

          <div className="relative">
            <select
              aria-label="Select reporting timeframe"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as TimeframeKey)}
              className="appearance-none rounded-lg border border-[#E3DDD0] bg-[#FCFBF8] py-2 pl-3 pr-8 text-[12.5px] font-medium text-[#2C3327] cursor-pointer hover:border-[#CFC6B4] focus:border-[#B89260] focus:outline-none focus:ring-2 focus:ring-[#B89260]/20"
            >
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="quarter">This Quarter</option>
              <option value="ytd">Year to Date</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6E7166]" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <div className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-4 sm:p-5">
          <div className="text-[11px] sm:text-[11.5px] font-semibold tracking-wide text-[#6E7166]">
            Net Worth
          </div>
          <div className="mt-1.5 sm:mt-2 text-[19px] sm:text-[26px] font-semibold tracking-tight text-[#23281E] tabular-nums leading-none">
            {formatCurrency(netWorth)}
          </div>
          <div className="mt-1.5 sm:mt-2 text-[11.5px] text-[#7D8075]">assets - debt</div>
        </div>

        <div className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-4 sm:p-5">
          <div className="text-[11px] sm:text-[11.5px] font-semibold tracking-wide text-[#6E7166]">
            Cash Flow
          </div>
          <div className="mt-1.5 sm:mt-2 text-[19px] sm:text-[26px] font-semibold tracking-tight text-[#23281E] tabular-nums leading-none">
            {formatCurrency(periodData.cashFlow)}
          </div>
          <div className="mt-1.5 sm:mt-2 text-[11.5px] text-[#7D8075]">income - expenses</div>
        </div>

        <div className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-4 sm:p-5">
          <div className="text-[11px] sm:text-[11.5px] font-semibold tracking-wide text-[#6E7166]">
            Left to Spend
          </div>
          <div className="mt-1.5 sm:mt-2 text-[19px] sm:text-[26px] font-semibold tracking-tight text-[#23281E] tabular-nums leading-none">
            {formatCurrency(periodData.amountLeftToSpend)}
          </div>
          <div className="mt-1.5 sm:mt-2 text-[11.5px] text-[#7D8075]">total available</div>
        </div>

        <div className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-4 sm:p-5">
          <div className="text-[11px] sm:text-[11.5px] font-semibold tracking-wide text-[#6E7166]">
            Debt Payoff
          </div>
          <div className="mt-1.5 sm:mt-2 text-[19px] sm:text-[26px] font-semibold tracking-tight text-[#23281E] tabular-nums leading-none">
            {debtPayoffPercent}%
          </div>
          <div className="mt-1.5 sm:mt-2 text-[11.5px] text-[#7D8075] tabular-nums truncate">
            {formatCurrency(debtPaidAmount, { maximumFractionDigits: 0 })} of{' '}
            {formatCurrency(debtOriginalTotal, { maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>

      {viewMode === 'overview' ? (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-5 rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-4 sm:p-5">
              <h2 className="text-[12px] font-semibold tracking-wide text-[#5C6055]">
                See Where Your Money Goes
              </h2>
              <div className="mt-2.5">
                <DonutSpendingChart
                  categories={periodData.spendingBreakdown}
                  totalSpent={periodData.totalSpent}
                />
              </div>
            </div>

            <div className="lg:col-span-7 rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-4 sm:p-5">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-[12px] font-semibold tracking-wide text-[#5C6055]">
                  Cash Flow Overview
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate('reports')}
                  className="text-[12px] font-medium text-[#8C6D43] hover:text-[#23281E] transition-colors whitespace-nowrap shrink-0"
                >
                  Reports
                </button>
              </div>
              <CashFlowBarChart data={monthlyCashFlow} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="flex flex-col justify-between rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-4 sm:p-5">
              <div>
                <h2 className="text-[12px] font-semibold tracking-wide text-[#5C6055] mb-3">
                  Upcoming Bills
                </h2>
                <div className="divide-y divide-[#EFEAE0]">
                  {bills.slice(0, 4).map((bill) => (
                    <div
                      key={bill.id}
                      className="grid grid-cols-[1fr_56px_80px] items-center gap-2 py-2.5 text-[13px]"
                    >
                      <button
                        type="button"
                        onClick={() => onToggleBillPaid(bill.id)}
                        title={bill.paid ? 'Mark as unpaid' : 'Mark as paid'}
                        className={`truncate text-left font-medium transition-colors ${
                          bill.paid
                            ? 'text-[#8E9086] line-through'
                            : 'text-[#23281E] hover:text-[#8C6D43]'
                        }`}
                      >
                        {bill.name}
                      </button>
                      <span className="text-[12px] text-[#7D8075] tabular-nums">
                        {bill.dueDate}
                      </span>
                      <span
                        className={`text-right font-medium tabular-nums ${
                          bill.paid ? 'text-[#8E9086]' : 'text-[#23281E]'
                        }`}
                      >
                        {formatCurrency(bill.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#EFEAE0]">
                <button
                  type="button"
                  onClick={() => setActiveModal('bills')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#DDD6C7] bg-[#F8F5EE] px-3.5 py-2 text-[12px] font-medium text-[#2C3327] hover:bg-[#EFE9DC] transition-colors whitespace-nowrap shrink-0"
                >
                  <Calendar className="h-3.5 w-3.5 text-[#6E7166]" />
                  <span>View Calendar</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-4 sm:p-5">
              <div>
                <h2 className="text-[12px] font-semibold tracking-wide text-[#5C6055] mb-3.5">
                  Sinking Funds
                </h2>
                <div className="space-y-3.5">
                  {sinkingFunds.map((fund) => {
                    const pct = Math.min(100, Math.round((fund.saved / fund.target) * 100));
                    return (
                      <div key={fund.id}>
                        <div className="flex items-baseline justify-between text-[13px] mb-1.5 gap-2">
                          <span className="font-medium text-[#23281E] truncate">{fund.name}</span>
                          <span className="text-[12px] text-[#6E7166] tabular-nums shrink-0">
                            {formatCurrency(fund.saved, { maximumFractionDigits: 0 })} /{' '}
                            {formatCurrency(fund.target, { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-[#EAE4D7]">
                          <div
                            className="h-full rounded-full bg-[#2E3628] transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#EFEAE0]">
                <button
                  type="button"
                  onClick={() => setActiveModal('funds')}
                  className="inline-flex items-center rounded-lg border border-[#DDD6C7] bg-[#F8F5EE] px-3.5 py-2 text-[12px] font-medium text-[#2C3327] hover:bg-[#EFE9DC] transition-colors whitespace-nowrap shrink-0"
                >
                  View All Funds
                </button>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-4 sm:p-5">
              <div>
                <h2 className="text-[12px] font-semibold tracking-wide text-[#5C6055] mb-3.5">
                  Goal Progress
                </h2>
                <div className="space-y-3.5">
                  {goals.map((goal) => {
                    const pct = Math.min(100, Math.round((goal.saved / goal.target) * 100));
                    return (
                      <div key={goal.id}>
                        <div className="text-[13px] font-medium text-[#23281E] mb-0.5">
                          {goal.name}
                        </div>
                        <div className="flex items-baseline justify-between text-[12px] text-[#6E7166] mb-1.5 tabular-nums">
                          <span>
                            {formatCurrency(goal.saved, { maximumFractionDigits: 0 })} of{' '}
                            {formatCurrency(goal.target, { maximumFractionDigits: 0 })}
                          </span>
                          <span className="font-semibold text-[#23281E]">{pct}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-[#EAE4D7]">
                          <div
                            className="h-full rounded-full bg-[#8D7D63] transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#EFEAE0]">
                <button
                  type="button"
                  onClick={() => setActiveModal('goals')}
                  className="inline-flex items-center rounded-lg border border-[#DDD6C7] bg-[#F8F5EE] px-3.5 py-2 text-[12px] font-medium text-[#2C3327] hover:bg-[#EFE9DC] transition-colors whitespace-nowrap shrink-0"
                >
                  View All Goals
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-5 rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3 gap-2">
              <h2 className="text-[12px] font-semibold tracking-wide text-[#5C6055]">
                Safe to Spend
              </h2>
              {topPriorityBill && (
                <span className="text-[11.5px] text-[#7D8075] truncate">
                  Priority: {topPriorityBill.name}
                </span>
              )}
            </div>

            <div className="divide-y divide-[#EFEAE0] text-[13px]">
              <div className="flex items-center justify-between py-2.5">
                <span className="text-[#4B4E44]">Income (left to budget)</span>
                <span className="font-medium text-[#23281E] tabular-nums">
                  {formatCurrency(periodData.incomeLeftToBudget)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-[#4B4E44]">Budgeted Expenses</span>
                <span className="font-medium text-[#23281E] tabular-nums">
                  - {formatCurrency(periodData.budgetedExpenses)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-[#4B4E44]">Bills (upcoming)</span>
                <span className="font-medium text-[#6E7166] tabular-nums">
                  - {formatCurrency(includeBillsInSafeToSpend ? unpaidBillsTotal : 0)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-[#4B4E44]">Savings Goals</span>
                <span className="font-medium text-[#6E7166] tabular-nums">- {formatCurrency(0)}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E6E0D3] flex items-end justify-between">
              <div>
                <div className="text-[12px] font-medium text-[#5C6055]">Total Safe to Spend</div>
                <div className="mt-0.5 text-[22px] sm:text-[24px] font-semibold tracking-tight text-[#23281E] tabular-nums leading-none">
                  {formatCurrency(effectiveSafeToSpend)}
                </div>
              </div>
              <div className="text-[12px] text-[#6E7166] tabular-nums">
                {formatCurrency(perDaySafe)} / day
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <h2 className="text-[12px] font-semibold tracking-wide text-[#5C6055]">
                Budget Overview
              </h2>
              <div className="mt-2.5 text-[22px] sm:text-[24px] font-semibold tracking-tight text-[#23281E] tabular-nums leading-none">
                {formatCurrency(leftToAssign)}
              </div>
              <div className="mt-1 text-[12px] text-[#7D8075]">left to assign</div>

              <div className="mt-4">
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#EAE4D7]">
                  <div
                    className="h-full rounded-full bg-[#B5915F]"
                    style={{ width: `${assignedPercent}%` }}
                  />
                </div>
                <div className="mt-1.5 text-[11.5px] font-medium text-[#6E7166] tabular-nums">
                  {assignedPercent}% assigned
                </div>
              </div>
            </div>

            <div className="mt-4 divide-y divide-[#EFEAE0] border-t border-[#EFEAE0] text-[13px]">
              <div className="flex items-center justify-between py-2">
                <span className="text-[#5C6055]">Planned</span>
                <span className="font-medium text-[#23281E] tabular-nums">
                  {formatCurrency(periodData.plannedBudget)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-[#5C6055]">Spent</span>
                <span className="font-medium text-[#23281E] tabular-nums">
                  {formatCurrency(periodData.spentBudget)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="font-medium text-[#23281E]">Remaining</span>
                <span className="font-semibold text-[#2E3628] tabular-nums">
                  {formatCurrency(remainingBudget)}
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 gap-2">
                <h2 className="text-[12px] font-semibold tracking-wide text-[#5C6055]">
                  Recent Transactions
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate('reports')}
                  className="text-[12px] font-medium text-[#8C6D43] hover:text-[#23281E] transition-colors whitespace-nowrap shrink-0"
                >
                  Reports
                </button>
              </div>

              <div className="relative mb-2.5">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#85877C]" />
                <input
                  type="search"
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  placeholder="Filter transactions..."
                  aria-label="Filter recent transactions"
                  className="w-full rounded-lg border border-[#E3DDD0] bg-white py-1.5 pl-8 pr-3 text-[12.5px] text-[#23281E] placeholder-[#8E9086] focus:border-[#B89260] focus:outline-none"
                />
              </div>

              <div className="divide-y divide-[#EFEAE0]">
                {filteredTransactions.length === 0 ? (
                  <p className="py-6 text-center text-[13px] text-[#7D8075]">
                    No transactions match &ldquo;{txSearch}&rdquo;.
                  </p>
                ) : (
                  filteredTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between gap-3 py-2.5 text-[13px]"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium text-[#23281E]">{tx.merchant}</div>
                        <div className="text-[11.5px] text-[#7D8075]">
                          {tx.date} · {tx.category}
                        </div>
                      </div>
                      <span className="font-medium text-[#23281E] tabular-nums shrink-0">
                        {formatCurrency(tx.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1B1F17]/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-5 sm:p-6 shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#EFEAE0]">
              <h3 className="font-serif text-[20px] font-semibold text-[#23281E]">
                {activeModal === 'bills' && 'Upcoming Bills'}
                {activeModal === 'funds' && 'Sinking Funds'}
                {activeModal === 'goals' && 'Goal Progress'}
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Close modal"
                className="rounded-lg p-2 text-[#6E7166] hover:bg-[#EFEAE0] hover:text-[#23281E]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {activeModal === 'bills' && (
              <div className="mt-4 space-y-4">
                <div className="divide-y divide-[#EFEAE0] max-h-[240px] overflow-y-auto">
                  {bills.map((bill) => (
                    <div
                      key={bill.id}
                      className="flex items-center justify-between py-2.5 text-[13px] gap-3"
                    >
                      <label className="flex items-center gap-3 cursor-pointer min-w-0">
                        <input
                          type="checkbox"
                          checked={bill.paid}
                          onChange={() => onToggleBillPaid(bill.id)}
                          className="h-4 w-4 shrink-0 rounded border-[#CFC6B4] accent-[#2E3628]"
                        />
                        <span
                          className={`truncate ${
                            bill.paid ? 'line-through text-[#8E9086]' : 'font-medium text-[#23281E]'
                          }`}
                        >
                          {bill.name}
                        </span>
                      </label>
                      <div className="flex items-center gap-3 tabular-nums shrink-0">
                        <span className="text-[12px] text-[#7D8075]">{bill.dueDate}</span>
                        <span className="font-medium text-[#23281E]">
                          {formatCurrency(bill.amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleCreateBill} className="pt-3 border-t border-[#EFEAE0] space-y-2.5">
                  <div className="text-[12px] font-semibold text-[#5C6055]">Add Scheduled Bill</div>
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_84px_96px_auto] gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Bill name"
                      value={newBillName}
                      onChange={(e) => setNewBillName(e.target.value)}
                      className="rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px] focus:border-[#B89260] focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Jul 24"
                      value={newBillDate}
                      onChange={(e) => setNewBillDate(e.target.value)}
                      className="rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px] focus:border-[#B89260] focus:outline-none"
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="Amount"
                      value={newBillAmount}
                      onChange={(e) => setNewBillAmount(e.target.value)}
                      className="rounded-lg border border-[#DDD6C7] bg-white px-3 py-2 text-[13px] tabular-nums focus:border-[#B89260] focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#2C3327] px-3.5 py-2 text-[12.5px] font-medium text-[#FCFBF8] hover:bg-[#3A4333] whitespace-nowrap shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeModal === 'funds' && (
              <div className="mt-4 space-y-3.5">
                {sinkingFunds.map((fund) => {
                  const pct = Math.min(100, Math.round((fund.saved / fund.target) * 100));
                  const val = contributionInputs[fund.id] ?? '100';
                  return (
                    <div key={fund.id} className="rounded-lg border border-[#EAE4D7] bg-[#F8F5EE] p-3.5">
                      <div className="flex items-center justify-between text-[13px] gap-2">
                        <span className="font-semibold text-[#23281E]">{fund.name}</span>
                        <span className="tabular-nums text-[#5C6055]">
                          {formatCurrency(fund.saved, { maximumFractionDigits: 0 })} /{' '}
                          {formatCurrency(fund.target, { maximumFractionDigits: 0 })} ({pct}%)
                        </span>
                      </div>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#E3DDD0]">
                        <div className="h-full rounded-full bg-[#2E3628]" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          value={val}
                          onChange={(e) =>
                            setContributionInputs((prev) => ({ ...prev, [fund.id]: e.target.value }))
                          }
                          aria-label={`Contribution amount for ${fund.name}`}
                          className="w-28 rounded-lg border border-[#DDD6C7] bg-white px-2.5 py-1.5 text-[12.5px] tabular-nums focus:border-[#B89260] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const amt = parseFloat(val);
                            if (!Number.isNaN(amt) && amt > 0) onContributeFund(fund.id, amt);
                          }}
                          className="rounded-lg bg-[#B89260] px-3 py-1.5 text-[12px] font-medium text-[#FCFBF8] hover:bg-[#9B7849] whitespace-nowrap shrink-0"
                        >
                          Add Funds
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeModal === 'goals' && (
              <div className="mt-4 space-y-3.5">
                {goals.map((goal) => {
                  const pct = Math.min(100, Math.round((goal.saved / goal.target) * 100));
                  const val = contributionInputs[goal.id] ?? '250';
                  return (
                    <div key={goal.id} className="rounded-lg border border-[#EAE4D7] bg-[#F8F5EE] p-3.5">
                      <div className="flex items-center justify-between text-[13px] gap-2">
                        <span className="font-semibold text-[#23281E]">{goal.name}</span>
                        <span className="tabular-nums text-[#5C6055]">
                          {formatCurrency(goal.saved, { maximumFractionDigits: 0 })} /{' '}
                          {formatCurrency(goal.target, { maximumFractionDigits: 0 })} ({pct}%)
                        </span>
                      </div>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#E3DDD0]">
                        <div className="h-full rounded-full bg-[#8D7D63]" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          value={val}
                          onChange={(e) =>
                            setContributionInputs((prev) => ({ ...prev, [goal.id]: e.target.value }))
                          }
                          aria-label={`Deposit amount for ${goal.name}`}
                          className="w-28 rounded-lg border border-[#DDD6C7] bg-white px-2.5 py-1.5 text-[12.5px] tabular-nums focus:border-[#B89260] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const amt = parseFloat(val);
                            if (!Number.isNaN(amt) && amt > 0) onContributeGoal(goal.id, amt);
                          }}
                          className="rounded-lg bg-[#2C3327] px-3 py-1.5 text-[12px] font-medium text-[#FCFBF8] hover:bg-[#3A4333] whitespace-nowrap shrink-0"
                        >
                          Deposit
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
