'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { SupportMessage } from './types';

const supabase = createClient();

/**
 * Hook quản lý hội thoại realtime cho một phiếu hỗ trợ.
 *
 * - Tải toàn bộ tin nhắn khi mở phiếu.
 * - Lắng nghe Supabase Realtime: có tin mới (INSERT) là hiện ngay cho cả 2 phía.
 * - Hỗ trợ chỉ báo "đang nhập..." qua kênh broadcast.
 *
 * @param ticketId  id phiếu đang mở (null = không mở phiếu nào)
 * @param isStaffViewer  true nếu người xem là nhân viên/admin (để phân biệt phía đối diện đang gõ)
 */
export function useTicketChat(ticketId: string | null, isStaffViewer: boolean) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!ticketId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessages([]);
      setOtherTyping(false);
      return;
    }

    let mounted = true;
    setLoading(true);

    // 1) Tải tin nhắn hiện có
    (async () => {
      const { data } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      if (mounted) {
        setMessages((data as SupportMessage[]) || []);
        setLoading(false);
      }
    })();

    // 2) Lắng nghe realtime cho đúng phiếu này
    const channel = supabase
      .channel(`ticket-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          const msg = payload.new as SupportMessage;
          setMessages((prev) =>
            prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
          );
          // Có tin mới tới -> phía kia ngừng "đang nhập"
          setOtherTyping(false);
        }
      )
      .on('broadcast', { event: 'typing' }, (payload) => {
        // Chỉ hiện khi người đang gõ ở phía đối diện với người xem
        if (payload.payload?.isStaff !== isStaffViewer) {
          setOtherTyping(true);
          if (typingTimeout.current) clearTimeout(typingTimeout.current);
          typingTimeout.current = setTimeout(() => setOtherTyping(false), 2500);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      mounted = false;
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [ticketId, isStaffViewer]);

  /** Phát tín hiệu "đang nhập" cho phía bên kia. */
  const notifyTyping = useCallback(() => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: { isStaff: isStaffViewer },
    });
  }, [isStaffViewer]);

  return { messages, setMessages, loading, otherTyping, notifyTyping };
}
