// src/app/api/booking/history/route.ts
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { verifyJWT } from '@/lib/jwt'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema
const HistoryQuerySchema = z.object({
  student_id: z.string().uuid('Invalid student ID'),
  teacher_id: z.string().uuid('Invalid teacher ID'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional()
})

// GET endpoint to fetch booking history for a student
export async function GET(request: NextRequest) {
  try {
    console.log('📚 Booking history API called')
    
    // Get teacher info from Bearer token or session
    let authenticated_teacher_id: string | null = null

    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const decoded = verifyJWT(token)

      if (decoded && (decoded.type === 'extension' || decoded.type === 'web')) {
        authenticated_teacher_id = decoded.userId
        console.log('✅ Authenticated teacher:', decoded.email)
      } else {
        console.error('❌ Invalid authentication token')
        return NextResponse.json({
          success: false,
          error: 'Invalid authentication token'
        }, { status: 401 })
      }
    } else {
      // Try to get from session if no Bearer token
      const supabase = await createServerSupabaseClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        console.error('❌ No authentication provided')
        return NextResponse.json({
          success: false,
          error: 'Authentication required'
        }, { status: 401 })
      }
      
      authenticated_teacher_id = user.id
    }

    const { searchParams } = new URL(request.url)
    const queryParams = {
      student_id: searchParams.get('student_id'),
      teacher_id: searchParams.get('teacher_id'),
      limit: searchParams.get('limit')
    }
    
    // Validate query parameters
    const validationResult = HistoryQuerySchema.safeParse(queryParams)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Invalid query parameters',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const { student_id, teacher_id, limit = 50 } = validationResult.data
    
    // Verify the authenticated teacher matches the requested teacher
    if (authenticated_teacher_id !== teacher_id) {
      return NextResponse.json({ 
        error: 'Access denied - can only view your own student bookings',
        code: 'ACCESS_DENIED'
      }, { status: 403 })
    }
    
    const supabase = await createServerSupabaseClient()
    
    // Fetch booking history with class log details
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_date,
        start_time,
        end_time,
        status,
        booked_at,
        cancelled_at,
        completed_at,
        notes,
        class_logs!booking_id (
          id,
          duration_minutes,
          topics_covered,
          homework_assigned
        )
      `)
      .eq('student_id', student_id)
      .eq('teacher_id', teacher_id)
      .order('booking_date', { ascending: false })
      .limit(limit)
    
    if (bookingsError) {
      console.error('❌ Bookings fetch error:', bookingsError)
      return NextResponse.json({ 
        error: 'Failed to fetch booking history',
        details: bookingsError.message
      }, { status: 500 })
    }
    
    // Transform the data to flatten class_logs
    const transformedBookings = bookings.map(booking => ({
      ...booking,
      class_log: booking.class_logs && booking.class_logs.length > 0 ? booking.class_logs[0] : null,
      class_logs: undefined // Remove the array
    }))
    
    console.log('✅ Booking history fetched successfully:', transformedBookings.length, 'bookings')
    
    // Get summary statistics
    const totalBookings = transformedBookings.length
    const completedBookings = transformedBookings.filter(b => b.status === 'completed').length
    const cancelledBookings = transformedBookings.filter(b => b.status === 'cancelled').length
    const noShowBookings = transformedBookings.filter(b => b.status === 'no_show').length
    const upcomingBookings = transformedBookings.filter(b => 
      b.status === 'confirmed' && new Date(`${b.booking_date}T${b.start_time}`) > new Date()
    ).length
    
    return NextResponse.json({
      success: true,
      bookings: transformedBookings,
      summary: {
        total_bookings: totalBookings,
        completed_bookings: completedBookings,
        cancelled_bookings: cancelledBookings,
        no_show_bookings: noShowBookings,
        upcoming_bookings: upcomingBookings
      },
      metadata: {
        student_id,
        teacher_id,
        limit,
        generated_at: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('❌ Booking history API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}