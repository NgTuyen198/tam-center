'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createLog } from './logActions'
import type { SupabaseClient } from '@supabase/supabase-js'

// Hàm dùng chung để chuyển hướng dựa theo vai trò (Role)
async function handleRoleRedirect(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

    if (profile?.role === 'TEACHER') redirect('/teacher-dashboard')
    if (profile?.role === 'STAFF') redirect('/staff-dashboard')
    if (profile?.role === 'ADMIN') redirect('/admin-dashboard')
  }
  redirect('/dashboard') // Học viên
}

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    if (error.message.includes('Email not confirmed')) return { error: 'Tài khoản chưa được xác thực email!' }
    return { error: 'Tài khoản hoặc mật khẩu không chính xác!' }
  }

  if (data.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', data.user.id)
      .single()

    if (profile?.status === 'BANNED') {
      await supabase.auth.signOut()
      return { error: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ trung tâm.' }
    }

    revalidatePath('/', 'layout')

    const role = profile?.role || 'STUDENT'
    if (role === 'TEACHER') redirect('/teacher-dashboard')
    if (role === 'STAFF') redirect('/staff-dashboard')
    if (role === 'ADMIN') redirect('/admin-dashboard')
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const phone = formData.get('phone') as string
  
  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, phone: phone }
    }
  })

  if (error) return { error: error.message }
  return { success: 'Mã OTP đã được gửi đến email của bạn!' }
}

export async function verifyOtpAction(email: string, token: string, type: 'signup' | 'recovery') {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type })
  
  if (error) return { error: "Mã OTP không hợp lệ hoặc đã hết hạn." }
  
  // Nếu là OTP đăng ký, xác thực xong cho login luôn
  if (type === 'signup') {
    if (data?.user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
      
      revalidatePath('/', 'layout')
      
      const role = profile?.role || 'STUDENT'
      if (role === 'TEACHER') redirect('/teacher-dashboard')
      if (role === 'STAFF') redirect('/staff-dashboard')
      if (role === 'ADMIN') redirect('/admin-dashboard')
    }
    revalidatePath('/', 'layout')
    redirect('/dashboard')
  }
  return { success: true }
}

export async function resetPassword(email: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email)
  if (error) return { error: error.message }
  return { success: true }
}

export async function updatePassword(password: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.updateUser({ password })
  if (error) return { error: error.message }
  
  // Ghi log đổi mật khẩu
  await createLog('SYSTEM', 'Đã đổi mật khẩu mới thông qua OTP');

  if (data?.user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
    const role = profile?.role || 'STUDENT'
    if (role === 'TEACHER') redirect('/teacher-dashboard')
    if (role === 'STAFF') redirect('/staff-dashboard')
    if (role === 'ADMIN') redirect('/admin-dashboard')
  }
  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
