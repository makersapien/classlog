import { Database } from '@/types/database'

type Booking = Database['public']['Tables']['bookings']['Row']
type TimeSlot = Database['public']['Tables']['time_slots']['Row']
type StudentProfile = Database['public']['Tables']['profiles']['Row']
type TeacherProfile = Database['public']['Tables']['profiles']['Row']

export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

export interface EmailNotificationData {
  booking: Booking
  student: StudentProfile
  teacher: TeacherProfile
  timeSlot: TimeSlot
}

export interface EmailService {
  sendEmail(to: string, template: EmailTemplate): Promise<boolean>
}

// Mock email service for development - replace with actual service in production
class MockEmailService implements EmailService {
  async sendEmail(to: string, template: EmailTemplate): Promise<boolean> {
    console.log('📧 Email would be sent to:', to)
    console.log('📧 Subject:', template.subject)
    console.log('📧 HTML:', template.html)
    console.log('📧 Text:', template.text)
    console.log('---')
    return true
  }
}

// Resend email service implementation
class ResendEmailService implements EmailService {
  private apiKey: string
  private fromEmail: string

  constructor(apiKey: string, fromEmail: string = 'ClassLogger <noreply@classlogger.com>') {
    this.apiKey = apiKey
    this.fromEmail = fromEmail
  }

  async sendEmail(to: string, template: EmailTemplate): Promise<boolean> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: [to],
          subject: template.subject,
          html: template.html,
          text: template.text,
        }),
      })

      if (!response.ok) {
        console.error('Failed to send email:', await response.text())
        return false
      }

      return true
    } catch (error) {
      console.error('Email service error:', error)
      return false
    }
  }
}

// Email service factory
export function createEmailService(): EmailService {
  const resendApiKey = process.env.RESEND_API_KEY
  
  if (resendApiKey) {
    return new ResendEmailService(resendApiKey)
  }
  
  // Fallback to mock service for development
  return new MockEmailService()
}

