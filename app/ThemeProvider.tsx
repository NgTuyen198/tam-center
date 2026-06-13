'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggleTheme: () => {},
  mounted: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Khởi tạo tất định để khớp với HTML render từ server (tránh hydration mismatch).
  // Giá trị thực tế được đọc từ localStorage trong useEffect sau khi mount.
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  // Đọc theme đã lưu sau khi mount trên client
  useEffect(() => {
    try {
      const stored = localStorage.getItem('tam-theme') as Theme | null;
      const initial = stored
        ? stored
        : window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTheme(initial);
    } catch {
      /* bỏ qua */
    }
    setMounted(true);
  }, []);

  // Đồng bộ class `dark` trên <html> mỗi khi theme thay đổi
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('tam-theme', next);
      document.documentElement.classList.toggle('dark', next === 'dark');
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
