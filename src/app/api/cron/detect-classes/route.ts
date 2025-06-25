// src/app/api/cron/detect-classes/route.ts
// Enhanced auto-detection with better Google Meet validation
// Set up to run every 5 minutes via cron

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/types/database'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Types based on actual Supabase response structure
interface SupabaseJoinResult {
  id: string
  student_id: string | null
  class_id: string | null
  teacher_id: string | null
  google_meet_url: string | null
  status: string | null
  tentative_schedule: unknown
  classes_per_week: number | null
  subject: string | null
  year_group: string | null
  // Supabase foreign key joins return any[] or null
  student_profile: unknown[] | null
  class_info: unknown[] | null
}

interface ProcessedEnrollment {
  id: string
  student_id: string
  class_id: string
  teacher_id: string
  google_meet_url: string
  status: string
  tentative_schedule: ScheduleData | null
  classes_per_week: number
  subject: string | null
  year_group: string | null
  student_profile: {
    full_name: string
    email: string
  } | null
  class_info: {
    subject: string
    name: string
  } | null
}

interface ScheduleData {
  [key: string]: unknown
}

interface ClassData {
  teacher_id: string
  class_id: string
  student_name: string
  student_email: string
  google_meet_link: string
  subject: string
}

interface ClassLog {
  id: string
  teacher_id: string
  date: string
  status: string
  start_time: string | null
  end_time: string | null
  student_name: string | null
  student_email: string | null
  google_meet_link: string | null
  detected_automatically: boolean
  content: string
}

interface DetectionResults {
  checked: number
  started: number
  ended: number
  skipped: number
  errors: number
  enrollments_found: number
}

interface MeetingStatus {
  isAccessible: boolean
  hasActiveParticipants: boolean
  confidence: 'high' | 'medium' | 'low'
  reason: string
}

interface MetadataResult {
  hasIndicators: boolean
  [key: string]: unknown
}

interface ScheduleValidation {
  valid: boolean
  reason?: string
}

interface ProcessingDecision {
  process: boolean
  reason: string
}

// Type for schedule slot
interface ScheduleSlot {
  day?: number
  dayOfWeek?: number
  startTime?: string
  start?: string
  endTime?: string
  end?: string
}

