// src/app/api/payments/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Fetching profile for user:', user.id);

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, upi_id, qr_code_url, full_name, email')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return NextResponse.json({ 
        error: 'Failed to fetch profile', 
        details: profileError.message 
      }, { status: 500 })
    }

    if (!profile) {
      console.error('No profile found for user:', user.id);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    console.log('Profile found:', profile);

    // Initialize response data
    const responseData = {
      profile,
      payments: [] as any[]
    };

    // Fetch payments based on user role
    if (profile.role === 'teacher') {
      try {
        console.log('Fetching payments for teacher...');
        
        // For teachers, get payments from their classes
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select(`
            id,
            student_id,
            class_id,
            amount,
            status,
            payment_date,
            due_date,
            month_year,
            notes,
            created_at,
            profiles!payments_student_id_fkey(full_name, email),
            classes(name, subject)
          `)
          .order('created_at', { ascending: false })
          .limit(20)

        if (paymentsError) {
          console.error('Payments fetch error:', paymentsError);
          responseData.payments = [];
        } else {
          console.log('Payments found:', payments?.length || 0);
          responseData.payments = payments || [];
        }
      } catch (paymentsErr) {
        console.error('Payments fetch exception:', paymentsErr);
        responseData.payments = [];
      }
    } else if (profile.role === 'parent') {
      try {
        console.log('Fetching payments for parent...');
        
        // For parents, get payments for their children
        const { data: children, error: childrenError } = await supabase
          .from('profiles')
          .select('id')
          .eq('parent_id', user.id)
          .eq('role', 'student')

        if (!childrenError && children && children.length > 0) {
          const childIds = children.map(child => child.id);
          
          const { data: payments, error: paymentsError } = await supabase
            .from('payments')
            .select(`
              id,
              student_id,
              class_id,
              amount,
              status,
              payment_date,
              due_date,
              month_year,
              notes,
              created_at,
              profiles!payments_student_id_fkey(full_name, email),
              classes(name, subject)
            `)
            .in('student_id', childIds)
            .order('created_at', { ascending: false })
            .limit(20)

          if (!paymentsError) {
            responseData.payments = payments || [];
          }
        }
      } catch (paymentsErr) {
        console.error('Parent payments fetch exception:', paymentsErr);
        responseData.payments = [];
      }
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Payments API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, ...data } = body

    console.log('Payment API POST:', action, data);

    switch (action) {
      case 'save_upi':
        return await handleUpiSave(supabase, user.id, data)
      case 'award_credits':
        return await handleAwardCredits(supabase, user.id, data)
      case 'create_payment':
        return await handleCreatePayment(supabase, user.id, data)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Payments POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleUpiSave(supabase: any, userId: string, data: any) {
  const { upi_id } = data

  console.log('Saving UPI ID for user:', userId, 'UPI:', upi_id);

  const { error } = await supabase
    .from('profiles')
    .update({ upi_id })
    .eq('id', userId)

  if (error) {
    console.error('UPI save error:', error);
    return NextResponse.json({ error: 'Failed to save UPI ID' }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'UPI ID saved successfully' })
}

async function handleAwardCredits(supabase: any, teacherId: string, data: any) {
  const { parent_email, credit_hours, payment_amount, payment_note } = data

  console.log('Creating payment record:', { parent_email, credit_hours, payment_amount });

  // Find parent by email
  const { data: parent, error: parentError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', parent_email)
    .eq('role', 'parent')
    .single()

  if (parentError || !parent) {
    console.error('Parent lookup error:', parentError);
    return NextResponse.json({ error: 'Parent not found' }, { status: 404 })
  }

  // Get parent's children (students)
  const { data: children, error: childrenError } = await supabase
    .from('profiles')
    .select('id')
    .eq('parent_id', parent.id)
    .eq('role', 'student')

  if (childrenError || !children || children.length === 0) {
    console.error('Children lookup error:', childrenError);
    return NextResponse.json({ error: 'No students found for this parent' }, { status: 404 })
  }

  // For now, use the first child (you might want to modify this logic)
  const studentId = children[0].id;

  // Create payment record
  const currentDate = new Date();
  const monthYear = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  const { error: paymentError } = await supabase
    .from('payments')
    .insert({
      student_id: studentId,
      amount: parseFloat(payment_amount),
      status: 'paid',
      payment_method: 'UPI',
      payment_date: currentDate.toISOString().split('T')[0],
      due_date: currentDate.toISOString().split('T')[0],
      month_year: monthYear,
      notes: `${credit_hours} hours credited - ${payment_note || 'Payment confirmed by teacher'}`
    })

  if (paymentError) {
    console.error('Payment insert error:', paymentError);
    return NextResponse.json({ error: 'Failed to create payment record' }, { status: 500 })
  }

  return NextResponse.json({ 
    success: true, 
    message: `Successfully recorded payment of ₹${payment_amount} for ${parent_email}` 
  })
}

async function handleCreatePayment(supabase: any, userId: string, data: any) {
  const { student_id, class_id, amount, due_date, month_year, notes } = data

  const { error } = await supabase
    .from('payments')
    .insert({
      student_id,
      class_id,
      amount: parseFloat(amount),
      due_date,
      month_year,
      notes
    })

  if (error) {
    console.error('Payment creation error:', error);
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Payment created successfully' })
}