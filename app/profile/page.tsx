'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, User, Phone, Mail, MapPin, Calendar, Save, Loader2,
  GraduationCap, Briefcase, ShieldAlert, BadgeCheck, Award, Clock, CheckCircle2, KeyRound, Camera
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { updateMyProfile } from '@/app/actions/profileActions';
import { roleBadge } from '@/lib/status';
import type { Profile, UserRole } from '@/lib/types';

const supabase = createClient();

const DASHBOARD_BY_ROLE: Record<UserRole, string> = {
  STUDENT: '/dashboard',
  TEACHER: '/teacher-dashboard',
  STAFF: '/staff-dashboard',
  ADMIN: '/admin-dashboard',
};

const ROLE_LABEL: Record<UserRole, string> = {
  STUDENT: 'Học Viên',
  TEACHER: 'Giáo Viên',
  STAFF: 'Nhân Viên',
  ADMIN: 'Quản Trị Viên',
};

const ROLE_ICON: Record<UserRole, React.ElementType> = {
  STUDENT: GraduationCap,
  TEACHER: Award,
  STAFF: Briefcase,
  ADMIN: ShieldAlert,
};

const inputClass =
  'w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-foreground rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors';
const labelClass = 'block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('STUDENT');
  const [profile, setProfile] = useState<Profile | null>(null);

  // form state
  const [form, setForm] = useState({
    full_name: '', phone: '', gender: '', date_of_birth: '',
    address: '', bio: '', specialization: '', experience_years: '',
    avatar_url: '',
  });

  // States cho đổi mật khẩu
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // States cho ảnh đại diện
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/login'; return; }

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (prof) {
      setProfile(prof as Profile);
      setRole((prof.role as UserRole) || 'STUDENT');
      setEmail(user.email || '');
      setForm({
        full_name: prof.full_name || '',
        phone: prof.phone || '',
        gender: prof.gender || '',
        date_of_birth: prof.date_of_birth || '',
        address: prof.address || '',
        bio: prof.bio || '',
        specialization: prof.specialization || '',
        experience_years: prof.experience_years != null ? String(prof.experience_years) : '',
        avatar_url: prof.avatar_url || '',
      });
    }
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const res = await updateMyProfile({
      full_name: form.full_name,
      phone: form.phone || null,
      gender: (form.gender as 'MALE' | 'FEMALE' | 'OTHER') || null,
      date_of_birth: form.date_of_birth || null,
      address: form.address || null,
      bio: form.bio || null,
      avatar_url: form.avatar_url || null,
      specialization: form.specialization || null,
      experience_years: form.experience_years ? parseInt(form.experience_years, 10) : null,
    });
    setSaving(false);
    if (res?.error) { alert('Lỗi: ' + res.error); return; }
    setSaved(true);
    await loadProfile();
    setTimeout(() => setSaved(false), 3000);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      alert('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('Xác nhận mật khẩu mới không khớp.');
      return;
    }

    setPasswordSaving(true);
    setPasswordSuccess(false);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    setPasswordSaving(false);

    if (error) {
      alert('Lỗi cập nhật mật khẩu: ' + error.message);
      return;
    }

    setPasswordSuccess(true);
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordSuccess(false), 4000);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Kích thước ảnh tối đa là 2MB.');
      return;
    }

    setUploadingAvatar(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Chưa đăng nhập');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Tải ảnh lên bucket 'avatars'
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Lấy link public
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Cập nhật CSDL
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (dbError) throw dbError;

      setForm(prev => ({ ...prev, avatar_url: publicUrl }));
      alert('Đã cập nhật ảnh đại diện thành công!');
    } catch (err) {
      console.error('Error uploading avatar:', err);
      alert('Lỗi tải ảnh lên: ' + (err as Error).message + '\n\nLưu ý: Đảm bảo bạn đã tạo bucket tên là "avatars" ở chế độ Public trên Supabase Storage.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin text-red-600 text-4xl">⏳</div>
      </div>
    );
  }

  const RoleIcon = ROLE_ICON[role];
  const isTeacher = role === 'TEACHER';
  const initial = form.full_name?.charAt(0)?.toUpperCase() || 'U';

  return (
    <div className="min-h-screen bg-background">
      {/* Thanh trên cùng */}
      <div className="bg-surface border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href={DASHBOARD_BY_ROLE[role]} className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 font-medium transition-colors">
            <ArrowLeft size={20} /> Quay lại
          </Link>
          <h1 className="font-bold text-foreground">Hồ Sơ Cá Nhân</h1>
          <div className="w-20" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Thẻ tóm tắt */}
        <div className="bg-surface rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-red-600 to-red-500" />
          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
              <div className="relative shrink-0">
                <div className="w-24 h-24 rounded-3xl bg-white dark:bg-slate-800 border-4 border-surface shadow-lg flex items-center justify-center text-red-600 dark:text-red-400 font-black text-4xl overflow-hidden">
                  {form.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    initial
                  )}
                </div>
                {uploadingAvatar && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-3xl z-10">
                    <Loader2 className="animate-spin text-white" size={20} />
                  </div>
                )}
                <label className="absolute -bottom-2 -right-2 bg-red-600 text-white p-2 rounded-full shadow-lg hover:bg-red-700 hover:scale-105 active:scale-95 transition-all cursor-pointer border-2 border-white dark:border-slate-800 flex items-center justify-center">
                  <Camera size={16} />
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                </label>
              </div>
              <div className="flex-1 min-w-0 sm:pb-2">
                <h2 className="text-2xl font-black text-foreground truncate">{form.full_name || 'Chưa đặt tên'}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${roleBadge(role)}`}>
                    <RoleIcon size={13} /> {ROLE_LABEL[role]}
                  </span>
                  {profile?.status === 'ACTIVE' && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400">
                      <BadgeCheck size={13} /> Đang hoạt động
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
              <div className="flex items-center gap-2.5 text-sm bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3 py-2.5 border border-slate-100 dark:border-slate-700">
                <Mail size={16} className="text-blue-500 shrink-0" />
                <span className="text-slate-600 dark:text-slate-300 truncate">{email || '—'}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3 py-2.5 border border-slate-100 dark:border-slate-700">
                <Phone size={16} className="text-green-500 shrink-0" />
                <span className="text-slate-600 dark:text-slate-300 truncate">{form.phone || 'Chưa có'}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3 py-2.5 border border-slate-100 dark:border-slate-700">
                <Clock size={16} className="text-amber-500 shrink-0" />
                <span className="text-slate-600 dark:text-slate-300 truncate">
                  Tham gia {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('vi-VN') : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Form chỉnh sửa */}
        <form onSubmit={handleSave} className="bg-surface rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 md:p-8 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-1">
              <User size={20} className="text-red-500" /> Thông tin chung
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Bổ sung thông tin để hồ sơ của bạn đầy đủ hơn.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Họ và tên *</label>
              <input required value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className={inputClass} placeholder="Nguyễn Văn A" />
            </div>
            <div>
              <label className={labelClass}>Số điện thoại</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputClass} placeholder="09xxxxxxxx" />
            </div>
            <div>
              <label className={labelClass}>Giới tính</label>
              <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} className={inputClass}>
                <option value="">— Chọn —</option>
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Ngày sinh</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
                <input type="date" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} className={`${inputClass} pl-10`} />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Địa chỉ</label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
                <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className={`${inputClass} pl-10`} placeholder="Số nhà, đường, phường/xã, tỉnh/thành" />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Giới thiệu bản thân</label>
              <textarea rows={3} value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} className={`${inputClass} resize-none`} placeholder="Đôi nét về bạn..." />
            </div>
          </div>

          {/* Khu vực riêng cho giáo viên */}
          {isTeacher && (
            <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
                <Award size={20} className="text-purple-500" /> Thông tin chuyên môn
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Chuyên môn</label>
                  <input value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })} className={inputClass} placeholder="VD: Luyện thi HSK 5-6, Giao tiếp thương mại" />
                </div>
                <div>
                  <label className={labelClass}>Số năm kinh nghiệm</label>
                  <input type="number" min={0} max={60} value={form.experience_years} onChange={e => setForm({ ...form, experience_years: e.target.value })} className={inputClass} placeholder="VD: 5" />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-5">
            {saved && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400">
                <CheckCircle2 size={16} /> Đã lưu thay đổi
              </span>
            )}
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 bg-red-600 text-white font-bold px-6 py-2.5 rounded-xl shadow-md shadow-red-600/20 hover:bg-red-700 transition disabled:bg-red-400">
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Lưu thay đổi
            </button>
          </div>
        </form>

        {/* Form đổi mật khẩu */}
        <form onSubmit={handlePasswordChange} className="bg-surface rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 md:p-8 space-y-6 animate-in">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-1">
              <KeyRound size={20} className="text-red-500" /> Đổi mật khẩu
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Thiết lập mật khẩu mới để bảo vệ tài khoản của bạn.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Mật khẩu mới *</label>
              <input 
                required 
                type="password" 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
                className={inputClass} 
                placeholder="Tối thiểu 6 ký tự" 
              />
            </div>
            <div>
              <label className={labelClass}>Xác nhận mật khẩu mới *</label>
              <input 
                required 
                type="password" 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                className={inputClass} 
                placeholder="Nhập lại mật khẩu mới" 
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-5">
            {passwordSuccess && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400">
                <CheckCircle2 size={16} /> Đổi mật khẩu thành công!
              </span>
            )}
            <button 
              type="submit" 
              disabled={passwordSaving} 
              className="inline-flex items-center gap-2 bg-red-600 text-white font-bold px-6 py-2.5 rounded-xl shadow-md shadow-red-600/20 hover:bg-red-700 transition disabled:bg-red-400"
            >
              {passwordSaving ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} />}
              Cập nhật mật khẩu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
