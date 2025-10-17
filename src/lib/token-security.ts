// src/lib/token-security.ts
import crypto from 'crypto'
import { createSupabaseServiceClient } from './supabase-server'

// Token security configuration
export const TOKEN_CONFIG = {
  // Token length in bytes (64 hex characters)
  TOKEN_LENGTH: 32,
  // Default expiration time (1 year)
  DEFAULT_EXPIRATION_DAYS: 365,
  // Maximum access count before requiring regeneration
  MAX_ACCESS_COUNT: 10000,
  // Token rotation threshold (days before expiration)
  ROTATION_THRESHOLD_DAYS: 30,
  // Rate limiting windows
  RATE_LIMITS: {
    TOKEN_VALIDATION: { windowMs: 60 * 1000, max: 100 }, // 100 per minute
    TOKEN_GENERATION: { windowMs: 15 * 60 * 1000, max: 5 }, // 5 per 15 minutes
    BOOKING_ACTIONS: { windowMs: 15 * 60 * 1000, max: 10 }, // 10 per 15 minutes
  }
}

// Cryptographically secure token generation
export function generateSecureToken(): string {
  return crypto.randomBytes(TOKEN_CONFIG.TOKEN_LENGTH).toString('hex')
}

// Timing-safe token comparison to prevent timing attacks
export function validateTokenSecure(providedToken: string, storedToken: string): boolean {
  try {
    // Ensure both tokens are the same length to prevent timing attacks
    if (providedToken.length !== storedToken.length) {
      return false
    }
    
    // Convert to buffers for timing-safe comparison
    const providedBuffer = Buffer.from(providedToken, 'hex')
    const storedBuffer = Buffer.from(storedToken, 'hex')
    
    // Use crypto.timingSafeEqual for constant-time comparison
    return crypto.timingSafeEqual(providedBuffer, storedBuffer)
  } catch (error) {
    console.error('Token validation error:', error)
    return false
  }
}

// Enhanced token validation with security checks
export interface TokenValidationResult {
  isValid: boolean
  studentId?: string
  teacherId?: string
  studentName?: string
  teacherName?: string
  accessCount?: number
  lastAccessed?: string
  expiresAt?: string
  needsRotation?: boolean
  error?: string
  code?: string
}

export async function validateShareTokenSecure(token: string): Promise<TokenValidationResult> {
  try {
    const supabase = createSupabaseServiceClient()
    
    // Input validation
    if (!token || typeof token !== 'string' || token.length !== 64) {
      return {
        isValid: false,
        error: 'Invalid token format',
        code: 'INVALID_FORMAT'
      }
    }
    
    // Check if token exists and is active
    const { data: tokenData, error: tokenError } = await supabase
      .from('share_tokens')
      .select(`
        student_id,
        teacher_id,
        token,
        is_active,
        access_count,
        last_accessed,
        expires_at,
        created_at,
        student:profiles!student_id(full_name),
        teacher:profiles!teacher_id(full_name)
      `)
      .eq('token', token)
      .eq('is_active', true)
      .single()
    
    if (tokenError || !tokenData) {
      return {
        isValid: false,
        error: 'Token not found or inactive',
        code: 'TOKEN_NOT_FOUND'
      }
    }
    
    // Timing-safe token comparison
    if (!validateTokenSecure(token, tokenData.token)) {
      return {
        isValid: false,
        error: 'Token validation failed',
        code: 'TOKEN_MISMATCH'
      }
    }
    
    // Check expiration
    const expiresAt = new Date(tokenData.expires_at)
    const now = new Date()
    
    if (expiresAt <= now) {
      return {
        isValid: false,
        error: 'Token has expired',
        code: 'TOKEN_EXPIRED'
      }
    }
    
    // Check if token needs rotation (approaching expiration)
    const rotationThreshold = new Date(now.getTime() + (TOKEN_CONFIG.ROTATION_THRESHOLD_DAYS * 24 * 60 * 60 * 1000))
    const needsRotation = expiresAt <= rotationThreshold
    
    // Check access count limits
    if (tokenData.access_count >= TOKEN_CONFIG.MAX_ACCESS_COUNT) {
      return {
        isValid: false,
        error: 'Token access limit exceeded',
        code: 'ACCESS_LIMIT_EXCEEDED',
        needsRotation: true
      }
    }
    
    return {
      isValid: true,
      studentId: tokenData.student_id,
      teacherId: tokenData.teacher_id,
      studentName: tokenData.student?.full_name,
      teacherName: tokenData.teacher?.full_name,
      accessCount: tokenData.access_count,
      lastAccessed: tokenData.last_accessed,
      expiresAt: tokenData.expires_at,
      needsRotation
    }
  } catch (error) {
    console.error('Token validation error:', error)
    return {
      isValid: false,
      error: 'Token validation failed',
      code: 'VALIDATION_ERROR'
    }
  }
}

