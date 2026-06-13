import type { NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Khớp mọi route trừ:
     * - api (API routes)
     * - _next/static, _next/image (file tĩnh)
     * - favicon.ico và các file ảnh/tài nguyên
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
