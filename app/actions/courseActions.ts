'use server'
import { revalidatePath } from 'next/cache'
import { createLog } from './logActions'
import { requireRole } from '@/lib/auth'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = any

export async function checkAndDeleteCourse(courseId: string, courseName: string) {
  const { supabase } = await requireRole(['STAFF', 'ADMIN'])

  // 1. Tìm tất cả các biến thể (Gói học) của khóa này
  const { data: variants } = await supabase.from('course_variants').select('id').eq('course_id', courseId)
  const variantIds = variants?.map(v => v.id) || []

  let isBeingUsed = false

  if (variantIds.length > 0) {
    const { count: regCount } = await supabase.from('registrations').select('*', { count: 'exact', head: true }).in('course_variant_id', variantIds)
    const { count: classCount } = await supabase.from('classes').select('*', { count: 'exact', head: true }).in('course_variant_id', variantIds)

    if ((regCount && regCount > 0) || (classCount && classCount > 0)) {
      isBeingUsed = true
    }
  }

  if (isBeingUsed) {
    // CÓ NGƯỜI DÙNG -> XÓA MỀM (Ngừng bán)
    await supabase.from('courses').update({ is_active: false }).eq('id', courseId)
    await createLog('UPDATE', `Đã chuyển trạng thái khóa học "${courseName}" sang NGỪNG BÁN do đang có học viên theo học.`)
    revalidatePath('/staff-dashboard')
    return { type: 'soft', message: 'Khóa học đang có dữ liệu (Đơn/Lớp). Đã chuyển sang trạng thái NGỪNG MỞ BÁN để bảo toàn dữ liệu.' }
  } else {
    // KHÔNG CÓ AI -> XÓA VĨNH VIỄN
    await supabase.from('course_variants').delete().eq('course_id', courseId)
    await supabase.from('courses').delete().eq('id', courseId)
    await createLog('DELETE', `Đã XÓA VĨNH VIỄN khóa học: ${courseName}`)
    revalidatePath('/staff-dashboard')
    return { type: 'hard', message: 'Đã xóa vĩnh viễn khóa học vì chưa có ai đăng ký.' }
  }
}

export async function saveFullCourse(courseData: AnyRecord, variantsData: AnyRecord[], isEdit: boolean = false) {
  const { supabase } = await requireRole(['STAFF', 'ADMIN'])
  let finalCourseId = courseData.id

  if (isEdit) {
    // CẬP NHẬT thông tin khóa học
    const { error: cErr } = await supabase.from('courses').update({
      name: courseData.name,
      category: courseData.category,
      description: courseData.description,
      content: courseData.content,
      benefits: courseData.benefits,
      is_active: courseData.is_active
    }).eq('id', finalCourseId)
    if (cErr) throw new Error(cErr.message)

    // CẬP NHẬT variant theo learning_mode thay vì xóa-tạo-lại
    // -> Bảo toàn course_variant_id mà registrations/classes đang tham chiếu
    const { data: existingVariants } = await supabase
      .from('course_variants')
      .select('*')
      .eq('course_id', finalCourseId)

    for (const incoming of variantsData) {
      const match = existingVariants?.find(
        (ev) => ev.learning_mode === incoming.learning_mode
      )

      if (match) {
        // Đã tồn tại -> update giữ nguyên ID
        await supabase
          .from('course_variants')
          .update({
            total_sessions: incoming.total_sessions,
            price_per_session: incoming.price_per_session,
            full_package_price: incoming.full_package_price
          })
          .eq('id', match.id)
      } else {
        // Chưa có -> thêm mới
        await supabase
          .from('course_variants')
          .insert({ ...incoming, course_id: finalCourseId })
      }
    }

    await createLog('UPDATE', `Đã cập nhật toàn bộ thông tin khóa học: ${courseData.name}`)

  } else {
    // TẠO MỚI
    const { data: newCourse, error: cErr } = await supabase.from('courses').insert({
      name: courseData.name,
      category: courseData.category,
      description: courseData.description,
      content: courseData.content,
      benefits: courseData.benefits,
      is_active: true
    }).select().single()
    if (cErr) throw new Error(cErr.message)

    finalCourseId = newCourse.id
    const newVariants = variantsData.map(v => ({ ...v, course_id: finalCourseId }))
    await supabase.from('course_variants').insert(newVariants)

    await createLog('CREATE', `Đã tạo khóa học mới: ${courseData.name}`)
  }

  revalidatePath('/staff-dashboard')
  return { success: true }
}

// Nhân bản khóa học (copy thông tin + các gói giá)
export async function duplicateCourse(courseId: string) {
  const { supabase } = await requireRole(['STAFF', 'ADMIN'])
  const { data: oldC } = await supabase.from('courses').select('*').eq('id', courseId).single()
  if (!oldC) throw new Error('Không tìm thấy khóa học')

  const { data: newC, error } = await supabase.from('courses')
    .insert({ name: oldC.name + ' (Copy)', category: oldC.category, description: oldC.description, content: oldC.content, benefits: oldC.benefits, is_active: false })
    .select().single()
  if (error) throw new Error(error.message)

  const { data: variants } = await supabase.from('course_variants').select('*').eq('course_id', courseId)
  if (variants && variants.length > 0) {
    const newVariants = variants.map(v => ({ course_id: newC.id, learning_mode: v.learning_mode, total_sessions: v.total_sessions, price_per_session: v.price_per_session, full_package_price: v.full_package_price }))
    await supabase.from('course_variants').insert(newVariants)
  }

  await createLog('CREATE', `Đã nhân bản khóa học: ${oldC.name}`)
  revalidatePath('/staff-dashboard')
  return { success: true }
}
