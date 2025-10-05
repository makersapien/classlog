// src/app/api/extension/auth-status/route.ts
// Fixed version with proper TypeScript CORS handling

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import { verifyJWT } from '@/lib/jwt'


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Fixed CORS helper with proper TypeScript types
function getCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin')

  if (origin && origin.startsWith('chrome-extension://')) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
      'Access-Control-Allow-Credentials': 'true',
    }
  }

  if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
      'Access-Control-Allow-Credentials': 'true',
    }
  }

  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
  }
}

// Define types matching your exact database schema
interface ProfileData {
  id: string
  full_name: string | null
  email: string
  role: 'teacher' | 'student' | 'parent'
}

interface TokenData {
  id: string
  teacher_id: string
  token_hash: string
  expires_at: string
  is_active: boolean | null
  usage_count: number | null
  last_used_at: string | null
  profiles: ProfileData | ProfileData[] | null
}

// Handle preflight OPTIONS requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(request),
  })
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 Extension auth status check from:', request.headers.get('origin'))

    // Debug cookies in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 All cookies in request:')
      request.cookies.getAll().forEach((cookie) => {
        console.log(`  ${cookie.name}: ${cookie.value.substring(0, 20)}...`)
      })
    }

    // Check for Bearer token first (new extension auth method)
    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      console.log('🎫 Bearer token found, verifying extension token...')
      return await handleBearerTokenAuth(request, authHeader.substring(7))
    }

    const body = await request.json()
    const { token } = body

    // Strategy 1: Try cookie-based authentication first (most reliable)
    if (!token || token === 'no_token') {
      console.log('📧 No token provided, trying cookie authentication...')

      const cookieAuth = await tryAuthenticationViaCookies(request)
      const response = NextResponse.json(cookieAuth)

      // Add CORS headers
      const corsHeaders = getCorsHeaders(request)
      Object.entries(corsHeaders).forEach(([key, value]) => {
        if (value !== undefined) {
          response.headers.set(key, value)
        }
      })

      return response
    }

    // Strategy 2: Token-based authentication (existing logic)
    console.log('🔑 Token provided, validating:', token.substring(0, 10) + '...')

    // Hash the token to compare with token_hash in database
    const tokenHash = createHash('sha256').update(token).digest('hex')

    // Query using token_hash and proper join syntax
    const { data: tokenData, error: tokenError } = await supabase
      .from('extension_tokens')
      .select(`
        id,
        teacher_id,
        token_hash,
        expires_at,
        is_active,
        usage_count,
        last_used_at,
        profiles!extension_tokens_teacher_id_fkey (
          id,
          full_name,
          email,
          role
        )
      `)
      .eq('token_hash', tokenHash)
      .eq('is_active', true)
      .single()

    if (tokenError || !tokenData) {
      console.log('❌ Extension: Invalid or expired token, error:', tokenError)

      // Fallback to cookie auth if token fails
      const cookieAuth = await tryAuthenticationViaCookies(request)
      if (cookieAuth.success) {
        console.log('✅ Token failed but cookie auth succeeded')
        const response = NextResponse.json(cookieAuth)

        const corsHeaders = getCorsHeaders(request)
        Object.entries(corsHeaders).forEach(([key, value]) => {
          if (value !== undefined) {
            response.headers.set(key, value)
          }
        })

        return response
      }

      const response = NextResponse.json({
        success: false,
        isLoggedIn: false,
        error: 'Invalid or expired token and no valid cookie authentication',
        tokenError: tokenError?.message,
        cookieError: cookieAuth.error
      })

      const corsHeaders = getCorsHeaders(request)
      Object.entries(corsHeaders).forEach(([key, value]) => {
        if (value !== undefined) {
          response.headers.set(key, value)
        }
      })

      return response
    }

    // Type-safe access to the data with proper error handling
    const typedTokenData = tokenData as unknown as TokenData

    // Check if token is expired
    if (new Date(typedTokenData.expires_at) < new Date()) {
      console.log('❌ Extension: Token expired')

      // Mark token as inactive when expired
      await supabase
        .from('extension_tokens')
        .update({ is_active: false })
        .eq('id', typedTokenData.id)

      // Try cookie auth as fallback
      const cookieAuth = await tryAuthenticationViaCookies(request)
      if (cookieAuth.success) {
        console.log('✅ Token expired but cookie auth succeeded')
        const response = NextResponse.json(cookieAuth)

        const corsHeaders = getCorsHeaders(request)
        Object.entries(corsHeaders).forEach(([key, value]) => {
          if (value !== undefined) {
            response.headers.set(key, value)
          }
        })

        return response
      }

      const response = NextResponse.json({
        success: false,
        isLoggedIn: false,
        error: 'Token expired and no valid cookie authentication'
      })

      const corsHeaders = getCorsHeaders(request)
      Object.entries(corsHeaders).forEach(([key, value]) => {
        if (value !== undefined) {
          response.headers.set(key, value)
        }
      })

      return response
    }

    // Handle Supabase join - profiles can be array or single object
    const profileData = Array.isArray(typedTokenData.profiles)
      ? typedTokenData.profiles[0]
      : typedTokenData.profiles

    // Verify the user exists and is a teacher
    if (!profileData || profileData.role !== 'teacher') {
      console.log('❌ Extension: User is not a teacher')
      const response = NextResponse.json({
        success: false,
        isLoggedIn: false,
        error: 'User is not a teacher'
      })

      const corsHeaders = getCorsHeaders(request)
      Object.entries(corsHeaders).forEach(([key, value]) => {
        if (value !== undefined) {
          response.headers.set(key, value)
        }
      })

      return response
    }

    // Update last_used_at and usage_count
    await supabase
      .from('extension_tokens')
      .update({
        last_used_at: new Date().toISOString(),
        usage_count: (typedTokenData.usage_count || 0) + 1
      })
      .eq('id', typedTokenData.id)

    console.log('✅ Extension: Valid teacher token for:', profileData.full_name)

    // Return the format expected by the extension
    const response = NextResponse.json({
      success: true,
      isLoggedIn: true,
      authMethod: 'token',
      teacher: {
        id: typedTokenData.teacher_id,
        teacherId: typedTokenData.teacher_id,
        teacher_id: typedTokenData.teacher_id,
        name: profileData.full_name,
        full_name: profileData.full_name,
        email: profileData.email,
        role: profileData.role
      }
    })

    // Add CORS headers
    const corsHeaders = getCorsHeaders(request)
    Object.entries(corsHeaders).forEach(([key, value]) => {
      if (value !== undefined) {
        response.headers.set(key, value)
      }
    })

    return response

  } catch (error) {
    console.error('❌ Extension: Auth status API Error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

    const response = NextResponse.json({
      success: false,
      isLoggedIn: false,
      error: 'Internal server error: ' + errorMessage
    }, { status: 500 })

    // Add CORS headers
    const corsHeaders = getCorsHeaders(request)
    Object.entries(corsHeaders).forEach(([key, value]) => {
      if (value !== undefined) {
        response.headers.set(key, value)
      }
    })

    return response
  }
}

