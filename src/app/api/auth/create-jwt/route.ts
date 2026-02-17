// src/app/api/auth/create-jwt/route.ts

import { NextRequest, NextResponse  } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { signJWT } from '@/lib/jwt'
import { setAuthCookie } from '@/lib/cookies'

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase env vars for JWT creation')
      return NextResponse.json(
        { error: 'Missing Supabase environment variables.' },
        { status: 500 }
      )
    }

    // Initialize Supabase client inside function to avoid build-time env var issues
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🔄 Creating JWT cookie for OAuth user...')
    
    // Get data from request
    const { userId, email, name, role } = await request.json()
    
    // Validate required fields
    if (!userId || !email || !role) {
      console.error('❌ Missing required fields')
      return NextResponse.json(
        { error: 'Missing required fields: userId, email, role' },
        { status: 400 }
      )
    }
    
    // Create Supabase client with service role for verification

    // Try to verify the user exists in the database (optional check)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('id', userId)
      .single()
    
    if (profile) {
      // If profile exists, verify the email matches
      if (profile.email !== email) {
        console.error('❌ Email mismatch')
        return NextResponse.json(
          { error: 'Email mismatch' },
          { status: 401 }
        )
      }
      console.log('✅ Profile verified in database:', profile.email, profile.role)
    } else {
      // Profile doesn't exist yet, but that's okay for OAuth flow
      console.log('⚠️ Profile not found in database, but proceeding with JWT creation for OAuth user')
      console.log('📋 Profile error details:', profileError)
    }

    console.log('✅ Creating JWT for user:', email, role)

    // Create JWT payload
    const jwtPayload = {
      userId,
      email,
      role: role as 'teacher' | 'student' | 'parent',
      name,
    }

    // Sign JWT
    const token = signJWT(jwtPayload)

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'JWT cookie created successfully'
    })

    // Set JWT cookie
    setAuthCookie(response, token)

    console.log('✅ JWT cookie set successfully')
    return response

  } catch (error) {
    console.error('❌ JWT creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create JWT cookie' },
      { status: 500 }
    )
  }
}
