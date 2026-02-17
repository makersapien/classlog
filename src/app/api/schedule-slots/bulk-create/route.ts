// src/app/api/schedule-slots/bulk-create/route.ts
import { NextRequest, NextResponse  } from 'next/server'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-server'

interface SlotInput {
  teacher_id: string
  date: string
  start_time: string
  end_time: string
  duration_minutes: number
  status?: string
  title?: string | null
  description?: string | null
  subject?: string | null
  max_students?: number
  is_recurring?: boolean
  recurrence_type?: string | null
  recurrence_end_date?: string | null
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await createAuthenticatedSupabaseClient()
    const { slots } = await request.json()

    if (!slots || !Array.isArray(slots) || slots.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid slots array' },
        { status: 400 }
      )
    }

    // Verify user is authenticated
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const slotList = slots as SlotInput[]

    // Validate that all slots belong to the authenticated user
    const teacherId = user.id
    const invalidSlots = slotList.filter(slot => slot.teacher_id !== teacherId)
    
    if (invalidSlots.length > 0) {
      return NextResponse.json(
        { error: 'Forbidden: Can only create slots for your own account' },
        { status: 403 }
      )
    }

    // Validate slot data structure
    for (const slot of slotList) {
      if (!slot.date || !slot.start_time || !slot.end_time || !slot.duration_minutes) {
        return NextResponse.json(
          { error: 'Invalid slot data: missing required fields (date, start_time, end_time, duration_minutes)' },
          { status: 400 }
        )
      }
    }

    // Insert all slots in a single transaction
    const { data: createdSlots, error: insertError   } = await supabase
      .from('schedule_slots')
      .insert(slotList.map(slot => ({
        teacher_id: slot.teacher_id,
        date: slot.date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        duration_minutes: slot.duration_minutes,
        status: slot.status || 'available',
        title: slot.title || null,
        description: slot.description || null,
        subject: slot.subject || null,
        max_students: slot.max_students || 1,
        is_recurring: slot.is_recurring || false,
        recurrence_type: slot.recurrence_type || null,
        recurrence_end_date: slot.recurrence_end_date || null
      })))
      .select()

    if (insertError) {
      console.error('Error creating slots:', insertError)
      return NextResponse.json(
        { error: 'Failed to create slots', details: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: `Successfully created ${createdSlots?.length || 0} slots`,
      slots: createdSlots,
      count: createdSlots?.length || 0
    })

  } catch (error) {
    console.error('Error in bulk create:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
