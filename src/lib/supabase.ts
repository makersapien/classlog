// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Types for our database
export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: 'teacher' | 'parent' | 'student'
  created_at: string
  updated_at: string
}

// Auth helper functions
export const signInWithGoogle = async (role: string) => {
  console.log('🔄 Starting Google sign-in for role:', role)
  
  // Get the current origin for redirect URL - prioritize client-side detection
  let redirectUrl: string
  
  if (typeof window !== 'undefined') {
    // Client-side: use the actual current origin (localhost or production)
    redirectUrl = `${window.location.origin}/auth/callback?role=${role}`
    console.log('🌐 Client-side redirect URL:', redirectUrl)
  } else {
    // Server-side: determine based on environment
    const isProduction = process.env.NODE_ENV === 'production'
    const baseUrl = isProduction 
      ? (process.env.NEXT_PUBLIC_BASE_URL || 'https://classlogger.com')
      : 'http://localhost:3000'
    
    redirectUrl = `${baseUrl}/auth/callback?role=${role}`
    console.log('🖥️ Server-side redirect URL:', redirectUrl, '(production:', isProduction, ')')
  }
  
  console.log('🔗 Final redirect URL:', redirectUrl)

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      }
    }
  })
  
  if (error) {
    console.error('❌ Google sign-in error:', error)
  } else {
    console.log('✅ Google sign-in initiated:', data)
  }
  
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  return { data, error }
}

export const createOrUpdateProfile = async (profile: Partial<Profile>) => {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(profile)
    .select()
    .single()
  
  return { data, error }
}