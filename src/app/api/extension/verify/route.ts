// src/app/api/extension/verify/route.ts
// Fixed version with simple CORS handling

import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT } from '@/lib/jwt'
import { getAuthCookieFromRequest } from '@/lib/cookies'

// Simple CORS helper - return Record<string, string> for compatibility
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

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(request),
  })
}

// Handle GET requests (existing logic)
export async function GET(request: NextRequest) {
  const response = await handleAuth(request)

  // Add CORS headers with proper typing
  const corsHeaders = getCorsHeaders(request)
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  return response
}

// Handle POST requests (for AuthManager)
export async function POST(request: NextRequest) {
  const response = await handleAuth(request)

  // Add CORS headers with proper typing
  const corsHeaders = getCorsHeaders(request)
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

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