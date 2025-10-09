// src/app/api/teacher/check-meet-url/route.ts
// Complete fixed version with proper TypeScript CORS handling

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Fixed CORS helper with proper TypeScript compatibility
function getCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin')
  
  if (origin && origin.startsWith('chrome-extension://')) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
      'Access-Control-Allow-Credentials': 'true',
    }
  }
  
  if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
      'Access-Control-Allow-Credentials': 'true',
    }
  }
  
  if (origin && (
    origin.includes('meet.google.com') || 
    origin.includes('zoom.us') || 
    origin.includes('teams.microsoft.com')
  )) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
      'Access-Control-Allow-Credentials': 'true',
    }
  }
  
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
  }
}

// Define proper types for the API
interface StudentProfile {
  id: string
  email: string
  full_name: string
}

interface EnrollmentData {
  id: string
  student_id: string
  class_id: string
  teacher_id: string
  google_meet_url: string
  status: string
  subject?: string
  year_group?: string
  enrollment_date: string
  created_at: string
  student: StudentProfile | StudentProfile[] | null
}

interface CheckMeetUrlRequestBody {
  meetUrl: string
  teacherId: string
}

// Handle preflight OPTIONS requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(request),
  })
}

export async function POST(request: NextRequest) {
  try {
    // Initialize Supabase client inside function to avoid build-time env var issues
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const body: CheckMeetUrlRequestBody = await request.json()
    const { meetUrl, teacherId } = body

    if (!meetUrl || !teacherId) {
      const response = NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: meetUrl and teacherId' 
      }, { status: 400 })
      
      // Add CORS headers with proper typing
      const corsHeaders = getCorsHeaders(request)
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      
      return response
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
      .order('created_at', { ascending: false }) as { data: EnrollmentData[] | null, error: unknown }

    if (enrollmentError) {
      console.error('❌ Database error:', enrollmentError)
      const response = NextResponse.json({ 
        success: false, 
        error: 'Database query failed: ' + (enrollmentError instanceof Error ? enrollmentError.message : 'Unknown error')
      }, { status: 500 })
      
      // Add CORS headers
      const corsHeaders = getCorsHeaders(request)
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      
      return response
    }

    if (!enrollments || enrollments.length === 0) {
      console.log('❌ No enrollments found for this Meet URL and teacher')
      const response = NextResponse.json({ 
        success: false, 
        error: 'No active enrollment found for this Google Meet URL. Please check the URL matches exactly with your ClassLogger dashboard.' 
      }, { status: 404 })
      
      // Add CORS headers
      const corsHeaders = getCorsHeaders(request)
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      
      return response
    }

    // Single enrollment found - this is the expected case
    const enrollment = enrollments[0]

    // If multiple enrollments found, log warning but use the most recent one
    if (enrollments.length > 1) {
      console.warn(`⚠️ Multiple enrollments found for this Meet URL. Using most recent one.`)
      console.warn(`Found ${enrollments.length} enrollments for teacher ${teacherId} and URL ${meetUrl}`)
    }

    // Fix: Handle the case where student might be an array due to Supabase join
    const studentProfile = Array.isArray(enrollment.student) 
      ? enrollment.student[0] 
      : enrollment.student

    // Verify we have student data
    if (!studentProfile) {
      console.error('❌ Incomplete enrollment data - missing student:', enrollment)
      const response = NextResponse.json({ 
        success: false, 
        error: 'Incomplete enrollment data - missing student information' 
      }, { status: 500 })
      
      // Add CORS headers
      const corsHeaders = getCorsHeaders(request)
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      
      return response
    }

    console.log('✅ Valid enrollment found:', {
      student: studentProfile.full_name,
      subject: enrollment.subject || 'General Class',
      year_group: enrollment.year_group || 'Not specified'
    })

    // Return the enrollment data in the format expected by the extension
    const response = NextResponse.json({
      success: true,
      enrollment: {
        id: enrollment.id,
        student_id: enrollment.student_id,
        class_id: enrollment.class_id,
        student_name: studentProfile.full_name,
        student_email: studentProfile.email,
        subject: enrollment.subject || 'General Class',
        year_group: enrollment.year_group || 'Grade 10',
        google_meet_url: enrollment.google_meet_url,
        teacher_id: enrollment.teacher_id,
        status: enrollment.status,
        enrollment_date: enrollment.enrollment_date
      },
      message: `Enrollment verified for ${studentProfile.full_name}`
    })
    
    // Add CORS headers
    const corsHeaders = getCorsHeaders(request)
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    return response

  } catch (error) {
    console.error('❌ Check Meet URL API Error:', error)
    
    // Fix: Proper error handling with type safety
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    const response = NextResponse.json({ 
      success: false, 
      error: 'Internal server error: ' + errorMessage 
    }, { status: 500 })
    
    // Add CORS headers
    const corsHeaders = getCorsHeaders(request)
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    return response
  }
}