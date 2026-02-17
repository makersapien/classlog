// src/app/api/booking/analytics/route.ts
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { verifyJWT } from '@/lib/jwt'
import { NextRequest, NextResponse  } from 'next/server'
import { z } from 'zod'

// Validation schema
const AnalyticsQuerySchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
})

// GET endpoint to fetch booking analytics for a teacher
export async function GET(request: NextRequest) {
  try {
    console.log('📊 Booking analytics API called')
    
    // Get teacher info from Bearer token or session
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
      
      teacher_id = user.id
    }

    const { searchParams } = new URL(request.url)
    const queryParams = {
      start_date: searchParams.get('start_date'),
      end_date: searchParams.get('end_date')
    }
    
    // Validate query parameters
    const validationResult = AnalyticsQuerySchema.safeParse(queryParams)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Invalid query parameters',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const { start_date, end_date } = validationResult.data
    
    const supabase = await createServerSupabaseClient()
    
    // Use the database function to get analytics
    const { data: analyticsResult, error: analyticsError  } = await supabase
      .rpc('get_booking_analytics', {
        p_teacher_id: teacher_id,
        p_start_date: start_date || null,
        p_end_date: end_date || null
      })
    
    if (analyticsError) {
      console.error('❌ Analytics error:', analyticsError)
      return NextResponse.json({ 
        error: 'Failed to fetch analytics',
        details: analyticsError.message
      }, { status: 500 })
    }
    
    if (!analyticsResult) {
      return NextResponse.json({ 
        error: 'No analytics data available'
      }, { status: 404 })
    }
    
    console.log('✅ Analytics fetched successfully')
    
    // Get additional metrics not covered by the main function
    const { data: upcomingBookings, error: upcomingError  } = await supabase
      .from('bookings')
      .select(`
        *,
        student:profiles!bookings_student_id_fkey(full_name, email)
      `)
      .eq('teacher_id', teacher_id)
      .eq('status', 'confirmed')
      .gte('booking_date', new Date().toISOString().split('T')[0])
      .order('booking_date', { ascending: true })
      .limit(10)
    void upcomingError
    
    // Get recent completed classes with booking integration
    const { data: recentClasses, error: classesError  } = await supabase
      .from('class_logs')
      .select(`
        *,
        booking:bookings(
          *,
          student:profiles!bookings_student_id_fkey(full_name, email)
        )
      `)
      .eq('teacher_id', teacher_id)
      .not('booking_id', 'is', null)
      .eq('status', 'completed')
      .order('end_time', { ascending: false })
      .limit(10)
    void classesError
    
    return NextResponse.json({
      success: true,
      analytics: analyticsResult,
      upcoming_bookings: upcomingBookings || [],
      recent_booked_classes: recentClasses || [],
      metadata: {
        teacher_id,
        generated_at: new Date().toISOString(),
        period: {
          start_date: start_date || 'default',
          end_date: end_date || 'default'
        }
      }
    })
  } catch (error) {
    console.error('❌ Booking analytics API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
