// src/app/api/booking/[token]/my-bookings/route.ts
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse  } from 'next/server'

// GET endpoint to fetch student's booking history
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params
    console.log('🔄 Student Bookings API called for token:', token.substring(0, 8) + '...')
    
    // Use service client for token validation
    const supabase = await createServerSupabaseClient()
    
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // 'confirmed', 'cancelled', 'completed', 'all'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const includeHistory = searchParams.get('include_history') === 'true'
    
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
    
    const { student_id, teacher_id, student_name, teacher_name } = tokenValidation[0]
    
    // Build query for bookings
    let query = supabase
      .from('bookings')
      .select(`
        id,
        booking_date,
        start_time,
        end_time,
        status,
        notes,
        booked_at,
        cancelled_at,
        completed_at,
        cancellation_reason,
        schedule_slots!inner (
          id,
          subject,
          title,
          description,
          google_meet_url
        )
      `)
      .eq('student_id', student_id)
      .eq('teacher_id', teacher_id)
    
    // Apply status filter
    if (status && status !== 'all') {
      if (['confirmed', 'cancelled', 'completed', 'no_show'].includes(status)) {
        query = query.eq('status', status)
      } else {
        return NextResponse.json({ 
          error: 'Invalid status filter. Use: confirmed, cancelled, completed, no_show, or all' 
        }, { status: 400 })
      }
    }
    
    // Apply date filter based on include_history
    if (!includeHistory) {
      // Only show future bookings and recent past (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      query = query.gte('booking_date', thirtyDaysAgo.toISOString().split('T')[0])
    }
    
    // Apply pagination and ordering
    query = query
      .order('booking_date', { ascending: false })
      .order('start_time', { ascending: false })
      .range(offset, offset + limit - 1)
    
    const { data: bookings, error: bookingsError  } = await query
    
    if (bookingsError) {
      console.error('❌ Bookings fetch error:', bookingsError)
      return NextResponse.json({ 
        error: 'Failed to fetch bookings',
        details: bookingsError.message
      }, { status: 500 })
    }
    
    // Get booking statistics
    const { data: stats, error: statsError  } = await supabase
      .from('bookings')
      .select('status')
      .eq('student_id', student_id)
      .eq('teacher_id', teacher_id)
    
    const bookingStats = {
      total: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      no_show: 0
    }
    
    if (!statsError && stats) {
      bookingStats.total = stats.length
      bookingStats.confirmed = stats.filter(b => b.status === 'confirmed').length
      bookingStats.completed = stats.filter(b => b.status === 'completed').length
      bookingStats.cancelled = stats.filter(b => b.status === 'cancelled').length
      bookingStats.no_show = stats.filter(b => b.status === 'no_show').length
    }
    
    // Get upcoming bookings (next 7 days)
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    
    const { data: upcomingBookings, error: upcomingError  } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_date,
        start_time,
        end_time,
        status,
        schedule_slots!inner (
          subject,
          title,
          google_meet_url
        )
      `)
      .eq('student_id', student_id)
      .eq('teacher_id', teacher_id)
      .eq('status', 'confirmed')
      .gte('booking_date', new Date().toISOString().split('T')[0])
      .lte('booking_date', nextWeek.toISOString().split('T')[0])
      .order('booking_date')
      .order('start_time')
      .limit(10)
    void upcomingError
    
    console.log('✅ Bookings loaded for student:', student_name)
    
    return NextResponse.json({
      success: true,
      student_name,
      teacher_name,
      bookings: bookings || [],
      upcoming_bookings: upcomingBookings || [],
      stats: bookingStats,
      pagination: {
        limit,
        offset,
        has_more: bookings && bookings.length === limit
      }
    })
  } catch (error) {
    console.error('❌ Student bookings API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
