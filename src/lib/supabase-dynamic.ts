// src/lib/supabase-dynamic.ts
// Dynamic Supabase client that only loads on client-side to avoid build-time env var issues

let supabaseClient: any = null

export function getSupabaseClient() {
  // Only create client on client-side
  if (typeof window === 'undefined') {
    return null
  }
  
  // Reuse existing client if available
  if (supabaseClient) {
    return supabaseClient
  }
  
  // Create new client using environment variables available at runtime
  try {
    // Dynamically import createClient to avoid build-time evaluation
    const createSupabaseClient = async () => {
      const { createClient } = await import('@supabase/supabase-js')
      
      // Get env vars from runtime environment
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('either NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY env variables or supabaseUrl and supabaseKey are required!')
      }
      
      return createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        }
      })
    }
    
    // Return a promise-based client
    return createSupabaseClient()
  } catch (error) {
    console.error('Failed to create Supabase client:', error)
    return null
  }
}

// Hook for using Supabase in components
export function useSupabase() {
  return getSupabaseClient()
}