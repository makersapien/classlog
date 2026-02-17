// src/lib/rate-limiting.ts
import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from './supabase-server'

// Rate limiting configuration for different endpoints
export const RATE_LIMIT_CONFIG = {
  // Token validation endpoints
  'token-validation': { windowMs: 60 * 1000, max: 100 }, // 100 per minute
  'token-generation': { windowMs: 15 * 60 * 1000, max: 5 }, // 5 per 15 minutes
  
  // Booking endpoints
  'booking-create': { windowMs: 15 * 60 * 1000, max: 10 }, // 10 bookings per 15 minutes
  'booking-cancel': { windowMs: 15 * 60 * 1000, max: 20 }, // 20 cancellations per 15 minutes
  'calendar-view': { windowMs: 60 * 1000, max: 60 }, // 60 calendar views per minute
  
  // General API endpoints
  'api-general': { windowMs: 60 * 1000, max: 200 }, // 200 requests per minute
  
  // Share link access
  'share-link-access': { windowMs: 60 * 1000, max: 30 }, // 30 accesses per minute per token
}

// Extract client identifier from request
export function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP from headers (for production behind proxy)
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwardedFor?.split(',')[0] || realIp || 'unknown'
  
  // For authenticated requests, we could also use user ID
  // but for now, we'll use IP-based rate limiting
  return ip
}

// Get endpoint category for rate limiting
export function getEndpointCategory(pathname: string): string {
  if (pathname.includes('/api/booking/') && pathname.endsWith('/book')) {
    return 'booking-create'
  }
  if (pathname.includes('/api/booking/') && pathname.includes('/cancel/')) {
    return 'booking-cancel'
  }
  if (pathname.includes('/api/booking/') && pathname.endsWith('/calendar')) {
    return 'calendar-view'
  }
  if (pathname.includes('/api/teacher/') && pathname.includes('/share-link')) {
    return 'token-generation'
  }
  if (pathname.includes('/api/teacher/') && pathname.includes('/regenerate-token')) {
    return 'token-generation'
  }
  if (pathname.startsWith('/book/')) {
    return 'share-link-access'
  }
  
  return 'api-general'
}

// Rate limiting middleware
export async function applyRateLimit(
  request: NextRequest,
  category?: string
): Promise<{ allowed: boolean; response?: NextResponse }> {
  try {
    const identifier = getClientIdentifier(request)
    const endpoint = category || getEndpointCategory(request.nextUrl.pathname)
    const config = RATE_LIMIT_CONFIG[endpoint as keyof typeof RATE_LIMIT_CONFIG] || RATE_LIMIT_CONFIG['api-general']
    
    const supabase = await createServerSupabaseClient()
    
    // Check rate limit using database function
    const { data: rateLimitResult, error } = await supabase
      .rpc('check_rate_limit', {
        p_identifier: identifier,
        p_endpoint: endpoint,
        p_max_requests: config.max,
        p_window_minutes: Math.floor(config.windowMs / (60 * 1000))
      })
    
    if (error) {
      console.error('Rate limit check failed:', error)
      // Allow request if rate limiting fails (fail open)
      return { allowed: true }
    }
    
    if (!rateLimitResult.allowed) {
      const response = NextResponse.json(
        {
          error: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((rateLimitResult.reset_time * 1000 - Date.now()) / 1000)
        },
        { status: 429 }
      )
      
      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', config.max.toString())
      response.headers.set('X-RateLimit-Remaining', '0')
      response.headers.set('X-RateLimit-Reset', rateLimitResult.reset_time.toString())
      response.headers.set('Retry-After', Math.ceil((rateLimitResult.reset_time * 1000 - Date.now()) / 1000).toString())
      
      return { allowed: false, response }
    }
    
    return { allowed: true }
  } catch (error) {
    console.error('Rate limiting error:', error)
    // Allow request if rate limiting fails (fail open)
    return { allowed: true }
  }
}

// Rate limiting decorator for API routes
export function withRateLimit(
  handler: (request: NextRequest, context: unknown) => Promise<NextResponse>,
  category?: string
) {
  return async (request: NextRequest, context: unknown): Promise<NextResponse> => {
    const rateLimitResult = await applyRateLimit(request, category)
    
    if (!rateLimitResult.allowed && rateLimitResult.response) {
      return rateLimitResult.response
    }
    
    return handler(request, context)
  }
}

// CSRF protection middleware
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

export function validateCSRFToken(request: NextRequest): boolean {
  const csrfToken = request.headers.get('x-csrf-token')
  const csrfCookie = request.cookies.get('csrf-token')?.value
  
  if (!csrfToken || !csrfCookie) {
    return false
  }
  
  return csrfToken === csrfCookie
}

// CSRF protection decorator
export function withCSRFProtection(
  handler: (request: NextRequest, context: unknown) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: unknown): Promise<NextResponse> => {
    // Skip CSRF check for GET requests
    if (request.method === 'GET') {
      return handler(request, context)
    }
    
    if (!validateCSRFToken(request)) {
      return NextResponse.json(
        {
          error: 'CSRF token validation failed',
          code: 'CSRF_VALIDATION_FAILED'
        },
        { status: 403 }
      )
    }
    
    return handler(request, context)
  }
}

// Combined security middleware
export function withSecurity(
  handler: (request: NextRequest, context: unknown) => Promise<NextResponse>,
  options: {
    rateLimit?: string
    csrf?: boolean
  } = {}
) {
  return async (request: NextRequest, context: unknown): Promise<NextResponse> => {
    // Apply rate limiting
    if (options.rateLimit !== undefined) {
      const rateLimitResult = await applyRateLimit(request, options.rateLimit)
      if (!rateLimitResult.allowed && rateLimitResult.response) {
        return rateLimitResult.response
      }
    }
    
    // Apply CSRF protection
    if (options.csrf === true && request.method !== 'GET') {
      if (!validateCSRFToken(request)) {
        return NextResponse.json(
          {
            error: 'CSRF token validation failed',
            code: 'CSRF_VALIDATION_FAILED'
          },
          { status: 403 }
        )
      }
    }
    
    return handler(request, context)
  }
}
