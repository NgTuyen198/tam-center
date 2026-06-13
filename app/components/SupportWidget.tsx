'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { MessageCircleQuestion, X, Send, ChevronLeft, Plus, Sparkles, Loader2, CheckCircle2, LogIn } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { createTicket, replyTicket } from '@/app/actions/supportActions';
import { useTicketChat } from '@/lib/useTicketChat';
import type { SupportTicket, TicketCategory } from '@/lib/types';

const supabase = createClient();

// Câu hỏi nhanh - trả lời tức thì không cần nhân viên
const QUICK_HELP: { q: string; a: string }[] = [
  { q: 'Làm sao để đăng ký khóa học?', a: 'Vào trang chủ, chọn khóa học bạn muốn, bấm "Xem chi tiết" rồi "Tùy chọn gói học & Ghi danh". Sau khi thanh toán, trung tâm sẽ xếp lớp cho bạn.' },
  { q: 'Khi nào tôi được xếp lớp?', a: 'Sau khi thanh toán thành công, đơn của bạn ở trạng thái "Chờ xử lý". Nhân viên sẽ xếp lớp trong 1-2 ngày làm việc và bạn sẽ thấy lớp trong mục "Lớp Học Của Tôi".' },
  { q: 'Có những hình thức học nào?', a: 'Trung tâm có lớp Học Nhóm (tiết kiệm chi phí) và lộ trình 1 Kèm 1 (VIP) cho người cần tiến độ nhanh, học theo nhu cầu riêng.' },
  { q: 'Tôi xem thời khóa biểu ở đâu?', a: 'Đăng nhập, vào dashboard học viên, mở tab "Thời Khóa Biểu" để xem lịch học, phòng/link và tình trạng điểm danh từng buổi.' },
  { q: 'Tôi quên mật khẩu thì sao?', a: 'Tại trang đăng nhập, bấm "Quên mật khẩu?", nhập email để nhận mã OTP và đặt lại mật khẩu mới.' },
  { q: 'Học phí thanh toán bằng cách nào?', a: 'Bạn có thể chuyển khoản ngân hàng hoặc thanh toán trực tiếp tại trung tâm. Sau khi thanh toán, nhân viên sẽ xác nhận và kích hoạt lớp học cho bạn.' },
  { q: 'Khóa HSK và khóa Giao Tiếp khác nhau ra sao?', a: 'Khóa HSK tập trung luyện thi chứng chỉ theo từng cấp độ (HSK 1-6). Khóa Giao Tiếp chú trọng phản xạ nghe nói, dùng trong công việc và đời sống hằng ngày.' },
  { q: 'Tôi có được học bù khi vắng buổi không?', a: 'Có. Nếu bạn báo trước, trung tâm sẽ sắp xếp buổi học bù hoặc gửi tài liệu của buổi đó. Bạn cũng có thể nhắn ngay tại đây để được hỗ trợ.' },
  { q: 'Làm sao để đánh giá giáo viên?', a: 'Trong mục "Lớp Học Của Tôi", mỗi lớp đã có giáo viên sẽ có nút "Đánh giá giáo viên". Bạn chấm sao và để lại nhận xét để giúp trung tâm nâng cao chất lượng.' },
  { q: 'Nếu vấn đề của tôi không có ở đây?', a: 'Bạn hãy bấm "Tạo mới" để gửi yêu cầu hỗ trợ. Nhân viên sẽ trả lời trực tiếp ngay trong khung chat này, bạn sẽ thấy phản hồi theo thời gian thực.' },
];

const CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: 'PAYMENT', label: 'Thanh toán' },
  { value: 'SCHEDULE', label: 'Lịch học' },
  { value: 'LEARNING', label: 'Học tập' },
  { value: 'TECHNICAL', label: 'Kỹ thuật' },
  { value: 'OTHER', label: 'Khác' },
];

type View = 'HOME' | 'NEW' | 'THREAD';

