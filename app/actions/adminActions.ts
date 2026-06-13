'use server'

import { revalidatePath } from 'next/cache'
import { createLog } from './logActions'
import { requireRole } from '@/lib/auth'

export async function updateUserRole(userId: string, newRole: string) {
  const { supabase } = await requireRole(['ADMIN'])

  // Cập nhật Role
  const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
  if (error) throw new Error(error.message)

  // Ghi log hành động
  const { data: targetUser } = await supabase.from('profiles').select('full_name').eq('id', userId).single()
  await createLog('SYSTEM', `Admin đã phân quyền cho [${targetUser?.full_name || userId}] thành [${newRole}]`)

  revalidatePath('/admin-dashboard')
  return { success: true }
}

export async function toggleUserStatus(userId: string, currentStatus: string) {
  const { supabase } = await requireRole(['ADMIN'])

  const newStatus = currentStatus === 'ACTIVE' ? 'BANNED' : 'ACTIVE'
  const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('id', userId)
  if (error) throw new Error(error.message)

  // Ghi log hành động
  const { data: targetUser } = await supabase.from('profiles').select('full_name').eq('id', userId).single()
  await createLog('SYSTEM', `Admin đã ${newStatus === 'ACTIVE' ? 'MỞ KHÓA' : 'KHÓA'} tài khoản của [${targetUser?.full_name || userId}]`)

  revalidatePath('/admin-dashboard')
  return { success: true }
}
