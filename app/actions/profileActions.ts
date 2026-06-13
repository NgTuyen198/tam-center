'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import { createLog } from './logActions'

export interface ProfileUpdateInput {
  full_name: string
  phone: string | null
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null
  date_of_birth: string | null
  address: string | null
  bio: string | null
  avatar_url?: string | null
  // Chỉ áp dụng cho giáo viên
  specialization?: string | null
  experience_years?: number | null
}

/**
 * Cập nhật hồ sơ cá nhân của người dùng đang đăng nhập.
 * Các trường chuyên môn (specialization, experience_years) chỉ lưu khi là giáo viên.
 */
export async function updateMyProfile(input: ProfileUpdateInput) {
  const { userId, role, supabase } = await requireAuth()

  if (!input.full_name.trim()) {
    return { error: 'Vui lòng nhập họ và tên.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = {
    full_name: input.full_name.trim(),
    phone: input.phone?.trim() || null,
    gender: input.gender || null,
    date_of_birth: input.date_of_birth || null,
    address: input.address?.trim() || null,
    bio: input.bio?.trim() || null,
    avatar_url: input.avatar_url || null,
    updated_at: new Date().toISOString(),
  }

  if (role === 'TEACHER') {
    payload.specialization = input.specialization?.trim() || null
    payload.experience_years =
      input.experience_years != null && !Number.isNaN(input.experience_years)
        ? input.experience_years
        : null
  }

  const { error } = await supabase.from('profiles').update(payload).eq('id', userId)
  if (error) return { error: error.message }

  await createLog('UPDATE', 'Đã cập nhật thông tin hồ sơ cá nhân')

  revalidatePath('/profile')
  revalidatePath('/dashboard')
  revalidatePath('/teacher-dashboard')
  revalidatePath('/staff-dashboard')
  return { success: true }
}
