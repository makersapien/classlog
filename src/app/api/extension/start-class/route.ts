// src/app/api/extension/start-class/route.ts
// Fixed version with proper CORS handling for Chrome extension

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createOptionsResponse, addCorsHeaders } from '@/lib/cors'
import { verifyJWT } from '@/lib/jwt'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Handle preflight OPTIONS requests
export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request)
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Extension start-class API called')
    
    // Get teacher info from Bearer token
    let teacher_id: string | null = null
    let teacherInfo: { userId: string; email: string; name: string; role: string } | null = null
    
    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const decoded = verifyJWT(token)
      
      if (decoded && decoded.type === 'extension') {
        teacher_id = decoded.userId
        teacherInfo = decoded
        console.log('✅ Authenticated teacher from Bearer token:', decoded.email)
      } else {
        console.error('❌ Invalid or non-extension Bearer token')
        const response = NextResponse.json({ 
          success: false,
          error: 'Invalid authentication token' 
        }, { status: 401 })
        return addCorsHeaders(response, request)
      }
    } else {
      console.error('❌ No Bearer token provided')
      const response = NextResponse.json({ 
        success: false,
        error: 'Authentication required - Bearer token missing' 
      }, { status: 401 })
      return addCorsHeaders(response, request)
    }
    
    const body = await request.json()
    console.log('📥 Request body:', body)
    
    const { meetUrl, title, student_email, enrollment_id } = body

    // Validate required fields (now only meetUrl is required from extension)
    if (!meetUrl) {
      console.error('❌ Missing required field: meetUrl')
      const response = NextResponse.json({ 
        success: false,
        error: 'Missing required field: meetUrl' 
      }, { status: 400 })
      return addCorsHeaders(response, request)
    }

    console.log('🎯 Starting class for teacher:', teacherInfo.email, 'meetUrl:', meetUrl)

    // Step 1: Find enrollment using your existing check-meet-url logic
    let enrollment = null
    
    if (enrollment_id) {
      console.log('🔍 Looking up enrollment by ID:', enrollment_id)
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('*')
        .eq('id', enrollment_id)
        .eq('status', 'active')
        .single()

      if (enrollmentError) {
        console.error('❌ Enrollment lookup error:', enrollmentError)
      } else {
        enrollment = enrollmentData
        console.log('✅ Found enrollment by ID:', enrollment?.id)
      }
    }

    if (!enrollment) {
      console.log('🔍 Looking up enrollment by teacher and Google Meet URL')
      const { data: enrollmentByTeacher, error: teacherError } = await supabase
        .from('enrollments')
        .select('*')
        .eq('teacher_id', teacher_id)
        .eq('google_meet_url', meetUrl)
        .eq('status', 'active')
        .single()

      if (teacherError) {
        console.log('⚠️ No enrollment found by teacher and URL, trying partial URL match...')
        
        // Try partial URL matching in case of URL variations
        const { data: enrollmentsByTeacher, error: partialError } = await supabase
          .from('enrollments')
          .select('*')
          .eq('teacher_id', teacher_id)
          .eq('status', 'active')
        
        if (!partialError && enrollmentsByTeacher) {
          // Look for enrollments where the meet URL contains the same meeting ID
          const meetId = meetUrl.split('/').pop() // Extract meeting ID from URL
          enrollment = enrollmentsByTeacher.find(e => 
            e.google_meet_url && e.google_meet_url.includes(meetId)
          )
          
          if (enrollment) {
            console.log('✅ Found enrollment by partial URL match:', enrollment.id)
          }
        }
      } else {
        enrollment = enrollmentByTeacher
        console.log('✅ Found enrollment by teacher and URL:', enrollment?.id)
      }
    }

    if (!enrollment) {
      console.error('❌ No active enrollment found for meetUrl:', meetUrl)
      const response = NextResponse.json({ 
        success: false,
        error: 'No active enrollment found for this Meet URL. Please ensure you have an active student enrollment with this Google Meet link in your ClassLogger dashboard.',
        meetUrl: meetUrl,
        teacher: teacherInfo.email
      }, { status: 404 })
      return addCorsHeaders(response, request)
    }

    // Step 2: Get student info
    let studentName = 'Unknown Student'
    let studentEmail = student_email || 'unknown@example.com'
    
    const { data: studentProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', enrollment.student_id)
      .single()

    if (studentProfile) {
      studentName = studentProfile.full_name || 'Unknown Student'
      studentEmail = studentProfile.email || studentEmail
      
      // Verify email matches if provided by extension
      if (student_email && studentProfile.email !== student_email) {
        console.log('⚠️ Email mismatch - provided:', student_email, 'found:', studentProfile.email)
      }
    }
    
    console.log('👤 Student info:', studentName, studentEmail)

    // Step 3: Get class info  
    let subject = 'Unknown Subject'
    if (enrollment.class_id) {
      const { data: classInfo } = await supabase
        .from('classes')
        .select('subject, name')
        .eq('id', enrollment.class_id)
        .single()

      if (classInfo) {
        subject = classInfo.subject || classInfo.name || 'Unknown Subject'
      }
    }

    // Step 4: Check for existing ACTIVE class for this enrollment
    console.log('🔍 Checking for existing active class...')
    const { data: existingClass, error: checkError } = await supabase
      .from('class_logs')
      .select('*')
      .eq('enrollment_id', enrollment.id)
      .in('status', ['ongoing', 'started', 'in_progress'])
      .maybeSingle()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Database check error:', checkError)
      const response = NextResponse.json({ 
        success: false, 
        error: 'Database error checking existing classes' 
      }, { status: 500 })
      return addCorsHeaders(response, request)
    }

    // If there's an active class, return it instead of creating new one
    if (existingClass) {
      console.log('🔄 Resuming existing active class:', existingClass.id)
      
      // Update the class to mark it as resumed
      const { error: updateError } = await supabase
        .from('class_logs')
        .update({ 
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingClass.id)

      if (updateError) {
        console.error('⚠️ Failed to update existing class:', updateError)
      }

      const response = NextResponse.json({
        success: true,
        class_log_id: existingClass.id,
        message: 'Resumed existing class session',
        resumed: true,
        student_name: existingClass.student_name,
        subject: subject,
        start_time: existingClass.start_time,
        class_data: existingClass
      })
      return addCorsHeaders(response, request)
    }

    // Step 5: Check for recent classes (within 10 minutes) to prevent duplicates
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { data: recentClass } = await supabase
      .from('class_logs')
      .select('*')
      .eq('enrollment_id', enrollment.id)
      .gte('start_time', tenMinutesAgo)
      .eq('status', 'in_progress')
      .maybeSingle()

    if (recentClass) {
      console.log('🔄 Using recent class session:', recentClass.id)
      
      const response = NextResponse.json({
        success: true,
        class_log_id: recentClass.id,
        message: 'Using recent class session',
        resumed: true,
        student_name: recentClass.student_name,
        subject: subject,
        class_data: recentClass
      })
      return addCorsHeaders(response, request)
    }

    // Step 6: Create new class log
    console.log('✨ Creating new class log...')
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    
    const { data: classLog, error: insertError } = await supabase
      .from('class_logs')
      .insert({
        enrollment_id: enrollment.id,
        teacher_id: teacher_id,
        class_id: enrollment.class_id,
        student_email: studentEmail,
        student_name: studentName,
        google_meet_link: meetUrl,
        start_time: now.toISOString(),
        date: today,
        status: 'in_progress',
        content: title || `Class with ${studentName} - ${subject}`,
        topics_covered: [],
        homework_assigned: null,
        attachments: null,
        attendance_count: 1,
        total_students: 1,
        detected_automatically: false, // Manual from extension
        duration_minutes: null,
        end_time: null
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ Insert error:', insertError)
      const response = NextResponse.json({ 
        success: false,
        error: 'Failed to create class log: ' + insertError.message 
      }, { status: 500 })
      return addCorsHeaders(response, request)
    }

    console.log('✅ New class started with teacher_id:', teacher_id, 'class_id:', classLog.id)
    
    const response = NextResponse.json({
      success: true,
      class_log_id: classLog.id,
      message: 'Class started successfully',
      resumed: false,
      student_name: studentName,
      subject: subject,
      start_time: classLog.start_time,
      class_data: classLog
    })
    return addCorsHeaders(response, request)

  } catch (error) {
    console.error('❌ Start class error:', error)
    const response = NextResponse.json({ 
      success: false,
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 })
    return addCorsHeaders(response, request)
  }
}