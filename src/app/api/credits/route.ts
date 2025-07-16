// src/app/api/credits/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/types/database'

type SupabaseClient = ReturnType<typeof createRouteHandlerClient<Database>>

interface CreditTransaction {
  id: string
  credit_account_id: string
  transaction_type: 'purchase' | 'deduction' | 'adjustment' | 'refund'
  hours_amount: number
  balance_after: number
  description: string
  reference_id: string | null
  reference_type: 'payment' | 'class_log' | 'manual_adjustment' | 'system' | null
  performed_by: string | null
  created_at: string | null
}

interface CreditAccount {
  id: string
  parent_id: string | null
  teacher_id: string | null
  student_id: string | null
  balance_hours: number
  total_purchased: number
  total_used: number
  created_at: string
  updated_at: string
  rate_per_hour: number | null
  subject: string | null
  notes: string | null
  is_active: boolean
}

// GET endpoint to fetch credit information and transactions
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }

    // Get user role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('student_id')
    
    // Fetch credit accounts based on role
    let creditAccounts: CreditAccount[] = []
    
    if (profile.role === 'teacher') {
      // For teachers, get all credit accounts they manage
      const { data, error } = await supabase
        .from('credits')
        .select('*')
        .eq('teacher_id', user.id)
        .eq('is_active', true)
        
      if (error) {
        return NextResponse.json({ error: 'Failed to fetch credit accounts' }, { status: 500 })
      }
      
      creditAccounts = data || []
    } else if (profile.role === 'parent') {
      // For parents, get credit accounts for their children
      const { data: children, error: childrenError } = await supabase
        .from('profiles')
        .select('id')
        .eq('parent_id', user.id)
        .eq('role', 'student')
        
      if (childrenError) {
        return NextResponse.json({ error: 'Failed to fetch children' }, { status: 500 })
      }
      
      if (children && children.length > 0) {
        const childIds = children.map(child => child.id)
        
        const { data, error } = await supabase
          .from('credits')
          .select('*')
          .in('student_id', childIds)
          .eq('is_active', true)
          
        if (error) {
          return NextResponse.json({ error: 'Failed to fetch credit accounts' }, { status: 500 })
        }
        
        creditAccounts = data || []
      }
    } else if (profile.role === 'student') {
      // For students, get their own credit accounts
      const { data, error } = await supabase
        .from('credits')
        .select('*')
        .eq('student_id', user.id)
        .eq('is_active', true)
        
      if (error) {
        return NextResponse.json({ error: 'Failed to fetch credit accounts' }, { status: 500 })
      }
      
      creditAccounts = data || []
    }

    // Fetch transactions for the specified student or all accounts
    let transactions: CreditTransaction[] = []
    
    if (studentId) {
      // Get credit account for specific student
      const { data: studentAccount, error: accountError } = await supabase
        .from('credits')
        .select('id')
        .eq('student_id', studentId)
        .eq('is_active', true)
        .single()
        
      if (accountError || !studentAccount) {
        return NextResponse.json({ error: 'Credit account not found for student' }, { status: 404 })
      }
      
      // Get transactions for this account
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('credit_account_id', studentAccount.id)
        .order('created_at', { ascending: false })
        .limit(50)
        
      if (error) {
        return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
      }
      
      transactions = data || []
    } else if (creditAccounts.length > 0) {
      // Get transactions for all accounts
      const accountIds = creditAccounts.map(account => account.id)
      
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .in('credit_account_id', accountIds)
        .order('created_at', { ascending: false })
        .limit(50)
        
      if (error) {
        return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
      }
      
      transactions = data || []
    }

    // Return credit accounts and transactions
    return NextResponse.json({
      success: true,
      creditAccounts,
      transactions
    })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST endpoint for credit management
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }

    // Get user role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Only teachers can manage credits
    if (profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can manage credits' }, { status: 403 })
    }

    const body = await request.json()
    const { action, studentId, hours, description, referenceId, referenceType } = body

    if (!action || !studentId || !hours) {
      return NextResponse.json({ 
        error: 'Missing required fields: action, studentId, and hours are required' 
      }, { status: 400 })
    }

    // Get credit account for the student
    const { data: creditAccount, error: accountError } = await supabase
      .from('credits')
      .select('*')
      .eq('student_id', studentId)
      .eq('teacher_id', user.id)
      .eq('is_active', true)
      .single()

    if (accountError) {
      // If account doesn't exist, create one for purchase action
      if (action === 'purchase') {
        const { data: newAccount, error: createError } = await supabase
          .from('credits')
          .insert({
            student_id: studentId,
            teacher_id: user.id,
            balance_hours: 0, // Will be updated after transaction
            total_purchased: 0, // Will be updated after transaction
            total_used: 0,
            is_active: true
          })
          .select()
          .single()

        if (createError || !newAccount) {
          return NextResponse.json({ 
            error: 'Failed to create credit account',
            details: createError?.message
          }, { status: 500 })
        }

        // Use the newly created account
        return await handleCreditTransaction(
          supabase, 
          newAccount, 
          action, 
          hours, 
          description || 'Initial credit purchase', 
          user.id,
          referenceId,
          referenceType
        )
      } else {
        return NextResponse.json({ error: 'Credit account not found for student' }, { status: 404 })
      }
    }

    // Handle the credit transaction
    return await handleCreditTransaction(
      supabase, 
      creditAccount, 
      action, 
      hours, 
      description || `Credit ${action}`, 
      user.id,
      referenceId,
      referenceType
    )
  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function handleCreditTransaction(
  supabase: SupabaseClient,
  creditAccount: CreditAccount,
  action: string,
  hours: number,
  description: string,
  performedBy: string,
  referenceId?: string,
  referenceType?: string
) {
  // Validate action
  if (!['purchase', 'deduction', 'adjustment', 'refund'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  // Validate hours
  if (hours <= 0) {
    return NextResponse.json({ error: 'Hours must be greater than 0' }, { status: 400 })
  }

  // Calculate new balance and totals
  let balanceHours = creditAccount.balance_hours || 0
  let totalPurchased = creditAccount.total_purchased || 0
  let totalUsed = creditAccount.total_used || 0
  
  switch (action) {
    case 'purchase':
      balanceHours += hours
      totalPurchased += hours
      break
    case 'deduction':
      if (balanceHours < hours) {
        return NextResponse.json({ 
          error: 'Insufficient credit balance',
          currentBalance: balanceHours,
          requested: hours
        }, { status: 400 })
      }
      balanceHours -= hours
      totalUsed += hours
      break
    case 'adjustment':
      balanceHours += hours // Can be negative for reduction
      break
    case 'refund':
      balanceHours += hours
      totalUsed -= hours
      if (totalUsed < 0) totalUsed = 0 // Ensure total used doesn't go negative
      break
  }

  // Start a transaction
  const { data, error } = await supabase.rpc('manage_credit_transaction', {
    p_credit_account_id: creditAccount.id,
    p_transaction_type: action,
    p_hours_amount: hours,
    p_description: description,
    p_reference_id: referenceId || null,
    p_reference_type: referenceType || null,
    p_performed_by: performedBy
  })

  if (error) {
    return NextResponse.json({ 
      error: 'Failed to process credit transaction',
      details: error.message
    }, { status: 500 })
  }

  // Return success response
  return NextResponse.json({
    success: true,
    message: `Successfully processed ${action} of ${hours} hours`,
    transaction: data,
    newBalance: balanceHours
  })
}