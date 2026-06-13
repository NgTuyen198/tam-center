'use server'
import { createLog } from './logActions'
import { requireAuth } from '@/lib/auth'
import { formatVND } from '@/lib/status'

export async function submitRegistration(data: {
  courseVariantId: string,
  packageType: 'SINGLE_SESSIONS' | 'FULL_PACKAGE',
  sessionsCount: number,
  specialRequests: string,
  totalAmount: number
}) {
  let ctx
  try {
    ctx = await requireAuth()
  } catch {
    return { error: 'Vui lòng đăng nhập để đăng ký' }
  }
  const { userId, supabase } = ctx

  // Lưu đơn đăng ký vào Database
  // Đơn được tạo SAU khi thanh toán thành công => coi như đã thanh toán,
  // trạng thái PENDING nghĩa là "đã thanh toán, chờ trung tâm xếp lớp".
  const { error } = await supabase.from('registrations').insert({
    student_id: userId,
    course_variant_id: data.courseVariantId,
    package_type: data.packageType,
    sessions_count: data.sessionsCount,
    special_requests: data.specialRequests,
    total_amount: data.totalAmount,
    status: 'PENDING'
  })

  if (error) return { error: error.message }

  await createLog('CREATE', `Học viên đã nộp đơn đăng ký lộ trình học (Trị giá: ${formatVND(data.totalAmount)})`)

  return { success: true, message: 'Đăng ký thành công, chờ trung tâm xếp lớp!' }
}