// Cookie-based authentication function
async function tryAuthenticationViaCookies(request: NextRequest) {
  try {
    console.log('🍪 Trying cookie-based authentication...')

    // Strategy 1: Try JWT cookie first (most reliable for extensions)
    const authCookie = request.cookies.get('classlogger_auth')
    if (authCookie) {
      try {
        const payload = verifyJWT(authCookie.value)

        if (payload && payload.userId && payload.email) {
          console.log('✅ JWT cookie verified for:', payload.email)

          // Get profile data using service role client
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, email, role')
            .eq('id', payload.userId)
            .single()

          if (profile && profile.role === 'teacher') {
            return {
              success: true,
              isLoggedIn: true,
              authMethod: 'jwt_cookie',
              teacher: {
                id: payload.userId,
                teacherId: payload.userId,
                teacher_id: payload.userId,
                name: profile.full_name || payload.name,
                full_name: profile.full_name,
                email: payload.email,
                role: profile.role
              }
            }
          }
        }
      } catch (jwtError) {
        console.log('⚠️ JWT verification failed:', jwtError)
      }
    } else {
      console.log('❌ No auth cookie found')
    }

    // Strategy 2: Try extension cookie as fallback
    const extensionCookie = request.cookies.get('classlogger_extension')
    if (extensionCookie) {
      try {
        const extensionData = JSON.parse(extensionCookie.value)
        if (extensionData.teacher_id && extensionData.email) {
          console.log('✅ Extension cookie found for:', extensionData.email)
          return {
            success: true,
            isLoggedIn: true,
            authMethod: 'extension_cookie',
            teacher: {
              id: extensionData.teacher_id,
              teacherId: extensionData.teacher_id,
              teacher_id: extensionData.teacher_id,
              name: extensionData.name,
              email: extensionData.email,
              role: extensionData.role
            }
          }
        }
      } catch (parseError) {
        console.log('⚠️ Extension cookie parse failed:', parseError)
      }
    }

    return {
      success: false,
      isLoggedIn: false,
      authMethod: 'none',
      error: 'No valid authentication found'
    }

  } catch (error) {
    console.error('❌ Cookie authentication error:', error)
    return {
      success: false,
      error: `Cookie authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

// Handle Bearer token authentication (new extension method)
async function handleBearerTokenAuth(request: NextRequest, token: string) {
  try {
    // Verify the extension JWT token
    const decoded = verifyJWT(token)

    if (!decoded) {
      console.log('❌ Invalid Bearer token')
      const response = NextResponse.json({
        success: false,
        isLoggedIn: false,
        error: 'Invalid or expired extension token'
      }, { status: 401 })

      const corsHeaders = getCorsHeaders(request)
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
      })

      return response
    }

    // Verify it's an extension token
    if (decoded.type !== 'extension') {
      console.log('❌ Token is not an extension token')
      const response = NextResponse.json({
        success: false,
        isLoggedIn: false,
        error: 'Invalid token type'
      }, { status: 401 })

      const corsHeaders = getCorsHeaders(request)
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
      })

      return response
    }

    console.log('✅ Valid extension Bearer token for:', decoded.email)

    // Return successful authentication
    const response = NextResponse.json({
      success: true,
      isLoggedIn: true,
      authMethod: 'bearer_token',
      teacher: {
        id: decoded.userId,
        teacherId: decoded.userId,
        teacher_id: decoded.userId,
        name: decoded.name,
        full_name: decoded.name,
        email: decoded.email,
        role: decoded.role
      }
    })

    const corsHeaders = getCorsHeaders(request)
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    return response

  } catch (error) {
    console.error('❌ Bearer token verification error:', error)

    const response = NextResponse.json({
      success: false,
      isLoggedIn: false,
      error: 'Bearer token verification failed'
    }, { status: 401 })

    const corsHeaders = getCorsHeaders(request)
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    return response
  }
}

// GET method for direct authentication check (supports Bearer tokens)
export async function GET(request: NextRequest) {
  console.log('🔍 Extension GET auth check')

  // Check for Bearer token first
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    console.log('🎫 Bearer token found in GET request')
    return await handleBearerTokenAuth(request, authHeader.substring(7))
  }

  // Fallback to cookie-based auth
  console.log('🍪 No Bearer token, trying cookies')
  const cookieAuth = await tryAuthenticationViaCookies(request)
  const response = NextResponse.json(cookieAuth)

  // Add CORS headers
  const corsHeaders = getCorsHeaders(request)
  Object.entries(corsHeaders).forEach(([key, value]) => {
    if (value !== undefined) {
      response.headers.set(key, value)
    }
  })

  return response
}