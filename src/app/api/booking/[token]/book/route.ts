// src/app/api/booking/[token]/book/route.ts
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { withSecurity } from '@/lib/rate-limiting'
import { NextRequest, NextResponse  } from 'next/server'
import { z } from 'zod'

// Validation schema
const BookingRequestSchema = z.object({
  schedule_slot_id: z.string().uuid('Invalid schedule slot ID'),
  notes: z.string().max(500).optional()
})

// POST endpoint to book a slot via share token
async function bookSlotHandler(
  request: NextRequest,
  context: unknown
) {
  try {
    const { token } = await (context as { params: Promise<{ token: string }> }).params
    console.log('🔄 Student Booking API called for token:', token.substring(0, 8) + '...')
    
    // Use service client for token validation and booking
    const supabase = await createServerSupabaseClient()
    
    const body = await request.json()
    console.log('📝 Booking request:', JSON.stringify(body))
    
    // Validate input
    const validationResult = BookingRequestSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const { schedule_slot_id, notes } = validationResult.data

    // Get client info for security logging
    const clientInfo = {
      userAgent: request.headers.get('user-agent'),
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 
                 request.headers.get('x-real-ip') || 
                 'unknown',
      referer: request.headers.get('referer'),
      action: 'booking_attempt'
    }

    // Use enhanced token validation with security logging
    const { data: tokenValidation, error: tokenError  } = await supabase
      .rpc('validate_share_token_secure', {
        p_token: token,
        p_client_info: clientInfo
      })
    
    if (tokenError) {
      console.error('❌ Token validation error:', tokenError)
      return NextResponse.json({ 
        error: 'Failed to validate booking link',
        details: tokenError.message
      }, { status: 500 })
    }
    
    if (!tokenValidation.success) {
      return NextResponse.json({ 
        error: tokenValidation.error || 'Invalid or expired booking link',
        code: tokenValidation.code || 'INVALID_TOKEN'
      }, { status: tokenValidation.code === 'INVALID_TOKEN' ? 401 : 400 })
    }
    
    const { student_id, teacher_id } = tokenValidation
    
    // Get the schedule slot to verify it belongs to the correct teacher
    const { data: scheduleSlot, error: slotError  } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('id', schedule_slot_id)
      .eq('teacher_id', teacher_id)
      .single()
    
    if (slotError) {
      console.error('❌ Schedule slot error:', slotError)
      if (slotError.code === 'PGRST116') {
        return NextResponse.json({ 
          error: 'Schedule slot not found or access denied',
          code: 'SLOT_NOT_FOUND'
        }, { status: 404 })
      }
      return NextResponse.json({ 
        error: 'Failed to fetch schedule slot',
        details: slotError.message
      }, { status: 500 })
    }
    
    // Verify slot is available
    if (scheduleSlot.status !== 'available') {
      return NextResponse.json({ 
        error: 'This time slot is no longer available',
        code: 'SLOT_UNAVAILABLE',
        current_status: scheduleSlot.status
      }, { status: 409 })
    }
    
    // Verify slot is in the future
    const slotDateTime = new Date(`${scheduleSlot.date}T${scheduleSlot.start_time}`)
    const now = new Date()
    
    if (slotDateTime <= now) {
      return NextResponse.json({ 
        error: 'Cannot book a slot in the past or currently ongoing',
        code: 'SLOT_IN_PAST'
      }, { status: 400 })
    }
    
    // Get student's credit account
    const { data: creditAccount, error: creditError  } = await supabase
      .from('credits')
      .select('*')
      .eq('student_id', student_id)
      .eq('teacher_id', teacher_id)
      .eq('is_active', true)
      .single()
    
    if (creditError) {
      console.error('❌ Credit account error:', creditError)
      
      // Log security event for suspicious booking attempt
      await supabase.rpc('log_security_event', {
        p_event_type: 'suspicious_access_pattern',
        p_severity: 'medium',
        p_details: {
          reason: 'booking_attempt_without_credit_account',
          student_id,
          teacher_id,
          schedule_slot_id
        },
        p_client_info: clientInfo
      })
      
      if (creditError.code === 'PGRST116') {
        return NextResponse.json({ 
          error: 'No active credit account found',
          code: 'NO_CREDIT_ACCOUNT',
          message: 'You need to purchase credits from this teacher before booking a slot'
        }, { status: 400 })
      }
      return NextResponse.json({ 
        error: 'Failed to check credit account',
        details: creditError.message
      }, { status: 500 })
    }
    
    // Check if student has enough credits
    if (creditAccount.balance_hours < 1) {
      return NextResponse.json({ 
        error: 'Insufficient credits',
        code: 'INSUFFICIENT_CREDITS',
        current_balance: creditAccount.balance_hours,
        required: 1
      }, { status: 400 })
    }
    
    // Use the enhanced booking function
    const { data: bookingResult, error: bookingError  } = await supabase
      .rpc('book_slot_with_validation', {
        p_schedule_slot_id: schedule_slot_id,
        p_student_id: student_id,
        p_credit_account_id: creditAccount.id,
        p_notes: notes
      })
    
    if (bookingError) {
      console.error('❌ Booking function error:', bookingError)
      return NextResponse.json({ 
        error: 'Booking failed',
        details: bookingError.message
      }, { status: 500 })
    }
    
    if (!bookingResult || !bookingResult.success) {
      const errorCode = bookingResult?.code || 'BOOKING_FAILED'
      const statusCode = errorCode === 'SLOT_UNAVAILABLE' || errorCode === 'BOOKING_CONFLICT' ? 409 : 
                        errorCode === 'INSUFFICIENT_CREDITS' ? 400 : 500
      
      return NextResponse.json({ 
        error: bookingResult?.error || 'Booking failed',
        code: errorCode,
        details: bookingResult
      }, { status: statusCode })
    }
    
    console.log('✅ Booking successful:', bookingResult.booking_id)
    
    // Log successful booking
    const crypto = await import('crypto');
    await supabase.from('token_audit_logs').insert({
      token_hash: crypto.createHash('sha256').update(token).digest('hex'),
      student_id,
      teacher_id,
      action: 'booking_success',
      client_info: { ...clientInfo, booking_id: bookingResult.booking_id }
    })
    
    // Send email notifications
    try {
      const { sendBookingConfirmationEmail } = await import('@/lib/notification-service')
      await sendBookingConfirmationEmail(bookingResult.booking_id)
      console.log('📧 Booking confirmation emails sent')
    } catch (emailError) {
      console.error('⚠️ Failed to send booking confirmation emails:', emailError)
      // Don't fail the booking if email fails
    }
    
    const response = NextResponse.json({
      success: true,
      message: 'Class booked successfully!',
      booking: {
        id: bookingResult.booking_id,
        schedule_slot_id: bookingResult.schedule_slot_id,
        date: bookingResult.booking_date,
        start_time: bookingResult.start_time,
        end_time: bookingResult.end_time,
        credits_deducted: bookingResult.credits_deducted,
        remaining_credits: bookingResult.remaining_credits
      },
      security_info: {
        needs_rotation: tokenValidation.needs_rotation
      }
    })
    
    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    
    return response
  } catch (error) {
    console.error('❌ Student booking API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Apply security middleware with CSRF protection
export const POST = withSecurity(bookSlotHandler, { 
  rateLimit: 'booking-create',
  csrf: true // POST requests need CSRF protection
})
