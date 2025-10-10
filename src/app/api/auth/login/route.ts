// File: src/app/api/auth/google-login/route.ts
// This handles Google OAuth login for the Chrome extension

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Initialize Supabase client inside function to avoid build-time env var issues
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const body = await request.json()
    const { google_token, email, name } = body

    if (!google_token || !email) {
      return NextResponse.json({ 
        success: false, 
        error: 'Google token and email are required' 
      }, { status: 400 })
    }

    console.log('🔐 Google Login attempt for:', email)

    // Verify the Google token with Google's API
    try {
      const googleResponse = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${google_token}`)
      const googleUserData = await googleResponse.json()
      
      if (!googleResponse.ok || googleUserData.email !== email) {
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid Google token' 
        }, { status: 401 })
      }

      console.log('✅ Google token verified for:', googleUserData.email)
    } catch (googleError) {
      console.error('❌ Google token verification failed:', googleError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to verify Google token' 
      }, { status: 401 })
    }

    // Check if user exists in our database and is a teacher
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('email', email)
      .single()

    if (profileError || !profile) {
      console.error('❌ Profile not found:', email)
      return NextResponse.json({ 
        success: false, 
        error: 'Teacher account not found. Please make sure you have a ClassLogger teacher account.' 
      }, { status: 404 })
    }

    // Check if user is a teacher
    if (profile.role !== 'teacher') {
      return NextResponse.json({ 
        success: false, 
        error: 'Only teachers can use ClassLogger extension' 
      }, { status: 403 })
    }

    // Generate a magic link for authentication (but we don't need to use the result)
    const { error: authError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        data: {
          name: name || profile.full_name
        }
      }
    })

    if (authError) {
      console.error('❌ Supabase auth error:', authError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to create session' 
      }, { status: 500 })
    }

    console.log('✅ Login successful for teacher:', profile.full_name)

    // Return success with teacher info and session
    return NextResponse.json({
      success: true,
      teacher: {
        id: profile.id,
        name: profile.full_name,
        email: profile.email
      },
      session: {
        access_token: google_token, // Use Google token for API calls
        user_id: profile.id
      }
    })

  } catch (error) {
    console.error('❌ Google login API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}