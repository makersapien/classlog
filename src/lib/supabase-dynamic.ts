// src/lib/supabase-dynamic.ts
// Dynamic Supabase client that only loads on client-side to avoid build-time env var issues

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

let supabaseClient: ReturnType<typeof createClientComponentClient> | null = null

export function getSupabaseClient() {
  // Only create client on client-side
  if (typeof window === 'undefined') {
    return null
  }
  
  // Reuse existing client if available
  if (supabaseClient) {
    return supabaseClient
  }
  
  // Create new client
  try {
    supabaseClient = createClientComponentClient()
    return supabaseClient
  } catch (error) {
    console.error('Failed to create Supabase client:', error)
    return null
  }
}

// Hook for using Supabase in components
export function useSupabase() {
  return getSupabaseClient()
}