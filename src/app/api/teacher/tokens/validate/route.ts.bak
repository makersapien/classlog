// File: src/app/api/teacher/tokens/validate/route.ts
// Validate extension token and return teacher info

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ 
        success: false, 
        error: 'Token is required' 
      }, { status: 400 })
    }

    console.log('🔍 Validating extension token...')

    // Hash the provided token for comparison
    const tokenHash = createHash('sha256').update(token).digest('hex')

    // Look up token in database
    const { data: tokenData, error: tokenError } = await supabase
      .from('extension_tokens')
      .select(`
        id,
        teacher_id,
        expires_at,
        is_active,
        usage_count,
        last_used_at,
        profiles!extension_tokens_teacher_id_fkey (
          id,
          full_name,
          email,
          role
        )
      `)
      .eq('token_hash', tokenHash)
      .eq('is_active', true)
      .single()

    if (tokenError || !tokenData) {
      console.log('❌ Token not found or invalid')
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid or expired token' 
      }, { status: 401 })
    }

    // Check if token has expired
    const now = new Date()
    const expiryDate = new Date(tokenData.expires_at)
    
    if (now > expiryDate) {
      console.log('❌ Token has expired')
      
      // Deactivate expired token
      await supabase
        .from('extension_tokens')
        .update({ is_active: false })
        .eq('id', tokenData.id)

      return NextResponse.json({ 
        success: false, 
        error: 'Token has expired. Please generate a new one.' 
      }, { status: 401 })
    }

    // Update last used timestamp and usage count
    await supabase
      .from('extension_tokens')
      .update({ 
        last_used_at: now.toISOString(),
        usage_count: tokenData.usage_count + 1
      })
      .eq('id', tokenData.id)

    console.log('✅ Token validated successfully for teacher:', tokenData.profiles?.full_name)

    // Calculate days until expiry
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    return NextResponse.json({
      success: true,
      teacher: {
        id: tokenData.teacher_id,
        name: tokenData.profiles?.full_name || 'Teacher',
        email: tokenData.profiles?.email || '',
        user_type: tokenData.profiles?.role
      },
      token_info: {
        expires_at: tokenData.expires_at,
        days_until_expiry: daysUntilExpiry,
        usage_count: tokenData.usage_count + 1,
        last_used_at: now.toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Validate token API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}