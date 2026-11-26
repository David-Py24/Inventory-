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
  Sparkles,
  Target,
  Wallet,
} from 'lucide-react';
import {
  MonthlyCashFlow,
  PageRoute,
  SpendingCategory,
  TimeframeKey,
  TransactionRecord,
  UpcomingBill,
} from '../types';
import { formatCurrency, getActiveCurrency } from '../utils/format';

export interface MobileDashboardViewProps {
  timeframe: TimeframeKey;
  onChangeTimeframe: (next: TimeframeKey) => void;
  viewMode: 'overview' | 'budget';
  onChangeViewMode: (next: 'overview' | 'budget') => void;
  periodLabel: string;
  netWorth: number;
  effectiveSafeToSpend: number;
  perDaySafe: number;
  totalSpent: number;
  cashFlow: number;
  assignedPercent: number;
  remainingBudget: number;
  spendingBreakdown: SpendingCategory[];
  monthlyCashFlow: MonthlyCashFlow[];
  transactions: TransactionRecord[];
  bills: UpcomingBill[];
  topPriorityBill?: UpcomingBill;
  onOpenModal: (modal: 'bills' | 'funds' | 'goals') => void;
  onToggleBillPaid: (id: string) => void;
  onNavigate: (route: PageRoute) => void;
}

export const MobileDashboardView: React.FC<MobileDashboardViewProps> = ({
  timeframe,
  onChangeTimeframe,
  viewMode,
  onChangeViewMode,
  periodLabel,
  netWorth,
  effectiveSafeToSpend,
  perDaySafe,
  totalSpent,
  cashFlow,
  assignedPercent,
  remainingBudget,
  spendingBreakdown,
  monthlyCashFlow,
  transactions,
  bills,
  topPriorityBill,
  onOpenModal,
  onToggleBillPaid,
  onNavigate,
}) => {
  const [selectedMobileBarIdx, setSelectedMobileBarIdx] = useState<number>(
    Math.max(0, monthlyCashFlow.length - 1)
  );

  const maxMonthlyExpense = useMemo(
    () => Math.max(1, ...monthlyCashFlow.map((m) => m.expenses)),
    [monthlyCashFlow]
  );
  const activeMobileBar =
    monthlyCashFlow[selectedMobileBarIdx] ?? monthlyCashFlow[monthlyCashFlow.length - 1];

  return (
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
              onChange={(e) => onChangeTimeframe(e.target.value as TimeframeKey)}
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
            onClick={() => onOpenModal('bills')}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#E0B75E] py-2.5 px-3 text-[12.5px] font-semibold text-[#1F221B] hover:bg-[#D5AA4E] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Bill</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenModal('funds')}
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
          onClick={() => onChangeViewMode('overview')}
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
          onClick={() => onChangeViewMode('budget')}
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
          onClick={() => onOpenModal('goals')}
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
                  {periodLabel} · Spending
                </div>
                <div className="mt-1 text-[23px] font-semibold tracking-tight text-[#23281E] tabular-nums leading-none">
                  {formatCurrency(totalSpent)}
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
                onClick={() => onOpenModal('bills')}
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
        /* Mobile Insights & Budget View */
        <>
          <section className="rounded-[20px] border border-[#E6E0D3] bg-[#FCFBF8] p-4">
            <div className="flex items-center gap-4">
              <div className="relative h-[108px] w-[108px] shrink-0">
                <svg viewBox="0 0 108 108" className="h-full w-full -rotate-90">
                  <circle cx="54" cy="54" r="40" fill="none" stroke="#EFEAE0" strokeWidth="16" />
                  {(() => {
                    const c = 2 * Math.PI * 40;
                    let offsetPct = 0;
                    return spendingBreakdown.map((cat) => {
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
                    {formatCurrency(totalSpent, { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-[9.5px] text-[#7D8075]">spent</span>
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#7D8075]">
                  Total Spent · {periodLabel}
                </div>
                <div className="mt-1 text-[22px] font-semibold tracking-tight text-[#23281E] tabular-nums">
                  {formatCurrency(totalSpent)}
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
              Cash flow: {formatCurrency(cashFlow)} · Priority bill:{' '}
              {topPriorityBill ? topPriorityBill.name : 'None'}
            </div>
          </section>

          {/* By Category Segmented Bar Card */}
          <section className="rounded-[20px] border border-[#E6E0D3] bg-[#FCFBF8] p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-[13.5px] font-semibold text-[#23281E]">By category</h2>
              <span className="text-[11px] text-[#7D8075]">
                {spendingBreakdown.length} categories
              </span>
            </div>

            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[#EFEAE0] gap-0.5">
              {spendingBreakdown.map((cat) => (
                <div
                  key={cat.id}
                  style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                  className="h-full first:rounded-l-full last:rounded-r-full"
                />
              ))}
            </div>

            <div className="divide-y divide-[#EFEAE0]">
              {spendingBreakdown.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between py-2.5 text-[13px]">
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
                    <span className="ml-2 text-[11.5px] text-[#7D8075]">{cat.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};
