// src/app/api/teacher/generate-booking-link/route.ts
import { NextRequest, NextResponse  } from 'next/server'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-server'
import { nanoid } from 'nanoid'

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await createAuthenticatedSupabaseClient()
    const { teacher_id } = await request.json()

    if (!teacher_id) {
      return NextResponse.json(
        { error: 'Missing required field: teacher_id' },
        { status: 400 }
      )
    }

    // Verify user is authenticated
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify the teacher_id matches the authenticated user
    if (user.id !== teacher_id) {
      return NextResponse.json(
        { error: 'Forbidden: Can only generate links for your own account' },
        { status: 403 }
      )
    }

    // Generate a unique token for the booking link
    const token = nanoid(32) // 32 character random string

    // Create a general booking token for the teacher (not student-specific)
    // We'll use a special student_id of 'TEACHER_BOOKING_LINK' to indicate this is a general booking link
    const specialStudentId = 'TEACHER_BOOKING_LINK'
    
    // Check if teacher already has a general booking token
    const { data: existingToken, error: fetchError  } = await supabase
      .from('share_tokens')
      .select('*')
      .eq('teacher_id', teacher_id)
      .eq('student_id', specialStudentId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking existing token:', fetchError)
      return NextResponse.json(
        { error: 'Failed to check existing booking token' },
        { status: 500 }
      )
    }

    let result
    if (existingToken) {
      // Update existing token
      const { data, error: updateError } = await supabase
        .from('share_tokens')
        .update({
          token: token,
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
          is_active: true,
          access_count: 0 // Reset access count
        })
        .eq('teacher_id', teacher_id)
        .eq('student_id', specialStudentId)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating booking token:', updateError)
        return NextResponse.json(
          { error: 'Failed to update booking token' },
          { status: 500 }
        )
      }
      result = data
    } else {
      // Create new token
      const { data, error: insertError } = await supabase
        .from('share_tokens')
        .insert({
          student_id: specialStudentId,
          teacher_id: teacher_id,
          token: token,
          is_active: true,
          access_count: 0,
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year from now
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error creating booking token:', insertError)
        return NextResponse.json(
          { error: 'Failed to create booking token' },
          { status: 500 }
        )
      }
      result = data
    }

    return NextResponse.json({
      token: result.token,
      expires_at: result.expires_at,
      message: 'Booking link generated successfully'
    })

  } catch (error) {
    console.error('Error generating booking link:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}