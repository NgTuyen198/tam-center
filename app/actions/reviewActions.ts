'use server'
import { createLog } from './logActions'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = any

/**
 * Học viên gửi đánh giá cho giáo viên của một lớp.
 * Chỉ cho phép nếu học viên thực sự thuộc lớp đó (đã đăng ký học).
 * Đánh giá này KHÔNG hiển thị công khai, chỉ dùng để chấm điểm giáo viên.
 */
export async function submitTeacherReview(
  classId: string,
  rating: number,
  comment: string
) {
  const { userId, supabase } = await requireAuth()

  if (rating < 1 || rating > 5) throw new Error('Điểm đánh giá phải từ 1 đến 5 sao.')

  // Xác minh học viên có trong lớp này không
  const { data: enrollment } = await supabase
    .from('class_students')
    .select('id')
    .eq('class_id', classId)
    .eq('student_id', userId)
    .maybeSingle()

  if (!enrollment) throw new Error('Bạn chỉ có thể đánh giá lớp học mình đã đăng ký.')

  // Lấy giáo viên phụ trách lớp
  const { data: cls } = await supabase
    .from('classes')
    .select('teacher_id, course_variants(courses(name))')
    .eq('id', classId)
    .single()

  if (!cls?.teacher_id) throw new Error('Lớp học chưa có giáo viên để đánh giá.')

  const courseName = (cls?.course_variants as AnyRecord)?.courses?.name || 'Lớp học'

  // Upsert: nếu đã đánh giá lớp này rồi thì cập nhật lại
  const { error } = await supabase
    .from('teacher_reviews')
    .upsert(
      {
        student_id: userId,
        teacher_id: cls.teacher_id,
        class_id: classId,
        rating,
        comment: comment || null,
      },
      { onConflict: 'student_id,class_id' }
    )

  if (error) throw new Error(error.message)

  await createLog('CREATE', `Học viên đã đánh giá giáo viên lớp ${courseName} (${rating} sao)`)
  revalidatePath('/dashboard')
  return { success: true }
}

/** Lấy đánh giá hiện tại của học viên cho một lớp (nếu có) */
export async function getMyReview(classId: string) {
  const { userId, supabase } = await requireAuth()
  const { data } = await supabase
    .from('teacher_reviews')
    .select('rating, comment')
    .eq('class_id', classId)
    .eq('student_id', userId)
    .maybeSingle()
  return data
}
