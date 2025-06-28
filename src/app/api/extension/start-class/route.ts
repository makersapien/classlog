// src/app/api/extension/start-class/route.ts
// Fixed version with proper teacher_id extraction from token

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Extension start-class API called')
    
    const body = await request.json()
    console.log('📥 Request body:', body)
    
    const { meetUrl, student_email, enrollment_id, teacher_id, token } = body

    // Validate required fields
    if (!meetUrl || !student_email) {
      console.error('❌ Missing required fields')
      return NextResponse.json({ 
        success: false,
        error: 'Missing required fields: meetUrl and student_email' 
      }, { status: 400 })
    }

    // 🔧 FIX: Extract teacher_id from token if provided
    let validatedTeacherId = teacher_id // Use provided teacher_id as fallback

    if (token) {
      console.log('🔐 Validating token to get teacher ID...')
      const { data: tokenData, error: tokenError } = await supabase
        .from('extension_tokens')
        .select('teacher_id')
        .eq('token', token)
        .eq('is_active', true)
        .single()

      if (tokenError || !tokenData) {
        console.error('❌ Invalid token:', tokenError)
        return NextResponse.json({ 
          success: false,
          error: 'Invalid authentication token' 
        }, { status: 401 })
      }

      validatedTeacherId = tokenData.teacher_id
      console.log('✅ Teacher ID extracted from token:', validatedTeacherId)
    }

    if (!validatedTeacherId) {
      console.error('❌ No teacher ID found')
      return NextResponse.json({ 
        success: false,
        error: 'Authentication required - no teacher ID found' 
      }, { status: 401 })
    }

    // Step 1: Find enrollment (simplified approach)
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
      console.log('🔍 Looking up enrollment by meet URL:', meetUrl)
      const { data: enrollmentByUrl, error: urlError } = await supabase
        .from('enrollments')
        .select('*')
        .eq('google_meet_url', meetUrl)
        .eq('status', 'active')
        .single()

      if (urlError) {
        console.log('⚠️ No enrollment found by URL, trying by teacher and student...')
      } else {
        enrollment = enrollmentByUrl
        console.log('✅ Found enrollment by meet URL:', enrollment?.id)
      }
    }

    if (!enrollment && validatedTeacherId) {
      console.log('🔍 Looking up enrollment by teacher and Google Meet URL')
      const { data: enrollmentByTeacher, error: teacherError } = await supabase
        .from('enrollments')
        .select('*')
        .eq('teacher_id', validatedTeacherId)
        .eq('google_meet_url', meetUrl)
        .eq('status', 'active')
        .single()

      if (teacherError) {
        console.log('⚠️ No enrollment found by teacher and URL')
      } else {
        enrollment = enrollmentByTeacher
        console.log('✅ Found enrollment by teacher and URL:', enrollment?.id)
      }
    }

    if (!enrollment) {
      console.error('❌ No active enrollment found')
      return NextResponse.json({ 
        success: false,
        error: 'No active enrollment found for this Meet URL or student email' 
      }, { status: 404 })
    }

    // Step 2: Get student info
    let studentName = 'Unknown Student'
    const { data: studentProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', enrollment.student_id)
      .single()

    if (studentProfile) {
      studentName = studentProfile.full_name || 'Unknown Student'
      // Verify email matches if provided
      if (student_email && studentProfile.email !== student_email) {
        console.log('⚠️ Email mismatch - provided:', student_email, 'found:', studentProfile.email)
      }
    }

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
      return NextResponse.json({ 
        success: false, 
        error: 'Database error checking existing classes' 
      }, { status: 500 })
    }

    // If there's an active class, return it instead of creating new one
    if (existingClass) {
      console.log('🔄 Resuming existing active class:', existingClass.id)
      
      // Update the class to mark it as resumed AND fix teacher_id if null
// Update the class to mark it as resumed AND fix teacher_id if null
const updateData: {
  status: string;
  updated_at: string;
  teacher_id?: string;
} = { 
  status: 'in_progress',
  updated_at: new Date().toISOString()
}

// 🔧 FIX: Update teacher_id if it's null
if (!existingClass.teacher_id) {
  updateData.teacher_id = validatedTeacherId
  console.log('🔧 Fixing null teacher_id in existing class')
}

      const { error: updateError } = await supabase
        .from('class_logs')
        .update(updateData)
        .eq('id', existingClass.id)

      if (updateError) {
        console.error('⚠️ Failed to update existing class:', updateError)
      }

      return NextResponse.json({
        success: true,
        class_log_id: existingClass.id,
        message: 'Resumed existing class session',
        resumed: true,
        student_name: existingClass.student_name,
        subject: subject,
        start_time: existingClass.start_time,
        class_data: { ...existingClass, teacher_id: validatedTeacherId }
      })
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
      
      // 🔧 FIX: Update teacher_id if it's null in recent class too
      if (!recentClass.teacher_id) {
        await supabase
          .from('class_logs')
          .update({ teacher_id: validatedTeacherId })
          .eq('id', recentClass.id)
        console.log('🔧 Fixed null teacher_id in recent class')
      }
      
      return NextResponse.json({
        success: true,
        class_log_id: recentClass.id,
        message: 'Using recent class session',
        resumed: true,
        student_name: recentClass.student_name,
        subject: subject,
        class_data: { ...recentClass, teacher_id: validatedTeacherId }
      })
    }

    // Step 6: Create new class log
    console.log('✨ Creating new class log...')
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    
    const { data: classLog, error: insertError } = await supabase
      .from('class_logs')
      .insert({
        enrollment_id: enrollment.id,
        teacher_id: validatedTeacherId,  // 🔧 FIX: Use validated teacher ID from token
        class_id: enrollment.class_id,
        student_email: student_email,
        student_name: studentName,
        google_meet_link: meetUrl,
        start_time: now.toISOString(),
        date: today,
        status: 'in_progress',
        content: `Class with ${studentName} - ${subject}`,
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
      return NextResponse.json({ 
        success: false,
        error: 'Failed to create class log: ' + insertError.message 
      }, { status: 500 })
    }

    console.log('✅ New class started with teacher_id:', validatedTeacherId, 'class_id:', classLog.id)
    
    return NextResponse.json({
      success: true,
      class_log_id: classLog.id,
      message: 'Class started successfully',
      resumed: false,
      student_name: studentName,
      subject: subject,
      start_time: classLog.start_time,
      class_data: classLog
    })

  } catch (error) {
    console.error('❌ Start class error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 })
  }
}