// src/app/api/dashboard/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { Database } from '@/types/database'

// Type definitions for better type safety
interface ClassWithEnrollments {
  id: string
  name: string
  subject: string
  grade: string | null
  description: string | null
  teacher_id: string
  status: string
  created_at: string
  updated_at: string
  enrollments: Array<{
    id: string
    student_id: string
    status: string
    profiles: {
      full_name: string | null
      email: string
    } | null
  }>
}

// Type for raw Supabase responses


interface ClassLogWithDetails {
  id: string
  teacher_id: string
  class_id: string
  date: string
  attendance_count: number | null
  notes: string | null
  created_at: string
  updated_at: string
  classes: {
    name: string
    subject: string
    grade: string | null
  } | null
}

interface Payment {
  id: string
  class_id: string
  student_id: string
  amount: string
  status: 'pending' | 'paid' | 'failed' | 'cancelled'
  due_date: string | null
  paid_date: string | null
  created_at: string
  updated_at: string
  classes?: {
    name: string
    subject: string
  } | null
  profiles?: {
    full_name: string | null
  } | null
}

interface MessageWithDetails {
  id: string
  sender_id: string
  recipient_id: string
  class_id: string | null
  subject: string | null
  message: string
  is_read: boolean
  created_at: string
  updated_at: string
  sender: {
    full_name: string | null
  } | null
  classes: {
    name: string
  } | null
}

interface EnrollmentWithDetails {
  id: string
  student_id: string
  class_id: string
  status: 'active' | 'inactive' | 'completed' | 'dropped'
  enrollment_date: string | null
  completion_date: string | null
  final_grade: string | null
  created_at: string
  updated_at: string
  classes: {
    id: string
    name: string
    subject: string
    grade: string | null
    teacher_id: string
    profiles: {
      full_name: string | null
      email: string
    } | null
  } | null
  profiles?: {
    full_name: string | null
  } | null
}

interface AttendanceWithDetails {
  id: string
  student_id: string
  class_log_id: string
  status: 'present' | 'absent' | 'late'
  notes: string | null
  created_at: string
  updated_at: string
  class_logs: {
    date: string
    classes: {
      name: string
      subject: string
    } | null
  } | null
}

interface Profile {
  id: string
  email: string
  full_name: string | null
  role: 'teacher' | 'student' | 'parent'
  parent_id: string | null
  created_at: string
  updated_at: string
}

type SupabaseClient = ReturnType<typeof createRouteHandlerClient<Database>>

