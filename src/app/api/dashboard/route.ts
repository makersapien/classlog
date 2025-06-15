import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database'

type SupabaseClient = ReturnType<typeof createRouteHandlerClient<Database>>

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const role = searchParams.get('role')
  
  const supabase = createRouteHandlerClient<Database>({ cookies })
  
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (role === 'teacher') {
      return getTeacherDashboardData(supabase, user.id)
    } else if (role === 'student') {
      return getStudentDashboardData(supabase, user.id)
    } else if (role === 'parent') {
      return getParentDashboardData(supabase, user.id)
    } else {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function getTeacherDashboardData(supabase: SupabaseClient, teacherId: string) {
  try {
    // Get teacher's classes
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
      console.error('Classes error:', classesError)
      throw classesError
    }

    // Get today's class logs
    const today = new Date().toISOString().split('T')[0]
    const { data: todayLogs, error: logsError } = await supabase
      .from('class_logs')
      .select(`
        *,
        classes(name, subject, grade)
      `)
      .eq('teacher_id', teacherId)
      .eq('date', today)

    if (logsError) {
      console.error('Logs error:', logsError)
      throw logsError
    }

    // Get payment statistics for teacher's classes
    const classIds = classes?.map((c: any) => c.id) || []
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .in('class_id', classIds)

    if (paymentsError) {
      console.error('Payments error:', paymentsError)
      throw paymentsError
    }

    // Get recent messages
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
      console.error('Messages error:', messagesError)
      throw messagesError
    }

    // Calculate statistics
    const totalStudents = classes?.reduce((sum: number, cls: any) => {
      const activeEnrollments = cls.enrollments?.filter((e: any) => e.status === 'active') || []
      return sum + activeEnrollments.length
    }, 0) || 0

    const pendingPayments = payments?.filter((p: any) => p.status === 'pending').length || 0
    const totalRevenue = payments?.filter((p: any) => p.status === 'paid')
      .reduce((sum: number, p: any) => sum + parseFloat(p.amount || '0'), 0) || 0

    const classesToday = todayLogs?.length || 0
    const attendanceToday = todayLogs?.reduce((sum: number, log: any) => 
      sum + (log.attendance_count || 0), 0) || 0

    return NextResponse.json({
      stats: {
        totalClasses: classes?.length || 0,
        totalStudents,
        pendingPayments,
        totalRevenue,
        classesToday,
        attendanceToday
      },
      classes: classes || [],
      todaySchedule: todayLogs || [],
      recentMessages: messages || [],
      upcomingPayments: payments?.filter((p: any) => p.status === 'pending').slice(0, 5) || []
    })
  } catch (error) {
    console.error('Teacher dashboard error:', error)
    return NextResponse.json({ error: 'Failed to fetch teacher data' }, { status: 500 })
  }
}

async function getStudentDashboardData(supabase: SupabaseClient, studentId: string) {
  try {
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

    if (enrollmentsError) throw enrollmentsError

    // Get recent class logs for enrolled classes
    const classIds = enrollments?.map((e: any) => e.class_id) || []
    const { data: recentLogs, error: logsError } = await supabase
      .from('class_logs')
      .select(`
        *,
        classes(name, subject)
      `)
      .in('class_id', classIds)
      .order('date', { ascending: false })
      .limit(10)

    if (logsError) throw logsError

    // Get student's payments
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        *,
        classes(name, subject)
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })

    if (paymentsError) throw paymentsError

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

    if (attendanceError) throw attendanceError

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

    if (messagesError) throw messagesError

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
    console.error('Student dashboard error:', error)
    return NextResponse.json({ error: 'Failed to fetch student data' }, { status: 500 })
  }
}

async function getParentDashboardData(supabase: SupabaseClient, parentId: string) {
  try {
    // Get parent's children
    const { data: children, error: childrenError } = await supabase
      .from('profiles')
      .select('*')
      .eq('parent_id', parentId)
      .eq('role', 'student')

    if (childrenError) throw childrenError

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

    if (enrollmentsError) throw enrollmentsError

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

    if (paymentsError) throw paymentsError

    // Get recent class logs for children's classes
    const classIds = enrollments?.map((e: any) => e.class_id) || []
    const { data: recentLogs, error: logsError } = await supabase
      .from('class_logs')
      .select(`
        *,
        classes(name, subject)
      `)
      .in('class_id', classIds)
      .order('date', { ascending: false })
      .limit(10)

    if (logsError) throw logsError

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
    console.error('Parent dashboard error:', error)
    return NextResponse.json({ error: 'Failed to fetch parent data' }, { status: 500 })
  }
}