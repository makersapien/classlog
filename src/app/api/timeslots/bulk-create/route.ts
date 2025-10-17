// src/app/api/timeslots/bulk-create/route.ts
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schemas
const RecurringSlotSchema = z.object({
  day_of_week: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  subject: z.string().optional(),
  duration_minutes: z.number().min(15).max(480).default(60)
})

const BulkCreateSchema = z.object({
  slots: z.array(RecurringSlotSchema).min(1).max(20),
  weeks: z.number().min(1).max(52).default(4),
  start_date: z.string().optional(), // YYYY-MM-DD format
  create_time_slots: z.boolean().default(true), // Whether to create time_slots records
  create_schedule_slots: z.boolean().default(true) // Whether to create schedule_slots records
})

// POST endpoint to create recurring slots in bulk
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Bulk Create Time Slots API called')
    
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
    
    // Only teachers can create bulk time slots
    if (profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can create bulk time slots' }, { status: 403 })
    }

    const body = await request.json()
    console.log('📝 Bulk create body:', JSON.stringify(body))
    
    // Validate input
    const validationResult = BulkCreateSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const { slots, weeks, start_date, create_time_slots, create_schedule_slots } = validationResult.data

    // Validate all time ranges
    for (const slot of slots) {
      const startTime = new Date(`1970-01-01T${slot.start_time}:00`)
      const endTime = new Date(`1970-01-01T${slot.end_time}:00`)
      
      if (startTime >= endTime) {
        return NextResponse.json({ 
          error: `Invalid time range for ${slot.day_of_week}: start time must be before end time` 
        }, { status: 400 })
      }
    }

    // Check for conflicts with existing time slots
    if (create_time_slots) {
      const { data: existingSlots, error: conflictError } = await supabase
        .from('time_slots')
        .select('*')
        .eq('teacher_id', user.id)
        .eq('is_available', true)
      
      if (conflictError) {
        console.error('❌ Conflict check error:', conflictError)
        return NextResponse.json({ 
          error: 'Failed to check for conflicts',
          details: conflictError.message
        }, { status: 500 })
      }

      // Check for time overlaps
      for (const newSlot of slots) {
        const startTime = new Date(`1970-01-01T${newSlot.start_time}:00`)
        const endTime = new Date(`1970-01-01T${newSlot.end_time}:00`)
        
        const hasConflict = existingSlots?.some(existing => {
          if (existing.day_of_week !== newSlot.day_of_week) return false
          
          const existingStart = new Date(`1970-01-01T${existing.start_time}:00`)
          const existingEnd = new Date(`1970-01-01T${existing.end_time}:00`)
          
          return (
            (startTime >= existingStart && startTime < existingEnd) ||
            (endTime > existingStart && endTime <= existingEnd) ||
            (startTime <= existingStart && endTime >= existingEnd)
          )
        })

        if (hasConflict) {
          return NextResponse.json({ 
            error: `Time slot conflicts with existing availability: ${newSlot.day_of_week} ${newSlot.start_time}-${newSlot.end_time}`,
            code: 'TIME_CONFLICT'
          }, { status: 409 })
        }
      }
    }

    const results = {
      time_slots_created: 0,
      schedule_slots_created: 0,
      time_slots: [] as any[],
      schedule_slots: [] as any[],
      errors: [] as string[]
    }

    // Create time slots if requested
    if (create_time_slots) {
      for (const slot of slots) {
        try {
          const { data: timeSlot, error: createError } = await supabase
            .from('time_slots')
            .insert({
              teacher_id: user.id,
              day_of_week: slot.day_of_week,
              start_time: slot.start_time,
              end_time: slot.end_time,
              subject: slot.subject,
              duration_minutes: slot.duration_minutes,
              is_available: true,
              is_recurring: true
            })
            .select()
            .single()

          if (createError) {
            console.error('❌ Time slot create error:', createError)
            results.errors.push(`Failed to create time slot for ${slot.day_of_week}: ${createError.message}`)
          } else {
            results.time_slots.push(timeSlot)
            results.time_slots_created++
          }
        } catch (error) {
          console.error('❌ Time slot creation error:', error)
          results.errors.push(`Failed to create time slot for ${slot.day_of_week}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
    }

    // Create schedule slots if requested
    if (create_schedule_slots) {
      // Determine start date
      let currentStartDate: Date
      if (start_date) {
        currentStartDate = new Date(start_date)
      } else {
        currentStartDate = new Date()
        currentStartDate.setDate(currentStartDate.getDate() + 1) // Start from tomorrow
      }

      // Helper function to get day number (0 = Sunday, 1 = Monday, etc.)
      const getDayNumber = (dayName: string): number => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        return days.indexOf(dayName)
      }

      for (const slot of slots) {
        const dayNumber = getDayNumber(slot.day_of_week)
        
        // Find the first occurrence of this day of week from start date
        let slotDate = new Date(currentStartDate)
        const dayDiff = (dayNumber - slotDate.getDay() + 7) % 7
        slotDate.setDate(slotDate.getDate() + dayDiff)
        
        // Create slots for the specified number of weeks
        for (let week = 0; week < weeks; week++) {
          try {
            const { data: scheduleSlot, error: createError } = await supabase
              .from('schedule_slots')
              .insert({
                teacher_id: user.id,
                date: slotDate.toISOString().split('T')[0],
                start_time: slot.start_time,
                end_time: slot.end_time,
                duration_minutes: slot.duration_minutes,
                subject: slot.subject,
                status: 'available',
                is_recurring: true
              })
              .select()
              .single()

            if (createError) {
              console.error('❌ Schedule slot create error:', createError)
              results.errors.push(`Failed to create schedule slot for ${slot.day_of_week} ${slotDate.toISOString().split('T')[0]}: ${createError.message}`)
            } else {
              results.schedule_slots.push(scheduleSlot)
              results.schedule_slots_created++
            }
          } catch (error) {
            console.error('❌ Schedule slot creation error:', error)
            results.errors.push(`Failed to create schedule slot for ${slot.day_of_week} ${slotDate.toISOString().split('T')[0]}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
          
          // Move to next week
          slotDate.setDate(slotDate.getDate() + 7)
        }
      }
    }

    console.log('✅ Bulk creation completed:', results)

    return NextResponse.json({
      success: true,
      message: `Created ${results.time_slots_created} time slots and ${results.schedule_slots_created} schedule slots`,
      results
    })
  } catch (error) {
    console.error('❌ Bulk create error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}