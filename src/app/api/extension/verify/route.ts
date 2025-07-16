import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/jwt'
import { getAuthCookieFromRequest } from '@/lib/cookies'

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  })
}

// Handle GET requests (existing logic)
export async function GET(request: NextRequest) {
  const response = await handleAuth(request)
  
  // Add CORS headers to response
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  
  return response
}

// Handle POST requests (for AuthManager)
export async function POST(request: NextRequest) {
  const response = await handleAuth(request)
  
  // Add CORS headers to response
  response.headers.set('Access-Control-Allow-Origin', '*') 
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  
  return response
}

async function handleAuth(request: NextRequest) {
  try {
    // Get JWT from cookie
    const token = getAuthCookieFromRequest(request)
    
    if (!token) {
      return NextResponse.json({
        success: false,
        loggedIn: false,
        error: 'No authentication token found'
      })
    }

    // Verify JWT
    const payload = verifyJWT(token)
    if (!payload) {
      return NextResponse.json({
        success: false,
        loggedIn: false,
        error: 'Invalid or expired token'
      })
    }

    // Return user info for extension
    return NextResponse.json({
      success: true,
      loggedIn: true,
      teacherId: payload.userId,
      teacherName: payload.name,
      teacherEmail: payload.email,
      role: payload.role,
      loginMethod: 'JWT Cookie'
    })
  } catch (error) {
    console.error('Extension verification error:', error)
    return NextResponse.json({
      success: false,
      loggedIn: false,
      error: 'Verification failed'
    }, { status: 500 })
  }
}