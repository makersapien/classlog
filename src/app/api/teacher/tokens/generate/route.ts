// src/app/api/teacher/tokens/generate/route.ts
// FIXED: One token per teacher, proper expiry logic

import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { NextRequest, NextResponse  } from 'next/server'
import { createHash } from 'crypto'

// Moved Supabase client creation inside functions to avoid build-time env var issues

export async function POST(request: NextRequest) {
    // Initialize Supabase client inside function to avoid build-time env var issues
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Initialize Supabase client inside function to avoid build-time env var issues

  try {
    // Initialize Supabase client inside function to avoid build-time env var issues

    const { teacherId } = await request.json()

    if (!teacherId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Teacher ID is required' 
      }, { status: 400 })
    }

    console.log('🔐 Generating extension token for teacher:', teacherId)

    // Verify teacher exists and is active
    const { data: teacher, error: teacherError  } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('id', teacherId)
      .eq('role', 'teacher')
      .single()

    if (teacherError || !teacher) {
      console.log('❌ Teacher verification failed:', teacherError)
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid teacher ID' 
      }, { status: 401 })
    }

    // STEP 1: DELETE all existing tokens for this teacher (clean slate)
    const { error: deleteError } = await supabase
      .from('extension_tokens')
      .delete()
      .eq('teacher_id', teacherId)

    if (deleteError) {
      console.error('❌ Failed to delete existing tokens:', deleteError)
    } else {
      console.log('🗑️ Deleted all existing tokens for teacher')
    }

    // STEP 2: Generate new token with better logic
    const now = new Date()
    const randomPart = randomBytes(4).toString('hex') // 8 characters
    
    // Create readable token: CL_[short_teacher_id]_[timestamp]_[random]
    const shortTeacherId = teacherId.split('-')[0] // First part of UUID
    const timestamp = Math.floor(now.getTime() / 1000).toString(36) // Base36 timestamp
    const readableToken = `CL_${shortTeacherId}_${timestamp}_${randomPart}`
    
    console.log('🎫 Generated new token:', readableToken)
    
    // Hash the token for storage (never store plain text)
    const tokenHash = createHash('sha256').update(readableToken).digest('hex')
    console.log('🔒 Token hash:', tokenHash.substring(0, 16) + '...')
    
    // STEP 3: Calculate proper expiry - 7 days from now
    const expiryDate = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)) // 7 days
    
    console.log('⏰ Current time:', now.toISOString())
    console.log('⏰ Expiry date:', expiryDate.toISOString())
    console.log('⏰ Days until expiry:', Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

    // STEP 4: Insert single new token
    const { data: newToken, error: insertError  } = await supabase
      .from('extension_tokens')
      .insert({
        teacher_id: teacherId,
        token_hash: tokenHash,
        expires_at: expiryDate.toISOString(),
        is_active: true,
        usage_count: 0,
        created_at: now.toISOString()
      })
      .select('id, expires_at, created_at')
      .single()

    if (insertError) {
      console.error('❌ Failed to create token:', insertError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to generate token: ' + insertError.message 
      }, { status: 500 })
    }

    // STEP 5: Verify the token was created correctly
    const { data: verifyToken, error: verifyError  } = await supabase
      .from('extension_tokens')
      .select('id, token_hash, expires_at, is_active, created_at')
      .eq('teacher_id', teacherId)
      .eq('is_active', true)

    console.log('✅ Token verification result:', verifyToken)

    if (verifyError || !verifyToken || verifyToken.length === 0) {
      console.error('❌ Token verification failed:', verifyError)
      return NextResponse.json({ 
        success: false, 
        error: 'Token created but verification failed' 
      }, { status: 500 })
    }

    if (verifyToken.length > 1) {
      console.warn('⚠️ Multiple active tokens found, this should not happen!')
    }

    console.log('✅ Extension token generated successfully', {
      tokenId: newToken.id,
      expiresAt: newToken.expires_at,
      createdAt: newToken.created_at,
      activeTokensCount: verifyToken.length
    })

    // Calculate display info
    const hoursUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60))
    const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    return NextResponse.json({
      success: true,
      token: readableToken, // Return the plain token for user to copy
      token_info: {
        expires_at: expiryDate.toISOString(),
        hours_until_expiry: hoursUntilExpiry,
        days_until_expiry: daysUntilExpiry,
        created_at: newToken.created_at,
        token_id: newToken.id
      },
      teacher: {
        name: teacher.full_name,
        email: teacher.email
      },
      debug_info: {
        server_time: now.toISOString(),
        tokens_deleted: 'all_previous',
        new_tokens_created: 1,
        active_tokens_verified: verifyToken.length
      }
    })

  } catch (error) {
    console.error('❌ Generate token API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 })
  }
}
