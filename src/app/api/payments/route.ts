// src/app/api/payments/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, upi_id, qr_code_url')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (profile.role === 'teacher') {
      // Get teacher's credit transactions
      const { data: credits, error: creditsError } = await supabase
        .from('credits')
        .select(`
          *,
          profiles!credits_user_id_fkey(full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(20)

      return NextResponse.json({ 
        profile,
        credits: credits || [],
        error: creditsError
      })
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Payments API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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

    switch (action) {
      case 'save_upi':
        return await handleUpiSave(supabase, user.id, data)
      case 'award_credits':
        return await handleAwardCredits(supabase, user.id, data)
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

  const { error } = await supabase
    .from('profiles')
    .update({ upi_id })
    .eq('id', userId)

  if (error) {
    return NextResponse.json({ error: 'Failed to save UPI ID' }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'UPI ID saved successfully' })
}

async function handleAwardCredits(supabase: any, teacherId: string, data: any) {
  const { parent_email, credit_hours, payment_amount, payment_note } = data

  // Find parent by email
  const { data: parent, error: parentError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', parent_email)
    .eq('role', 'parent')
    .single()

  if (parentError || !parent) {
    return NextResponse.json({ error: 'Parent not found' }, { status: 404 })
  }

  // Create credit transaction
  const { error: creditError } = await supabase
    .from('credits')
    .insert({
      user_id: parent.id,
      amount: parseFloat(payment_amount),
      transaction_type: 'purchase',
      description: `${credit_hours} hours credited - ${payment_note || 'Payment confirmed by teacher'}`
    })

  if (creditError) {
    return NextResponse.json({ error: 'Failed to award credits' }, { status: 500 })
  }

  return NextResponse.json({ 
    success: true, 
    message: `Successfully awarded ${credit_hours} hours to ${parent_email}` 
  })
}