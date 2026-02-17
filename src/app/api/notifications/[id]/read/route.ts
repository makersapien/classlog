import { NextRequest, NextResponse  } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables.')
  }

  return createClient<Database>(supabaseUrl, supabaseKey)
}

// PATCH - Mark notification as read
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    void request
    const { error } = await getSupabaseClient()
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('Failed to mark notification as read:', error)
      return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Mark notification read error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
