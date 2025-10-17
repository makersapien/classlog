// src/app/api/timeslots/waitlist/route.ts
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// First, let's add the waitlist table schema (this would go in a migration)
// CREATE TABLE booking_waitlist (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   teacher_id UUID NOT NULL REFERENCES profiles(id),
//   student_id UUID NOT NULL REFERENCES profiles(id),
//   schedule_slot_id UUID REFERENCES schedule_slots(id),
//   time_slot_id UUID REFERENCES time_slots(id),
//   preferred_date DATE,
//   day_of_week VARCHAR(10),
//   start_time TIME NOT NULL,
//   end_time TIME NOT NULL,
//   priority INTEGER DEFAULT 1,
//   status VARCHAR(20) DEFAULT 'waiting', -- 'waiting', 'notified', 'expired', 'fulfilled'
//   created_at TIMESTAMP DEFAULT NOW(),
//   expires_at TIMESTAMP,
//   notified_at TIMESTAMP,
//   fulfilled_at TIMESTAMP
// );

// Validation schemas
const WaitlistJoinSchema = z.object({
  schedule_slot_id: z.string().uuid().optional(),
  time_slot_id: z.string().uuid().optional(),
  preferred_date: z.string().optional(), // YYYY-MM-DD format
  day_of_week: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']).optional(),
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  share_token: z.string().optional() // For student access
})

const WaitlistManageSchema = z.object({
  waitlist_id: z.string().uuid(),
  action: z.enum(['notify', 'fulfill', 'remove', 'extend']),
  notification_message: z.string().optional(),
  extend_hours: z.number().min(1).max(168).optional() // Max 1 week extension
})

// Helper function to validate share token and get student info
async function validateShareTokenAndGetStudent(supabase: any, shareToken: string) {
  const { data: tokenData, error: tokenError } = await supabase
    .from('share_tokens')
    .select(`
      *,
      student:profiles!student_id(id, full_name, email),
      teacher:profiles!teacher_id(id, full_name)
    `)
    .eq('token', shareToken)
    .eq('is_active', true)
    .single()

  if (tokenError || !tokenData) {
    return { error: 'Invalid or expired share token' }
  }

  return { student: tokenData.student, teacher: tokenData.teacher, tokenData }
}

// Helper function to check waitlist position
async function getWaitlistPosition(supabase: any, waitlistId: string) {
  const { data: waitlistEntry } = await supabase
    .from('booking_waitlist')
    .select('*')
    .eq('id', waitlistId)
    .single()

  if (!waitlistEntry) return null

  const { data: higherPriorityEntries } = await supabase
    .from('booking_waitlist')
    .select('id')
    .eq('teacher_id', waitlistEntry.teacher_id)
    .eq('day_of_week', waitlistEntry.day_of_week)
    .eq('start_time', waitlistEntry.start_time)
    .eq('end_time', waitlistEntry.end_time)
    .eq('status', 'waiting')
    .lt('created_at', waitlistEntry.created_at)

  return (higherPriorityEntries?.length || 0) + 1
}

// Helper function to notify next in waitlist
async function notifyNextInWaitlist(
  supabase: any,
  teacherId: string,
  dayOfWeek: string,
  startTime: string,
  endTime: string,
  availableDate?: string
) {
  // Find the next person in waitlist
  let query = supabase
    .from('booking_waitlist')
    .select(`
      *,
      student:profiles!student_id(id, full_name, email),
      teacher:profiles!teacher_id(id, full_name, email)
    `)
    .eq('teacher_id', teacherId)
    .eq('day_of_week', dayOfWeek)
    .eq('start_time', startTime)
    .eq('end_time', endTime)
    .eq('status', 'waiting')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1)

  if (availableDate) {
    query = query.eq('preferred_date', availableDate)
  }

  const { data: nextInLine } = await query

  if (nextInLine && nextInLine.length > 0) {
    const waitlistEntry = nextInLine[0]
    
    // Update status to notified
    await supabase
      .from('booking_waitlist')
      .update({
        status: 'notified',
        notified_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours to respond
      })
      .eq('id', waitlistEntry.id)

    // Here you would typically send an email/notification
    console.log(`📧 Notifying ${waitlistEntry.student.full_name} about available slot`)
    
    return waitlistEntry
  }

  return null
}

