import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Các route yêu cầu đăng nhập (optimistic check ở tầng proxy)
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/teacher-dashboard',
  '/staff-dashboard',
  '/admin-dashboard',
  '/checkout',
]

/**
 * Làm mới phiên Supabase trên mỗi request và chặn (optimistic) người chưa
 * đăng nhập truy cập các route nội bộ. Việc phân quyền chi tiết theo role
 * vẫn được kiểm tra lại ở từng Server Action và phía client dashboard.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p))

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
