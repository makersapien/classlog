import { NextRequest, NextResponse  } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { z } from 'zod'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables.')
  }

  return createClient<Database>(supabaseUrl, supabaseKey)
}

const CreateNotificationSchema = z.object({
  userId: z.string().uuid(),
  userRole: z.enum(['teacher', 'student', 'parent']),
  type: z.enum(['booking_created', 'booking_cancelled', 'class_reminder', 'system', 'booking_activity']),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(500),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  data: z.object({
    bookingId: z.string().uuid().optional(),
    studentName: z.string().optional(),
    teacherName: z.string().optional(),
    classTime: z.string().optional(),
    classDate: z.string().optional()
  }).optional()
})

// GET - Fetch notifications for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const userRole = searchParams.get('role')
    const limit = parseInt(searchParams.get('limit') || '50')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    if (!userId || !userRole) {
      return NextResponse.json({ error: 'userId and role are required' }, { status: 400 })
    }

    let query = getSupabaseClient()
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('user_role', userRole)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (unreadOnly) {
      query = query.eq('read', false)
    }

    const { data: notifications, error } = await query

    if (error) {
      console.error('Failed to fetch notifications:', error)
      
      // If the table doesn't exist, return empty array instead of error
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        console.warn('Notifications table does not exist, returning empty array')
        return NextResponse.json({ notifications: [] })
      }
      
      // For other errors, return empty array to prevent UI breaking
      return NextResponse.json({ notifications: [] })
    }

    // Transform data to match frontend interface
    const transformedNotifications = notifications?.map(notification => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      timestamp: new Date(notification.created_at),
      read: notification.read,
      priority: notification.priority,
      data: notification.data
    })) || []

    return NextResponse.json({ notifications: transformedNotifications })
  } catch (error) {
    console.error('Notifications API error:', error)
    // Return empty array instead of error to prevent UI breaking
    return NextResponse.json({ notifications: [] })
  }
}

// POST - Create a new notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = CreateNotificationSchema.parse(body)

    const { data: notification, error } = await getSupabaseClient()
      .from('notifications')
      .insert({
        user_id: validatedData.userId,
        user_role: validatedData.userRole,
        type: validatedData.type,
        title: validatedData.title,
        message: validatedData.message,
        priority: validatedData.priority,
        data: validatedData.data || null,
        read: false
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create notification:', error)
      return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      notification: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        timestamp: new Date(notification.created_at),
        read: notification.read,
        priority: notification.priority,
        data: notification.data
      }
    })
  } catch (error) {
    console.error('Create notification error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
