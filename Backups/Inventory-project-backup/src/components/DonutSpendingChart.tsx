import React, { useState } from 'react';
import { SpendingCategory } from '../types';
import { formatCurrency } from '../utils/format';

interface DonutSpendingChartProps {
  categories: SpendingCategory[];
  totalSpent: number;
}

export const DonutSpendingChart: React.FC<DonutSpendingChartProps> = ({
  categories,
  totalSpent,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  const size = 172;
  const center = size / 2;
  const radius = 62;
  const strokeWidth = 26;
  const circumference = 2 * Math.PI * radius;

  let cumulativePercent = 0;
  const segments = categories.map((cat) => {
    const startPercent = cumulativePercent;
    cumulativePercent += cat.percentage;
    const dashLength = (cat.percentage / 100) * circumference;
    const dashOffset = -((startPercent / 100) * circumference);
    return {
      ...cat,
      dashLength,
      dashOffset,
    };
  });

  const activeCategory = categories.find((c) => c.id === activeId) ?? null;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6 pt-1">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90 touch-manipulation"
          role="img"
          aria-label="Spending breakdown donut chart"
        >
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#EFEAE0"
            strokeWidth={strokeWidth}
          />
          {segments.map((seg) => {
            const isActive = activeId === seg.id;
            const isDimmed = activeId !== null && !isActive;
            return (
              <circle
                key={seg.id}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={isActive ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={`${seg.dashLength} ${circumference}`}
                strokeDashoffset={seg.dashOffset}
                className="cursor-pointer transition-all duration-150"
                style={{ opacity: isDimmed ? 0.45 : 1 }}
                onMouseEnter={() => setActiveId(seg.id)}
                onMouseLeave={() => setActiveId(null)}
                onClick={() => setActiveId((prev) => (prev === seg.id ? null : seg.id))}
              />
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-3">
          <span className="text-[19px] font-semibold tracking-tight text-[#23281E] tabular-nums leading-tight">
            {formatCurrency(activeCategory ? activeCategory.amount : totalSpent, {
              maximumFractionDigits: 0,
            })}
          </span>
          <span className="mt-0.5 text-[11px] font-medium text-[#6E7166]">
            {activeCategory ? `${activeCategory.name} (${activeCategory.percentage}%)` : 'Total Spent'}
          </span>
        </div>
      </div>

      <div className="w-full flex-1 space-y-1.5">
        {categories.map((cat) => {
          const isActive = activeId === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onMouseEnter={() => setActiveId(cat.id)}
              onMouseLeave={() => setActiveId(null)}
              onClick={() => setActiveId((prev) => (prev === cat.id ? null : cat.id))}
              className={`grid w-full grid-cols-[1fr_40px_68px] items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
                isActive ? 'bg-[#F1ECE1]' : 'hover:bg-[#F5F1E8]'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: cat.color }}
                  aria-hidden="true"
                />
                <span className="truncate text-[13px] font-medium text-[#2E3328]">
                  {cat.name}
                </span>
              </span>
              <span className="text-right text-[12.5px] text-[#6E7166] tabular-nums">
                {cat.percentage}%
              </span>
              <span className="text-right text-[13px] font-medium text-[#23281E] tabular-nums">
                {formatCurrency(cat.amount, { maximumFractionDigits: 0 })}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
