'use client';

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Search, Star, ArrowRight, Award, Clock, Users,
  BookOpen, Headphones, Target, Globe, ShieldCheck, Sparkles,
  ClipboardList, CalendarCheck, Trophy, Quote, ChevronDown, Phone, Mail, MapPin
} from "lucide-react";
import { createClient } from '@/utils/supabase/client';
import { formatVND } from '@/lib/status';
import CourseCover from '@/app/components/CourseCover';
import LiveSignupBanner from '@/app/components/LiveSignupBanner';
import type { Course, Profile } from '@/lib/types';

const supabase = createClient();

// Giáo viên kèm điểm đánh giá trung bình (tính từ teacher_reviews)
interface TeacherCard extends Profile {
  avgRating: number;
  reviewCount: number;
}

const FEATURES = [
  { icon: Target, title: 'Lộ trình cá nhân hóa', desc: 'Xếp lớp theo trình độ, kiểm tra đầu vào và thiết kế lộ trình riêng cho từng học viên.' },
  { icon: Globe, title: 'Giảng viên bản xứ', desc: 'Đội ngũ HSK 6, từng du học và làm việc tại Trung Quốc, phát âm chuẩn Bắc Kinh.' },
  { icon: Headphones, title: 'Hỗ trợ 1-1 sát sao', desc: 'Trợ giảng theo dõi tiến độ, nhắc lịch học và giải đáp bài tập mọi lúc.' },
  { icon: ShieldCheck, title: 'Cam kết đầu ra', desc: 'Đảm bảo đạt chuẩn HSK theo cam kết, học lại miễn phí nếu chưa đạt.' },
];

const STEPS = [
  { icon: ClipboardList, title: 'Đăng ký & Test đầu vào', desc: 'Chọn khóa học, đăng ký online và làm bài kiểm tra xác định trình độ.' },
  { icon: Users, title: 'Xếp lớp phù hợp', desc: 'Trung tâm xếp bạn vào lớp đúng trình độ hoặc lộ trình 1 kèm 1.' },
  { icon: CalendarCheck, title: 'Học theo lịch', desc: 'Tham gia lớp học, điểm danh và theo dõi tiến độ ngay trên hệ thống.' },
  { icon: Trophy, title: 'Đạt chứng chỉ', desc: 'Hoàn thành khóa học, thi và nhận chứng chỉ HSK như mục tiêu.' },
];

const TESTIMONIALS = [
  { name: 'Nguyễn Minh Anh', role: 'Đạt HSK 5', content: 'Lộ trình rõ ràng, giáo viên nhiệt tình. Sau 6 tháng mình đã tự tin giao tiếp và đỗ HSK 5.' },
  { name: 'Trần Quốc Bảo', role: 'Học viên giao tiếp', content: 'Mình học để đi làm cho công ty Trung Quốc. Phần luyện nói rất thực tế, áp dụng được ngay.' },
  { name: 'Lê Thu Hà', role: 'Phụ huynh học viên', content: 'Con mình tiến bộ rõ rệt, hệ thống điểm danh giúp phụ huynh theo dõi buổi học rất tiện.' },
];

