import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Define interfaces for type safety
interface EnrollmentData {
  id: string
  student_id: string
  class_id: string
  status: string
  subject: string
  year_group: string
  created_at: string
  profiles: {
    id: string
    full_name: string
    email: string
    grade?: string
  } | null
}

interface TransformedClass {
  id: string
  name: string
  subject: string
  grade: string
  status: string
  enrollments: Array<{
    id: string
    student_id: string
    status: string
    profiles: {
      id: string
      full_name: string
      email: string
      grade?: string
    } | null
  }>
}

export async function GET(request: Request) {
  console.log('🔄 Dashboard API called')
  
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    
    console.log('📝 Role requested:', role)
    
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('❌ Auth error:', authError)
      return NextResponse.json({ error: 'Authentication failed', details: authError.message }, { status: 401 })
    }

    if (!user) {
      console.error('❌ No user found')
      return NextResponse.json({ error: 'No authenticated user' }, { status: 401 })
    }

    console.log('✅ User authenticated:', user.id)

    // Validate role parameter
    if (!role || !['teacher', 'student', 'parent'].includes(role)) {
      console.error('❌ Invalid role:', role)
      return NextResponse.json({ error: 'Invalid or missing role parameter' }, { status: 400 })
    }

    // Route to appropriate dashboard function
    switch (role) {
      case 'teacher':
        return await getTeacherDashboardData(supabase, user.id)
      case 'student':
        return await getStudentDashboardData(supabase, user.id)
      case 'parent':
        return await getParentDashboardData(supabase, user.id)
      default:
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }
  } catch (error) {
    console.error('💥 Dashboard API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// FIXED: Direct enrollments approach for teacher dashboard
async function getTeacherDashboardData(supabase: any, teacherId: string) {
  try {
    console.log('🧑‍🏫 Fetching teacher dashboard data for:', teacherId)

    // DIRECT APPROACH: Get enrollments with student and class data
    console.log('📚 Fetching enrollments directly...')
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select(`
        id,
        student_id,
        class_id,
        status,
        subject,
        year_group,
        created_at,
        profiles!enrollments_student_id_fkey(
          id,
          full_name,
          email,
          grade
        )
      `)
      .eq('teacher_id', teacherId)
      .eq('status', 'active')

    if (enrollmentsError) {
      console.error('❌ Enrollments query error:', enrollmentsError)
    }

    console.log('✅ Enrollments fetched:', enrollments?.length || 0)
    console.log('📝 Enrollment data:', enrollments)

    // Transform enrollments into classes format that your frontend expects
    const classesMap = new Map<string, TransformedClass>()
    
    if (enrollments) {
      (enrollments as EnrollmentData[]).forEach((enrollment: EnrollmentData) => {
        const classId = enrollment.class_id
        
        if (!classesMap.has(classId)) {
          classesMap.set(classId, {
            id: classId,
            name: `${enrollment.subject} - ${enrollment.year_group}`,
            subject: enrollment.subject,
            grade: enrollment.year_group,
            status: 'active',
            enrollments: []
          })
        }
        
        // Add enrollment to the class
        const classData = classesMap.get(classId)!
        classData.enrollments.push({
          id: enrollment.id,
          student_id: enrollment.student_id,
          status: enrollment.status,
          profiles: enrollment.profiles
        })
      })
    }

    // Convert map to array
    const classes = Array.from(classesMap.values())
    console.log('🏫 Transformed classes:', classes)

    // Get today's class logs
    const today = new Date().toISOString().split('T')[0]
    console.log('📅 Fetching today\'s logs for date:', today)
    
    const { data: todayLogs, error: logsError } = await supabase
      .from('class_logs')
      .select(`
        *,
        classes(name, subject, grade)
      `)
      .eq('teacher_id', teacherId)
      .eq('date', today)

    if (logsError) {
      console.error('❌ Logs query error:', logsError)
    }

    console.log('✅ Today\'s logs fetched:', todayLogs?.length || 0)

    // Calculate basic stats
    const totalStudents = enrollments?.length || 0
    const totalClasses = classes.length
    const classesToday = todayLogs?.length || 0
    const attendanceToday = todayLogs?.reduce((sum: number, log: any) => 
      sum + (log.attendance_count || 0), 0) || 0

    const responseData = {
      stats: {
        totalClasses,
        totalStudents,
        pendingPayments: 0, // TODO: Calculate from payments
        totalRevenue: 0,    // TODO: Calculate from payments
        classesToday,
        attendanceToday
      },
      classes: classes, // This now contains the enrollments with profiles
      todaySchedule: todayLogs || [],
      recentMessages: [],
      upcomingPayments: []
    }

    console.log('✅ Teacher dashboard data prepared successfully')
    console.log('📊 Response stats:', responseData.stats)
    console.log('🏫 Response classes count:', responseData.classes.length)
    
    return NextResponse.json(responseData)

  } catch (error) {
    console.error('💥 Teacher dashboard error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch teacher data', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function getStudentDashboardData(supabase: any, studentId: string) {
  try {
    console.log('🎓 Fetching student dashboard data for:', studentId)

    // Get student's enrollments with class details
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select(`
        *,
        classes(
          *,
          profiles!classes_teacher_id_fkey(full_name, email)
        )
      `)
      .eq('student_id', studentId)
      .eq('status', 'active')

    if (enrollmentsError) {
      console.error('❌ Enrollments error:', enrollmentsError)
      throw enrollmentsError
    }

    // Get recent class logs for enrolled classes
    const classIds = enrollments?.map((e: any) => e.class_id) || []
    let recentLogs: any[] = []
    
    if (classIds.length > 0) {
      const { data: logsData, error: logsError } = await supabase
        .from('class_logs')
        .select(`
          *,
          classes(name, subject)
        `)
        .in('class_id', classIds)
        .order('date', { ascending: false })
        .limit(10)

      if (logsError) {
        console.error('❌ Logs error:', logsError)
      } else {
        recentLogs = logsData || []
      }
    }

    // Get student's payments
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        *,
        classes(name, subject)
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })

    if (paymentsError) {
      console.error('❌ Payments error:', paymentsError)
    }

    // Get student's attendance
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance')
      .select(`
        *,
        class_logs(
          date,
          classes(name, subject)
        )
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (attendanceError) {
      console.error('❌ Attendance error:', attendanceError)
    }

    // Get messages
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(full_name),
        classes(name)
      `)
      .eq('recipient_id', studentId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (messagesError) {
      console.error('❌ Messages error:', messagesError)
    }

    // Calculate stats
    const totalClasses = enrollments?.length || 0
    const pendingPayments = payments?.filter((p: any) => p.status === 'pending').length || 0
    const attendanceRate = attendance && attendance.length > 0 
      ? (attendance.filter((a: any) => a.status === 'present').length / attendance.length) * 100
      : 0

    return NextResponse.json({
      stats: {
        totalClasses,
        pendingPayments,
        attendanceRate: Math.round(attendanceRate),
        upcomingAssignments: 3 // TODO: Add assignments table
      },
      enrollments: enrollments || [],
      recentLogs: recentLogs || [],
      payments: payments || [],
      attendance: attendance || [],
      messages: messages || []
    })
  } catch (error) {
    console.error('💥 Student dashboard error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch student data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function getParentDashboardData(supabase: any, parentId: string) {
  try {
    console.log('👨‍👩‍👧‍👦 Fetching parent dashboard data for:', parentId)

    // Get parent's children
    const { data: children, error: childrenError } = await supabase
      .from('profiles')
      .select('*')
      .eq('parent_id', parentId)
      .eq('role', 'student')

    if (childrenError) {
      console.error('❌ Children error:', childrenError)
      throw childrenError
    }

    if (!children || children.length === 0) {
      return NextResponse.json({
        stats: { totalChildren: 0, totalClasses: 0, pendingPayments: 0, totalExpenses: 0 },
        children: [],
        recentActivity: [],
        payments: []
      })
    }

    const childIds = children.map((c: any) => c.id)

    // Get children's enrollments
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select(`
        *,
        classes(*),
        profiles!enrollments_student_id_fkey(full_name)
      `)
      .in('student_id', childIds)
      .eq('status', 'active')

    if (enrollmentsError) {
      console.error('❌ Enrollments error:', enrollmentsError)
    }

    // Get payments for children
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        *,
        classes(name, subject),
        profiles!payments_student_id_fkey(full_name)
      `)
      .in('student_id', childIds)
      .order('created_at', { ascending: false })

    if (paymentsError) {
      console.error('❌ Payments error:', paymentsError)
    }

    // Get recent class logs for children's classes
    const classIds = enrollments?.map((e: any) => e.class_id) || []
    let recentLogs: any[] = []
    
    if (classIds.length > 0) {
      const { data: logsData, error: logsError } = await supabase
        .from('class_logs')
        .select(`
          *,
          classes(name, subject)
        `)
        .in('class_id', classIds)
        .order('date', { ascending: false })
        .limit(10)

      if (logsError) {
        console.error('❌ Logs error:', logsError)
      } else {
        recentLogs = logsData || []
      }
    }

    // Calculate stats
    const totalClasses = enrollments?.length || 0
    const pendingPayments = payments?.filter((p: any) => p.status === 'pending').length || 0
    const totalExpenses = payments?.filter((p: any) => p.status === 'paid')
      .reduce((sum: number, p: any) => sum + parseFloat(p.amount || '0'), 0) || 0

    return NextResponse.json({
      stats: {
        totalChildren: children.length,
        totalClasses,
        pendingPayments,
        totalExpenses
      },
      children: children || [],
      enrollments: enrollments || [],
      payments: payments || [],
      recentActivity: recentLogs || []
    })
  } catch (error) {
    console.error('💥 Parent dashboard error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch parent data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}