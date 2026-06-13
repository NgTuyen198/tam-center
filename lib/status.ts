// ============================================================
// HELPER HIỂN THỊ TRẠNG THÁI (dùng chung cho mọi dashboard)
// Hỗ trợ class màu cho cả Light & Dark mode
// ============================================================

export interface StatusBadge {
  text: string
  /** class Tailwind cho nền + chữ + viền (đã có biến thể dark) */
  color: string
  /** màu thanh accent bên trái card */
  accent: string
}

export const translateClassStatus = (status: string): StatusBadge => {
  const map: Record<string, StatusBadge> = {
    FORMING: {
      text: 'Đang Gom Học Viên',
      color:
        'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
      accent: 'bg-amber-400',
    },
    READY: {
      text: 'Chờ Khai Giảng',
      color:
        'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30',
      accent: 'bg-blue-500',
    },
    IN_PROGRESS: {
      text: 'Đang Học',
      color:
        'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
      accent: 'bg-emerald-500',
    },
    COMPLETED: {
      text: 'Đã Kết Thúc',
      color:
        'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-700/40 dark:text-slate-300 dark:border-slate-600',
      accent: 'bg-slate-400',
    },
  }
  return (
    map[status] || {
      text: status,
      color:
        'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      accent: 'bg-slate-400',
    }
  )
}

export const translateRegistrationStatus = (status: string): StatusBadge => {
  const map: Record<string, StatusBadge> = {
    PENDING: {
      text: 'Chờ Xử Lý',
      color:
        'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30',
      accent: 'bg-orange-400',
    },
    PAID: {
      text: 'Đã Thanh Toán',
      color:
        'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-500/30',
      accent: 'bg-teal-500',
    },
    ASSIGNED_CLASS: {
      text: 'Đã Xếp Lớp',
      color:
        'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30',
      accent: 'bg-blue-500',
    },
    CANCELLED: {
      text: 'Đã Hủy',
      color:
        'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30',
      accent: 'bg-rose-500',
    },
  }
  return (
    map[status] || translateClassStatus(status)
  )
}

export const actionTypeBadge = (type: string): string => {
  switch (type) {
    case 'CREATE':
      return 'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30'
    case 'UPDATE':
      return 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30'
    case 'DELETE':
      return 'bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30'
    default:
      return 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
  }
}

export const roleBadge = (role: string): string => {
  switch (role) {
    case 'ADMIN':
      return 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'
    case 'STAFF':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
    case 'TEACHER':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300'
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300'
  }
}

/** Định dạng tiền tệ VND */
export const formatVND = (amount: number | null | undefined): string =>
  `${Number(amount || 0).toLocaleString('vi-VN')} đ`

/** Định dạng tiền tệ rút gọn: 2.500.000 -> "2,5tr", 80000 -> "80k" */
export const formatCompactVND = (amount: number | null | undefined): string => {
  const n = Number(amount || 0)
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tỷ`
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}tr`
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`
  return `${n}`
}

/** Nhãn tháng dạng "T1", "T2"... từ chỉ số 0-11 */
export const monthLabel = (monthIndex: number): string => `T${monthIndex + 1}`
