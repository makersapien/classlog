import { NextRequest, NextResponse  } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { notificationService } from '@/lib/notification-service'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results = {
      reminders24h: 0,
      reminders1h: 0,
      weeklySummaries: 0,
      errors: [] as string[]
    }

    // Send 24-hour reminders
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    const { data: bookings24h, error: error24h } = await supabase
      .from('bookings')
      .select('id')
      .eq('booking_date', tomorrowStr)
      .eq('status', 'confirmed')

    if (error24h) {
      results.errors.push(`Failed to fetch 24h reminders: ${error24h.message}`)
    } else if (bookings24h) {
      for (const booking of bookings24h) {
        try {
          const success = await notificationService.sendClassReminder24h(booking.id)
          if (success) {
            results.reminders24h++
          } else {
            results.errors.push(`Failed to send 24h reminder for booking ${booking.id}`)
          }
        } catch (error) {
          results.errors.push(`Error sending 24h reminder for booking ${booking.id}: ${error}`)
        }
      }
    }

    // Send 1-hour reminders
    const oneHourFromNow = new Date()
    oneHourFromNow.setHours(oneHourFromNow.getHours() + 1)
    const currentHour = oneHourFromNow.getHours()
    const todayStr = new Date().toISOString().split('T')[0]

    // Get bookings that start in the next hour
    const { data: bookings1h, error: error1h } = await supabase
      .from('bookings')
      .select(`
        id,
        start_time,
        schedule_slot:schedule_slots(start_time)
      `)
      .eq('booking_date', todayStr)
      .eq('status', 'confirmed')

    if (error1h) {
      results.errors.push(`Failed to fetch 1h reminders: ${error1h.message}`)
    } else if (bookings1h) {
      const reminderBookings = bookings1h as Array<{
        id: string
        start_time?: string | null
        schedule_slot?: { start_time?: string | null } | null
      }>
      for (const booking of reminderBookings) {
        // Use booking start_time directly or from schedule_slot
        const startTime = booking.start_time || booking.schedule_slot?.start_time
        if (startTime) {
          const startHour = parseInt(startTime.split(':')[0])
          
          // Send reminder if class starts in the next hour
          if (startHour === currentHour) {
            try {
              const success = await notificationService.sendClassReminder1h(booking.id)
              if (success) {
                results.reminders1h++
              } else {
                results.errors.push(`Failed to send 1h reminder for booking ${booking.id}`)
              }
            } catch (error) {
              results.errors.push(`Error sending 1h reminder for booking ${booking.id}: ${error}`)
            }
          }
        }
      }
    }

    // Send weekly summaries (only on Sundays)
    const today = new Date()
    if (today.getDay() === 0) { // Sunday
      const { data: teachers, error: teachersError  } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'teacher')

      if (teachersError) {
        results.errors.push(`Failed to fetch teachers: ${teachersError.message}`)
      } else if (teachers) {
        for (const teacher of teachers) {
          try {
            const success = await notificationService.sendWeeklySummary(teacher.id)
            if (success) {
              results.weeklySummaries++
            }
            // Don't count as error if teacher has no bookings
          } catch (error) {
            results.errors.push(`Error sending weekly summary for teacher ${teacher.id}: ${error}`)
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
