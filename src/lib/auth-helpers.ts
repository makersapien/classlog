import { verifyJWT } from './jwt'
import { getAuthCookie } from './cookies'

export interface AuthUser {
  userId: string
  email: string
  role: 'teacher' | 'student' | 'parent'
  name: string
}

// Updated server-side auth check to handle async cookies
export async function getServerAuthUser(): Promise<AuthUser | null> {
  try {
    const token = await getAuthCookie() // Now async
    if (!token) return null

    const payload = verifyJWT(token)
    if (!payload) return null

    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      name: payload.name
    }
  } catch (error) {
    console.error('Server auth check failed:', error)
    return null
  }
}

// Client-side auth check (unchanged)
export async function getClientAuthUser(): Promise<AuthUser | null> {
  try {
    const response = await fetch('/api/extension/verify', {
      credentials: 'include'
    })

    if (!response.ok) return null

    const data = await response.json()
    if (!data.success || !data.loggedIn) return null

    return {
      userId: data.teacherId,
      email: data.teacherEmail,
      role: data.role,
      name: data.teacherName
    }
  } catch (error) {
    console.error('Client auth check failed:', error)
    return null
  }
}
