import React, { useState } from 'react';
import { MonthlyCashFlow } from '../types';
import { formatCurrency, getCurrencySymbol } from '../utils/format';

interface CashFlowBarChartProps {
  data: MonthlyCashFlow[];
}

export const CashFlowBarChart: React.FC<CashFlowBarChartProps> = ({ data }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const maxY = 6000;
  const ticks = [6000, 4000, 2000, 0];

  const chartHeight = 168;
  const chartWidth = 460;
  const padLeft = 38;
  const padRight = 10;
  const padTop = 10;
  const padBottom = 24;
  const plotWidth = chartWidth - padLeft - padRight;
  const plotHeight = chartHeight - padTop - padBottom;

  const groupWidth = plotWidth / data.length;
  const barWidth = 14;
  const barGap = 4;

  const yPos = (val: number) => padTop + plotHeight - (val / maxY) * plotHeight;
  const activeItem = activeIndex !== null ? data[activeIndex] : null;

  return (
    <div className="relative">
      <div className="mb-2 flex min-h-[20px] flex-wrap items-center justify-between gap-2 text-[11.5px] text-[#6E7166]">
        {activeItem ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 tabular-nums">
            <span className="font-semibold text-[#23281E]">{activeItem.month}</span>
            <span>
              In:{' '}
              <strong className="font-semibold text-[#2E3628]">
                {formatCurrency(activeItem.income, { maximumFractionDigits: 0 })}
              </strong>
            </span>
            <span>
              Out:{' '}
              <strong className="font-semibold text-[#9B7849]">
                {formatCurrency(activeItem.expenses, { maximumFractionDigits: 0 })}
              </strong>
            </span>
          </div>
        ) : (
          <span aria-hidden="true" />
        )}

        <div className="flex items-center gap-4 shrink-0 ml-auto">
          <span className="flex items-center gap-1.5 font-medium text-[#2E3328]">
            <span className="h-2.5 w-2.5 rounded-[2px] bg-[#2E3628]" aria-hidden="true" />
            Income
          </span>
          <span className="flex items-center gap-1.5 font-medium text-[#2E3328]">
            <span className="h-2.5 w-2.5 rounded-[2px] bg-[#B5915F]" aria-hidden="true" />
            Expenses
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full h-auto overflow-visible touch-manipulation"
        role="img"
        aria-label="Six-month cash flow bar chart"
      >
        {ticks.map((tick) => {
          const y = yPos(tick);
          return (
            <g key={tick}>
              <line
                x1={padLeft}
                y1={y}
                x2={chartWidth - padRight}
                y2={y}
                stroke={tick === 0 ? '#DDD6C7' : '#EFEAE0'}
                strokeWidth="1"
              />
              <text
                x={padLeft - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-[#6E7166] text-[10.5px] tabular-nums"
              >
                {tick === 0 ? `${getCurrencySymbol()}0` : `${getCurrencySymbol()}${tick / 1000}K`}
              </text>
            </g>
          );
        })}

        {data.map((item, idx) => {
          const groupCenter = padLeft + groupWidth * idx + groupWidth / 2;
          const incomeX = groupCenter - barWidth - barGap / 2;
          const expenseX = groupCenter + barGap / 2;

          const incomeY = yPos(item.income);
          const incomeH = padTop + plotHeight - incomeY;

          const expenseY = yPos(item.expenses);
          const expenseH = padTop + plotHeight - expenseY;

          const isActive = activeIndex === idx;
          const isDimmed = activeIndex !== null && !isActive;

          return (
            <g
              key={item.month}
              className="cursor-pointer"
              onMouseEnter={() => setActiveIndex(idx)}
              onMouseLeave={() => setActiveIndex(null)}
              onClick={() => setActiveIndex((prev) => (prev === idx ? null : idx))}
            >
              <rect
                x={padLeft + groupWidth * idx}
                y={padTop}
                width={groupWidth}
                height={plotHeight + padBottom}
                fill={isActive ? 'rgba(184, 146, 96, 0.08)' : 'transparent'}
                rx="4"
              />
              <rect
                x={incomeX}
                y={incomeY}
                width={barWidth}
                height={Math.max(0, incomeH)}
                rx="2"
                fill="#2E3628"
                style={{ opacity: isDimmed ? 0.55 : 1, transition: 'opacity 150ms ease' }}
              />
              <rect
                x={expenseX}
                y={expenseY}
                width={barWidth}
                height={Math.max(0, expenseH)}
                rx="2"
                fill="#B5915F"
                style={{ opacity: isDimmed ? 0.55 : 1, transition: 'opacity 150ms ease' }}
              />
              <text
                x={groupCenter}
                y={chartHeight - 5}
                textAnchor="middle"
                className={`text-[10.5px] font-medium tracking-wide ${
                  isActive ? 'fill-[#23281E]' : 'fill-[#6E7166]'
                }`}
              >
                {item.month}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
