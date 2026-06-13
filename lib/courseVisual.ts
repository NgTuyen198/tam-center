// ============================================================
// SINH "LOGO/ẢNH BÌA" KHÓA HỌC TỰ ĐỘNG & ĐỒNG BỘ
// Không cần ảnh thật: mỗi khóa học có 1 bộ màu gradient + 1 chữ Hán
// + mã cấp độ, sinh ổn định (deterministic) theo tên & danh mục.
// ============================================================

export interface CourseVisual {
  from: string      // màu gradient bắt đầu
  to: string        // màu gradient kết thúc
  hanzi: string     // chữ Hán làm "logo"
  code: string      // nhãn chính (VD: "HSK 4", "Giao Tiếp")
  tag: string       // nhãn phụ phía trên
}

// Bộ chữ Hán theo chủ đề từng danh mục (mang ý nghĩa liên quan việc học)
const HANZI: Record<string, string[]> = {
  HSK: ['汉', '考', '级', '试'],          // Hán / thi / cấp / test
  GIAO_TIEP: ['语', '话', '说', '听'],     // ngữ / thoại / nói / nghe
  OTHER: ['中', '学', '文', '书'],         // Trung / học / văn / thư
}

// Bộ gradient theo danh mục (mỗi danh mục vài tông để khóa học không bị trùng hệt nhau)
const THEMES: Record<string, [string, string][]> = {
  HSK: [
    ['#dc2626', '#7f1d1d'],   // đỏ
    ['#ea580c', '#7c2d12'],   // cam đất
    ['#e11d48', '#881337'],   // hồng đỏ
  ],
  GIAO_TIEP: [
    ['#2563eb', '#1e3a8a'],   // xanh dương
    ['#0d9488', '#134e4a'],   // teal
    ['#0891b2', '#164e63'],   // cyan
  ],
  OTHER: [
    ['#7c3aed', '#4c1d95'],   // tím
    ['#059669', '#064e3b'],   // xanh lá
    ['#0284c7', '#0c4a6e'],   // xanh biển
  ],
}

const TAGS: Record<string, string> = {
  HSK: 'LUYỆN THI HSK',
  GIAO_TIEP: 'KHÓA GIAO TIẾP',
  OTHER: 'TIẾNG TRUNG',
}

// Hash đơn giản, ổn định từ chuỗi -> số nguyên dương
function hashString(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

function themeKey(category: string): 'HSK' | 'GIAO_TIEP' | 'OTHER' {
  if (category === 'HSK') return 'HSK'
  if (category === 'GIAO_TIEP') return 'GIAO_TIEP'
  return 'OTHER'
}

function deriveCode(name: string, key: string): string {
  // Ưu tiên cấp độ HSK nếu tên có dạng "HSK 4", "HSK4"...
  const m = name.match(/HSK\s*0*([1-6])/i)
  if (m) return `HSK ${m[1]}`
  if (key === 'GIAO_TIEP') return 'Giao Tiếp'
  if (key === 'HSK') return 'HSK'
  return 'Tiếng Trung'
}

export function courseVisual(name: string = '', category: string = 'OTHER'): CourseVisual {
  const key = themeKey(category)
  const h = hashString(name || category || 'tam')

  const themes = THEMES[key]
  const [from, to] = themes[h % themes.length]
  const pool = HANZI[key]
  const hanzi = pool[h % pool.length]
  const code = deriveCode(name, key)
  const tag = TAGS[key]

  return { from, to, hanzi, code, tag }
}
