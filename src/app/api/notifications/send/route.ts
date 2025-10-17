import { NextRequest, NextResponse } from 'next/server'
import { notificationService } from '@/lib/notification-service'
import { z } from 'zod'

const SendNotificationSchema = z.object({
  type: z.enum(['booking_confirmation', 'booking_cancellation', 'reminder_24h', 'reminder_1h', 'weekly_summary']),
  bookingId: z.string().uuid().optional(),
  teacherId: z.string().uuid().optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, bookingId, teacherId } = SendNotificationSchema.parse(body)

    let success = false

    switch (type) {
      case 'booking_confirmation':
        if (!bookingId) {
          return NextResponse.json({ error: 'bookingId required for booking confirmation' }, { status: 400 })
        }
        success = await notificationService.sendBookingConfirmation(bookingId)
        break

      case 'booking_cancellation':
        if (!bookingId) {
          return NextResponse.json({ error: 'bookingId required for booking cancellation' }, { status: 400 })
        }
        success = await notificationService.sendBookingCancellation(bookingId)
        break

      case 'reminder_24h':
        if (!bookingId) {
          return NextResponse.json({ error: 'bookingId required for 24h reminder' }, { status: 400 })
        }
        success = await notificationService.sendClassReminder24h(bookingId)
        break

      case 'reminder_1h':
        if (!bookingId) {
          return NextResponse.json({ error: 'bookingId required for 1h reminder' }, { status: 400 })
        }
        success = await notificationService.sendClassReminder1h(bookingId)
        break

      case 'weekly_summary':
        if (!teacherId) {
          return NextResponse.json({ error: 'teacherId required for weekly summary' }, { status: 400 })
        }
        success = await notificationService.sendWeeklySummary(teacherId)
        break

      default:
        return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 })
    }

    if (success) {
      return NextResponse.json({ success: true, message: 'Notification sent successfully' })
    } else {
      return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
    }
  } catch (error) {
    console.error('Notification API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}