'use client';

import { courseVisual } from '@/lib/courseVisual';

interface CourseCoverProps {
  name?: string;
  category?: string;
  /** chiều cao ảnh bìa, mặc định h-48 */
  className?: string;
  /** kích thước chữ Hán */
  hanziSize?: string;
  /** ẩn nhãn cấp độ (dùng cho thumbnail nhỏ) */
  compact?: boolean;
}

/**
 * Ảnh bìa khóa học sinh tự động (gradient + chữ Hán + cấp độ).
 * Đồng bộ cùng loại, không cần upload ảnh.
 */
export default function CourseCover({
  name = '',
  category = 'OTHER',
  className = 'h-48',
  hanziSize = 'text-[120px]',
  compact = false,
}: CourseCoverProps) {
  const v = courseVisual(name, category);

  return (
    <div
      className={`relative w-full overflow-hidden flex items-center justify-center ${className}`}
      style={{ background: `linear-gradient(135deg, ${v.from}, ${v.to})` }}
    >
      {/* hoa văn nền */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full border-[3px] border-white/40" />
        <div className="absolute -bottom-12 -left-10 w-48 h-48 rounded-full border-[3px] border-white/30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full border border-white/20" />
      </div>

      {/* chữ Hán mờ phía sau */}
      <span className={`absolute right-2 -bottom-6 ${hanziSize} font-black text-white/15 leading-none select-none`}>
        {v.hanzi}
      </span>

      {/* khối logo trung tâm */}
      <div className="relative z-10 flex flex-col items-center text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center mb-2">
          <span className="text-3xl font-black text-white">{v.hanzi}</span>
        </div>
        {!compact && (
          <>
            <span className="text-[10px] font-bold tracking-[0.2em] text-white/70 uppercase">{v.tag}</span>
            <span className="text-2xl font-black text-white mt-0.5">{v.code}</span>
          </>
        )}
      </div>
    </div>
  );
}
