// src/app/api/teacher/check-meet-url/route.ts - Fixed version with proper error handling
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { meetUrl, teacherId } = body

    if (!meetUrl || !teacherId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: meetUrl and teacherId' 
      }, { status: 400 })
    }

    console.log('🔍 Checking Meet URL:', meetUrl, 'for teacher:', teacherId)

    // Query enrollments with the specific Google Meet URL for this teacher
    const { data: enrollments, error: enrollmentError } = await supabase
      .from('enrollments')
      .select(`
        id,
        student_id,
        class_id,
        teacher_id,
        google_meet_url,
        status,
        created_at,
        student:profiles!enrollments_student_id_fkey (
          id,
          email,
          full_name
        ),
        class:classes (
          id,
          name,
          subject,
          year_group
        )
      `)
      .eq('google_meet_url', meetUrl)
      .eq('teacher_id', teacherId)
      .eq('status', 'active')
      .order('created_at', { ascending: false }) // Get most recent first

    if (enrollmentError) {
      console.error('❌ Database error:', enrollmentError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database query failed: ' + enrollmentError.message 
      }, { status: 500 })
    }

    if (!enrollments || enrollments.length === 0) {
      console.log('❌ No enrollments found for this Meet URL and teacher')
      return NextResponse.json({ 
        success: false, 
        error: 'No active enrollment found for this Google Meet URL. Please check the URL matches exactly with your ClassLogger dashboard.' 
      }, { status: 404 })
    }

    // ⚠️ CRITICAL: If multiple enrollments found, this indicates a data integrity issue
    if (enrollments.length > 1) {
      console.error(`🚨 DATA INTEGRITY ISSUE: Found ${enrollments.length} enrollments with the same Meet URL for teacher ${teacherId}:`)
      enrollments.forEach((e, idx) => {
        console.error(`  ${idx + 1}. Student: ${e.student?.full_name} (${e.student?.email}) - Created: ${e.created_at}`)
      })

      // Log this as a critical error for investigation
      console.error('🚨 This should not happen if database constraints are properly set up!')
      
      // Return error to force admin to fix the data
      return NextResponse.json({ 
        success: false, 
        error: `Critical Data Error: Multiple enrollments found with the same Google Meet URL. This indicates a database integrity issue that needs immediate attention. Found ${enrollments.length} duplicates for this URL.`,
        conflict_type: 'multiple_enrollments',
        duplicate_count: enrollments.length,
        enrollments: enrollments.map(e => ({
          id: e.id,
          student_name: e.student?.full_name,
          student_email: e.student?.email,
          created_at: e.created_at
        }))
      }, { status: 409 })
    }

    // Single enrollment found - this is the expected case
    const enrollment = enrollments[0]

    // Verify we have all required data
    if (!enrollment.student || !enrollment.class) {
      console.error('❌ Incomplete enrollment data:', enrollment)
      return NextResponse.json({ 
        success: false, 
        error: 'Incomplete enrollment data - missing student or class information' 
      }, { status: 500 })
    }

    console.log('✅ Valid enrollment found:', {
      student: enrollment.student.full_name,
      class: enrollment.class.name,
      subject: enrollment.class.subject
    })

    // Return the enrollment data in the format expected by the extension
    return NextResponse.json({
      success: true,
      enrollment: {
        id: enrollment.id,
        student_id: enrollment.student_id,
        student_name: enrollment.student.full_name,
        student_email: enrollment.student.email,
        class_id: enrollment.class_id,
        class_name: enrollment.class.name,
        subject: enrollment.class.subject,
        year_group: enrollment.class.year_group,
        google_meet_url: enrollment.google_meet_url,
        teacher_id: enrollment.teacher_id,
        status: enrollment.status
      },
      message: `Enrollment verified for ${enrollment.student.full_name}`
    })

  } catch (error) {
    console.error('❌ Check Meet URL API Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 })
  }
}