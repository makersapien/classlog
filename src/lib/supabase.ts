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
  
  // Get the current origin for redirect URL
  const redirectUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/auth/callback?role=${role}`
    : `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?role=${role}`
  
  console.log('🔗 Redirect URL:', redirectUrl)

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