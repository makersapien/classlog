// File: src/app/api/auth/extension-login/route.ts
// Simple email-based login for Chrome extension

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ 
        success: false, 
        error: 'Email is required' 
      }, { status: 400 })
    }

    console.log('📧 Extension login attempt for:', email)

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim()

    // Check if teacher exists in database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('email', normalizedEmail)
      .single()

    if (profileError || !profile) {
      console.error('❌ Teacher not found:', normalizedEmail, profileError)
      return NextResponse.json({ 
        success: false, 
        error: 'Teacher account not found. Please make sure you have a ClassLogger account with this email address.' 
      }, { status: 404 })
    }

    // Check if user is a teacher
    if (profile.role !== 'teacher') {
      console.log('❌ User is not a teacher:', profile.role)
      return NextResponse.json({ 
        success: false, 
        error: 'Only teachers can use ClassLogger extension. Your account role: ' + profile.role 
      }, { status: 403 })
    }

    console.log('✅ Extension login successful for teacher:', profile.full_name)

    // Return success with teacher info
    return NextResponse.json({
      success: true,
      teacher: {
        id: profile.id,
        name: profile.full_name,
        email: profile.email
      },
      // Simple session token (just encode user ID and timestamp)
      session: {
        access_token: `extension_${profile.id}_${Date.now()}`,
        user_id: profile.id,
        login_method: 'email'
      }
    })

  } catch (error) {
    console.error('❌ Extension login API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error. Please try again later.' 
    }, { status: 500 })
  }
}