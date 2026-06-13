'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { LayoutDashboard, BookOpen, ScrollText, LogOut, PlusCircle, Copy, Edit2, Trash2, X, Calendar as CalIcon, Search, UserCheck, GraduationCap, Briefcase, LifeBuoy, UserCog } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { assignStudentToClassManual, updateClassStatus } from '@/app/actions/classActions';
import { duplicateCourse, checkAndDeleteCourse, saveFullCourse } from '@/app/actions/courseActions';
import { generateSchedules } from '@/app/actions/scheduleActions';
import { fetchLogs } from '@/app/actions/logActions';
import { logout } from '@/app/actions/authActions';
import { useRoleGuard } from '@/lib/useRoleGuard';
import { translateClassStatus, formatVND } from '@/lib/status';
import LogTable from '@/app/components/LogTable';
import SegmentedTabs from '@/app/components/SegmentedTabs';
import StaffSupportPanel from '@/app/components/StaffSupportPanel';
import CourseCover from '@/app/components/CourseCover';
import ThemeToggle from '@/app/ThemeToggle';
import type { ActivityLog } from '@/lib/types';

const supabase = createClient();

const inputClass =
  "w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-foreground rounded-xl px-4 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-colors";

export default function StaffDashboard() {
  const { checking } = useRoleGuard(['STAFF', 'ADMIN']);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'COURSES' | 'SUPPORT' | 'LOGS'>('OVERVIEW');
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [profile, setProfile] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pendingRegs, setPendingRegs] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activeClasses, setActiveClasses] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [courses, setCourses] = useState<any[]>([]);

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logFilter, setLogFilter] = useState('');
  const [logRoleTab, setLogRoleTab] = useState<string>('ALL');

  // Modal Xếp Lớp Thủ Công
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedReg, setSelectedReg] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [compatibleClasses, setCompatibleClasses] = useState<any[]>([]);
  const [assignType, setAssignType] = useState<'EXISTING' | 'NEW'>('NEW');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [newMaxStudents, setNewMaxStudents] = useState(15);

  // Modal Tạo/Sửa Khóa Học
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [formData, setFormData] = useState<any>({
    name: '', category: 'HSK', description: '', content: '', benefits: '', is_active: true,
    group_sessions: 20, group_price_single: 100000, group_price_full: 2000000,
    vip_sessions: 20, vip_price_single: 250000, vip_price_full: 5000000
  });

  // Modal Lên Lịch Tự Động
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleClassId, setScheduleClassId] = useState('');
  const [schedData, setSchedData] = useState({
    startDate: new Date().toISOString().split('T')[0],
    daysOfWeek: [2, 4, 6],
    startTime: '18:00', endTime: '20:00', room: 'Phòng 101'
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(prof);

    if (activeTab === 'OVERVIEW') {
      const { data: regs } = await supabase.from('registrations').select(`*, profiles(full_name, phone), course_variants(learning_mode, courses(name))`).eq('status', 'PENDING').order('created_at', { ascending: true });
      const { data: cls } = await supabase.from('classes').select(`*, course_variants(learning_mode, courses(name)), profiles!classes_teacher_id_fkey(full_name), schedules(id)`).neq('status', 'COMPLETED').order('status', { ascending: false });
      setPendingRegs(regs || []); setActiveClasses(cls || []);
    } else if (activeTab === 'COURSES') {
      const { data: crs } = await supabase.from('courses').select(`*, course_variants(*)`).order('name', { ascending: true });
      setCourses(crs || []);
    } else if (activeTab === 'LOGS') {
      const logData = await fetchLogs();
      setLogs(logData as ActivityLog[]);
    }
    setLoading(false);
  }, [activeTab]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (!checking) fetchData(); }, [checking, fetchData]);

  const openCreateModal = () => {
    setModalMode('CREATE');
    setFormData({ name: '', category: 'HSK', description: '', content: '', benefits: '', is_active: true, group_sessions: 20, group_price_single: 100000, group_price_full: 2000000, vip_sessions: 20, vip_price_single: 250000, vip_price_full: 5000000 });
    setIsModalOpen(true);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openEditModal = (course: any) => {
    setModalMode('EDIT');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const grp = course.course_variants?.find((v: any) => v.learning_mode === 'GROUP') || {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vip = course.course_variants?.find((v: any) => v.learning_mode === '1_ON_1') || {};

    setFormData({
      id: course.id,
      name: course.name, category: course.category, description: course.description || '', content: course.content || '',
      benefits: Array.isArray(course.benefits) ? course.benefits.join('\n') : '',
      is_active: course.is_active,
      group_sessions: grp.total_sessions || 0, group_price_single: grp.price_per_session || 0, group_price_full: grp.full_package_price || 0,
      vip_sessions: vip.total_sessions || 0, vip_price_single: vip.price_per_session || 0, vip_price_full: vip.full_package_price || 0
    });
    setIsModalOpen(true);
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const coursePayload = {
        id: formData.id, name: formData.name, category: formData.category, description: formData.description, content: formData.content,
        benefits: typeof formData.benefits === 'string' ? formData.benefits.split('\n').filter((b: string) => b.trim() !== '') : formData.benefits,
        is_active: formData.is_active
      };
      const variantsPayload = [
        { learning_mode: 'GROUP', total_sessions: formData.group_sessions, price_per_session: formData.group_price_single, full_package_price: formData.group_price_full },
        { learning_mode: '1_ON_1', total_sessions: formData.vip_sessions, price_per_session: formData.vip_price_single, full_package_price: formData.vip_price_full }
      ];
      await saveFullCourse(coursePayload, variantsPayload, modalMode === 'EDIT');
      setIsModalOpen(false);
      fetchData();
    } catch (err) { alert("Lỗi: " + (err as Error).message); setLoading(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Bạn chắc chắn muốn XÓA khóa học "${name}"?\nNếu đang có học viên, khóa học sẽ tự động được ẩn đi.`)) {
      try {
        const res = await checkAndDeleteCourse(id, name);
        alert(res.message);
        fetchData();
      } catch (err) { alert('Lỗi: ' + (err as Error).message); }
    }
  };

  const handleGenerateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (schedData.daysOfWeek.length === 0) {
      alert("Vui lòng chọn ít nhất 1 ngày trong tuần!");
      return;
    }
    setLoading(true);
    try {
      await generateSchedules(scheduleClassId, schedData.startDate, schedData.daysOfWeek, schedData.startTime, schedData.endTime, schedData.room);
      setIsScheduleModalOpen(false);
      fetchData();
      alert("Đã tạo lịch học thành công!");
    } catch (err) { alert("Lỗi: " + (err as Error).message); setLoading(false); }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openAssignModal = async (reg: any) => {
    setSelectedReg(reg);
    const isOneOnOne = (reg.course_variants)?.learning_mode === '1_ON_1';
    setAssignType('NEW');
    setNewMaxStudents(isOneOnOne ? 1 : 15);
    setSelectedClassId('');
    setAssignModalOpen(true);
    setLoading(true);

    const { data } = await supabase
      .from('classes')
      .select('*, profiles!classes_teacher_id_fkey(full_name)')
      .eq('course_variant_id', reg.course_variant_id)
      .in('status', ['FORMING', 'READY']);

    setCompatibleClasses(data || []);
    setLoading(false);
  };

  const handleManualAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await assignStudentToClassManual(
        selectedReg.id,
        selectedReg.student_id,
        selectedReg.course_variant_id,
        assignType,
        assignType === 'EXISTING' ? selectedClassId : undefined,
        newMaxStudents
      );
      setAssignModalOpen(false);
      fetchData();
      alert("Xếp lớp thủ công thành công!");
    } catch (err) {
      alert("Lỗi: " + (err as Error).message);
    }
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

  const logRoleCounts = {
    ALL: logs.length,
    STAFF: logs.filter(l => l.role === 'STAFF').length,
    TEACHER: logs.filter(l => l.role === 'TEACHER').length,
    STUDENT: logs.filter(l => l.role === 'STUDENT').length,
  };

  const filteredLogs = logs
    .filter(l => logRoleTab === 'ALL' || l.role === logRoleTab)
    .filter(l => l.description.toLowerCase().includes(logFilter.toLowerCase()) || (l.profiles?.full_name || '').toLowerCase().includes(logFilter.toLowerCase()));

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      <aside className="w-64 bg-slate-900 dark:bg-slate-950 text-white flex flex-col shadow-xl z-20 hidden md:flex border-r border-transparent dark:border-slate-800">
        <Link href="/" className="p-6 pb-2 border-b border-slate-800 block hover:opacity-85 transition-opacity">
          <h2 className="text-2xl font-black text-white flex items-center gap-2"><span className="text-red-500">TAM</span> Center</h2>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold">Portal Nhân Viên</p>
        </Link>
        <div className="p-4 bg-slate-800/50 mx-4 mt-4 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600 text-white font-black text-lg flex items-center justify-center overflow-hidden shrink-0 border border-slate-700">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              profile?.full_name?.charAt(0) || 'N'
            )}
          </div>
          <div className="min-w-0">
            <div className="font-bold truncate text-sm">{profile?.full_name}</div>
            <div className="text-xs text-slate-400">Nhân viên Vận hành</div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2 mt-2">
          <button onClick={() => setActiveTab('OVERVIEW')} className={navBtn(activeTab === 'OVERVIEW')}><LayoutDashboard size={20} /> Vận Hành Lớp Học</button>
          <button onClick={() => setActiveTab('COURSES')} className={navBtn(activeTab === 'COURSES')}><BookOpen size={20} /> Quản Lý Khóa Học</button>
          <button onClick={() => setActiveTab('SUPPORT')} className={navBtn(activeTab === 'SUPPORT')}><LifeBuoy size={20} /> Hỗ Trợ & Hỏi Đáp</button>
          <button onClick={() => setActiveTab('LOGS')} className={navBtn(activeTab === 'LOGS')}><ScrollText size={20} /> Nhật Ký Hoạt Động</button>
        </nav>
        <div className="p-4 border-t border-slate-800 space-y-3">
          <Link href="/profile" className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-white rounded-xl transition-all font-medium"><UserCog size={20} /> Hồ Sơ Cá Nhân</Link>
          <ThemeToggle className="!bg-slate-800 !border-slate-700 !text-slate-300 hover:!bg-slate-700" />
          <form action={logout}><button type="submit" className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-slate-800 rounded-xl transition-all font-medium"><LogOut size={20} /> Đăng xuất</button></form>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8 relative">
        {loading && <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-center justify-center"><div className="animate-spin text-red-600 text-4xl">⏳</div></div>}

        {/* TAB 1: VẬN HÀNH & XẾP LỚP */}
        {activeTab === 'OVERVIEW' && (
          <div className="animate-in max-w-6xl mx-auto pb-20">
            <h1 className="text-3xl font-bold text-foreground mb-8">Vận Hành & Xếp Lớp</h1>

            <div className="bg-surface p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 mb-8">
              <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-3">
                <span className="bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400 w-8 h-8 rounded-full flex items-center justify-center text-sm">{pendingRegs.length}</span> Đơn Khách Hàng Chờ Duyệt
              </h2>
              {pendingRegs.length === 0 ? (
                <div className="text-center py-10 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">Chưa có đơn đăng ký mới.</div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {pendingRegs.map(reg => (
                    <div key={reg.id} className="p-5 border border-slate-200 dark:border-slate-700 rounded-2xl bg-surface hover:border-red-300 dark:hover:border-red-500/40 hover:shadow-md transition relative">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-black text-lg text-foreground">{reg.profiles?.full_name}</div>
                          <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">{reg.profiles?.phone}</div>
                        </div>
                        <div className="text-right">
                          <span className="bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">{(reg.course_variants)?.learning_mode}</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl mb-4 border border-slate-100 dark:border-slate-700">
                        <div className="font-bold text-foreground text-sm">{(reg.course_variants?.courses)?.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Gói: {reg.package_type} - Tiền: <span className="text-red-600 dark:text-red-400 font-bold">{formatVND(reg.total_amount)}</span></div>
                      </div>

                      <button onClick={() => openAssignModal(reg)} className="w-full bg-red-600 text-white py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-red-700">✍️ Xếp Lớp Thủ Công</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-surface p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
              <h2 className="text-xl font-bold text-foreground mb-6">Quản Lý Trạng Thái Lớp Học</h2>
              {activeClasses.length === 0 ? (
                <div className="text-center py-10 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">Chưa có lớp học nào đang hoạt động.</div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {activeClasses.map(cls => {
                    const st = translateClassStatus(cls.status);
                    const courseName = (cls.course_variants?.courses)?.name;
                    const hasSchedule = cls.schedules && cls.schedules.length > 0;

                    return (
                      <div key={cls.id} className={`border p-5 rounded-2xl bg-surface shadow-sm flex flex-col justify-between hover:shadow-md transition ${st.color}`}>
                        <div>
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="font-black text-xl text-foreground line-clamp-1">{courseName}</h3>
                            <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase shrink-0 border ${st.color}`}>{st.text}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-white/60 dark:bg-slate-800/60 p-2 rounded-lg border border-white/40 dark:border-slate-700">
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">Giáo viên</p>
                              <p className="font-medium text-foreground truncate">{cls.profiles?.full_name || '--- Chờ nhận ---'}</p>
                            </div>
                            <div className="bg-white/60 dark:bg-slate-800/60 p-2 rounded-lg border border-white/40 dark:border-slate-700">
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">Sĩ số (Max {cls.max_students})</p>
                              <p className="font-black text-red-600 dark:text-red-400">{cls.current_students} <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">HV</span></p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 flex gap-2">
                          {cls.status === 'FORMING' && (
                            <form className="w-full" action={async () => { try { await updateClassStatus(cls.id, 'READY'); fetchData(); } catch (err) { alert('Lỗi: ' + (err as Error).message); } }}>
                              <button className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-700 transition">Khóa Sổ ➔ Chờ Khai Giảng</button>
                            </form>
                          )}
                          {cls.status === 'READY' && (
                            <form className="w-full" action={async () => { try { await updateClassStatus(cls.id, 'IN_PROGRESS'); fetchData(); } catch (err) { alert('Lỗi: ' + (err as Error).message); } }}>
                              <button disabled={!cls.profiles} className="w-full bg-green-600 text-white py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-green-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 transition">
                                {cls.profiles ? '🚀 Bấm Khai Giảng' : '⚠️ Cần GV nhận lớp'}
                              </button>
                            </form>
                          )}
                          {cls.status === 'IN_PROGRESS' && !hasSchedule && (
                            <button onClick={() => { setScheduleClassId(cls.id); setIsScheduleModalOpen(true); }} className="w-full bg-purple-600 text-white py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-purple-700 transition flex items-center justify-center gap-2">
                              <CalIcon size={16} /> Tạo Lịch Học Tự Động
                            </button>
                          )}
                          {cls.status === 'IN_PROGRESS' && hasSchedule && (
                            <button disabled className="w-full bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 py-2.5 rounded-xl text-sm font-bold">Đã có lịch học</button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: QUẢN LÝ KHÓA HỌC */}
        {activeTab === 'COURSES' && (
          <div className="animate-in max-w-6xl mx-auto pb-20">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold text-foreground">Danh Mục Khóa Học</h1>
              <button onClick={openCreateModal} className="bg-slate-900 dark:bg-slate-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-slate-800 dark:hover:bg-slate-600 transition">
                <PlusCircle size={20} /> Tạo Mới
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {courses.map(course => (
                <div key={course.id} className={`bg-surface p-6 rounded-3xl shadow-sm border ${course.is_active ? 'border-slate-100 dark:border-slate-800 hover:shadow-md' : 'border-red-200 dark:border-red-500/30 opacity-70'}`}>
                  <div className="flex justify-between items-start mb-4 gap-4">
                    <div className="flex gap-4 min-w-0">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 shadow-sm">
                        <CourseCover name={course.name} category={course.category} className="h-16" hanziSize="text-5xl" compact />
                      </div>
                      <div className="min-w-0">
                        <div className="flex gap-2 mb-2">
                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/15 px-2 py-1 rounded">{course.category}</span>
                          {!course.is_active && <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/15 px-2 py-1 rounded">NGỪNG BÁN</span>}
                        </div>
                        <h3 className="text-xl font-bold text-foreground line-clamp-1">{course.name}</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 line-clamp-2" title={course.description}>{course.description}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={async () => { try { await duplicateCourse(course.id); fetchData(); } catch (err) { alert('Lỗi: ' + (err as Error).message); } }} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-500/15 rounded-lg transition shrink-0" title="Nhân bản (Copy)">
                        <Copy size={18} />
                      </button>
                      <button onClick={() => openEditModal(course)} className="p-2 text-slate-400 hover:text-yellow-600 bg-slate-50 dark:bg-slate-800 hover:bg-yellow-50 dark:hover:bg-yellow-500/15 rounded-lg transition shrink-0" title="Sửa">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(course.id, course.name)} className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-500/15 rounded-lg transition shrink-0" title="Xóa">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {course.course_variants?.map((v: any) => (
                      <div key={v.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                        <div>
                          <div className="font-bold text-foreground">{v.learning_mode === 'GROUP' ? 'Học Nhóm' : '1 Kèm 1'}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{v.total_sessions} buổi • Lẻ: {formatVND(v.price_per_session)}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-xs text-slate-500 dark:text-slate-400">Trọn gói</div>
                            <span className="font-black text-red-600 dark:text-red-400">{formatVND(v.full_package_price)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: HỖ TRỢ & HỎI ĐÁP */}
        {activeTab === 'SUPPORT' && <StaffSupportPanel />}

        {/* TAB 3: NHẬT KÝ HOẠT ĐỘNG */}
        {activeTab === 'LOGS' && (
          <div className="animate-in h-[calc(100vh-64px)] flex flex-col max-w-6xl mx-auto pb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2 shrink-0">Nhật Ký Bộ Phận & Học Viên</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-6 shrink-0">Nhật ký được tách theo từng nhóm vai trò để dễ theo dõi.</p>

            <div className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0">
              <SegmentedTabs
                value={logRoleTab}
                onChange={setLogRoleTab}
                options={[
                  { value: 'ALL', label: 'Tất cả', count: logRoleCounts.ALL },
                  { value: 'STAFF', label: 'Nhân viên', icon: Briefcase, count: logRoleCounts.STAFF },
                  { value: 'TEACHER', label: 'Giáo viên', icon: UserCheck, count: logRoleCounts.TEACHER },
                  { value: 'STUDENT', label: 'Học viên', icon: GraduationCap, count: logRoleCounts.STUDENT },
                ]}
              />
              <div className="relative lg:w-72">
                <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Tìm theo tên hoặc hành động..."
                  value={logFilter} onChange={e => setLogFilter(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-slate-200 dark:border-slate-700 bg-surface text-foreground rounded-2xl outline-none focus:ring-2 focus:ring-red-500 shadow-sm"
                />
              </div>
            </div>

            <LogTable logs={filteredLogs} showUser />
          </div>
        )}
      </main>

      {/* MODAL TẠO/SỬA KHÓA HỌC */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl zoom-in overflow-hidden">

            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h2 className="text-2xl font-bold text-foreground">{modalMode === 'CREATE' ? 'Tạo Khóa Học Mới' : 'Chỉnh Sửa Khóa Học'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={24} /></button>
            </div>

            <form id="course-form" onSubmit={handleSaveCourse} className="flex-1 overflow-y-auto p-6 space-y-8">
              <div>
                <h3 className="text-lg font-bold text-foreground border-b border-slate-100 dark:border-slate-800 pb-2 mb-4">1. Thông tin chung</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Tên khóa học</label>
                    <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Danh mục</label>
                    <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className={inputClass}>
                      <option value="HSK">Luyện thi HSK</option><option value="GIAO_TIEP">Giao tiếp</option><option value="OTHER">Khác</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Mô tả ngắn (Hiển thị trang chủ)</label>
                    <textarea rows={2} required value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className={`${inputClass} resize-none`} />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-foreground border-b border-slate-100 dark:border-slate-800 pb-2 mb-4">2. Chi tiết (Hiển thị khi bấm xem chi tiết)</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Bạn sẽ học những gì? (Content)</label>
                    <textarea rows={3} value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} className={`${inputClass} resize-none`} placeholder="Chi tiết nội dung giảng dạy..." />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Kết quả đầu ra (Benefits - Xuống dòng để tạo mục mới)</label>
                    <textarea rows={4} value={formData.benefits} onChange={e => setFormData({ ...formData, benefits: e.target.value })} className={`${inputClass} resize-none`} placeholder="1. Phát âm chuẩn&#10;2. Thi đỗ HSK 4..." />
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="active" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} className="w-5 h-5 accent-red-600 rounded cursor-pointer" />
                    <label htmlFor="active" className="font-bold text-foreground cursor-pointer">Cho phép mở bán khóa học này (Hiển thị công khai)</label>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-foreground border-b border-slate-100 dark:border-slate-800 pb-2 mb-4">3. Cấu hình Bảng giá & Lộ trình</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-blue-50 dark:bg-blue-500/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-500/20">
                    <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-4 text-center">Gói Học Nhóm</h4>
                    <div className="space-y-3">
                      <div><label className="text-xs font-bold text-slate-600 dark:text-slate-400">Tổng số buổi</label><input type="number" required min={1} value={formData.group_sessions} onChange={e => setFormData({ ...formData, group_sessions: Number(e.target.value) })} className={inputClass} /></div>
                      <div><label className="text-xs font-bold text-slate-600 dark:text-slate-400">Giá 1 buổi (Học lẻ)</label><input type="number" required value={formData.group_price_single} onChange={e => setFormData({ ...formData, group_price_single: Number(e.target.value) })} className={inputClass} /></div>
                      <div><label className="text-xs font-bold text-slate-600 dark:text-slate-400">Giá Trọn Gói (Ưu đãi)</label><input type="number" required value={formData.group_price_full} onChange={e => setFormData({ ...formData, group_price_full: Number(e.target.value) })} className={`${inputClass} font-bold text-blue-700 dark:text-blue-300`} /></div>
                    </div>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-500/10 p-4 rounded-2xl border border-purple-100 dark:border-purple-500/20">
                    <h4 className="font-bold text-purple-800 dark:text-purple-300 mb-4 text-center">Gói 1 Kèm 1 (VIP)</h4>
                    <div className="space-y-3">
                      <div><label className="text-xs font-bold text-slate-600 dark:text-slate-400">Tổng số buổi</label><input type="number" required min={1} value={formData.vip_sessions} onChange={e => setFormData({ ...formData, vip_sessions: Number(e.target.value) })} className={inputClass} /></div>
                      <div><label className="text-xs font-bold text-slate-600 dark:text-slate-400">Giá 1 buổi (Học lẻ)</label><input type="number" required value={formData.vip_price_single} onChange={e => setFormData({ ...formData, vip_price_single: Number(e.target.value) })} className={inputClass} /></div>
                      <div><label className="text-xs font-bold text-slate-600 dark:text-slate-400">Giá Trọn Gói (Ưu đãi)</label><input type="number" required value={formData.vip_price_full} onChange={e => setFormData({ ...formData, vip_price_full: Number(e.target.value) })} className={`${inputClass} font-bold text-purple-700 dark:text-purple-300`} /></div>
                    </div>
                  </div>
                </div>
              </div>
            </form>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 shrink-0 rounded-b-3xl">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-surface border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700">Hủy bỏ</button>
              <button type="submit" form="course-form" className="px-8 py-2.5 rounded-xl font-bold text-white bg-slate-900 dark:bg-red-600 hover:bg-black dark:hover:bg-red-700 shadow-lg">Lưu Khóa Học</button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL LÊN LỊCH TỰ ĐỘNG */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-3xl w-full max-w-md shadow-2xl zoom-in p-6">
            <h2 className="text-2xl font-bold mb-4 border-b border-slate-100 dark:border-slate-800 pb-4 text-foreground">Tạo Lịch Học Tự Động</h2>
            <form onSubmit={handleGenerateSchedule} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Ngày bắt đầu khóa học</label>
                <input type="date" required value={schedData.startDate} onChange={e => setSchedData({ ...schedData, startDate: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Học vào các ngày trong tuần</label>
                <div className="flex flex-wrap gap-2">
                  {[2, 3, 4, 5, 6, 7, 8].map(d => (
                    <label key={d} className={`flex items-center justify-center w-12 h-10 rounded-lg border cursor-pointer transition-colors ${schedData.daysOfWeek.includes(d) ? 'bg-purple-100 dark:bg-purple-500/20 border-purple-500 text-purple-700 dark:text-purple-300 font-bold' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'}`}>
                      <input type="checkbox" className="hidden" checked={schedData.daysOfWeek.includes(d)} onChange={(e) => {
                        const newDays = e.target.checked ? [...schedData.daysOfWeek, d] : schedData.daysOfWeek.filter(x => x !== d);
                        setSchedData({ ...schedData, daysOfWeek: newDays });
                      }} />
                      {d === 8 ? 'CN' : `T${d}`}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Giờ bắt đầu</label>
                  <input type="time" required value={schedData.startTime} onChange={e => setSchedData({ ...schedData, startTime: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Giờ kết thúc</label>
                  <input type="time" required value={schedData.endTime} onChange={e => setSchedData({ ...schedData, endTime: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Phòng học (hoặc Link Google Meet)</label>
                <input type="text" required value={schedData.room} onChange={e => setSchedData({ ...schedData, room: e.target.value })} className={inputClass} placeholder="VD: Phòng 101 hoặc link Meet" />
              </div>

              <div className="flex justify-end gap-3 mt-6 border-t border-slate-100 dark:border-slate-800 pt-4">
                <button type="button" onClick={() => setIsScheduleModalOpen(false)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700">Hủy</button>
                <button type="submit" className="px-6 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 shadow-lg">Sinh Lịch Tự Động</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XẾP LỚP THỦ CÔNG */}
      {assignModalOpen && selectedReg && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-3xl w-full max-w-lg shadow-2xl zoom-in p-6">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-foreground">Xếp Lớp Thủ Công</h2>
              <button onClick={() => setAssignModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={24} /></button>
            </div>

            <div className="mb-6 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Học viên: <span className="font-bold text-foreground">{selectedReg.profiles?.full_name}</span></p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Khóa: <span className="font-bold text-blue-600 dark:text-blue-400">{(selectedReg.course_variants?.courses)?.name}</span></p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Hình thức: <span className="font-bold text-red-600 dark:text-red-400">{(selectedReg.course_variants)?.learning_mode === 'GROUP' ? 'Học Nhóm' : '1 Kèm 1'}</span></p>
            </div>

            <form onSubmit={handleManualAssign} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Tùy chọn xếp lớp</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setAssignType('NEW')} className={`p-3 border-2 rounded-xl text-sm font-bold transition-all ${assignType === 'NEW' ? 'border-red-500 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    Tạo Lớp Mới
                  </button>
                  <button type="button" onClick={() => setAssignType('EXISTING')} className={`p-3 border-2 rounded-xl text-sm font-bold transition-all ${assignType === 'EXISTING' ? 'border-red-500 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    Ghép Lớp Có Sẵn
                  </button>
                </div>
              </div>

              {assignType === 'NEW' && (
                <div className="animate-in">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Giới hạn học viên (Sĩ số tối đa)</label>
                  <input type="number" min={1} required value={newMaxStudents} onChange={e => setNewMaxStudents(Number(e.target.value))} className={`${inputClass} font-bold`} />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">* Lớp sẽ được tạo mới với trạng thái đang tuyển sinh (FORMING).</p>
                </div>
              )}

              {assignType === 'EXISTING' && (
                <div className="animate-in">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Chọn lớp đang mở</label>
                  {compatibleClasses.length === 0 ? (
                    <div className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 p-3 rounded-lg border border-red-100 dark:border-red-500/20">Không có lớp nào đang mở cho khóa học này. Vui lòng tạo lớp mới.</div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {compatibleClasses.map(c => {
                        const isFull = c.current_students >= c.max_students;
                        return (
                          <label key={c.id} className={`flex items-center p-3 border-2 rounded-xl cursor-pointer transition-all ${isFull ? 'opacity-50 bg-slate-50 dark:bg-slate-800 cursor-not-allowed' : selectedClassId === c.id ? 'border-red-500 bg-red-50 dark:bg-red-500/10' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                            <input type="radio" name="existing_class" className="hidden" disabled={isFull} checked={selectedClassId === c.id} onChange={() => setSelectedClassId(c.id)} />
                            <div className="flex-1">
                              <div className="font-bold text-foreground text-sm">Lớp ID: {c.id.slice(0, 8)}...</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Sĩ số: <span className={isFull ? 'text-red-500' : 'text-green-600 dark:text-green-400'}>{c.current_students}/{c.max_students}</span> • GV: {c.profiles?.full_name || 'Trống'}</div>
                            </div>
                            {isFull && <span className="text-[10px] font-bold bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400 px-2 py-1 rounded uppercase">Đã đầy</span>}
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6 border-t border-slate-100 dark:border-slate-800 pt-4">
                <button type="button" onClick={() => setAssignModalOpen(false)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700">Hủy</button>
                <button type="submit" disabled={assignType === 'EXISTING' && !selectedClassId} className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:shadow-none">Xác Nhận Xếp Lớp</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