// Email template generators
export class EmailTemplates {
  static bookingConfirmation(data: EmailNotificationData): EmailTemplate {
    const { booking, student, teacher, timeSlot } = data
    const studentName = student.full_name ?? student.email
    const teacherName = teacher.full_name ?? teacher.email
    const studentSubject =
      (student as { subject?: string | null }).subject ?? 'General'
    const bookingDate = new Date(booking.booking_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    const startTime = new Date(`2000-01-01T${timeSlot.start_time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
    const endTime = new Date(`2000-01-01T${timeSlot.end_time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })

    const subject = `Class Booking Confirmed - ${bookingDate} at ${startTime}`
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking Confirmation</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-label { font-weight: bold; color: #6b7280; }
            .detail-value { color: #111827; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
            .button { background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Class Booking Confirmed!</h1>
            </div>
            <div class="content">
              <p>Hi ${studentName},</p>
              <p>Your class booking has been confirmed! Here are the details:</p>
              
              <div class="booking-details">
                <div class="detail-row">
                  <span class="detail-label">Teacher:</span>
                  <span class="detail-value">${teacherName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Date:</span>
                  <span class="detail-value">${bookingDate}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Time:</span>
                  <span class="detail-value">${startTime} - ${endTime}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Subject:</span>
                  <span class="detail-value">${studentSubject}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Booking ID:</span>
                  <span class="detail-value">${booking.id}</span>
                </div>
              </div>

              <p><strong>Important Notes:</strong></p>
              <ul>
                <li>Please join the class on time</li>
                <li>If you need to cancel, please do so at least 24 hours in advance</li>
                <li>Contact your teacher if you have any questions</li>
              </ul>

              <div class="footer">
                <p>This is an automated message from ClassLogger</p>
                <p>If you have any questions, please contact your teacher directly</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `

    const text = `
Class Booking Confirmed!

Hi ${studentName},

Your class booking has been confirmed! Here are the details:

Teacher: ${teacherName}
Date: ${bookingDate}
Time: ${startTime} - ${endTime}
Subject: ${studentSubject}
Booking ID: ${booking.id}

Important Notes:
- Please join the class on time
- If you need to cancel, please do so at least 24 hours in advance
- Contact your teacher if you have any questions

This is an automated message from ClassLogger.
If you have any questions, please contact your teacher directly.
    `

    return { subject, html, text }
  }

  static bookingCancellation(data: EmailNotificationData): EmailTemplate {
    const { booking, student, teacher, timeSlot } = data
    const studentName = student.full_name ?? student.email
    const teacherName = teacher.full_name ?? teacher.email
    const bookingDate = new Date(booking.booking_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    const startTime = new Date(`2000-01-01T${timeSlot.start_time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })

    const subject = `Class Booking Cancelled - ${bookingDate} at ${startTime}`
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking Cancellation</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-label { font-weight: bold; color: #6b7280; }
            .detail-value { color: #111827; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>❌ Class Booking Cancelled</h1>
            </div>
            <div class="content">
              <p>Hi ${studentName},</p>
              <p>Your class booking has been cancelled. Here are the details:</p>
              
              <div class="booking-details">
                <div class="detail-row">
                  <span class="detail-label">Teacher:</span>
                  <span class="detail-value">${teacherName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Date:</span>
                  <span class="detail-value">${bookingDate}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Time:</span>
                  <span class="detail-value">${startTime}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Cancelled At:</span>
                  <span class="detail-value">${new Date(booking.cancelled_at!).toLocaleString()}</span>
                </div>
              </div>

              <p>The time slot is now available for rebooking. You can schedule a new class through your booking portal.</p>

              <div class="footer">
                <p>This is an automated message from ClassLogger</p>
                <p>If you have any questions, please contact your teacher directly</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `

    const text = `
Class Booking Cancelled

Hi ${studentName},

Your class booking has been cancelled. Here are the details:

Teacher: ${teacherName}
Date: ${bookingDate}
Time: ${startTime}
Cancelled At: ${new Date(booking.cancelled_at!).toLocaleString()}

The time slot is now available for rebooking. You can schedule a new class through your booking portal.

This is an automated message from ClassLogger.
If you have any questions, please contact your teacher directly.
    `

    return { subject, html, text }
  }

  static classReminder24h(data: EmailNotificationData): EmailTemplate {
    const { booking, student, teacher, timeSlot } = data
    const studentName = student.full_name ?? student.email
    const teacherName = teacher.full_name ?? teacher.email
    const studentSubject =
      (student as { subject?: string | null }).subject ?? 'General'
    const bookingDate = new Date(booking.booking_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    const startTime = new Date(`2000-01-01T${timeSlot.start_time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })

    const subject = `Class Reminder: Tomorrow at ${startTime} with ${teacherName}`
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Class Reminder</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-label { font-weight: bold; color: #6b7280; }
            .detail-value { color: #111827; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏰ Class Reminder - 24 Hours</h1>
            </div>
            <div class="content">
              <p>Hi ${studentName},</p>
              <p>This is a friendly reminder that you have a class scheduled for tomorrow:</p>
              
              <div class="booking-details">
                <div class="detail-row">
                  <span class="detail-label">Teacher:</span>
                  <span class="detail-value">${teacherName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Date:</span>
                  <span class="detail-value">${bookingDate}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Time:</span>
                  <span class="detail-value">${startTime}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Subject:</span>
                  <span class="detail-value">${studentSubject}</span>
                </div>
              </div>

              <p><strong>Preparation Tips:</strong></p>
              <ul>
                <li>Prepare any materials or questions you want to discuss</li>
                <li>Test your internet connection and device</li>
                <li>Find a quiet space for the class</li>
                <li>If you need to cancel, please do so as soon as possible</li>
              </ul>

              <div class="footer">
                <p>This is an automated reminder from ClassLogger</p>
                <p>Looking forward to seeing you in class!</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `

    const text = `
Class Reminder - 24 Hours

Hi ${studentName},

This is a friendly reminder that you have a class scheduled for tomorrow:

Teacher: ${teacherName}
Date: ${bookingDate}
Time: ${startTime}
Subject: ${studentSubject}

Preparation Tips:
- Prepare any materials or questions you want to discuss
- Test your internet connection and device
- Find a quiet space for the class
- If you need to cancel, please do so as soon as possible

This is an automated reminder from ClassLogger.
Looking forward to seeing you in class!
    `

    return { subject, html, text }
  }

  static classReminder1h(data: EmailNotificationData): EmailTemplate {
    const { booking, student, teacher, timeSlot } = data
    const studentName = student.full_name ?? student.email
    const teacherName = teacher.full_name ?? teacher.email
    const studentSubject =
      (student as { subject?: string | null }).subject ?? 'General'
    void booking
    const startTime = new Date(`2000-01-01T${timeSlot.start_time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })

    const subject = `Class Starting Soon: ${startTime} with ${teacherName}`
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Class Starting Soon</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-label { font-weight: bold; color: #6b7280; }
            .detail-value { color: #111827; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
            .urgent { background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚀 Class Starting in 1 Hour!</h1>
            </div>
            <div class="content">
              <p>Hi ${studentName},</p>
              
              <div class="urgent">
                <strong>Your class with ${teacherName} starts in 1 hour at ${startTime}!</strong>
              </div>
              
              <div class="booking-details">
                <div class="detail-row">
                  <span class="detail-label">Teacher:</span>
                  <span class="detail-value">${teacherName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Time:</span>
                  <span class="detail-value">${startTime}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Subject:</span>
                  <span class="detail-value">${studentSubject}</span>
                </div>
              </div>

              <p><strong>Final Checklist:</strong></p>
              <ul>
                <li>✅ Materials ready</li>
                <li>✅ Internet connection tested</li>
                <li>✅ Quiet space prepared</li>
                <li>✅ Device charged and ready</li>
              </ul>

              <div class="footer">
                <p>See you soon in class!</p>
                <p>This is an automated reminder from ClassLogger</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `

    const text = `
Class Starting in 1 Hour!

Hi ${studentName},

Your class with ${teacherName} starts in 1 hour at ${startTime}!

Teacher: ${teacherName}
Time: ${startTime}
Subject: ${studentSubject}

Final Checklist:
✅ Materials ready
✅ Internet connection tested
✅ Quiet space prepared
✅ Device charged and ready

See you soon in class!
This is an automated reminder from ClassLogger.
    `

    return { subject, html, text }
  }

  static teacherBookingNotification(data: EmailNotificationData): EmailTemplate {
    const { booking, student, teacher, timeSlot } = data
    const studentName = student.full_name ?? student.email
    const teacherName = teacher.full_name ?? teacher.email
    const studentSubject =
      (student as { subject?: string | null }).subject ?? 'General'
    const bookingDate = new Date(booking.booking_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    const startTime = new Date(`2000-01-01T${timeSlot.start_time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
    const endTime = new Date(`2000-01-01T${timeSlot.end_time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })

    const subject = `New Booking: ${studentName} - ${bookingDate} at ${startTime}`
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Booking Notification</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-label { font-weight: bold; color: #6b7280; }
            .detail-value { color: #111827; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
            .button { background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📅 New Class Booking</h1>
            </div>
            <div class="content">
              <p>Hi ${teacherName},</p>
              <p>You have a new class booking from ${studentName}:</p>
              
              <div class="booking-details">
                <div class="detail-row">
                  <span class="detail-label">Student:</span>
                  <span class="detail-value">${studentName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Grade:</span>
                  <span class="detail-value">${student.grade || 'Not specified'}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Subject:</span>
                  <span class="detail-value">${studentSubject}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Date:</span>
                  <span class="detail-value">${bookingDate}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Time:</span>
                  <span class="detail-value">${startTime} - ${endTime}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Booked At:</span>
                  <span class="detail-value">${new Date(booking.booked_at).toLocaleString()}</span>
                </div>
              </div>

              <p>The booking has been automatically confirmed. You can view all your bookings in your ClassLogger dashboard.</p>

              <div class="footer">
                <p>This is an automated notification from ClassLogger</p>
                <p>Manage your bookings at classlogger.com</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `

    const text = `
New Class Booking

Hi ${teacherName},

You have a new class booking from ${studentName}:

Student: ${studentName}
Grade: ${student.grade || 'Not specified'}
Subject: ${studentSubject}
Date: ${bookingDate}
Time: ${startTime} - ${endTime}
Booked At: ${new Date(booking.booked_at).toLocaleString()}

The booking has been automatically confirmed. You can view all your bookings in your ClassLogger dashboard.

This is an automated notification from ClassLogger.
Manage your bookings at classlogger.com
    `

    return { subject, html, text }
  }

  static teacherCancellationNotification(data: EmailNotificationData): EmailTemplate {
    const { booking, student, teacher, timeSlot } = data
    const studentName = student.full_name ?? student.email
    const teacherName = teacher.full_name ?? teacher.email
    const bookingDate = new Date(booking.booking_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    const startTime = new Date(`2000-01-01T${timeSlot.start_time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })

    const subject = `Booking Cancelled: ${studentName} - ${bookingDate} at ${startTime}`
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking Cancellation Notification</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-label { font-weight: bold; color: #6b7280; }
            .detail-value { color: #111827; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>❌ Booking Cancelled</h1>
            </div>
            <div class="content">
              <p>Hi ${teacherName},</p>
              <p>${studentName} has cancelled their class booking:</p>
              
              <div class="booking-details">
                <div class="detail-row">
                  <span class="detail-label">Student:</span>
                  <span class="detail-value">${studentName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Date:</span>
                  <span class="detail-value">${bookingDate}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Time:</span>
                  <span class="detail-value">${startTime}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Cancelled At:</span>
                  <span class="detail-value">${new Date(booking.cancelled_at!).toLocaleString()}</span>
                </div>
              </div>

              <p>The time slot is now available for other students to book. Your schedule has been updated automatically.</p>

              <div class="footer">
                <p>This is an automated notification from ClassLogger</p>
                <p>View your updated schedule at classlogger.com</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `

    const text = `
Booking Cancelled

Hi ${teacherName},

${studentName} has cancelled their class booking:

Student: ${studentName}
Date: ${bookingDate}
Time: ${startTime}
Cancelled At: ${new Date(booking.cancelled_at!).toLocaleString()}

The time slot is now available for other students to book. Your schedule has been updated automatically.

This is an automated notification from ClassLogger.
View your updated schedule at classlogger.com
    `

    return { subject, html, text }
  }
}
