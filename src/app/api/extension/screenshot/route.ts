// src/app/api/extension/screenshot/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { class_log_id, screenshot_data, screenshot_type = 'manual', timestamp } = body

    if (!class_log_id || !screenshot_data) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: class_log_id and screenshot_data' 
      }, { status: 400 })
    }

    console.log('📸 Storing screenshot for class:', class_log_id)

    // Verify the class log exists and is ongoing
    const { data: classLog, error: fetchError } = await supabase
      .from('class_logs')
      .select('id, status, attachments')
      .eq('id', class_log_id)
      .single()

    if (fetchError || !classLog) {
      console.error('❌ Class log not found:', fetchError)
      return NextResponse.json({ 
        success: false, 
        error: 'Class log not found' 
      }, { status: 404 })
    }

    // Prepare screenshot metadata
    const screenshotMetadata = {
      timestamp: timestamp || new Date().toISOString(),
      type: screenshot_type,
      format: 'png',
      size: screenshot_data.length
    }

    // Update class log attachments with screenshot info
    const existingAttachments = classLog.attachments || {}
    const screenshots = existingAttachments.screenshots || []
    
    screenshots.push(screenshotMetadata)
    
    const updatedAttachments = {
      ...existingAttachments,
      screenshots: screenshots,
      last_screenshot: screenshotMetadata,
      total_screenshots: screenshots.length
    }

    // Update the class log with screenshot metadata
    const { error: updateError } = await supabase
      .from('class_logs')
      .update({
        attachments: updatedAttachments,
        updated_at: new Date().toISOString()
      })
      .eq('id', class_log_id)

    if (updateError) {
      console.error('❌ Failed to update class log with screenshot:', updateError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to store screenshot metadata: ' + updateError.message 
      }, { status: 500 })
    }

    console.log('✅ Screenshot metadata stored successfully for class:', class_log_id)

    return NextResponse.json({
      success: true,
      message: 'Screenshot stored successfully',
      screenshot_id: screenshots.length,
      metadata: screenshotMetadata,
      total_screenshots: screenshots.length
    })

  } catch (error) {
    console.error('❌ Screenshot API Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 })
  }
}