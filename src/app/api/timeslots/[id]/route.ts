// src/app/api/timeslots/[id]/route.ts
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for updates
const UpdateTimeSlotSchema = z.object({
  day_of_week: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']).optional(),
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format').optional(),
  end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format').optional(),
  is_available: z.boolean().optional(),
  is_recurring: z.boolean().optional(),
  recurrence_end_date: z.string().optional(),
  subject: z.string().optional(),
  duration_minutes: z.number().min(15).max(480).optional()
})

// GET endpoint to fetch a specific time slot
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔄 Time Slot GET called for ID:', params.id)
    
    const { supabase, user } = await createAuthenticatedSupabaseClient()
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    // Get user role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('❌ Profile error:', profileError)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    
    // Only teachers can access time slots
    if (profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can access time slots' }, { status: 403 })
    }

    // Get the time slot
    const { data: timeSlot, error: fetchError } = await supabase
      .from('time_slots')
      .select('*')
      .eq('id', params.id)
      .eq('teacher_id', user.id)
      .single()

    if (fetchError) {
      console.error('❌ Fetch error:', fetchError)
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Time slot not found' }, { status: 404 })
      }
      return NextResponse.json({ 
        error: 'Failed to fetch time slot',
        details: fetchError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      time_slot: timeSlot
    })
  } catch (error) {
    console.error('❌ Time slot GET error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// PUT endpoint to update a time slot
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔄 Time Slot PUT called for ID:', params.id)
    
    const { supabase, user } = await createAuthenticatedSupabaseClient()
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    // Get user role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('❌ Profile error:', profileError)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    
    // Only teachers can update time slots
    if (profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can update time slots' }, { status: 403 })
    }

    const body = await request.json()
    console.log('📝 Update body:', JSON.stringify(body))
    
    // Validate input
    const validationResult = UpdateTimeSlotSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const updateData = validationResult.data

    // Get existing time slot to verify ownership
    const { data: existingSlot, error: fetchError } = await supabase
      .from('time_slots')
      .select('*')
      .eq('id', params.id)
      .eq('teacher_id', user.id)
      .single()

    if (fetchError) {
      console.error('❌ Fetch error:', fetchError)
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Time slot not found' }, { status: 404 })
      }
      return NextResponse.json({ 
        error: 'Failed to fetch time slot',
        details: fetchError.message
      }, { status: 500 })
    }

    // Validate time range if both times are being updated
    if (updateData.start_time || updateData.end_time) {
      const startTime = new Date(`1970-01-01T${updateData.start_time || existingSlot.start_time}:00`)
      const endTime = new Date(`1970-01-01T${updateData.end_time || existingSlot.end_time}:00`)
      
      if (startTime >= endTime) {
        return NextResponse.json({ 
          error: 'Start time must be before end time' 
        }, { status: 400 })
      }
    }

    // Check for conflicts if time or day is being changed
    if (updateData.start_time || updateData.end_time || updateData.day_of_week) {
      const checkDay = updateData.day_of_week || existingSlot.day_of_week
      const checkStartTime = updateData.start_time || existingSlot.start_time
      const checkEndTime = updateData.end_time || existingSlot.end_time
      
      const { data: conflictingSlots, error: conflictError } = await supabase
        .from('time_slots')
        .select('*')
        .eq('teacher_id', user.id)
        .eq('day_of_week', checkDay)
        .eq('is_available', true)
        .neq('id', params.id)
      
      if (conflictError) {
        console.error('❌ Conflict check error:', conflictError)
        return NextResponse.json({ 
          error: 'Failed to check for conflicts',
          details: conflictError.message
        }, { status: 500 })
      }

      // Check for time overlaps
      const startTime = new Date(`1970-01-01T${checkStartTime}:00`)
      const endTime = new Date(`1970-01-01T${checkEndTime}:00`)
      
      const hasConflict = conflictingSlots?.some(slot => {
        const existingStart = new Date(`1970-01-01T${slot.start_time}:00`)
        const existingEnd = new Date(`1970-01-01T${slot.end_time}:00`)
        
        return (
          (startTime >= existingStart && startTime < existingEnd) ||
          (endTime > existingStart && endTime <= existingEnd) ||
          (startTime <= existingStart && endTime >= existingEnd)
        )
      })

      if (hasConflict) {
        return NextResponse.json({ 
          error: 'Updated time slot conflicts with existing availability',
          code: 'TIME_CONFLICT'
        }, { status: 409 })
      }
    }

    // Update the time slot
    const { data: updatedSlot, error: updateError } = await supabase
      .from('time_slots')
      .update(updateData)
      .eq('id', params.id)
      .eq('teacher_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Update error:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update time slot',
        details: updateError.message
      }, { status: 500 })
    }

    console.log('✅ Time slot updated:', updatedSlot.id)

    return NextResponse.json({
      success: true,
      time_slot: updatedSlot
    })
  } catch (error) {
    console.error('❌ Time slot PUT error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE endpoint to remove a time slot
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔄 Time Slot DELETE called for ID:', params.id)
    
    const { supabase, user } = await createAuthenticatedSupabaseClient()
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    // Get user role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('❌ Profile error:', profileError)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    
    // Only teachers can delete time slots
    if (profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can delete time slots' }, { status: 403 })
    }

    // Check if time slot exists and belongs to teacher
    const { data: existingSlot, error: fetchError } = await supabase
      .from('time_slots')
      .select('*')
      .eq('id', params.id)
      .eq('teacher_id', user.id)
      .single()

    if (fetchError) {
      console.error('❌ Fetch error:', fetchError)
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Time slot not found' }, { status: 404 })
      }
      return NextResponse.json({ 
        error: 'Failed to fetch time slot',
        details: fetchError.message
      }, { status: 500 })
    }

    // Check if there are any future schedule slots based on this time slot
    const { data: relatedScheduleSlots, error: scheduleError } = await supabase
      .from('schedule_slots')
      .select('id, date, status')
      .eq('teacher_id', user.id)
      .gte('date', new Date().toISOString().split('T')[0])
      .eq('start_time', existingSlot.start_time)
      .eq('end_time', existingSlot.end_time)
      .in('status', ['available', 'booked'])

    if (scheduleError) {
      console.error('❌ Schedule check error:', scheduleError)
      return NextResponse.json({ 
        error: 'Failed to check related schedule slots',
        details: scheduleError.message
      }, { status: 500 })
    }

    // If there are related schedule slots, ask for confirmation
    if (relatedScheduleSlots && relatedScheduleSlots.length > 0) {
      const { searchParams } = new URL(request.url)
      const forceDelete = searchParams.get('force') === 'true'
      
      if (!forceDelete) {
        return NextResponse.json({ 
          error: 'Time slot has related schedule slots',
          code: 'HAS_RELATED_SLOTS',
          related_slots: relatedScheduleSlots,
          message: 'Add ?force=true to delete anyway'
        }, { status: 409 })
      }
    }

    // Delete the time slot
    const { error: deleteError } = await supabase
      .from('time_slots')
      .delete()
      .eq('id', params.id)
      .eq('teacher_id', user.id)

    if (deleteError) {
      console.error('❌ Delete error:', deleteError)
      return NextResponse.json({ 
        error: 'Failed to delete time slot',
        details: deleteError.message
      }, { status: 500 })
    }

    console.log('✅ Time slot deleted:', params.id)

    return NextResponse.json({
      success: true,
      message: 'Time slot deleted successfully',
      deleted_id: params.id
    })
  } catch (error) {
    console.error('❌ Time slot DELETE error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}