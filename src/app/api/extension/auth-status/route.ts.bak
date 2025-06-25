// src/app/api/extension/auth-status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json({ 
        success: false, 
        loggedIn: false,
        error: 'No token provided' 
      })
    }

    console.log('🔐 Checking auth status for token:', token.substring(0, 10) + '...')

    // Validate the token using existing token validation API
    const { data: tokenData, error: tokenError } = await supabase
      .from('extension_tokens')
      .select(`
        id,
        teacher_id,
        token,
        is_active,
        expires_at,
        teacher:profiles!extension_tokens_teacher_id_fkey (
          id,
          full_name,
          email,
          role
        )
      `)
      .eq('token', token)
      .eq('is_active', true)
      .single()

    if (tokenError || !tokenData) {
      console.log('❌ Invalid or expired token')
      return NextResponse.json({ 
        success: false, 
        loggedIn: false,
        error: 'Invalid or expired token' 
      })
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      console.log('❌ Token expired')
      return NextResponse.json({ 
        success: false, 
        loggedIn: false,
        error: 'Token expired' 
      })
    }

    // Verify the user is a teacher
    if (tokenData.teacher?.role !== 'teacher') {
      console.log('❌ User is not a teacher')
      return NextResponse.json({ 
        success: false, 
        loggedIn: false,
        error: 'User is not a teacher' 
      })
    }

    console.log('✅ Valid teacher token for:', tokenData.teacher.full_name)

    return NextResponse.json({
      success: true,
      loggedIn: true,
      teacherId: tokenData.teacher_id,
      teacherName: tokenData.teacher?.full_name,
      teacherEmail: tokenData.teacher?.email
    })

  } catch (error) {
    console.error('❌ Auth status API Error:', error)
    return NextResponse.json({ 
      success: false, 
      loggedIn: false,
      error: 'Internal server error: ' + error.message 
    })
  }
}