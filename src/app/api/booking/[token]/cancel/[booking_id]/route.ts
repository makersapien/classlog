// src/app/api/booking/[token]/cancel/[booking_id]/route.ts
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse  } from 'next/server'
import { z } from 'zod'

// Validation schema
const CancellationRequestSchema = z.object({
  reason: z.string().max(500).optional()
})

// DELETE endpoint to cancel a booking via share token
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ token: string; booking_id: string }> }
) {
  try {
    const { token, booking_id } = await context.params
    console.log('🔄 Student Cancellation API called for token:', token.substring(0, 8) + '...', 'booking:', booking_id)
    
    // Use service client for token validation and cancellation
    const supabase = await createServerSupabaseClient()
    
    const body = await request.json().catch(() => ({}))
    console.log('📝 Cancellation request:', JSON.stringify(body))
    
    // Validate input
    const validationResult = CancellationRequestSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const { reason } = validationResult.data

    // Validate share token and get student/teacher info
    const { data: tokenValidation, error: tokenError  } = await supabase
      .rpc('validate_share_token', { p_token: token })
    
    if (tokenError) {
      console.error('❌ Token validation error:', tokenError)
      return NextResponse.json({ 
        error: 'Failed to validate booking link',
        details: tokenError.message
      }, { status: 500 })
    }
    
    if (!tokenValidation || tokenValidation.length === 0 || !tokenValidation[0].is_valid) {
      return NextResponse.json({ 
        error: 'Invalid or expired booking link',
        code: 'INVALID_TOKEN'
      }, { status: 401 })
    }
    
    const { student_id, teacher_id } = tokenValidation[0]
    
    // Verify the booking belongs to this student and teacher
    const {  error: bookingError  } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .eq('student_id', student_id)
      .eq('teacher_id', teacher_id)
      .single()
    
    if (bookingError) {
      console.error('❌ Booking fetch error:', bookingError)
      if (bookingError.code === 'PGRST116') {
        return NextResponse.json({ 
          error: 'Booking not found or access denied',
          code: 'BOOKING_NOT_FOUND'
        }, { status: 404 })
      }
      return NextResponse.json({ 
        error: 'Failed to fetch booking',
        details: bookingError.message
      }, { status: 500 })
    }
    
    // Use the database function to cancel the booking
    const { data: cancellationResult, error: cancellationError  } = await supabase
      .rpc('cancel_booking', {
        p_booking_id: booking_id,
        p_student_id: student_id,
        p_reason: reason,
        p_refund_credits: true
      })
    
    if (cancellationError) {
      console.error('❌ Cancellation function error:', cancellationError)
      return NextResponse.json({ 
        error: 'Cancellation failed',
        details: cancellationError.message
      }, { status: 500 })
    }
    
    if (!cancellationResult || !cancellationResult.success) {
      const errorCode = cancellationResult?.code || 'CANCELLATION_FAILED'
      const statusCode = errorCode === 'CANCELLATION_POLICY_VIOLATION' ? 400 : 
                        errorCode === 'BOOKING_NOT_CANCELLABLE' ? 409 : 500
      
      return NextResponse.json({ 
        error: cancellationResult?.error || 'Cancellation failed',
        code: errorCode,
        details: cancellationResult
      }, { status: statusCode })
    }
    
    console.log('✅ Cancellation successful:', booking_id)
    
    // Send email notifications
    try {
      const { sendBookingCancellationEmail } = await import('@/lib/notification-service')
      await sendBookingCancellationEmail(booking_id)
      console.log('📧 Booking cancellation emails sent')
    } catch (emailError) {
      console.error('⚠️ Failed to send booking cancellation emails:', emailError)
      // Don't fail the cancellation if email fails
    }
    
    return NextResponse.json({
      success: true,
      message: 'Class booking cancelled successfully',
      cancellation: {
        booking_id,
        cancelled_at: cancellationResult.cancelled_at,
        credits_refunded: cancellationResult.credits_refunded,
        reason: reason
      }
    })
  } catch (error) {
    console.error('❌ Student cancellation API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