export async function GET(_request: NextRequest) {
  try {
    // Uncomment for production with proper cron secret
    /*
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    */

    console.log('🔍 Starting enhanced class detection...')
    const startTime = Date.now()
    
    // 1. Get all active enrollments with Google Meet URLs
    // The enrollments table has teacher_id directly now
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select(`
        id,
        student_id,
        class_id,
        teacher_id,
        google_meet_url,
        status,
        tentative_schedule,
        classes_per_week,
        subject,
        year_group,
        student_profile:profiles!enrollments_student_id_fkey(
          full_name,
          email
        ),
        class_info:classes!enrollments_class_id_fkey(
          subject,
          name
        )
      `)
      .eq('status', 'active')
      .not('google_meet_url', 'is', null)
      .not('google_meet_url', 'eq', '')
      .not('teacher_id', 'is', null)

    if (enrollmentsError) {
      throw new Error(`Failed to fetch enrollments: ${enrollmentsError.message}`)
    }

    // Convert and validate the query results
    const rawEnrollments = enrollments as SupabaseJoinResult[]
    const typedEnrollments: ProcessedEnrollment[] = rawEnrollments
      .filter(raw => {
        // Check if we have the required basic fields
        if (!raw.google_meet_url || !raw.teacher_id || !raw.student_id || !raw.class_id) {
          return false
        }
        
        // Check if student_profile join returned data
        if (!raw.student_profile || !Array.isArray(raw.student_profile) || raw.student_profile.length === 0) {
          return false
        }
        
        // Extract the first student profile (should only be one)
        const studentProfile = raw.student_profile[0] as any
        return studentProfile && studentProfile.email
      })
      .map(raw => {
        // Extract student profile data safely
        const studentProfile = (raw.student_profile as any[])[0] as any
        const classInfo = raw.class_info && Array.isArray(raw.class_info) && raw.class_info.length > 0 
          ? (raw.class_info[0] as any) 
          : null

        return {
          id: raw.id,
          student_id: raw.student_id!,
          class_id: raw.class_id!,
          teacher_id: raw.teacher_id!,
          google_meet_url: raw.google_meet_url!,
          status: raw.status || 'active',
          tentative_schedule: raw.tentative_schedule as ScheduleData | null,
          classes_per_week: raw.classes_per_week || 1,
          subject: raw.subject,
          year_group: raw.year_group,
          student_profile: {
            full_name: String(studentProfile.full_name || 'Unknown Student'),
            email: String(studentProfile.email)
          },
          class_info: classInfo ? {
            subject: String(classInfo.subject || ''),
            name: String(classInfo.name || '')
          } : null
        }
      })
    
    console.log(`📚 Found ${typedEnrollments.length} active enrollments with Google Meet URLs`)

    const results: DetectionResults = { 
      checked: 0, 
      started: 0, 
      ended: 0, 
      skipped: 0, 
      errors: 0,
      enrollments_found: typedEnrollments.length
    }

    // 2. Group enrollments by Google Meet URL to avoid duplicate checks
    const urlGroups = new Map<string, ProcessedEnrollment[]>()
    for (const enrollment of typedEnrollments) {
      const url = enrollment.google_meet_url
      if (!urlGroups.has(url)) {
        urlGroups.set(url, [])
      }
      const group = urlGroups.get(url)
      if (group) {
        group.push(enrollment)
      }
    }

    console.log(`🔗 Found ${urlGroups.size} unique Google Meet URLs to check`)

    // 3. Check each unique Google Meet URL
    for (const [meetUrl, groupEnrollments] of Array.from(urlGroups.entries())) {
      try {
        await checkMeetingGroup(meetUrl, groupEnrollments, results)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`❌ Error checking meeting group ${meetUrl.substring(0, 50)}...:`, errorMessage)
        results.errors += groupEnrollments.length
      }
    }

    // 4. Clean up stale classes
    await cleanupStaleClasses()

    // 5. Generate summary
    const duration = Date.now() - startTime
    console.log(`✅ Detection completed in ${duration}ms:`, results)
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      results,
      summary: {
        efficiency: results.enrollments_found > 0 ? 
          `${Math.round((results.checked / results.enrollments_found) * 100)}% processed` : '0%',
        actions: `Started: ${results.started}, Ended: ${results.ended}, Skipped: ${results.skipped}`,
        error_rate: results.enrollments_found > 0 ? 
          `${Math.round((results.errors / results.enrollments_found) * 100)}%` : '0%'
      }
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('💥 Detection failed:', error)
    return NextResponse.json({ 
      error: 'Detection failed', 
      message: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

async function checkMeetingGroup(meetUrl: string, enrollments: ProcessedEnrollment[], results: DetectionResults): Promise<void> {
  console.log(`\n🔍 Checking meeting: ${meetUrl.substring(0, 50)}... (${enrollments.length} enrollments)`)

  // 1. Enhanced meeting status check
  const meetingStatus = await getEnhancedMeetingStatus(meetUrl)
  console.log(`📊 Meeting status:`, meetingStatus)

  // 2. Check each enrollment in this meeting
  for (const enrollment of enrollments) {
    try {
      await checkEnrollmentMeeting(enrollment, meetingStatus, results)
      results.checked++
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`❌ Error checking enrollment ${enrollment.id}:`, errorMessage)
      results.errors++
    }
  }
}

async function checkEnrollmentMeeting(
  enrollment: ProcessedEnrollment, 
  meetingStatus: MeetingStatus, 
  results: DetectionResults
): Promise<void> {
  
  const { teacher_id, google_meet_url, student_profile, class_info } = enrollment

  if (!student_profile) {
    console.log('⚠️ No student profile found')
    results.skipped++
    return
  }

  const studentName = student_profile.full_name || 'Unknown Student'
  const studentEmail = student_profile.email || 'unknown@example.com'
  const subject = class_info?.subject || class_info?.name || 'Unknown Subject'

  // Check if we should process this enrollment
  const shouldProcess = await shouldProcessEnrollment(enrollment, meetingStatus)
  if (!shouldProcess.process) {
    console.log(`⏸️ Skipping ${studentName}: ${shouldProcess.reason}`)
    results.skipped++
    return
  }

  console.log(`🎯 Processing ${studentName} - ${subject}`)

  // Check if we already have an active class log for this student today
  const today = new Date().toISOString().split('T')[0]
  const { data: activeLog } = await supabase
    .from('class_logs')
    .select('*')
    .eq('student_email', studentEmail)
    .eq('teacher_id', teacher_id)
    .eq('status', 'in_progress')
    .eq('date', today)
    .order('start_time', { ascending: false })
    .limit(1)
    .single()

  const typedActiveLog = activeLog as ClassLog | null
  const hasActiveLog = !!typedActiveLog

  console.log(`📋 Active log exists: ${hasActiveLog ? '✅ YES' : '❌ NO'}`)

  // Determine action based on meeting status and active log
  if (meetingStatus.isAccessible && meetingStatus.confidence !== 'low' && !hasActiveLog) {
    // Meeting appears active and no active log - start class
    await startClassLog({
      teacher_id,
      class_id: enrollment.class_id,
      student_name: studentName,
      student_email: studentEmail,
      google_meet_link: google_meet_url,
      subject
    })
    results.started++
    console.log(`🟢 ✅ Started class log for ${studentName}`)
    
  } else if (!meetingStatus.isAccessible && hasActiveLog && typedActiveLog) {
    // Meeting ended and we have active log - end class
    await endClassLog(typedActiveLog)
    results.ended++
    console.log(`🔴 ✅ Ended class log for ${studentName}`)
    
  } else {
    console.log(`⏸️ No action needed (Accessible: ${meetingStatus.isAccessible}, HasLog: ${hasActiveLog}, Confidence: ${meetingStatus.confidence})`)
  }
}

async function getEnhancedMeetingStatus(meetUrl: string): Promise<MeetingStatus> {
  const results = await Promise.allSettled([
    checkMeetingAccessibility(meetUrl),
    checkMeetingMetadata(meetUrl),
    // Add more checks here as needed
  ])

  const accessibility = results[0].status === 'fulfilled' ? results[0].value : false
  const metadata = results[1].status === 'fulfilled' ? results[1].value : { hasIndicators: false }

  // Determine confidence based on multiple factors
  let confidence: 'high' | 'medium' | 'low' = 'medium'
  let reason = 'Standard HTTP check'

  if (!accessibility) {
    confidence = 'high'
    reason = 'Meeting URL not accessible'
  } else if (metadata.hasIndicators) {
    confidence = 'high'
    reason = 'Strong indicators of active meeting'
  } else {
    confidence = 'medium'
    reason = 'Meeting accessible but activity unclear'
  }

  return {
    isAccessible: accessibility,
    hasActiveParticipants: metadata.hasIndicators || false,
    confidence,
    reason
  }
}

async function checkMeetingAccessibility(meetUrl: string): Promise<boolean> {
  try {
    console.log(`🌐 Checking accessibility: ${meetUrl.substring(0, 50)}...`)
    
    const response = await fetch(meetUrl, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ClassLogger/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: AbortSignal.timeout(8000),
      redirect: 'follow'
    })

    console.log(`📡 HTTP Response: ${response.status} ${response.statusText}`)
    
    // For Google Meet:
    // 200 = Meeting accessible
    // 404 = Meeting not found  
    // 403 = Meeting restricted/ended
    return response.status === 200

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Network error'
    console.warn(`⚠️ Accessibility check failed: ${errorMessage}`)
    return false
  }
}

async function checkMeetingMetadata(meetUrl: string): Promise<MetadataResult> {
  try {
    // This is a placeholder for more advanced meeting detection
    // You could implement:
    // 1. Parse HTML content for meeting status indicators
    // 2. Check for specific Google Meet API endpoints
    // 3. Use browser automation for deeper inspection
    // 4. Monitor network activity patterns
    
    console.log(`🔍 Checking metadata for: ${meetUrl.substring(0, 50)}...`)
    
    // For now, return basic metadata
    return {
      hasIndicators: false,
      method: 'placeholder'
    }
    
  } catch (error) {
    console.warn(`⚠️ Metadata check failed: ${error}`)
    return { hasIndicators: false }
  }
}

async function shouldProcessEnrollment(
  enrollment: ProcessedEnrollment, 
  meetingStatus: MeetingStatus
): Promise<ProcessingDecision> {
  
  const now = new Date()
  const currentTime = now.getHours() * 60 + now.getMinutes()
  const currentDay = now.getDay()

  // 1. Check reasonable time bounds (6 AM to 11 PM)
  if (currentTime < 360 || currentTime > 1380) {
    return {
      process: false,
      reason: 'Outside reasonable class hours (6 AM - 11 PM)'
    }
  }

  // 2. Check if we've already processed too many classes today for this student
  const today = now.toISOString().split('T')[0]
  const { data: todaysClasses } = await supabase
    .from('class_logs')
    .select('id')
    .eq('student_email', enrollment.student_profile?.email)
    .eq('teacher_id', enrollment.teacher_id)
    .eq('date', today)

  const maxClassesPerDay = Math.max(2, enrollment.classes_per_week || 3) // At least 2, but respect weekly limit
  if (todaysClasses && todaysClasses.length >= maxClassesPerDay) {
    return {
      process: false,
      reason: `Already logged ${todaysClasses.length} classes today (max: ${maxClassesPerDay})`
    }
  }

  // 3. Check tentative schedule if available
  if (enrollment.tentative_schedule) {
    const scheduleCheck = validateScheduleForDetection(enrollment.tentative_schedule, currentDay, currentTime)
    if (!scheduleCheck.valid) {
      return {
        process: false,
        reason: scheduleCheck.reason || 'Not in scheduled time slot'
      }
    }
  }

  // 4. For low confidence meetings, be more restrictive
  if (meetingStatus.confidence === 'low') {
    return {
      process: false,
      reason: 'Meeting status confidence too low for auto-detection'
    }
  }

  return {
    process: true,
    reason: 'All validation checks passed'
  }
}

function validateScheduleForDetection(schedule: ScheduleData | null, currentDay: number, currentTime: number): ScheduleValidation {
  try {
    // Handle null schedule
    if (!schedule) {
      return { valid: true }
    }

    // If schedule is an array of time slots
    if (Array.isArray(schedule)) {
      for (const slot of schedule) {
        const typedSlot = slot as ScheduleSlot
        if (typedSlot.day === currentDay || typedSlot.dayOfWeek === currentDay) {
          const slotStart = parseTime(typedSlot.startTime || typedSlot.start)
          const slotEnd = parseTime(typedSlot.endTime || typedSlot.end)
          
          if (slotStart && slotEnd) {
            // Allow auto-detection within a wider window (1 hour before/after)
            if (currentTime >= slotStart - 60 && currentTime <= slotEnd + 60) {
              return { valid: true }
            }
          }
        }
      }
      return {
        valid: false,
        reason: 'Not within scheduled time window (±1 hour)'
      }
    }

    // If schedule is an object with day-based structure
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const currentDayName = dayNames[currentDay]
    
    // Type-safe property access
    const scheduleObj = schedule as Record<string, unknown>
    if (scheduleObj[currentDayName]) {
      const daySchedule = scheduleObj[currentDayName]
      if (Array.isArray(daySchedule)) {
        // Create a new ScheduleData object for recursion
        const recursiveSchedule: ScheduleData = {}
        Object.assign(recursiveSchedule, daySchedule)
        return validateScheduleForDetection(recursiveSchedule, currentDay, currentTime)
      }
    }

    // If no specific schedule format matches, allow processing
    return { valid: true }
    
  } catch (error) {
    console.warn('⚠️ Error validating schedule:', error)
    return { valid: true } // Default to allowing if validation fails
  }
}

function parseTime(timeStr?: string): number | null {
  if (!timeStr) return null
  
  try {
    // Handle various time formats
    const cleanTime = timeStr.toString().toLowerCase().trim()
    
    // Handle AM/PM format
    const amPmMatch = cleanTime.match(/(\d{1,2}):?(\d{0,2})\s*(am|pm)/)
    if (amPmMatch) {
      let hours = parseInt(amPmMatch[1], 10)
      const minutes = parseInt(amPmMatch[2] || '0', 10)
      const period = amPmMatch[3]
      
      if (period === 'pm' && hours !== 12) hours += 12
      if (period === 'am' && hours === 12) hours = 0
      
      return hours * 60 + minutes
    }
    
    // Handle 24-hour format
    const hourMatch = cleanTime.match(/(\d{1,2}):(\d{2})/)
    if (hourMatch) {
      const hours = parseInt(hourMatch[1], 10)
      const minutes = parseInt(hourMatch[2], 10)
      return hours * 60 + minutes
    }
    
    // Handle hour-only format
    const hourOnlyMatch = cleanTime.match(/(\d{1,2})/)
    if (hourOnlyMatch) {
      const hours = parseInt(hourOnlyMatch[1], 10)
      return hours * 60
    }
    
    return null
  } catch (error) {
    console.warn('⚠️ Error parsing time:', timeStr, error)
    return null
  }
}

async function startClassLog(classData: ClassData): Promise<void> {
  const now = new Date()
  const today = now.toISOString().split('T')[0]

  console.log('📝 Creating auto-detected class log...', {
    student: classData.student_name,
    subject: classData.subject,
    class_id: classData.class_id,
    teacher_id: classData.teacher_id,
    time: now.toLocaleTimeString()
  })

  const { data, error } = await supabase
    .from('class_logs')
    .insert([{
      class_id: classData.class_id,
      teacher_id: classData.teacher_id,
      date: today,
      content: `Auto-detected class with ${classData.student_name} - ${classData.subject}`,
      topics_covered: [],
      homework_assigned: null,
      attendance_count: 1,
      total_students: 1,
      status: 'in_progress',
      attachments: null,
      start_time: now.toISOString(),
      end_time: null,
      duration_minutes: null,
      google_meet_link: classData.google_meet_link,
      detected_automatically: true,
      student_name: classData.student_name,
      student_email: classData.student_email
    }])
    .select()
    .single()

  if (error) {
    console.error('❌ Failed to create class log:', error)
    throw new Error(`Failed to start class log: ${error.message}`)
  } else {
    console.log('✅ Auto-detected class log created:', data?.id)
  }
}

async function endClassLog(activeLog: ClassLog): Promise<void> {
  const now = new Date()
  const startTime = new Date(activeLog.start_time || now.toISOString())
  const durationMinutes = Math.round((now.getTime() - startTime.getTime()) / (1000 * 60))

  console.log(`⏰ Auto-ending class log: ${durationMinutes} minutes duration`)

  // Add auto-end indicator to content
  const updatedContent = `${activeLog.content} - Duration: ${Math.floor(durationMinutes/60)}h ${durationMinutes%60}m [Auto-ended]`

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
    console.error('❌ Failed to end class log:', error)
    throw new Error(`Failed to end class log: ${error.message}`)
  } else {
    console.log('✅ Auto-detected class log ended successfully')
  }
}