export default function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('HOME');
  const [authReady, setAuthReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  // Bong bóng mời tư vấn nổi phía trên nút hỗ trợ (mặc định hiện -> tải lại trang vẫn hiện)
  const [showTeaser, setShowTeaser] = useState(true);

  // Hội thoại realtime cho phiếu đang mở (người xem là học viên/giáo viên -> không phải staff)
  const { messages, loading: threadLoading, otherTyping, notifyTyping } = useTicketChat(
    view === 'THREAD' ? activeTicket?.id ?? null : null,
    false
  );

  // form tạo mới
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<TicketCategory>('OTHER');
  const [firstMessage, setFirstMessage] = useState('');
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Lấy user + vai trò hiện tại và tự động cập nhật khi trạng thái đăng nhập thay đổi
  useEffect(() => {
    const checkUser = async () => {
      setAuthReady(false);
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        const { data: prof } = await supabase.from('profiles').select('role').eq('id', uid).single();
        setRole(prof?.role ?? null);
      } else {
        setRole(null);
      }
      setAuthReady(true);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setAuthReady(false);
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        const { data: prof } = await supabase.from('profiles').select('role').eq('id', uid).single();
        setRole(prof?.role ?? null);
      } else {
        setRole(null);
        setTickets([]);
      }
      setAuthReady(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Cho phép mở widget từ nút "Hỗ trợ" trên header (qua sự kiện toàn cục)
  useEffect(() => {
    const handler = () => { setOpen(true); setView('HOME'); };
    window.addEventListener('open-support', handler);
    return () => window.removeEventListener('open-support', handler);
  }, []);

  const loadTickets = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    setTickets((data as SupportTicket[]) || []);
  }, [userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open && userId) loadTickets();
  }, [open, userId, loadTickets]);

  const openThread = async (ticket: SupportTicket) => {
    setActiveTicket(ticket);
    setView('THREAD');
  };

  // Tự cuộn xuống tin mới nhất mỗi khi có thêm tin nhắn
  useEffect(() => {
    if (view === 'THREAD') {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    }
  }, [messages, view]);

  const handleCreate = async () => {
    setBusy(true);
    const res = await createTicket(subject, category, firstMessage);
    setBusy(false);
    if (res?.error) { alert(res.error); return; }
    setSubject(''); setFirstMessage(''); setCategory('OTHER');
    await loadTickets();
    setView('HOME');
  };

  const handleReply = async () => {
    if (!activeTicket || !reply.trim()) return;
    setBusy(true);
    const res = await replyTicket(activeTicket.id, reply);
    setBusy(false);
    if (res?.error) { alert(res.error); return; }
    setReply('');
    // Không cần tải lại tin nhắn: Realtime sẽ tự đẩy tin mới về.
    loadTickets();
  };

  const statusBadge = (status: string) => {
    if (status === 'ANSWERED') return 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400';
    if (status === 'CLOSED') return 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
    return 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400';
  };
  const statusText = (status: string) => status === 'ANSWERED' ? 'Đã trả lời' : status === 'CLOSED' ? 'Đã đóng' : 'Đang chờ';

  // Chưa xác định xong phiên đăng nhập -> chưa hiện
  if (!authReady) return null;
  // Nhân viên/Admin/Giáo viên có khu vực làm việc riêng nên không hiện bong bóng hỗ trợ
  if (role === 'STAFF' || role === 'ADMIN' || role === 'TEACHER') return null;

  const isGuest = !userId;

  return (
    <>
      {/* Bong bóng mời tư vấn nổi phía trên nút hỗ trợ (góc dưới phải) */}
      {!open && showTeaser && (
        <div className="fixed bottom-24 right-6 z-[90] w-64 bg-surface border border-slate-200 dark:border-slate-700 rounded-2xl rounded-br-sm shadow-xl shadow-black/10 p-4 pr-8 zoom-in">
          <button
            onClick={() => setShowTeaser(false)}
            aria-label="Đóng"
            className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X size={15} />
          </button>
          <button onClick={() => { setOpen(true); setView('HOME'); }} className="text-left">
            <p className="text-sm font-bold text-foreground mb-1">Bạn cần hỗ trợ? 👋</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-snug">
              Nhắn tin trực tiếp để được tư vấn rõ hơn về khóa học nhé!
            </p>
          </button>
          {/* mũi nhọn chỉ xuống nút */}
          <div className="absolute -bottom-1.5 right-5 w-3 h-3 bg-surface border-r border-b border-slate-200 dark:border-slate-700 rotate-45" />
        </div>
      )}

      {/* Nút nổi */}
      <button
        onClick={() => { setOpen(o => !o); setShowTeaser(false); }}
        aria-label="Hỗ trợ"
        className="fixed bottom-6 right-6 z-[90] w-14 h-14 rounded-full bg-red-600 text-white shadow-xl shadow-red-600/30 flex items-center justify-center hover:bg-red-700 hover:scale-105 transition-all"
      >
        {open ? <X size={26} /> : <MessageCircleQuestion size={26} />}
        {!open && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-surface animate-pulse" />
        )}
      </button>

      {/* Bảng hỗ trợ */}
      {open && (
        <div className="fixed bottom-24 right-6 z-[90] w-[calc(100vw-3rem)] sm:w-96 h-[32rem] bg-surface rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden zoom-in">
          {/* Header */}
          <div className="bg-gradient-to-br from-red-600 to-red-700 text-white p-5 shrink-0">
            <div className="flex items-center gap-2">
              {view !== 'HOME' && (
                <button onClick={() => setView('HOME')} className="hover:bg-white/20 rounded-lg p-1 -ml-1"><ChevronLeft size={20} /></button>
              )}
              <h3 className="font-bold text-lg">
                {view === 'HOME' ? 'Trung Tâm Hỗ Trợ' : view === 'NEW' ? 'Gửi Yêu Cầu Mới' : activeTicket?.subject}
              </h3>
            </div>
            {view === 'HOME' && <p className="text-red-100 text-sm mt-1">Chúng tôi luôn sẵn sàng giúp bạn 👋</p>}
          </div>

          {/* HOME: quick help + danh sách ticket */}
          {view === 'HOME' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-foreground mb-3">
                  <Sparkles size={16} className="text-amber-500" /> Giải đáp nhanh
                </div>
                <div className="space-y-2">
                  {QUICK_HELP.map((item, i) => (
                    <div key={i} className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                      <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full text-left px-3 py-2.5 text-sm font-medium text-foreground hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        {item.q}
                      </button>
                      {openFaq === i && <div className="px-3 pb-3 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{item.a}</div>}
                    </div>
                  ))}
                </div>
              </div>

              {isGuest ? (
                // Khách chưa đăng nhập: mời đăng nhập để gửi yêu cầu
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 text-center">
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">Đăng nhập để gửi yêu cầu hỗ trợ và theo dõi phản hồi từ trung tâm.</p>
                  <Link href="/login" className="inline-flex items-center justify-center gap-2 bg-red-600 text-white font-bold py-2.5 px-5 rounded-xl hover:bg-red-700 transition text-sm">
                    <LogIn size={16} /> Đăng nhập để gửi yêu cầu
                  </Link>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-foreground">Yêu cầu của bạn</span>
                    <button onClick={() => setView('NEW')} className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1 hover:underline">
                      <Plus size={14} /> Tạo mới
                    </button>
                  </div>
                  {tickets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-6 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/10">
                      <p className="text-sm text-slate-400 dark:text-slate-500 text-center mb-3">Chưa có yêu cầu hỗ trợ nào.</p>
                      <button 
                        onClick={() => setView('NEW')}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1 transition"
                      >
                        <Plus size={14} /> Gửi yêu cầu mới ngay
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {tickets.map(t => (
                        <button key={t.id} onClick={() => openThread(t)} className="w-full text-left p-3 border border-slate-100 dark:border-slate-800 rounded-xl hover:border-red-300 dark:hover:border-red-500/40 transition">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-foreground text-sm truncate">{t.subject}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${statusBadge(t.status)}`}>{statusText(t.status)}</span>
                          </div>
                          <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">{new Date(t.updated_at).toLocaleString('vi-VN')}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* NEW: form tạo ticket */}
          {view === 'NEW' && !isGuest && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Tiêu đề</label>
                <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Tóm tắt vấn đề của bạn" className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-foreground rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Loại vấn đề</label>
                <select value={category} onChange={e => setCategory(e.target.value as TicketCategory)} className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-foreground rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-red-500">
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nội dung</label>
                <textarea rows={5} value={firstMessage} onChange={e => setFirstMessage(e.target.value)} placeholder="Mô tả chi tiết vấn đề bạn gặp phải..." className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-foreground rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-red-500 resize-none" />
              </div>
              <button onClick={handleCreate} disabled={busy} className="w-full bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition disabled:bg-red-400 flex items-center justify-center gap-2">
                {busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Gửi yêu cầu
              </button>
            </div>
          )}

          {/* THREAD: hội thoại */}
          {view === 'THREAD' && activeTicket && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-900/50">
                {threadLoading && messages.length === 0 && (
                  <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin text-red-600" size={22} /></div>
                )}
                {messages.map(m => {
                  const isStaff = m.sender_role === 'STAFF' || m.sender_role === 'ADMIN';
                  return (
                    <div key={m.id} className={`flex ${isStaff ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${isStaff ? 'bg-surface border border-slate-200 dark:border-slate-700 text-foreground' : 'bg-red-600 text-white'}`}>
                        {isStaff && <div className="text-[10px] font-bold text-red-500 mb-0.5">NHÂN VIÊN HỖ TRỢ</div>}
                        <p className="whitespace-pre-wrap">{m.message}</p>
                        <div className={`text-[10px] mt-1 ${isStaff ? 'text-slate-400' : 'text-red-200'}`}>{new Date(m.created_at).toLocaleString('vi-VN')}</div>
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
                {activeTicket.status === 'CLOSED' && (
                  <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 py-2">
                    <CheckCircle2 size={14} /> Yêu cầu này đã được đóng
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
              {activeTicket.status !== 'CLOSED' && (
                <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex gap-2 shrink-0">
                  <input
                    value={reply}
                    onChange={e => { setReply(e.target.value); notifyTyping(); }}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                    placeholder="Nhập tin nhắn..."
                    className="flex-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-foreground rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  />
                  <button onClick={handleReply} disabled={busy} className="bg-red-600 text-white w-10 h-10 rounded-xl flex items-center justify-center hover:bg-red-700 disabled:bg-red-400 shrink-0">
                    {busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