// Update token access with audit logging
export async function updateTokenAccess(token: string, clientInfo?: {
  userAgent?: string
  ipAddress?: string
  referer?: string
}): Promise<void> {
  try {
    const supabase = createSupabaseServiceClient()
    
    // Update access count and timestamp
    const { error: updateError } = await supabase
      .from('share_tokens')
      .update({
        access_count: supabase.raw('access_count + 1'),
        last_accessed: new Date().toISOString()
      })
      .eq('token', token)
      .eq('is_active', true)
    
    if (updateError) {
      console.error('Failed to update token access:', updateError)
    }
    
    // Log access for audit trail
    await logTokenAccess(token, 'access', clientInfo)
  } catch (error) {
    console.error('Error updating token access:', error)
  }
}

// Audit logging for token activities
export async function logTokenAccess(
  token: string, 
  action: 'access' | 'generation' | 'regeneration' | 'deactivation',
  clientInfo?: {
    userAgent?: string
    ipAddress?: string
    referer?: string
  }
): Promise<void> {
  try {
    const supabase = createSupabaseServiceClient()
    
    // Get token info for logging
    const { data: tokenData } = await supabase
      .from('share_tokens')
      .select('student_id, teacher_id')
      .eq('token', token)
      .single()
    
    if (!tokenData) return
    
    // Insert audit log entry
    await supabase
      .from('token_audit_logs')
      .insert({
        token_hash: crypto.createHash('sha256').update(token).digest('hex'), // Store hash, not actual token
        student_id: tokenData.student_id,
        teacher_id: tokenData.teacher_id,
        action,
        client_info: clientInfo,
        timestamp: new Date().toISOString()
      })
  } catch (error) {
    console.error('Failed to log token access:', error)
    // Don't throw - logging failures shouldn't break the main flow
  }
}

// Token rotation for security
export async function rotateShareToken(
  studentId: string, 
  teacherId: string,
  reason: 'expiring' | 'compromised' | 'manual' = 'manual'
): Promise<{ success: boolean; newToken?: string; error?: string }> {
  try {
    const supabase = createSupabaseServiceClient()
    
    // Deactivate existing tokens
    const { error: deactivateError } = await supabase
      .from('share_tokens')
      .update({ is_active: false })
      .eq('student_id', studentId)
      .eq('teacher_id', teacherId)
      .eq('is_active', true)
    
    if (deactivateError) {
      return { success: false, error: 'Failed to deactivate existing tokens' }
    }
    
    // Generate new secure token
    const newToken = generateSecureToken()
    const expiresAt = new Date(Date.now() + (TOKEN_CONFIG.DEFAULT_EXPIRATION_DAYS * 24 * 60 * 60 * 1000))
    
    // Create new token
    const { data: tokenData, error: createError } = await supabase
      .from('share_tokens')
      .insert({
        student_id: studentId,
        teacher_id: teacherId,
        token: newToken,
        is_active: true,
        expires_at: expiresAt.toISOString(),
        access_count: 0
      })
      .select()
      .single()
    
    if (createError) {
      return { success: false, error: 'Failed to create new token' }
    }
    
    // Log the rotation
    await logTokenAccess(newToken, 'regeneration', { reason })
    
    return { success: true, newToken }
  } catch (error) {
    console.error('Token rotation error:', error)
    return { success: false, error: 'Token rotation failed' }
  }
}

// CSRF token generation and validation
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

export function validateCSRFToken(token: string, sessionToken: string): boolean {
  try {
    // Simple CSRF validation - in production, you might want more sophisticated validation
    return token && sessionToken && token.length === 43 // base64url encoded 32 bytes
  } catch {
    return false
  }
}

// Rate limiting helper
export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
}

// In-memory rate limiting (for production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  key: string, 
  windowMs: number, 
  maxRequests: number
): RateLimitResult {
  const now = Date.now()
  const windowStart = now - windowMs
  
  // Clean up expired entries
  for (const [k, v] of rateLimitStore.entries()) {
    if (v.resetTime < now) {
      rateLimitStore.delete(k)
    }
  }
  
  const current = rateLimitStore.get(key)
  
  if (!current || current.resetTime < now) {
    // New window
    const resetTime = now + windowMs
    rateLimitStore.set(key, { count: 1, resetTime })
    return { allowed: true, remaining: maxRequests - 1, resetTime }
  }
  
  if (current.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: current.resetTime }
  }
  
  current.count++
  return { allowed: true, remaining: maxRequests - current.count, resetTime: current.resetTime }
}