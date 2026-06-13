'use server'
import { createLog } from './logActions'
import { revalidatePath } from 'next/cache'
import { requireAuth, requireRole } from '@/lib/auth'
import type { TicketCategory } from '@/lib/types'

/**
 * Người dùng (học viên/giáo viên) tạo phiếu hỗ trợ mới kèm tin nhắn đầu tiên.
 */
export async function createTicket(subject: string, category: TicketCategory, message: string) {
  const { userId, role, supabase } = await requireAuth()

  if (!subject.trim() || !message.trim()) {
    return { error: 'Vui lòng nhập tiêu đề và nội dung cần hỗ trợ.' }
  }

  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .insert({ user_id: userId, subject: subject.trim(), category, status: 'OPEN' })
    .select()
    .single()

  if (error) return { error: error.message }

  await supabase.from('support_messages').insert({
    ticket_id: ticket.id,
    sender_id: userId,
    sender_role: role,
    message: message.trim(),
  })

  await createLog('CREATE', `Đã gửi yêu cầu hỗ trợ: "${subject.trim()}"`)
  revalidatePath('/staff-dashboard')
  return { success: true, ticketId: ticket.id }
}

/**
 * Gửi thêm tin nhắn vào một phiếu hỗ trợ.
 * - Nếu nhân viên/admin trả lời -> ticket chuyển sang ANSWERED.
 * - Nếu người tạo phản hồi tiếp -> ticket quay lại OPEN.
 */
export async function replyTicket(ticketId: string, message: string) {
  const { userId, role, supabase } = await requireAuth()

  if (!message.trim()) return { error: 'Nội dung tin nhắn trống.' }

  const { error } = await supabase.from('support_messages').insert({
    ticket_id: ticketId,
    sender_id: userId,
    sender_role: role,
    message: message.trim(),
  })
  if (error) return { error: error.message }

  const isStaff = role === 'STAFF' || role === 'ADMIN'
  await supabase
    .from('support_tickets')
    .update({ status: isStaff ? 'ANSWERED' : 'OPEN', updated_at: new Date().toISOString() })
    .eq('id', ticketId)

  revalidatePath('/staff-dashboard')
  return { success: true }
}

/** Nhân viên/Admin đóng phiếu hỗ trợ đã giải quyết xong. */
export async function closeTicket(ticketId: string) {
  const { supabase } = await requireRole(['STAFF', 'ADMIN'])
  const { error } = await supabase
    .from('support_tickets')
    .update({ status: 'CLOSED', updated_at: new Date().toISOString() })
    .eq('id', ticketId)
  if (error) throw new Error(error.message)

  await createLog('UPDATE', `Đã đóng một phiếu hỗ trợ`)
  revalidatePath('/staff-dashboard')
  return { success: true }
}
