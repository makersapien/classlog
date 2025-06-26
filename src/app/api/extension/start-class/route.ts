// src/app/api/extension/start-class/route.ts - Converted from Pages API to App Router
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Define proper types for the request body
interface StartClassRequestBody {
  meetUrl: string
  student_email: string
  enrollment_id: string
  token?: string
}

interface TokenValidationResponse {
  success: boolean
  teacher?: {
    id: string
    name: string
    email: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: StartClassRequestBody = await request.json()
    const { meetUrl, student_email, enrollment_id, token } = body

    console.log('🚀 Starting class for enrollment:', enrollment_id)

    if (!meetUrl || !student_email) {
      return NextResponse.json({ 
        success: false,
        error: 'Missing required fields: meetUrl and student_email' 
      }, { status: 400 })
    }

    // Validate token if provided and get teacher info
    let teacherId: string | null = null;
    if (token) {
      try {
        const tokenResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/teacher/tokens/validate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token })
        });

        if (!tokenResponse.ok) {
          return NextResponse.json({ 
            success: false, 
            error: 'Invalid authentication token' 
          }, { status: 401 })
        }

        const tokenData: TokenValidationResponse = await tokenResponse.json()
        if (!tokenData.success || !tokenData.teacher) {
          return NextResponse.json({ 
            success: false, 
            error: 'Invalid authentication token' 
          }, { status: 401 })
        }
        
        // Store teacher ID for use in creating class log
        teacherId = tokenData.teacher.id;
        console.log('✅ Token validated for teacher:', teacherId);
        
      } catch (tokenError) {
        console.warn('Token validation failed:', tokenError)
        // Continue without token validation for now
      }
    }

    // Check for existing ACTIVE class for this enrollment
    const { data: existingClass, error: checkError } = await supabase
      .from('class_logs')
      .select('*')
      .eq('enrollment_id', enrollment_id)
      .in('status', ['ongoing', 'started', 'in_progress'])
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Database check error:', checkError);
      return NextResponse.json({ 
        success: false, 
        error: 'Database error checking existing classes: ' + checkError.message 
      }, { status: 500 });
    }

    // If there's an active class, return it instead of creating new one
    if (existingClass) {
      console.log('🔄 Resuming existing active class:', existingClass.id);
      
      // Update the class to mark it as resumed
      const { error: updateError } = await supabase
        .from('class_logs')
        .update({ 
          status: 'ongoing',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingClass.id);

      if (updateError) {
        console.error('Failed to update existing class:', updateError);
      }

      return NextResponse.json({
        success: true,
        class_log_id: existingClass.id,
        message: 'Resumed existing class session',
        resumed: true,
        student_name: existingClass.student_name,
        subject: existingClass.subject || 'Class',
        start_time: existingClass.start_time,
        class_data: existingClass
      });
    }

    // Check for recent classes (within 5 minutes) to prevent duplicates
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentClass } = await supabase
      .from('class_logs')
      .select('*')
      .eq('enrollment_id', enrollment_id)
      .gte('start_time', fiveMinutesAgo)
      .eq('status', 'ongoing')
      .maybeSingle();

    if (recentClass) {
      console.log('🔄 Using recent class session:', recentClass.id);
      return NextResponse.json({
        success: true,
        class_log_id: recentClass.id,
        message: 'Using recent class session',
        resumed: true,
        class_data: recentClass
      });
    }

    // Create new class log - using your actual column names
    const { data: classLog, error: insertError } = await supabase
      .from('class_logs')
      .insert({
        enrollment_id: enrollment_id,
        teacher_id: teacherId, // Now properly defined
        student_email: student_email,
        google_meet_link: meetUrl, // Fixed: use google_meet_link (your actual column name)
        date: new Date().toISOString().split('T')[0], // Required field - date only
        start_time: new Date().toISOString(),
        status: 'ongoing',
        content: 'Class started via extension',
        topics_covered: [],
        homework_assigned: null,
        attachments: null,
        detected_automatically: true,
        attendance_count: 1,
        total_students: 1
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ 
        success: false,
        error: 'Failed to create class log: ' + insertError.message 
      }, { status: 500 });
    }

    console.log('✅ New class started:', classLog.id);
    
    return NextResponse.json({
      success: true,
      class_log_id: classLog.id,
      message: 'Class started successfully',
      resumed: false,
      class_data: classLog
    });

  } catch (error) {
    console.error('❌ Start class API error:', error);
    
    // Fix: Proper error handling with type safety
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error: ' + errorMessage 
    }, { status: 500 });
  }
}