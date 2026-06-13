'use client';

import { usePathname } from 'next/navigation';

export default function ConditionalFooter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Ẩn Footer ở các trang Dashboard
  const hiddenRoutes = ['/admin-dashboard', '/staff-dashboard', '/teacher-dashboard', '/dashboard', '/profile'];
  const shouldHide = hiddenRoutes.some(route => pathname?.startsWith(route));

  if (shouldHide) return null;

  return <>{children}</>;
}