'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export default function ThemeToggle({
  className = '',
}: {
  className?: string;
}) {
  const { theme, toggleTheme, mounted } = useTheme();

  // Trước khi mount, render trạng thái tất định (light) để khớp với HTML từ server,
  // tránh lỗi hydration mismatch.
  const isDark = mounted && theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Chuyển chế độ sáng/tối"
      title={isDark ? 'Chuyển sang nền sáng' : 'Chuyển sang nền tối'}
      className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 ${className}`}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
