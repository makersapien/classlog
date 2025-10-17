// src/app/api/timeslots/route.ts
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schemas
const TimeSlotSchema = z.object({
  day_of_week: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  is_available: z.boolean().default(true),
  is_recurring: z.boolean().default(false),
  recurrence_end_date: z.string().optional(),
  subject: z.string().optional(),
  duration_minutes: z.number().min(15).max(480).default(60)
})

const BulkCreateSchema = z.object({
  slots: z.array(TimeSlotSchema),
  weeks: z.number().min(1).max(52).default(4)
})

// GET endpoint to fetch teacher's time slots
export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Time Slots API GET called')
    
    const { supabase, user } = await createAuthenticatedSupabaseClient()
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    // Get user role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('❌ Profile error:', profileError)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    
    // Only teachers can access time slots management
    if (profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can manage time slots' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const includeScheduleSlots = searchParams.get('include_schedule_slots') === 'true'
    
    // Get time slots
    const { data: timeSlots, error: timeSlotsError } = await supabase
      .from('time_slots')
      .select('*')
      .eq('teacher_id', user.id)
      .order('day_of_week')
      .order('start_time')
    
    if (timeSlotsError) {
      console.error('❌ Time slots error:', timeSlotsError)
      return NextResponse.json({ 
        error: 'Failed to fetch time slots',
        details: timeSlotsError.message
      }, { status: 500 })
    }

    let scheduleSlots = null
    if (includeScheduleSlots) {
      // Get upcoming schedule slots for the next 4 weeks
      const fourWeeksFromNow = new Date()
      fourWeeksFromNow.setDate(fourWeeksFromNow.getDate() + 28)
      
      const { data: slots, error: slotsError } = await supabase
        .from('schedule_slots')
        .select('*')
        .eq('teacher_id', user.id)
        .gte('date', new Date().toISOString().split('T')[0])
        .lte('date', fourWeeksFromNow.toISOString().split('T')[0])
        .order('date')
        .order('start_time')
      
      if (slotsError) {
        console.error('❌ Schedule slots error:', slotsError)
      } else {
        scheduleSlots = slots
      }
    }

    return NextResponse.json({
      success: true,
      time_slots: timeSlots || [],
      schedule_slots: scheduleSlots
    })
  } catch (error) {
    console.error('❌ Time slots API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST endpoint to create a new time slot
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Time Slots API POST called')
    
    const { supabase, user } = await createAuthenticatedSupabaseClient()
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    // Get user role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('❌ Profile error:', profileError)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    
    // Only teachers can create time slots
    if (profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can create time slots' }, { status: 403 })
    }

    const body = await request.json()
    console.log('📝 Request body:', JSON.stringify(body))
    
    // Validate input
    const validationResult = TimeSlotSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const timeSlotData = validationResult.data

    // Validate time range
    const startTime = new Date(`1970-01-01T${timeSlotData.start_time}:00`)
    const endTime = new Date(`1970-01-01T${timeSlotData.end_time}:00`)
    
    if (startTime >= endTime) {
      return NextResponse.json({ 
        error: 'Start time must be before end time' 
      }, { status: 400 })
    }

    // Check for conflicts with existing time slots
    const { data: existingSlots, error: conflictError } = await supabase
      .from('time_slots')
      .select('*')
      .eq('teacher_id', user.id)
      .eq('day_of_week', timeSlotData.day_of_week)
      .eq('is_available', true)
    
    if (conflictError) {
      console.error('❌ Conflict check error:', conflictError)
      return NextResponse.json({ 
        error: 'Failed to check for conflicts',
        details: conflictError.message
      }, { status: 500 })
    }

    // Check for time overlaps
    const hasConflict = existingSlots?.some(slot => {
      const existingStart = new Date(`1970-01-01T${slot.start_time}:00`)
      const existingEnd = new Date(`1970-01-01T${slot.end_time}:00`)
      
      return (
        (startTime >= existingStart && startTime < existingEnd) ||
        (endTime > existingStart && endTime <= existingEnd) ||
        (startTime <= existingStart && endTime >= existingEnd)
      )
    })

    if (hasConflict) {
      return NextResponse.json({ 
        error: 'Time slot conflicts with existing availability',
        code: 'TIME_CONFLICT'
      }, { status: 409 })
    }

    // Create the time slot
    const { data: timeSlot, error: createError } = await supabase
      .from('time_slots')
      .insert({
        teacher_id: user.id,
        ...timeSlotData
      })
      .select()
      .single()

    if (createError) {
      console.error('❌ Create error:', createError)
      return NextResponse.json({ 
        error: 'Failed to create time slot',
        details: createError.message
      }, { status: 500 })
    }

    console.log('✅ Time slot created:', timeSlot.id)

    return NextResponse.json({
      success: true,
      time_slot: timeSlot
    })
  } catch (error) {
    console.error('❌ Time slots API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}