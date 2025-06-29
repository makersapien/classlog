// src/app/api/extension/auth-status/route.ts
// Error-free version matching your exact database schema

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Define types matching your exact database schema and Supabase joins
interface ProfileData {
  id: string
  full_name: string | null
  email: string
  role: 'teacher' | 'student' | 'parent'
}

interface TokenData {
  id: string
  teacher_id: string
  token_hash: string
  expires_at: string
  is_active: boolean | null
  usage_count: number | null
  last_used_at: string | null
  profiles: ProfileData | ProfileData[] | null  // Supabase can return array or single object
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json({ 
        success: false, 
        isLoggedIn: false,
        error: 'No token provided' 
      })
    }

    console.log('🔐 Extension: Checking auth status for token:', token.substring(0, 10) + '...')

    // Hash the token to compare with token_hash in database
    const tokenHash = createHash('sha256').update(token).digest('hex')

    // Query using token_hash and proper join syntax
    const { data: tokenData, error: tokenError } = await supabase
      .from('extension_tokens')
      .select(`
        id,
        teacher_id,
        token_hash,
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
      console.log('❌ Extension: Invalid or expired token, error:', tokenError)
      return NextResponse.json({ 
        success: false, 
        isLoggedIn: false,
        error: 'Invalid or expired token' 
      })
    }

    // Type-safe access to the data with proper error handling
    const typedTokenData = tokenData as unknown as TokenData

    // Check if token is expired
    if (new Date(typedTokenData.expires_at) < new Date()) {
      console.log('❌ Extension: Token expired')
      
      // Mark token as inactive when expired
      await supabase
        .from('extension_tokens')
        .update({ is_active: false })
        .eq('id', typedTokenData.id)
      
      return NextResponse.json({ 
        success: false, 
        isLoggedIn: false,
        error: 'Token expired' 
      })
    }

    // Handle Supabase join - profiles can be array or single object
    const profileData = Array.isArray(typedTokenData.profiles) 
      ? typedTokenData.profiles[0] 
      : typedTokenData.profiles

    // Verify the user exists and is a teacher
    if (!profileData || profileData.role !== 'teacher') {
      console.log('❌ Extension: User is not a teacher')
      return NextResponse.json({ 
        success: false, 
        isLoggedIn: false,
        error: 'User is not a teacher' 
      })
    }

    // Update last_used_at and usage_count
    await supabase
      .from('extension_tokens')
      .update({ 
        last_used_at: new Date().toISOString(),
        usage_count: (typedTokenData.usage_count || 0) + 1
      })
      .eq('id', typedTokenData.id)

    console.log('✅ Extension: Valid teacher token for:', profileData.full_name)

    // Return the format expected by the extension
    return NextResponse.json({
      success: true,
      isLoggedIn: true,
      teacher: {
        id: typedTokenData.teacher_id,
        name: profileData.full_name,
        full_name: profileData.full_name,
        email: profileData.email,
        role: profileData.role
      }
    })

  } catch (error) {
    console.error('❌ Extension: Auth status API Error:', error)
    
    // Proper error handling
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json({ 
      success: false, 
      isLoggedIn: false,
      error: 'Internal server error: ' + errorMessage 
    })
  }
}