import React, { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { AccountRecord, InventoryItem, MonthlyCashFlow } from '../types';
import { TIMEFRAME_METRICS } from '../data/initialData';
import { downloadCsv, formatCurrency, formatNumber, getCurrencySymbol } from '../utils/format';

interface ReportsPageProps {
  accounts: AccountRecord[];
  inventory: InventoryItem[];
  monthlyCashFlow: MonthlyCashFlow[];
}

type ReportTab = 'financial' | 'expenses' | 'inventory';

export const ReportsPage: React.FC<ReportsPageProps> = ({
  accounts,
  inventory,
  monthlyCashFlow,
}) => {
  const [activeTab, setActiveTab] = useState<ReportTab>('financial');
  const [activePoint, setActivePoint] = useState<{
    index: number;
    series: 'income' | 'net';
  } | null>(null);

  const financialStats = useMemo(() => {
    const totalIncome = monthlyCashFlow.reduce((sum, m) => sum + m.income, 0);
    const totalExpenses = monthlyCashFlow.reduce((sum, m) => sum + m.expenses, 0);
    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;
    const totalAssets = accounts
      .filter((a) => !a.isLiability)
      .reduce((sum, a) => sum + a.balance, 0);
    const totalLiabilities = accounts
      .filter((a) => a.isLiability)
      .reduce((sum, a) => sum + a.balance, 0);

    return {
      totalIncome,
      totalExpenses,
      netSavings,
      savingsRate,
      netWorth: totalAssets - totalLiabilities,
    };
  }, [accounts, monthlyCashFlow]);

  const expenseCategories = useMemo(() => {
    const base = TIMEFRAME_METRICS.this_month.spendingBreakdown;
    const plannedMap: Record<string, number> = {
      housing: 2000,
      food: 800,
      transport: 550,
      utilities: 400,
      other: 500,
    };
    return base.map((cat) => {
      const planned = plannedMap[cat.id] ?? cat.amount;
      const variance = planned - cat.amount;
      return {
        ...cat,
        planned,
        variance,
        status: variance >= 0 ? 'Under Budget' : 'Over Budget',
      };
    });
  }, []);

  const inventoryByCategory = useMemo(() => {
    const groups = new Map<
      string,
      { category: string; skus: number; units: number; value: number; lowOrOut: number }
    >();
    inventory.forEach((item) => {
      const existing = groups.get(item.category) ?? {
        category: item.category,
        skus: 0,
        units: 0,
        value: 0,
        lowOrOut: 0,
      };
      existing.skus += 1;
      existing.units += item.quantity;
      existing.value += item.quantity * item.unitCost;
      if (item.quantity <= item.reorderPoint) existing.lowOrOut += 1;
      groups.set(item.category, existing);
    });
    return Array.from(groups.values()).sort((a, b) => b.value - a.value);
  }, [inventory]);

  const totalInventoryValue = useMemo(
    () => inventory.reduce((sum, i) => sum + i.quantity * i.unitCost, 0),
    [inventory]
  );

  const handleExportReport = () => {
    if (activeTab === 'financial') {
      downloadCsv(
        'tallyledger-cashflow-report.csv',
        ['Month', 'Income', 'Expenses', 'Net Cash Flow', 'Savings Margin %'],
        monthlyCashFlow.map((m) => {
          const net = m.income - m.expenses;
          const rate = ((net / m.income) * 100).toFixed(1);
          return [m.month, m.income.toFixed(2), m.expenses.toFixed(2), net.toFixed(2), `${rate}%`];
        })
      );
    } else if (activeTab === 'expenses') {
      downloadCsv(
        'tallyledger-expense-variance.csv',
        ['Category', 'Planned', 'Actual', 'Variance', 'Share %', 'Status'],
        expenseCategories.map((c) => [
          c.name,
          c.planned.toFixed(2),
          c.amount.toFixed(2),
          c.variance.toFixed(2),
          `${c.percentage}%`,
          c.status,
        ])
      );
    } else {
      downloadCsv(
        'tallyledger-inventory-valuation.csv',
        ['Category', 'SKUs', 'Total Units', 'Asset Value', 'Reorder Alerts'],
        inventoryByCategory.map((g) => [
          g.category,
          g.skus,
          g.units,
          g.value.toFixed(2),
          g.lowOrOut,
        ])
      );
    }
  };

  const chartW = 720;
  const chartH = 200;
  const padL = 44;
  const padR = 26;
  const padT = 16;
  const padB = 26;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;
  const maxVal = 6000;

  const pointsIncome = monthlyCashFlow
    .map((m, idx) => {
      const x = padL + (idx / Math.max(1, monthlyCashFlow.length - 1)) * plotW;
      const y = padT + plotH - (m.income / maxVal) * plotH;
      return `${x},${y}`;
    })
    .join(' ');

  const pointsNet = monthlyCashFlow
    .map((m, idx) => {
      const net = m.income - m.expenses;
      const x = padL + (idx / Math.max(1, monthlyCashFlow.length - 1)) * plotW;
      const y = padT + plotH - (net / maxVal) * plotH;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-serif text-[24px] sm:text-[26px] font-semibold tracking-tight text-[#23281E]">
          Reports
        </h1>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5">
          <div
            role="tablist"
            aria-label="Report sections"
            className="flex items-center gap-1 overflow-x-auto rounded-lg bg-[#EAE4D7] p-1"
          >
            {(
              [
                { id: 'financial', label: 'Financial' },
                { id: 'expenses', label: 'Expenses' },
                { id: 'inventory', label: 'Inventory' },
              ] as { id: ReportTab; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-[#FCFBF8] text-[#23281E] shadow-xs'
                    : 'text-[#6E7166] hover:text-[#23281E]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportReport}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2C3327] px-3.5 py-2 text-[12.5px] font-medium text-[#FCFBF8] hover:bg-[#3A4333] transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-4 sm:p-5">
          <div className="text-[11px] sm:text-[11.5px] font-semibold tracking-wide text-[#6E7166]">
            6-Mo Income
          </div>
          <div className="mt-1.5 sm:mt-2 text-[19px] sm:text-[25px] font-semibold tracking-tight text-[#23281E] tabular-nums leading-none">
            {formatCurrency(financialStats.totalIncome)}
          </div>
          <div className="mt-1.5 text-[11.5px] text-[#7D8075]">Jan – Jun</div>
        </div>

        <div className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-4 sm:p-5">
          <div className="text-[11px] sm:text-[11.5px] font-semibold tracking-wide text-[#6E7166]">
            6-Mo Expenses
          </div>
          <div className="mt-1.5 sm:mt-2 text-[19px] sm:text-[25px] font-semibold tracking-tight text-[#23281E] tabular-nums leading-none">
            {formatCurrency(financialStats.totalExpenses)}
          </div>
          <div className="mt-1.5 text-[11.5px] text-[#7D8075]">total outflow</div>
        </div>

        <div className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-4 sm:p-5">
          <div className="text-[11px] sm:text-[11.5px] font-semibold tracking-wide text-[#6E7166]">
            Net Retained
          </div>
          <div className="mt-1.5 sm:mt-2 text-[19px] sm:text-[25px] font-semibold tracking-tight text-[#23281E] tabular-nums leading-none">
            {formatCurrency(financialStats.netSavings)}
          </div>
          <div className="mt-1.5 text-[11.5px] text-[#7D8075] tabular-nums">
            {financialStats.savingsRate}% margin
          </div>
        </div>

        <div className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-4 sm:p-5">
          <div className="text-[11px] sm:text-[11.5px] font-semibold tracking-wide text-[#6E7166]">
            Total Assets
          </div>
          <div className="mt-1.5 sm:mt-2 text-[19px] sm:text-[25px] font-semibold tracking-tight text-[#23281E] tabular-nums leading-none">
            {formatCurrency(financialStats.netWorth + totalInventoryValue)}
          </div>
          <div className="mt-1.5 text-[11.5px] text-[#7D8075]">net worth + stock</div>
        </div>
      </div>

      {activeTab === 'financial' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-[13px] font-semibold text-[#23281E]">
                Income & Net Savings Trend
              </h2>
              <div className="flex items-center gap-4 text-[11.5px] shrink-0">
                <span className="flex items-center gap-1.5 text-[#2E3328]">
                  <span className="h-2.5 w-2.5 rounded-[2px] bg-[#2E3628]" />
                  Income
                </span>
                <span className="flex items-center gap-1.5 text-[#2E3328]">
                  <span className="h-2.5 w-2.5 rounded-[2px] bg-[#B5915F]" />
                  Net Cash
                </span>
              </div>
            </div>

            <div className="relative">
              <svg
                viewBox={`0 0 ${chartW} ${chartH}`}
                className="w-full h-auto overflow-visible touch-manipulation"
                role="img"
                aria-label="Income and net savings trend chart"
                onMouseLeave={() => setActivePoint(null)}
              >
                {[0, 2000, 4000, 6000].map((tick) => {
                  const y = padT + plotH - (tick / maxVal) * plotH;
                  return (
                    <g key={tick}>
                      <line
                        x1={padL}
                        y1={y}
                        x2={chartW - padR}
                        y2={y}
                        stroke="#EFEAE0"
                        strokeWidth="1"
                      />
                      <text
                        x={padL - 8}
                        y={y + 4}
                        textAnchor="end"
                        className="fill-[#6E7166] text-[10.5px] tabular-nums"
                      >
                        {tick === 0
                          ? `${getCurrencySymbol()}0`
                          : `${getCurrencySymbol()}${tick / 1000}K`}
                      </text>
                    </g>
                  );
                })}

                {activePoint && (
                  <line
                    x1={
                      padL +
                      (activePoint.index / Math.max(1, monthlyCashFlow.length - 1)) * plotW
                    }
                    y1={padT}
                    x2={
                      padL +
                      (activePoint.index / Math.max(1, monthlyCashFlow.length - 1)) * plotW
                    }
                    y2={padT + plotH}
                    stroke="#D6CEBE"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                )}

                <polyline
                  fill="none"
                  stroke="#2E3628"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  points={pointsIncome}
                />
                <polyline
                  fill="none"
                  stroke="#B5915F"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  points={pointsNet}
                />

                {monthlyCashFlow.map((m, idx) => {
                  const x = padL + (idx / Math.max(1, monthlyCashFlow.length - 1)) * plotW;
                  const yInc = padT + plotH - (m.income / maxVal) * plotH;
                  const yNet = padT + plotH - ((m.income - m.expenses) / maxVal) * plotH;
                  const isIncActive =
                    activePoint?.index === idx && activePoint.series === 'income';
                  const isNetActive =
                    activePoint?.index === idx && activePoint.series === 'net';

                  return (
                    <g key={m.month}>
                      <text
                        x={x}
                        y={chartH - 5}
                        textAnchor="middle"
                        className={`text-[10.5px] font-medium ${
                          activePoint?.index === idx ? 'fill-[#23281E]' : 'fill-[#6E7166]'
                        }`}
                      >
                        {m.month}
                      </text>

                      {isIncActive && (
                        <circle
                          cx={x}
                          cy={yInc}
                          r={8.5}
                          fill="#2E3628"
                          fillOpacity={0.14}
                          className="pointer-events-none"
                        />
                      )}
                      <circle
                        cx={x}
                        cy={yInc}
                        r={isIncActive ? 5.5 : 4}
                        fill="#2E3628"
                        className="pointer-events-none transition-all duration-150"
                      />
                      <circle
                        cx={x}
                        cy={yInc}
                        r={16}
                        fill="transparent"
                        className="cursor-pointer"
                        onMouseEnter={() => setActivePoint({ index: idx, series: 'income' })}
                        onClick={() =>
                          setActivePoint((prev) =>
                            prev?.index === idx && prev.series === 'income'
                              ? null
                              : { index: idx, series: 'income' }
                          )
                        }
                      />

                      {isNetActive && (
                        <circle
                          cx={x}
                          cy={yNet}
                          r={8.5}
                          fill="#B5915F"
                          fillOpacity={0.2}
                          className="pointer-events-none"
                        />
                      )}
                      <circle
                        cx={x}
                        cy={yNet}
                        r={isNetActive ? 5.5 : 4}
                        fill="#B5915F"
                        className="pointer-events-none transition-all duration-150"
                      />
                      <circle
                        cx={x}
                        cy={yNet}
                        r={16}
                        fill="transparent"
                        className="cursor-pointer"
                        onMouseEnter={() => setActivePoint({ index: idx, series: 'net' })}
                        onClick={() =>
                          setActivePoint((prev) =>
                            prev?.index === idx && prev.series === 'net'
                              ? null
                              : { index: idx, series: 'net' }
                          )
                        }
                      />
                    </g>
                  );
                })}
              </svg>

              {activePoint && (() => {
                const item = monthlyCashFlow[activePoint.index];
                const net = item.income - item.expenses;
                const margin = ((net / item.income) * 100).toFixed(1);
                const dotX =
                  padL +
                  (activePoint.index / Math.max(1, monthlyCashFlow.length - 1)) * plotW;
                const dotY =
                  activePoint.series === 'income'
                    ? padT + plotH - (item.income / maxVal) * plotH
                    : padT + plotH - (net / maxVal) * plotH;

                const leftPct = (dotX / chartW) * 100;
                const topPct = (dotY / chartH) * 100;
                const placeLeft = activePoint.index >= 4;

                return (
                  <div
                    role="status"
                    aria-live="polite"
                    style={{
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                      transform: placeLeft
                        ? 'translate(calc(-100% - 14px), -50%)'
                        : 'translate(14px, -50%)',
                    }}
                    className="pointer-events-none absolute z-20 w-[184px] rounded-lg border border-[#DDD6C7] bg-[#FCFBF8]/95 px-3 py-2.5 shadow-md backdrop-blur-[2px]"
                  >
                    <div className="flex items-baseline justify-between border-b border-[#EFEAE0] pb-1.5 mb-1.5">
                      <span className="text-[11.5px] font-semibold text-[#23281E]">
                        {item.month} 2026
                      </span>
                      <span className="text-[11px] font-medium text-[#6E7166] tabular-nums">
                        {margin}% margin
                      </span>
                    </div>

                    <div className="space-y-1 text-[11.5px] tabular-nums">
                      <div
                        className={`flex items-center justify-between ${
                          activePoint.series === 'income'
                            ? 'font-semibold text-[#23281E]'
                            : 'text-[#5C6055]'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-[2px] bg-[#2E3628]" />
                          Income
                        </span>
                        <span>{formatCurrency(item.income)}</span>
                      </div>

                      <div className="flex items-center justify-between text-[#6E7166]">
                        <span className="pl-3.5">Expenses</span>
                        <span>{formatCurrency(item.expenses)}</span>
                      </div>

                      <div
                        className={`flex items-center justify-between pt-0.5 border-t border-[#F4F0E6] ${
                          activePoint.series === 'net'
                            ? 'font-semibold text-[#23281E]'
                            : 'text-[#5C6055]'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-[2px] bg-[#B5915F]" />
                          Net Cash
                        </span>
                        <span className="text-[#2E5A36] font-semibold">
                          {formatCurrency(net)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] overflow-hidden">
            <div className="border-b border-[#EFEAE0] px-4 sm:px-5 py-3.5">
              <h2 className="text-[13px] font-semibold text-[#23281E]">
                Monthly Statement
              </h2>
            </div>

            <div className="divide-y divide-[#EFEAE0] md:hidden">
              {monthlyCashFlow.map((m) => {
                const net = m.income - m.expenses;
                const margin = ((net / m.income) * 100).toFixed(1);
                return (
                  <div key={m.month} className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-[14px] text-[#23281E]">{m.month} 2026</div>
                      <div className="text-[12px] text-[#6E7166] tabular-nums">
                        In {formatCurrency(m.income, { maximumFractionDigits: 0 })} · Out{' '}
                        {formatCurrency(m.expenses, { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                    <div className="text-right tabular-nums">
                      <div className="font-semibold text-[14px] text-[#2E5A36]">
                        {formatCurrency(net)}
                      </div>
                      <div className="text-[11.5px] text-[#7D8075]">{margin}% margin</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#E6E0D3] bg-[#F8F5EE] text-[11.5px] font-semibold text-[#5C6055]">
                    <th className="py-3 pl-5 pr-3">Month</th>
                    <th className="py-3 px-3 text-right">Income</th>
                    <th className="py-3 px-3 text-right">Expenses</th>
                    <th className="py-3 px-3 text-right">Net Cash Flow</th>
                    <th className="py-3 pl-3 pr-5 text-right">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFEAE0] text-[13px]">
                  {monthlyCashFlow.map((m) => {
                    const net = m.income - m.expenses;
                    const margin = ((net / m.income) * 100).toFixed(1);
                    return (
                      <tr key={m.month} className="hover:bg-[#F8F5EE]/70">
                        <td className="py-3 pl-5 pr-3 font-medium text-[#23281E]">{m.month} 2026</td>
                        <td className="py-3 px-3 text-right tabular-nums text-[#23281E]">
                          {formatCurrency(m.income)}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums text-[#6E7166]">
                          {formatCurrency(m.expenses)}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold tabular-nums text-[#2E5A36]">
                          {formatCurrency(net)}
                        </td>
                        <td className="py-3 pl-3 pr-5 text-right tabular-nums text-[#23281E]">
                          {margin}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[#E6E0D3] bg-[#F8F5EE] text-[13px] font-semibold text-[#23281E]">
                    <td className="py-3 pl-5 pr-3">Six-Month Total</td>
                    <td className="py-3 px-3 text-right tabular-nums">
                      {formatCurrency(financialStats.totalIncome)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums">
                      {formatCurrency(financialStats.totalExpenses)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-[#2E5A36]">
                      {formatCurrency(financialStats.netSavings)}
                    </td>
                    <td className="py-3 pl-3 pr-5 text-right tabular-nums">
                      {financialStats.savingsRate}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] overflow-hidden">
          <div className="border-b border-[#EFEAE0] px-4 sm:px-5 py-3.5">
            <h2 className="text-[13px] font-semibold text-[#23281E]">
              Budget vs. Actual Spend
            </h2>
          </div>

          <div className="divide-y divide-[#EFEAE0] md:hidden">
            {expenseCategories.map((cat) => (
              <div key={cat.id} className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-medium text-[14px] text-[#23281E]">
                    <span
                      className="h-2.5 w-2.5 rounded-[2px] shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span>{cat.name}</span>
                  </div>
                  <div className="mt-0.5 text-[12px] text-[#6E7166] tabular-nums">
                    Planned {formatCurrency(cat.planned, { maximumFractionDigits: 0 })} · {cat.percentage}%
                  </div>
                </div>
                <div className="text-right tabular-nums shrink-0">
                  <div className="font-semibold text-[14px] text-[#23281E]">
                    {formatCurrency(cat.amount)}
                  </div>
                  <div
                    className={`text-[11.5px] font-medium ${
                      cat.variance >= 0 ? 'text-[#2E5A36]' : 'text-[#B91C1C]'
                    }`}
                  >
                    {cat.variance >= 0 ? '+' : ''}
                    {formatCurrency(cat.variance)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#E6E0D3] bg-[#F8F5EE] text-[11.5px] font-semibold text-[#5C6055]">
                  <th className="py-3 pl-5 pr-3">Category</th>
                  <th className="py-3 px-3 text-right">Share</th>
                  <th className="py-3 px-3 text-right">Planned</th>
                  <th className="py-3 px-3 text-right">Actual</th>
                  <th className="py-3 px-3 text-right">Variance</th>
                  <th className="py-3 pl-3 pr-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFEAE0] text-[13px]">
                {expenseCategories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-[#F8F5EE]/70">
                    <td className="py-3 pl-5 pr-3 font-medium text-[#23281E]">
                      <span className="inline-flex items-center gap-2.5">
                        <span
                          className="h-2.5 w-2.5 rounded-[2px]"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-[#6E7166]">
                      {cat.percentage}%
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-[#23281E]">
                      {formatCurrency(cat.planned)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums font-medium text-[#23281E]">
                      {formatCurrency(cat.amount)}
                    </td>
                    <td
                      className={`py-3 px-3 text-right tabular-nums font-medium ${
                        cat.variance >= 0 ? 'text-[#2E5A36]' : 'text-[#B91C1C]'
                      }`}
                    >
                      {cat.variance >= 0 ? '+' : ''}
                      {formatCurrency(cat.variance)}
                    </td>
                    <td className="py-3 pl-3 pr-5 text-right text-[12.5px] font-medium">
                      <span className={cat.variance >= 0 ? 'text-[#2E5A36]' : 'text-[#B91C1C]'}>
                        {cat.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="rounded-xl border border-[#E6E0D3] bg-[#FCFBF8] overflow-hidden">
          <div className="border-b border-[#EFEAE0] px-4 sm:px-5 py-3.5 flex items-center justify-between gap-2">
            <h2 className="text-[13px] font-semibold text-[#23281E]">
              Valuation by Category
            </h2>
            <span className="text-[12px] text-[#6E7166] tabular-nums">
              {formatCurrency(totalInventoryValue)}
            </span>
          </div>

          <div className="divide-y divide-[#EFEAE0] md:hidden">
            {inventoryByCategory.map((group) => {
              const share =
                totalInventoryValue > 0
                  ? Math.round((group.value / totalInventoryValue) * 100)
                  : 0;
              return (
                <div key={group.category} className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-[14px] text-[#23281E]">{group.category}</span>
                    <span className="font-semibold text-[14px] text-[#23281E] tabular-nums">
                      {formatCurrency(group.value)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EAE4D7]">
                    <div
                      className="h-full rounded-full bg-[#2E3628]"
                      style={{ width: `${share}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[12px] text-[#6E7166] tabular-nums">
                    <span>
                      {group.skus} SKUs · {formatNumber(group.units)} units
                    </span>
                    <span className={group.lowOrOut > 0 ? 'text-[#A16207]' : 'text-[#2E5A36]'}>
                      {group.lowOrOut > 0 ? `${group.lowOrOut} flagged` : 'Nominal'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#E6E0D3] bg-[#F8F5EE] text-[11.5px] font-semibold text-[#5C6055]">
                  <th className="py-3 pl-5 pr-3">Category</th>
                  <th className="py-3 px-3 text-right">SKUs</th>
                  <th className="py-3 px-3 text-right">Units</th>
                  <th className="py-3 px-3 text-right">Valuation</th>
                  <th className="py-3 px-3">Share</th>
                  <th className="py-3 pl-3 pr-5 text-right">Alerts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFEAE0] text-[13px]">
                {inventoryByCategory.map((group) => {
                  const share =
                    totalInventoryValue > 0
                      ? Math.round((group.value / totalInventoryValue) * 100)
                      : 0;
                  return (
                    <tr key={group.category} className="hover:bg-[#F8F5EE]/70">
                      <td className="py-3 pl-5 pr-3 font-medium text-[#23281E]">
                        {group.category}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-[#6E7166]">
                        {group.skus}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-[#23281E]">
                        {formatNumber(group.units)}
                      </td>
                      <td className="py-3 px-3 text-right font-medium tabular-nums text-[#23281E]">
                        {formatCurrency(group.value)}
                      </td>
                      <td className="py-3 px-3 w-[180px]">
                        <div className="flex items-center gap-2.5">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#EAE4D7]">
                            <div
                              className="h-full rounded-full bg-[#2E3628]"
                              style={{ width: `${share}%` }}
                            />
                          </div>
                          <span className="w-9 text-right text-[12px] text-[#6E7166] tabular-nums">
                            {share}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pl-3 pr-5 text-right tabular-nums">
                        <span
                          className={`font-medium ${
                            group.lowOrOut > 0 ? 'text-[#A16207]' : 'text-[#2E5A36]'
                          }`}
                        >
                          {group.lowOrOut > 0 ? `${group.lowOrOut} flagged` : 'Nominal'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
