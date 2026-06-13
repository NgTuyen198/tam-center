'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { LayoutDashboard, ScrollText, LogOut, GraduationCap, Search, Calendar, Users, CalendarDays, CheckSquare, X, Star, MessageSquare, UserCog } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { acceptClass } from '@/app/actions/teacherActions';
import { updateClassStatus } from '@/app/actions/classActions';
import { submitAttendance } from '@/app/actions/scheduleActions';
import { fetchLogs } from '@/app/actions/logActions';
import { logout } from '@/app/actions/authActions';
import { useRoleGuard } from '@/lib/useRoleGuard';
import { translateClassStatus } from '@/lib/status';
import LogTable from '@/app/components/LogTable';
import ThemeToggle from '@/app/ThemeToggle';
import type { ActivityLog, TeacherReview } from '@/lib/types';

const supabase = createClient();

export default function TeacherDashboard() {
  const { checking } = useRoleGuard(['TEACHER']);
  const [activeTab, setActiveTab] = useState<'CLASSES' | 'SCHEDULES' | 'LOGS'>('CLASSES');
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [profile, setProfile] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [myClasses, setMyClasses] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [schedules, setSchedules] = useState<any[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logFilter, setLogFilter] = useState('');

  // Đánh giá nhận được từ học viên
  const [reviews, setReviews] = useState<TeacherReview[]>([]);

  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [currentSchedule, setCurrentSchedule] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceState, setAttendanceState] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(prof);

    if (activeTab === 'CLASSES') {
      const { data: avail } = await supabase
        .from('classes')
        .select(`*, course_variants(learning_mode, courses(name))`)
        .in('status', ['FORMING', 'READY'])
        .is('teacher_id', null);

      const { data: mine } = await supabase
        .from('classes')
        .select(`*, course_variants(learning_mode, courses(name))`)
        .eq('teacher_id', user.id)
        .neq('status', 'COMPLETED')
        .order('start_date', { ascending: false });

      setAvailableClasses(avail || []);
      setMyClasses(mine || []);

      // Lấy đánh giá học viên dành cho giáo viên này
      const { data: revs } = await supabase
        .from('teacher_reviews')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });
      setReviews((revs as TeacherReview[]) || []);

    } else if (activeTab === 'SCHEDULES') {
      const { data: scheds } = await supabase
        .from('schedules')
        .select(`*, classes!inner(teacher_id, course_variants(courses(name)))`)
        .eq('classes.teacher_id', user.id)
        .order('study_date', { ascending: true });
      setSchedules(scheds || []);
    } else if (activeTab === 'LOGS') {
      const logData = await fetchLogs();
      setLogs(logData as ActivityLog[]);
    }
    setLoading(false);
  }, [activeTab]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (!checking) fetchData(); }, [checking, fetchData]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openAttendance = async (sched: any) => {
    setLoading(true);
    setCurrentSchedule(sched);
    const { data: stds } = await supabase.from('class_students').select('profiles(id, full_name)').eq('class_id', sched.class_id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const studentList = stds?.map((s: any) => s.profiles) || [];
    setStudents(studentList);

    const { data: att } = await supabase.from('attendance').select('*').eq('schedule_id', sched.id);
    const state: Record<string, string> = {};
    if (att && att.length > 0) {
      att.forEach(a => { state[a.student_id] = a.status; });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      studentList.forEach((s: any) => { state[s.id] = 'PRESENT'; });
    }
    setAttendanceState(state);
    setLoading(false);
    setAttendanceModalOpen(true);
  };

  const handleSaveAttendance = async () => {
    setLoading(true);
    try {
      const data = Object.keys(attendanceState).map(studentId => ({
        student_id: studentId, status: attendanceState[studentId]
      }));
      await submitAttendance(currentSchedule.id, data);
      setAttendanceModalOpen(false);
      alert('Lưu điểm danh thành công!');
    } catch (err) { alert("Lỗi: " + (err as Error).message); }
    setLoading(false);
  };

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin text-red-600 text-4xl">⏳</div>
      </div>
    );
  }

  const navBtn = (active: boolean) =>
    `w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-red-600 text-white font-bold shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`;

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      <aside className="w-64 bg-slate-900 dark:bg-slate-950 text-white flex flex-col shadow-xl z-20 hidden md:flex border-r border-transparent dark:border-slate-800">
        <div className="p-6 pb-2 border-b border-slate-800">
          <h2 className="text-2xl font-black text-white flex items-center gap-2"><GraduationCap className="text-red-500" /> Giáo Viên</h2>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold">Portal Giảng Dạy</p>
        </div>
        <div className="p-4 bg-slate-800/50 mx-4 mt-4 rounded-xl text-center">
          <div className="font-bold">{profile?.full_name}</div>
          <div className="text-xs text-slate-400">Chuyên môn xuất sắc</div>
        </div>
        <nav className="flex-1 p-4 space-y-2 mt-4">
          <button onClick={() => setActiveTab('CLASSES')} className={navBtn(activeTab === 'CLASSES')}><LayoutDashboard size={20} /> Quản Lý Lớp Học</button>
          <button onClick={() => setActiveTab('SCHEDULES')} className={navBtn(activeTab === 'SCHEDULES')}><CalendarDays size={20} /> Lịch Dạy & Điểm Danh</button>
          <button onClick={() => setActiveTab('LOGS')} className={navBtn(activeTab === 'LOGS')}><ScrollText size={20} /> Nhật Ký Cá Nhân</button>
        </nav>
        <div className="p-4 border-t border-slate-800 space-y-3">
          <Link href="/profile" className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-white rounded-xl transition-all font-medium"><UserCog size={20} /> Hồ Sơ Cá Nhân</Link>
          <ThemeToggle className="!bg-slate-800 !border-slate-700 !text-slate-300 hover:!bg-slate-700" />
          <form action={logout}><button type="submit" className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-slate-800 rounded-xl transition-all font-medium"><LogOut size={20} /> Đăng xuất</button></form>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8 relative">
        {loading && <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-center justify-center"><div className="animate-spin text-red-600 text-4xl">⏳</div></div>}

        {activeTab === 'CLASSES' && (
          <div className="animate-in max-w-6xl mx-auto pb-20">
            <h1 className="text-3xl font-bold text-foreground mb-8">Xin chào, {profile?.full_name}! 🎓</h1>

            {/* THẺ ĐIỂM ĐÁNH GIÁ TỪ HỌC VIÊN */}
            {(() => {
              const avg = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
              const withComment = reviews.filter(r => r.comment && r.comment.trim());
              return (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white p-6 rounded-3xl shadow-lg shadow-amber-500/20 flex flex-col justify-center">
                    <div className="flex items-center gap-2 text-amber-100 text-sm font-bold mb-2"><Star size={16} fill="currentColor" /> ĐIỂM ĐÁNH GIÁ CỦA BẠN</div>
                    <div className="flex items-end gap-2">
                      <span className="text-5xl font-black">{avg > 0 ? avg.toFixed(1) : '--'}</span>
                      <span className="text-amber-100 mb-1.5">/ 5.0</span>
                    </div>
                    <div className="text-sm text-amber-100 mt-1">{reviews.length} lượt đánh giá từ học viên</div>
                  </div>
                  <div className="lg:col-span-2 bg-surface p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-sm font-bold text-foreground mb-4"><MessageSquare size={16} className="text-blue-500" /> Nhận xét gần đây</div>
                    {withComment.length === 0 ? (
                      <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">Chưa có nhận xét nào kèm nội dung.</p>
                    ) : (
                      <div className="space-y-3 max-h-40 overflow-y-auto pr-1">
                        {withComment.slice(0, 5).map(r => (
                          <div key={r.id} className="border-l-2 border-amber-400 pl-3 py-1">
                            <div className="flex items-center gap-1 text-yellow-400 mb-0.5">
                              {Array.from({ length: r.rating }).map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-300 italic">&ldquo;{r.comment}&rdquo;</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="bg-surface p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 mb-8">
              <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2"><span className="bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400 w-8 h-8 rounded-full flex items-center justify-center text-sm">{myClasses.length}</span> Lớp Đang Phụ Trách</h2>

              {myClasses.length === 0 ? (
                <div className="text-center py-10 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">Bạn đang không dạy lớp nào. Hãy nhận lớp ở Chợ Lớp Học bên dưới nhé!</div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {myClasses.map(cls => {
                    const st = translateClassStatus(cls.status);
                    return (
                      <div key={cls.id} className={`border p-5 rounded-2xl bg-surface shadow-sm flex flex-col justify-between ${st.color}`}>
                        <div>
                          <div className="flex justify-between items-start mb-4">
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            <h3 className="font-black text-xl text-foreground line-clamp-1">{(cls.course_variants?.courses as any)?.name}</h3>
                            <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase shrink-0 border ${st.color}`}>{st.text}</span>
                          </div>

                          <div className="flex gap-6 mb-5 border-b border-slate-200/60 dark:border-slate-700/60 pb-5">
                            <div className="flex items-center gap-2 text-foreground">
                              <Users className="text-blue-500" size={18} />
                              <span className="font-bold">{cls.current_students}/{cls.max_students} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">HV</span></span>
                            </div>
                            <div className="flex items-center gap-2 text-foreground">
                              <Calendar className="text-green-500" size={18} />
                              <span className="font-medium">{cls.start_date ? new Date(cls.start_date).toLocaleDateString('vi-VN') : 'Chưa xếp lịch'}</span>
                            </div>
                          </div>
                        </div>

                        {cls.status === 'IN_PROGRESS' ? (
                          <form action={async () => { try { await updateClassStatus(cls.id, 'COMPLETED'); fetchData(); } catch (err) { alert('Lỗi: ' + (err as Error).message); } }}>
                            <button type="submit" className="w-full bg-slate-900 dark:bg-slate-700 text-white py-3 rounded-xl text-sm font-bold shadow-md hover:bg-slate-800 dark:hover:bg-slate-600 transition">✅ Đánh Dấu Kết Thúc Khóa Học</button>
                          </form>
                        ) : (
                          <div className="text-center text-sm font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 py-3 rounded-xl border border-slate-100 dark:border-slate-700">Đang chờ Trung tâm tạo Lịch và Khai giảng</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="bg-surface p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
              <h2 className="text-xl font-bold text-foreground mb-6">Chợ Lớp Học (Trống Giáo Viên)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {availableClasses.map(cls => (
                  <div key={cls.id} className="p-5 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-800/40 hover:bg-surface hover:border-red-300 dark:hover:border-red-500/40 hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-2">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      <h3 className="font-bold text-foreground">{(cls.course_variants?.courses as any)?.name}</h3>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      <span className="bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">{(cls.course_variants as any)?.learning_mode}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Sĩ số gom được: <span className="font-bold text-red-600 dark:text-red-400">{cls.current_students}/{cls.max_students}</span> học viên</p>
                    <form action={async () => { try { await acceptClass(cls.id); fetchData(); } catch (err) { alert('Lỗi: ' + (err as Error).message); } }}>
                      <button type="submit" className="w-full bg-red-600 text-white py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-red-700 transition">Nhận Giảng Dạy Lớp Này</button>
                    </form>
                  </div>
                ))}
                {availableClasses.length === 0 && <div className="col-span-full text-center py-6 text-slate-500 dark:text-slate-400">Hiện không có lớp nào trống để nhận.</div>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'SCHEDULES' && (
          <div className="animate-in max-w-6xl mx-auto pb-20">
            <h1 className="text-3xl font-bold text-foreground mb-8">Lịch Dạy & Điểm Danh</h1>
            <div className="bg-surface rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
              {schedules.length === 0 ? <p className="text-center text-slate-500 dark:text-slate-400 py-10">Lớp của bạn chưa có lịch học nào được xếp.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800">
                      <tr><th className="p-4 font-bold text-slate-500 dark:text-slate-400">Ngày học</th><th className="p-4 font-bold text-slate-500 dark:text-slate-400">Lớp</th><th className="p-4 font-bold text-slate-500 dark:text-slate-400">Thời gian</th><th className="p-4 font-bold text-slate-500 dark:text-slate-400">Phòng/Link</th><th className="p-4 font-bold text-slate-500 dark:text-slate-400 text-right">Thao tác</th></tr>
                    </thead>
                    <tbody>
                      {schedules.map(s => (
                        <tr key={s.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-4 font-bold text-foreground">{new Date(s.study_date).toLocaleDateString('vi-VN')}</td>
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          <td className="p-4 text-blue-600 dark:text-blue-400 font-bold">{(s.classes?.course_variants?.courses as any)?.name}</td>
                          <td className="p-4 text-slate-600 dark:text-slate-400">{s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}</td>
                          <td className="p-4 text-slate-600 dark:text-slate-400">{s.room}</td>
                          <td className="p-4 text-right">
                            <button onClick={() => openAttendance(s)} className="bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-green-200 dark:hover:bg-green-500/25 flex items-center gap-2 ml-auto">
                              <CheckSquare size={16} /> Chốt Điểm danh
                            </button>
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
          <div className="animate-in h-[calc(100vh-64px)] flex flex-col max-w-6xl mx-auto pb-8">
            <h1 className="text-3xl font-bold text-foreground mb-6 shrink-0">Nhật Ký Hoạt Động Của Tôi</h1>
            <div className="mb-6 relative shrink-0">
              <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
              <input type="text" placeholder="Tìm kiếm hành động..." value={logFilter} onChange={e => setLogFilter(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-slate-200 dark:border-slate-700 bg-surface text-foreground rounded-2xl outline-none focus:ring-2 focus:ring-red-500 shadow-sm" />
            </div>
            <LogTable logs={logs.filter(l => l.description.toLowerCase().includes(logFilter.toLowerCase()))} />
          </div>
        )}
      </main>

      {/* MODAL ĐIỂM DANH */}
      {attendanceModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-3xl w-full max-w-lg shadow-2xl zoom-in">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-2xl font-bold text-foreground">Điểm Danh Buổi Học</h2>
              <button onClick={() => setAttendanceModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={24} /></button>
            </div>

            <div className="p-6">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Ngày: <span className="font-bold text-foreground">{currentSchedule?.study_date ? new Date(currentSchedule.study_date).toLocaleDateString('vi-VN') : ''}</span></p>

              <div className="space-y-3 max-h-[50vh] overflow-y-auto mb-6 pr-2">
                {students.map(s => (
                  <div key={s.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl">
                    <span className="font-bold text-foreground">{s.full_name}</span>
                    <select
                      value={attendanceState[s.id]}
                      onChange={e => setAttendanceState({ ...attendanceState, [s.id]: e.target.value })}
                      className={`border-2 rounded-xl px-3 py-1.5 font-bold text-sm outline-none cursor-pointer ${attendanceState[s.id] === 'PRESENT' ? 'border-green-200 dark:border-green-500/40 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400' :
                        attendanceState[s.id] === 'ABSENT' ? 'border-red-200 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400' :
                          'border-yellow-200 dark:border-yellow-500/40 bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
                        }`}
                    >
                      <option value="PRESENT">✅ Có mặt</option>
                      <option value="ABSENT">❌ Vắng mặt</option>
                      <option value="LATE">⚠️ Đi muộn</option>
                    </select>
                  </div>
                ))}
                {students.length === 0 && <p className="text-center text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl py-6">Lớp chưa có học sinh nào.</p>}
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                <button onClick={() => setAttendanceModalOpen(false)} className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700">Hủy</button>
                <button onClick={handleSaveAttendance} className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-bold shadow-lg hover:bg-green-700">Lưu Điểm Danh</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
