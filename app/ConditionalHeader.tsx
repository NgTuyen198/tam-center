'use client';

import { usePathname } from 'next/navigation';

export default function ConditionalHeader({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Danh sách các đường dẫn (route) không muốn hiển thị Header
  const hiddenRoutes = ['/admin-dashboard', '/staff-dashboard', '/teacher-dashboard', '/dashboard', '/profile'];

  // Kiểm tra xem đường link hiện tại có bắt đầu bằng các route trên hay không
  const shouldHide = hiddenRoutes.some(route => pathname?.startsWith(route));

  // Nếu thuộc các trang quản trị, trả về null (ẩn Header đi)
  if (shouldHide) {
    return null;
  }

  // Ngược lại, hiển thị Header bình thường cho Khách và Học viên
  return <>{children}</>;
}