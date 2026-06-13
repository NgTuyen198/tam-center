// ============================================================
// KIỂU DỮ LIỆU DÙNG CHUNG TOÀN HỆ THỐNG
// ============================================================

export type UserRole = 'STUDENT' | 'TEACHER' | 'STAFF' | 'ADMIN'
export type UserStatus = 'ACTIVE' | 'BANNED'

export type LearningMode = 'GROUP' | '1_ON_1'
export type PackageType = 'SINGLE_SESSIONS' | 'FULL_PACKAGE'

export type RegistrationStatus =
  | 'PENDING'
  | 'PAID'
  | 'ASSIGNED_CLASS'
  | 'CANCELLED'

export type ClassStatus = 'FORMING' | 'READY' | 'IN_PROGRESS' | 'COMPLETED'
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE'
export type ActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'SYSTEM'

export interface Profile {
  id: string
  full_name: string
  phone: string | null
  role: UserRole
  status: UserStatus
  created_at: string
  email?: string
  // Thông tin cá nhân mở rộng (trang hồ sơ)
  avatar_url?: string | null
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | null
  date_of_birth?: string | null
  address?: string | null
  bio?: string | null
  specialization?: string | null
  experience_years?: number | null
  updated_at?: string | null
}

export interface CourseVariant {
  id: string
  course_id: string
  learning_mode: LearningMode
  total_sessions: number
  price_per_session: number
  full_package_price: number
}

export interface Course {
  id: string
  name: string
  category: string
  description: string | null
  content: string | null
  benefits: string[] | null
  is_active: boolean
  course_variants?: CourseVariant[]
}

export interface Registration {
  id: string
  student_id: string
  course_variant_id: string
  package_type: PackageType
  sessions_count: number
  special_requests: string | null
  total_amount: number
  status: RegistrationStatus
  created_at: string
}

export interface ClassRoom {
  id: string
  course_variant_id: string
  staff_id: string | null
  teacher_id: string | null
  max_students: number
  current_students: number
  status: ClassStatus
  start_date: string | null
  created_at: string
}

export interface ActivityLog {
  id: string
  user_id: string | null
  role: string
  action_type: ActionType
  description: string
  created_at: string
  profiles?: { full_name: string } | null
}

// ---------- ĐÁNH GIÁ GIÁO VIÊN ----------
export interface TeacherReview {
  id: string
  student_id: string
  teacher_id: string
  class_id: string
  rating: number
  comment: string | null
  created_at: string
  profiles?: { full_name: string } | null
}

// ---------- HỖ TRỢ / HỎI ĐÁP ----------
export type TicketCategory = 'PAYMENT' | 'SCHEDULE' | 'LEARNING' | 'TECHNICAL' | 'OTHER'
export type TicketStatus = 'OPEN' | 'ANSWERED' | 'CLOSED'

export interface SupportTicket {
  id: string
  user_id: string
  subject: string
  category: TicketCategory
  status: TicketStatus
  created_at: string
  updated_at: string
  profiles?: { full_name: string; role: string } | null
  support_messages?: SupportMessage[]
}

export interface SupportMessage {
  id: string
  ticket_id: string
  sender_id: string
  sender_role: string
  message: string
  created_at: string
}
