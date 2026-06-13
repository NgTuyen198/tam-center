'use client';

import type { LucideIcon } from 'lucide-react';

export interface SegmentOption {
  value: string;
  label: string;
  count?: number;
  icon?: LucideIcon;
}

interface SegmentedTabsProps {
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * Thanh chuyển tab dạng "segmented control" - dùng để chia dữ liệu
 * theo vai trò (Học viên / Giáo viên / Nhân viên / Admin) một cách gọn gàng.
 */
export default function SegmentedTabs({
  options,
  value,
  onChange,
  className = '',
}: SegmentedTabsProps) {
  return (
    <div className={`inline-flex flex-wrap gap-1 p-1 bg-slate-100 dark:bg-slate-800/70 rounded-2xl ${className}`}>
      {options.map((opt) => {
        const active = opt.value === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              active
                ? 'bg-surface text-red-600 dark:text-red-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-foreground'
            }`}
          >
            {Icon && <Icon size={16} />}
            {opt.label}
            {typeof opt.count === 'number' && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  active
                    ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                    : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                }`}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
