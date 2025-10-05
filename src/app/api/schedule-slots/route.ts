// src/app/api/schedule-slots/route.ts
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'


// GET endpoint to fetch schedule slots
export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Schedule Slots API GET called')
    
    const { supabase, user } = await createAuthenticatedSupabaseClient()
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    console.log('✅ User authenticated:', user.id)

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
    
    console.log('✅ User role:', profile.role)

    const { searchParams } = new URL(request.url)
    const teacherId = searchParams.get('teacher_id')
    const studentId = searchParams.get('student_id')
    
    console.log('📝 Query parameters - Teacher ID:', teacherId, 'Student ID:', studentId)
    
    // Build the query based on the user role and parameters
    let query = supabase
      .from('schedule_slots')
      .select('*')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })
    
    // Filter by teacher ID if provided
    if (teacherId) {
      query = query.eq('teacher_id', teacherId)
    } else if (profile.role === 'teacher') {
      // If no teacher ID is provided and the user is a teacher, show their slots
      query = query.eq('teacher_id', user.id)
    }
    
    // Filter by student ID if provided
    if (studentId) {
      // Verify the student ID is valid and the user has permission to view this student's slots
      if (profile.role === 'teacher') {
        // Teachers can view any student's slots
        query = query.or(`booked_by.eq.${studentId},status.eq.available`)
      } else if (profile.role === 'parent') {
        // Parents can only view their children's slots
        const { data: isChild, error: childCheckError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', studentId)
          .eq('parent_id', user.id)
          .single()
          
        if (childCheckError || !isChild) {
          console.error('❌ Permission error: Student is not a child of this parent')
          return NextResponse.json({ 
            error: 'You do not have permission to view this student\'s schedule slots' 
          }, { status: 403 })
        }
        
        query = query.or(`booked_by.eq.${studentId},status.eq.available`)
      } else if (profile.role === 'student' && studentId === user.id) {
        // Students can only view their own slots
        query = query.or(`booked_by.eq.${user.id},status.eq.available`)
      } else {
        console.error('❌ Permission error: User cannot view this student\'s slots')
        return NextResponse.json({ 
          error: 'You do not have permission to view this student\'s schedule slots' 
        }, { status: 403 })
      }
    } else if (profile.role === 'student') {
      // If no student ID is provided and the user is a student, show their slots and available slots
      query = query.or(`booked_by.eq.${user.id},status.eq.available`)
    } else if (profile.role === 'parent') {
      // If the user is a parent, get their children
      const { data: children, error: childrenError } = await supabase
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
      
      if (children && children.length > 0) {
        const childIds = children.map(child => child.id)
        // Show slots booked by their children and available slots
        const conditions = childIds.map(id => `booked_by.eq.${id}`).join(',')
        query = query.or(`${conditions},status.eq.available`)
      } else {
        // If no children, just show available slots
        query = query.eq('status', 'available')
      }
    }
    
    // Only show slots from today onwards
    const today = new Date().toISOString().split('T')[0]
    query = query.gte('date', today)
    
    // Execute the query
    const { data: slots, error } = await query
    
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch schedule slots' }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      slots: slots || []
    })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST endpoint to create a new schedule slot (teacher only)
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Schedule Slots API POST called')
    
    const { supabase, user } = await createAuthenticatedSupabaseClient()
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    console.log('✅ User authenticated:', user.id)

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
    
    console.log('✅ User role:', profile.role)

    // Only teachers can create slots
    if (profile.role !== 'teacher') {
      console.error('❌ Permission error: User is not a teacher')
      return NextResponse.json({ error: 'Only teachers can create schedule slots' }, { status: 403 })
    }

    const body = await request.json()
    console.log('📝 Request body:', JSON.stringify(body))
    
    const { teacher_id, date, start_time, end_time } = body

    // Validate required fields
    if (!date || !start_time || !end_time) {
      console.error('❌ Validation error: Missing required fields')
      return NextResponse.json({ 
        error: 'Missing required fields: date, start_time, and end_time are required' 
      }, { status: 400 })
    }

    // Validate that the teacher ID matches the current user
    if (teacher_id && teacher_id !== user.id) {
      console.error('❌ Validation error: Teacher ID mismatch')
      return NextResponse.json({ error: 'Invalid teacher ID' }, { status: 400 })
    }
    
    console.log('✅ Validation passed. Creating schedule slot for date:', date)

    // Create the schedule slot with additional fields from the schema
    const { data: slot, error } = await supabase
      .from('schedule_slots')
      .insert({
        teacher_id: user.id,
        date,
        start_time,
        end_time,
        status: 'available',
        title: body.title || null,
        description: body.description || null,
        subject: body.subject || null,
        duration_minutes: body.duration_minutes || 60,
        max_students: body.max_students || 1,
        google_meet_url: body.google_meet_url || null,
        is_recurring: body.is_recurring || false,
        recurrence_type: body.recurrence_type || null,
        recurrence_end_date: body.recurrence_end_date || null
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ 
        error: 'Failed to create schedule slot',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      slot
    })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}