'use client';

import { useState, useEffect } from 'react';
import { Flame, X, CheckCircle2 } from 'lucide-react';

// Dữ liệu "ảo" (bot) - không phải đăng ký thật, chỉ nhằm tạo cảm giác sôi động.
const NAMES = [
  'Nguyễn Văn A***', 'Trần Thị B***', 'Lê Minh C***', 'Phạm Thu D***',
  'Hoàng Văn E***', 'Đỗ Hồng P***', 'Vũ Thị G***', 'Ngô Văn H***',
  'Bùi Thị L***', 'Dương Đăng K***', 'Đặng Trà M***', 'Lý Hoài N***',
  'Mai Phương T***', 'Cao Quốc V***', 'Tạ Khánh L***', 'Hồ Bảo Ng***',
];

const COURSES = [
  'Luyện thi HSK 3 Cấp Tốc',
  'Luyện thi HSK 5 Chuyên Sâu',
  'Tiếng Trung Giao Tiếp Toàn Diện',
  'Tiếng Trung Thương Mại',
  'Lộ trình 1 Kèm 1 VIP',
  'Khóa Giao Tiếp Sơ Cấp',
];

const CITIES = [
  'Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Hải Phòng', 'Thái Bình',
  'Nam Định', 'Bắc Ninh', 'Hưng Yên', 'Cần Thơ', 'Huế',
];

interface SignupNotice {
  id: number;
  name: string;
  course: string;
  city: string;
  minutesAgo: number;
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeNotice(id: number): SignupNotice {
  return {
    id,
    name: randomItem(NAMES),
    course: randomItem(COURSES),
    city: randomItem(CITIES),
    minutesAgo: Math.floor(Math.random() * 30) + 1,
  };
}

export default function LiveSignupBanner() {
  const [notice, setNotice] = useState<SignupNotice | null>(null);
  const [visible, setVisible] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (closed) return;

    let counter = 0;
    let hideTimer: ReturnType<typeof setTimeout>;

    const showNext = () => {
      counter += 1;
      setNotice(makeNotice(counter));
      setVisible(true);
      // Hiện 4.5s rồi ẩn đi, chờ một nhịp lại hiện người mới
      hideTimer = setTimeout(() => setVisible(false), 4500);
    };

    // Hiện lần đầu sau 1.5s cho đỡ dồn dập lúc tải trang
    const firstTimer = setTimeout(showNext, 1500);
    const interval = setInterval(showNext, 6000);

    return () => {
      clearTimeout(firstTimer);
      clearTimeout(hideTimer);
      clearInterval(interval);
    };
  }, [closed]);

  if (closed || !notice) return null;

  return (
    <div
      className={`fixed bottom-6 left-6 z-[80] max-w-[20rem] transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'
      }`}
    >
      <div key={notice.id} className="relative bg-surface border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl shadow-black/10 p-3 pr-8 flex items-start gap-3 slide-in-left">
        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-500/15 text-green-600 dark:text-green-400 flex items-center justify-center shrink-0">
          <CheckCircle2 size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-foreground leading-snug">
            <span className="font-bold">{notice.name}</span> ở {notice.city} vừa đăng ký{' '}
            <span className="font-bold text-red-600 dark:text-red-400">{notice.course}</span>
          </p>
          <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 mt-1">
            <Flame size={12} className="text-amber-500" /> {notice.minutesAgo} phút trước
          </div>
        </div>
        <button
          onClick={() => setClosed(true)}
          aria-label="Đóng thông báo"
          className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