async function cleanupStaleClasses(): Promise<void> {
  console.log('🧹 Starting cleanup of stale classes...')
  
  // Mark classes as completed if they've been running for more than 3 hours
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000)
  
  const { data: staleClasses } = await supabase
    .from('class_logs')
    .select('*')
    .eq('status', 'in_progress')
    .eq('detected_automatically', true)
    .lt('start_time', threeHoursAgo.toISOString())

  const typedStaleClasses = staleClasses as ClassLog[] | null

  if (typedStaleClasses && typedStaleClasses.length > 0) {
    console.log(`🧹 Cleaning up ${typedStaleClasses.length} stale classes (>3 hours)`)
    
    for (const staleClass of typedStaleClasses) {
      const startTime = new Date(staleClass.start_time || new Date().toISOString())
      const now = new Date()
      const actualDuration = Math.round((now.getTime() - startTime.getTime()) / (1000 * 60))
      
      const updatedContent = `${staleClass.content} - Actual duration: ${Math.floor(actualDuration/60)}h ${actualDuration%60}m [Auto-ended: exceeded 3 hours]`
      
      await supabase
        .from('class_logs')
        .update({
          status: 'completed',
          end_time: now.toISOString(),
          duration_minutes: actualDuration,
          content: updatedContent,
          updated_at: now.toISOString()
        })
        .eq('id', staleClass.id)
      
      console.log(`🧹 Cleaned up stale class: ${staleClass.student_name} (${actualDuration} min)`)
    }
  } else {
    console.log('🧹 No stale classes found')
  }

  // Also clean up very old 'in_progress' classes (>24 hours) regardless of detection method
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  
  const { data: veryStaleClasses } = await supabase
    .from('class_logs')
    .select('*')
    .eq('status', 'in_progress')
    .lt('start_time', oneDayAgo.toISOString())

  const typedVeryStaleClasses = veryStaleClasses as ClassLog[] | null

  if (typedVeryStaleClasses && typedVeryStaleClasses.length > 0) {
    console.log(`🧹 Emergency cleanup of ${typedVeryStaleClasses.length} very stale classes (>24 hours)`)
    
    for (const veryStaleClass of typedVeryStaleClasses) {
      const updatedContent = `${veryStaleClass.content} [Emergency auto-end: exceeded 24 hours]`
      
      await supabase
        .from('class_logs')
        .update({
          status: 'completed',
          end_time: new Date().toISOString(),
          duration_minutes: 1440, // Assume 24 hours max
          content: updatedContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', veryStaleClass.id)
    }
  }
}