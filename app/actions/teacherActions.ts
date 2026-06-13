'use server'

import { revalidatePath } from 'next/cache'
import { createLog } from './logActions'
import { requireRole } from '@/lib/auth'

export async function acceptClass(classId: string) {
  const { userId, supabase } = await requireRole(['TEACHER'])

  // Cập nhật teacher_id cho lớp học (Chỉ nhận những lớp chưa có giáo viên)
  const { error } = await supabase
    .from('classes')
    .update({ teacher_id: userId })
    .eq('id', classId)
    .is('teacher_id', null)

  if (error) throw new Error(error.message)

  // Ghi log hành động nhận lớp
  const { data: clsInfo } = await supabase.from('classes').select('course_variants(courses(name))').eq('id', classId).single()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const courseName = (clsInfo?.course_variants as any)?.courses?.name || 'Môn học'
  await createLog('UPDATE', `Giáo viên đã nhận giảng dạy lớp: ${courseName}`)

  revalidatePath('/teacher-dashboard')
  return { success: true }
}
