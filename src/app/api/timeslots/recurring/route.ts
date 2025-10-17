// src/app/api/timeslots/recurring/route.ts
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

const BulkRecurringCreateSchema = z.object({
  slots: z.array(RecurringSlotSchema).min(1).max(20),
  weeks: z.number().min(1).max(52).default(4),
  start_date: z.string().optional(), // YYYY-MM-DD format
  create_time_slots: z.boolean().default(true),
  create_schedule_slots: z.boolean().default(true),
  preview_only: z.boolean().default(false) // For preview functionality
})

const RecurringModifySchema = z.object({
  time_slot_id: z.string().uuid(),
  action: z.enum(['update_series', 'update_single', 'delete_series', 'delete_single']),
  updates: z.object({
    day_of_week: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']).optional(),
    start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    subject: z.string().optional(),
    duration_minutes: z.number().min(15).max(480).optional(),
    is_available: z.boolean().optional()
  }).optional(),
  apply_from_date: z.string().optional(), // YYYY-MM-DD format - for partial series updates
  exception_dates: z.array(z.string()).optional() // Dates to exclude from recurring series
})

// Helper function to generate recurring dates
function generateRecurringDates(
  dayOfWeek: string,
  startDate: Date,
  weeks: number,
  exceptionDates: string[] = []
): string[] {
  const dates: string[] = []
  const dayNumber = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(dayOfWeek)
  
  // Find the first occurrence of this day of week from start date
  let currentDate = new Date(startDate)
  const dayDiff = (dayNumber - currentDate.getDay() + 7) % 7
  currentDate.setDate(currentDate.getDate() + dayDiff)
  
  // Generate dates for the specified number of weeks
  for (let week = 0; week < weeks; week++) {
    const dateString = currentDate.toISOString().split('T')[0]
    if (!exceptionDates.includes(dateString)) {
      dates.push(dateString)
    }
    currentDate.setDate(currentDate.getDate() + 7)
  }
  
  return dates
}

// Helper function to check for conflicts
async function checkRecurringConflicts(
  supabase: any,
  teacherId: string,
  slots: any[],
  dates: string[]
) {
  const conflicts = []
  
  for (const slot of slots) {
    // Check time_slots conflicts
    const { data: timeSlotConflicts } = await supabase
      .from('time_slots')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('day_of_week', slot.day_of_week)
      .eq('is_available', true)
    
    if (timeSlotConflicts?.length > 0) {
      const startTime = new Date(`1970-01-01T${slot.start_time}:00`)
      const endTime = new Date(`1970-01-01T${slot.end_time}:00`)
      
      const hasTimeConflict = timeSlotConflicts.some(existing => {
        const existingStart = new Date(`1970-01-01T${existing.start_time}:00`)
        const existingEnd = new Date(`1970-01-01T${existing.end_time}:00`)
        
        return (
          (startTime >= existingStart && startTime < existingEnd) ||
          (endTime > existingStart && endTime <= existingEnd) ||
          (startTime <= existingStart && endTime >= existingEnd)
        )
      })
      
      if (hasTimeConflict) {
        conflicts.push({
          type: 'time_slot',
          day_of_week: slot.day_of_week,
          time_range: `${slot.start_time}-${slot.end_time}`,
          conflicting_slots: timeSlotConflicts
        })
      }
    }
    
    // Check schedule_slots conflicts for specific dates
    for (const date of dates) {
      const { data: scheduleConflicts } = await supabase
        .from('schedule_slots')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('date', date)
        .in('status', ['available', 'booked'])
      
      if (scheduleConflicts?.length > 0) {
        const startTime = new Date(`1970-01-01T${slot.start_time}:00`)
        const endTime = new Date(`1970-01-01T${slot.end_time}:00`)
        
        const hasScheduleConflict = scheduleConflicts.some(existing => {
          const existingStart = new Date(`1970-01-01T${existing.start_time}:00`)
          const existingEnd = new Date(`1970-01-01T${existing.end_time}:00`)
          
          return (
            (startTime >= existingStart && startTime < existingEnd) ||
            (endTime > existingStart && endTime <= existingEnd) ||
            (startTime <= existingStart && endTime >= existingEnd)
          )
        })
        
        if (hasScheduleConflict) {
          conflicts.push({
            type: 'schedule_slot',
            date: date,
            day_of_week: slot.day_of_week,
            time_range: `${slot.start_time}-${slot.end_time}`,
            conflicting_slots: scheduleConflicts
          })
        }
      }
    }
  }
  
  return conflicts
}

