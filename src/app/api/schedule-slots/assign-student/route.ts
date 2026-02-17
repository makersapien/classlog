// src/app/api/schedule-slots/assign-student/route.ts
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse  } from 'next/server'
import { z } from 'zod'

// Validation schema for student assignment
const AssignStudentSchema = z.object({
  slot_ids: z.array(z.string().uuid()).min(1).max(10),
  student_id: z.string().uuid(),
  expires_in_hours: z.number().min(1).max(168).default(24) // Default 24 hours, max 1 week
})

// POST endpoint to assign available slots to a student
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Assign Student to Slots API called')
    
    const { supabase, user } = await createAuthenticatedSupabaseClient()
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    // Get user role
    const { data: profile, error: profileError  } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('❌ Profile error:', profileError)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    
    // Only teachers can assign slots
    if (profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can assign slots to students' }, { status: 403 })
    }

    const body = await request.json()
    console.log('📝 Assignment request:', JSON.stringify(body))
    
    // Validate input
    const validationResult = AssignStudentSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const { slot_ids, student_id, expires_in_hours } = validationResult.data

    // Get student information
    const { data: student, error: studentError  } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('id', student_id)
      .eq('role', 'student')
      .single()

    if (studentError || !student) {
      return NextResponse.json({ 
        error: 'Student not found or invalid student ID',
        details: studentError?.message
      }, { status: 404 })
    }

    // Verify all slots belong to the teacher and are available
    const { data: slots, error: slotsError  } = await supabase
      .from('schedule_slots')
      .select('id, status, date, start_time, end_time, teacher_id')
      .in('id', slot_ids)
      .eq('teacher_id', user.id)

    if (slotsError) {
      console.error('❌ Slots fetch error:', slotsError)
      return NextResponse.json({ 
        error: 'Failed to fetch slots',
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

    // Check if all slots are available
    const unavailableSlots = slots.filter(slot => slot.status !== 'available')
    if (unavailableSlots.length > 0) {
      return NextResponse.json({ 
        error: 'Some slots are not available for assignment',
        unavailable_slots: unavailableSlots.map(s => ({
          id: s.id,
          status: s.status,
          date: s.date,
          time: `${s.start_time}-${s.end_time}`
        }))
      }, { status: 409 })
    }

    // Calculate expiry time
    const expiryTime = new Date()
    expiryTime.setHours(expiryTime.getHours() + expires_in_hours)

    // Start transaction to assign slots
    const { data: assignment, error: assignmentError  } = await supabase
      .from('slot_assignments')
      .insert({
        slot_ids,
        teacher_id: user.id,
        student_id,
        student_name: student.full_name || 'Unknown Student',
        status: 'pending',
        expires_at: expiryTime.toISOString(),
        notes: `Assigned ${slot_ids.length} slot(s) to ${student.full_name}`
      })
      .select()
      .single()

    if (assignmentError) {
      console.error('❌ Assignment creation error:', assignmentError)
      return NextResponse.json({ 
        error: 'Failed to create assignment',
        details: assignmentError.message
      }, { status: 500 })
    }

    // Update schedule slots to assigned status
    const { error: updateError } = await supabase
      .from('schedule_slots')
      .update({
        status: 'assigned',
        assigned_student_id: student_id,
        assigned_student_name: student.full_name,
        assignment_expiry: expiryTime.toISOString(),
        assignment_status: 'pending',
        updated_at: new Date().toISOString()
      })
      .in('id', slot_ids)

    if (updateError) {
      console.error('❌ Slots update error:', updateError)
      // Try to rollback the assignment
      await supabase
        .from('slot_assignments')
        .delete()
        .eq('id', assignment.id)
      
      return NextResponse.json({ 
        error: 'Failed to update slots',
        details: updateError.message
      }, { status: 500 })
    }

    // TODO: Send notification to student about assignment
    // This would integrate with the existing notification system

    console.log('✅ Slots assigned successfully:', assignment.id)

    return NextResponse.json({
      success: true,
      assignment: {
        id: assignment.id,
        student_name: student.full_name,
        student_email: student.email,
        slots_assigned: slot_ids.length,
        expires_at: expiryTime.toISOString(),
        status: 'pending'
      },
      message: `Successfully assigned ${slot_ids.length} slot(s) to ${student.full_name}`
    })
  } catch (error) {
    console.error('❌ Assignment API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}