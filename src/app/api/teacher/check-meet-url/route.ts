// src/app/api/teacher/check-meet-url/route.ts - Updated to match your actual table structure
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
    // Get data from enrollments table and student profiles
    const { data: enrollments, error: enrollmentError } = await supabase
      .from('enrollments')
      .select(`
        id,
        student_id,
        class_id,
        teacher_id,
        google_meet_url,
        status,
        subject,
        year_group,
        enrollment_date,
        created_at,
        student:profiles!enrollments_student_id_fkey (
          id,
          email,
          full_name
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

    // Single enrollment found - this is the expected case
    const enrollment = enrollments[0]

    // If multiple enrollments found, log warning but use the most recent one
    if (enrollments.length > 1) {
      console.warn(`⚠️ Multiple enrollments found for this Meet URL. Using most recent one.`)
      console.warn(`Found ${enrollments.length} enrollments for teacher ${teacherId} and URL ${meetUrl}`)
    }

    // Verify we have student data
    if (!enrollment.student) {
      console.error('❌ Incomplete enrollment data - missing student:', enrollment)
      return NextResponse.json({ 
        success: false, 
        error: 'Incomplete enrollment data - missing student information' 
      }, { status: 500 })
    }

    console.log('✅ Valid enrollment found:', {
      student: enrollment.student.full_name,
      subject: enrollment.subject || 'General Class',
      year_group: enrollment.year_group || 'Not specified'
    })

    // Return the enrollment data in the format expected by the extension
    return NextResponse.json({
      success: true,
      enrollment: {
        id: enrollment.id,
        student_id: enrollment.student_id,
        class_id: enrollment.class_id,
        student_name: enrollment.student.full_name,
        student_email: enrollment.student.email,
        subject: enrollment.subject || 'General Class',
        year_group: enrollment.year_group || 'Grade 10',
        google_meet_url: enrollment.google_meet_url,
        teacher_id: enrollment.teacher_id,
        status: enrollment.status,
        enrollment_date: enrollment.enrollment_date
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