// src/app/api/extension/issue-temp-token/route.ts
// Issue short-lived JWT tokens for Chrome extension authentication

import { NextRequest, NextResponse } from 'next/server'
import { getAuthCookieFromRequest } from '@/lib/cookies'
import { verifyJWT, signJWT } from '@/lib/jwt'

// CORS helper for extension access
function getCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin')

  if (origin && origin.startsWith('chrome-extension://')) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    }
  }

  if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    }
  }

  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(request),
  })
}

export async function POST(request: NextRequest) {
  try {
    console.log('🎫 Extension requesting temp token from:', request.headers.get('origin'))

    // Check if user is authenticated via existing session
    const authCookie = getAuthCookieFromRequest(request)
    
    if (!authCookie) {
      console.log('❌ No auth cookie found for temp token request')
      const response = NextResponse.json({ 
        success: false,
        error: 'Not authenticated - please log in first' 
      }, { status: 401 })
      
      const corsHeaders = getCorsHeaders(request)
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      
      return response
    }

    // Verify the existing JWT to get user info
    const decoded = verifyJWT(authCookie)
    
    if (!decoded) {
      console.log('❌ Invalid auth cookie for temp token request')
      const response = NextResponse.json({ 
        success: false,
        error: 'Invalid authentication - please log in again' 
      }, { status: 401 })
      
      const corsHeaders = getCorsHeaders(request)
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      
      return response
    }

    console.log('✅ Valid session found for:', decoded.email)

    // Create a short-lived extension token (1 hour)
    const extensionToken = signJWT({
      userId: decoded.userId,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      type: 'extension'
    }, '1h') // 1 hour expiration

    console.log('🎫 Extension token issued for:', decoded.email)

    const response = NextResponse.json({
      success: true,
      token: extensionToken,
      user: {
        id: decoded.userId,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role
      }
    })

    // Add CORS headers
    const corsHeaders = getCorsHeaders(request)
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    return response

  } catch (error) {
    console.error('❌ Extension temp token error:', error)
    
    const response = NextResponse.json({ 
      success: false,
      error: 'Failed to issue extension token' 
    }, { status: 500 })

    // Add CORS headers
    const corsHeaders = getCorsHeaders(request)
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    return response
  }
}