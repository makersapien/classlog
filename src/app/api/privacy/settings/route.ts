// src/app/api/privacy/settings/route.ts
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-server'
import { withSecurity } from '@/lib/rate-limiting'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schema for privacy settings
const PrivacySettingsSchema = z.object({
  hide_student_names_in_calendar: z.boolean().optional(),
  allow_student_notes: z.boolean().optional(),
  share_booking_analytics: z.boolean().optional(),
  data_retention_days: z.number().min(30).max(3650).optional(),
  require_booking_confirmation: z.boolean().optional(),
  allow_late_cancellations: z.boolean().optional(),
  auto_delete_expired_tokens: z.boolean().optional(),
  anonymize_old_audit_logs: z.boolean().optional()
})

// GET endpoint to fetch teacher privacy settings
async function getPrivacySettingsHandler(
  request: NextRequest
) {
  try {
    console.log('🔄 Get Privacy Settings API called')
    
    const { supabase, user } = await createAuthenticatedSupabaseClient()
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    // Get user role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('❌ Profile error:', profileError)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    
    // Only teachers can manage privacy settings
    if (profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can access privacy settings' }, { status: 403 })
    }
    
    // Get privacy settings
    const { data: settings, error: settingsError } = await supabase
      .from('teacher_privacy_settings')
      .select('*')
      .eq('teacher_id', user.id)
      .single()
    
    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('❌ Privacy settings error:', settingsError)
      return NextResponse.json({ 
        error: 'Failed to fetch privacy settings',
        details: settingsError.message
      }, { status: 500 })
    }
    
    // Return default settings if none exist
    const defaultSettings = {
      teacher_id: user.id,
      hide_student_names_in_calendar: false,
      allow_student_notes: true,
      share_booking_analytics: false,
      data_retention_days: 2555, // 7 years
      require_booking_confirmation: false,
      allow_late_cancellations: false,
      auto_delete_expired_tokens: true,
      anonymize_old_audit_logs: true
    }
    
    const response = NextResponse.json({
      success: true,
      settings: settings || defaultSettings
    })
    
    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    
    return response
  } catch (error) {
    console.error('❌ Get privacy settings API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// PUT endpoint to update teacher privacy settings
async function updatePrivacySettingsHandler(
  request: NextRequest
) {
  try {
    console.log('🔄 Update Privacy Settings API called')
    
    const { supabase, user } = await createAuthenticatedSupabaseClient()
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    const body = await request.json()
    
    // Validate input
    const validationResult = PrivacySettingsSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const settings = validationResult.data
    
    // Get user role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('❌ Profile error:', profileError)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    
    // Only teachers can manage privacy settings
    if (profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can manage privacy settings' }, { status: 403 })
    }
    
    // Update privacy settings
    const { data: updatedSettings, error: updateError } = await supabase
      .from('teacher_privacy_settings')
      .upsert({
        teacher_id: user.id,
        ...settings,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (updateError) {
      console.error('❌ Privacy settings update error:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update privacy settings',
        details: updateError.message
      }, { status: 500 })
    }
    
    console.log('✅ Privacy settings updated successfully')
    
    const response = NextResponse.json({
      success: true,
      message: 'Privacy settings updated successfully',
      settings: updatedSettings
    })
    
    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    
    return response
  } catch (error) {
    console.error('❌ Update privacy settings API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Apply security middleware
export const GET = withSecurity(getPrivacySettingsHandler, { 
  rateLimit: 'api-general',
  csrf: false
})

export const PUT = withSecurity(updatePrivacySettingsHandler, { 
  rateLimit: 'api-general',
  csrf: true
})