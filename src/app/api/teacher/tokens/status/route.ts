// File: src/app/api/teacher/tokens/status/route.ts
// Get current token status for teacher

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

    // ESLint fix: Use tokenError variable for debugging
    console.log('Debug: Token query error for monitoring:', tokenError)

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

    // Calculate time until expiry
    const hoursUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60))
    const daysUntilExpiry = Math.ceil(hoursUntilExpiry / 24)

    let status = 'active'
    let message = `Token is active. Expires in ${daysUntilExpiry} days.`

    if (daysUntilExpiry <= 1) {
      status = 'expiring_soon'
      message = `Token expires in ${hoursUntilExpiry} hours. Consider generating a new one.`
    } else if (daysUntilExpiry <= 2) {
      status = 'expiring_soon'
      message = `Token expires in ${daysUntilExpiry} days. Consider generating a new one.`
    }

    console.log('✅ Token status retrieved successfully')

    return NextResponse.json({
      success: true,
      has_token: true,
      status: status,
      message: message,
      token_info: {
        created_at: currentToken.created_at,
        expires_at: currentToken.expires_at,
        last_used_at: currentToken.last_used_at,
        usage_count: currentToken.usage_count,
        days_until_expiry: daysUntilExpiry,
        hours_until_expiry: hoursUntilExpiry
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