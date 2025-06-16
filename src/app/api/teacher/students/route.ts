import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  console.log('🔄 Students API called')
  
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get current user (teacher)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }

    console.log('✅ Teacher authenticated:', user.id)

    // For now, return mock data that matches our interface
    // This will be replaced with real data once types are updated
    const mockStudents = [
      {
        id: '1',
        student_id: 'student-1',
        student_name: 'John Doe',
        parent_name: 'Jane Doe',
        parent_email: 'jane.doe@email.com',
        subject: 'Mathematics',
        year_group: 'DP1',
        classes_per_week: 2,
        classes_per_recharge: 8,
        tentative_schedule: { days: ['monday', 'wednesday'], time: '4:00 PM' },
        whatsapp_group_url: null,
        google_meet_url: null,
        setup_completed: false,
        enrollment_date: new Date().toISOString(),
        status: 'active',
        class_name: 'Mathematics DP1'
      },
      {
        id: '2',
        student_id: 'student-2',
        student_name: 'Alice Smith',
        parent_name: 'Bob Smith',
        parent_email: 'bob.smith@email.com',
        subject: 'Physics',
        year_group: 'DP2',
        classes_per_week: 3,
        classes_per_recharge: 12,
        tentative_schedule: { days: ['tuesday', 'thursday', 'saturday'], time: '2:00 PM' },
        whatsapp_group_url: 'https://chat.whatsapp.com/sample',
        google_meet_url: 'https://meet.google.com/sample',
        setup_completed: true,
        enrollment_date: new Date().toISOString(),
        status: 'active',
        class_name: 'Physics DP2'
      }
    ]

    const mockInvitations = [
      {
        id: 'inv-1',
        student_name: 'Pending Student',
        parent_name: 'Pending Parent',
        parent_email: 'pending@email.com',
        subject: 'Chemistry',
        year_group: 'MYP 5',
        status: 'pending',
        created_at: new Date().toISOString()
      }
    ]

    // Calculate stats
    const totalStudents = mockStudents.length
    const completeSetup = mockStudents.filter(s => 
      s.whatsapp_group_url && s.google_meet_url
    ).length
    const incompleteSetup = totalStudents - completeSetup
    const pendingInvitations = mockInvitations.length

    const stats = {
      totalStudents,
      completeSetup,
      incompleteSetup,
      pendingInvitations
    }

    console.log('✅ Mock data prepared successfully')
    return NextResponse.json({
      students: mockStudents,
      invitations: mockInvitations,
      stats
    })

  } catch (error) {
    console.error('💥 Students API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  console.log('🔄 Creating new student invitation')
  
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get current user (teacher)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }

    const body = await request.json()
    console.log('📝 Student invitation data received:', body)

    // For now, return a mock successful response
    const invitation_token = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/onboarding/${invitation_token}`

    const mockInvitation = {
      id: `invitation-${Date.now()}`,
      invitation_token,
      ...body,
      teacher_id: user.id,
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString()
    }

    console.log('✅ Mock invitation created successfully')

    return NextResponse.json({
      invitation: mockInvitation,
      invitation_url: invitationUrl,
      message: 'Student invitation created successfully (mock data)'
    })

  } catch (error) {
    console.error('💥 POST Students API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}