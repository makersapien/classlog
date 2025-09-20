// src/lib/cookies.ts - Cookie management for authentication
import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'classlogger_auth'
const EXTENSION_COOKIE_NAME = 'classlogger_extension'

const COOKIE_OPTIONS = {
  httpOnly: false,  // Extension accessible
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'none' as const, // Allow cross-origin access for extensions
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: '/',
}

export function setAuthCookie(response: NextResponse, token: string) {
  // Extract user data from JWT token
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    const payload = JSON.parse(jsonPayload);
    const { userId, name, email, role } = payload;
  // Set the main auth cookie (httpOnly: false for extension access)
  response.cookies.set('classlogger_auth', token, {
    httpOnly: false, // Allow JavaScript access for extensions
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'none', // Allow cross-origin access for extensions
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  })

  // Set extension-friendly cookie with user data
  response.cookies.set('classlogger_extension', JSON.stringify({
    teacher_id: userId,
    name: name,
    email: email,
    role: role
  }), {
    httpOnly: false, // Allow JavaScript access
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'none', // Allow cross-origin access for extensions
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  })

  // Set simple teacher ID cookie for quick access
  response.cookies.set('classlogger_teacher_id', userId, {
    httpOnly: false, // Allow JavaScript access
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'none', // Allow cross-origin access for extensions
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  })

    console.log('✅ Auth cookies set successfully')
    return response
  } catch (error) {
    console.error('❌ Error parsing JWT for cookie creation:', error)
    return response
  }
}

export function getAuthCookieFromRequest(request: NextRequest): string | null {
  try {
    const cookie = request.cookies.get(COOKIE_NAME)
    return cookie?.value || null
  } catch (error) {
    console.error('Error getting auth cookie from request:', error)
    return null
  }
}

// For server-side usage (Next.js 15 compatible)
export async function getAuthCookie(): Promise<string | null> {
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const cookie = cookieStore.get(COOKIE_NAME)
    return cookie?.value || null
  } catch (error) {
    console.error('Error getting auth cookie:', error)
    return null
  }
}

export function clearAuthCookie(response: NextResponse) {
  // Clear all auth-related cookies
  response.cookies.set(COOKIE_NAME, '', { ...COOKIE_OPTIONS, maxAge: 0 })
  response.cookies.set(EXTENSION_COOKIE_NAME, '', { ...COOKIE_OPTIONS, maxAge: 0 })
  response.cookies.set('classlogger_teacher_id', '', { ...COOKIE_OPTIONS, maxAge: 0 })
  
  console.log('🧹 All auth cookies cleared')
}

// Helper function to get teacher ID from request (for API routes)
export function getTeacherIdFromRequest(request: NextRequest): string | null {
  try {
    // Strategy 1: Try the simple teacher ID cookie first
    const teacherIdCookie = request.cookies.get('classlogger_teacher_id')
    if (teacherIdCookie?.value) {
      return teacherIdCookie.value
    }
    
    // Strategy 2: Try extension cookie
    const extensionCookie = request.cookies.get(EXTENSION_COOKIE_NAME)
    if (extensionCookie?.value) {
      try {
        const data = JSON.parse(extensionCookie.value)
        return data.teacher_id || data.teacherId
      } catch (e) {
        console.log('Extension cookie parse failed')
      }
    }
    
    // Strategy 3: Try main auth cookie
    const authCookie = request.cookies.get(COOKIE_NAME)
    if (authCookie?.value) {
      try {
        const parts = authCookie.value.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          return payload.userId || payload.teacher_id || payload.teacherId
        }
      } catch (e) {
        console.log('JWT decode failed')
      }
    }
    
    return null
  } catch (error) {
    console.error('Error getting teacher ID from request:', error)
    return null
  }
}

// Debug function to log all cookies (development only)
export function debugCookies(request: NextRequest) {
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 All cookies in request:')
    request.cookies.getAll().forEach((cookie) => {
      console.log(`  ${cookie.name}: ${cookie.value.substring(0, 20)}...`)
    })
  }
}