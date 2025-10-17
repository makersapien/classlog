// src/app/api/teacher/students/[id]/share-link/route.ts
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-server'
import { withSecurity } from '@/lib/rate-limiting'
import { NextRequest, NextResponse } from 'next/server'
import { middleware } from '@/middleware'

// GET endpoint to get existing share link for a student
async function getShareLinkHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔄 Get Share Link API called for student:', params.id)
    
    const { supabase, user } = await createAuthenticatedSupabaseClient()
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    // Get user role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('❌ Profile error:', profileError)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    
    // Only teachers can manage share links
    if (profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can manage share links' }, { status: 403 })
    }

    // Verify the student belongs to this teacher
    const { data: student, error: studentError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', params.id)
      .single()

    if (studentError) {
      console.error('❌ Student fetch error:', studentError)
      if (studentError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 })
      }
      return NextResponse.json({ 
        error: 'Failed to fetch student',
        details: studentError.message
      }, { status: 500 })
    }

    // Check if there's an enrollment relationship
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', params.id)
      .eq('teacher_id', user.id)
      .eq('status', 'active')
      .single()

    if (enrollmentError && enrollmentError.code === 'PGRST116') {
      return NextResponse.json({ 
        error: 'Student is not enrolled with this teacher',
        code: 'NOT_ENROLLED'
      }, { status: 403 })
    }

    // Get existing share token
    const { data: shareToken, error: tokenError } = await supabase
      .from('share_tokens')
      .select('*')
      .eq('student_id', params.id)
      .eq('teacher_id', user.id)
      .eq('is_active', true)
      .single()

    if (tokenError && tokenError.code !== 'PGRST116') {
      console.error('❌ Token fetch error:', tokenError)
      return NextResponse.json({ 
        error: 'Failed to fetch share token',
        details: tokenError.message
      }, { status: 500 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    
    if (shareToken) {
      // Check if token is expired
      const isExpired = new Date(shareToken.expires_at) <= new Date()
      
      return NextResponse.json({
        success: true,
        has_token: true,
        token: shareToken.token,
        share_url: `${baseUrl}/book/${user.id}/${shareToken.token}`,
        created_at: shareToken.created_at,
        expires_at: shareToken.expires_at,
        access_count: shareToken.access_count,
        last_accessed: shareToken.last_accessed,
        is_expired: isExpired,
        student: {
          id: student.id,
          name: student.full_name,
          email: student.email
        }
      })
    } else {
      return NextResponse.json({
        success: true,
        has_token: false,
        student: {
          id: student.id,
          name: student.full_name,
          email: student.email
        }
      })
    }
  } catch (error) {
    console.error('❌ Get share link API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST endpoint to create or regenerate share link for a student
async function createShareLinkHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔄 Create Share Link API called for student:', params.id)
    
    const { supabase, user } = await createAuthenticatedSupabaseClient()
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    // Get user role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('❌ Profile error:', profileError)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    
    // Only teachers can create share links
    if (profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can create share links' }, { status: 403 })
    }

    // Verify the student belongs to this teacher
    const { data: student, error: studentError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', params.id)
      .single()

    if (studentError) {
      console.error('❌ Student fetch error:', studentError)
      if (studentError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 })
      }
      return NextResponse.json({ 
        error: 'Failed to fetch student',
        details: studentError.message
      }, { status: 500 })
    }

    // Check if there's an enrollment relationship
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', params.id)
      .eq('teacher_id', user.id)
      .eq('status', 'active')
      .single()

    if (enrollmentError && enrollmentError.code === 'PGRST116') {
      return NextResponse.json({ 
        error: 'Student is not enrolled with this teacher',
        code: 'NOT_ENROLLED'
      }, { status: 403 })
    }

    // Get client info for security logging
    const clientInfo = {
      userAgent: request.headers.get('user-agent'),
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 
                 request.headers.get('x-real-ip') || 
                 'unknown',
      referer: request.headers.get('referer'),
      action: 'token_generation'
    }

    // Use the database function to create or get share token
    const { data: tokenResult, error: tokenError } = await supabase
      .rpc('create_share_token', {
        p_student_id: params.id,
        p_teacher_id: user.id
      })
    
    // Log token generation
    if (tokenResult) {
      await supabase.from('token_audit_logs').insert({
        token_hash: require('crypto').createHash('sha256').update(tokenResult).digest('hex'),
        student_id: params.id,
        teacher_id: user.id,
        action: 'generation',
        client_info: clientInfo
      })
    }

    if (tokenError) {
      console.error('❌ Token creation error:', tokenError)
      return NextResponse.json({ 
        error: 'Failed to create share token',
        details: tokenError.message
      }, { status: 500 })
    }

    // Get the full token details
    const { data: shareToken, error: fetchError } = await supabase
      .from('share_tokens')
      .select('*')
      .eq('token', tokenResult)
      .eq('is_active', true)
      .single()

    if (fetchError) {
      console.error('❌ Token fetch error:', fetchError)
      return NextResponse.json({ 
        error: 'Failed to fetch created token',
        details: fetchError.message
      }, { status: 500 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    
    console.log('✅ Share token created/retrieved for student:', student.full_name)

    return NextResponse.json({
      success: true,
      token: shareToken.token,
      share_url: `${baseUrl}/book/${user.id}/${shareToken.token}`,
      created_at: shareToken.created_at,
      expires_at: shareToken.expires_at,
      access_count: shareToken.access_count,
      last_accessed: shareToken.last_accessed,
      student: {
        id: student.id,
        name: student.full_name,
        email: student.email
      }
    })
  } catch (error) {
    console.error('❌ Create share link API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
// App
ly security middleware
export const GET = withSecurity(getShareLinkHandler, { 
  rateLimit: 'api-general',
  csrf: false // GET requests don't need CSRF protection
})

export const POST = withSecurity(createShareLinkHandler, { 
  rateLimit: 'token-generation',
  csrf: true // POST requests need CSRF protection
})