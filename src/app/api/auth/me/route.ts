// src/app/api/auth/me/route.ts
import { NextResponse } from 'next/server'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    console.log('🔄 Auth me API called')
    
    const { supabase, user } = await createAuthenticatedSupabaseClient()
    
    if (!user) {
      return NextResponse.json({ 
        authenticated: false,
        user: null 
      }, { status: 401 })
    }
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('❌ Profile error:', profileError)
      return NextResponse.json({ 
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          profile: null
        }
      })
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        profile: profile
      }
    })
  } catch (error) {
    console.error('❌ Auth me error:', error)
    return NextResponse.json({ 
      authenticated: false,
      user: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}