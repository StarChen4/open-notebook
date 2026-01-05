import createMiddleware from 'next-intl/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Redirect root to notebooks (needs to handle both / and /[locale]/)
  if (pathname === '/' || pathname.match(/^\/(en|zh-CN)$/)) {
    const locale = pathname.match(/^\/(en|zh-CN)$/)?.[1] || routing.defaultLocale
    // For default locale with 'as-needed' prefix, redirect without locale prefix
    const targetPath = locale === routing.defaultLocale ? '/notebooks' : `/${locale}/notebooks`
    return NextResponse.redirect(new URL(targetPath, request.url))
  }

  // Apply next-intl middleware
  return intlMiddleware(request)
}

export const config = {
  matcher: [
    '/((?!api|_next|_vercel|.*\\..*).*)'
  ],
}