const FAQS = [
  { q: 'Tôi chưa biết gì về tiếng Trung có học được không?', a: 'Hoàn toàn được. Trung tâm có lộ trình từ con số 0, bắt đầu từ phát âm pinyin và 214 bộ thủ cơ bản.' },
  { q: 'Học phí có thể đóng theo buổi không?', a: 'Có. Bạn có thể chọn gói trọn khóa để được ưu đãi, hoặc đăng ký theo buổi lẻ linh hoạt theo nhu cầu.' },
  { q: 'Lớp học có tối đa bao nhiêu học viên?', a: 'Lớp nhóm giới hạn sĩ số để đảm bảo chất lượng, ngoài ra có lộ trình 1 kèm 1 cho người cần tiến độ nhanh.' },
  { q: 'Trung tâm có cam kết đầu ra không?', a: 'Có cam kết đầu ra theo từng khóa. Nếu chưa đạt mục tiêu, học viên được học lại miễn phí.' },
];

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<TeacherCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    async function fetchData() {
      const { data: crs } = await supabase
        .from('courses')
        .select(`*, course_variants(*)`)
        .eq('is_active', true)
        .order('category', { ascending: false });

      const { data: tch } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'TEACHER')
        .eq('status', 'ACTIVE');

      // Lấy toàn bộ đánh giá để tính điểm trung bình mỗi giáo viên
      const { data: revs } = await supabase
        .from('teacher_reviews')
        .select('teacher_id, rating');

      const statById: Record<string, { sum: number; count: number }> = {};
      (revs || []).forEach((r) => {
        if (!statById[r.teacher_id]) statById[r.teacher_id] = { sum: 0, count: 0 };
        statById[r.teacher_id].sum += r.rating;
        statById[r.teacher_id].count += 1;
      });

      const ranked: TeacherCard[] = (tch || [])
        .map((t) => {
          const s = statById[t.id];
          return {
            ...(t as Profile),
            avgRating: s ? s.sum / s.count : 0,
            reviewCount: s ? s.count : 0,
          };
        })
        // Sắp theo điểm trung bình giảm dần, ưu tiên người có nhiều lượt đánh giá hơn khi bằng điểm
        .sort((a, b) => b.avgRating - a.avgRating || b.reviewCount - a.reviewCount)
        // Chỉ hiển thị tối đa 10 giảng viên được đánh giá cao nhất
        .slice(0, 10);

      setCourses(crs || []);
      setTeachers(ranked);
      setLoading(false);
    }
    fetchData();
  }, []);

  const filteredCourses = courses.filter(course =>
    course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (course.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full bg-background">
      {/* Banner thông báo đăng ký (ảo - tạo cảm giác sôi động) */}
      <LiveSignupBanner />

      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden bg-slate-950 py-24 px-4 text-center">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="/img/hero_bg.jpg"
            alt="TAM Center Background"
            className="w-full h-full object-cover opacity-25 pointer-events-none select-none"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-red-600/20 via-transparent to-transparent z-0"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-red-600/10 rounded-full blur-3xl z-0"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl z-0"></div>
        <div className="absolute top-10 left-10 text-[120px] text-white/5 font-black select-none z-0">中文</div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <span className="inline-block py-1 px-4 rounded-full bg-red-500/20 text-red-400 text-sm font-bold tracking-widest mb-6 border border-red-500/30">TRUNG TÂM TIẾNG TRUNG SỐ 1</span>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight">
            Chinh Phục Tiếng Trung <br /><span className="text-red-500">Cùng TAM Center</span>
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-10">
            Hệ thống đào tạo thực chiến, đội ngũ giảng viên tận tâm. Cam kết đầu ra chứng chỉ HSK và giao tiếp lưu loát như người bản xứ.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="#courses" className="group bg-red-600 text-white px-8 py-4 rounded-full font-bold hover:bg-red-700 shadow-lg shadow-red-600/30 transition-all hover:scale-105 inline-flex items-center justify-center gap-2">
              Khám phá lộ trình ngay
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="#process" className="bg-white/10 text-white px-8 py-4 rounded-full font-bold hover:bg-white/20 border border-white/20 transition-all inline-flex items-center justify-center gap-2">
              Quy trình học
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto mt-16">
            {[
              { icon: Users, value: '2.000+', label: 'Học viên' },
              { icon: Award, value: '98%', label: 'Đỗ HSK' },
              { icon: Clock, value: '5 năm', label: 'Kinh nghiệm' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <s.icon className="mx-auto text-red-500 mb-2" size={28} />
                <div className="text-2xl md:text-3xl font-black text-white">{s.value}</div>
                <div className="text-sm text-slate-400">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ LĨNH VỰC ĐÀO TẠO (dải hình ảnh) ============ */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-red-600 dark:text-red-400 font-bold tracking-widest text-sm uppercase">Lĩnh vực đào tạo</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3">Đa Dạng Lộ Trình Tiếng Trung</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-4">Từ luyện thi chứng chỉ HSK đến giao tiếp thực chiến, mọi mục tiêu đều có lộ trình phù hợp.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: 'HSK 4', category: 'HSK', title: 'Luyện Thi HSK', desc: 'Lộ trình bài bản từ HSK 1 đến HSK 6, cam kết đạt chứng chỉ.' },
            { name: 'Giao Tiếp', category: 'GIAO_TIEP', title: 'Tiếng Trung Giao Tiếp', desc: 'Phản xạ nói tự nhiên, ứng dụng ngay trong công việc và đời sống.' },
            { name: 'Tiếng Trung', category: 'OTHER', title: 'Tiếng Trung Chuyên Ngành', desc: 'Thương mại, du lịch, biên phiên dịch theo nhu cầu riêng.' },
          ].map((item, i) => (
            <div key={i} className="group rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-surface hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="transition-transform duration-500 group-hover:scale-105">
                <CourseCover name={item.name} category={item.category} className="h-44" />
              </div>
              <div className="p-6">
                <h3 className="text-lg font-bold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ VÌ SAO CHỌN TAM ============ */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-red-600 dark:text-red-400 font-bold tracking-widest text-sm uppercase">Vì sao chọn chúng tôi</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3">Lý Do TAM Center Được Tin Tưởng</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-4">Chúng tôi không chỉ dạy ngôn ngữ, mà đồng hành cùng bạn đến khi đạt mục tiêu.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((f, i) => (
            <div key={i} className="bg-surface p-6 rounded-3xl border border-slate-100 dark:border-slate-800 hover:shadow-lg hover:-translate-y-1 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center mb-5">
                <f.icon size={26} />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ QUY TRÌNH HỌC ============ */}
      <section id="process" className="py-20 bg-surface border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-red-600 dark:text-red-400 font-bold tracking-widest text-sm uppercase">Lộ trình 4 bước</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3">Hành Trình Học Tập Tại TAM</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {STEPS.map((s, i) => (
              <div key={i} className="relative bg-background p-6 rounded-3xl border border-slate-100 dark:border-slate-800 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white flex items-center justify-center mb-5 shadow-lg shadow-red-600/20">
                  <s.icon size={28} />
                </div>
                <span className="absolute top-4 right-5 text-4xl font-black text-slate-100 dark:text-slate-800">{i + 1}</span>
                <h3 className="text-lg font-bold text-foreground mb-2">{s.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ DANH SÁCH KHÓA HỌC ============ */}
      <section id="courses" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
          <div>
            <span className="text-red-600 dark:text-red-400 font-bold tracking-widest text-sm uppercase">Khóa học</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2">Các Khóa Học Nổi Bật</h2>
          </div>
          <div className="relative w-full md:w-96">
            <input
              type="text" placeholder="Tìm kiếm khóa học (VD: HSK 4)..."
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-full border border-slate-200 dark:border-slate-700 bg-surface text-foreground focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-500/30 outline-none shadow-sm"
            />
            <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-surface rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-pulse">
                <div className="h-48 bg-slate-200 dark:bg-slate-800"></div>
                <div className="p-6 space-y-4">
                  <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded"></div>
                  <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-20 bg-surface rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-foreground mb-2">Không tìm thấy khóa học</h3>
            <p className="text-slate-500 dark:text-slate-400">Vui lòng thử tìm với từ khóa khác.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCourses.map((course) => {
              const minPrice = course.course_variants?.reduce((min: number, v) => v.full_package_price < min ? v.full_package_price : min, Infinity);

              return (
                <div key={course.id} className="bg-surface rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1 flex flex-col group">
                  <div className="relative overflow-hidden">
                    <span className={`absolute top-4 right-4 text-xs font-black px-3 py-1 rounded-full z-20 ${course.category === 'HSK' ? 'bg-white/90 text-red-600' : 'bg-white/90 text-blue-600'}`}>
                      {course.category === 'HSK' ? 'Luyện Thi HSK' : course.category === 'GIAO_TIEP' ? 'Giao Tiếp' : 'Tiếng Trung'}
                    </span>
                    <div className="transition-transform duration-500 group-hover:scale-110">
                      <CourseCover name={course.name} category={course.category} />
                    </div>
                  </div>
                  <div className="p-6 flex flex-col flex-grow">
                    <h3 className="text-xl font-bold text-foreground mb-2 line-clamp-2">{course.name}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 flex-grow line-clamp-3">{course.description}</p>

                    <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-auto">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Chi phí từ:</span>
                        <span className="text-red-600 dark:text-red-400 font-black text-xl">{minPrice !== Infinity ? formatVND(minPrice) : '0 đ'}</span>
                      </div>
                      <Link href={`/course/${course.id}`} className="block w-full text-center bg-slate-100 dark:bg-slate-800 text-foreground py-3 rounded-xl font-bold hover:bg-red-600 hover:text-white dark:hover:bg-red-600 transition-colors">
                        Xem chi tiết
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ============ ĐỘI NGŨ GIÁO VIÊN ============ */}
      <section id="teachers" className="py-20 bg-surface border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-red-600 dark:text-red-400 font-bold tracking-widest text-sm uppercase">Giảng viên</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3 mb-4">Đội Ngũ Chuyên Gia Hàng Đầu</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-12 max-w-2xl mx-auto">100% Giảng viên tại TAM Center có chứng chỉ HSK 6, nghiệp vụ sư phạm xuất sắc và kinh nghiệm du học/làm việc tại Trung Quốc.</p>

          {teachers.length === 0 ? (
            <p className="text-slate-400 dark:text-slate-500">Thông tin giảng viên sẽ được cập nhật sớm.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {teachers.map((tc) => {
                const hasReviews = tc.reviewCount > 0;
                const rounded = Math.round(tc.avgRating);
                return (
                  <div key={tc.id} className="bg-background rounded-3xl p-6 border border-slate-100 dark:border-slate-800 hover:shadow-lg hover:-translate-y-1 transition-all text-center group">
                    <div className="w-24 h-24 bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400 rounded-full mx-auto flex items-center justify-center text-3xl font-black mb-4 group-hover:scale-110 transition-transform">
                      {tc.full_name?.charAt(0) || '?'}
                    </div>
                    <h3 className="text-lg font-bold text-foreground">{tc.full_name}</h3>
                    <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-3">{tc.specialization || 'Giảng viên Tiếng Trung'}</p>
                    {hasReviews ? (
                      <>
                        <div className="flex justify-center gap-1 text-yellow-400">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={16} fill={i < rounded ? 'currentColor' : 'none'} className={i < rounded ? '' : 'text-slate-300 dark:text-slate-600'} />
                          ))}
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                          {tc.avgRating.toFixed(1)}/5 · {tc.reviewCount} đánh giá
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Chưa có đánh giá</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ============ CẢM NHẬN HỌC VIÊN ============ */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-red-600 dark:text-red-400 font-bold tracking-widest text-sm uppercase">Cảm nhận</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3">Học Viên Nói Gì Về TAM Center</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="bg-surface p-7 rounded-3xl border border-slate-100 dark:border-slate-800 relative">
              <Quote className="text-red-200 dark:text-red-500/30 mb-3" size={36} />
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6">{t.content}</p>
              <div className="flex items-center gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                <div className="w-11 h-11 rounded-full bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center font-black">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-foreground">{t.name}</div>
                  <div className="text-xs text-red-600 dark:text-red-400 font-medium">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="py-20 bg-surface border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-red-600 dark:text-red-400 font-bold tracking-widest text-sm uppercase">Hỏi đáp</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3">Câu Hỏi Thường Gặp</h2>
          </div>
          <div className="space-y-4">
            {FAQS.map((f, i) => (
              <div key={i} className="bg-background rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 p-5 text-left"
                >
                  <span className="font-bold text-foreground">{f.q}</span>
                  <ChevronDown size={20} className={`text-red-500 shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-slate-500 dark:text-slate-400 leading-relaxed animate-in">{f.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto bg-gradient-to-br from-red-600 to-red-700 rounded-[2.5rem] p-10 md:p-16 text-center relative overflow-hidden shadow-2xl shadow-red-600/20">
          <Sparkles className="absolute top-8 left-8 text-white/20" size={48} />
          <BookOpen className="absolute bottom-8 right-8 text-white/20" size={64} />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Sẵn Sàng Bắt Đầu Hành Trình?</h2>
            <p className="text-red-100 text-lg max-w-xl mx-auto mb-8">Đăng ký ngay hôm nay để nhận tư vấn lộ trình miễn phí và ưu đãi học phí hấp dẫn.</p>
            <Link href="#courses" className="inline-flex items-center gap-2 bg-white text-red-600 px-8 py-4 rounded-full font-bold hover:bg-red-50 transition-all hover:scale-105 shadow-lg">
              Đăng ký học ngay <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* ============ LIÊN HỆ ============ */}
      <section className="pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Phone, title: 'Hotline', value: '1900 6868' },
            { icon: Mail, title: 'Email', value: 'tuyensinh@tamcenter.vn' },
            { icon: MapPin, title: 'Địa chỉ', value: 'Thái Bình, Việt Nam' },
          ].map((c, i) => (
            <div key={i} className="bg-surface p-6 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <c.icon size={22} />
              </div>
              <div>
                <div className="text-sm text-slate-400 dark:text-slate-500">{c.title}</div>
                <div className="font-bold text-foreground">{c.value}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
