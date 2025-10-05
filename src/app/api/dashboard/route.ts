// src/app/api/dashboard/route.ts
import { NextResponse } from 'next/server'
import { Database } from '@/types/database'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-server'

// Type definitions for better type safety
interface ClassWithEnrollments {
  id: string
  name: string
  subject: string
  grade: string | null
  description: string | null // Added this required field
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

// Enhanced class log types for the new view
interface EnhancedClassLog {
  id: string
  class_id: string | null
  teacher_id: string | null
  date: string
  content: string
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled' | 'in_progress'
  attendance_count: number | null
  total_students: number | null
  created_at: string
  updated_at: string
  start_time: string | null
  end_time: string | null
  duration_minutes: number | null
  google_meet_link: string | null
  detected_automatically: boolean | null
  student_name: string | null
  student_email: string | null
  enrollment_id: string | null
  
  // New content fields from the enhanced view
  topic_1: string | null
  topic_2: string | null
  topic_3: string | null
  topic_4: string | null
  topic_5: string | null
  homework_title: string | null
  homework_description: string | null
  homework_due_date: string | null
  teacher_notes: string | null
  student_performance: string | null
  key_points: string | null
  content_duration_minutes: number | null
  participants_count: number | null
  features_used: string | null
  
  // Computed fields from the view
  topics_array: string[] | null
  homework_summary: string | null
}

interface ProcessedClassLog extends EnhancedClassLog {
  topics_display: string
  topics_count: number
  has_homework: boolean
  homework_display: string
  duration_display: string
  features_display: string
}

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

import { createClient } from '@supabase/supabase-js'

type SupabaseClient = ReturnType<typeof createClient<Database>>

export async function GET(request: Request) {
  console.log('🔄 Dashboard API called')
  
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    
    console.log('📝 Role requested:', role)
    
    // Use the new Next.js 15 compatible helper
    const { supabase, user } = await createAuthenticatedSupabaseClient()

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
    
    // Provide more specific error messages based on the error type
    let errorMessage = 'Internal server error';
    let errorDetails = error instanceof Error ? error.message : 'Unknown error';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('cookies')) {
        errorMessage = 'Cookie handling error';
        errorDetails = 'Failed to process authentication cookies';
      } else if (error.message.includes('auth')) {
        errorMessage = 'Authentication error';
        statusCode = 401;
      } else if (error.message.includes('permission') || error.message.includes('access')) {
        errorMessage = 'Permission denied';
        statusCode = 403;
      } else if (error.message.includes('not found')) {
        errorMessage = 'Resource not found';
        statusCode = 404;
      }
    }
    
    return NextResponse.json({ 
      error: errorMessage, 
      details: errorDetails,
      timestamp: new Date().toISOString(),
      path: request.url
    }, { status: statusCode })
  }
}

