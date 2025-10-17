// src/app/api/timeslots/conflicts/route.ts
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Validation schemas
const ConflictCheckSchema = z.object({
  slots: z.array(z.object({
    day_of_week: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
    start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    date: z.string().optional() // For specific date conflicts
  })),
  check_time_slots: z.boolean().default(true),
  check_schedule_slots: z.boolean().default(true),
  date_range: z.object({
    start_date: z.string(),
    end_date: z.string()
  }).optional()
})

const ConflictResolutionSchema = z.object({
  conflicts: z.array(z.object({
    type: z.enum(['time_overlap', 'booking_conflict', 'blocked_slot']),
    conflicting_slot_id: z.string().uuid(),
    proposed_slot: z.object({
      day_of_week: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
      start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      date: z.string().optional()
    })
  })),
  resolution_strategy: z.enum(['auto_adjust', 'suggest_alternatives', 'force_override']),
  adjustment_preferences: z.object({
    preferred_direction: z.enum(['earlier', 'later', 'any']).default('any'),
    max_adjustment_minutes: z.number().min(15).max(120).default(60),
    allow_day_change: z.boolean().default(false)
  }).optional()
})

// Helper function to check for time overlaps
function hasTimeOverlap(
  start1: string, end1: string,
  start2: string, end2: string
): boolean {
  const startTime1 = new Date(`1970-01-01T${start1}:00`)
  const endTime1 = new Date(`1970-01-01T${end1}:00`)
  const startTime2 = new Date(`1970-01-01T${start2}:00`)
  const endTime2 = new Date(`1970-01-01T${end2}:00`)
  
  return (
    (startTime1 >= startTime2 && startTime1 < endTime2) ||
    (endTime1 > startTime2 && endTime1 <= endTime2) ||
    (startTime1 <= startTime2 && endTime1 >= endTime2)
  )
}

// Helper function to suggest alternative times
function suggestAlternativeTimes(
  originalStart: string,
  originalEnd: string,
  conflictingSlots: any[],
  preferences: any,
  dayOfWeek?: string
): { time: string, score: number, reason: string }[] {
  const suggestions: { time: string, score: number, reason: string }[] = []
  const startTime = new Date(`1970-01-01T${originalStart}:00`)
  const endTime = new Date(`1970-01-01T${originalEnd}:00`)
  const duration = endTime.getTime() - startTime.getTime()
  
  const { preferred_direction, max_adjustment_minutes } = preferences
  
  // Try adjusting earlier
  if (preferred_direction === 'earlier' || preferred_direction === 'any') {
    for (let adjustment = 15; adjustment <= max_adjustment_minutes; adjustment += 15) {
      const newStart = new Date(startTime.getTime() - (adjustment * 60 * 1000))
      const newEnd = new Date(newStart.getTime() + duration)
      
      // Check if this time is valid (not before 6 AM)
      if (newStart.getHours() < 6) continue
      
      const newStartStr = newStart.toTimeString().slice(0, 5)
      const newEndStr = newEnd.toTimeString().slice(0, 5)
      
      // Check if this conflicts with existing slots
      const hasConflict = conflictingSlots.some(slot => 
        hasTimeOverlap(newStartStr, newEndStr, slot.start_time, slot.end_time)
      )
      
      if (!hasConflict) {
        const score = calculateTimeScore(newStartStr, originalStart, adjustment, 'earlier')
        suggestions.push({
          time: `${newStartStr}-${newEndStr}`,
          score,
          reason: `Moved ${adjustment} minutes earlier to avoid conflict`
        })
      }
    }
  }
  
  // Try adjusting later
  if (preferred_direction === 'later' || preferred_direction === 'any') {
    for (let adjustment = 15; adjustment <= max_adjustment_minutes; adjustment += 15) {
      const newStart = new Date(startTime.getTime() + (adjustment * 60 * 1000))
      const newEnd = new Date(newStart.getTime() + duration)
      
      // Check if this time is valid (not after 10 PM)
      if (newEnd.getHours() >= 22) continue
      
      const newStartStr = newStart.toTimeString().slice(0, 5)
      const newEndStr = newEnd.toTimeString().slice(0, 5)
      
      // Check if this conflicts with existing slots
      const hasConflict = conflictingSlots.some(slot => 
        hasTimeOverlap(newStartStr, newEndStr, slot.start_time, slot.end_time)
      )
      
      if (!hasConflict) {
        const score = calculateTimeScore(newStartStr, originalStart, adjustment, 'later')
        suggestions.push({
          time: `${newStartStr}-${newEndStr}`,
          score,
          reason: `Moved ${adjustment} minutes later to avoid conflict`
        })
      }
    }
  }
  
  // Try different days if allowed
  if (preferences.allow_day_change && dayOfWeek) {
    const alternativeDays = getAlternativeDays(dayOfWeek)
    for (const altDay of alternativeDays) {
      suggestions.push({
        time: `${originalStart}-${originalEnd}`,
        score: 50, // Lower score for day changes
        reason: `Same time on ${altDay} (day change)`
      })
    }
  }
  
  // Sort by score (higher is better) and return top suggestions
  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
}

