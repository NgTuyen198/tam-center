'use server'
import { createLog } from './logActions'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = any

// Hàm XẾP LỚP THỦ CÔNG (Được sử dụng chính trong Staff Dashboard)
export async function assignStudentToClassManual(
  registrationId: string,
  studentId: string,
  courseVariantId: string,
  assignType: 'EXISTING' | 'NEW',
  targetClassId?: string,
  maxStudents: number = 15
) {
  const { userId, supabase } = await requireRole(['STAFF', 'ADMIN'])

  const { data: student } = await supabase.from('profiles').select('full_name').eq('id', studentId).single()
  const { data: variant } = await supabase.from('course_variants').select('courses(name)').eq('id', courseVariantId).single()
  const courseName = (variant?.courses as AnyRecord)?.name || 'Khóa học'

  let finalClassId = targetClassId

  if (assignType === 'NEW') {
    const { data: newClass, error: insertError } = await supabase
      .from('classes')
      .insert({
        course_variant_id: courseVariantId,
        staff_id: userId,
        max_students: maxStudents,
        current_students: 1,
        status: 'FORMING'
      }).select().single()

    if (insertError) throw new Error('Lỗi tạo lớp mới: ' + insertError.message)
    finalClassId = newClass.id
    await createLog('CREATE', `Nhân viên thủ công tạo lớp mới (${courseName}) cho học viên ${student?.full_name}`)
  } else {
    if (!finalClassId) throw new Error('Vui lòng chọn lớp học có sẵn')

    const { data: currentClass } = await supabase.from('classes').select('current_students, max_students').eq('id', finalClassId).single()
    if (!currentClass) throw new Error('Lớp học không tồn tại')
    if (currentClass.current_students >= currentClass.max_students) throw new Error('Lớp học đã đầy')

    await supabase.from('classes').update({ current_students: currentClass.current_students + 1 }).eq('id', finalClassId)
    await createLog('UPDATE', `Nhân viên thủ công ghép học viên ${student?.full_name} vào lớp có sẵn (${courseName})`)
  }

  await supabase.from('class_students').insert({ class_id: finalClassId, student_id: studentId })
  await supabase.from('registrations').update({ status: 'ASSIGNED_CLASS' }).eq('id', registrationId)

  revalidatePath('/staff-dashboard')
  return { success: true, message: 'Đã xếp lớp thành công' }
}

// Hàm cập nhật trạng thái lớp học (READY / IN_PROGRESS / COMPLETED)
export async function updateClassStatus(classId: string, newStatus: 'READY' | 'IN_PROGRESS' | 'COMPLETED') {
  const { role, supabase } = await requireRole(['STAFF', 'ADMIN', 'TEACHER'])

  // Giáo viên chỉ được phép đánh dấu kết thúc lớp của mình
  if (role === 'TEACHER' && newStatus !== 'COMPLETED') {
    throw new Error('Giáo viên chỉ có thể đánh dấu kết thúc lớp học.')
  }

  const { data: cls } = await supabase.from('classes').select('course_variants(courses(name))').eq('id', classId).single()
  const courseName = (cls?.course_variants as AnyRecord)?.courses?.name || 'Lớp học'

  const statusText =
    newStatus === 'READY' ? 'CHỜ KHAI GIẢNG' :
    newStatus === 'IN_PROGRESS' ? 'KHAI GIẢNG (Đang học)' : 'KẾT THÚC'

  const { error } = await supabase
    .from('classes')
    .update({
      status: newStatus,
      ...(newStatus === 'IN_PROGRESS' ? { start_date: new Date().toISOString() } : {})
    })
    .eq('id', classId)

  if (error) throw new Error('Lỗi cập nhật trạng thái: ' + error.message)

  await createLog('UPDATE', `Đã chuyển trạng thái lớp ${courseName} thành: ${statusText}`)
  revalidatePath('/staff-dashboard')
  revalidatePath('/teacher-dashboard')

  return { success: true }
}
