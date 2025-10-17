// src/app/api/privacy/export-data/route.ts
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-server'
import { withSecurity } from '@/lib/rate-limiting'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema
const ExportRequestSchema = z.object({
  student_id: z.string().uuid('Invalid student ID'),
  teacher_id: z.string().uuid('Invalid teacher ID')
})

// POST endpoint to export student data for GDPR compliance
async function exportDataHandler(
  request: NextRequest
) {
  try {
    console.log('🔄 Data Export API called')
    
    const { supabase, user } = await createAuthenticatedSupabaseClient()
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    const body = await request.json()
    
    // Validate input
    const validationResult = ExportRequestSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const { student_id, teacher_id } = validationResult.data
    
    // Use the database function to export data
    const { data: exportResult, error: exportError } = await supabase
      .rpc('export_student_data', {
        p_student_id: student_id,
        p_teacher_id: teacher_id,
        p_requested_by: user.id
      })
    
    if (exportError) {
      console.error('❌ Data export error:', exportError)
      return NextResponse.json({ 
        error: 'Failed to export data',
        details: exportError.message
      }, { status: 500 })
    }
    
    if (!exportResult.success) {
      const statusCode = exportResult.code === 'PERMISSION_DENIED' ? 403 : 400
      return NextResponse.json(exportResult, { status: statusCode })
    }
    
    console.log('✅ Data export successful:', exportResult.request_id)
    
    const response = NextResponse.json({
      success: true,
      message: 'Data exported successfully',
      request_id: exportResult.request_id,
      data: exportResult.data,
      export_info: {
        exported_at: new Date().toISOString(),
        format: 'JSON',
        includes: ['profile', 'bookings', 'share_tokens', 'audit_logs']
      }
    })
    
    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    
    // Add content disposition for download
    response.headers.set('Content-Disposition', `attachment; filename="student-data-${student_id}-${Date.now()}.json"`)
    
    return response
  } catch (error) {
    console.error('❌ Data export API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Apply security middleware
export const POST = withSecurity(exportDataHandler, { 
  rateLimit: 'api-general',
  csrf: true
})