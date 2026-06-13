'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Send, CheckCircle2, Loader2, Inbox, MessageSquare } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { replyTicket, closeTicket } from '@/app/actions/supportActions';
import { useTicketChat } from '@/lib/useTicketChat';
import SegmentedTabs from './SegmentedTabs';
import type { SupportTicket } from '@/lib/types';

const supabase = createClient();

const CATEGORY_LABEL: Record<string, string> = {
  PAYMENT: 'Thanh toán', SCHEDULE: 'Lịch học', LEARNING: 'Học tập', TECHNICAL: 'Kỹ thuật', OTHER: 'Khác',
};

export default function StaffSupportPanel() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [statusTab, setStatusTab] = useState<string>('OPEN');
  const [active, setActive] = useState<SupportTicket | null>(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Hội thoại realtime cho phiếu đang chọn (người xem là nhân viên/admin)
  const { messages, otherTyping, notifyTyping } = useTicketChat(active?.id ?? null, true);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('support_tickets')
      .select('*, profiles(full_name, role)')
      .order('updated_at', { ascending: false });
    setTickets((data as SupportTicket[]) || []);
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadTickets(); }, [loadTickets]);

  const openThread = async (ticket: SupportTicket) => {
    setActive(ticket);
  };

  // Tự cuộn xuống tin mới nhất khi có thêm tin nhắn
  useEffect(() => {
    if (active) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    }
  }, [messages, active]);

  const handleReply = async () => {
    if (!active || !reply.trim()) return;
    setBusy(true);
    const res = await replyTicket(active.id, reply);
    setBusy(false);
    if (res?.error) { alert(res.error); return; }
    setReply('');
    // Realtime tự đẩy tin mới; chỉ cần làm mới danh sách để cập nhật trạng thái/thứ tự phiếu.
    loadTickets();
  };

  const handleClose = async () => {
    if (!active) return;
    if (!confirm('Đóng phiếu hỗ trợ này?')) return;
    try {
      await closeTicket(active.id);
      setActive({ ...active, status: 'CLOSED' });
      loadTickets();
    } catch (err) { alert('Lỗi: ' + (err as Error).message); }
  };

  const counts = {
    OPEN: tickets.filter(t => t.status === 'OPEN').length,
    ANSWERED: tickets.filter(t => t.status === 'ANSWERED').length,
    CLOSED: tickets.filter(t => t.status === 'CLOSED').length,
  };

  const filtered = tickets.filter(t => t.status === statusTab);

  const statusBadge = (status: string) => {
    if (status === 'ANSWERED') return 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400';
    if (status === 'CLOSED') return 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
    return 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400';
  };

  return (
    <div className="animate-in max-w-6xl mx-auto pb-8">
      <h1 className="text-3xl font-bold text-foreground mb-2">Hỗ Trợ & Hỏi Đáp</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-6">Tiếp nhận và phản hồi yêu cầu từ học viên, giáo viên.</p>

      <SegmentedTabs
        className="mb-6"
        value={statusTab}
        onChange={(v) => { setStatusTab(v); setActive(null); }}
        options={[
          { value: 'OPEN', label: 'Đang chờ', count: counts.OPEN },
          { value: 'ANSWERED', label: 'Đã trả lời', count: counts.ANSWERED },
          { value: 'CLOSED', label: 'Đã đóng', count: counts.CLOSED },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-260px)]">
        {/* Danh sách phiếu */}
        <div className="bg-surface rounded-3xl border border-slate-100 dark:border-slate-800 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin text-red-600" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 p-6">
              <Inbox size={40} className="mb-3 opacity-50" />
              <p className="text-sm">Không có phiếu nào.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map(t => (
                <button key={t.id} onClick={() => openThread(t)} className={`w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition ${active?.id === t.id ? 'bg-red-50 dark:bg-red-500/10' : ''}`}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-foreground text-sm truncate">{t.subject}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${statusBadge(t.status)}`}>{CATEGORY_LABEL[t.category]}</span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{t.profiles?.full_name || 'Người dùng'} · {new Date(t.updated_at).toLocaleDateString('vi-VN')}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Hội thoại */}
        <div className="lg:col-span-2 bg-surface rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden">
          {!active ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500">
              <MessageSquare size={48} className="mb-3 opacity-40" />
              <p>Chọn một phiếu hỗ trợ để xem chi tiết.</p>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
                <div className="min-w-0">
                  <h3 className="font-bold text-foreground truncate">{active.subject}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{active.profiles?.full_name} · {CATEGORY_LABEL[active.category]}</p>
                </div>
                {active.status !== 'CLOSED' && (
                  <button onClick={handleClose} className="shrink-0 flex items-center gap-1.5 text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-2 rounded-xl">
                    <CheckCircle2 size={16} /> Đóng phiếu
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-900/40">
                {messages.map(m => {
                  const isStaff = m.sender_role === 'STAFF' || m.sender_role === 'ADMIN';
                  return (
                    <div key={m.id} className={`flex ${isStaff ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${isStaff ? 'bg-red-600 text-white' : 'bg-surface border border-slate-200 dark:border-slate-700 text-foreground'}`}>
                        {!isStaff && <div className="text-[10px] font-bold text-blue-500 mb-0.5">{active.profiles?.full_name || 'Người dùng'}</div>}
                        <p className="whitespace-pre-wrap">{m.message}</p>
                        <div className={`text-[10px] mt-1 ${isStaff ? 'text-red-200' : 'text-slate-400'}`}>{new Date(m.created_at).toLocaleString('vi-VN')}</div>
                      </div>
                    </div>
                  );
                })}
                {otherTyping && (
                  <div className="flex justify-start">
                    <div className="bg-surface border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-2.5">
                      <div className="flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {active.status !== 'CLOSED' ? (
                <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex gap-2 shrink-0">
                  <input
                    value={reply}
                    onChange={e => { setReply(e.target.value); notifyTyping(); }}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                    placeholder="Nhập câu trả lời..."
                    className="flex-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-foreground rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  />
                  <button onClick={handleReply} disabled={busy} className="bg-red-600 text-white w-10 h-10 rounded-xl flex items-center justify-center hover:bg-red-700 disabled:bg-red-400 shrink-0">
                    {busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  </button>
                </div>
              ) : (
                <div className="p-3 border-t border-slate-100 dark:border-slate-800 text-center text-sm text-slate-400 shrink-0">Phiếu đã đóng.</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
