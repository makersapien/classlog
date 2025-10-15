// src/app/api/extension/end-class/route.ts
// Your existing comprehensive API with CORS fix

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createOptionsResponse, addCorsHeaders } from '@/lib/cors'
import { verifyJWT } from '@/lib/jwt'



// Handle preflight OPTIONS requests
export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request)
}

// Strictly typed interfaces (your existing interfaces)
interface EndClassRequestBody {
  class_log_id?: string
  meetUrl?: string
  student_email?: string
  enrollment_id?: string
  teacher_id?: string
  token?: string
  content?: string
  topics_covered?: string[]
  homework_assigned?: string
  screenshots?: string[]
  attachments?: object
  manual_notes?: ManualNotes
}

interface ManualNotes {
  classDescription?: string
  topicsCovered?: string
  homeworkAssigned?: string
  keyPoints?: string
  followUpNeeded?: string
  lastSaved?: string
}

interface ScreenshotAttachment {
  type: 'screenshot'
  timestamp: string
  filename: string
  data: string
}

interface ClassLogUpdateData {
  end_time: string
  duration_minutes: number
  status: 'completed'
  content: string
  topics_covered: string[]
  homework_assigned: string | null
  attachments: object | ScreenshotAttachment[] | null
  updated_at: string
  teacher_id?: string
}

interface ClassLogRecord {
  id: string
  start_time: string
  content: string | null
  topics_covered: string[] | null
  homework_assigned: string | null
  attachments: object | ScreenshotAttachment[] | null
  teacher_id: string | null
}

interface ResponseSummary {
  duration: string
  topics: number
  homework: string
  screenshots: number
  manual_notes: string
}

