import { createEmailService, EmailTemplates, type EmailNotificationData } from './email-service'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export class NotificationService {
  private emailService = createEmailService()

  async getUserPreferences(userId: string, userRole: 'teacher' | 'student' | 'parent') {
    try {
      const { data: preferences, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .eq('user_role', userRole)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Failed to fetch user preferences:', error)
        return null
      }

      // Return default preferences if none exist
      if (!preferences) {
        return {
          email_booking_confirmation: true,
          email_booking_cancellation: true,
          email_class_reminders: true,
          email_weekly_summary: userRole === 'teacher',
          inapp_booking_activity: true,
          inapp_class_reminders: true,
          inapp_system_notifications: true,
          reminder_24h_enabled: true,
          reminder_1h_enabled: true
        }
      }

      return preferences
    } catch (error) {
      console.error('Error fetching user preferences:', error)
      return null
    }
  }

  async createInAppNotification(
    userId: string,
    userRole: 'teacher' | 'student' | 'parent',
    type: 'booking_created' | 'booking_cancelled' | 'class_reminder' | 'system' | 'booking_activity',
    title: string,
    message: string,
    priority: 'low' | 'medium' | 'high' = 'medium',
    data?: unknown
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .rpc('create_booking_notification', {
          p_user_id: userId,
          p_user_role: userRole,
          p_type: type,
          p_title: title,
          p_message: message,
          p_priority: priority,
          p_data: data || null
        })

      if (error) {
        console.error('Failed to create in-app notification:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error creating in-app notification:', error)
      return false
    }
  }

  async sendBookingConfirmation(bookingId: string): Promise<boolean> {
    try {
      const data = await this.getBookingNotificationData(bookingId)
      if (!data) return false

      const studentName = data.student.full_name ?? data.student.email
      const teacherName = data.teacher.full_name ?? data.teacher.email

      // Get user preferences
      const studentPrefs = await this.getUserPreferences(data.student.id, 'student')
      const teacherPrefs = await this.getUserPreferences(data.teacher.id, 'teacher')

      let studentEmailSuccess = true
      let teacherEmailSuccess = true
      let studentInAppSuccess = true
      let teacherInAppSuccess = true

      // Send email to student if enabled
      if (studentPrefs?.email_booking_confirmation) {
        const template = EmailTemplates.bookingConfirmation(data)
        studentEmailSuccess = await this.emailService.sendEmail(
          data.student.email || '',
          template
        )
      }

      // Send email notification to teacher if enabled
      if (teacherPrefs?.email_booking_confirmation) {
        const teacherTemplate = EmailTemplates.teacherBookingNotification(data)
        teacherEmailSuccess = await this.emailService.sendEmail(
          data.teacher.email || '',
          teacherTemplate
        )
      }

      // Create in-app notifications if enabled
      const bookingDate = new Date(data.booking.booking_date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      })
      const startTime = new Date(`2000-01-01T${data.timeSlot.start_time}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })

      // Student in-app notification
      if (studentPrefs?.inapp_booking_activity) {
        studentInAppSuccess = await this.createInAppNotification(
          data.student.id,
          'student',
          'booking_created',
          'Class Booking Confirmed',
          `Your class with ${teacherName} on ${bookingDate} at ${startTime} has been confirmed.`,
          'medium',
          {
            bookingId: data.booking.id,
            teacherName,
            classDate: bookingDate,
            classTime: startTime
          }
        )
      }

      // Teacher in-app notification
      if (teacherPrefs?.inapp_booking_activity) {
        teacherInAppSuccess = await this.createInAppNotification(
          data.teacher.id,
          'teacher',
          'booking_activity',
          'New Class Booking',
          `${studentName} has booked a class on ${bookingDate} at ${startTime}.`,
          'medium',
          {
            bookingId: data.booking.id,
            studentName,
            classDate: bookingDate,
            classTime: startTime
          }
        )
      }

      return studentEmailSuccess && teacherEmailSuccess && studentInAppSuccess && teacherInAppSuccess
    } catch (error) {
      console.error('Failed to send booking confirmation:', error)
      return false
    }
  }

  async sendBookingCancellation(bookingId: string): Promise<boolean> {
    try {
      const data = await this.getBookingNotificationData(bookingId)
      if (!data) return false

      const studentName = data.student.full_name ?? data.student.email
      const teacherName = data.teacher.full_name ?? data.teacher.email

      const template = EmailTemplates.bookingCancellation(data)
      
      // Send email to student
      const studentEmailSuccess = await this.emailService.sendEmail(
        data.student.email || '',
        template
      )

      // Send email notification to teacher
      const teacherTemplate = EmailTemplates.teacherCancellationNotification(data)
      const teacherEmailSuccess = await this.emailService.sendEmail(
        data.teacher.email || '',
        teacherTemplate
      )

      // Create in-app notifications
      const bookingDate = new Date(data.booking.booking_date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      })
      const startTime = new Date(`2000-01-01T${data.timeSlot.start_time}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })

      // Student notification
      const studentInAppSuccess = await this.createInAppNotification(
        data.student.id,
        'student',
        'booking_cancelled',
        'Class Booking Cancelled',
        `Your class with ${teacherName} on ${bookingDate} at ${startTime} has been cancelled.`,
        'medium',
        {
          bookingId: data.booking.id,
          teacherName,
          classDate: bookingDate,
          classTime: startTime
        }
      )

      // Teacher notification
      const teacherInAppSuccess = await this.createInAppNotification(
        data.teacher.id,
        'teacher',
        'booking_activity',
        'Class Booking Cancelled',
        `${studentName} has cancelled their class on ${bookingDate} at ${startTime}.`,
        'medium',
        {
          bookingId: data.booking.id,
          studentName,
          classDate: bookingDate,
          classTime: startTime
        }
      )

      return studentEmailSuccess && teacherEmailSuccess && studentInAppSuccess && teacherInAppSuccess
    } catch (error) {
      console.error('Failed to send booking cancellation:', error)
      return false
    }
  }

  async sendClassReminder24h(bookingId: string): Promise<boolean> {
    try {
      const data = await this.getBookingNotificationData(bookingId)
      if (!data) return false

      // Get user preferences
      const studentPrefs = await this.getUserPreferences(data.student.id, 'student')
      
      // Check if 24h reminders are enabled
      if (!studentPrefs?.reminder_24h_enabled) {
        return true // Skip but don't fail
      }

      let emailSuccess = true
      let inAppSuccess = true

      // Send email reminder if enabled
      if (studentPrefs?.email_class_reminders) {
        const template = EmailTemplates.classReminder24h(data)
        emailSuccess = await this.emailService.sendEmail(
          data.student.email || '',
          template
        )
      }

      // Create in-app notification if enabled
      if (studentPrefs?.inapp_class_reminders) {
        const teacherName = data.teacher.full_name ?? data.teacher.email
        const bookingDate = new Date(data.booking.booking_date).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric'
        })
        const startTime = new Date(`2000-01-01T${data.timeSlot.start_time}`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })

        inAppSuccess = await this.createInAppNotification(
          data.student.id,
          'student',
          'class_reminder',
          'Class Tomorrow',
          `Don't forget your class with ${teacherName} tomorrow at ${startTime}.`,
          'high',
          {
            bookingId: data.booking.id,
            teacherName,
            classDate: bookingDate,
            classTime: startTime
          }
        )
      }

      return emailSuccess && inAppSuccess
    } catch (error) {
      console.error('Failed to send 24h reminder:', error)
      return false
    }
  }

  async sendClassReminder1h(bookingId: string): Promise<boolean> {
    try {
      const data = await this.getBookingNotificationData(bookingId)
      if (!data) return false

      // Get user preferences
      const studentPrefs = await this.getUserPreferences(data.student.id, 'student')
      
      // Check if 1h reminders are enabled
      if (!studentPrefs?.reminder_1h_enabled) {
        return true // Skip but don't fail
      }

      let emailSuccess = true
      let inAppSuccess = true

      // Send email reminder if enabled
      if (studentPrefs?.email_class_reminders) {
        const template = EmailTemplates.classReminder1h(data)
        emailSuccess = await this.emailService.sendEmail(
          data.student.email || '',
          template
        )
      }

      // Create in-app notification if enabled
      if (studentPrefs?.inapp_class_reminders) {
        const teacherName = data.teacher.full_name ?? data.teacher.email
        const startTime = new Date(`2000-01-01T${data.timeSlot.start_time}`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })

        inAppSuccess = await this.createInAppNotification(
          data.student.id,
          'student',
          'class_reminder',
          'Class Starting Soon!',
          `Your class with ${teacherName} starts in 1 hour at ${startTime}.`,
          'high',
          {
            bookingId: data.booking.id,
            teacherName,
            classTime: startTime
          }
        )
      }

      return emailSuccess && inAppSuccess
    } catch (error) {
      console.error('Failed to send 1h reminder:', error)
      return false
    }
  }

  async sendWeeklySummary(teacherId: string): Promise<boolean> {
    try {
      // Get upcoming bookings for the week
      const weekStart = new Date()
      const weekEnd = new Date()
      weekEnd.setDate(weekEnd.getDate() + 7)

      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          *,
          student:profiles!bookings_student_id_fkey(full_name, email, grade, subject),
          teacher:profiles!bookings_teacher_id_fkey(full_name, email),
          time_slot:time_slots(day_of_week, start_time, end_time)
        `)
        .eq('teacher_id', teacherId)
        .eq('status', 'confirmed')
        .gte('booking_date', weekStart.toISOString().split('T')[0])
        .lte('booking_date', weekEnd.toISOString().split('T')[0])
        .order('booking_date', { ascending: true })

      if (error || !bookings || bookings.length === 0) {
        return false
      }

      const teacher = bookings[0].teacher
      if (!teacher?.email) return false
      const teacherName = teacher.full_name ?? teacher.email

      const subject = `Weekly Class Summary - ${bookings.length} upcoming classes`
      
      const bookingsList = bookings.map(booking => {
        const date = new Date(booking.booking_date).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        })
        const time = new Date(`2000-01-01T${booking.time_slot?.start_time}`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
        const studentName = booking.student?.full_name ?? booking.student?.email ?? 'Student'
        const studentSubject =
          (booking.student as { subject?: string | null } | null | undefined)?.subject ?? 'General'
        return `• ${date} at ${time} - ${studentName} (${studentSubject})`
      }).join('\n')

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Weekly Class Summary</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
              .booking-list { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .booking-item { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
              .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>📊 Weekly Class Summary</h1>
              </div>
              <div class="content">
                <p>Hi ${teacherName},</p>
                <p>Here's your upcoming class schedule for this week:</p>
                
                <div class="booking-list">
                  <h3>Upcoming Classes (${bookings.length})</h3>
                  ${bookings.map(booking => {
                    const date = new Date(booking.booking_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric'
                    })
                    const time = new Date(`2000-01-01T${booking.time_slot?.start_time}`).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })
                    return `
                      <div class="booking-item">
                        <strong>${date} at ${time}</strong><br>
                        Student: ${booking.student?.full_name ?? booking.student?.email ?? 'Student'}<br>
                        Subject: ${(booking.student as { subject?: string | null } | null | undefined)?.subject ?? 'General'}
                      </div>
                    `
                  }).join('')}
                </div>

                <p>Have a great week of teaching!</p>

                <div class="footer">
                  <p>This is an automated summary from ClassLogger</p>
                  <p>Manage your schedule at classlogger.com</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `

      const text = `
Weekly Class Summary

Hi ${teacherName},

Here's your upcoming class schedule for this week:

Upcoming Classes (${bookings.length}):
${bookingsList}

Have a great week of teaching!

This is an automated summary from ClassLogger.
Manage your schedule at classlogger.com
      `

      return await this.emailService.sendEmail(teacher.email, { subject, html, text })
    } catch (error) {
      console.error('Failed to send weekly summary:', error)
      return false
    }
  }

  private async getBookingNotificationData(bookingId: string): Promise<EmailNotificationData | null> {
    try {
      const { data: booking, error } = await supabase
        .from('bookings')
        .select(`
          *,
          student:profiles!bookings_student_id_fkey(full_name, email, grade, subject),
          teacher:profiles!bookings_teacher_id_fkey(full_name, email),
          time_slot:time_slots(day_of_week, start_time, end_time)
        `)
        .eq('id', bookingId)
        .single()

      if (error || !booking) {
        console.error('Failed to fetch booking data:', error)
        return null
      }

      if (!booking.student || !booking.teacher || !booking.time_slot) {
        console.error('Missing related data for booking:', bookingId)
        return null
      }

      return {
        booking: booking as EmailNotificationData['booking'],
        student: booking.student as EmailNotificationData['student'],
        teacher: booking.teacher as EmailNotificationData['teacher'],
        timeSlot: booking.time_slot as EmailNotificationData['timeSlot']
      }
    } catch (error) {
      console.error('Error fetching booking notification data:', error)
      return null
    }
  }
}

