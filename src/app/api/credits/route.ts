// src/app/api/credits/route.ts
import { NextRequest, NextResponse  } from 'next/server'
import { Database } from '@/types/database'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

type SupabaseClient = ReturnType<typeof createClient<Database>>

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
    const { supabase, user } = await createAuthenticatedSupabaseClient()
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }
    
    // Check if this is a function verification request
    const { searchParams } = new URL(request.url)
    const verifyFunction = searchParams.get('verify_function')
    
    if (verifyFunction === 'true') {
      console.log('🔍 Verifying credit transaction function')
      try {
        // Check if the function exists using our helper function
        const { data: checkResult, error: checkError  } = await supabase.rpc('check_credit_transaction_function')
        
        if (checkError) {
          console.error('❌ Function check error:', checkError)
          return NextResponse.json({ 
            error: 'Failed to verify function',
            details: checkError.message,
            code: checkError.code
          }, { status: 500 })
        }
        
        console.log('✅ Function check result:', checkResult)
        
        // Return the verification result
        return NextResponse.json({
          success: true,
          functionVerification: checkResult
        })
      } catch (verifyError) {
        console.error('❌ Function verification error:', verifyError)
        return NextResponse.json({ 
          error: 'Function verification failed',
          details: verifyError instanceof Error ? verifyError.message : 'Unknown error'
        }, { status: 500 })
      }
    }

    // Get user role
    const { data: profile, error: profileError  } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get query parameters
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
      const { data: children, error: childrenError  } = await supabase
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
      const { data: studentAccount, error: accountError  } = await supabase
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
    console.log('🔄 Credits API POST called')
    
    const { supabase, user } = await createAuthenticatedSupabaseClient()
    
    if (!user) {
      console.error('❌ Authentication error: No user found')
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }
    
    console.log('✅ User authenticated:', user.id)

    // Get user role
    const { data: profile, error: profileError  } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('❌ Profile error:', profileError)
      return NextResponse.json({ 
        error: 'Profile not found', 
        details: profileError?.message || 'No profile found for user',
        code: profileError?.code
      }, { status: 404 })
    }
    
    console.log('✅ User role:', profile.role)

    // Check if this is a test request
    let body;
    try {
      body = await request.json();
      console.log('📝 Request body:', JSON.stringify(body))
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError)
      return NextResponse.json({ 
        error: 'Invalid request body', 
        details: parseError instanceof Error ? parseError.message : 'Could not parse JSON body'
      }, { status: 400 })
    }
    
    // Check if this is a function verification test
    if (body.action === 'verify_function') {
      console.log('🔍 Verifying credit transaction function')
      
      // Only allow teachers or admins to verify functions
      if (profile.role !== 'teacher' && profile.role !== 'admin') {
        console.error('❌ Permission error: User cannot verify functions')
        return NextResponse.json({ error: 'Only teachers or admins can verify functions' }, { status: 403 })
      }
      
      try {
        // Check if the function exists using our helper function
        const { data: checkResult, error: checkError  } = await supabase.rpc('pg_get_function_result', {
          function_name: 'manage_credit_transaction'
        })
        
        if (checkError) {
          console.error('❌ Function check error:', checkError)
          return NextResponse.json({ 
            error: 'Failed to verify function',
            details: checkError.message,
            code: checkError.code
          }, { status: 500 })
        }
        
        console.log('✅ Function check result:', checkResult)
        
        // Return the verification result
        return NextResponse.json({
          success: true,
          functionVerification: checkResult
        })
      } catch (verifyError) {
        console.error('❌ Function verification error:', verifyError)
        return NextResponse.json({ 
          error: 'Function verification failed',
          details: verifyError instanceof Error ? verifyError.message : 'Unknown error'
        }, { status: 500 })
      }
    }

    // Only teachers can manage credits
    if (profile.role !== 'teacher') {
      console.error('❌ Permission error: User is not a teacher')
      return NextResponse.json({ error: 'Only teachers can manage credits' }, { status: 403 })
    }
    
    const { action, studentId, hours, description, referenceId, referenceType } = body

    if (!action || !studentId || !hours) {
      console.error('❌ Validation error: Missing required fields', { action, studentId, hours })
      return NextResponse.json({ 
        error: 'Missing required fields: action, studentId, and hours are required',
        providedFields: { action: !!action, studentId: !!studentId, hours: !!hours }
      }, { status: 400 })
    }
    
    console.log('✅ Validation passed. Action:', action, 'Student ID:', studentId, 'Hours:', hours)

    // Verify the student exists before proceeding
    const { data: studentExists, error: studentError  } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', studentId)
      .eq('role', 'student')
      .single();
      
    if (studentError || !studentExists) {
      console.error('❌ Student verification error:', studentError, 'Student ID:', studentId);
      return NextResponse.json({ 
        error: 'Student not found or is not a valid student account', 
        details: studentError?.message || 'No student found with this ID',
        code: studentError?.code
      }, { status: 404 });
    }
    
    console.log('✅ Student verified:', studentId);
    
    // Get credit account for the student
    const { data: creditAccount, error: accountError  } = await supabase
      .from('credits')
      .select('*')
      .eq('student_id', studentId)
      .eq('teacher_id', user.id)
      .eq('is_active', true)
      .single()

    if (accountError) {
      console.error('❌ Credit account error:', accountError, 'Student ID:', studentId, 'Teacher ID:', user.id)
      
      // If account doesn't exist, create one for purchase action
      if (action === 'purchase') {
        console.log('🔄 Creating new credit account for student:', studentId)
        
        // Check if there's an inactive account we can reactivate
        const { data: inactiveAccount, error: inactiveError  } = await supabase
          .from('credits')
          .select('*')
          .eq('student_id', studentId)
          .eq('teacher_id', user.id)
          .eq('is_active', false)
          .single();
          
        if (!inactiveError && inactiveAccount) {
          console.log('🔄 Reactivating existing credit account:', inactiveAccount.id);
          
          // Reactivate the account
          const { data: updatedAccount, error: updateError  } = await supabase
            .from('credits')
            .update({
              is_active: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', inactiveAccount.id)
            .select()
            .single();
            
          if (updateError || !updatedAccount) {
            console.error('❌ Failed to reactivate credit account:', updateError);
            return NextResponse.json({ 
              error: 'Failed to reactivate credit account',
              details: updateError?.message,
              code: updateError?.code
            }, { status: 500 });
          }
          
          console.log('✅ Credit account reactivated:', updatedAccount.id);
          
          // Use the reactivated account
          return await handleCreditTransaction(
            supabase, 
            updatedAccount, 
            action, 
            hours, 
            description || 'Credit purchase after reactivation', 
            user.id,
            referenceId,
            referenceType
          );
        }
        
        // Create a new account if no inactive account exists
        const { data: newAccount, error: createError  } = await supabase
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
          console.error('❌ Failed to create credit account:', createError)
          return NextResponse.json({ 
            error: 'Failed to create credit account',
            details: createError?.message,
            code: createError?.code
          }, { status: 500 })
        }

        console.log('✅ New credit account created:', newAccount.id)
        
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
        return NextResponse.json({ 
          error: 'Credit account not found for student', 
          details: accountError.message,
          code: accountError.code
        }, { status: 404 })
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
  try {
    console.log('🔄 Starting credit transaction handling')
    console.log('📊 Credit account:', JSON.stringify(creditAccount))
    
    // Validate credit account
    if (!creditAccount || !creditAccount.id) {
      console.error('❌ Invalid credit account:', creditAccount)
      return NextResponse.json({ 
        error: 'Invalid credit account', 
        details: 'Credit account is missing or has no ID'
      }, { status: 400 })
    }
    
    // Validate action
    if (!['purchase', 'deduction', 'adjustment', 'refund'].includes(action)) {
      console.error('❌ Invalid action:', action)
      return NextResponse.json({ 
        error: 'Invalid action', 
        details: `Action must be one of: purchase, deduction, adjustment, refund. Received: ${action}`
      }, { status: 400 })
    }

    // Validate hours
    if (typeof hours !== 'number') {
      console.error('❌ Hours is not a number:', hours)
      return NextResponse.json({ 
        error: 'Hours must be a number', 
        details: `Received hours of type: ${typeof hours}, value: ${hours}`
      }, { status: 400 })
    }
    
    if (hours <= 0) {
      console.error('❌ Invalid hours amount:', hours)
      return NextResponse.json({ 
        error: 'Hours must be greater than 0', 
        details: `Received: ${hours}`
      }, { status: 400 })
    }

    // Calculate new balance and totals
    let balanceHours = creditAccount.balance_hours || 0
    let totalPurchased = creditAccount.total_purchased || 0
    let totalUsed = creditAccount.total_used || 0
    
    console.log('📈 Current balance:', balanceHours, 'Total purchased:', totalPurchased, 'Total used:', totalUsed)
    
    switch (action) {
      case 'purchase':
        balanceHours += hours
        totalPurchased += hours
        break
      case 'deduction':
        if (balanceHours < hours) {
          console.error('❌ Insufficient balance:', balanceHours, 'Requested:', hours)
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
    
    console.log('📊 New balance:', balanceHours, 'New total purchased:', totalPurchased, 'New total used:', totalUsed)
    
    // Prepare parameters for RPC call
    const rpcParams = {
      p_credit_account_id: creditAccount.id,
      p_transaction_type: action,
      p_hours_amount: hours,
      p_description: description || `Credit ${action}`,
      p_reference_id: referenceId || null,
      p_reference_type: referenceType || null,
      p_performed_by: performedBy
    };
    
    console.log('🔄 Calling manage_credit_transaction RPC function with parameters:', JSON.stringify(rpcParams))

    // Check if the function exists by querying available functions
    try {
      const { data: functions, error: funcError  } = await supabase
        .rpc('pg_get_function_result', { 
          function_name: 'manage_credit_transaction'
        });
      
      if (funcError) {
        console.error('❌ Error checking function existence:', funcError);
        // Continue anyway, as this is just a diagnostic check
      } else {
        console.log('✅ Function check result:', functions);
      }
    } catch (funcCheckError) {
      console.error('❌ Exception checking function:', funcCheckError);
      // Continue anyway, as this is just a diagnostic check
    }

    // Start a transaction
    console.time('rpc_call_duration');
    const { data, error } = await supabase.rpc('manage_credit_transaction', rpcParams);
    console.timeEnd('rpc_call_duration');

    if (error) {
      console.error('❌ Transaction error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      
      // Check if this is a database constraint error
      if (error.code === '23503') { // Foreign key violation
        return NextResponse.json({ 
          error: 'Database constraint error',
          details: 'A referenced record does not exist',
          dbError: error.message,
          code: error.code
        }, { status: 400 })
      }
      
      // Check if this is a function not found error
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'Database function not found',
          details: 'The manage_credit_transaction function does not exist or is not accessible',
          dbError: error.message,
          code: error.code
        }, { status: 500 })
      }
      
      return NextResponse.json({ 
        error: 'Failed to process credit transaction',
        details: error.message,
        code: error.code,
        hint: error.hint || 'Check database logs for more information'
      }, { status: 500 })
    }

    if (!data) {
      console.error('❌ Transaction returned no data');
      return NextResponse.json({ 
        error: 'Transaction returned no data',
        details: 'The database function executed but returned no result'
      }, { status: 500 })
    }

    console.log('✅ Transaction successful:', JSON.stringify(data))

    // Return success response
    return NextResponse.json({
      success: true,
      message: `Successfully processed ${action} of ${hours} hours`,
      transaction: data,
      newBalance: balanceHours
    })
  } catch (error) {
    console.error('💥 Unexpected error in handleCreditTransaction:', error);
    
    // Provide more detailed error information
    const errorDetails = error instanceof Error 
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : 'Unknown error type';
      
    console.error('Error details:', errorDetails);
    
    return NextResponse.json({ 
      error: 'Failed to process credit transaction',
      details: error instanceof Error ? error.message : 'Unknown error',
      errorType: error instanceof Error ? error.constructor.name : typeof error
    }, { status: 500 })
  }
}