import { NextResponse } from 'next/server'
import { AUTH_COOKIE, AUTH_USER_COOKIE } from '@/lib/auth'
import type { NextRequest } from 'next/server'

const isPublicPath = (pathname: string) =>
  pathname === '/signin' ||
  pathname === '/' ||
  pathname.startsWith('/_next') ||
  pathname.startsWith('/api') ||
  pathname.startsWith('/apple-icon') ||
  pathname.startsWith('/icon') ||
  pathname.startsWith('/manifest') ||
  pathname.startsWith('/robots') ||
  pathname.startsWith('/sitemap')

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isProtectedPath = pathname.startsWith('/groups')

  if (!isProtectedPath || isPublicPath(pathname)) {
    return NextResponse.next()
  }

  const isAuthenticated = request.cookies.get(AUTH_COOKIE)?.value === '1'
  const hasUserIdentifier = Boolean(request.cookies.get(AUTH_USER_COOKIE)?.value)
  if (isAuthenticated && hasUserIdentifier) return NextResponse.next()

  const signInUrl = new URL('/signin', request.url)
  signInUrl.searchParams.set('next', pathname)
  return NextResponse.redirect(signInUrl)
}

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)'],
}
