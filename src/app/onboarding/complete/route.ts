// src/app/api/onboarding/complete/route.ts

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database'

// Create admin client for auth operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: Request) {
  console.log('🔄 Starting onboarding completion process')
  
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    const body = await request.json()
    const { invitation_id, invitation_token } = body

    if (!invitation_id || !invitation_token) {
      return NextResponse.json({ 
        error: 'Missing invitation ID or token' 
      }, { status: 400 })
    }

    // Get invitation details
    const { data: invitation, error: invitationError } = await supabase
      .from('student_invitations')
      .select('*')
      .eq('id', invitation_id)
      .eq('invitation_token', invitation_token)
      .eq('status', 'pending')
      .single()

    if (invitationError || !invitation) {
      return NextResponse.json({ 
        error: 'Invalid or expired invitation' 
      }, { status: 404 })
    }

    console.log('✅ Invitation found:', invitation.student_name)

    // Generate random passwords
    const generatePassword = () => Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase()
    const parentPassword = generatePassword()
    const studentPassword = generatePassword()

    console.log('🔑 Generated passwords for accounts')

    // Step 1: Create parent account using admin client
    const { data: parentAuth, error: parentAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: invitation.parent_email,
      password: parentPassword,
      email_confirm: true,
      user_metadata: {
        full_name: invitation.parent_name,
        role: 'parent'
      }
    })

    if (parentAuthError) {
      console.error('❌ Parent auth creation error:', parentAuthError)
      return NextResponse.json({ 
        error: 'Failed to create parent account: ' + parentAuthError.message 
      }, { status: 500 })
    }

    console.log('✅ Parent account created:', parentAuth.user?.id)

    // Step 2: Create student account using admin client
    const { data: studentAuth, error: studentAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: invitation.student_email,
      password: studentPassword,
      email_confirm: true,
      user_metadata: {
        full_name: invitation.student_name,
        role: 'student',
        parent_id: parentAuth.user?.id
      }
    })

    if (studentAuthError) {
      console.error('❌ Student auth creation error:', studentAuthError)
      return NextResponse.json({ 
        error: 'Failed to create student account: ' + studentAuthError.message 
      }, { status: 500 })
    }

    console.log('✅ Student account created:', studentAuth.user?.id)

    // Step 3: Create parent profile
    const { error: parentProfileError } = await supabase
      .from('profiles')
      .insert({
        id: parentAuth.user!.id,
        email: invitation.parent_email,
        full_name: invitation.parent_name,
        role: 'parent',
        status: 'active'
      })

    if (parentProfileError) {
      console.error('❌ Parent profile error:', parentProfileError)
      return NextResponse.json({ 
        error: 'Failed to create parent profile: ' + parentProfileError.message 
      }, { status: 500 })
    }

    console.log('✅ Parent profile created')

    // Step 4: Create student profile
    const { error: studentProfileError } = await supabase
      .from('profiles')
      .insert({
        id: studentAuth.user!.id,
        email: invitation.student_email,
        full_name: invitation.student_name,
        role: 'student',
        parent_id: parentAuth.user!.id,
        grade: invitation.year_group,
        status: 'active'
      })

    if (studentProfileError) {
      console.error('❌ Student profile error:', studentProfileError)
      return NextResponse.json({ 
        error: 'Failed to create student profile: ' + studentProfileError.message 
      }, { status: 500 })
    }

    console.log('✅ Student profile created')

    // Step 5: Create parent-child relationship
    const { error: relationshipError } = await supabase
      .from('parent_child_relationships')
      .insert({
        parent_id: parentAuth.user!.id,
        child_id: studentAuth.user!.id
      })

    if (relationshipError) {
      console.error('❌ Relationship error:', relationshipError)
      return NextResponse.json({ 
        error: 'Failed to create parent-child relationship: ' + relationshipError.message 
      }, { status: 500 })
    }

    console.log('✅ Parent-child relationship created')

    // Step 6: Find or create class
    let classId: string
    
    // Try to find existing class
    const { data: existingClass, error: classSearchError } = await supabase
      .from('classes')
      .select('id')
      .eq('teacher_id', invitation.teacher_id)
      .eq('subject', invitation.subject)
      .eq('grade', invitation.year_group)
      .eq('status', 'active')
      .single()

    if (existingClass) {
      classId = existingClass.id
      console.log('✅ Found existing class:', classId)
    } else {
      // Create new class
      const className = `${invitation.subject} - ${invitation.year_group}`
      const { data: newClass, error: classCreateError } = await supabase
        .from('classes')
        .insert({
          teacher_id: invitation.teacher_id,
          name: className,
          subject: invitation.subject,
          grade: invitation.year_group,
          status: 'active',
          max_students: 30,
          fees_per_month: 2500
        })
        .select('id')
        .single()

      if (classCreateError) {
        console.error('❌ Class creation error:', classCreateError)
        return NextResponse.json({ 
          error: 'Failed to create class: ' + classCreateError.message 
        }, { status: 500 })
      }

      classId = newClass.id
      console.log('✅ Created new class:', classId)
    }

    // Step 7: Create enrollment
    const setupCompleted = !!(invitation.whatsapp_group_url && invitation.google_meet_url)
    
    const { error: enrollmentError } = await supabase
      .from('enrollments')
      .insert({
        class_id: classId,
        student_id: studentAuth.user!.id,
        status: 'active',
        enrollment_date: new Date().toISOString().split('T')[0],
        classes_per_week: invitation.classes_per_week,
        classes_per_recharge: invitation.classes_per_recharge,
        tentative_schedule: invitation.tentative_schedule,
        whatsapp_group_url: invitation.whatsapp_group_url,
        google_meet_url: invitation.google_meet_url,
        setup_completed: setupCompleted
      })

    if (enrollmentError) {
      console.error('❌ Enrollment error:', enrollmentError)
      return NextResponse.json({ 
        error: 'Failed to create enrollment: ' + enrollmentError.message 
      }, { status: 500 })
    }

    console.log('✅ Enrollment created with setup_completed:', setupCompleted)

    // Step 8: Mark invitation as completed
    const { error: updateError } = await supabase
      .from('student_invitations')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', invitation.id)

    if (updateError) {
      console.error('❌ Invitation update error:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update invitation: ' + updateError.message 
      }, { status: 500 })
    }

    console.log('✅ Invitation marked as completed')

    // Return success with credentials
    const credentials = {
      parent: { email: invitation.parent_email, password: parentPassword },
      student: { email: invitation.student_email, password: studentPassword }
    }

    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully',
      credentials
    })

  } catch (error) {
    console.error('💥 Onboarding completion error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}