export async function GET(request: Request) {
  console.log('🔄 Dashboard API called')
  
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    
    console.log('📝 Role requested:', role)
    
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
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

async function getTeacherDashboardData(supabase: SupabaseClient, teacherId: string) {
  try {
    console.log('🧑‍🏫 Fetching teacher dashboard data for:', teacherId)

    // Get teacher's classes with better error handling
    console.log('📚 Fetching classes...')
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select(`
        *,
        enrollments(
          id,
          student_id,
          status,
          profiles(full_name, email)
        )
      `)
      .eq('teacher_id', teacherId)
      .eq('status', 'active')

    if (classesError) {
      console.error('❌ Classes query error:', classesError)
      // Don't throw, just use empty array
    }

    const typedClasses = classes as ClassWithEnrollments[] | null
    console.log('✅ Classes fetched:', typedClasses?.length || 0)

    // Get today's class logs with better error handling
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
      // Don't throw, just use empty array
    }

    const typedTodayLogs = todayLogs as ClassLogWithDetails[] | null
    console.log('✅ Today\'s logs fetched:', typedTodayLogs?.length || 0)

    // Get payment statistics for teacher's classes with better error handling
    const classIds = typedClasses?.map((c) => c.id) || []
    let payments: Payment[] = []
    
    if (classIds.length > 0) {
      console.log('💰 Fetching payments for classes:', classIds.length)
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .in('class_id', classIds)

      if (paymentsError) {
        console.error('❌ Payments query error:', paymentsError)
        // Don't throw, just use empty array
      } else {
        payments = paymentsData as Payment[] || []
      }
    }

    console.log('✅ Payments fetched:', payments.length)

    // Get recent messages with better error handling
    console.log('💬 Fetching messages...')
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(full_name),
        classes(name)
      `)
      .eq('recipient_id', teacherId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(5)

    if (messagesError) {
      console.error('❌ Messages query error:', messagesError)
      // Don't throw, just use empty array
    }

    const typedMessages = messages as MessageWithDetails[] | null
    console.log('✅ Messages fetched:', typedMessages?.length || 0)

    // Calculate statistics safely
    const totalStudents = typedClasses?.reduce((sum: number, cls) => {
      const activeEnrollments = cls.enrollments?.filter((e) => e.status === 'active') || []
      return sum + activeEnrollments.length
    }, 0) || 0

    const pendingPayments = payments?.filter((p) => p.status === 'pending').length || 0
    const totalRevenue = payments?.filter((p) => p.status === 'paid')
      .reduce((sum: number, p) => sum + parseFloat(p.amount || '0'), 0) || 0

    const classesToday = typedTodayLogs?.length || 0
    const attendanceToday = typedTodayLogs?.reduce((sum: number, log) => 
      sum + (log.attendance_count || 0), 0) || 0

    const responseData = {
      stats: {
        totalClasses: typedClasses?.length || 0,
        totalStudents,
        pendingPayments,
        totalRevenue,
        classesToday,
        attendanceToday
      },
      classes: typedClasses || [],
      todaySchedule: typedTodayLogs || [],
      recentMessages: typedMessages || [],
      upcomingPayments: payments?.filter((p) => p.status === 'pending').slice(0, 5) || []
    }

    console.log('✅ Teacher dashboard data prepared successfully')
    return NextResponse.json(responseData)

  } catch (error) {
    console.error('💥 Teacher dashboard error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch teacher data', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function getStudentDashboardData(supabase: SupabaseClient, studentId: string) {
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

    const typedEnrollments = enrollments as EnrollmentWithDetails[] | null

    // Get recent class logs for enrolled classes
    const classIds = typedEnrollments?.map((e) => e.class_id) || []
    let recentLogs: ClassLogWithDetails[] = []
    
    if (classIds.length > 0) {
      const { data: logsData, error: logsError } = await supabase
        .from('class_logs')
        .select(`
          *,
          classes(name, subject, grade)
        `)
        .in('class_id', classIds)
        .order('date', { ascending: false })
        .limit(10)

      if (logsError) {
        console.error('❌ Logs error:', logsError)
      } else {
        recentLogs = logsData as ClassLogWithDetails[] || []
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

    const typedPayments = payments as Payment[] | null

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

    const typedAttendance = attendance as AttendanceWithDetails[] | null

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

    const typedMessages = messages as MessageWithDetails[] | null

    // Calculate stats
    const totalClasses = typedEnrollments?.length || 0
    const pendingPayments = typedPayments?.filter((p) => p.status === 'pending').length || 0
    const attendanceRate = typedAttendance && typedAttendance.length > 0 
      ? (typedAttendance.filter((a) => a.status === 'present').length / typedAttendance.length) * 100
      : 0

    return NextResponse.json({
      stats: {
        totalClasses,
        pendingPayments,
        attendanceRate: Math.round(attendanceRate),
        upcomingAssignments: 3 // TODO: Add assignments table
      },
      enrollments: typedEnrollments || [],
      recentLogs: recentLogs || [],
      payments: typedPayments || [],
      attendance: typedAttendance || [],
      messages: typedMessages || []
    })
  } catch (error) {
    console.error('💥 Student dashboard error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch student data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function getParentDashboardData(supabase: SupabaseClient, parentId: string) {
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

    const typedChildren = children as Profile[] | null

    if (!typedChildren || typedChildren.length === 0) {
      return NextResponse.json({
        stats: { totalChildren: 0, totalClasses: 0, pendingPayments: 0, totalExpenses: 0 },
        children: [],
        recentActivity: [],
        payments: []
      })
    }

    const childIds = typedChildren.map((c) => c.id)

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

    const typedEnrollments = enrollments as EnrollmentWithDetails[] | null

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

    const typedPayments = payments as Payment[] | null

    // Get recent class logs for children's classes
    const classIds = typedEnrollments?.map((e) => e.class_id) || []
    let recentLogs: ClassLogWithDetails[] = []
    
    if (classIds.length > 0) {
      const { data: logsData, error: logsError } = await supabase
        .from('class_logs')
        .select(`
          *,
          classes(name, subject, grade)
        `)
        .in('class_id', classIds)
        .order('date', { ascending: false })
        .limit(10)

      if (logsError) {
        console.error('❌ Logs error:', logsError)
      } else {
        recentLogs = logsData as ClassLogWithDetails[] || []
      }
    }

    // Calculate stats
    const totalClasses = typedEnrollments?.length || 0
    const pendingPayments = typedPayments?.filter((p) => p.status === 'pending').length || 0
    const totalExpenses = typedPayments?.filter((p) => p.status === 'paid')
      .reduce((sum: number, p) => sum + parseFloat(p.amount || '0'), 0) || 0

    return NextResponse.json({
      stats: {
        totalChildren: typedChildren.length,
        totalClasses,
        pendingPayments,
        totalExpenses
      },
      children: typedChildren || [],
      enrollments: typedEnrollments || [],
      payments: typedPayments || [],
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