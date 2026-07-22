import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  const isLMSRoute = pathname.startsWith('/lms')
  const isChangePassword = pathname.startsWith('/portal/change-password')
  const isStudentPortal = pathname.startsWith('/portal/student')
  const isParentPortal = pathname.startsWith('/portal/parent')
  const isPortalRoute = isStudentPortal || isParentPortal || isChangePassword

  if (!isLMSRoute && !isPortalRoute) {
    return NextResponse.next()
  }

  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const role = token.role as string
  const mustChangePassword = Boolean(token.mustChangePassword)

  if (isChangePassword) {
    if (role !== 'STUDENT' && role !== 'PARENT') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  if (isLMSRoute) {
    if (role === 'STUDENT' || role === 'PARENT') {
      const portalUrl = role === 'STUDENT' ? '/portal/student' : '/portal/parent'
      return NextResponse.redirect(new URL(portalUrl, request.url))
    }

    if (!['ADMIN', 'TEACHER', 'RECEPTIONIST'].includes(role)) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  if (isStudentPortal && role !== 'STUDENT') {
    if (role === 'PARENT') {
      return NextResponse.redirect(new URL('/portal/parent', request.url))
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (isParentPortal && role !== 'PARENT') {
    if (role === 'STUDENT') {
      return NextResponse.redirect(new URL('/portal/student', request.url))
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Force password change on first portal login
  if ((isStudentPortal || isParentPortal) && mustChangePassword) {
    return NextResponse.redirect(new URL('/portal/change-password', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/lms/:path*',
    '/portal/student/:path*',
    '/portal/parent/:path*',
    '/portal/change-password',
  ],
}