// Helper function to calculate time preference score
function calculateTimeScore(newTime: string, originalTime: string, adjustment: number, direction: string): number {
  let score = 100 - adjustment // Base score decreases with larger adjustments
  
  // Bonus for popular time slots (9 AM - 5 PM)
  const hour = parseInt(newTime.split(':')[0])
  if (hour >= 9 && hour <= 17) {
    score += 20
  }
  
  // Penalty for very early or very late times
  if (hour < 8 || hour > 19) {
    score -= 15
  }
  
  // Slight preference for later times over earlier (less disruptive)
  if (direction === 'later') {
    score += 5
  }
  
  return Math.max(0, score)
}

// Helper function to get alternative days
function getAlternativeDays(currentDay: string): string[] {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const currentIndex = days.indexOf(currentDay)
  
  // Return adjacent days first, then others
  const alternatives = []
  if (currentIndex > 0) alternatives.push(days[currentIndex - 1])
  if (currentIndex < days.length - 1) alternatives.push(days[currentIndex + 1])
  
  // Add other weekdays
  for (const day of days) {
    if (day !== currentDay && !alternatives.includes(day) && days.indexOf(day) < 5) {
      alternatives.push(day)
    }
  }
  
  return alternatives.slice(0, 3)
}

// POST endpoint to check for conflicts
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Conflict Check API called')
    
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
    
    // Only teachers can check conflicts
    if (profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can check conflicts' }, { status: 403 })
    }

    const body = await request.json()
    console.log('📝 Conflict check body:', JSON.stringify(body))
    
    // Validate input
    const validationResult = ConflictCheckSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const { slots, check_time_slots, check_schedule_slots, date_range } = validationResult.data
    const conflicts = []

    for (const slot of slots) {
      const slotConflicts = {
        slot: slot,
        time_slot_conflicts: [] as any[],
        schedule_slot_conflicts: [] as any[],
        blocked_slot_conflicts: [] as any[]
      }

      // Check time_slots conflicts
      if (check_time_slots) {
        const { data: timeSlotConflicts, error: timeSlotError } = await supabase
          .from('time_slots')
          .select('*')
          .eq('teacher_id', user.id)
          .eq('day_of_week', slot.day_of_week)
          .eq('is_available', true)

        if (timeSlotError) {
          console.error('❌ Time slot conflict check error:', timeSlotError)
        } else if (timeSlotConflicts) {
          const conflicting = timeSlotConflicts.filter(existing => 
            hasTimeOverlap(slot.start_time, slot.end_time, existing.start_time, existing.end_time)
          )
          slotConflicts.time_slot_conflicts = conflicting
        }
      }

      // Check schedule_slots conflicts
      if (check_schedule_slots) {
        let scheduleQuery = supabase
          .from('schedule_slots')
          .select('*')
          .eq('teacher_id', user.id)
          .in('status', ['available', 'booked'])

        if (slot.date) {
          scheduleQuery = scheduleQuery.eq('date', slot.date)
        } else if (date_range) {
          scheduleQuery = scheduleQuery
            .gte('date', date_range.start_date)
            .lte('date', date_range.end_date)
        } else {
          // Default to next 4 weeks
          const fourWeeksFromNow = new Date()
          fourWeeksFromNow.setDate(fourWeeksFromNow.getDate() + 28)
          scheduleQuery = scheduleQuery
            .gte('date', new Date().toISOString().split('T')[0])
            .lte('date', fourWeeksFromNow.toISOString().split('T')[0])
        }

        const { data: scheduleSlotConflicts, error: scheduleSlotError } = await scheduleQuery

        if (scheduleSlotError) {
          console.error('❌ Schedule slot conflict check error:', scheduleSlotError)
        } else if (scheduleSlotConflicts) {
          const conflicting = scheduleSlotConflicts.filter(existing => 
            hasTimeOverlap(slot.start_time, slot.end_time, existing.start_time, existing.end_time)
          )
          slotConflicts.schedule_slot_conflicts = conflicting
        }
      }

      // Check blocked_slots conflicts
      const { data: blockedSlotConflicts, error: blockedSlotError } = await supabase
        .from('blocked_slots')
        .select('*')
        .eq('teacher_id', user.id)
        .or(`day_of_week.eq.${slot.day_of_week},date.eq.${slot.date || 'null'}`)

      if (blockedSlotError) {
        console.error('❌ Blocked slot conflict check error:', blockedSlotError)
      } else if (blockedSlotConflicts) {
        const conflicting = blockedSlotConflicts.filter(existing => 
          hasTimeOverlap(slot.start_time, slot.end_time, existing.start_time, existing.end_time)
        )
        slotConflicts.blocked_slot_conflicts = conflicting
      }

      // Only add to conflicts if there are actual conflicts
      if (slotConflicts.time_slot_conflicts.length > 0 || 
          slotConflicts.schedule_slot_conflicts.length > 0 || 
          slotConflicts.blocked_slot_conflicts.length > 0) {
        conflicts.push(slotConflicts)
      }
    }

    return NextResponse.json({
      success: true,
      has_conflicts: conflicts.length > 0,
      conflicts: conflicts,
      total_conflicts: conflicts.length
    })
  } catch (error) {
    console.error('❌ Conflict check error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// PUT endpoint for conflict resolution
export async function PUT(request: NextRequest) {
  try {
    console.log('🔄 Conflict Resolution API called')
    
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
    
    // Only teachers can resolve conflicts
    if (profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can resolve conflicts' }, { status: 403 })
    }

    const body = await request.json()
    console.log('📝 Conflict resolution body:', JSON.stringify(body))
    
    // Validate input
    const validationResult = ConflictResolutionSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const { conflicts, resolution_strategy, adjustment_preferences } = validationResult.data
    const resolutions = []

    for (const conflict of conflicts) {
      const resolution = {
        conflict: conflict,
        resolution_applied: false,
        suggestions: [] as string[],
        error: null as string | null
      }

      switch (resolution_strategy) {
        case 'suggest_alternatives':
          // Get existing slots for this day/date to avoid conflicts
          const { data: existingSlots } = await supabase
            .from('time_slots')
            .select('*')
            .eq('teacher_id', user.id)
            .eq('day_of_week', conflict.proposed_slot.day_of_week)
            .eq('is_available', true)

          if (existingSlots) {
            const suggestions = suggestAlternativeTimes(
              conflict.proposed_slot.start_time,
              conflict.proposed_slot.end_time,
              existingSlots,
              adjustment_preferences || { preferred_direction: 'any', max_adjustment_minutes: 60, allow_day_change: false },
              conflict.proposed_slot.day_of_week
            )
            resolution.suggestions = suggestions.map(s => `${s.time} (${s.reason})`)
          }
          break

        case 'auto_adjust':
          // Automatically adjust the time to avoid conflicts
          const { data: conflictingSlots } = await supabase
            .from('time_slots')
            .select('*')
            .eq('teacher_id', user.id)
            .eq('day_of_week', conflict.proposed_slot.day_of_week)
            .eq('is_available', true)

          if (conflictingSlots) {
            const suggestions = suggestAlternativeTimes(
              conflict.proposed_slot.start_time,
              conflict.proposed_slot.end_time,
              conflictingSlots,
              adjustment_preferences || { preferred_direction: 'any', max_adjustment_minutes: 60, allow_day_change: false },
              conflict.proposed_slot.day_of_week
            )

            if (suggestions.length > 0) {
              const bestSuggestion = suggestions[0]
              const [newStart, newEnd] = bestSuggestion.time.split('-')
              
              // Create the adjusted slot
              const { data: newSlot, error: createError } = await supabase
                .from('time_slots')
                .insert({
                  teacher_id: user.id,
                  day_of_week: conflict.proposed_slot.day_of_week,
                  start_time: newStart,
                  end_time: newEnd,
                  is_available: true,
                  is_recurring: false
                })
                .select()
                .single()

              if (createError) {
                resolution.error = `Failed to create adjusted slot: ${createError.message}`
              } else {
                resolution.resolution_applied = true
                resolution.suggestions = [`Created adjusted slot: ${newStart}-${newEnd} (${bestSuggestion.reason})`]
              }
            } else {
              resolution.error = 'No suitable alternative times found'
            }
          }
          break

        case 'force_override':
          // Force create the slot despite conflicts (with warning)
          const { data: forcedSlot, error: forceError } = await supabase
            .from('time_slots')
            .insert({
              teacher_id: user.id,
              day_of_week: conflict.proposed_slot.day_of_week,
              start_time: conflict.proposed_slot.start_time,
              end_time: conflict.proposed_slot.end_time,
              is_available: true,
              is_recurring: false
            })
            .select()
            .single()

          if (forceError) {
            resolution.error = `Failed to force create slot: ${forceError.message}`
          } else {
            resolution.resolution_applied = true
            resolution.suggestions = ['Slot created with conflicts (override applied)']
          }
          break

        default:
          resolution.error = 'Invalid resolution strategy'
      }

      resolutions.push(resolution)
    }

    return NextResponse.json({
      success: true,
      resolution_strategy: resolution_strategy,
      resolutions: resolutions,
      total_resolved: resolutions.filter(r => r.resolution_applied).length
    })
  } catch (error) {
    console.error('❌ Conflict resolution error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}