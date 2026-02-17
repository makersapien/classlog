// src/app/api/teacher/pending-payments/route.ts
import { NextResponse } from 'next/server'
import { Database } from '@/types/database'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

type SupabaseClient = ReturnType<typeof createClient<Database>>

interface PendingPayment {
  student_id: string
  student_name: string
  completed_hours: number
  awarded_credits: number
  pending_hours: number
  pending_amount: number
  last_class_date: string
  rate_per_hour: number
  student_email: string
  parent_email: string | null
}

interface PendingPaymentsResponse {
  total_pending_amount: number
  students: PendingPayment[]
}

export async function GET() {
  try {
    const { supabase, user } = await createAuthenticatedSupabaseClient()
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get user role and verify they are a teacher
    const { data: profile, error: profileError   } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can access pending payments' }, { status: 403 })
    }

    // Calculate pending payments
    const pendingPayments = await calculatePendingPayments(supabase, user.id)

    return NextResponse.json({
      success: true,
      ...pendingPayments
    })
  } catch (error) {
    console.error('💥 Pending payments API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function calculatePendingPayments(
  supabase: SupabaseClient, 
  teacherId: string
): Promise<PendingPaymentsResponse> {
  try {
    console.log('🔄 Calculating pending payments for teacher:', teacherId)

    // Step 1: Get all completed class logs for this teacher
    // Since class_logs doesn't have student_id directly, we need to use enrollment_id
    const { data: classLogs, error: classLogsError   } = await supabase
      .from('class_logs')
      .select(`
        id,
        enrollment_id,
        date,
        duration_minutes,
        student_name,
        student_email,
        status
      `)
      .eq('teacher_id', teacherId)
      .eq('status', 'completed')
      .not('enrollment_id', 'is', null) // Only get logs with enrollment_id
      .order('date', { ascending: false })

    if (classLogsError) {
      console.error('❌ Error fetching class logs:', classLogsError)
      throw new Error('Failed to fetch class logs')
    }

    if (!classLogs || classLogs.length === 0) {
      console.log('ℹ️ No completed class logs found')
      return { total_pending_amount: 0, students: [] }
    }

    console.log('✅ Found completed class logs:', classLogs.length)

    // Step 2: Get enrollment details to map to students
    const enrollmentIds = Array.from(new Set(classLogs.map(log => log.enrollment_id).filter(Boolean)))
    
    const { data: enrollments, error: enrollmentsError   } = await supabase
      .from('enrollments')
      .select(`
        id,
        student_id,
        teacher_id,
        subject
      `)
      .in('id', enrollmentIds)
      .eq('teacher_id', teacherId)

    if (enrollmentsError) {
      console.error('❌ Error fetching enrollments:', enrollmentsError)
      throw new Error('Failed to fetch enrollments')
    }

    if (!enrollments || enrollments.length === 0) {
      console.log('ℹ️ No enrollments found')
      return { total_pending_amount: 0, students: [] }
    }

    console.log('✅ Found enrollments:', enrollments.length)

    // Step 3: Get student information
    const studentIds = Array.from(new Set(enrollments.map(e => e.student_id).filter(Boolean)))
    
    const { data: students, error: studentsError   } = await supabase
      .from('profiles')
      .select('id, full_name, email, parent_id')
      .in('id', studentIds)

    if (studentsError) {
      console.error('❌ Error fetching students:', studentsError)
      throw new Error('Failed to fetch students')
    }

    // Create student lookup map
    const studentMap = new Map()
    if (students) {
      students.forEach(student => {
        studentMap.set(student.id, {
          full_name: student.full_name || 'Unknown Student',
          email: student.email || '',
          parent_id: student.parent_id
        })
      })
    }

    // Create enrollment lookup map
    const enrollmentMap = new Map()
    enrollments.forEach(enrollment => {
      const studentInfo = studentMap.get(enrollment.student_id)
      enrollmentMap.set(enrollment.id, {
        student_id: enrollment.student_id,
        student_name: studentInfo?.full_name || 'Unknown Student',
        student_email: studentInfo?.email || '',
        parent_id: studentInfo?.parent_id,
        subject: enrollment.subject
      })
    })

    // Step 4: Get parent information
    const parentIds = Array.from(new Set(students?.map(s => s.parent_id).filter(Boolean) || []))
    
    const parentMap = new Map()
    if (parentIds.length > 0) {
      const { data: parents, error: parentsError   } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', parentIds)

      if (!parentsError && parents) {
        parents.forEach(parent => {
          parentMap.set(parent.id, parent.email)
        })
      }
    }

    // Step 5: Group class logs by student and calculate completed hours
    const studentHours = new Map<string, {
      student_id: string
      student_name: string
      student_email: string
      parent_email: string | null
      completed_hours: number
      last_class_date: string
      subject: string
    }>()

    classLogs.forEach(log => {
      if (!log.enrollment_id) return

      const enrollmentInfo = enrollmentMap.get(log.enrollment_id)
      if (!enrollmentInfo) return

      const studentId = enrollmentInfo.student_id
      const hours = (log.duration_minutes || 0) / 60

      if (studentHours.has(studentId)) {
        const existing = studentHours.get(studentId)!
        existing.completed_hours += hours
        // Keep the most recent class date
        if (log.date > existing.last_class_date) {
          existing.last_class_date = log.date
        }
      } else {
        const parentEmail = enrollmentInfo.parent_id ? 
          parentMap.get(enrollmentInfo.parent_id) || null : null

        studentHours.set(studentId, {
          student_id: studentId,
          student_name: enrollmentInfo.student_name,
          student_email: enrollmentInfo.student_email,
          parent_email: parentEmail,
          completed_hours: hours,
          last_class_date: log.date,
          subject: enrollmentInfo.subject || 'General'
        })
      }
    })

    console.log('✅ Calculated hours for students:', studentHours.size)

    // Step 6: Get awarded credits for each student
    const studentIdsForCredits = Array.from(studentHours.keys())
    
    const { data: credits, error: creditsError   } = await supabase
      .from('credits')
      .select('student_id, total_purchased, rate_per_hour')
      .eq('teacher_id', teacherId)
      .in('student_id', studentIdsForCredits)
      .eq('is_active', true)

    if (creditsError) {
      console.error('❌ Error fetching credits:', creditsError)
      throw new Error('Failed to fetch credits')
    }

    // Create credits lookup map
    const creditsMap = new Map()
    if (credits) {
      credits.forEach(credit => {
        creditsMap.set(credit.student_id, {
          awarded_credits: credit.total_purchased || 0,
          rate_per_hour: credit.rate_per_hour || 0
        })
      })
    }

    console.log('✅ Found credit records:', credits?.length || 0)

    // Step 7: Calculate pending payments
    const pendingStudents: PendingPayment[] = []
    let totalPendingAmount = 0

    studentHours.forEach((studentData, studentId) => {
      const creditData = creditsMap.get(studentId) || { 
        awarded_credits: 0, 
        rate_per_hour: 0 
      }

      const pendingHours = Math.max(0, studentData.completed_hours - creditData.awarded_credits)
      
      // Only include students with pending hours
      if (pendingHours > 0) {
        const pendingAmount = pendingHours * creditData.rate_per_hour
        
        pendingStudents.push({
          student_id: studentId,
          student_name: studentData.student_name,
          completed_hours: Math.round(studentData.completed_hours * 100) / 100, // Round to 2 decimal places
          awarded_credits: creditData.awarded_credits,
          pending_hours: Math.round(pendingHours * 100) / 100,
          pending_amount: Math.round(pendingAmount * 100) / 100,
          last_class_date: studentData.last_class_date,
          rate_per_hour: creditData.rate_per_hour,
          student_email: studentData.student_email,
          parent_email: studentData.parent_email
        })

        totalPendingAmount += pendingAmount
      }
    })

    // Sort by pending amount (highest first)
    pendingStudents.sort((a, b) => b.pending_amount - a.pending_amount)

    console.log('✅ Calculated pending payments for students:', pendingStudents.length)
    console.log('💰 Total pending amount:', Math.round(totalPendingAmount * 100) / 100)

    return {
      total_pending_amount: Math.round(totalPendingAmount * 100) / 100,
      students: pendingStudents
    }

  } catch (error) {
    console.error('💥 Error calculating pending payments:', error)
    throw error
  }
}