// src/app/api/schedule-slots/bulk-update/route.ts
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse  } from 'next/server'
import { z } from 'zod'

// Validation schema for bulk updates
const BulkUpdateSchema = z.object({
  slot_ids: z.array(z.string().uuid()).min(1).max(50),
  updates: z.object({
    status: z.enum(['unavailable', 'available', 'cancelled']).optional(),
    title: z.string().max(255).optional(),
    subject: z.string().max(100).optional(),
    duration_minutes: z.number().min(15).max(480).optional()
  }).refine(data => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update"
  })
})

// PATCH endpoint to bulk update schedule slots
export async function PATCH(request: NextRequest) {
  try {
    console.log('🔄 Bulk Update Schedule Slots API called')
    
    const { supabase, user } = await createAuthenticatedSupabaseClient()
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    // Get user role
    const { data: profile, error: profileError   } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('❌ Profile error:', profileError)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    
    // Only teachers can bulk update slots
    if (profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can bulk update schedule slots' }, { status: 403 })
    }

    const body = await request.json()
    console.log('📝 Bulk update request:', JSON.stringify(body))
    
    // Validate input
    const validationResult = BulkUpdateSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const { slot_ids, updates } = validationResult.data

    // Verify all slots belong to the teacher
    const { data: slots, error: slotsError   } = await supabase
      .from('schedule_slots')
      .select('id, status, assigned_student_id, booked_by, teacher_id')
      .in('id', slot_ids)
      .eq('teacher_id', user.id)

    if (slotsError) {
      console.error('❌ Slots verification error:', slotsError)
      return NextResponse.json({ 
        error: 'Failed to verify slots',
        details: slotsError.message
      }, { status: 500 })
    }

    if (!slots || slots.length !== slot_ids.length) {
      return NextResponse.json({ 
        error: 'Some slots not found or do not belong to you',
        found: slots?.length || 0,
        requested: slot_ids.length
      }, { status: 404 })
    }

    // Check for conflicts if updating status
    if (updates.status) {
      const conflictSlots = slots.filter(slot => {
        // Can't change status of booked slots
        if (slot.status === 'booked' && slot.booked_by) {
          return true
        }
        // Can't change status of assigned slots (unless making them unavailable)
        if (slot.status === 'assigned' && slot.assigned_student_id && updates.status !== 'unavailable') {
          return true
        }
        return false
      })

      if (conflictSlots.length > 0) {
        return NextResponse.json({ 
          error: 'Cannot update status of booked or assigned slots',
          conflict_slots: conflictSlots.map(s => ({
            id: s.id,
            status: s.status,
            reason: s.status === 'booked' ? 'Slot is booked by a student' : 'Slot is assigned to a student'
          }))
        }, { status: 409 })
      }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      ...updates,
      updated_at: new Date().toISOString()
    }

    // If making slots unavailable, clear assignment data
    if (updates.status === 'unavailable') {
      updateData.assigned_student_id = null
      updateData.assigned_student_name = null
      updateData.assignment_expiry = null
      updateData.assignment_status = null
    }

    // Perform bulk update
    const { data: updatedSlots, error: updateError   } = await supabase
      .from('schedule_slots')
      .update(updateData)
      .in('id', slot_ids)
      .select()

    if (updateError) {
      console.error('❌ Bulk update error:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update slots',
        details: updateError.message
      }, { status: 500 })
    }

    // If we made assigned slots unavailable, we should also update the assignments
    if (updates.status === 'unavailable') {
      const assignedSlots = slots.filter(s => s.status === 'assigned' && s.assigned_student_id)
      if (assignedSlots.length > 0) {
        // Find and expire related assignments
        const { error: assignmentError } = await supabase
          .from('slot_assignments')
          .update({
            status: 'expired',
            expired_at: new Date().toISOString(),
            notes: 'Assignment expired due to slot becoming unavailable'
          })
          .eq('status', 'pending')
          .overlaps('slot_ids', slot_ids)

        if (assignmentError) {
          console.error('❌ Assignment expiry error:', assignmentError)
          // Don't fail the request, just log the error
        }
      }
    }

    console.log('✅ Bulk update completed:', updatedSlots?.length || 0, 'slots updated')

    return NextResponse.json({
      success: true,
      updated_slots: updatedSlots?.length || 0,
      message: `Successfully updated ${updatedSlots?.length || 0} slot(s)`,
      slots: updatedSlots
    })
  } catch (error) {
    console.error('❌ Bulk update API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
