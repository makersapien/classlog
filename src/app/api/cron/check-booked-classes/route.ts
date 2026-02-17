// src/app/api/cron/match-bookings/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse  } from 'next/server'

// This endpoint should be called by a cron job every hour
// to match completed bookings with actual class sessions
export async function GET(request: NextRequest) {
  try {
    console.log('⏰ Cron job: Matching bookings with completed classes')
    
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      console.error('❌ Unauthorized cron request')
      return NextResponse.json({ 
        error: 'Unauthorized' 
      }, { status: 401 })
    }
    
    // Initialize Supabase client with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Call the database function to match bookings with classes
    const { data: matchResult, error: matchError  } = await supabase
      .rpc('match_bookings_with_classes')
    
    if (matchError) {
      console.error('❌ Error matching bookings with classes:', matchError)
      return NextResponse.json({ 
        error: 'Failed to match bookings with classes',
        details: matchError.message
      }, { status: 500 })
    }
    
    console.log('✅ Matched bookings with classes:', matchResult)
    
    // Call the function to process no-shows
    const { data: noShowResult, error: noShowError  } = await supabase
      .rpc('process_booking_no_shows')
    
    if (noShowError) {
      console.error('❌ Error processing no-shows:', noShowError)
    } else {
      console.log('✅ Processed no-show bookings:', noShowResult)
    }
    
    // Send notifications for matched classes
    if (matchResult.count > 0) {
      try {
        let notificationCount = 0
        for (const booking of matchResult.processed_bookings) {
          if (booking.match_result?.matched && booking.match_result?.class_log_id) {
            const { sendClassCompletionNotification } = await import('@/lib/notification-service')
            await sendClassCompletionNotification(booking.match_result.class_log_id)
            notificationCount++
          }
        }
        console.log(`📧 Sent completion notifications for ${notificationCount} matched classes`)
      } catch (emailError) {
        console.error('⚠️ Failed to send completion notifications:', emailError)
        // Don't fail the cron job if email fails
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Matched ${matchResult.count} bookings, processed ${noShowResult?.count || 0} no-shows`,
      matched_bookings: matchResult.processed_bookings,
      no_show_bookings: noShowResult?.no_show_bookings || [],
      match_count: matchResult.count,
      no_show_count: noShowResult?.count || 0,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Cron job error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request)
}