// Singleton instance
export const notificationService = new NotificationService()

// Helper functions for easy use in API routes
export async function sendBookingConfirmationEmail(bookingId: string) {
  return await notificationService.sendBookingConfirmation(bookingId)
}

export async function sendBookingCancellationEmail(bookingId: string) {
  return await notificationService.sendBookingCancellation(bookingId)
}

export async function sendClassReminder24hEmail(bookingId: string) {
  return await notificationService.sendClassReminder24h(bookingId)
}

export async function sendClassReminder1hEmail(bookingId: string) {
  return await notificationService.sendClassReminder1h(bookingId)
}

export async function sendWeeklySummaryEmail(teacherId: string) {
  return await notificationService.sendWeeklySummary(teacherId)
}

// Send class start notification for booked classes
export async function sendClassStartNotification(classLogId: string) {
  try {
    const { data: classLog, error } = await supabase
      .from('class_logs')
      .select(`
        *,
        booking:bookings(
          *,
          student:profiles!bookings_student_id_fkey(full_name, email),
          teacher:profiles!bookings_teacher_id_fkey(full_name, email)
        )
      `)
      .eq('id', classLogId)
      .single()

    if (error || !classLog || !classLog.booking) {
      console.log('No booking found for class log, skipping start notification')
      return false
    }

    const booking = classLog.booking
    const startTime = new Date(classLog.start_time)
    const formattedTime = startTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })

    const emailService = createEmailService()

    // Send notification to student
    const success = await emailService.sendEmail(booking.student.email, {
      subject: `Your class has started - ${booking.teacher.full_name}`,
      html: `
        <h2>Your class session has begun!</h2>
        <p>Dear ${booking.student.full_name},</p>
        <p>Your booked class with ${booking.teacher.full_name} has started at ${formattedTime}.</p>
        <p>Please join the class if you haven't already.</p>
        <p>Best regards,<br>ClassLogger Team</p>
      `,
      text: `Your class session has begun! Your booked class with ${booking.teacher.full_name} has started at ${formattedTime}. Please join the class if you haven't already.`
    })

    console.log('Class start notification sent successfully')
    return success
  } catch (error) {
    console.error('Error sending class start notification:', error)
    return false
  }
}

