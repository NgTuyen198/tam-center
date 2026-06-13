'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { login, signup, verifyOtpAction, resetPassword, updatePassword } from '@/app/actions/authActions';

type ViewState = 'LOGIN' | 'SIGNUP' | 'FORGOT_PASSWORD' | 'VERIFY_SIGNUP_OTP' | 'VERIFY_RECOVERY_OTP' | 'UPDATE_PASSWORD';

const inputClass =
  "w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-foreground px-3 py-2 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-colors";

export default function LoginPage() {
  const [view, setView] = useState<ViewState>('LOGIN');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin(formData: FormData) {
    setIsLoading(true); setError(''); setMessage('');
    const res = await login(formData);
    if (res?.error) setError(res.error);
    setIsLoading(false);
  }

  async function handleSignup(formData: FormData) {
    const pwd = formData.get('password') as string;
    const confirmPwd = formData.get('confirmPassword') as string;
    const userEmail = formData.get('email') as string;

    if (pwd !== confirmPwd) {
      setError('Mật khẩu xác nhận không khớp!');
      return;
    }

    setIsLoading(true); setError(''); setMessage('');
    const res = await signup(formData);
    if (res?.error) setError(res.error);
    if (res?.success) {
      setEmail(userEmail);
      setMessage(res.success);
      setView('VERIFY_SIGNUP_OTP');
    }
    setIsLoading(false);
  }

  async function handleVerifySignupOtp(formData: FormData) {
    const token = formData.get('otp') as string;
    setIsLoading(true); setError(''); setMessage('');
    const res = await verifyOtpAction(email, token, 'signup');
    if (res?.error) setError(res.error);
    setIsLoading(false);
  }

  async function handleForgotPassword(formData: FormData) {
    const userEmail = formData.get('email') as string;
    setIsLoading(true); setError(''); setMessage('');
    const res = await resetPassword(userEmail);
    if (res?.error) setError(res.error);
    if (res?.success) {
      setEmail(userEmail);
      setMessage('Mã OTP khôi phục đã được gửi đến email của bạn.');
      setView('VERIFY_RECOVERY_OTP');
    }
    setIsLoading(false);
  }

  async function handleVerifyRecoveryOtp(formData: FormData) {
    const token = formData.get('otp') as string;
    setIsLoading(true); setError(''); setMessage('');
    const res = await verifyOtpAction(email, token, 'recovery');
    if (res?.error) setError(res.error);
    if (res?.success) {
      setMessage('Xác thực thành công. Vui lòng tạo mật khẩu mới.');
      setView('UPDATE_PASSWORD');
    }
    setIsLoading(false);
  }

  async function handleUpdatePassword(formData: FormData) {
    const pwd = formData.get('password') as string;
    const confirmPwd = formData.get('confirmPassword') as string;

    if (pwd !== confirmPwd) {
      setError('Mật khẩu xác nhận không khớp!');
      return;
    }

    setIsLoading(true); setError(''); setMessage('');
    const res = await updatePassword(pwd);
    if (res?.error) setError(res.error);
    setIsLoading(false);
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2 text-red-600 dark:text-red-500 mb-6">
          <BookOpen size={32} />
          <span className="font-bold text-2xl tracking-tight">TAM Center</span>
        </Link>

        <div className="bg-surface p-8 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-black/30 border border-slate-100 dark:border-slate-800">

          {(view === 'LOGIN' || view === 'SIGNUP') && (
            <div className="flex gap-4 mb-8 border-b border-slate-200 dark:border-slate-700 pb-2">
              <button
                className={`text-lg font-bold pb-1 transition-colors ${view === 'LOGIN' ? 'text-red-600 border-b-2 border-red-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                onClick={() => { setView('LOGIN'); setError(''); setMessage(''); }}
              >
                Đăng nhập
              </button>
              <button
                className={`text-lg font-bold pb-1 transition-colors ${view === 'SIGNUP' ? 'text-red-600 border-b-2 border-red-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                onClick={() => { setView('SIGNUP'); setError(''); setMessage(''); }}
              >
                Đăng ký mới
              </button>
            </div>
          )}

          {view === 'FORGOT_PASSWORD' && <h2 className="text-2xl font-bold mb-6 text-foreground">Quên mật khẩu</h2>}
          {view === 'VERIFY_SIGNUP_OTP' && <h2 className="text-2xl font-bold mb-6 text-foreground">Xác thực tài khoản</h2>}
          {view === 'VERIFY_RECOVERY_OTP' && <h2 className="text-2xl font-bold mb-6 text-foreground">Xác thực mã bảo mật</h2>}
          {view === 'UPDATE_PASSWORD' && <h2 className="text-2xl font-bold mb-6 text-foreground">Tạo mật khẩu mới</h2>}

          {error && <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-3 rounded-lg mb-4 text-sm border border-red-100 dark:border-red-500/20">{error}</div>}
          {message && <div className="bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 p-3 rounded-lg mb-4 text-sm border border-green-100 dark:border-green-500/20">{message}</div>}

          {/* LOGIN */}
          {view === 'LOGIN' && (
            <form action={handleLogin} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tài khoản (Email)</label>
                <input type="email" name="email" autoComplete="username" required className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mật khẩu</label>
                <input type="password" name="password" autoComplete="current-password" required className={inputClass} />
              </div>
              <button type="submit" disabled={isLoading} className="w-full bg-red-600 text-white py-2.5 rounded-lg font-bold hover:bg-red-700 mt-2 disabled:bg-red-400 transition-colors">
                {isLoading ? 'Đang xử lý...' : 'Đăng Nhập'}
              </button>
              <div className="text-center mt-2">
                <button type="button" onClick={() => { setView('FORGOT_PASSWORD'); setError(''); setMessage(''); }} className="text-sm text-red-600 dark:text-red-400 hover:underline">
                  Quên mật khẩu?
                </button>
              </div>
            </form>
          )}

          {/* SIGNUP */}
          {view === 'SIGNUP' && (
            <form action={handleSignup} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Họ và tên</label>
                <input type="text" name="fullName" required className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Số điện thoại</label>
                <input type="tel" name="phone" required className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tài khoản (Email)</label>
                <input type="email" name="email" autoComplete="username" required className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mật khẩu (Ít nhất 6 ký tự)</label>
                <input type="password" name="password" autoComplete="new-password" required minLength={6} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Xác nhận lại mật khẩu</label>
                <input type="password" name="confirmPassword" autoComplete="new-password" required minLength={6} className={inputClass} />
              </div>
              <button type="submit" disabled={isLoading} className="w-full bg-slate-900 dark:bg-slate-700 text-white py-2.5 rounded-lg font-bold hover:bg-slate-800 dark:hover:bg-slate-600 mt-2 disabled:opacity-60 transition-colors">
                {isLoading ? 'Đang xử lý...' : 'Đăng Ký Tài Khoản'}
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD */}
          {view === 'FORGOT_PASSWORD' && (
            <form action={handleForgotPassword} className="flex flex-col gap-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Vui lòng nhập email của bạn, hệ thống sẽ gửi mã OTP gồm 6 chữ số để khôi phục mật khẩu.</p>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tài khoản (Email)</label>
                <input type="email" name="email" autoComplete="username" required className={inputClass} />
              </div>
              <button type="submit" disabled={isLoading} className="w-full bg-red-600 text-white py-2.5 rounded-lg font-bold hover:bg-red-700 mt-2 disabled:bg-red-400 transition-colors">
                {isLoading ? 'Đang xử lý...' : 'Nhận Mã OTP'}
              </button>
              <div className="text-center mt-2">
                <button type="button" onClick={() => { setView('LOGIN'); setError(''); setMessage(''); }} className="text-sm text-slate-600 dark:text-slate-400 hover:underline">
                  Quay lại đăng nhập
                </button>
              </div>
            </form>
          )}

          {/* OTP */}
          {(view === 'VERIFY_SIGNUP_OTP' || view === 'VERIFY_RECOVERY_OTP') && (
            <form action={view === 'VERIFY_SIGNUP_OTP' ? handleVerifySignupOtp : handleVerifyRecoveryOtp} className="flex flex-col gap-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Mã bảo mật OTP đã được gửi đến: <br /><span className="font-bold text-foreground">{email}</span></p>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nhập mã OTP</label>
                <input type="text" name="otp" required maxLength={8} className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-3 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-center text-2xl tracking-[0.5em] font-bold text-foreground" placeholder="••••••" />
              </div>
              <button type="submit" disabled={isLoading} className="w-full bg-slate-900 dark:bg-slate-700 text-white py-2.5 rounded-lg font-bold hover:bg-slate-800 dark:hover:bg-slate-600 mt-2 disabled:opacity-60 transition-colors">
                {isLoading ? 'Đang xác thực...' : 'Xác Nhận'}
              </button>
            </form>
          )}

          {/* UPDATE PASSWORD */}
          {view === 'UPDATE_PASSWORD' && (
            <form action={handleUpdatePassword} className="flex flex-col gap-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Vui lòng thiết lập mật khẩu mới cho tài khoản của bạn.</p>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mật khẩu mới</label>
                <input type="password" name="password" autoComplete="new-password" required minLength={6} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Xác nhận mật khẩu mới</label>
                <input type="password" name="confirmPassword" autoComplete="new-password" required minLength={6} className={inputClass} />
              </div>
              <button type="submit" disabled={isLoading} className="w-full bg-green-600 text-white py-2.5 rounded-lg font-bold hover:bg-green-700 mt-2 disabled:bg-green-500 transition-colors">
                {isLoading ? 'Đang xử lý...' : 'Cập Nhật & Đăng Nhập'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