async function getTeacherDashboardData(supabase: SupabaseClient, teacherId: string) {
  try {
    console.log('🧑‍🏫 Fetching teacher dashboard data for:', teacherId)

    // Get teacher's classes with better error handling
    console.log('📚 Fetching classes and enrollments...')
    
    // First check if there are any enrollments directly associated with the teacher
    const { data: directEnrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select(`
        id,
        student_id,
        class_id,
        status,
        teacher_id,
        subject,
        year_group,
        classes_per_week,
        classes_per_recharge,
        tentative_schedule,
        whatsapp_group_url,
        google_meet_url,
        setup_completed,
        profiles!enrollments_student_id_fkey(
          id,
          full_name,
          email
        )
      `)
      .eq('teacher_id', teacherId)
      .eq('status', 'active')
      .is('class_id', null) // Only get enrollments not associated with a class
    
    if (enrollmentsError) {
      console.error('❌ Direct enrollments query error:', enrollmentsError)
    }
    
    console.log('✅ Direct enrollments found:', directEnrollments?.length || 0)
    
    // If we have direct enrollments, create synthetic classes for them
    let syntheticClasses: ClassWithEnrollments[] = [];
    if (directEnrollments && directEnrollments.length > 0) {
      // Group enrollments by subject and year_group
      type DirectEnrollmentType = {
        id: string
        student_id: string
        status: string
        profiles: Array<{
          id: string
          full_name: string | null
          email: string
        }>
        subject?: string
        year_group?: string
        class_id?: string
        teacher_id?: string
        classes_per_week?: number
        classes_per_recharge?: number
        tentative_schedule?: string
        whatsapp_group_url?: string
        google_meet_url?: string
        setup_completed?: boolean
      }
      
      const groupedEnrollments: Record<string, DirectEnrollmentType[]> = directEnrollments.reduce((acc: Record<string, DirectEnrollmentType[]>, enrollment: DirectEnrollmentType) => {
        const key = `${enrollment.subject || 'General'}-${enrollment.year_group || 'All'}`;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(enrollment);
        return acc;
      }, {});
      
      // Create synthetic classes with proper typing
      syntheticClasses = Object.entries(groupedEnrollments).map(([key, groupEnrollments]) => {
        const [subject, grade] = key.split('-');
        return {
          id: `synthetic-${key}`,
          name: `${subject} for ${grade}`,
          subject,
          grade,
          description: null, // Added this required field
          teacher_id: teacherId,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          enrollments: groupEnrollments.map(enrollment => ({
            id: enrollment.id,
            student_id: enrollment.student_id,
            status: enrollment.status,
            profiles: enrollment.profiles && enrollment.profiles.length > 0 ? {
              full_name: enrollment.profiles[0].full_name,
              email: enrollment.profiles[0].email
            } : null
          }))
        };
      });
      
      console.log('✅ Created synthetic classes:', syntheticClasses.length)
    }
    
    // Now get regular classes with their enrollments
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select(`
        *,
        enrollments!inner(
          id,
          student_id,
          status,
          classes_per_week,
          classes_per_recharge,
          tentative_schedule,
          whatsapp_group_url,
          google_meet_url,
          setup_completed,
          profiles!enrollments_student_id_fkey(
            id,
            full_name,
            email
          )
        )
      `)
      .eq('teacher_id', teacherId)
      .eq('status', 'active')
      .eq('enrollments.status', 'active')

    if (classesError) {
      console.error('❌ Classes query error:', classesError)
    }
    
    console.log('✅ Regular classes found:', classes?.length || 0)
    
    // Combine regular classes with synthetic classes - ensure proper typing
    const regularClassesTyped: ClassWithEnrollments[] = (classes || []).map(cls => ({
      ...cls,
      description: cls.description || null // Ensure description field exists
    }));
    
    const combinedClasses = [
      ...regularClassesTyped,
      ...syntheticClasses
    ];

    const typedClasses = combinedClasses as ClassWithEnrollments[]
    console.log('✅ Total classes (regular + synthetic):', typedClasses?.length || 0)
    
    // Get all student IDs from enrollments
    const studentIds = new Set<string>();
    typedClasses?.forEach(cls => {
      cls.enrollments?.forEach(enrollment => {
        if (enrollment.student_id) {
          studentIds.add(enrollment.student_id);
        }
      });
    });
    
    // Fetch credit information for all students
    const creditData = {} as Record<string, { balance_hours: number, total_purchased: number, total_used: number }>;
    
    if (studentIds.size > 0) {
      console.log('💰 Fetching credit data for students:', Array.from(studentIds));
      
      const { data: credits, error: creditsError } = await supabase
        .from('credits')
        .select('*')
        .eq('teacher_id', teacherId)
        .in('student_id', Array.from(studentIds))
        .eq('is_active', true);
      
      if (creditsError) {
        console.error('❌ Credits query error:', creditsError);
      } else if (credits) {
        // Create a map of student_id to credit data
        credits.forEach(credit => {
          if (credit.student_id) {
            creditData[credit.student_id] = {
              balance_hours: credit.balance_hours || 0,
              total_purchased: credit.total_purchased || 0,
              total_used: credit.total_used || 0
            };
          }
        });
        
        console.log('✅ Credit data fetched for students:', Object.keys(creditData).length);
      }
    }
    
    // Attach credit data to classes and enrollments
    typedClasses?.forEach(cls => {
      cls.enrollments?.forEach(enrollment => {
        if (enrollment.student_id && creditData[enrollment.student_id]) {
          (enrollment as { creditData?: { balance_hours: number, total_purchased: number, total_used: number } }).creditData = creditData[enrollment.student_id];
        }
      });
    });

    // 🔧 UPDATED: Use the enhanced view for class logs
    const today = new Date().toISOString().split('T')[0]
    console.log('📅 Fetching enhanced logs for date:', today)
    
    const { data: enhancedLogs, error: logsError } = await supabase
      .from('class_logs_enhanced')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('date', { ascending: false })
      .limit(50)

    if (logsError) {
      console.error('❌ Enhanced logs query error:', logsError)
      console.log('🔄 Falling back to regular class_logs...')
      
      // Fallback to regular class_logs if enhanced view doesn't exist yet
      const { data: regularLogs, error: regularLogsError } = await supabase
        .from('class_logs')
        .select(`
          *,
          classes(name, subject, grade)
        `)
        .eq('teacher_id', teacherId)
        .order('date', { ascending: false })
        .limit(50)

      if (regularLogsError) {
        console.error('❌ Regular logs query error:', regularLogsError)
      }

      // Process regular logs for backward compatibility
      const processedRegularLogs: ProcessedClassLog[] = (regularLogs as ClassLogWithDetails[] || []).map((log: ClassLogWithDetails) => ({
        // Core required fields from EnhancedClassLog
        id: log.id,
        class_id: log.class_id,
        teacher_id: log.teacher_id,
        date: log.date,
        content: log.notes || '', // Map notes to content for compatibility
        status: 'completed' as const, // Default status
        attendance_count: log.attendance_count,
        created_at: log.created_at,
        updated_at: log.updated_at,
        
        // Enhanced fields (set to null for regular logs)
        total_students: null,
        start_time: null,
        end_time: null,
        duration_minutes: null,
        google_meet_link: null,
        detected_automatically: null,
        student_name: null,
        student_email: null,
        enrollment_id: null,
        topic_1: null,
        topic_2: null,
        topic_3: null,
        topic_4: null,
        topic_5: null,
        homework_title: null,
        homework_description: null,
        homework_due_date: null,
        teacher_notes: log.notes,
        student_performance: null,
        key_points: null,
        content_duration_minutes: null,
        participants_count: null,
        features_used: null,
        topics_array: null,
        homework_summary: null,
        
        // Processed fields
        topics_display: 'No topics recorded',
        topics_count: 0,
        has_homework: false,
        homework_display: 'No homework assigned',
        duration_display: 'Unknown duration',
        features_display: 'Standard session'
      }))

      const todayRegularLogs = processedRegularLogs.filter((log: ProcessedClassLog) => log.date === today)

      return NextResponse.json({
        stats: {
          totalClasses: typedClasses?.length || 0,
          totalStudents: 0,
          pendingPayments: 0,
          totalRevenue: 0,
          classesToday: todayRegularLogs.length,
          attendanceToday: 0
        },
        classes: typedClasses || [],
        classLogs: processedRegularLogs,
        todaySchedule: todayRegularLogs,
        recentMessages: [],
        upcomingPayments: []
      })
    }

    const typedEnhancedLogs = enhancedLogs as EnhancedClassLog[] | null
    console.log('✅ Enhanced logs fetched:', typedEnhancedLogs?.length || 0)

    // Process enhanced logs for display with proper typing
    const processedLogs: ProcessedClassLog[] = (typedEnhancedLogs || []).map((log: EnhancedClassLog) => ({
      ...log,
      // Topics are now readily available as topics_array
      topics_display: log.topics_array?.join(', ') || 'No topics recorded',
      topics_count: log.topics_array?.length || 0,
      
      // Homework is now readily available
      has_homework: Boolean(log.homework_summary),
      homework_display: log.homework_summary || 'No homework assigned',
      
      // Duration with fallback
      duration_display: log.content_duration_minutes 
        ? `${Math.floor(log.content_duration_minutes/60)}h ${log.content_duration_minutes%60}m`
        : log.duration_minutes 
        ? `${Math.floor(log.duration_minutes/60)}h ${log.duration_minutes%60}m`
        : 'Unknown duration',
        
      // Features used
      features_display: log.features_used || 'Standard session'
    }))

    // Filter today's logs with proper typing
    const todayLogs: ProcessedClassLog[] = processedLogs.filter((log: ProcessedClassLog) => log.date === today)

    // Get payment statistics for teacher's classes with better error handling
    const classIds = typedClasses?.map((c: ClassWithEnrollments) => c.id).filter(id => !id.startsWith('synthetic-')) || []
    let payments: Payment[] = []
    
    if (classIds.length > 0) {
      console.log('💰 Fetching payments for classes:', classIds.length)
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .in('class_id', classIds)

      if (paymentsError) {
        console.error('❌ Payments query error:', paymentsError)
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
    }

    const typedMessages = messages as MessageWithDetails[] | null
    console.log('✅ Messages fetched:', typedMessages?.length || 0)

    // Calculate statistics safely
    const totalStudents = typedClasses?.reduce((sum: number, cls: ClassWithEnrollments) => {
      const activeEnrollments = cls.enrollments?.filter((e) => e.status === 'active') || []
      return sum + activeEnrollments.length
    }, 0) || 0

    const pendingPayments = payments.filter((p: Payment) => p.status === 'pending').length
    const totalRevenue = payments
      .filter((p: Payment) => p.status === 'paid')
      .reduce((sum: number, p: Payment) => sum + parseFloat(p.amount || '0'), 0)

    const classesToday = todayLogs.length
    const attendanceToday = todayLogs.reduce((sum: number, log: ProcessedClassLog) => 
      sum + (log.attendance_count || 0), 0)

    // Transform enrollments into student data
    interface StudentData {
      id: string;
      name: string;
      grade: string | null;
      subject: string;
      status: string;
      paymentStatus: string;
      creditsRemaining: number;
      totalCredits: number;
      attendanceRate: number;
      performance: string;
      parent_email: string | null;
    }
    
    const students: StudentData[] = [];
    
    if (typedClasses && typedClasses.length > 0) {
      // Create a map to avoid duplicate students
      const studentMap = new Map<string, boolean>();
      
      typedClasses.forEach(cls => {
        cls.enrollments?.forEach(enrollment => {
          if (enrollment.student_id && enrollment.profiles) {
            const studentId = enrollment.student_id;
            
            // Skip if we've already processed this student
            if (studentMap.has(studentId)) return;
            
            // Get credit data for this student
            const credit = creditData[studentId] || { 
              balance_hours: 0, 
              total_purchased: 0, 
              total_used: 0 
            };
            
            // Create student object
            const student: StudentData = {
              id: studentId,
              name: enrollment.profiles.full_name || 'Unknown Student',
              grade: cls.grade,
              subject: cls.subject || 'General',
              status: enrollment.status,
              paymentStatus: 'paid', // Default value
              creditsRemaining: credit.balance_hours,
              totalCredits: credit.total_purchased,
              attendanceRate: 90, // Default value
              performance: 'good', // Default value
              parent_email: enrollment.profiles.email
            };
            
            // Add to map and array
            studentMap.set(studentId, true);
            students.push(student);
          }
        });
      });
    }
    
    console.log('✅ Transformed students:', students.length);

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
      classLogs: processedLogs, // 👈 Enhanced logs with topics/homework ready
      todaySchedule: todayLogs,
      recentMessages: typedMessages || [],
      upcomingPayments: payments.filter((p: Payment) => p.status === 'pending').slice(0, 5),
      students: students // Add students to the response
    }

    console.log('✅ Teacher dashboard data prepared successfully')
    console.log('📊 Sample enhanced log:', processedLogs[0]) // Debug first log

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