'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { UserRole } from './types';

const DASHBOARD_BY_ROLE: Record<UserRole, string> = {
  STUDENT: '/dashboard',
  TEACHER: '/teacher-dashboard',
  STAFF: '/staff-dashboard',
  ADMIN: '/admin-dashboard',
};

const supabase = createClient();

/**
 * Bảo vệ trang dashboard phía client: kiểm tra đăng nhập + đúng vai trò.
 * Nếu sai vai trò sẽ điều hướng về dashboard tương ứng của người dùng.
 * Trả về `checking` để trang hiển thị màn hình chờ trong lúc xác thực.
 */
export function useRoleGuard(allowedRoles: UserRole[]) {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = '/login';
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', user.id)
        .single();

      const role = (profile?.role as UserRole) || 'STUDENT';

      // Tài khoản bị khóa -> đăng xuất
      if (profile?.status === 'BANNED') {
        await supabase.auth.signOut();
        window.location.href = '/login';
        return;
      }

      // Sai vai trò -> chuyển về dashboard đúng của họ
      if (!allowedRoles.includes(role)) {
        window.location.href = DASHBOARD_BY_ROLE[role] || '/dashboard';
        return;
      }

      if (active) setChecking(false);
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { checking };
}
