'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { LayoutDashboard, Users, ScrollText, LogOut, Search, ShieldAlert, DollarSign, GraduationCap, FileText, BookCopy, TrendingUp, UserCog, Wallet, UserCheck, Briefcase, Star } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { updateUserRole, toggleUserStatus } from '@/app/actions/adminActions';
import { fetchLogs } from '@/app/actions/logActions';
import { logout } from '@/app/actions/authActions';
import { useRoleGuard } from '@/lib/useRoleGuard';
import { formatVND, formatCompactVND, monthLabel } from '@/lib/status';
import LogTable from '@/app/components/LogTable';
import StatCard from '@/app/components/StatCard';
import SegmentedTabs from '@/app/components/SegmentedTabs';
import { BarChart, LineChart, DonutChart } from '@/app/components/Charts';
import ThemeToggle from '@/app/ThemeToggle';
import type { ActivityLog, Profile, UserRole } from '@/lib/types';

const supabase = createClient();

// Trạng thái đơn được tính là doanh thu (đã thanh toán)
const PAID_STATUSES = ['PENDING', 'PAID', 'ASSIGNED_CLASS'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any;

export default function AdminDashboard() {
  const { checking } = useRoleGuard(['ADMIN']);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'USERS' | 'LOGS'>('OVERVIEW');
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Dữ liệu thô cho phần thống kê
  const [regs, setRegs] = useState<AnyRow[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [classes, setClasses] = useState<AnyRow[]>([]);
  const [reviews, setReviews] = useState<AnyRow[]>([]);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleTab, setUserRoleTab] = useState<UserRole>('STUDENT');

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logFilter, setLogFilter] = useState('');
  const [logRoleTab, setLogRoleTab] = useState<string>('ALL');

  const checkAuthAndFetch = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUser(user);

    if (activeTab === 'OVERVIEW') {
      const [{ data: regData }, { data: profData }, { data: clsData }, { data: revData }] = await Promise.all([
        supabase.from('registrations').select(`total_amount, status, created_at, package_type, course_variants(learning_mode, courses(name, category))`),
        supabase.from('profiles').select('id, full_name, role, status, created_at'),
        supabase.from('classes').select('status'),
        supabase.from('teacher_reviews').select('teacher_id, rating'),
      ]);
      setRegs(regData || []);
      setAllProfiles((profData as Profile[]) || []);
      setClasses(clsData || []);
      setReviews(revData || []);
    } else if (activeTab === 'USERS') {
      const { data: profs } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      setProfiles(profs || []);
    } else if (activeTab === 'LOGS') {
      const logData = await fetchLogs();
      setLogs(logData as ActivityLog[]);
    }
    setLoading(false);
  }, [activeTab]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (!checking) checkAuthAndFetch(); }, [checking, checkAuthAndFetch]);

  // ============ TÍNH TOÁN THỐNG KÊ ============
  const analytics = useMemo(() => {
    const now = new Date();
    const paidRegs = regs.filter(r => PAID_STATUSES.includes(r.status));

    const totalRevenue = paidRegs.reduce((s, r) => s + Number(r.total_amount || 0), 0);
    const monthRevenue = paidRegs
      .filter(r => { const d = new Date(r.created_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
      .reduce((s, r) => s + Number(r.total_amount || 0), 0);

    // Doanh thu 6 tháng gần nhất
    const revenueByMonth: { label: string; value: number }[] = [];
    const regsByMonth: { label: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const rev = paidRegs
        .filter(r => { const rd = new Date(r.created_at); return rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear(); })
        .reduce((s, r) => s + Number(r.total_amount || 0), 0);
      const cnt = regs.filter(r => { const rd = new Date(r.created_at); return rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear(); }).length;
      revenueByMonth.push({ label: monthLabel(d.getMonth()), value: rev });
      regsByMonth.push({ label: monthLabel(d.getMonth()), value: cnt });
    }

    // Phân bố vai trò
    const roleCount = (role: string) => allProfiles.filter(p => p.role === role).length;
    const usersByRole = [
      { label: 'Học viên', value: roleCount('STUDENT'), color: '#64748b' },
      { label: 'Giáo viên', value: roleCount('TEACHER'), color: '#a855f7' },
      { label: 'Nhân viên', value: roleCount('STAFF'), color: '#3b82f6' },
      { label: 'Admin', value: roleCount('ADMIN'), color: '#dc2626' },
    ];

    // Trạng thái đơn đăng ký
    const regStatusCount = (s: string) => regs.filter(r => r.status === s).length;
    const regByStatus = [
      { label: 'Chờ xử lý', value: regStatusCount('PENDING'), color: '#f97316' },
      { label: 'Đã xếp lớp', value: regStatusCount('ASSIGNED_CLASS'), color: '#3b82f6' },
      { label: 'Đã thanh toán', value: regStatusCount('PAID'), color: '#14b8a6' },
      { label: 'Đã hủy', value: regStatusCount('CANCELLED'), color: '#ef4444' },
    ].filter(s => s.value > 0);

    // Hình thức học
    const groupCount = regs.filter(r => r.course_variants?.learning_mode === 'GROUP').length;
    const oneCount = regs.filter(r => r.course_variants?.learning_mode === '1_ON_1').length;
    const byMode = [
      { label: 'Học nhóm', value: groupCount, color: '#3b82f6' },
      { label: '1 Kèm 1', value: oneCount, color: '#a855f7' },
    ].filter(s => s.value > 0);

    // Top khóa học theo doanh thu
    const courseRevenue: Record<string, number> = {};
    paidRegs.forEach(r => {
      const name = r.course_variants?.courses?.name || 'Khác';
      courseRevenue[name] = (courseRevenue[name] || 0) + Number(r.total_amount || 0);
    });
    const topCourses = Object.entries(courseRevenue)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Trạng thái lớp học
    const clsStatusCount = (s: string) => classes.filter(c => c.status === s).length;

    // Xếp hạng giáo viên theo điểm đánh giá trung bình
    const teacherStats: Record<string, { sum: number; count: number }> = {};
    reviews.forEach(r => {
      if (!teacherStats[r.teacher_id]) teacherStats[r.teacher_id] = { sum: 0, count: 0 };
      teacherStats[r.teacher_id].sum += r.rating;
      teacherStats[r.teacher_id].count += 1;
    });
    const nameById: Record<string, string> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    allProfiles.forEach((p: any) => { nameById[p.id] = p.full_name; });
    const topTeachers = Object.entries(teacherStats)
      .map(([id, s]) => ({ label: nameById[id] || 'Giáo viên', avg: s.sum / s.count, count: s.count }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5);

    return {
      totalRevenue,
      monthRevenue,
      totalUsers: allProfiles.length,
      totalStudents: roleCount('STUDENT'),
      totalTeachers: roleCount('TEACHER'),
      totalRegs: regs.length,
      pendingRegs: regStatusCount('PENDING'),
      activeClasses: clsStatusCount('FORMING') + clsStatusCount('READY') + clsStatusCount('IN_PROGRESS'),
      avgOrderValue: paidRegs.length > 0 ? Math.round(totalRevenue / paidRegs.length) : 0,
      revenueByMonth,
      regsByMonth,
      usersByRole,
      regByStatus,
      byMode,
      topCourses,
      topTeachers,
    };
  }, [regs, allProfiles, classes, reviews]);

  // Đếm số lượng theo vai trò cho các segment
  const roleCounts = useMemo(() => ({
    STUDENT: profiles.filter(p => p.role === 'STUDENT').length,
    TEACHER: profiles.filter(p => p.role === 'TEACHER').length,
    STAFF: profiles.filter(p => p.role === 'STAFF').length,
    ADMIN: profiles.filter(p => p.role === 'ADMIN').length,
  }), [profiles]);

  const logRoleCounts = useMemo(() => ({
    ALL: logs.length,
    ADMIN: logs.filter(l => l.role === 'ADMIN').length,
    STAFF: logs.filter(l => l.role === 'STAFF').length,
    TEACHER: logs.filter(l => l.role === 'TEACHER').length,
    STUDENT: logs.filter(l => l.role === 'STUDENT').length,
  }), [logs]);

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin text-red-600 text-4xl">⏳</div>
      </div>
    );
  }

  const navBtn = (active: boolean) =>
    `w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-red-600 text-white font-bold shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`;

  const filteredLogs = logs
    .filter(l => logRoleTab === 'ALL' || l.role === logRoleTab)
    .filter(l =>
      l.description.toLowerCase().includes(logFilter.toLowerCase()) ||
      (l.profiles?.full_name || '').toLowerCase().includes(logFilter.toLowerCase())
    );

  const filteredProfiles = profiles
    .filter(p => p.role === userRoleTab)
    .filter(p =>
      (p.full_name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
      (p.phone || '').toLowerCase().includes(userSearch.toLowerCase())
    );

  const maxMonthRevenue = Math.max(...analytics.topCourses.map(c => c.value), 1);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className="w-64 bg-slate-900 dark:bg-slate-950 text-white flex flex-col shadow-xl z-20 hidden md:flex border-r border-transparent dark:border-slate-800">
        <div className="p-6 pb-2 border-b border-slate-800">
          <h2 className="text-2xl font-black text-white flex items-center gap-2"><ShieldAlert className="text-red-500" /> Admin</h2>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold">Portal Quản Trị Viên</p>
        </div>
        <nav className="flex-1 p-4 space-y-2 mt-4">
          <button onClick={() => setActiveTab('OVERVIEW')} className={navBtn(activeTab === 'OVERVIEW')}><LayoutDashboard size={20} /> Báo Cáo & Thống Kê</button>
          <button onClick={() => setActiveTab('USERS')} className={navBtn(activeTab === 'USERS')}><Users size={20} /> Quản Lý Tài Khoản</button>
          <button onClick={() => setActiveTab('LOGS')} className={navBtn(activeTab === 'LOGS')}><ScrollText size={20} /> Dấu Vết Hệ Thống</button>
        </nav>
        <div className="p-4 border-t border-slate-800 space-y-3">
          <ThemeToggle className="!bg-slate-800 !border-slate-700 !text-slate-300 hover:!bg-slate-700" />
          <form action={logout}><button type="submit" className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-slate-800 rounded-xl transition-all font-medium"><LogOut size={20} /> Đăng xuất</button></form>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6 md:p-8 relative">
        {loading && <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-center justify-center"><div className="animate-spin text-red-600 text-4xl">⏳</div></div>}

        {/* ============ TAB BÁO CÁO ============ */}
        {activeTab === 'OVERVIEW' && (
          <div className="animate-in max-w-7xl mx-auto pb-12">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Báo Cáo & Thống Kê</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Tổng quan tình hình kinh doanh và vận hành của trung tâm.</p>
              </div>
            </div>

            {/* HÀNG KPI 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-5">
              <StatCard icon={DollarSign} color="green" label="Tổng doanh thu" value={formatCompactVND(analytics.totalRevenue)} hint={formatVND(analytics.totalRevenue)} />
              <StatCard icon={Wallet} color="teal" label="Doanh thu tháng này" value={formatCompactVND(analytics.monthRevenue)} hint={formatVND(analytics.monthRevenue)} />
              <StatCard icon={FileText} color="amber" label="Tổng đơn đăng ký" value={analytics.totalRegs} hint={`${analytics.pendingRegs} đơn chờ xử lý`} />
              <StatCard icon={TrendingUp} color="red" label="Giá trị đơn TB" value={formatCompactVND(analytics.avgOrderValue)} hint={formatVND(analytics.avgOrderValue)} />
            </div>

            {/* HÀNG KPI 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              <StatCard icon={Users} color="blue" label="Tổng thành viên" value={analytics.totalUsers} />
              <StatCard icon={GraduationCap} color="purple" label="Học viên" value={analytics.totalStudents} />
              <StatCard icon={UserCog} color="purple" label="Giáo viên" value={analytics.totalTeachers} />
              <StatCard icon={BookCopy} color="red" label="Lớp đang hoạt động" value={analytics.activeClasses} />
            </div>

            {/* BIỂU ĐỒ DOANH THU + ĐƠN */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-2 bg-surface p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-foreground">Doanh Thu 6 Tháng Gần Nhất</h3>
                  <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/15 px-3 py-1 rounded-full">VNĐ</span>
                </div>
                <LineChart data={analytics.revenueByMonth} formatValue={formatVND} />
              </div>
              <div className="bg-surface p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
                <h3 className="text-lg font-bold text-foreground mb-6">Cơ Cấu Thành Viên</h3>
                <DonutChart data={analytics.usersByRole} centerLabel="Thành viên" centerValue={String(analytics.totalUsers)} />
              </div>
            </div>

            {/* SỐ ĐƠN THEO THÁNG + TRẠNG THÁI ĐƠN */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-2 bg-surface p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
                <h3 className="text-lg font-bold text-foreground mb-6">Số Đơn Đăng Ký Theo Tháng</h3>
                <BarChart data={analytics.regsByMonth} barClassName="fill-blue-500" />
              </div>
              <div className="bg-surface p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
                <h3 className="text-lg font-bold text-foreground mb-6">Trạng Thái Đơn</h3>
                {analytics.regByStatus.length > 0 ? (
                  <DonutChart data={analytics.regByStatus} centerLabel="Đơn" centerValue={String(analytics.totalRegs)} />
                ) : <p className="text-sm text-slate-400 text-center py-10">Chưa có dữ liệu.</p>}
              </div>
            </div>

            {/* TOP KHÓA HỌC + HÌNH THỨC HỌC */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-surface p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
                <h3 className="text-lg font-bold text-foreground mb-6">Top Khóa Học Theo Doanh Thu</h3>
                {analytics.topCourses.length > 0 ? (
                  <div className="space-y-4">
                    {analytics.topCourses.map((c, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="font-medium text-foreground truncate pr-4">{i + 1}. {c.label}</span>
                          <span className="font-bold text-red-600 dark:text-red-400 shrink-0">{formatVND(c.value)}</span>
                        </div>
                        <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all" style={{ width: `${(c.value / maxMonthRevenue) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-slate-400 text-center py-10">Chưa có dữ liệu doanh thu.</p>}
              </div>
              <div className="bg-surface p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
                <h3 className="text-lg font-bold text-foreground mb-6">Hình Thức Học</h3>
                {analytics.byMode.length > 0 ? (
                  <DonutChart data={analytics.byMode} centerLabel="Đơn" centerValue={String(analytics.byMode.reduce((s, d) => s + d.value, 0))} />
                ) : <p className="text-sm text-slate-400 text-center py-10">Chưa có dữ liệu.</p>}
              </div>
            </div>

            {/* XẾP HẠNG GIÁO VIÊN THEO ĐÁNH GIÁ */}
            <div className="bg-surface p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 mt-6">
              <div className="flex items-center gap-2 mb-6">
                <Star className="text-amber-500" size={20} fill="currentColor" />
                <h3 className="text-lg font-bold text-foreground">Giáo Viên Được Đánh Giá Cao</h3>
              </div>
              {analytics.topTeachers.length > 0 ? (
                <div className="space-y-3">
                  {analytics.topTeachers.map((t, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-sm flex items-center justify-center shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center gap-2">
                          <span className="font-medium text-foreground truncate">{t.label}</span>
                          <span className="flex items-center gap-1 font-bold text-amber-500 shrink-0"><Star size={14} fill="currentColor" /> {t.avg.toFixed(1)}</span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1.5">
                          <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full" style={{ width: `${(t.avg / 5) * 100}%` }} />
                        </div>
                      </div>
                      <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0 w-16 text-right">{t.count} lượt</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-slate-400 text-center py-10">Chưa có đánh giá nào từ học viên.</p>}
            </div>
          </div>
        )}

        {/* ============ TAB QUẢN LÝ TÀI KHOẢN ============ */}
        {activeTab === 'USERS' && (
          <div className="animate-in max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold text-foreground mb-2">Quản Lý Phân Quyền & Tài Khoản</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-6">Tài khoản được chia theo từng nhóm vai trò để quản lý dễ dàng hơn.</p>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
              <SegmentedTabs
                value={userRoleTab}
                onChange={(v) => setUserRoleTab(v as UserRole)}
                options={[
                  { value: 'STUDENT', label: 'Học viên', icon: GraduationCap, count: roleCounts.STUDENT },
                  { value: 'TEACHER', label: 'Giáo viên', icon: UserCheck, count: roleCounts.TEACHER },
                  { value: 'STAFF', label: 'Nhân viên', icon: Briefcase, count: roleCounts.STAFF },
                  { value: 'ADMIN', label: 'Admin', icon: ShieldAlert, count: roleCounts.ADMIN },
                ]}
              />
              <div className="relative">
                <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
                <input type="text" placeholder="Tìm theo tên hoặc SĐT..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="w-full lg:w-72 pl-12 pr-4 py-3 border border-slate-200 dark:border-slate-700 bg-surface text-foreground rounded-2xl outline-none focus:ring-2 focus:ring-red-500 shadow-sm" />
              </div>
            </div>

            <div className="bg-surface rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <tr><th className="p-4">Họ & Tên</th><th className="p-4">SĐT</th><th className="p-4">Vai trò (Role)</th><th className="p-4">Trạng thái</th><th className="p-4">Thao tác</th></tr>
                  </thead>
                  <tbody>
                    {filteredProfiles.map(profile => (
                      <tr key={profile.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-4 font-bold text-foreground">{profile.full_name}</td>
                        <td className="p-4 text-slate-500 dark:text-slate-400">{profile.phone}</td>
                        <td className="p-4">
                          <form action={async (formData) => {
                            const newRole = formData.get('role') as string;
                            try {
                              await updateUserRole(profile.id, newRole);
                              checkAuthAndFetch();
                            } catch (err) { alert('Lỗi: ' + (err as Error).message); }
                          }} className="flex items-center gap-2">
                            <select name="role" defaultValue={profile.role} disabled={profile.id === currentUser?.id} className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-foreground rounded-lg px-3 py-2 text-sm font-bold disabled:opacity-50">
                              <option value="STUDENT">Học viên</option><option value="TEACHER">Giáo viên</option>
                              <option value="STAFF">Nhân viên</option><option value="ADMIN">Admin</option>
                            </select>
                            {profile.id !== currentUser?.id && <button type="submit" className="bg-slate-900 dark:bg-slate-700 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-600">Lưu</button>}
                          </form>
                        </td>
                        <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${profile.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400'}`}>{profile.status}</span></td>
                        <td className="p-4">
                          <form action={async () => {
                            try {
                              await toggleUserStatus(profile.id, profile.status);
                              checkAuthAndFetch();
                            } catch (err) { alert('Lỗi: ' + (err as Error).message); }
                          }}>
                            <button disabled={profile.id === currentUser?.id} className={`text-sm px-3 py-2 rounded-lg font-bold disabled:opacity-40 ${profile.status === 'ACTIVE' ? 'text-red-600 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20' : 'text-green-600 bg-green-50 dark:bg-green-500/10 hover:bg-green-100 dark:hover:bg-green-500/20'}`}>
                              {profile.status === 'ACTIVE' ? 'Khóa Acc' : 'Mở Khóa'}
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                    {filteredProfiles.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-slate-500 dark:text-slate-400">Không có tài khoản nào trong nhóm này.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============ TAB LOGS ============ */}
        {activeTab === 'LOGS' && (
          <div className="animate-in h-[calc(100vh-64px)] flex flex-col max-w-6xl mx-auto pb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2 shrink-0">Dấu Vết Hoạt Động</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-6 shrink-0">Nhật ký được tách theo từng nhóm vai trò để dễ truy vết.</p>

            <div className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0">
              <SegmentedTabs
                value={logRoleTab}
                onChange={setLogRoleTab}
                options={[
                  { value: 'ALL', label: 'Tất cả', count: logRoleCounts.ALL },
                  { value: 'ADMIN', label: 'Admin', icon: ShieldAlert, count: logRoleCounts.ADMIN },
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
    </div>
  );
}
