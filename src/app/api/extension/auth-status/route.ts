// src/app/api/extension/auth-status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Define proper types for the API response
interface TeacherProfile {
  id: string
  full_name: string | null
  email: string | null
  role: 'teacher' | 'student' | 'parent'
}

interface TokenData {
  id: string
  teacher_id: string
  token: string
  is_active: boolean
  expires_at: string
  teacher: TeacherProfile | TeacherProfile[] | null
}

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
      .single() as { data: TokenData | null, error: unknown }

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

    // Fix: Handle the case where teacher might be an array due to Supabase join
    // When using foreign key relationships in Supabase, sometimes the result can be an array
    const teacherProfile = Array.isArray(tokenData.teacher) 
      ? tokenData.teacher[0] 
      : tokenData.teacher

    // Verify the user is a teacher
    if (!teacherProfile || teacherProfile.role !== 'teacher') {
      console.log('❌ User is not a teacher')
      return NextResponse.json({ 
        success: false, 
        loggedIn: false,
        error: 'User is not a teacher' 
      })
    }

    console.log('✅ Valid teacher token for:', teacherProfile.full_name)

    return NextResponse.json({
      success: true,
      loggedIn: true,
      teacherId: tokenData.teacher_id,
      teacherName: teacherProfile.full_name,
      teacherEmail: teacherProfile.email
    })

  } catch (error) {
    console.error('❌ Auth status API Error:', error)
    
    // Proper error handling with type safety
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json({ 
      success: false, 
      loggedIn: false,
      error: 'Internal server error: ' + errorMessage 
    })
  }
}