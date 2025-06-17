// src/app/api/teacher/students/route.ts

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database'

type SupabaseClient = ReturnType<typeof createRouteHandlerClient<Database>>

export async function GET(request: Request) {
  console.log('🔄 Students API called')
  
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Get current user (teacher)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('❌ Auth error:', authError)
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }

    if (!user) {
      console.error('❌ No user found')
      return NextResponse.json({ error: 'No authenticated user' }, { status: 401 })
    }

    console.log('✅ Teacher authenticated:', user.id)

    // Fetch teacher's students with enrollment details
    const studentsData = await fetchTeacherStudents(supabase, user.id)
    
    // Fetch pending invitations
    const invitationsData = await fetchPendingInvitations(supabase, user.id)

    // Calculate statistics
    const stats = calculateStudentStats(studentsData, invitationsData)

    console.log('✅ Students data prepared successfully')
    return NextResponse.json({
      students: studentsData,
      invitations: invitationsData,
      stats
    })

  } catch (error) {
    console.error('💥 Students API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function fetchTeacherStudents(supabase: SupabaseClient, teacherId: string) {
  try {
    console.log('👥 Fetching students for teacher:', teacherId)

    // Get all classes for this teacher
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select('id, name, subject, grade')
      .eq('teacher_id', teacherId)
      .eq('status', 'active')

    if (classesError) {
      console.error('❌ Classes error:', classesError)
      return []
    }

    if (!classes || classes.length === 0) {
      console.log('📚 No classes found for teacher')
      return []
    }

    const classIds = classes.map(c => c.id)
    console.log('📚 Found classes:', classIds.length)

    // Get enrollments with student and parent details
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select(`
        id,
        class_id,
        student_id,
        status,
        enrollment_date,
        classes_per_week,
        classes_per_recharge,
        tentative_schedule,
        whatsapp_group_url,
        google_meet_url,
        setup_completed,
        created_at,
        profiles!enrollments_student_id_fkey(
          id,
          full_name,
          email,
          parent_id
        )
      `)
      .in('class_id', classIds)
      .eq('status', 'active')

    if (enrollmentsError) {
      console.error('❌ Enrollments error:', enrollmentsError)
      return []
    }

    if (!enrollments || enrollments.length === 0) {
      console.log('👥 No enrollments found')
      return []
    }

    // Get parent information for each student
    const studentIds = enrollments.map(e => e.student_id)
    const { data: parentRelations, error: parentError } = await supabase
      .from('parent_child_relationships')
      .select(`
        child_id,
        profiles!parent_child_relationships_parent_id_fkey(
          id,
          full_name,
          email
        )
      `)
      .in('child_id', studentIds)

    if (parentError) {
      console.error('❌ Parent relations error:', parentError)
    }

    // Create a map of student to parent
    const parentMap = new Map()
    parentRelations?.forEach(relation => {
      const parentProfile = relation.profiles as any
      if (parentProfile) {
        parentMap.set(relation.child_id, {
          id: parentProfile.id,
          full_name: parentProfile.full_name,
          email: parentProfile.email
        })
      }
    })

    // Transform data to match our interface
    const students = enrollments.map(enrollment => {
      const student = enrollment.profiles as any
      const parentInfo = parentMap.get(enrollment.student_id) || { full_name: 'Parent Info Missing', email: '' }
      const classInfo = classes.find(c => c.id === enrollment.class_id)

      return {
        id: enrollment.id,
        student_id: enrollment.student_id,
        student_name: student?.full_name || 'Unknown Student',
        parent_name: parentInfo.full_name,
        parent_email: parentInfo.email,
        subject: classInfo?.subject || 'Unknown Subject',
        year_group: classInfo?.grade || 'Unknown Year',
        classes_per_week: enrollment.classes_per_week || 1,
        classes_per_recharge: enrollment.classes_per_recharge || 4,
        tentative_schedule: enrollment.tentative_schedule,
        whatsapp_group_url: enrollment.whatsapp_group_url,
        google_meet_url: enrollment.google_meet_url,
        setup_completed: enrollment.setup_completed || false,
        enrollment_date: enrollment.created_at || enrollment.enrollment_date,
        status: enrollment.status,
        class_name: classInfo?.name || 'Unknown Class'
      }
    })

    console.log('✅ Students processed:', students.length)
    return students

  } catch (error) {
    console.error('💥 Error fetching students:', error)
    return []
  }
}

async function fetchPendingInvitations(supabase: SupabaseClient, teacherId: string) {
  try {
    console.log('📨 Fetching pending invitations for teacher:', teacherId)

    const { data: invitations, error: invitationsError } = await supabase
      .from('student_invitations')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('status', 'pending')
      .limit(10)

    if (invitationsError) {
      console.error('❌ Invitations error:', invitationsError)
      return []
    }

    console.log('📨 Found pending invitations:', invitations?.length || 0)
    return invitations || []

  } catch (error) {
    console.error('💥 Error fetching invitations:', error)
    return []
  }
}

function calculateStudentStats(students: any[], invitations: any[]) {
  const totalStudents = students.length
  
  // Count complete vs incomplete setup using the setup_completed field
  const completeSetup = students.filter(student => student.setup_completed === true).length
  const incompleteSetup = students.filter(student => student.setup_completed === false).length

  const pendingInvitations = invitations.length

  console.log('📊 Stats calculated:', {
    totalStudents,
    completeSetup,
    incompleteSetup,
    pendingInvitations
  })

  return {
    totalStudents,
    completeSetup,
    incompleteSetup,
    pendingInvitations
  }
}

// POST endpoint for creating new student invitations
export async function POST(request: Request) {
  console.log('🔄 Creating new student invitation')
  
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Get current user (teacher)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }

    const body = await request.json()
    const {
      student_name,
      student_email,
      parent_name,
      parent_email,
      subject,
      year_group,
      classes_per_week = 1,
      classes_per_recharge = 4,
      tentative_schedule,
      whatsapp_group_url,
      google_meet_url
    } = body

    // Validate required fields
    if (!student_name || !student_email || !parent_name || !parent_email || !subject || !year_group) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        required: ['student_name', 'student_email', 'parent_name', 'parent_email', 'subject', 'year_group']
      }, { status: 400 })
    }

    console.log('📝 Creating invitation for:', student_name)

    // Generate a simple invitation token
    const invitation_token = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Parse tentative_schedule if it's a string
    let scheduleData = null
    if (tentative_schedule && typeof tentative_schedule === 'string') {
      scheduleData = { note: tentative_schedule }
    } else if (tentative_schedule) {
      scheduleData = tentative_schedule
    }

    // Create student invitation with all fields
    const { data: invitation, error: invitationError } = await supabase
      .from('student_invitations')
      .insert({
        teacher_id: user.id,
        invitation_token,
        student_name,
        student_email,
        parent_name,
        parent_email,
        subject,
        year_group,
        classes_per_week,
        classes_per_recharge,
        tentative_schedule: scheduleData,
        whatsapp_group_url: whatsapp_group_url || null,
        google_meet_url: google_meet_url || null,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single()

    if (invitationError) {
      console.error('❌ Invitation creation error:', invitationError)
      return NextResponse.json({ 
        error: 'Failed to create invitation',
        details: invitationError.message
      }, { status: 500 })
    }

    console.log('✅ Invitation created successfully:', invitation.id)

    // Generate invitation URL
    const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/onboarding/${invitation.invitation_token}`

    return NextResponse.json({
      invitation,
      invitation_url: invitationUrl,
      message: 'Student invitation created successfully'
    })

  } catch (error) {
    console.error('💥 POST Students API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}