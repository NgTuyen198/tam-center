'use client';

import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  /** màu accent: red | blue | green | purple | amber | teal */
  color?: 'red' | 'blue' | 'green' | 'purple' | 'amber' | 'teal';
}

const colorMap = {
  red: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400',
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
  green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
  purple: 'bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
  teal: 'bg-teal-50 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400',
};

export default function StatCard({ icon: Icon, label, value, hint, color = 'red' }: StatCardProps) {
  return (
    <div className="bg-surface p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colorMap[color]}`}>
          <Icon size={24} />
        </div>
      </div>
      <h3 className="text-2xl md:text-3xl font-black text-foreground leading-tight">{value}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">{label}</p>
      {hint && <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">{hint}</p>}
    </div>
  );
}
