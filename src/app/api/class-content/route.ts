// src/app/api/class-content/route.ts
// SURGICAL FIX: Only minimal changes to remove 'any' types from your existing code

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Add this interface at the top for the contentData object
interface ContentData {
  class_log_id: string
  topic_1?: string | null
  topic_2?: string | null
  topic_3?: string | null
  topic_4?: string | null
  topic_5?: string | null
  homework_title?: string | null
  homework_description?: string | null
  homework_due_date?: string | null
  teacher_notes?: string | null
  student_performance?: string | null
  key_points?: string | null
  duration_minutes?: number
  participants_count?: number
  features_used?: string
  created_at?: string
  updated_at?: string
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

    // ONLY CHANGE: Replace 'any' with proper interface
    const contentData: ContentData = {
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
    // Initialize Supabase client inside function to avoid build-time env var issues
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Initialize Supabase client inside function to avoid build-time env var issues

  try {
    // Initialize Supabase client inside function to avoid build-time env var issues

    const { searchParams } = new URL(request.url)
    const classLogId = searchParams.get('class_log_id')
    const teacherId = searchParams.get('teacher_id')

    if (!classLogId && !teacherId) {
      return NextResponse.json({
        success: false,
        error: 'Either class_log_id or teacher_id is required'
      }, { status: 400 })
    }

    // RESTORED: Support for individual class content lookup (this was missing)
    if (classLogId) {
      // First try to get from class_content table (for enhanced class card)
      const { data: classContent, error: contentError } = await supabase
        .from('class_content')
        .select('*')
        .eq('class_log_id', classLogId)
        .single()

      if (contentError && contentError.code !== 'PGRST116') {
        console.error('❌ Content fetch error:', contentError)
        return NextResponse.json({
          success: false,
          error: contentError.message
        }, { status: 500 })
      }

      // If no structured content found, return null (normal for older classes)
      if (contentError?.code === 'PGRST116') {
        return NextResponse.json(null)
      }

      return NextResponse.json(classContent)
    }

    // RESTORED: Teacher-based queries from class_logs_enhanced view
    if (teacherId) {
      let query = supabase.from('class_logs_enhanced').select('*')
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