// src/app/api/extension/end-class/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Define proper types for the class content and update data
interface ClassContent {
  content_summary?: string
  topics_covered?: string[]
  homework_assigned?: string
  duration_minutes?: number
  max_participants?: number
  features_used?: string[]
  screenshots_taken?: number
  manual_notes?: Record<string, unknown>
}

interface ClassLogUpdateData {
  end_time: string
  status: string
  duration_minutes: number
  updated_at: string
  content?: string
  topics_covered?: string[]
  homework_assigned?: string | null
  attachments?: Record<string, unknown>
  attendance_count?: number
  total_students?: number
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { class_log_id, classContent, token }: {
      class_log_id: string
      classContent?: ClassContent
      token?: string
    } = body

    console.log('🛑 Ending class:', class_log_id)

    if (!class_log_id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required field: class_log_id' 
      }, { status: 400 })
    }

    // Validate token if provided
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

        const tokenData = await tokenResponse.json()
        if (!tokenData.success || !tokenData.teacher) {
          return NextResponse.json({ 
            success: false, 
            error: 'Invalid authentication token' 
          }, { status: 401 })
        }
      } catch (tokenError) {
        console.warn('Token validation failed:', tokenError)
        // Continue without token validation for now
      }
    }

    // Get the existing class log to calculate duration
    const { data: existingClass, error: fetchError } = await supabase
      .from('class_logs')
      .select('*')
      .eq('id', class_log_id)
      .single()

    if (fetchError) {
      console.error('❌ Error fetching class log:', fetchError)
      return NextResponse.json({ 
        success: false, 
        error: 'Class log not found: ' + fetchError.message 
      }, { status: 404 })
    }

    if (!existingClass) {
      return NextResponse.json({ 
        success: false, 
        error: 'Class log not found' 
      }, { status: 404 })
    }

    // Calculate duration
    const startTime = new Date(existingClass.start_time)
    const endTime = new Date()
    const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))

    // Prepare the update data - properly typed to include all possible fields
    const updateData: ClassLogUpdateData = {
      end_time: endTime.toISOString(),
      status: 'completed',
      duration_minutes: durationMinutes,
      updated_at: new Date().toISOString()
    }

    // Add enhanced class content if provided
    if (classContent) {
      updateData.content = classContent.content_summary || existingClass.content || 'Class completed via extension'
      updateData.topics_covered = classContent.topics_covered || existingClass.topics_covered || []
      updateData.homework_assigned = classContent.homework_assigned || existingClass.homework_assigned
      
      // Store additional metadata in attachments (since your schema doesn't have class_metadata)
      const existingAttachments = existingClass.attachments || {}
      updateData.attachments = {
        ...existingAttachments,
        extension_data: {
          duration_minutes: classContent.duration_minutes || durationMinutes,
          max_participants: classContent.max_participants || 1,
          features_used: classContent.features_used || [],
          screenshots_taken: classContent.screenshots_taken || 0,
          manual_notes: classContent.manual_notes || {},
          end_time: endTime.toISOString(),
          completed_via: 'extension'
        }
      }

      // Update attendance if we have participant data
      if (classContent.max_participants) {
        updateData.attendance_count = classContent.max_participants
        updateData.total_students = classContent.max_participants
      }
    } else {
      // Set defaults if no content provided
      updateData.content = existingClass.content || 'Class completed via extension'
      updateData.attendance_count = existingClass.attendance_count || 1
      updateData.total_students = existingClass.total_students || 1
    }

    // Update the class log
    const { data: updatedClass, error: updateError } = await supabase
      .from('class_logs')
      .update(updateData)
      .eq('id', class_log_id)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Error updating class log:', updateError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to end class: ' + updateError.message 
      }, { status: 500 })
    }

    console.log('✅ Class ended successfully:', class_log_id, `(${durationMinutes} minutes)`)

    return NextResponse.json({
      success: true,
      class_log_id: class_log_id,
      duration_minutes: durationMinutes,
      end_time: endTime.toISOString(),
      message: `Class completed successfully (${durationMinutes} minutes)`,
      class_data: updatedClass
    })

  } catch (error) {
    console.error('❌ End class API error:', error)
    
    // Proper error handling with type safety
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error: ' + errorMessage 
    }, { status: 500 })
  }
}