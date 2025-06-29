// src/app/api/teacher/tokens/status/route.ts
// Fixed token status with correct expiry logic

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const teacherId = searchParams.get('teacherId')

    if (!teacherId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Teacher ID is required' 
      }, { status: 400 })
    }

    console.log('📊 Checking token status for teacher:', teacherId)

    // Get current active token for teacher
    const { data: currentToken, error: tokenError } = await supabase
      .from('extension_tokens')
      .select(`
        id,
        expires_at,
        created_at,
        last_used_at,
        usage_count,
        is_active
      `)
      .eq('teacher_id', teacherId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const now = new Date()
    
    if (!currentToken) {
      console.log('📝 No active token found')
      return NextResponse.json({
        success: true,
        has_token: false,
        status: 'no_token',
        message: 'No extension token generated yet'
      })
    }

    const expiryDate = new Date(currentToken.expires_at)
    const isExpired = now > expiryDate
    
    console.log('🕐 Current time:', now.toISOString())
    console.log('⏰ Token expires:', expiryDate.toISOString())
    console.log('❓ Is expired?', isExpired)
    
    if (isExpired) {
      console.log('⏰ Token has expired')
      
      // Deactivate expired token
      await supabase
        .from('extension_tokens')
        .update({ is_active: false })
        .eq('id', currentToken.id)

      return NextResponse.json({
        success: true,
        has_token: false,
        status: 'expired',
        message: 'Token has expired. Generate a new one.',
        expired_at: currentToken.expires_at
      })
    }

    // FIXED: Calculate time until expiry more accurately
    const msUntilExpiry = expiryDate.getTime() - now.getTime()
    const hoursUntilExpiry = Math.ceil(msUntilExpiry / (1000 * 60 * 60))
    const daysUntilExpiry = Math.floor(msUntilExpiry / (1000 * 60 * 60 * 24))

    console.log('⏱️ Hours until expiry:', hoursUntilExpiry)
    console.log('📅 Days until expiry:', daysUntilExpiry)

    // FIXED: Better status classification
    let status = 'active'
    let message = ''

    if (hoursUntilExpiry <= 2) {
      status = 'expiring_very_soon'
      message = `Token expires in ${hoursUntilExpiry} hour${hoursUntilExpiry === 1 ? '' : 's'}. Generate a new one soon.`
    } else if (hoursUntilExpiry <= 12) {
      status = 'expiring_soon'
      message = `Token expires in ${hoursUntilExpiry} hours. Consider generating a new one.`
    } else if (daysUntilExpiry === 0) {
      status = 'expiring_today'
      message = `Token expires today in ${hoursUntilExpiry} hours.`
    } else if (daysUntilExpiry === 1) {
      status = 'expiring_tomorrow'
      message = `Token expires tomorrow (in ${hoursUntilExpiry} hours).`
    } else {
      status = 'active'
      message = `Token is active. Expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}.`
    }

    console.log('✅ Token status calculated:', status, '-', message)

    return NextResponse.json({
      success: true,
      has_token: true,
      status: status,
      message: message,
      token_info: {
        created_at: currentToken.created_at,
        expires_at: currentToken.expires_at,
        expires_at_local: expiryDate.toString(),
        last_used_at: currentToken.last_used_at,
        usage_count: currentToken.usage_count,
        days_until_expiry: daysUntilExpiry,
        hours_until_expiry: hoursUntilExpiry,
        ms_until_expiry: msUntilExpiry
      }
    })

  } catch (error) {
    console.error('❌ Token status API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}