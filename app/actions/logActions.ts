'use server'
import { createClient } from '@/utils/supabase/server'

export async function createLog(actionType: 'CREATE' | 'UPDATE' | 'DELETE' | 'SYSTEM', description: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  const { error } = await supabase.from('activity_logs').insert({
    user_id: user.id,
    role: profile?.role || 'UNKNOWN',
    action_type: actionType,
    description: description
  })

  if (error) {
    console.error('Lỗi khi ghi log:', error.message)
  }
}

// Hàm lấy log dựa trên phân quyền (RBAC) - Đảm bảo bảo mật cấp Server
export async function fetchLogs() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const userRole = profile?.role

  // BƯỚC 1: Lấy log theo phân quyền (không dùng Join để tránh phụ thuộc schema)
  let query = supabase.from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })

  if (userRole === 'STUDENT' || userRole === 'TEACHER') {
    query = query.eq('user_id', user.id)
  } else if (userRole === 'STAFF') {
    query = query.in('role', ['STUDENT', 'TEACHER', 'STAFF'])
  }

  const { data: logsData, error: logsError } = await query

  if (logsError) {
    console.error('Lỗi truy vấn log:', logsError.message)
    return []
  }

  if (!logsData || logsData.length === 0) return []

  // BƯỚC 2: Gom các user_id để lấy tên (Manual Join né lỗi schema)
  const userIds = [...new Set(logsData.map(log => log.user_id).filter(id => id !== null))]

  let profilesMap: Record<string, string> = {}
  if (userIds.length > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds)

    if (profilesData) {
      profilesMap = profilesData.reduce((acc, curr) => {
        acc[curr.id] = curr.full_name
        return acc
      }, {} as Record<string, string>)
    }
  }

  // BƯỚC 3: Ghép tên người dùng + lọc bỏ log đăng nhập/đăng xuất (nếu còn sót)
  const mappedLogs = logsData
    .filter(log => !log.description.includes('Đăng nhập') && !log.description.includes('Đăng xuất'))
    .map(log => ({
      ...log,
      profiles: log.user_id && profilesMap[log.user_id]
        ? { full_name: profilesMap[log.user_id] }
        : null
    }))

  return mappedLogs
}
