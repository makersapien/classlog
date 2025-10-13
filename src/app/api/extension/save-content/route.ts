// src/app/api/extension/save-content/route.ts
// Saves class content to your class_content table (4 fields: overview, topics, files, details)

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    // Initialize Supabase client inside function to avoid build-time env var issues
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Initialize Supabase client inside function to avoid build-time env var issues

  try {
    // Initialize Supabase client inside function to avoid build-time env var issues

    console.log('💾 Extension save-content API called')
    
    const body = await request.json()
    console.log('📥 Request body:', body)
    
    const { class_log_id, teacher_id, overview, topics, files, details } = body

    // Validate required fields
    if (!class_log_id || !teacher_id) {
      console.error('❌ Missing required fields')
      return NextResponse.json({ 
        success: false,
        error: 'Missing required fields: class_log_id and teacher_id' 
      }, { status: 400 })
    }

    // Verify the class exists and belongs to this teacher
    const { data: classLog, error: classError } = await supabase
      .from('class_logs')
      .select('id, teacher_id, enrollment_id, status')
      .eq('id', class_log_id)
      .eq('teacher_id', teacher_id)
      .single()

    if (classError || !classLog) {
      console.error('❌ Class not found or access denied:', classError)
      return NextResponse.json({ 
        success: false,
        error: 'Class not found or you do not have permission to edit it' 
      }, { status: 404 })
    }

    console.log('✅ Class verified, saving content for class:', class_log_id)

    // Check if content already exists
    const { data: existingContent } = await supabase
      .from('class_content')
      .select('id')
      .eq('class_log_id', class_log_id)
      .single()

    let result

    if (existingContent) {
      // Update existing content
      console.log('📝 Updating existing content')
      const { data, error } = await supabase
        .from('class_content')
        .update({
          overview: overview || null,
          topics: topics || null,
          files: files || null,
          details: details || null,
          updated_at: new Date().toISOString()
        })
        .eq('class_log_id', class_log_id)
        .select()
        .single()

      if (error) {
        console.error('❌ Update error:', error)
        return NextResponse.json({ 
          success: false,
          error: 'Failed to update class content: ' + error.message 
        }, { status: 500 })
      }

      result = data
    } else {
      // Create new content
      console.log('✨ Creating new content')
      const { data, error } = await supabase
        .from('class_content')
        .insert({
          class_log_id: class_log_id,
          teacher_id: teacher_id,
          overview: overview || null,
          topics: topics || null,
          files: files || null,
          details: details || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('❌ Insert error:', error)
        return NextResponse.json({ 
          success: false,
          error: 'Failed to save class content: ' + error.message 
        }, { status: 500 })
      }

      result = data
    }

    console.log('✅ Content saved successfully:', result.id)
    
    return NextResponse.json({
      success: true,
      message: 'Class content saved successfully',
      content_id: result.id,
      class_log_id: class_log_id,
      saved_fields: {
        overview: !!overview,
        topics: !!topics,
        files: !!files,
        details: !!details
      }
    })

  } catch (error) {
    console.error('❌ Save content error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 })
  }
}