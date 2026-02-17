// src/app/api/schedule-slots/[id]/route.ts
import { NextRequest, NextResponse  } from 'next/server'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-server'

// PATCH endpoint to update a specific schedule slot
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const { supabase, user } = await createAuthenticatedSupabaseClient()
    const { status } = await request.json()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!id) {
      return NextResponse.json(
        { error: 'Missing slot ID' },
        { status: 400 }
      )
    }

    if (!status) {
      return NextResponse.json(
        { error: 'Missing status field' },
        { status: 400 }
      )
    }

    // Validate status value
    const validStatuses = ['unavailable', 'available', 'assigned', 'booked', 'cancelled', 'completed']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      )
    }

    console.log(`🔄 Updating slot ${id} to status: ${status}`)

    // First, get the existing slot to verify ownership
    const { data: existingSlot, error: fetchError  } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingSlot) {
      console.error('❌ Slot not found:', fetchError)
      return NextResponse.json(
        { error: 'Slot not found' },
        { status: 404 }
      )
    }

    // Verify the slot belongs to the authenticated user
    if (existingSlot.teacher_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: Can only update your own slots' },
        { status: 403 }
      )
    }

    // Prevent modification of booked or assigned slots to unavailable
    if (status === 'unavailable' && (existingSlot.status === 'booked' || existingSlot.status === 'assigned')) {
      return NextResponse.json(
        { error: 'Cannot make booked or assigned slots unavailable' },
        { status: 400 }
      )
    }

    // Update the slot status
    const { data: updatedSlot, error: updateError  } = await supabase
      .from('schedule_slots')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Error updating slot:', updateError)
      return NextResponse.json(
        { error: 'Failed to update slot', details: updateError.message },
        { status: 500 }
      )
    }

    console.log('✅ Slot updated successfully:', updatedSlot)

    return NextResponse.json({
      message: 'Slot updated successfully',
      slot: updatedSlot
    })

  } catch (error) {
    console.error('❌ Error in slot update:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE endpoint to delete a specific schedule slot
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const { supabase, user } = await createAuthenticatedSupabaseClient()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!id) {
      return NextResponse.json(
        { error: 'Missing slot ID' },
        { status: 400 }
      )
    }

    console.log(`🔄 Deleting slot ${id}`)

    // First, get the existing slot to verify ownership
    const { data: existingSlot, error: fetchError  } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingSlot) {
      console.error('❌ Slot not found:', fetchError)
      return NextResponse.json(
        { error: 'Slot not found' },
        { status: 404 }
      )
    }

    // Verify the slot belongs to the authenticated user
    if (existingSlot.teacher_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: Can only delete your own slots' },
        { status: 403 }
      )
    }

    // Prevent deletion of booked slots
    if (existingSlot.status === 'booked') {
      return NextResponse.json(
        { error: 'Cannot delete booked slots' },
        { status: 400 }
      )
    }

    // Delete the slot
    const { error: deleteError } = await supabase
      .from('schedule_slots')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('❌ Error deleting slot:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete slot', details: deleteError.message },
        { status: 500 }
      )
    }

    console.log('✅ Slot deleted successfully')

    return NextResponse.json({
      message: 'Slot deleted successfully'
    })

  } catch (error) {
    console.error('❌ Error in slot deletion:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
