import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, Users, BookOpen, Star } from "lucide-react";
import { createClient } from '@/utils/supabase/server';
import { formatVND } from '@/lib/status';
import { courseVisual } from '@/lib/courseVisual';

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: course, error } = await supabase.from('courses').select('*, course_variants(*)').eq('id', id).single();

  if (error || !course || !course.is_active) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 bg-background">
        <h1 className="text-4xl font-bold text-foreground mb-4">404 - Không tìm thấy</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8">Khóa học này hiện đã ngừng bán hoặc bị gỡ.</p>
        <Link href="/" className="bg-red-600 text-white px-6 py-3 rounded-full font-bold hover:bg-red-700 transition-colors">Về danh sách khóa học</Link>
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const minPrice = course.course_variants?.reduce((min: number, v: any) => v.full_package_price < min ? v.full_package_price : min, Infinity);
  const displayPrice = minPrice !== Infinity ? minPrice : 0;

  // Giảm 10% nhất quán: giá gốc = giá hiện tại / 0.9
  const originalPrice = Math.round((displayPrice / 0.9) / 1000) * 1000;

  const benefitsList = course.benefits || [];

  const visual = courseVisual(course.name, course.category);

  const stats = [
    { icon: Clock, color: 'red', label: 'Thời lượng', value: `Từ ${course.course_variants?.[0]?.total_sessions || 20} buổi` },
    { icon: Users, color: 'blue', label: 'Hình thức', value: 'Nhóm / 1 Kèm 1' },
    { icon: BookOpen, color: 'green', label: 'Giáo trình', value: 'Miễn phí' },
    { icon: Star, color: 'yellow', label: 'Cam kết', value: 'Đầu ra 100%' },
  ];

  const iconColors: Record<string, string> = {
    red: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400',
    yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-500/15 dark:text-yellow-400',
  };

  return (
    <div className="bg-background min-h-screen pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-4">
        <Link href="/" className="inline-flex items-center text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 font-medium transition-colors"><ArrowLeft size={20} className="mr-2" /> Quay lại danh sách</Link>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="bg-surface rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">

          <div
            className="text-white p-8 md:p-12 relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${visual.from}, ${visual.to})` }}
          >
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full border-[3px] border-white/40" />
              <div className="absolute -bottom-16 -left-12 w-56 h-56 rounded-full border-[3px] border-white/30" />
            </div>
            <div className="relative z-10">
              <span className="inline-block bg-white/20 text-white backdrop-blur-md px-3 py-1 rounded-full text-sm font-bold tracking-wide mb-4">{visual.tag}</span>
              <h1 className="text-3xl md:text-5xl font-extrabold mb-4 leading-tight">{course.name}</h1>
              <p className="text-white/80 text-lg max-w-2xl">{course.description}</p>
            </div>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-15 text-[200px] leading-none select-none font-black">{visual.hanzi}</div>
          </div>

          <div className="p-8 md:p-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 pb-10 border-b border-slate-100 dark:border-slate-800">
              {stats.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconColors[s.color]}`}><s.icon size={20} /></div>
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{s.label}</div>
                    <div className="font-bold text-foreground">{s.value}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-12">
              <h2 className="text-2xl font-bold text-foreground mb-4">Bạn sẽ học những gì?</h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6 text-lg whitespace-pre-wrap">{course.content}</p>

              {benefitsList.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <h3 className="font-bold text-foreground mb-4">Kết quả đạt được sau khóa học:</h3>
                  <ul className="space-y-3">
                    {benefitsList.map((benefit: string, index: number) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle2 size={20} className="text-green-500 shrink-0 mt-0.5" />
                        <span className="text-slate-700 dark:text-slate-300">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="bg-red-50 dark:bg-red-500/10 rounded-3xl p-8 border border-red-100 dark:border-red-500/20 text-center">
              <h2 className="text-2xl font-bold text-foreground mb-2">Đăng ký ngay hôm nay</h2>
              <p className="text-red-800 dark:text-red-300 mb-6">Giảm ngay 10% khi đăng ký lộ trình học trọn gói.</p>
              <div className="text-4xl font-black text-red-600 dark:text-red-400 mb-8">
                Từ {formatVND(displayPrice)} <span className="text-base font-normal text-slate-500 dark:text-slate-400 line-through ml-2">{formatVND(originalPrice)}</span>
              </div>
              <Link href={`/checkout?course=${id}`} className="inline-block bg-red-600 text-white text-lg font-bold px-12 py-4 rounded-full hover:bg-red-700 shadow-lg shadow-red-600/30 transition-transform transform hover:-translate-y-1">
                Tùy chọn gói học & Ghi danh
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
