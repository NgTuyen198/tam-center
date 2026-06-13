import { createClient } from '@/utils/supabase/server'
import type { UserRole } from './types'

export interface AuthContext {
  userId: string
  role: UserRole
  status: string
  supabase: Awaited<ReturnType<typeof createClient>>
}

/**
 * Lấy user hiện tại + role + status từ Supabase.
 * Trả về null nếu chưa đăng nhập.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .single()

  return {
    userId: user.id,
    role: (profile?.role as UserRole) || 'STUDENT',
    status: profile?.status || 'ACTIVE',
    supabase,
  }
}

/**
 * Bắt buộc người dùng phải đăng nhập (và không bị khóa).
 * Dùng cho mọi Server Action ghi dữ liệu.
 */
export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getAuthContext()
  if (!ctx) throw new Error('Vui lòng đăng nhập để tiếp tục.')
  if (ctx.status === 'BANNED')
    throw new Error('Tài khoản của bạn đã bị khóa.')
  return ctx
}

/**
 * Bắt buộc người dùng phải có một trong các vai trò cho phép.
 * Thống nhất kiểm soát quyền ở tầng Server cho toàn bộ action.
 */
export async function requireRole(
  allowedRoles: UserRole[]
): Promise<AuthContext> {
  const ctx = await requireAuth()
  if (!allowedRoles.includes(ctx.role)) {
    throw new Error('Bạn không có quyền thực hiện thao tác này.')
  }
  return ctx
}
