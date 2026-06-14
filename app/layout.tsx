import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import Script from "next/script";
import { BookOpen } from "lucide-react";
import ConditionalHeader from "./ConditionalHeader";
import ConditionalFooter from "./ConditionalFooter";
import { ThemeProvider } from "./ThemeProvider";
import ThemeToggle from "./ThemeToggle";
import SupportWidget from "./components/SupportWidget";
import SupportNavButton from "./SupportNavButton";
import { createClient } from "@/utils/supabase/server";
import { logout } from "@/app/actions/authActions";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TAM Center - Trung Tâm Tiếng Trung",
  description: "Hệ thống quản lý và đăng ký khóa học tiếng Trung",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const dashboardLink = '/dashboard';

  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        {/* Đặt theme trước khi paint để tránh nhấp nháy (FOUC) */}
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem('tam-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`}
        </Script>
      </head>
      <body className={`${inter.variable} font-sans bg-background text-foreground min-h-screen flex flex-col antialiased`}>
        <ThemeProvider>
          <ConditionalHeader>
            <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-sm border-b border-slate-200/70 dark:border-slate-800 sticky top-0 z-50">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 text-red-600 dark:text-red-500 hover:opacity-80 transition-opacity">
                  <BookOpen size={28} />
                  <span className="font-bold text-xl tracking-tight">TAM Center</span>
                </Link>
                <nav className="hidden md:flex gap-6 items-center font-medium text-slate-600 dark:text-slate-300">
                  <Link href="/" className="hover:text-red-600 dark:hover:text-red-400 transition-colors">Trang chủ</Link>
                  <Link href="/#courses" className="hover:text-red-600 dark:hover:text-red-400 transition-colors">Khóa học</Link>
                  <Link href="/#teachers" className="hover:text-red-600 dark:hover:text-red-400 transition-colors">Giảng viên</Link>
                  <SupportNavButton className="hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer">Hỗ trợ</SupportNavButton>
                </nav>
                <div className="flex items-center gap-3">
                  <ThemeToggle />
                  {user ? (
                    <div className="flex items-center gap-3">
                      <Link href={dashboardLink} className="text-slate-700 dark:text-slate-200 hover:text-red-600 dark:hover:text-red-400 font-medium hidden sm:block transition-colors">Xem thông tin</Link>
                      <form action={logout}>
                        <button type="submit" className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-full text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Đăng xuất</button>
                      </form>
                    </div>
                  ) : (
                    <Link href="/login" className="bg-red-600 text-white px-5 py-2 rounded-full font-medium hover:bg-red-700 transition-colors shadow-sm shadow-red-600/20">Đăng nhập</Link>
                  )}
                </div>
              </div>
            </header>
          </ConditionalHeader>

          <main className="flex-grow">
            {children}
          </main>

          <ConditionalFooter>
            <footer className="bg-slate-900 dark:bg-slate-950 text-slate-300 dark:text-slate-400 py-10 border-t border-transparent dark:border-slate-800">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-red-500">
                  <BookOpen size={24} />
                  <span className="font-bold text-lg text-white">TAM Center</span>
                </div>
                <p className="text-sm text-center">© 2026 Trung Tâm Tiếng Trung TAM. Thái Bình, Việt Nam.</p>
              </div>
            </footer>
          </ConditionalFooter>
          <SupportWidget />
        </ThemeProvider>
      </body>
    </html>
  );
}
