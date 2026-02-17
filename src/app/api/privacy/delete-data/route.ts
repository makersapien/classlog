// src/app/api/privacy/delete-data/route.ts
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-server'
import { withSecurity } from '@/lib/rate-limiting'
import { NextRequest, NextResponse  } from 'next/server'
import { z } from 'zod'

// Validation schema
const DeleteRequestSchema = z.object({
  student_id: z.string().uuid('Invalid student ID'),
  teacher_id: z.string().uuid('Invalid teacher ID'),
  delete_bookings: z.boolean().default(false),
  anonymize_only: z.boolean().default(false),
  confirmation: z.literal('I understand this action cannot be undone')
})

// POST endpoint to delete/anonymize student data for GDPR compliance
async function deleteDataHandler(
  request: NextRequest
) {
  try {
    console.log('🔄 Data Deletion API called')
    
    const { supabase, user } = await createAuthenticatedSupabaseClient()
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    const body = await request.json()
    
    // Validate input
    const validationResult = DeleteRequestSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const { student_id, teacher_id, delete_bookings, anonymize_only } = validationResult.data
    
    // Use the database function to delete/anonymize data
    const { data: deleteResult, error: deleteError  } = await supabase
      .rpc('delete_student_data', {
        p_student_id: student_id,
        p_teacher_id: teacher_id,
        p_requested_by: user.id,
        p_delete_bookings: delete_bookings,
        p_anonymize_only: anonymize_only
      })
    
    if (deleteError) {
      console.error('❌ Data deletion error:', deleteError)
      return NextResponse.json({ 
        error: 'Failed to delete data',
        details: deleteError.message
      }, { status: 500 })
    }
    
    if (!deleteResult.success) {
      const statusCode = deleteResult.code === 'PERMISSION_DENIED' ? 403 : 400
      return NextResponse.json(deleteResult, { status: statusCode })
    }
    
    console.log('✅ Data deletion successful:', deleteResult.request_id)
    
    const response = NextResponse.json({
      success: true,
      message: anonymize_only ? 'Data anonymized successfully' : 'Data deleted successfully',
      request_id: deleteResult.request_id,
      processed_records: deleteResult.processed_records,
      anonymized_only: deleteResult.anonymized_only,
      deletion_info: {
        processed_at: new Date().toISOString(),
        action: anonymize_only ? 'anonymization' : 'deletion',
        affected_data: ['share_tokens', 'audit_logs', delete_bookings ? 'bookings' : null].filter(Boolean)
      }
    })
    
    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    
    return response
  } catch (error) {
    console.error('❌ Data deletion API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Apply security middleware
export const POST = withSecurity(deleteDataHandler, { 
  rateLimit: 'api-general',
  csrf: true
})