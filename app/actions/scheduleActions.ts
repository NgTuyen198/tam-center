'use server'
import { createLog } from './logActions'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = any

/** Format Date về chuỗi YYYY-MM-DD theo giờ địa phương (tránh lệch ngày do UTC) */
function toLocalDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Sinh lịch học tự động
export async function generateSchedules(
  classId: string,
  startDate: string,
  daysOfWeek: number[],
  startTime: string,
  endTime: string,
  room: string
) {
  const { supabase } = await requireRole(['STAFF', 'ADMIN'])

  // Validate phía server (không phụ thuộc UI) để tránh vòng lặp vô hạn
  if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0) {
    throw new Error('Vui lòng chọn ít nhất 1 ngày học trong tuần.')
  }
  if (!startDate || !startTime || !endTime) {
    throw new Error('Thiếu thông tin ngày bắt đầu hoặc giờ học.')
  }

  // Lấy tổng số buổi học của lớp
  const { data: cls } = await supabase
    .from('classes')
    .select('course_variants(total_sessions, courses(name))')
    .eq('id', classId)
    .single()
  const totalSessions = (cls?.course_variants as AnyRecord)?.total_sessions || 20
  const courseName = (cls?.course_variants as AnyRecord)?.courses?.name || 'Lớp học'

  const current = new Date(startDate)
  const schedules = []
  let count = 0
  let guard = 0
  const MAX_ITERATIONS = 366 * 3 // tối đa quét 3 năm, chặn treo server

  // Thuật toán quét ngày để sinh đúng N buổi học vào các ngày trong tuần đã chọn
  while (count < totalSessions && guard < MAX_ITERATIONS) {
    // getDay(): 0 là CN, 1 là T2... -> đổi về T2=2, ..., CN=8
    const day = current.getDay() === 0 ? 8 : current.getDay() + 1

    if (daysOfWeek.includes(day)) {
      schedules.push({
        class_id: classId,
        study_date: toLocalDateString(current),
        start_time: startTime,
        end_time: endTime,
        room: room
      })
      count++
    }
    current.setDate(current.getDate() + 1)
    guard++
  }

  const { error } = await supabase.from('schedules').insert(schedules)
  if (error) throw new Error(error.message)

  await createLog('CREATE', `Nhân viên đã tự động xếp ${schedules.length} buổi học cho lớp ${courseName}`)
  revalidatePath('/staff-dashboard')
  return { success: true }
}

// Chốt điểm danh
export async function submitAttendance(
  scheduleId: string,
  attendanceData: { student_id: string, status: string }[]
) {
  const { userId, role, supabase } = await requireRole(['TEACHER', 'STAFF', 'ADMIN'])

  // Nếu là giáo viên, đảm bảo họ là người phụ trách lớp của buổi học này
  if (role === 'TEACHER') {
    const { data: sched } = await supabase
      .from('schedules')
      .select('classes(teacher_id)')
      .eq('id', scheduleId)
      .single()
    const teacherId = (sched?.classes as AnyRecord)?.teacher_id
    if (teacherId !== userId) {
      throw new Error('Bạn không phụ trách lớp học này.')
    }
  }

  // Xóa điểm danh cũ của buổi này (nếu có) để update lại
  await supabase.from('attendance').delete().eq('schedule_id', scheduleId)

  const insertData = attendanceData.map(d => ({
    schedule_id: scheduleId,
    student_id: d.student_id,
    status: d.status
  }))

  const { error } = await supabase.from('attendance').insert(insertData)
  if (error) throw new Error(error.message)

  await createLog('UPDATE', `Giáo viên đã chốt điểm danh cho 1 buổi học`)
  revalidatePath('/teacher-dashboard')
  return { success: true }
}
