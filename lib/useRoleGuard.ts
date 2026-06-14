'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
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
 * Trả về `checking`, `user`, và `profile` để trang sử dụng lại, tránh truy vấn trùng lặp.
 */
export function useRoleGuard(allowedRoles: UserRole[]) {
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    let active = true;

    (async () => {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();

      if (!u) {
        router.replace('/login');
        return;
      }

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', u.id)
        .single();

      const role = (prof?.role as UserRole) || 'STUDENT';

      // Tài khoản bị khóa -> đăng xuất
      if (prof?.status === 'BANNED') {
        await supabase.auth.signOut();
        router.replace('/login');
        return;
      }

      // Sai vai trò -> chuyển về dashboard đúng của họ
      if (!allowedRoles.includes(role)) {
        router.replace(DASHBOARD_BY_ROLE[role] || '/dashboard');
        return;
      }

      if (active) {
        setUser(u);
        setProfile(prof);
        setChecking(false);
      }
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { checking, user, profile };
}
