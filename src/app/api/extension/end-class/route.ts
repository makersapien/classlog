// src/app/api/extension/end-class/route.ts
// Fixed to work with your existing database schema and extension

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('🛑 Extension end-class API called')
    
    const body = await request.json()
    console.log('📥 Request body:', body)
    
    const { 
      class_log_id, 
      meetUrl, 
      student_email, 
      enrollment_id,
      teacher_id,
      content,
      topics_covered,
      homework_assigned,
      screenshots,
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
        return NextResponse.json({ 
          success: false,
          error: 'Error finding active class: ' + findError.message 
        }, { status: 500 })
      }

      if (!activeClass) {
        console.error('❌ No active class found to end')
        return NextResponse.json({ 
          success: false,
          error: 'No active class found to end' 
        }, { status: 404 })
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
      return NextResponse.json({ 
        success: false,
        error: 'Class log not found: ' + fetchError.message 
      }, { status: 404 })
    }

    if (!existingClass) {
      console.error('❌ Class log not found')
      return NextResponse.json({ 
        success: false,
        error: 'Class log not found' 
      }, { status: 404 })
    }

    // Calculate duration
    const now = new Date()
    const startTime = new Date(existingClass.start_time)
    const durationMinutes = Math.round((now.getTime() - startTime.getTime()) / (1000 * 60))

    console.log(`⏰ Ending class: ${durationMinutes} minutes duration`)

    // Prepare updated content
    let updatedContent = existingClass.content || ''
    if (content) {
      updatedContent = content
    }

    // Add manual notes if provided
    if (manual_notes) {
      updatedContent += `\n\nManual Notes:\n${JSON.stringify(manual_notes, null, 2)}`
    }

    // Add duration info
    const hours = Math.floor(durationMinutes / 60)
    const minutes = durationMinutes % 60
    const durationText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
    updatedContent += `\n\nDuration: ${durationText}`

    // Prepare topics covered
    let updatedTopics = existingClass.topics_covered || []
    if (topics_covered && Array.isArray(topics_covered)) {
      updatedTopics = [...updatedTopics, ...topics_covered]
    }

    // Prepare attachments (for screenshots)
    let updatedAttachments = existingClass.attachments || []
    if (screenshots && Array.isArray(screenshots)) {
      const screenshotAttachments = screenshots.map((screenshot, index) => ({
        type: 'screenshot',
        timestamp: new Date().toISOString(),
        filename: `screenshot_${index + 1}.png`,
        data: screenshot
      }))
      updatedAttachments = [...updatedAttachments, ...screenshotAttachments]
    }

    // Update the class log
    const { data: updatedClass, error: updateError } = await supabase
      .from('class_logs')
      .update({
        end_time: now.toISOString(),
        duration_minutes: durationMinutes,
        status: 'completed',
        content: updatedContent,
        topics_covered: updatedTopics,
        homework_assigned: homework_assigned || existingClass.homework_assigned,
        attachments: updatedAttachments,
        updated_at: now.toISOString()
      })
      .eq('id', classLogId)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Update error:', updateError)
      return NextResponse.json({ 
        success: false,
        error: 'Failed to end class: ' + updateError.message 
      }, { status: 500 })
    }

    console.log('✅ Class ended successfully:', classLogId)

    // Prepare summary for response
    const summary = {
      duration: durationText,
      topics: updatedTopics.length,
      homework: homework_assigned ? 'Added' : 'None',
      screenshots: screenshots ? screenshots.length : 0,
      manual_notes: manual_notes ? 'Saved' : 'None'
    }

    return NextResponse.json({
      success: true,
      class_log_id: classLogId,
      message: 'Class ended successfully',
      duration: durationText,
      summary: summary,
      class_data: updatedClass
    })

  } catch (error) {
    console.error('❌ End class error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 })
  }
}