import { NextRequest, NextResponse  } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { z } from 'zod'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const NotificationPreferencesSchema = z.object({
  email_booking_confirmation: z.boolean(),
  email_booking_cancellation: z.boolean(),
  email_class_reminders: z.boolean(),
  email_weekly_summary: z.boolean(),
  inapp_booking_activity: z.boolean(),
  inapp_class_reminders: z.boolean(),
  inapp_system_notifications: z.boolean(),
  reminder_24h_enabled: z.boolean(),
  reminder_1h_enabled: z.boolean()
})

const SavePreferencesSchema = z.object({
  userId: z.string().uuid(),
  userRole: z.enum(['teacher', 'student', 'parent']),
  preferences: NotificationPreferencesSchema
})

// GET - Fetch notification preferences for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const userRole = searchParams.get('role')

    if (!userId || !userRole) {
      return NextResponse.json({ error: 'userId and role are required' }, { status: 400 })
    }

    const { data: preferences, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('user_role', userRole)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Failed to fetch notification preferences:', error)
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 })
    }

    // Return default preferences if none exist
    if (!preferences) {
      const defaultPreferences = {
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
      
      return NextResponse.json({ preferences: defaultPreferences })
    }

    return NextResponse.json({ preferences })
  } catch (error) {
    console.error('Notification preferences GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Save notification preferences for a user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, userRole, preferences } = SavePreferencesSchema.parse(body)

    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: userId,
        user_role: userRole,
        ...preferences,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to save notification preferences:', error)
      return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 })
    }

    return NextResponse.json({ success: true, preferences: data })
  } catch (error) {
    console.error('Save notification preferences error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}