// src/app/api/class-content/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

export async function POST(request: NextRequest) {
  try {
    const {
      class_log_id,
      topics,
      homework,
      notes,
      duration_minutes,
      participants_count,
      features_used
    } = await request.json()

    if (!class_log_id) {
      return NextResponse.json({
        success: false,
        error: 'class_log_id is required'
      }, { status: 400 })
    }

    // Prepare the content data
    const contentData: any = {
      class_log_id
    }

    // Map topics to individual fields (max 5)
    if (topics && Array.isArray(topics)) {
      contentData.topic_1 = topics[0] || null
      contentData.topic_2 = topics[1] || null
      contentData.topic_3 = topics[2] || null
      contentData.topic_4 = topics[3] || null
      contentData.topic_5 = topics[4] || null
    }

    // Map homework
    if (homework) {
      if (typeof homework === 'string') {
        contentData.homework_description = homework
      } else {
        contentData.homework_title = homework.title || null
        contentData.homework_description = homework.description || null
        contentData.homework_due_date = homework.due_date || null
      }
    }

    // Map notes
    if (notes) {
      if (typeof notes === 'string') {
        contentData.teacher_notes = notes
      } else {
        contentData.teacher_notes = notes.teacher_notes || null
        contentData.student_performance = notes.student_performance || null
        contentData.key_points = notes.key_points || null
      }
    }

    // Map extension metadata
    if (duration_minutes) contentData.duration_minutes = duration_minutes
    if (participants_count) contentData.participants_count = participants_count
    if (features_used) {
      contentData.features_used = Array.isArray(features_used) 
        ? features_used.join(', ') 
        : features_used
    }

    // Use upsert to insert or update
    const { data, error } = await supabase
      .from('class_content')
      .upsert(contentData, { 
        onConflict: 'class_log_id'
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Content save error:', error)
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }

    console.log('✅ Class content saved:', data)

    return NextResponse.json({
      success: true,
      message: 'Class content saved successfully',
      data
    })

  } catch (error) {
    console.error('❌ API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const classLogId = searchParams.get('class_log_id')
    const teacherId = searchParams.get('teacher_id')

    if (!classLogId && !teacherId) {
      return NextResponse.json({
        success: false,
        error: 'Either class_log_id or teacher_id is required'
      }, { status: 400 })
    }

    let query = supabase.from('class_logs_enhanced').select('*')

    if (classLogId) {
      query = query.eq('id', classLogId)
      const { data, error } = await query.single()
      
      if (error) {
        return NextResponse.json({
          success: false,
          error: error.message
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        data
      })
    }

    if (teacherId) {
      query = query.eq('teacher_id', teacherId).order('date', { ascending: false })
      const { data, error } = await query

      if (error) {
        return NextResponse.json({
          success: false,
          error: error.message
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        data: data || []
      })
    }

  } catch (error) {
    console.error('❌ GET API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}