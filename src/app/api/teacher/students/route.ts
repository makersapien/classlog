///   dashboard/teacher/students/route.ts

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

    // Try using the RPC function first
    const { data: enrollments, error: enrollmentsError } = await supabase
      .rpc('get_teacher_students', { teacher_id: teacherId })

    if (enrollmentsError) {
      console.error('❌ RPC function error, falling back to basic query:', enrollmentsError)
      
      // Fallback to basic query without new columns
      const { data: basicEnrollments, error: basicError } = await supabase
        .from('enrollments')
        .select(`
          id,
          class_id,
          student_id,
          status,
          enrollment_date,
          created_at,
          classes!inner(
            name,
            subject,
            grade
          ),
          profiles!inner(
            id,
            full_name,
            email,
            parent_id
          )
        `)
        .in('class_id', classIds)
        .eq('status', 'active')

      if (basicError) {
        console.error('❌ Basic enrollments error:', basicError)
        return []
      }

      // Transform basic data
      const students = await transformBasicEnrollments(supabase, basicEnrollments || [])
      return students
    }

    console.log('👥 Found enrollments:', enrollments?.length || 0)
    return enrollments || []

  } catch (error) {
    console.error('💥 Error fetching students:', error)
    
    // Final fallback - get basic enrollment data
    try {
      return await getBasicStudentData(supabase, teacherId)
    } catch (fallbackError) {
      console.error('💥 Fallback also failed:', fallbackError)
      return []
    }
  }
}

async function transformBasicEnrollments(supabase: SupabaseClient, enrollments: any[]) {
  if (!enrollments || enrollments.length === 0) return []

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
    // Fix: Handle the profiles relationship correctly
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
    // Fix: Handle the profiles relationship correctly
    const student = enrollment.profiles as any
    const parentInfo = parentMap.get(enrollment.student_id)
    const classInfo = enrollment.classes as any

    return {
      id: enrollment.id,
      student_id: enrollment.student_id,
      student_name: student?.full_name || 'Unknown Student',
      parent_name: parentInfo?.full_name || 'Parent Info Missing',
      parent_email: parentInfo?.email || '',
      subject: classInfo?.subject || 'Unknown Subject',
      year_group: classInfo?.grade || 'Unknown Year',
      classes_per_week: 1, // Default values since new columns might not exist yet
      classes_per_recharge: 4,
      tentative_schedule: null,
      whatsapp_group_url: null,
      google_meet_url: null,
      setup_completed: false,
      enrollment_date: enrollment.created_at || enrollment.enrollment_date,
      status: enrollment.status,
      class_name: classInfo?.name
    }
  })

  console.log('✅ Students processed:', students.length)
  return students
}

async function getBasicStudentData(supabase: SupabaseClient, teacherId: string) {
  console.log('🔄 Using basic student data fallback')
  
  // Get teacher's classes
  const { data: classes, error: classesError } = await supabase
    .from('classes')
    .select('id, name, subject, grade')
    .eq('teacher_id', teacherId)

  if (classesError || !classes) {
    return []
  }

  // Get enrollments for these classes
  const classIds = classes.map(c => c.id)
  if (classIds.length === 0) return []

  const { data: enrollments, error: enrollmentsError } = await supabase
    .from('enrollments')
    .select(`
      id,
      student_id,
      class_id,
      status,
      created_at,
      profiles!inner(
        full_name,
        email
      )
    `)
    .in('class_id', classIds)
    .eq('status', 'active')

  if (enrollmentsError || !enrollments) {
    return []
  }

  // Transform to expected format
  return enrollments.map(enrollment => {
    const classInfo = classes.find(c => c.id === enrollment.class_id)
    // Fix: Handle the profiles relationship correctly
    const student = enrollment.profiles as any
    
    return {
      id: enrollment.id,
      student_id: enrollment.student_id,
      student_name: student?.full_name || 'Unknown Student',
      parent_name: 'Parent Info Needed',
      parent_email: '',
      subject: classInfo?.subject || 'Unknown Subject',
      year_group: classInfo?.grade || 'Unknown Year',
      classes_per_week: 1,
      classes_per_recharge: 4,
      tentative_schedule: null,
      whatsapp_group_url: null,
      google_meet_url: null,
      setup_completed: false,
      enrollment_date: enrollment.created_at,
      status: enrollment.status,
      class_name: classInfo?.name
    }
  })
}

async function fetchPendingInvitations(supabase: SupabaseClient, teacherId: string) {
  try {
    console.log('📨 Fetching pending invitations for teacher:', teacherId)

    // Check if student_invitations table exists
    const { data: invitations, error: invitationsError } = await supabase
      .from('student_invitations')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('status', 'pending')
      .limit(10) // Limit to avoid large queries

    if (invitationsError) {
      console.error('❌ Invitations error (table might not exist yet):', invitationsError)
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
  
  // Count complete vs incomplete setup
  let completeSetup = 0
  let incompleteSetup = 0

  students.forEach(student => {
    // Check if student has all required setup
    const hasBasicInfo = !!(student.student_name && student.parent_name && student.parent_name !== 'Parent Info Missing')
    const hasClassInfo = !!(student.subject && student.year_group)
    const hasWhatsAppUrl = !!student.whatsapp_group_url
    const hasGoogleMeetUrl = !!student.google_meet_url

    if (hasBasicInfo && hasClassInfo && hasWhatsAppUrl && hasGoogleMeetUrl) {
      completeSetup++
    } else {
      incompleteSetup++
    }
  })

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
    if (!student_name || !parent_name || !parent_email || !subject || !year_group) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        required: ['student_name', 'parent_name', 'parent_email', 'subject', 'year_group']
      }, { status: 400 })
    }

    console.log('📝 Creating invitation for:', student_name)

    // Generate a simple invitation token
    const invitation_token = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Try to create student invitation
    const { data: invitation, error: invitationError } = await supabase
      .from('student_invitations')
      .insert({
        teacher_id: user.id,
        invitation_token,
        student_name,
        parent_name,
        parent_email,
        subject,
        year_group,
        classes_per_week,
        classes_per_recharge,
        tentative_schedule,
        whatsapp_group_url,
        google_meet_url,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single()

    if (invitationError) {
      console.error('❌ Invitation creation error:', invitationError)
      return NextResponse.json({ 
        error: 'Failed to create invitation. The student_invitations table might not be set up yet.',
        details: invitationError.message,
        suggestion: 'Please run the SQL schema updates first.'
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