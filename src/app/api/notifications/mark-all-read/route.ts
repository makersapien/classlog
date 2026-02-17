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

const MarkAllReadSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['teacher', 'student', 'parent'])
})

// PATCH - Mark all notifications as read for a user
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, role } = MarkAllReadSchema.parse(body)

    const { error } = await getSupabaseClient()
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('user_role', role)
      .eq('read', false)

    if (error) {
      console.error('Failed to mark all notifications as read:', error)
      return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Mark all notifications read error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
