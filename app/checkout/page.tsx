'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { submitRegistration } from '@/app/actions/registrationActions';
import Link from 'next/link';
import { CreditCard, Smartphone, Building2, Loader2, CheckCircle2, XCircle, X } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { formatVND } from '@/lib/status';

type PaymentStep = 'selection' | 'processing' | 'success' | 'error';
type PaymentMethod = 'vnpay' | 'momo' | 'bank';

function CheckoutForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const courseId = searchParams.get('course');

  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [courseInfo, setCourseInfo] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    async function fetchCourse() {
      if (!courseId) {
        setLoadingData(false);
        return;
      }
      const { data } = await supabase
        .from('courses')
        .select('*, course_variants(*)')
        .eq('id', courseId)
        .single();

      setCourseInfo(data);
      setLoadingData(false);
    }
    fetchCourse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const [learningMode, setLearningMode] = useState<'GROUP' | '1_ON_1'>('GROUP');
  const [packageType, setPackageType] = useState<'SINGLE_SESSIONS' | 'FULL_PACKAGE'>('FULL_PACKAGE');
  const [sessionsCount, setSessionsCount] = useState(1);
  const [specialRequests, setSpecialRequests] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('selection');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('vnpay');
  const [error, setError] = useState('');

  if (loadingData) {
    return <div className="flex justify-center items-center min-h-[50vh]"><Loader2 className="animate-spin text-red-600" size={48} /></div>;
  }

  if (!courseInfo || !courseInfo.course_variants) {
    return (
      <div className="text-center py-20 min-h-[50vh] flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold mb-4 text-foreground">Lỗi tải thông tin thanh toán</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6">Không tìm thấy khóa học. Vui lòng quay lại danh sách.</p>
        <button onClick={() => router.push('/')} className="bg-red-600 text-white px-6 py-2 rounded-xl hover:bg-red-700 transition-colors">Về trang chủ</button>
      </div>
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groupVariant = courseInfo.course_variants.find((v: any) => v.learning_mode === 'GROUP');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oneOnOneVariant = courseInfo.course_variants.find((v: any) => v.learning_mode === '1_ON_1');

  const selectedVariant = learningMode === 'GROUP' ? groupVariant : oneOnOneVariant;

  const calculateTotal = () => {
    if (!selectedVariant) return 0;
    return packageType === 'FULL_PACKAGE'
      ? selectedVariant.full_package_price
      : selectedVariant.price_per_session * sessionsCount;
  };

  const handleOpenPaymentModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariant) {
      alert("Khóa học chưa được cấu hình giá!");
      return;
    }
    setShowModal(true);
    setPaymentStep('selection');
    setError('');
  };

  const executePayment = async () => {
    if (!selectedVariant) return;

    setPaymentStep('processing');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    try {
      const res = await submitRegistration({
        courseVariantId: selectedVariant.id,
        packageType,
        sessionsCount: packageType === 'FULL_PACKAGE' ? 0 : sessionsCount,
        specialRequests,
        totalAmount: calculateTotal(),
      });

      if (res?.error) {
        setError(res.error);
        setPaymentStep('error');
      } else {
        setPaymentStep('success');
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra trong quá trình lưu dữ liệu');
      setPaymentStep('error');
    }
  };

  const optionBtn = (active: boolean) =>
    `p-4 border-2 rounded-2xl text-left transition-all ${active ? 'border-red-500 bg-red-50 dark:bg-red-500/10' : 'border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-500/40'}`;

  return (
    <>
      <div className="bg-surface border-b border-slate-200 dark:border-slate-800 py-6 mb-8 shadow-sm">
        <h1 className="text-3xl font-extrabold text-foreground text-center">Hoàn Tất Đăng Ký</h1>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* CỘT TRÁI */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-surface p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-foreground">
                <span className="bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400 w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
                Tùy chọn lộ trình cho: <span className="text-red-600 dark:text-red-400 ml-1">{courseInfo.name}</span>
              </h2>

              <div className="mb-8">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Hình thức học</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {groupVariant && (
                    <button onClick={() => setLearningMode('GROUP')} className={optionBtn(learningMode === 'GROUP')}>
                      <div className="font-bold text-foreground text-lg">Học Nhóm</div>
                      <div className="text-sm font-medium text-red-600 dark:text-red-400 mt-1">{formatVND(groupVariant.full_package_price)} / khóa ({groupVariant.total_sessions} buổi)</div>
                    </button>
                  )}
                  {oneOnOneVariant && (
                    <button onClick={() => setLearningMode('1_ON_1')} className={optionBtn(learningMode === '1_ON_1')}>
                      <div className="font-bold text-foreground text-lg">1 Kèm 1 (VIP)</div>
                      <div className="text-sm font-medium text-red-600 dark:text-red-400 mt-1">{formatVND(oneOnOneVariant.full_package_price)} / khóa ({oneOnOneVariant.total_sessions} buổi)</div>
                    </button>
                  )}
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Lựa chọn gói đăng ký</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button onClick={() => setPackageType('FULL_PACKAGE')} className={optionBtn(packageType === 'FULL_PACKAGE')}>
                    <div className="font-bold text-foreground text-lg">Đăng ký Trọn Khóa</div>
                    <div className="text-sm text-green-600 dark:text-green-400 font-medium mt-1">Tiết kiệm hơn so với học lẻ</div>
                  </button>
                  <button onClick={() => setPackageType('SINGLE_SESSIONS')} className={optionBtn(packageType === 'SINGLE_SESSIONS')}>
                    <div className="font-bold text-foreground text-lg">Đăng ký Buổi Lẻ</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Linh hoạt thời gian, học bao nhiêu trả bấy nhiêu</div>
                  </button>
                </div>
              </div>

              {packageType === 'SINGLE_SESSIONS' && selectedVariant && (
                <div className="mb-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 animate-in">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Bạn muốn đăng ký bao nhiêu buổi?</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="number" min="1" max={selectedVariant.total_sessions}
                      value={sessionsCount}
                      onChange={(e) => setSessionsCount(Number(e.target.value))}
                      className="w-32 border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-foreground px-4 py-3 rounded-xl focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-500/20 outline-none text-lg font-bold text-center"
                    />
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Buổi (Giá lẻ: {formatVND(selectedVariant.price_per_session)}/buổi)</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Ghi chú cho Trung tâm (Nếu có)</label>
                <textarea
                  rows={3}
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="Ví dụ: Mình muốn xếp lịch học vào buổi tối thứ 2, 4, 6..."
                  className="w-full border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-foreground px-4 py-3 rounded-xl focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-500/20 outline-none resize-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* CỘT PHẢI */}
          <div className="lg:col-span-1">
            <div className="bg-surface p-6 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-800 sticky top-24">
              <h3 className="text-xl font-bold mb-6 pb-4 border-b border-slate-100 dark:border-slate-800 text-foreground">Hóa Đơn Của Bạn</h3>

              <div className="space-y-4 mb-8 text-slate-600 dark:text-slate-400">
                <div className="flex justify-between items-center">
                  <span>Khóa học:</span>
                  <span className="font-bold text-foreground text-right w-1/2">{courseInfo.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Hình thức:</span>
                  <span className="font-bold text-foreground">{learningMode === 'GROUP' ? 'Học Nhóm' : '1 kèm 1'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Gói đăng ký:</span>
                  <span className="font-bold text-foreground">{packageType === 'FULL_PACKAGE' ? 'Trọn khóa' : `${sessionsCount} buổi lẻ`}</span>
                </div>
              </div>

              <div className="border-t-2 border-dashed border-slate-200 dark:border-slate-700 pt-6 mb-8">
                <div className="flex justify-between items-end">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Tổng thanh toán</span>
                  <span className="text-3xl font-black text-red-600 dark:text-red-400">
                    {formatVND(calculateTotal())}
                  </span>
                </div>
              </div>

              <button
                onClick={handleOpenPaymentModal}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-red-600/30 transition-all transform hover:-translate-y-1"
              >
                Tiến Hành Thanh Toán
              </button>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                <CheckCircle2 size={14} className="text-green-500" />
                Giao dịch mã hóa chuẩn quốc tế
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* POPUP THANH TOÁN */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface rounded-3xl w-full max-w-md shadow-2xl overflow-hidden zoom-in">

            <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-foreground">Cổng Thanh Toán TAM Center</h3>
              {paymentStep !== 'processing' && paymentStep !== 'success' && (
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition">
                  <X size={24} />
                </button>
              )}
            </div>

            <div className="p-6">
              {paymentStep === 'selection' && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">Số tiền cần thanh toán</p>
                    <p className="text-3xl font-black text-foreground">{formatVND(calculateTotal())}</p>
                  </div>

                  <div className="space-y-3">
                    <button onClick={() => setPaymentMethod('vnpay')} className={`w-full flex items-center p-4 border-2 rounded-2xl transition ${paymentMethod === 'vnpay' ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-500/15 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 mr-4"><CreditCard size={20} /></div>
                      <div className="text-left"><div className="font-bold text-foreground">Thanh toán VNPay</div><div className="text-xs text-slate-500 dark:text-slate-400">Quét mã QR qua ứng dụng ngân hàng</div></div>
                    </button>
                    <button onClick={() => setPaymentMethod('momo')} className={`w-full flex items-center p-4 border-2 rounded-2xl transition ${paymentMethod === 'momo' ? 'border-pink-500 bg-pink-50 dark:bg-pink-500/10' : 'border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                      <div className="w-10 h-10 bg-pink-100 dark:bg-pink-500/15 rounded-full flex items-center justify-center text-pink-600 dark:text-pink-400 mr-4"><Smartphone size={20} /></div>
                      <div className="text-left"><div className="font-bold text-foreground">Ví điện tử MoMo</div><div className="text-xs text-slate-500 dark:text-slate-400">Mở app MoMo để quét mã</div></div>
                    </button>
                    <button onClick={() => setPaymentMethod('bank')} className={`w-full flex items-center p-4 border-2 rounded-2xl transition ${paymentMethod === 'bank' ? 'border-green-500 bg-green-50 dark:bg-green-500/10' : 'border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-500/15 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 mr-4"><Building2 size={20} /></div>
                      <div className="text-left"><div className="font-bold text-foreground">Chuyển khoản Ngân hàng</div><div className="text-xs text-slate-500 dark:text-slate-400">Chuyển khoản thủ công 24/7</div></div>
                    </button>
                  </div>

                  <button onClick={executePayment} className="w-full bg-slate-900 dark:bg-slate-700 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 dark:hover:bg-slate-600 transition shadow-lg mt-4">
                    Xác Nhận & Thanh Toán
                  </button>
                </div>
              )}

              {paymentStep === 'processing' && (
                <div className="py-12 flex flex-col items-center text-center">
                  <div className="relative">
                    <div className="w-20 h-20 border-4 border-slate-100 dark:border-slate-700 rounded-full"></div>
                    <Loader2 className="w-20 h-20 text-red-600 animate-spin absolute top-0 left-0" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mt-6 mb-2">Đang xử lý giao dịch...</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm px-4">Vui lòng không đóng trình duyệt hoặc tải lại trang.</p>
                </div>
              )}

              {paymentStep === 'success' && (
                <div className="py-8 flex flex-col items-center text-center zoom-in">
                  <div className="w-24 h-24 bg-green-100 dark:bg-green-500/15 text-green-500 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 size={48} />
                  </div>
                  <h3 className="text-2xl font-black text-foreground mb-2">Giao dịch thành công!</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-8 px-4">
                    Đơn đăng ký của bạn đã được ghi nhận. Nhân viên sẽ tiến hành xếp lớp trong thời gian sớm nhất.
                  </p>
                  <Link href="/dashboard" className="w-full bg-green-500 text-white font-bold py-4 rounded-2xl hover:bg-green-600 transition shadow-lg">
                    Theo dõi lịch học tại Trang Cá Nhân
                  </Link>
                </div>
              )}

              {paymentStep === 'error' && (
                <div className="py-8 flex flex-col items-center text-center">
                  <div className="w-24 h-24 bg-red-100 dark:bg-red-500/15 text-red-500 rounded-full flex items-center justify-center mb-6"><XCircle size={48} /></div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Giao dịch thất bại</h3>
                  <p className="text-red-500 mb-8 px-4">{error}</p>
                  <button onClick={() => setPaymentStep('selection')} className="w-full bg-slate-100 dark:bg-slate-800 text-foreground font-bold py-4 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                    Thử lại ngay
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function CheckoutPage() {
  return (
    <div className="bg-background min-h-screen pb-20">
      <Suspense fallback={<div className="flex justify-center items-center min-h-[50vh]"><Loader2 className="animate-spin text-red-600" size={48} /></div>}>
        <CheckoutForm />
      </Suspense>
    </div>
  );
}
