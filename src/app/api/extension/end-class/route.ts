// src/app/api/extension/end-class/route.ts - Enhanced with content updates
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { class_log_id, classContent } = body

    if (!class_log_id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing class_log_id' 
      }, { status: 400 })
    }

    console.log('🛑 Ending class:', class_log_id)
    console.log('📝 Class content received:', classContent)

    // First, verify the class log exists and is ongoing
    const { data: classLog, error: fetchError } = await supabase
      .from('class_logs')
      .select('id, status, start_time, enrollment_id')
      .eq('id', class_log_id)
      .single()

    if (fetchError || !classLog) {
      console.error('❌ Class log not found:', fetchError)
      return NextResponse.json({ 
        success: false, 
        error: 'Class log not found' 
      }, { status: 404 })
    }

    if (classLog.status !== 'ongoing') {
      return NextResponse.json({ 
        success: false, 
        error: `Class is not ongoing. Current status: ${classLog.status}` 
      }, { status: 400 })
    }

    // Calculate duration
    const startTime = new Date(classLog.start_time)
    const endTime = new Date()
    const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))

    // Prepare update data
    const updateData = {
      end_time: endTime.toISOString(),
      status: 'completed',
      duration_minutes: durationMinutes,
      updated_at: endTime.toISOString()
    }

    // Add enhanced content if provided
    if (classContent) {
      // Update content with manual notes (prioritize over auto-generated)
      if (classContent.manual_notes?.classDescription) {
        updateData.content = classContent.manual_notes.classDescription;
      } else if (classContent.content_summary) {
        updateData.content = classContent.content_summary;
      }

      // Update topics covered with manual notes
      if (classContent.manual_notes?.topicsCovered) {
        const manualTopics = classContent.manual_notes.topicsCovered
          .split('\n')
          .map(topic => topic.trim())
          .filter(topic => topic.length > 0);
        updateData.topics_covered = manualTopics;
      } else if (classContent.topics_covered && classContent.topics_covered.length > 0) {
        updateData.topics_covered = classContent.topics_covered;
      }

      // Update homework assignment
      if (classContent.manual_notes?.homeworkAssigned) {
        updateData.homework_assigned = classContent.manual_notes.homeworkAssigned;
      }

      // Update attendance count with max participants
      if (classContent.max_participants) {
        updateData.attendance_count = classContent.max_participants;
        updateData.total_students = classContent.max_participants;
      }

      // Add comprehensive attachments with session metadata and manual notes
      const sessionMetadata = {
        auto_detected: true,
        features_used: classContent.features_used || [],
        session_type: 'google_meet',
        detection_timestamp: endTime.toISOString(),
        duration_minutes: durationMinutes,
        manual_notes: {
          class_description: classContent.manual_notes?.classDescription || null,
          topics_covered: classContent.manual_notes?.topicsCovered || null,
          homework_assigned: classContent.manual_notes?.homeworkAssigned || null,
          key_points: classContent.manual_notes?.keyPoints || null,
          notes_last_saved: classContent.manual_notes?.lastSaved || null
        }
      };

      updateData.attachments = sessionMetadata;
    }

    // Update class log with end time, status, and enhanced content
    const { data: updatedLog, error: updateError } = await supabase
      .from('class_logs')
      .update(updateData)
      .eq('id', class_log_id)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Failed to update class log:', updateError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to end class: ' + updateError.message 
      }, { status: 500 })
    }

    console.log('✅ Class ended successfully with enhanced content:', class_log_id, `Duration: ${durationMinutes} minutes`)

    return NextResponse.json({
      success: true,
      message: 'Class ended successfully with enhanced content',
      class_log_id: class_log_id,
      duration_minutes: durationMinutes,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      content_added: {
        summary: classContent?.manual_notes?.classDescription || classContent?.content_summary || 'Auto-generated',
        topics: classContent?.manual_notes?.topicsCovered ? 'Manual' : (classContent?.topics_covered?.length || 0),
        homework: classContent?.manual_notes?.homeworkAssigned ? 'Added' : 'None',
        participants: classContent?.max_participants || 0,
        features: classContent?.features_used?.length || 0,
        manual_notes: classContent?.manual_notes ? 'Saved' : 'None'
      }
    })

  } catch (error) {
    console.error('❌ API Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 })
  }
}