// src/app/api/schedule-slots/[id]/book/route.ts
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

// POST endpoint to book a schedule slot
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔄 Book Schedule Slot API called for slot ID:', params.id)
    
    const { supabase, user } = await createAuthenticatedSupabaseClient()
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    console.log('✅ User authenticated:', user.id)

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
    
    console.log('✅ User role:', profile.role)

    // Only students and parents can book slots
    if (profile.role !== 'student' && profile.role !== 'parent') {
      console.error('❌ Permission error: User is not a student or parent')
      return NextResponse.json({ error: 'Only students and parents can book schedule slots' }, { status: 403 })
    }

    const slotId = params.id
    const body = await request.json()
    const { student_id } = body

    // Validate student ID
    let validStudentId = student_id
    
    // If no student ID is provided and the user is a student, use their ID
    if (!validStudentId && profile.role === 'student') {
      validStudentId = user.id
    }
    
    // If the user is a parent, verify that the student is their child
    if (profile.role === 'parent' && validStudentId) {
      const { data: child, error: childError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', validStudentId)
        .eq('parent_id', user.id)
        .single()
      
      if (childError || !child) {
        return NextResponse.json({ error: 'Invalid student ID' }, { status: 400 })
      }
    }
    
    if (!validStudentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 })
    }

    // Get the slot
    const { data: slot, error: slotError } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('id', slotId)
      .single()

    if (slotError || !slot) {
      console.error('❌ Slot error:', slotError)
      return NextResponse.json({ 
        error: 'Schedule slot not found', 
        details: slotError?.message || 'No slot found with this ID'
      }, { status: 404 })
    }

    console.log('✅ Found slot:', slot.id, 'Status:', slot.status)

    // Check if the slot is available
    if (slot.status !== 'available') {
      console.error('❌ Slot is not available. Current status:', slot.status)
      return NextResponse.json({ 
        error: 'Schedule slot is not available',
        currentStatus: slot.status
      }, { status: 400 })
    }
    
    // Validate that the slot is in the future
    const slotDate = new Date(`${slot.date}T${slot.start_time}`)
    const now = new Date()
    
    if (slotDate <= now) {
      console.error('❌ Slot is in the past or currently ongoing')
      return NextResponse.json({ 
        error: 'Cannot book a slot that is in the past or currently ongoing',
        slotDate: slotDate.toISOString(),
        currentTime: now.toISOString()
      }, { status: 400 })
    }
    
    // Check if the slot has reached maximum capacity
    if (slot.max_students && slot.max_students > 1) {
      const { count, error: countError } = await supabase
        .from('schedule_slots')
        .select('*', { count: 'exact', head: true })
        .eq('parent_slot_id', slot.id)
        .eq('status', 'booked')
      
      if (!countError && count !== null && count >= slot.max_students) {
        console.error('❌ Slot has reached maximum capacity:', count, '/', slot.max_students)
        return NextResponse.json({ 
          error: 'This slot has reached its maximum capacity',
          currentBookings: count,
          maxCapacity: slot.max_students
        }, { status: 400 })
      }
    }

    // Get the student's credit account
    const { data: creditAccount, error: creditError } = await supabase
      .from('credits')
      .select('*')
      .eq('student_id', validStudentId)
      .eq('teacher_id', slot.teacher_id)
      .eq('is_active', true)
      .single()

    if (creditError || !creditAccount) {
      console.error('❌ Credit account error:', creditError)
      
      // Check if there's an inactive account that could be reactivated
      const { data: inactiveAccount, error: inactiveError } = await supabase
        .from('credits')
        .select('*')
        .eq('student_id', validStudentId)
        .eq('teacher_id', slot.teacher_id)
        .eq('is_active', false)
        .single()
        
      if (!inactiveError && inactiveAccount) {
        return NextResponse.json({ 
          error: 'Credit account is inactive',
          details: 'You have an inactive credit account with this teacher. Please contact the teacher to reactivate it.',
          accountId: inactiveAccount.id
        }, { status: 400 })
      }
      
      return NextResponse.json({ 
        error: 'No active credit account found for this student',
        details: 'You need to purchase credits from this teacher before booking a slot.',
        studentId: validStudentId,
        teacherId: slot.teacher_id
      }, { status: 400 })
    }
    
    console.log('✅ Found credit account:', creditAccount.id, 'Balance:', creditAccount.balance_hours)

    // Check if the student has enough credits
    if (creditAccount.balance_hours < 1) {
      console.error('❌ Insufficient credits:', creditAccount.balance_hours)
      return NextResponse.json({ 
        error: 'Insufficient credits',
        currentBalance: creditAccount.balance_hours,
        required: 1,
        accountId: creditAccount.id
      }, { status: 400 })
    }

    // Start a transaction to book the slot and deduct credits
    console.log('🔄 Starting transaction to book slot with parameters:', {
      p_slot_id: slotId,
      p_student_id: validStudentId,
      p_credit_account_id: creditAccount.id
    })
    
    // Execute the transaction
    let bookingResult;
    
    try {
      const { data: transaction, error: transactionError } = await supabase.rpc('book_schedule_slot', {
        p_slot_id: slotId,
        p_student_id: validStudentId,
        p_credit_account_id: creditAccount.id
      })

      if (transactionError) {
        console.error('❌ Transaction error:', {
          message: transactionError.message,
          details: transactionError.details,
          hint: transactionError.hint,
          code: transactionError.code
        })
        
        // Check for specific error types
        if (transactionError.message.includes('Schedule slot is not available')) {
          return NextResponse.json({ 
            error: 'This slot has just been booked by someone else',
            details: 'The slot status changed while you were booking it',
            code: 'SLOT_ALREADY_BOOKED'
          }, { status: 409 }) // Conflict status code
        }
        
        if (transactionError.message.includes('Insufficient credits')) {
          return NextResponse.json({ 
            error: 'Your credit balance changed while booking',
            details: 'Your current balance is insufficient to book this slot',
            code: 'INSUFFICIENT_CREDITS'
          }, { status: 400 })
        }
        
        return NextResponse.json({ 
          error: 'Failed to book schedule slot',
          details: transactionError.message,
          code: transactionError.code || 'TRANSACTION_ERROR'
        }, { status: 500 })
      }
      
      if (!transaction) {
        console.error('❌ Transaction returned no data')
        return NextResponse.json({ 
          error: 'Failed to book schedule slot',
          details: 'The booking transaction did not return any data',
          code: 'NO_TRANSACTION_DATA'
        }, { status: 500 })
      }
      
      console.log('✅ Transaction successful:', JSON.stringify(transaction))
      bookingResult = transaction;
      
    } catch (txError) {
      console.error('💥 Unexpected error during transaction:', txError)
      return NextResponse.json({ 
        error: 'Failed to book schedule slot',
        details: txError instanceof Error ? txError.message : 'Unknown transaction error',
        code: 'TRANSACTION_EXCEPTION'
      }, { status: 500 })
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Schedule slot booked successfully',
      transaction: bookingResult
    })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}