// Debug endpoint to check authentication status and cookies
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/jwt'

export async function GET() {
  try {
    console.log('🔍 Debug: Checking authentication status...')
    
    // Get all cookies
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    
    console.log('📋 All cookies found:')
    allCookies.forEach(cookie => {
      console.log(`  ${cookie.name}: ${cookie.value.substring(0, 20)}...`)
    })
    
    // Check specific auth cookies
    const authCookie = cookieStore.get('classlogger_auth')
    const extensionCookie = cookieStore.get('classlogger_extension')
    const teacherIdCookie = cookieStore.get('classlogger_teacher_id')
    
    const debugInfo: Record<string, unknown> = {
      totalCookies: allCookies.length,
      cookies: allCookies.map(c => ({
        name: c.name,
        hasValue: !!c.value,
        valueLength: c.value.length,
        valuePreview: c.value.substring(0, 20) + '...'
      })),
      authCookies: {
        classlogger_auth: {
          exists: !!authCookie,
          value: authCookie?.value ? authCookie.value.substring(0, 20) + '...' : null
        },
        classlogger_extension: {
          exists: !!extensionCookie,
          value: extensionCookie?.value ? extensionCookie.value.substring(0, 20) + '...' : null
        },
        classlogger_teacher_id: {
          exists: !!teacherIdCookie,
          value: teacherIdCookie?.value || null
        }
      }
    }
    
    // Try to verify the auth cookie if it exists
    if (authCookie?.value) {
      try {
        const decoded = verifyJWT(authCookie.value)
        if (decoded) {
          debugInfo.jwtVerification = {
            success: true,
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role,
            name: decoded.name,
            exp: decoded.exp,
            isExpired: decoded.exp ? decoded.exp < Date.now() / 1000 : false
          }
        } else {
          debugInfo.jwtVerification = {
            success: false,
            error: 'JWT verification failed'
          }
        }
      } catch (jwtError) {
        debugInfo.jwtVerification = {
          success: false,
          error: jwtError instanceof Error ? jwtError.message : 'JWT decode error'
        }
      }
    } else {
      debugInfo.jwtVerification = {
        success: false,
        error: 'No auth cookie found'
      }
    }
    
    return NextResponse.json(debugInfo)
    
  } catch (error) {
    console.error('❌ Debug auth status error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      cookies: []
    }, { status: 500 })
  }
}