// Send class completion notification for booked classes
export async function sendClassCompletionNotification(classLogId: string) {
  try {
    const { data: classLog, error } = await supabase
      .from('class_logs')
      .select(`
        *,
        booking:bookings(
          *,
          student:profiles!bookings_student_id_fkey(full_name, email),
          teacher:profiles!bookings_teacher_id_fkey(full_name, email)
        )
      `)
      .eq('id', classLogId)
      .single()

    if (error || !classLog || !classLog.booking) {
      console.log('No booking found for class log, skipping completion notification')
      return false
    }

    const booking = classLog.booking
    const duration = classLog.duration_minutes
    const durationText = duration ? `${Math.floor(duration / 60)}h ${duration % 60}m` : 'N/A'

    const emailService = createEmailService()

    // Send notification to student
    const studentSuccess = await emailService.sendEmail(booking.student.email, {
      subject: `Class completed - ${booking.teacher.full_name}`,
      html: `
        <h2>Your class session is complete!</h2>
        <p>Dear ${booking.student.full_name},</p>
        <p>Your class with ${booking.teacher.full_name} has been completed.</p>
        <ul>
          <li><strong>Duration:</strong> ${durationText}</li>
          <li><strong>Topics covered:</strong> ${classLog.topics_covered?.length || 0} topics</li>
          ${classLog.homework_assigned ? `<li><strong>Homework:</strong> ${classLog.homework_assigned}</li>` : ''}
        </ul>
        <p>Thank you for attending the class!</p>
        <p>Best regards,<br>ClassLogger Team</p>
      `,
      text: `Your class session is complete! Your class with ${booking.teacher.full_name} has been completed. Duration: ${durationText}. Topics covered: ${classLog.topics_covered?.length || 0} topics.`
    })

    // Send notification to teacher
    const teacherSuccess = await emailService.sendEmail(booking.teacher.email, {
      subject: `Class completed - ${booking.student.full_name}`,
      html: `
        <h2>Class session completed!</h2>
        <p>Dear ${booking.teacher.full_name},</p>
        <p>Your class with ${booking.student.full_name} has been completed and logged.</p>
        <ul>
          <li><strong>Duration:</strong> ${durationText}</li>
          <li><strong>Topics covered:</strong> ${classLog.topics_covered?.length || 0} topics</li>
          ${classLog.homework_assigned ? `<li><strong>Homework assigned:</strong> ${classLog.homework_assigned}</li>` : ''}
        </ul>
        <p>Credits have been automatically deducted from the student's account.</p>
        <p>Best regards,<br>ClassLogger Team</p>
      `,
      text: `Class session completed! Your class with ${booking.student.full_name} has been completed and logged. Duration: ${durationText}. Credits have been automatically deducted.`
    })

    console.log('Class completion notifications sent successfully')
    return studentSuccess && teacherSuccess
  } catch (error) {
    console.error('Error sending class completion notifications:', error)
    return false
  }
}

// Send bulk notifications for auto-started classes
export async function sendBulkClassStartNotifications(processedBookings: unknown[]) {
  try {
    let successCount = 0
    const bookings = processedBookings as Array<{
      session_result?: { success?: boolean; class_log_id?: string }
    }>
    for (const booking of bookings) {
      if (booking.session_result?.success && booking.session_result?.class_log_id) {
        const success = await sendClassStartNotification(booking.session_result.class_log_id)
        if (success) successCount++
      }
    }
    console.log(`Sent bulk start notifications for ${successCount}/${bookings.length} classes`)
    return successCount === bookings.length
  } catch (error) {
    console.error('Error sending bulk class start notifications:', error)
    return false
  }
}