// POST endpoint to join waitlist
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Waitlist Join API called')
    
    const body = await request.json()
    console.log('📝 Waitlist join body:', JSON.stringify(body))
    
    // Validate input
    const validationResult = WaitlistJoinSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const { schedule_slot_id, time_slot_id, preferred_date, day_of_week, start_time, end_time, share_token } = validationResult.data

    let studentId: string
    let teacherId: string

    if (share_token) {
      // Student access via share token
      const { supabase } = await createAuthenticatedSupabaseClient()
      const validation = await validateShareTokenAndGetStudent(supabase, share_token)
      
      if (validation.error) {
        return NextResponse.json({ error: validation.error }, { status: 401 })
      }
      
      studentId = validation.student.id
      teacherId = validation.teacher.id
    } else {
      // Teacher access (authenticated)
      const { supabase, user } = await createAuthenticatedSupabaseClient()
      
      if (!user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      
      // For teacher access, they would specify student_id in the request
      const teacherBody = z.object({
        student_id: z.string().uuid(),
        ...WaitlistJoinSchema.shape
      }).parse(body)
      
      studentId = teacherBody.student_id
      teacherId = user.id
    }

    const { supabase } = await createAuthenticatedSupabaseClient()

    // Check if student is already on waitlist for this slot
    const { data: existingWaitlist } = await supabase
      .from('booking_waitlist')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('student_id', studentId)
      .eq('day_of_week', day_of_week || 'Monday')
      .eq('start_time', start_time)
      .eq('end_time', end_time)
      .eq('status', 'waiting')

    if (existingWaitlist && existingWaitlist.length > 0) {
      return NextResponse.json({
        error: 'Student is already on waitlist for this time slot',
        code: 'ALREADY_ON_WAITLIST',
        existing_entry: existingWaitlist[0]
      }, { status: 409 })
    }

    // Check if the slot is actually full
    let slotIsFull = false
    if (schedule_slot_id) {
      const { data: scheduleSlot } = await supabase
        .from('schedule_slots')
        .select('status, max_students')
        .eq('id', schedule_slot_id)
        .single()

      if (scheduleSlot && scheduleSlot.status === 'booked') {
        slotIsFull = true
      }
    }

    if (!slotIsFull) {
      return NextResponse.json({
        error: 'Slot is still available for booking',
        code: 'SLOT_AVAILABLE'
      }, { status: 400 })
    }

    // Add to waitlist
    const { data: waitlistEntry, error: createError } = await supabase
      .from('booking_waitlist')
      .insert({
        teacher_id: teacherId,
        student_id: studentId,
        schedule_slot_id: schedule_slot_id,
        time_slot_id: time_slot_id,
        preferred_date: preferred_date,
        day_of_week: day_of_week,
        start_time: start_time,
        end_time: end_time,
        status: 'waiting',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 1 week default expiry
      })
      .select(`
        *,
        student:profiles!student_id(id, full_name, email),
        teacher:profiles!teacher_id(id, full_name, email)
      `)
      .single()

    if (createError) {
      console.error('❌ Waitlist create error:', createError)
      return NextResponse.json({ 
        error: 'Failed to join waitlist',
        details: createError.message
      }, { status: 500 })
    }

    // Get waitlist position
    const position = await getWaitlistPosition(supabase, waitlistEntry.id)

    console.log('✅ Student added to waitlist:', waitlistEntry.id)

    return NextResponse.json({
      success: true,
      waitlist_entry: waitlistEntry,
      position: position,
      message: `Added to waitlist. You are #${position} in line.`
    })
  } catch (error) {
    console.error('❌ Waitlist join error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET endpoint to view waitlist
export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Waitlist View API called')
    
    const { supabase, user } = await createAuthenticatedSupabaseClient()
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const shareToken = searchParams.get('share_token')
    const teacherId = searchParams.get('teacher_id')
    const studentId = searchParams.get('student_id')
    const status = searchParams.get('status') || 'waiting'

    let query = supabase
      .from('booking_waitlist')
      .select(`
        *,
        student:profiles!student_id(id, full_name, email),
        teacher:profiles!teacher_id(id, full_name, email),
        schedule_slot:schedule_slots(id, date, status),
        time_slot:time_slots(id, day_of_week, is_recurring)
      `)
      .eq('status', status)
      .order('created_at', { ascending: true })

    if (shareToken) {
      // Student access via share token
      const validation = await validateShareTokenAndGetStudent(supabase, shareToken)
      
      if (validation.error) {
        return NextResponse.json({ error: validation.error }, { status: 401 })
      }
      
      query = query.eq('student_id', validation.student.id)
    } else if (teacherId) {
      // Teacher viewing their waitlist
      query = query.eq('teacher_id', teacherId)
    } else if (studentId) {
      // Student viewing their waitlist entries
      query = query.eq('student_id', studentId)
    } else {
      // Default to current user's waitlist (if teacher)
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'teacher') {
        query = query.eq('teacher_id', user.id)
      } else {
        query = query.eq('student_id', user.id)
      }
    }

    const { data: waitlistEntries, error: fetchError } = await query

    if (fetchError) {
      console.error('❌ Waitlist fetch error:', fetchError)
      return NextResponse.json({ 
        error: 'Failed to fetch waitlist',
        details: fetchError.message
      }, { status: 500 })
    }

    // Add position information for each entry
    const entriesWithPosition = await Promise.all(
      (waitlistEntries || []).map(async (entry) => {
        const position = await getWaitlistPosition(supabase, entry.id)
        return { ...entry, position }
      })
    )

    return NextResponse.json({
      success: true,
      waitlist_entries: entriesWithPosition,
      total_entries: entriesWithPosition.length
    })
  } catch (error) {
    console.error('❌ Waitlist view error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// PUT endpoint to manage waitlist
export async function PUT(request: NextRequest) {
  try {
    console.log('🔄 Waitlist Manage API called')
    
    const { supabase, user } = await createAuthenticatedSupabaseClient()
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    console.log('📝 Waitlist manage body:', JSON.stringify(body))
    
    // Validate input
    const validationResult = WaitlistManageSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const { waitlist_id, action, notification_message, extend_hours } = validationResult.data

    // Get the waitlist entry
    const { data: waitlistEntry, error: fetchError } = await supabase
      .from('booking_waitlist')
      .select(`
        *,
        student:profiles!student_id(id, full_name, email),
        teacher:profiles!teacher_id(id, full_name, email)
      `)
      .eq('id', waitlist_id)
      .single()

    if (fetchError) {
      console.error('❌ Waitlist fetch error:', fetchError)
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Waitlist entry not found' }, { status: 404 })
      }
      return NextResponse.json({ 
        error: 'Failed to fetch waitlist entry',
        details: fetchError.message
      }, { status: 500 })
    }

    // Check permissions (only teacher or the student can manage)
    if (user.id !== waitlistEntry.teacher_id && user.id !== waitlistEntry.student_id) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    let updateData: any = {}
    let message = ''

    switch (action) {
      case 'notify':
        updateData = {
          status: 'notified',
          notified_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
        message = 'Student notified about available slot'
        // Here you would send actual notification
        break

      case 'fulfill':
        updateData = {
          status: 'fulfilled',
          fulfilled_at: new Date().toISOString()
        }
        message = 'Waitlist entry marked as fulfilled'
        break

      case 'remove':
        // Delete the waitlist entry
        const { error: deleteError } = await supabase
          .from('booking_waitlist')
          .delete()
          .eq('id', waitlist_id)

        if (deleteError) {
          return NextResponse.json({ 
            error: 'Failed to remove from waitlist',
            details: deleteError.message
          }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          message: 'Removed from waitlist'
        })

      case 'extend':
        const extendMs = (extend_hours || 24) * 60 * 60 * 1000
        updateData = {
          expires_at: new Date(Date.now() + extendMs).toISOString()
        }
        message = `Waitlist entry extended by ${extend_hours || 24} hours`
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Update the waitlist entry
    const { data: updatedEntry, error: updateError } = await supabase
      .from('booking_waitlist')
      .update(updateData)
      .eq('id', waitlist_id)
      .select(`
        *,
        student:profiles!student_id(id, full_name, email),
        teacher:profiles!teacher_id(id, full_name, email)
      `)
      .single()

    if (updateError) {
      console.error('❌ Waitlist update error:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update waitlist entry',
        details: updateError.message
      }, { status: 500 })
    }

    console.log('✅ Waitlist entry updated:', waitlist_id)

    return NextResponse.json({
      success: true,
      waitlist_entry: updatedEntry,
      message: message
    })
  } catch (error) {
    console.error('❌ Waitlist manage error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}