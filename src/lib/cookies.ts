// ==========================
// 1. FIXED lib/cookies.ts (for Next.js 13/14)
// ==========================

// src/lib/cookies.ts
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'classlogger_auth'
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: '/',
}

export function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS)
}

// Fixed for Next.js 13/14 - cookies() might return a Promise
export async function getAuthCookie(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const cookie = cookieStore.get(COOKIE_NAME)
    return cookie?.value || null
  } catch (error) {
    console.error('Error getting auth cookie:', error)
    return null
  }
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, '', { ...COOKIE_OPTIONS, maxAge: 0 })
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
