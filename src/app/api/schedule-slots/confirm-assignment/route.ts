// src/app/api/schedule-slots/confirm-assignment/route.ts
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse  } from 'next/server'
import { z } from 'zod'

// Validation schema for assignment confirmation
const ConfirmAssignmentSchema = z.object({
  assignment_id: z.string().uuid(),
  action: z.enum(['confirm', 'decline']),
  notes: z.string().max(500).optional()
})

// POST endpoint for students to confirm or decline assignments
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Confirm Assignment API called')
    
    const { supabase, user } = await createAuthenticatedSupabaseClient()
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    // Get user role
    const { data: profile, error: profileError  } = await supabase
      .from('profiles')
      .select('role, parent_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('❌ Profile error:', profileError)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    
    // Only students and parents can confirm assignments
    if (!['student', 'parent'].includes(profile.role)) {
      return NextResponse.json({ error: 'Only students and parents can confirm assignments' }, { status: 403 })
    }

    const body = await request.json()
    console.log('📝 Confirmation request:', JSON.stringify(body))
    
    // Validate input
    const validationResult = ConfirmAssignmentSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const { assignment_id, action, notes } = validationResult.data

    // Get the assignment and verify permissions
    const { data: assignment, error: assignmentError  } = await supabase
      .from('slot_assignments')
      .select('*')
      .eq('id', assignment_id)
      .single()

    if (assignmentError || !assignment) {
      return NextResponse.json({ 
        error: 'Assignment not found',
        details: assignmentError?.message
      }, { status: 404 })
    }

    // Check permissions
    let canConfirm = false
    if (profile.role === 'student' && assignment.student_id === user.id) {
      canConfirm = true
    } else if (profile.role === 'parent') {
      // Check if the student is their child
      const { data: child, error: childError  } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', assignment.student_id)
        .eq('parent_id', user.id)
        .single()
      
      if (!childError && child) {
        canConfirm = true
      }
    }

    if (!canConfirm) {
      return NextResponse.json({ 
        error: 'You do not have permission to confirm this assignment' 
      }, { status: 403 })
    }

    // Check if assignment is still pending and not expired
    if (assignment.status !== 'pending') {
      return NextResponse.json({ 
        error: `Assignment is already ${assignment.status}`,
        current_status: assignment.status
      }, { status: 409 })
    }

    if (new Date(assignment.expires_at) < new Date()) {
      return NextResponse.json({ 
        error: 'Assignment has expired',
        expired_at: assignment.expires_at
      }, { status: 410 })
    }

    // Use the database function to handle confirmation
    const { data: result, error: confirmError  } = await supabase
      .rpc('confirm_slot_assignment', {
        assignment_id,
        action
      })

    if (confirmError) {
      console.error('❌ Confirmation error:', confirmError)
      return NextResponse.json({ 
        error: 'Failed to process confirmation',
        details: confirmError.message
      }, { status: 500 })
    }

    // Update assignment with notes if provided
    if (notes) {
      await supabase
        .from('slot_assignments')
        .update({ notes })
        .eq('id', assignment_id)
    }

    // TODO: Send notification to teacher about confirmation/decline
    // This would integrate with the existing notification system

    console.log('✅ Assignment confirmation processed:', result)

    return NextResponse.json({
      success: true,
      result,
      message: action === 'confirm' 
        ? 'Assignment confirmed successfully. Your slots have been booked!'
        : 'Assignment declined successfully. The slots are now available for other students.'
    })
  } catch (error) {
    console.error('❌ Confirmation API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}