// POST endpoint for bulk recurring slot creation with preview
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Recurring Slots API POST called')
    
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
    
    // Only teachers can create recurring slots
    if (profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can create recurring slots' }, { status: 403 })
    }

    const body = await request.json()
    console.log('📝 Recurring create body:', JSON.stringify(body))
    
    // Validate input
    const validationResult = BulkRecurringCreateSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const { slots, weeks, start_date, create_time_slots, create_schedule_slots, preview_only } = validationResult.data

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

    // Determine start date
    let currentStartDate: Date
    if (start_date) {
      currentStartDate = new Date(start_date)
    } else {
      currentStartDate = new Date()
      currentStartDate.setDate(currentStartDate.getDate() + 1) // Start from tomorrow
    }

    // Generate all dates for all slots
    const allDates: string[] = []
    const slotDateMap = new Map<string, string[]>()
    
    for (const slot of slots) {
      const dates = generateRecurringDates(slot.day_of_week, currentStartDate, weeks)
      slotDateMap.set(`${slot.day_of_week}-${slot.start_time}-${slot.end_time}`, dates)
      allDates.push(...dates)
    }

    // Check for conflicts
    const conflicts = await checkRecurringConflicts(supabase, user.id, slots, [...new Set(allDates)])

    // If preview only, return the preview data
    if (preview_only) {
      const preview = {
        slots_to_create: slots.length,
        weeks: weeks,
        start_date: currentStartDate.toISOString().split('T')[0],
        total_schedule_slots: allDates.length,
        conflicts: conflicts,
        slot_details: slots.map(slot => ({
          ...slot,
          dates: slotDateMap.get(`${slot.day_of_week}-${slot.start_time}-${slot.end_time}`) || []
        }))
      }
      
      return NextResponse.json({
        success: true,
        preview: preview,
        has_conflicts: conflicts.length > 0
      })
    }

    // If there are conflicts and not preview, return error
    if (conflicts.length > 0) {
      return NextResponse.json({
        error: 'Conflicts detected with existing slots',
        code: 'RECURRING_CONFLICTS',
        conflicts: conflicts
      }, { status: 409 })
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
              is_recurring: true,
              recurrence_end_date: new Date(currentStartDate.getTime() + (weeks * 7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
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
      for (const slot of slots) {
        const dates = slotDateMap.get(`${slot.day_of_week}-${slot.start_time}-${slot.end_time}`) || []
        
        for (const date of dates) {
          try {
            const { data: scheduleSlot, error: createError } = await supabase
              .from('schedule_slots')
              .insert({
                teacher_id: user.id,
                date: date,
                start_time: slot.start_time,
                end_time: slot.end_time,
                duration_minutes: slot.duration_minutes,
                subject: slot.subject,
                status: 'available',
                is_recurring: true,
                recurrence_type: 'weekly'
              })
              .select()
              .single()

            if (createError) {
              console.error('❌ Schedule slot create error:', createError)
              results.errors.push(`Failed to create schedule slot for ${slot.day_of_week} ${date}: ${createError.message}`)
            } else {
              results.schedule_slots.push(scheduleSlot)
              results.schedule_slots_created++
            }
          } catch (error) {
            console.error('❌ Schedule slot creation error:', error)
            results.errors.push(`Failed to create schedule slot for ${slot.day_of_week} ${date}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        }
      }
    }

    console.log('✅ Recurring creation completed:', results)

    return NextResponse.json({
      success: true,
      message: `Created ${results.time_slots_created} time slots and ${results.schedule_slots_created} schedule slots`,
      results
    })
  } catch (error) {
    console.error('❌ Recurring create error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// PUT endpoint for modifying recurring series
export async function PUT(request: NextRequest) {
  try {
    console.log('🔄 Recurring Slots API PUT called')
    
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
    
    // Only teachers can modify recurring slots
    if (profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can modify recurring slots' }, { status: 403 })
    }

    const body = await request.json()
    console.log('📝 Recurring modify body:', JSON.stringify(body))
    
    // Validate input
    const validationResult = RecurringModifySchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const { time_slot_id, action, updates, apply_from_date, exception_dates } = validationResult.data

    // Get the original time slot
    const { data: originalSlot, error: fetchError } = await supabase
      .from('time_slots')
      .select('*')
      .eq('id', time_slot_id)
      .eq('teacher_id', user.id)
      .single()

    if (fetchError) {
      console.error('❌ Fetch error:', fetchError)
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Time slot not found' }, { status: 404 })
      }
      return NextResponse.json({ 
        error: 'Failed to fetch time slot',
        details: fetchError.message
      }, { status: 500 })
    }

    const results = {
      time_slots_updated: 0,
      time_slots_deleted: 0,
      schedule_slots_updated: 0,
      schedule_slots_deleted: 0,
      errors: [] as string[]
    }

    switch (action) {
      case 'update_series':
        // Update the time slot template
        if (updates) {
          const { error: updateError } = await supabase
            .from('time_slots')
            .update(updates)
            .eq('id', time_slot_id)
            .eq('teacher_id', user.id)

          if (updateError) {
            results.errors.push(`Failed to update time slot: ${updateError.message}`)
          } else {
            results.time_slots_updated++
          }
        }

        // Update related schedule slots
        if (updates && (updates.start_time || updates.end_time || updates.subject || updates.duration_minutes)) {
          const updateData: any = {}
          if (updates.start_time) updateData.start_time = updates.start_time
          if (updates.end_time) updateData.end_time = updates.end_time
          if (updates.subject) updateData.subject = updates.subject
          if (updates.duration_minutes) updateData.duration_minutes = updates.duration_minutes

          let query = supabase
            .from('schedule_slots')
            .update(updateData)
            .eq('teacher_id', user.id)
            .eq('start_time', originalSlot.start_time)
            .eq('end_time', originalSlot.end_time)
            .eq('is_recurring', true)
            .gte('date', new Date().toISOString().split('T')[0])

          if (apply_from_date) {
            query = query.gte('date', apply_from_date)
          }

          const { error: scheduleUpdateError } = await query

          if (scheduleUpdateError) {
            results.errors.push(`Failed to update schedule slots: ${scheduleUpdateError.message}`)
          } else {
            results.schedule_slots_updated++
          }
        }
        break

      case 'update_single':
        // This would typically be handled by the individual slot update endpoint
        return NextResponse.json({ 
          error: 'Single slot updates should use the individual slot endpoint' 
        }, { status: 400 })

      case 'delete_series':
        // Delete the time slot template
        const { error: deleteTimeSlotError } = await supabase
          .from('time_slots')
          .delete()
          .eq('id', time_slot_id)
          .eq('teacher_id', user.id)

        if (deleteTimeSlotError) {
          results.errors.push(`Failed to delete time slot: ${deleteTimeSlotError.message}`)
        } else {
          results.time_slots_deleted++
        }

        // Delete related future schedule slots
        let deleteQuery = supabase
          .from('schedule_slots')
          .delete()
          .eq('teacher_id', user.id)
          .eq('start_time', originalSlot.start_time)
          .eq('end_time', originalSlot.end_time)
          .eq('is_recurring', true)
          .gte('date', new Date().toISOString().split('T')[0])
          .eq('status', 'available') // Only delete available slots, not booked ones

        if (apply_from_date) {
          deleteQuery = deleteQuery.gte('date', apply_from_date)
        }

        const { error: deleteScheduleError } = await deleteQuery

        if (deleteScheduleError) {
          results.errors.push(`Failed to delete schedule slots: ${deleteScheduleError.message}`)
        } else {
          results.schedule_slots_deleted++
        }
        break

      case 'delete_single':
        // This would typically be handled by the individual slot delete endpoint
        return NextResponse.json({ 
          error: 'Single slot deletions should use the individual slot endpoint' 
        }, { status: 400 })

      default:
        return NextResponse.json({ 
          error: 'Invalid action specified' 
        }, { status: 400 })
    }

    console.log('✅ Recurring modification completed:', results)

    return NextResponse.json({
      success: true,
      message: `Recurring series ${action} completed`,
      results
    })
  } catch (error) {
    console.error('❌ Recurring modify error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}