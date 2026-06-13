'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { LayoutDashboard, ScrollText, CalendarDays, Search, UserCheck, Calendar, LogOut, Star, UserCog, BookOpen } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { fetchLogs } from '@/app/actions/logActions';
import { logout } from '@/app/actions/authActions';
import { useRoleGuard } from '@/lib/useRoleGuard';
import { translateClassStatus, formatVND } from '@/lib/status';
import LogTable from '@/app/components/LogTable';
import ThemeToggle from '@/app/ThemeToggle';
import ReviewModal from '@/app/components/ReviewModal';
import type { ActivityLog } from '@/lib/types';

const supabase = createClient();

export default function StudentDashboard() {
  const { checking } = useRoleGuard(['STUDENT']);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SCHEDULES' | 'LOGS'>('OVERVIEW');
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [profile, setProfile] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pendingRegs, setPendingRegs] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [myClasses, setMyClasses] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [schedules, setSchedules] = useState<any[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logFilter, setLogFilter] = useState('');

  // Modal đánh giá giáo viên
  const [reviewClass, setReviewClass] = useState<{ classId: string; teacherName: string; courseName: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile({ ...prof, email: user.email });

    if (activeTab === 'OVERVIEW') {
      const { data: regs } = await supabase.from('registrations').select(`*, course_variants(learning_mode, courses(name))`).eq('student_id', user.id).eq('status', 'PENDING');
      const { data: cls } = await supabase.from('class_students').select(`joined_at, classes(*, course_variants(learning_mode, courses(name)), profiles!classes_teacher_id_fkey(full_name))`).eq('student_id', user.id).order('joined_at', { ascending: false });
      setPendingRegs(regs || []); setMyClasses(cls || []);
    } else if (activeTab === 'SCHEDULES') {
      const { data: myCls } = await supabase.from('class_students').select('class_id').eq('student_id', user.id);
      const classIds = myCls?.map(c => c.class_id) || [];
      if (classIds.length > 0) {
        const { data: scheds } = await supabase.from('schedules').select(`*, classes(course_variants(courses(name))), attendance(status, student_id)`).in('class_id', classIds).order('study_date', { ascending: true });
        const formatScheds = scheds?.map(s => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const myAtt = s.attendance.find((a: any) => a.student_id === user.id);
          return { ...s, my_status: myAtt ? myAtt.status : 'PENDING' };
        });
        setSchedules(formatScheds || []);
      } else {
        setSchedules([]);
      }
    } else if (activeTab === 'LOGS') {
      const logData = await fetchLogs();
      setLogs(logData as ActivityLog[]);
    }
    setLoading(false);
  }, [activeTab]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (!checking) fetchData(); }, [checking, fetchData]);

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin text-red-600 text-4xl">⏳</div>
      </div>
    );
  }

  const navBtn = (tab: typeof activeTab, active: boolean) =>
    `w-full flex items-center justify-center md:justify-start gap-3 p-3 rounded-xl transition-all ${active ? 'bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground'}`;

  return (
    <div className="flex h-[calc(100vh-64px)] bg-background overflow-hidden">
      <aside className="w-16 md:w-64 bg-surface border-r border-slate-200 dark:border-slate-800 flex flex-col z-20 transition-all">
        <Link href="/" className="p-4 md:p-5 border-b border-slate-100 dark:border-slate-800 hidden md:block text-center hover:opacity-85 transition-opacity">
          <h2 className="text-xl font-black text-red-600 dark:text-red-500 flex items-center justify-center gap-2">
            <BookOpen size={22} /> <span className="font-bold">TAM Center</span>
          </h2>
          <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-widest font-bold">Portal Học Viên</p>
        </Link>
        <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-800 hidden md:block text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-500/15 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 font-black text-2xl mx-auto mb-3 overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              profile?.full_name?.charAt(0) || 'H'
            )}
          </div>
          <h3 className="font-bold text-foreground line-clamp-1">{profile?.full_name}</h3>
          <span className="text-xs font-bold text-white bg-slate-900 dark:bg-slate-700 px-2 py-0.5 rounded mt-1 inline-block">Học Viên</span>
        </div>
        <nav className="flex-1 p-2 md:p-4 space-y-2 mt-2">
          <button onClick={() => setActiveTab('OVERVIEW')} className={navBtn('OVERVIEW', activeTab === 'OVERVIEW')}><LayoutDashboard size={20} /> <span className="hidden md:block">Lớp Học Của Tôi</span></button>
          <button onClick={() => setActiveTab('SCHEDULES')} className={navBtn('SCHEDULES', activeTab === 'SCHEDULES')}><CalendarDays size={20} /> <span className="hidden md:block">Thời Khóa Biểu</span></button>
          <button onClick={() => setActiveTab('LOGS')} className={navBtn('LOGS', activeTab === 'LOGS')}><ScrollText size={20} /> <span className="hidden md:block">Lịch Sử Giao Dịch</span></button>
        </nav>
        <div className="p-2 md:p-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <Link href="/profile" className="w-full flex items-center justify-center md:justify-start gap-3 p-3 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground rounded-xl transition-all font-medium"><UserCog size={20} /> <span className="hidden md:block">Hồ Sơ Cá Nhân</span></Link>
          <div className="hidden md:flex justify-center"><ThemeToggle /></div>
          <form action={logout}>
            <button type="submit" className="w-full flex items-center justify-center md:justify-start gap-3 p-3 text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all font-medium"><LogOut size={20} /> <span className="hidden md:block">Đăng xuất</span></button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
        {loading && <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center"><div className="animate-spin text-red-600 text-4xl">⏳</div></div>}

        {activeTab === 'OVERVIEW' && (
          <div className="animate-in max-w-4xl mx-auto space-y-6 pb-20">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Xin chào, {profile?.full_name}! 👋</h1>

            {pendingRegs.length > 0 && (
              <div className="bg-surface p-6 rounded-3xl shadow-sm border border-orange-200 dark:border-orange-500/30">
                <h3 className="text-lg font-bold text-orange-600 dark:text-orange-400 mb-4 flex items-center gap-2">⏳ Đơn Đăng Ký Chờ Xử Lý</h3>
                <div className="space-y-3">
                  {pendingRegs.map(reg => (
                    <div key={reg.id} className="flex justify-between items-center p-4 bg-orange-50 dark:bg-orange-500/10 rounded-2xl border border-orange-100 dark:border-orange-500/20">
                      <div>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        <h4 className="font-bold text-foreground">{(reg.course_variants?.courses as any)?.name}</h4>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{(reg.course_variants as any)?.learning_mode === 'GROUP' ? 'Học Nhóm' : '1 Kèm 1'}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-red-600 dark:text-red-400">{formatVND(reg.total_amount)}</div>
                        <div className="text-xs text-orange-600 dark:text-orange-400 font-bold mt-1 px-2 py-1 bg-orange-100 dark:bg-orange-500/15 rounded">Chờ Trung tâm xếp lớp</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-surface p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
              <h3 className="text-xl font-bold text-foreground mb-6">Tiến Trình Học Tập</h3>
              {myClasses.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                  <div className="text-4xl mb-3 opacity-50">📚</div>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Bạn chưa được xếp vào lớp học nào.</p>
                </div>
              ) : (
                <div className="grid gap-6">
                  {myClasses.map((item) => {
                    const cls = item.classes;
                    const st = translateClassStatus(cls?.status);
                    return (
                      <div key={cls?.id} className="p-6 border border-slate-100 dark:border-slate-800 rounded-3xl bg-surface shadow-sm hover:shadow-md transition relative overflow-hidden">
                        <div className={`absolute left-0 top-0 bottom-0 w-2 ${st.accent}`}></div>

                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 pl-4">
                          <div>
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${st.color} mb-2 inline-block`}>{st.text}</span>
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            <h4 className="font-black text-xl text-foreground">{(cls?.course_variants?.courses as any)?.name}</h4>

                            <div className="flex flex-wrap gap-4 mt-3">
                              <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700">
                                <UserCheck size={16} className="text-blue-500" />
                                <span className="font-medium text-foreground">{cls?.profiles?.full_name || 'Chưa xếp GV'}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700">
                                <Calendar size={16} className="text-green-500" />
                                <span className="font-medium text-foreground">{cls?.start_date ? new Date(cls.start_date).toLocaleDateString('vi-VN') : 'Chưa thông báo'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right border-t md:border-t-0 border-slate-100 dark:border-slate-800 pt-4 md:pt-0">
                            <p className="text-xs text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider mb-1">Hình thức</p>
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            <div className="font-bold text-foreground bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">{(cls?.course_variants as any)?.learning_mode === 'GROUP' ? 'Lớp Học Nhóm' : 'Lớp 1 Kèm 1'}</div>
                            {cls?.teacher_id && cls?.profiles?.full_name && (
                              <button
                                onClick={() => setReviewClass({
                                  classId: cls.id,
                                  teacherName: cls.profiles.full_name,
                                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                  courseName: (cls?.course_variants?.courses as any)?.name || 'Lớp học',
                                })}
                                className="mt-2 w-full md:w-auto inline-flex items-center justify-center gap-1.5 text-sm font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/15 hover:bg-amber-100 dark:hover:bg-amber-500/25 px-3 py-1.5 rounded-lg transition"
                              >
                                <Star size={15} /> Đánh giá giáo viên
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'SCHEDULES' && (
          <div className="animate-in max-w-5xl mx-auto pb-20">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Thời Khóa Biểu & Điểm Danh</h1>
            <div className="bg-surface p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
              {schedules.length === 0 ? <p className="text-center text-slate-500 dark:text-slate-400 py-10">Bạn chưa có lịch học nào được xếp.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800"><tr><th className="p-4 font-bold text-slate-500 dark:text-slate-400">Ngày học</th><th className="p-4 font-bold text-slate-500 dark:text-slate-400">Lớp</th><th className="p-4 font-bold text-slate-500 dark:text-slate-400">Thời gian</th><th className="p-4 font-bold text-slate-500 dark:text-slate-400">Phòng/Link</th><th className="p-4 font-bold text-slate-500 dark:text-slate-400 text-right">Tình trạng</th></tr></thead>
                    <tbody>
                      {schedules.map(s => (
                        <tr key={s.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                          <td className="p-4 font-bold text-foreground">{new Date(s.study_date).toLocaleDateString('vi-VN')}</td>
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          <td className="p-4 text-blue-600 dark:text-blue-400 font-bold">{(s.classes?.course_variants?.courses as any)?.name}</td>
                          <td className="p-4 text-slate-600 dark:text-slate-400">{s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}</td>
                          <td className="p-4 text-slate-600 dark:text-slate-400">{s.room}</td>
                          <td className="p-4 text-right">
                            {s.my_status === 'PRESENT' ? <span className="text-green-700 dark:text-green-400 font-bold bg-green-100 dark:bg-green-500/15 border border-green-200 dark:border-green-500/30 px-3 py-1.5 rounded-lg text-xs">✅ Có mặt</span> :
                              s.my_status === 'ABSENT' ? <span className="text-red-700 dark:text-red-400 font-bold bg-red-100 dark:bg-red-500/15 border border-red-200 dark:border-red-500/30 px-3 py-1.5 rounded-lg text-xs">❌ Vắng mặt</span> :
                                s.my_status === 'LATE' ? <span className="text-yellow-700 dark:text-yellow-400 font-bold bg-yellow-100 dark:bg-yellow-500/15 border border-yellow-200 dark:border-yellow-500/30 px-3 py-1.5 rounded-lg text-xs">⚠️ Đi muộn</span> :
                                  <span className="text-slate-500 dark:text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-xs">Chưa học</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'LOGS' && (
          <div className="animate-in max-w-5xl mx-auto h-[calc(100vh-100px)] flex flex-col pb-4">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-6 shrink-0">Lịch Sử Hoạt Động & Giao Dịch</h1>
            <div className="mb-6 relative shrink-0">
              <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
              <input type="text" placeholder="Tìm kiếm hành động..." value={logFilter} onChange={e => setLogFilter(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-slate-200 dark:border-slate-700 bg-surface text-foreground rounded-2xl outline-none focus:ring-2 focus:ring-red-500 shadow-sm" />
            </div>
            <LogTable logs={logs.filter(l => l.description.toLowerCase().includes(logFilter.toLowerCase()))} />
          </div>
        )}
      </main>

      {/* Modal đánh giá giáo viên */}
      {reviewClass && (
        <ReviewModal
          classId={reviewClass.classId}
          teacherName={reviewClass.teacherName}
          courseName={reviewClass.courseName}
          onClose={() => setReviewClass(null)}
          onSaved={() => { /* đã lưu, có thể refresh nếu cần */ }}
        />
      )}
    </div>
  );
}
