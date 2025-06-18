// src/app/api/cron/detect-classes/route.ts
// App Router cron job for Google Meet auto-detection

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Verify cron request
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔍 Checking Google Meet classes...')
    
    // 1. Get all enrollments with Google Meet links
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select(`
        id,
        google_meet_url,
        teacher_id,
        student_name,
        student_email,
        subject
      `)
      .not('google_meet_url', 'is', null)

    if (enrollmentsError) {
      throw new Error(`Failed to fetch enrollments: ${enrollmentsError.message}`)
    }

    console.log(`📚 Found ${enrollments.length} enrollments to check`)

    const results = { checked: 0, started: 0, ended: 0, errors: 0 }

    // 2. Check each enrollment's Google Meet
    for (const enrollment of enrollments) {
      try {
        await checkEnrollmentMeeting(enrollment, results)
        results.checked++
      } catch (error: any) {
        console.error(`❌ Error checking ${enrollment.student_name}:`, error.message)
        results.errors++
      }
    }

    // 3. Clean up stale classes (running > 3 hours)
    await cleanupStaleClasses()

    console.log('✅ Detection completed:', results)
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results
    })

  } catch (error: any) {
    console.error('💥 Detection failed:', error)
    return NextResponse.json({ 
      error: 'Detection failed', 
      message: error.message 
    }, { status: 500 })
  }
}

async function checkEnrollmentMeeting(enrollment: any, results: any) {
  const { google_meet_url, teacher_id, student_name, student_email, subject } = enrollment

  // Check if meeting is active
  const isActive = await isMeetingActive(google_meet_url)
  
  // Check if we already have an active class log for this student today
  const today = new Date().toISOString().split('T')[0]
  const { data: activeLog } = await supabase
    .from('class_logs')
    .select('*')
    .eq('student_email', student_email)
    .eq('teacher_id', teacher_id)
    .eq('status', 'in_progress')
    .eq('date', today)
    .order('start_time', { ascending: false })
    .limit(1)
    .single()

  const hasActiveLog = !!activeLog

  if (isActive && !hasActiveLog) {
    // Meeting started - create new class log
    await startClassLog({
      teacher_id,
      student_name,
      student_email,
      google_meet_link: google_meet_url,
      subject: subject || 'Unknown Subject'
    })
    results.started++
    console.log(`🟢 Started class for ${student_name}`)
    
  } else if (!isActive && hasActiveLog) {
    // Meeting ended - complete the class log
    await endClassLog(activeLog)
    results.ended++
    console.log(`🔴 Ended class for ${student_name}`)
  }
}

async function isMeetingActive(meetUrl: string): Promise<boolean> {
  try {
    // Simple HTTP check to see if meeting is accessible
    const response = await fetch(meetUrl, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ClassLogger/1.0)'
      },
      signal: AbortSignal.timeout(10000)
    })

    // For Google Meet, we consider it "active" if we get a 200 response
    return response.status === 200

  } catch (error: any) {
    console.warn(`⚠️ Could not check ${meetUrl}:`, error.message)
    return false
  }
}

async function startClassLog(classData: any) {
  const now = new Date()
  const today = now.toISOString().split('T')[0]

  const { error } = await supabase
    .from('class_logs')
    .insert([{
      // Your existing columns
      teacher_id: classData.teacher_id,
      date: today,
      content: `Auto-detected class with ${classData.student_name}`,
      topics_covered: [],
      homework_assigned: null,
      attendance_count: 1,
      total_students: 1,
      status: 'in_progress',
      attachments: null,
      
      // New auto-detection columns
      start_time: now.toISOString(),
      end_time: null,
      duration_minutes: null,
      google_meet_link: classData.google_meet_link,
      detected_automatically: true,
      student_name: classData.student_name,
      student_email: classData.student_email
    }])

  if (error) {
    throw new Error(`Failed to start class log: ${error.message}`)
  }
}

async function endClassLog(activeLog: any) {
  const now = new Date()
  const startTime = new Date(activeLog.start_time)
  const durationMinutes = Math.round((now.getTime() - startTime.getTime()) / (1000 * 60))

  // Update the content to include actual duration
  const updatedContent = `${activeLog.content} - Duration: ${Math.floor(durationMinutes/60)}h ${durationMinutes%60}m`

  const { error } = await supabase
    .from('class_logs')
    .update({
      end_time: now.toISOString(),
      duration_minutes: durationMinutes,
      status: 'completed',
      content: updatedContent,
      updated_at: now.toISOString()
    })
    .eq('id', activeLog.id)

  if (error) {
    throw new Error(`Failed to end class log: ${error.message}`)
  }
}

async function cleanupStaleClasses() {
  // Mark classes as completed if they've been running for more than 3 hours
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000)
  
  const { data: staleClasses } = await supabase
    .from('class_logs')
    .select('*')
    .eq('status', 'in_progress')
    .eq('detected_automatically', true)
    .lt('start_time', threeHoursAgo.toISOString())

  if (staleClasses && staleClasses.length > 0) {
    console.log(`🧹 Cleaning up ${staleClasses.length} stale classes`)
    
    for (const staleClass of staleClasses) {
      const updatedContent = `${staleClass.content} [Auto-ended: exceeded 3 hours]`
      
      await supabase
        .from('class_logs')
        .update({
          status: 'completed',
          end_time: new Date().toISOString(),
          duration_minutes: 180, // Assume 3 hours
          content: updatedContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', staleClass.id)
    }
  }
}