export async function POST(request: NextRequest) {
  // Initialize Supabase client inside function to avoid build-time env var issues
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Initialize Supabase client inside function to avoid build-time env var issues

  try {
    // Initialize Supabase client inside function to avoid build-time env var issues

    console.log('🛑 Extension end-class API called')

    // Get teacher info from Bearer token (MATCHING START-CLASS AUTH)
    let teacher_id: string | null = null

    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const decoded = verifyJWT(token)

      if (decoded && decoded.type === 'extension') {
        teacher_id = decoded.userId
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

    const body: EndClassRequestBody = await request.json()
    console.log('📥 Request body:', body)

    const {
      class_log_id,
      meetUrl,
      student_email,
      enrollment_id,
      content,
      topics_covered,
      homework_assigned,
      screenshots,
      attachments,
      manual_notes
    } = body

    let classLogId = class_log_id

    // If no class_log_id provided, try to find the active class
    if (!classLogId) {
      console.log('🔍 No class_log_id provided, searching for active class...')

      let query = supabase
        .from('class_logs')
        .select('id')
        .in('status', ['ongoing', 'started', 'in_progress'])
        .order('start_time', { ascending: false })
        .limit(1)

      // Try to find by different criteria
      if (enrollment_id) {
        query = query.eq('enrollment_id', enrollment_id)
      } else if (meetUrl) {
        query = query.eq('google_meet_link', meetUrl)
      } else if (student_email && teacher_id) {
        query = query.eq('student_email', student_email).eq('teacher_id', teacher_id)
      } else if (student_email) {
        query = query.eq('student_email', student_email)
      }

      const { data: activeClass, error: findError } = await query.maybeSingle()

      if (findError) {
        console.error('❌ Error finding active class:', findError)
        const response = NextResponse.json({
          success: false,
          error: `Error finding active class: ${findError.message}`
        }, { status: 500 })
        return addCorsHeaders(response, request)
      }

      if (!activeClass) {
        console.error('❌ No active class found to end')
        const response = NextResponse.json({
          success: false,
          error: 'No active class found to end'
        }, { status: 404 })
        return addCorsHeaders(response, request)
      }

      classLogId = activeClass.id
      console.log('✅ Found active class to end:', classLogId)
    }

    // Get the existing class log
    const { data: existingClass, error: fetchError } = await supabase
      .from('class_logs')
      .select('*')
      .eq('id', classLogId)
      .single()

    if (fetchError) {
      console.error('❌ Error fetching class log:', fetchError)
      const response = NextResponse.json({
        success: false,
        error: `Class log not found: ${fetchError.message}`
      }, { status: 404 })
      return addCorsHeaders(response, request)
    }

    if (!existingClass) {
      console.error('❌ Class log not found')
      const response = NextResponse.json({
        success: false,
        error: 'Class log not found'
      }, { status: 404 })
      return addCorsHeaders(response, request)
    }

    const classRecord = existingClass as ClassLogRecord

    // Calculate duration
    const now = new Date()
    const startTime = new Date(classRecord.start_time)
    const durationMinutes = Math.round((now.getTime() - startTime.getTime()) / (1000 * 60))

    console.log(`⏰ Ending class: ${durationMinutes} minutes duration`)

    // 🔧 FIX: Handle new data structure from extension
    let updatedContent = classRecord.content || ''
    let updatedTopics: string[] = classRecord.topics_covered || []
    let updatedHomework = classRecord.homework_assigned

    // Check if request has new data structure (from fixed extension)
    if (content) {
      updatedContent = content
    }

    if (topics_covered && Array.isArray(topics_covered)) {
      updatedTopics = topics_covered // Replace, don't append for cleaner data
    }

    if (homework_assigned) {
      updatedHomework = homework_assigned
    }

    // Add manual notes if provided (legacy support)
    if (manual_notes) {
      if (!content && manual_notes.classDescription) {
        updatedContent = manual_notes.classDescription
      }
      if (!topics_covered && manual_notes.topicsCovered) {
        const manualTopics = manual_notes.topicsCovered
          .split('\n')
          .map(topic => topic.trim())
          .filter(topic => topic.length > 0)
        updatedTopics = manualTopics
      }
      if (!homework_assigned && manual_notes.homeworkAssigned) {
        updatedHomework = manual_notes.homeworkAssigned
      }
    }

    // Add duration info to content if not already there
    const hours = Math.floor(durationMinutes / 60)
    const minutes = durationMinutes % 60
    const durationText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`

    if (!updatedContent.includes('Duration:')) {
      updatedContent += `\n\nDuration: ${durationText}`
    }

    // Prepare attachments (screenshots + rich metadata)
    let updatedAttachments: object | ScreenshotAttachment[] | null = classRecord.attachments || []

    // Handle new extension data structure with rich metadata
    if (attachments && typeof attachments === 'object') {
      updatedAttachments = attachments
    } else if (screenshots && Array.isArray(screenshots)) {
      // Legacy screenshot handling - ensure we start with an array
      const baseAttachments = Array.isArray(classRecord.attachments)
        ? classRecord.attachments
        : []

      const screenshotAttachments: ScreenshotAttachment[] = screenshots.map((screenshot, index) => ({
        type: 'screenshot',
        timestamp: now.toISOString(),
        filename: `screenshot_${index + 1}.png`,
        data: screenshot
      }))

      updatedAttachments = [...baseAttachments, ...screenshotAttachments]
    }

    // Prepare update data
    const updateData: ClassLogUpdateData = {
      end_time: now.toISOString(),
      duration_minutes: durationMinutes,
      status: 'completed',
      content: updatedContent,
      topics_covered: updatedTopics,
      homework_assigned: updatedHomework,
      attachments: updatedAttachments,
      updated_at: now.toISOString()
    }

    // 🔧 FIX: Add teacher_id if it's null in the existing class
    if (!classRecord.teacher_id && teacher_id) {
      updateData.teacher_id = teacher_id
      console.log('🔧 Fixing null teacher_id in class being ended')
    }

    // Update the class log
    const { data: updatedClass, error: updateError } = await supabase
      .from('class_logs')
      .update(updateData)
      .eq('id', classLogId)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Update error:', updateError)
      const response = NextResponse.json({
        success: false,
        error: `Failed to end class: ${updateError.message}`
      }, { status: 500 })
      return addCorsHeaders(response, request)
    }

    console.log('✅ Class ended successfully:', classLogId)

    // 🔧 Debug credit deduction (your DB trigger should handle this automatically)
    console.log('💳 Credit Deduction Debug:', {
      classLogId,
      meetUrl: existingClass.google_meet_link,
      studentEmail: existingClass.student_email,
      enrollmentId: existingClass.enrollment_id,
      triggerShouldFire: 'Database trigger should auto-deduct credits'
    })

    // Prepare summary for response
    const summary: ResponseSummary = {
      duration: durationText,
      topics: updatedTopics.length,
      homework: homework_assigned ? 'Added' : 'None',
      screenshots: screenshots ? screenshots.length : 0,
      manual_notes: manual_notes ? 'Saved' : 'None'
    }

    const response = NextResponse.json({
      success: true,
      class_log_id: classLogId,
      message: 'Class ended successfully',
      duration: durationText,
      summary: summary,
      class_data: updatedClass
    })
    return addCorsHeaders(response, request)

  } catch (error) {
    console.error('❌ End class error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    const response = NextResponse.json({
      success: false,
      error: `Internal server error: ${errorMessage}`
    }, { status: 500 })
    return addCorsHeaders(response, request)
  }
}