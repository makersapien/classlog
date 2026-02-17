// src/app/api/booking/session/match/route.ts
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { verifyJWT } from '@/lib/jwt'
import { NextRequest, NextResponse  } from 'next/server'
import { z } from 'zod'

// Validation schema
const MatchBookingSchema = z.object({
  booking_id: z.string().uuid('Invalid booking ID')
})

// POST endpoint to check if a booking matches with an actual class session
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Booking class match API called')
    
    // Get teacher info from Bearer token
    let teacher_id: string | null = null

    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const decoded = verifyJWT(token)

      if (decoded && (decoded.type === 'extension' || decoded.type === 'web')) {
        teacher_id = decoded.userId
        // teacherInfo = decoded // Unused variable
        console.log('✅ Authenticated teacher:', decoded.email)
      } else {
        console.error('❌ Invalid authentication token')
        return NextResponse.json({
          success: false,
          error: 'Invalid authentication token'
        }, { status: 401 })
      }
    } else {
      console.error('❌ No Bearer token provided')
      return NextResponse.json({
        success: false,
        error: 'Authentication required - Bearer token missing'
      }, { status: 401 })
    }

    const body = await request.json()
    console.log('📝 Booking match request:', JSON.stringify(body))
    
    // Validate input
    const validationResult = MatchBookingSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const { booking_id } = validationResult.data
    
    const supabase = await createServerSupabaseClient()
    
    // Verify the booking belongs to this teacher
    const {  error: bookingError  } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .eq('teacher_id', teacher_id)
      .single()
    
    if (bookingError) {
      console.error('❌ Booking verification error:', bookingError)
      if (bookingError.code === 'PGRST116') {
        return NextResponse.json({ 
          error: 'Booking not found or access denied',
          code: 'BOOKING_NOT_FOUND'
        }, { status: 404 })
      }
      return NextResponse.json({ 
        error: 'Failed to verify booking',
        details: bookingError.message
      }, { status: 500 })
    }
    
    // Use the database function to check for class match
    const { data: matchResult, error: matchError  } = await supabase
      .rpc('check_booking_class_match', {
        p_booking_id: booking_id
      })
    
    if (matchError) {
      console.error('❌ Match check error:', matchError)
      return NextResponse.json({ 
        error: 'Failed to check booking match',
        details: matchError.message
      }, { status: 500 })
    }
    
    if (!matchResult || !matchResult.success) {
      const errorCode = matchResult?.code || 'MATCH_CHECK_FAILED'
      const statusCode = errorCode === 'BOOKING_NOT_FOUND' ? 404 : 500
      
      return NextResponse.json({ 
        error: matchResult?.error || 'Failed to check booking match',
        code: errorCode,
        details: matchResult
      }, { status: statusCode })
    }
    
    console.log('✅ Booking match check completed:', matchResult.matched)
    
    // Send completion notification if class was matched
    if (matchResult.matched && matchResult.class_log_id) {
      try {
        const { sendClassCompletionNotification } = await import('@/lib/notification-service')
        await sendClassCompletionNotification(matchResult.class_log_id)
        console.log('📧 Class completion notifications sent')
      } catch (emailError) {
        console.error('⚠️ Failed to send class completion notifications:', emailError)
        // Don't fail the match if email fails
      }
    }
    
    return NextResponse.json({
      success: true,
      matched: matchResult.matched,
      message: matchResult.message,
      booking_id: matchResult.booking_id,
      class_log_id: matchResult.class_log_id || null,
      time_difference_minutes: matchResult.time_difference_minutes || null
    })
  } catch (error) {
    console.error('❌ Booking class match API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
