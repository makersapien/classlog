// src/app/api/teacher/students/[id]/regenerate-token/route.ts
import crypto from 'crypto'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-server'
import { withSecurity } from '@/lib/rate-limiting'
import { NextRequest, NextResponse  } from 'next/server'
// import { middleware } from '@/middleware'

// POST endpoint to regenerate share token for a student (revokes old token)
async function regenerateTokenHandler(
  request: NextRequest,
  context: unknown
) {
  try {
    const { id } = await (context as { params: Promise<{ id: string }> }).params
    console.log('🔄 Regenerate Token API called for student:', id)
    
    const { supabase, user } = await createAuthenticatedSupabaseClient()
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    // Get user role
    const { data: profile, error: profileError  } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('❌ Profile error:', profileError)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    
    // Only teachers can regenerate tokens
    if (profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can regenerate tokens' }, { status: 403 })
    }

    // Get enrollment and verify it belongs to this teacher
    const { data: enrollment, error: enrollmentError  } = await supabase
      .from('enrollments')
      .select(`
        id,
        student_id,
        teacher_id,
        status,
        profiles!enrollments_student_id_fkey(
          id,
          full_name,
          email
        )
      `)
      .eq('id', id)
      .eq('teacher_id', user.id)
      .eq('status', 'active')
      .single()

    if (enrollmentError) {
      console.error('❌ Enrollment fetch error:', enrollmentError)
      if (enrollmentError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 })
      }
      return NextResponse.json({ 
        error: 'Failed to fetch student enrollment',
        details: enrollmentError.message
      }, { status: 500 })
    }

    const student = enrollment.profiles as { id?: string; full_name?: string; email?: string } | null
    if (!student) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 })
    }

    // Get client info for security logging
    const clientInfo = {
      userAgent: request.headers.get('user-agent'),
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 
                 request.headers.get('x-real-ip') || 
                 'unknown',
      referer: request.headers.get('referer'),
      action: 'token_regeneration'
    }

    // Deactivate all existing tokens for this student-teacher pair
    const { error: deactivateError } = await supabase
      .from('share_tokens')
      .update({ is_active: false })
      .eq('student_id', enrollment.student_id)
      .eq('teacher_id', user.id)
      .eq('is_active', true)

    if (deactivateError) {
      console.error('❌ Token deactivation error:', deactivateError)
      return NextResponse.json({ 
        error: 'Failed to deactivate existing tokens',
        details: deactivateError.message
      }, { status: 500 })
    }

    // Generate new token using the database function
    const { data: newToken, error: tokenError  } = await supabase
      .rpc('generate_share_token')

    if (tokenError) {
      console.error('❌ Token generation error:', tokenError)
      return NextResponse.json({ 
        error: 'Failed to generate new token',
        details: tokenError.message
      }, { status: 500 })
    }

    // Create new share token record
    const { data: shareToken, error: createError  } = await supabase
      .from('share_tokens')
      .insert({
        student_id: enrollment.student_id,
        teacher_id: user.id,
        token: newToken,
        is_active: true,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year from now
      })
      .select()
      .single()

    if (createError) {
      console.error('❌ Token creation error:', createError)
      return NextResponse.json({ 
        error: 'Failed to create new share token',
        details: createError.message
      }, { status: 500 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    
    // Log token regeneration
    await supabase.from('token_audit_logs').insert({
      token_hash: crypto.createHash('sha256').update(shareToken.token).digest('hex'),
      student_id: enrollment.student_id,
      teacher_id: user.id,
      action: 'regeneration',
      client_info: clientInfo
    })

    console.log('✅ Share token regenerated for student:', student.full_name)

    const response = NextResponse.json({
      success: true,
      message: 'Share token regenerated successfully. Previous token is now invalid.',
      token: shareToken.token,
      share_url: `${baseUrl}/book/${user.id}/${shareToken.token}`,
      created_at: shareToken.created_at,
      expires_at: shareToken.expires_at,
      access_count: shareToken.access_count,
      student: {
        id: student.id,
        name: student.full_name,
        email: student.email
      }
    })
    
    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    
    return response
  } catch (error) {
    console.error('❌ Regenerate token API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Apply security middleware
export const POST = withSecurity(regenerateTokenHandler, { 
  rateLimit: 'token-generation',
  csrf: false // Disable CSRF for this endpoint - we have auth + rate limiting
})
