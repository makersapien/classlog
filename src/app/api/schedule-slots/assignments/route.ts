// src/app/api/schedule-slots/assignments/route.ts
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse  } from 'next/server'

// GET endpoint to fetch assignments for students/parents or teachers
export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Get Assignments API called')
    
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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // pending, confirmed, declined, expired
    const studentId = searchParams.get('student_id')
    
    let query = supabase
      .from('slot_assignments')
      .select(`
        *,
        teacher:profiles!slot_assignments_teacher_id_fkey(id, full_name, email),
        student:profiles!slot_assignments_student_id_fkey(id, full_name, email)
      `)
      .order('created_at', { ascending: false })

    // Filter based on user role
    if (profile.role === 'teacher') {
      query = query.eq('teacher_id', user.id)
      
      // If teacher requests specific student's assignments
      if (studentId) {
        query = query.eq('student_id', studentId)
      }
    } else if (profile.role === 'student') {
      query = query.eq('student_id', user.id)
    } else if (profile.role === 'parent') {
      // Get assignments for their children
      const { data: children, error: childrenError  } = await supabase
        .from('profiles')
        .select('id')
        .eq('parent_id', user.id)
        .eq('role', 'student')
      
      if (childrenError) {
        console.error('❌ Error fetching children:', childrenError)
        return NextResponse.json({ 
          error: 'Failed to fetch children profiles',
          details: childrenError.message
        }, { status: 500 })
      }
      
      if (!children || children.length === 0) {
        return NextResponse.json({
          success: true,
          assignments: []
        })
      }
      
      const childIds = children.map(child => child.id)
      query = query.in('student_id', childIds)
      
      // If parent requests specific child's assignments
      if (studentId && childIds.includes(studentId)) {
        query = query.eq('student_id', studentId)
      }
    } else {
      return NextResponse.json({ 
        error: 'Invalid user role for accessing assignments' 
      }, { status: 403 })
    }

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status)
    }

    const { data: assignments, error: assignmentsError  } = await query

    if (assignmentsError) {
      console.error('❌ Assignments fetch error:', assignmentsError)
      return NextResponse.json({ 
        error: 'Failed to fetch assignments',
        details: assignmentsError.message
      }, { status: 500 })
    }

    // For each assignment, get the slot details
    const enrichedAssignments = await Promise.all(
      (assignments || []).map(async (assignment) => {
        const { data: slots, error: slotsError  } = await supabase
          .from('schedule_slots')
          .select('id, date, start_time, end_time, subject, title')
          .in('id', assignment.slot_ids)
          .order('date')
          .order('start_time')

        if (slotsError) {
          console.error('❌ Slots fetch error for assignment:', assignment.id, slotsError)
          return {
            ...assignment,
            slots: []
          }
        }

        return {
          ...assignment,
          slots: slots || []
        }
      })
    )

    return NextResponse.json({
      success: true,
      assignments: enrichedAssignments
    })
  } catch (error) {
    console.error('❌ Get assignments API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}