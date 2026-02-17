// src/app/api/booking/[token]/calendar/route.ts
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { withSecurity } from '@/lib/rate-limiting'
import { filterCalendarDataForStudent } from '@/lib/privacy-protection'
import { NextRequest, NextResponse  } from 'next/server'

// GET endpoint to fetch privacy-filtered calendar for student
async function calendarHandler(
  request: NextRequest,
  context: unknown
) {
  try {
    const { token } = await (context as { params: Promise<{ token: string }> }).params
    console.log('🔄 Student Calendar API called for token:', token.substring(0, 8) + '...')
    
    // Use service client for token validation (bypasses RLS)
    const supabase = await createServerSupabaseClient()
    
    const { searchParams } = new URL(request.url)
    const weekStart = searchParams.get('week_start')
    
    // Validate and parse week start date
    let startDate: Date
    if (weekStart) {
      startDate = new Date(weekStart)
      if (isNaN(startDate.getTime())) {
        return NextResponse.json({ 
          error: 'Invalid week_start date format. Use YYYY-MM-DD' 
        }, { status: 400 })
      }
    } else {
      // Default to current week (Monday)
      startDate = new Date()
      const dayOfWeek = startDate.getDay()
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      startDate.setDate(startDate.getDate() + daysToMonday)
    }
    
    // Get client info for security logging
    const clientInfo = {
      userAgent: request.headers.get('user-agent'),
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 
                 request.headers.get('x-real-ip') || 
                 'unknown',
      referer: request.headers.get('referer')
    }
    
    // Use enhanced token validation with security logging
    const { data: calendarData, error: calendarError  } = await supabase
      .rpc('validate_share_token_secure', {
        p_token: token,
        p_client_info: clientInfo
      })
    
    if (calendarError) {
      console.error('❌ Token validation error:', calendarError)
      return NextResponse.json({ 
        error: 'Failed to validate booking link',
        details: calendarError.message
      }, { status: 500 })
    }
    
    if (!calendarData.success) {
      return NextResponse.json({ 
        error: calendarData.error || 'Invalid or expired booking link',
        code: calendarData.code || 'INVALID_TOKEN'
      }, { status: calendarData.code === 'INVALID_TOKEN' ? 401 : 400 })
    }
    
    // Get calendar data using the original function
    const { data: studentCalendar, error: studentCalendarError  } = await supabase
      .rpc('get_student_calendar', {
        p_share_token: token,
        p_week_start: startDate.toISOString().split('T')[0]
      })
    
    if (studentCalendarError) {
      console.error('❌ Calendar function error:', studentCalendarError)
      return NextResponse.json({ 
        error: 'Failed to load calendar',
        details: studentCalendarError.message
      }, { status: 500 })
    }
    
    if (!studentCalendar || !studentCalendar.success) {
      return NextResponse.json({ 
        error: studentCalendar?.error || 'Failed to load calendar',
        code: studentCalendar?.code || 'CALENDAR_ERROR'
      }, { status: studentCalendar?.code === 'INVALID_TOKEN' ? 401 : 500 })
    }
    
    console.log('✅ Calendar loaded for student:', studentCalendar.student_name)
    
    // Apply privacy filtering to calendar data
    const filteredSlots = filterCalendarDataForStudent(
      studentCalendar.slots || [], 
      calendarData.student_id
    )
    
    const response = NextResponse.json({
      success: true,
      student_name: studentCalendar.student_name,
      teacher_name: studentCalendar.teacher_name,
      week_start: studentCalendar.week_start,
      week_end: studentCalendar.week_end,
      slots: filteredSlots,
      upcoming_bookings: studentCalendar.upcoming_bookings || [],
      security_info: {
        needs_rotation: calendarData.needs_rotation,
        access_count: calendarData.access_count
      },
      privacy_info: {
        data_filtered: true,
        personal_data_hidden: true,
        gdpr_compliant: true
      }
    })
    
    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    
    return response
  } catch (error) {
    console.error('❌ Student calendar API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Apply security middleware
export const GET = withSecurity(calendarHandler, { 
  rateLimit: 'calendar-view',
  csrf: false // GET requests don't need CSRF protection
})
