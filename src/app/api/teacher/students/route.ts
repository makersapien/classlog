// src/app/api/teacher/students/route.ts - Patched with duplicate prevention

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Define proper types for our data structures
interface StudentData {
  id: string
  student_id: string
  student_name: string
  parent_name: string
  parent_email: string
  subject: string
  year_group: string
  classes_per_week: number
  classes_per_recharge: number
  tentative_schedule: any
  whatsapp_group_url: string | null
  google_meet_url: string | null
  setup_completed: boolean
  enrollment_date: string
  status: string
  class_name: string
}

interface InvitationData {
  id: string
  teacher_id: string
  invitation_token: string
  student_name: string
  parent_name: string
  parent_email: string
  subject: string
  year_group: string
  classes_per_week: number
  classes_per_recharge: number
  tentative_schedule: any
  whatsapp_group_url: string | null
  google_meet_url: string | null
  status: string
  expires_at: string
  completed_at: string | null
  created_at: string
  updated_at: string
}

export async function GET(request: Request) {
  console.log('🔄 Students API called')
  
  try {
    // Add debugging for the request
    console.log('🔍 Request headers:', Object.fromEntries(request.headers.entries()))
    console.log('🔍 Request URL:', request.url)
    
    // Fix for Next.js 15 - properly handle cookies
    const supabase = createRouteHandlerClient({ 
      cookies 
    })
    
    // Debug the session
    console.log('🔍 Getting user session...')
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    console.log('🔍 Session debug:', {
      hasSession: !!session,
      sessionError: sessionError,
      userId: session?.user?.id,
      userEmail: session?.user?.email
    })
    
    // Get current user (teacher)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('🔍 User debug:', {
      hasUser: !!user,
      authError: authError,
      userId: user?.id,
      userEmail: user?.email
    })
    
    if (authError) {
      console.error('❌ Auth error:', authError)
      return NextResponse.json({ error: 'Authentication failed', details: authError.message }, { status: 401 })
    }

    if (!user) {
      console.error('❌ No user found')
      return NextResponse.json({ error: 'No authenticated user' }, { status: 401 })
    }

    console.log('✅ Teacher authenticated:', user.id)

    // Fetch data
    const studentsData = await fetchTeacherStudents(supabase, user.id)
    const invitationsData = await fetchPendingInvitations(supabase, user.id)
    
    // Calculate stats
    const stats = calculateStudentStats(studentsData, invitationsData)
    
    return NextResponse.json({
      students: studentsData,
      invitations: invitationsData,
      stats: stats,
      success: true
    })

  } catch (error) {
    console.error('💥 Students API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function fetchTeacherStudents(supabase: any, teacherId: string): Promise<StudentData[]> {
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

    const classIds = classes.map((c: any) => c.id)
    console.log('📚 Found classes:', classIds.length)

    // Get enrollments with student details
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
          email
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
    const studentIds = enrollments.map((e: any) => e.student_id).filter(Boolean)
    const parentMap = new Map()

    if (studentIds.length > 0) {
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
      } else if (parentRelations) {
        // Create a map of student to parent
        parentRelations.forEach((relation: any) => {
          const parentProfile = relation.profiles
          if (parentProfile) {
            parentMap.set(relation.child_id, {
              id: parentProfile.id,
              full_name: parentProfile.full_name,
              email: parentProfile.email
            })
          }
        })
      }
    }

    // Transform data to match our interface
    const students: StudentData[] = enrollments.map((enrollment: any) => {
      const student = enrollment.profiles
      const parentInfo = parentMap.get(enrollment.student_id) || { 
        full_name: 'Parent Info Missing', 
        email: '' 
      }
      const classInfo = classes.find((c: any) => c.id === enrollment.class_id)

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

async function fetchPendingInvitations(supabase: any, teacherId: string): Promise<InvitationData[]> {
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

function calculateStudentStats(students: StudentData[], invitations: InvitationData[]) {
  const totalStudents = students.length
  
  // More strict setup completion check
  const completeSetup = students.filter(student => {
    // Must have BOTH URLs AND setup_completed flag
    return student.setup_completed === true && 
           student.whatsapp_group_url && 
           student.google_meet_url &&
           student.whatsapp_group_url.trim() !== '' &&
           student.google_meet_url.trim() !== ''
  }).length
  
  // Students who don't meet the complete setup criteria
  const incompleteSetup = totalStudents - completeSetup
  
  const pendingInvitations = invitations.length

  console.log('📊 Stats Debug:', {
    totalStudents,
    completeSetup,
    incompleteSetup,
    pendingInvitations,
    studentsData: students.map(s => ({
      name: s.student_name,
      setup_completed: s.setup_completed,
      whatsapp_url: !!s.whatsapp_group_url,
      google_meet_url: !!s.google_meet_url
    }))
  })

  return {
    totalStudents,
    completeSetup,
    incompleteSetup,
    pendingInvitations
  }
}

// 🔧 ENHANCED: Duplicate validation helper functions
async function validateGoogleMeetUrl(supabase: any, teacherId: string, googleMeetUrl: string, excludeInvitationId?: string) {
  if (!googleMeetUrl || !googleMeetUrl.trim()) {
    return { isValid: true } // URL is optional, so empty is valid
  }

  const cleanUrl = googleMeetUrl.trim()

  // Check existing enrollments
  const { data: existingEnrollments, error: enrollmentError } = await supabase
    .from('enrollments')
    .select(`
      id,
      student_id,
      google_meet_url,
      profiles!enrollments_student_id_fkey (
        full_name,
        email
      )
    `)
    .eq('teacher_id', teacherId)
    .eq('google_meet_url', cleanUrl)
    .eq('status', 'active')

  if (enrollmentError) {
    console.error('❌ Error checking existing enrollments:', enrollmentError)
    throw new Error('Database error while checking Meet URL')
  }

  if (existingEnrollments && existingEnrollments.length > 0) {
    const conflictingStudent = existingEnrollments[0].profiles
    return {
      isValid: false,
      error: `This Google Meet URL is already assigned to ${conflictingStudent?.full_name || 'another student'} (${conflictingStudent?.email || 'unknown email'}). Each student must have a unique Meet URL.`,
      conflictType: 'duplicate_meet_url_enrollment',
      existingStudent: {
        name: conflictingStudent?.full_name,
        email: conflictingStudent?.email
      }
    }
  }

  // Check pending invitations (exclude current invitation if updating)
  let invitationQuery = supabase
    .from('student_invitations')
    .select('id, student_name, parent_email, google_meet_url')
    .eq('teacher_id', teacherId)
    .eq('google_meet_url', cleanUrl)
    .eq('status', 'pending')

  if (excludeInvitationId) {
    invitationQuery = invitationQuery.neq('id', excludeInvitationId)
  }

  const { data: existingInvitations, error: invitationError } = await invitationQuery

  if (invitationError) {
    console.error('❌ Error checking existing invitations:', invitationError)
    throw new Error('Database error while checking pending invitations')
  }

  if (existingInvitations && existingInvitations.length > 0) {
    const conflictingInvitation = existingInvitations[0]
    return {
      isValid: false,
      error: `This Google Meet URL is already assigned to pending invitation for ${conflictingInvitation.student_name} (${conflictingInvitation.parent_email}). Each student must have a unique Meet URL.`,
      conflictType: 'duplicate_meet_url_invitation',
      existingInvitation: {
        student_name: conflictingInvitation.student_name,
        parent_email: conflictingInvitation.parent_email
      }
    }
  }

  return { isValid: true }
}

async function validateStudentEmail(supabase: any, teacherId: string, studentEmail: string, parentEmail: string) {
  if (!studentEmail || !studentEmail.trim()) {
    return { isValid: true } // Student email is optional in invitations
  }

  const cleanEmail = studentEmail.toLowerCase().trim()

  // Check if student already has an active enrollment with this teacher
  const { data: existingEnrollments, error: enrollmentError } = await supabase
    .from('enrollments')
    .select(`
      id,
      google_meet_url,
      profiles!enrollments_student_id_fkey (
        id,
        full_name,
        email
      )
    `)
    .eq('teacher_id', teacherId)
    .eq('status', 'active')

  if (enrollmentError) {
    console.error('❌ Error checking student enrollments:', enrollmentError)
    throw new Error('Database error while checking student enrollment')
  }

  // Filter by student email
  const studentEnrollment = existingEnrollments?.find(e => 
    e.profiles?.email?.toLowerCase() === cleanEmail
  )

  if (studentEnrollment) {
    return {
      isValid: false,
      error: `${studentEnrollment.profiles.full_name} is already enrolled with you. Their current Google Meet URL is: ${studentEnrollment.google_meet_url || 'Not set'}`,
      conflictType: 'duplicate_student_enrollment',
      existingEnrollment: {
        id: studentEnrollment.id,
        student_name: studentEnrollment.profiles.full_name,
        meet_url: studentEnrollment.google_meet_url
      }
    }
  }

  return { isValid: true }
}

// POST endpoint for creating new student invitations - ENHANCED with duplicate prevention
export async function POST(request: Request) {
  console.log('🔄 Creating new student invitation with duplicate prevention')
  
  try {
    // Fix for Next.js 15 - properly handle cookies
    const supabase = createRouteHandlerClient({ 
      cookies 
    })
    
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
    if (!student_name || !parent_name || !parent_email || !subject || !year_group) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        required: ['student_name', 'parent_name', 'parent_email', 'subject', 'year_group']
      }, { status: 400 })
    }

    console.log('📝 Creating invitation for:', student_name)

    // 🔧 ENHANCED: Validate Google Meet URL for duplicates
    if (google_meet_url) {
      try {
        const meetUrlValidation = await validateGoogleMeetUrl(supabase, user.id, google_meet_url)
        if (!meetUrlValidation.isValid) {
          return NextResponse.json({
            success: false,
            error: meetUrlValidation.error,
            conflict_type: meetUrlValidation.conflictType,
            existing_student: meetUrlValidation.existingStudent,
            existing_invitation: meetUrlValidation.existingInvitation
          }, { status: 409 })
        }
      } catch (error) {
        console.error('❌ Meet URL validation error:', error)
        return NextResponse.json({
          error: 'Failed to validate Google Meet URL',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
      }
    }

    // 🔧 ENHANCED: Validate student email for duplicates
    if (student_email) {
      try {
        const studentEmailValidation = await validateStudentEmail(supabase, user.id, student_email, parent_email)
        if (!studentEmailValidation.isValid) {
          return NextResponse.json({
            success: false,
            error: studentEmailValidation.error,
            conflict_type: studentEmailValidation.conflictType,
            existing_enrollment: studentEmailValidation.existingEnrollment
          }, { status: 409 })
        }
      } catch (error) {
        console.error('❌ Student email validation error:', error)
        return NextResponse.json({
          error: 'Failed to validate student email',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
      }
    }

    // 🔧 ENHANCED: Validate parent email for duplicates (optional - comment out if you allow same parent for multiple children)
    /*
    const { data: existingParentInvitations, error: parentCheckError } = await supabase
      .from('student_invitations')
      .select('id, student_name, parent_email')
      .eq('teacher_id', user.id)
      .eq('parent_email', parent_email.toLowerCase().trim())
      .eq('status', 'pending')

    if (parentCheckError) {
      console.error('❌ Parent email check error:', parentCheckError)
      return NextResponse.json({
        error: 'Failed to validate parent email',
        details: parentCheckError.message
      }, { status: 500 })
    }

    if (existingParentInvitations && existingParentInvitations.length > 0) {
      const existingInvitation = existingParentInvitations[0]
      return NextResponse.json({
        success: false,
        error: `This parent email already has a pending invitation for ${existingInvitation.student_name}. Please complete that invitation first or use a different email.`,
        conflict_type: 'duplicate_parent_invitation',
        existing_invitation: {
          student_name: existingInvitation.student_name,
          parent_email: existingInvitation.parent_email
        }
      }, { status: 409 })
    }
    */

    // Generate a simple invitation token
    const invitation_token = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Parse tentative_schedule if it's a string
    let scheduleData = null
    if (tentative_schedule && typeof tentative_schedule === 'string') {
      scheduleData = { note: tentative_schedule }
    } else if (tentative_schedule) {
      scheduleData = tentative_schedule
    }

    // Prepare the insert data with proper types
    const insertData: Record<string, any> = {
      teacher_id: user.id,
      invitation_token,
      student_name: student_name.trim(),
      parent_name: parent_name.trim(),
      parent_email: parent_email.toLowerCase().trim(),
      subject: subject.trim(),
      year_group: year_group.trim(),
      classes_per_week,
      classes_per_recharge,
      tentative_schedule: scheduleData,
      whatsapp_group_url: whatsapp_group_url ? whatsapp_group_url.trim() : null,
      google_meet_url: google_meet_url ? google_meet_url.trim() : null,
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }

    // 🔧 ENHANCED: Add student_email if provided
    if (student_email) {
      insertData.student_email = student_email.toLowerCase().trim()
    }

    // Create student invitation with all fields and duplicate protection
    const { data: invitation, error: invitationError } = await supabase
      .from('student_invitations')
      .insert(insertData)
      .select()
      .single()

    if (invitationError) {
      console.error('❌ Invitation creation error:', invitationError)
      
      // Check if it's a constraint violation that we missed
      if (invitationError.message.includes('unique') || 
          invitationError.message.includes('duplicate') ||
          invitationError.message.includes('already exists')) {
        return NextResponse.json({
          success: false,
          error: 'A similar invitation already exists. Please check for duplicates.',
          conflict_type: 'constraint_violation',
          details: invitationError.message
        }, { status: 409 })
      }
      
      return NextResponse.json({ 
        error: 'Failed to create invitation',
        details: invitationError.message
      }, { status: 500 })
    }

    console.log('✅ Invitation created successfully:', invitation?.id)

    // Generate invitation URL
    const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/onboarding/${invitation_token}`

    return NextResponse.json({
      success: true,
      invitation,
      invitation_url: invitationUrl,
      message: 'Student invitation created successfully with duplicate prevention'
    })

  } catch (error) {
    console.error('💥 POST Students API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}