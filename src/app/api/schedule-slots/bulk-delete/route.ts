// src/app/api/schedule-slots/bulk-delete/route.ts
import { NextRequest, NextResponse  } from 'next/server'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-server'

type SlotStatus = 'available' | 'assigned' | 'booked' | 'unavailable'

export async function DELETE(request: NextRequest) {
  try {
    const { supabase, user } = await createAuthenticatedSupabaseClient()
    const { teacher_id, start_date, end_date } = await request.json()

    if (!teacher_id || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'Missing required fields: teacher_id, start_date, end_date' },
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

    // Verify the teacher_id matches the authenticated user
    if (user.id !== teacher_id) {
      return NextResponse.json(
        { error: 'Forbidden: Can only delete your own slots' },
        { status: 403 }
      )
    }

    // First, get all slots to be deleted for notification purposes
    const { data: slotsToDelete, error: fetchError   } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('teacher_id', teacher_id)
      .gte('date', start_date)
      .lte('date', end_date)

    if (fetchError) {
      console.error('Error fetching slots to delete:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch slots for deletion' },
        { status: 500 }
      )
    }

    // Count slots by status for response
    const statusCounts = {
      available: 0,
      assigned: 0,
      booked: 0,
      unavailable: 0
    }

    const slots = slotsToDelete as Array<{ status?: SlotStatus }>

    slots?.forEach(slot => {
      if (slot.status && slot.status in statusCounts) {
        statusCounts[slot.status]++
      }
    })

    // Delete all slots for the specified date range
    const { error: deleteError } = await supabase
      .from('schedule_slots')
      .delete()
      .eq('teacher_id', teacher_id)
      .gte('date', start_date)
      .lte('date', end_date)

    if (deleteError) {
      console.error('Error deleting slots:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete slots' },
        { status: 500 }
      )
    }

    // TODO: Send notifications to students who had assigned/booked slots
    // This would involve:
    // 1. Finding all students with assigned/booked slots
    // 2. Sending them notifications about the cancellation
    // 3. Potentially offering alternative slots

    return NextResponse.json({
      message: `Successfully deleted ${slotsToDelete?.length || 0} slots`,
      deleted_counts: statusCounts,
      total_deleted: slotsToDelete?.length || 0
    })

  } catch (error) {
    console.error('Error in bulk delete:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
