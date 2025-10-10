// File: src/app/api/teacher/tokens/revoke/route.ts
// Revoke extension token for teacher

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Moved Supabase client creation inside functions to avoid build-time env var issues

// Define proper types
interface RevokeTokenRequestBody {
  teacherId: string
}

export async function POST(request: NextRequest) {
  try {
    // Initialize Supabase client inside function to avoid build-time env var issues
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const { teacherId }: RevokeTokenRequestBody = await request.json()

    if (!teacherId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Teacher ID is required' 
      }, { status: 400 })
    }

    console.log('🚫 Revoking extension tokens for teacher:', teacherId)

    // Deactivate all active tokens for this teacher
    const { data, error } = await supabase
      .from('extension_tokens')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('teacher_id', teacherId)
      .eq('is_active', true)
      .select()

    if (error) {
      console.error('❌ Failed to revoke tokens:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to revoke tokens: ' + error.message 
      }, { status: 500 })
    }

    const revokedCount = data?.length || 0
    console.log(`✅ Successfully revoked ${revokedCount} token(s)`)

    return NextResponse.json({
      success: true,
      message: `Successfully revoked ${revokedCount} active token(s)`,
      revoked_count: revokedCount
    })

  } catch (error) {
    console.error('❌ Revoke token API error:', error)
    
    // Fix: Proper error handling with type safety
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error: ' + errorMessage 
    }, { status: 500 })
  }
}