// lib/jwt.ts
import jwt, { SignOptions } from 'jsonwebtoken'
import type { StringValue } from 'ms'

const JWT_SECRET: string = process.env.JWT_SECRET || 'your-super-secret-key-change-this'
const JWT_EXPIRES_IN = '7d' // 7 days to match your current token system

export interface JWTPayload {
  userId: string
  email: string
  role: 'teacher' | 'student' | 'parent'
  name: string
  type?: string // Optional type field for extension tokens
  iat?: number
  exp?: number
}

export function signJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>, expiresIn?: string): string {
  const options: SignOptions = {
    expiresIn: (expiresIn || JWT_EXPIRES_IN) as StringValue
  }
  
  return jwt.sign(payload as Record<string, unknown>, JWT_SECRET, options)
}

export function verifyJWT(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch (error) {
    console.error('JWT verification failed:', error)
    return null
  }
}