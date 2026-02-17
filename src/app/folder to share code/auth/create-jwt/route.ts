// src/app/api/auth/create-jwt/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { signJWT } from '@/lib/jwt'
import { setAuthCookie } from '@/lib/cookies'

export async function POST(request: NextRequest) {
    // Initialize Supabase client inside function to avoid build-time env var issues
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Initialize Supabase client inside function to avoid build-time env var issues

  try {
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

    // Verify the user exists in the database
    const { data: profile, error: profileError  } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('id', userId)
      .single()
    
    if (profileError || !profile) {
      console.error('❌ User not found in database:', profileError)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    // Verify the email matches
    if (profile.email !== email) {
      console.error('❌ Email mismatch')
      return NextResponse.json(
        { error: 'Email mismatch' },
        { status: 401 }
      )
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
