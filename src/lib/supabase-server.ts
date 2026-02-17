// src/lib/supabase-server.ts - Next.js 15 compatible Supabase client
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'

export interface AuthenticatedUser {
  id: string
  email?: string
  role?: string
  name?: string
}

/**
 * Creates a Supabase client for server-side operations with Next.js 15 compatibility
 * This replaces the problematic createRouteHandlerClient from @supabase/auth-helpers-nextjs
 */
export async function createServerSupabaseClient() {
  // Create Supabase client with service role for server-side operations
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        fetch: (...args) => {
          console.log('🌐 Supabase fetch called:', args[0])
          return fetch(...args).catch(err => {
            console.error('❌ Fetch error details:', {
              message: err.message,
              cause: err.cause,
              stack: err.stack
            })
            throw err
          })
        }
      }
    }
  )
  
  return supabase
}

/**
 * Gets the authenticated user from cookies (Next.js 15 compatible)
 * This replaces the problematic auth.getUser() from createRouteHandlerClient
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  try {
    // Get auth token from cookies manually
    const cookieStore = await cookies()
    const authCookie = cookieStore.get('classlogger_auth')
    
    if (!authCookie?.value) {
      console.error('❌ No auth cookie found')
      return null
    }
    
    // Verify the JWT token manually
    try {
      const base64Url = authCookie.value.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      const payload = JSON.parse(jsonPayload);
      
      // Check if token is expired
      if (payload.exp && payload.exp < Date.now() / 1000) {
        console.error('❌ Token expired')
        return null
      }
      
      return {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
        name: payload.name
      }
      
    } catch (jwtError) {
      console.error('❌ JWT decode error:', jwtError)
      return null
    }
    
  } catch (cookieError) {
    console.error('❌ Cookie handling error:', cookieError)
    return null
  }
}

/**
 * Combined function that creates a Supabase client and gets the authenticated user
 * This is the main function to use in API routes
 */
export async function createAuthenticatedSupabaseClient(): Promise<{
  supabase: ReturnType<typeof createClient<Database>>
  user: AuthenticatedUser | null
}> {
  const supabase = await createServerSupabaseClient()
  const user = await getAuthenticatedUser()
  
  return { supabase, user }
}