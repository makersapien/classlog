// src/app/api/payments/route.ts
import { createClient } from '@supabase/supabase-js'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse  } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

// Import your existing database types
import { Database } from '@/types/database'

type TypedSupabaseClient = SupabaseClient<Database>

// Simple types for the UPI + manual credit flow
interface ProfileData {
  id: string
  role: 'teacher' | 'parent' | 'student'
  upi_id: string | null
  qr_code_url: string | null  // base64 string
  full_name: string | null
  email: string
}

// Simple payment record for manual credits
interface PaymentRecord {
  id: string
  student_id: string
  amount: number
  status: 'paid'  // Always paid since teacher manually confirms
  payment_date: string
  month_year: string
  notes: string
  created_at: string
  profiles: {
    full_name: string | null
    email: string
  } | null
  classes: {
    name: string
    subject: string
  } | null
}

interface ResponseData {
  profile: ProfileData
  payments: PaymentRecord[]
}

export async function GET() {
  try {
    const { supabase, user } = await createAuthenticatedSupabaseClient()
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    console.log('Fetching profile for user:', user.id);

    // Get user profile - cast result to handle missing UPI fields
    const { data: rawProfile, error: profileError  } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return NextResponse.json({
        error: 'Failed to fetch profile',
        details: profileError.message
      }, { status: 500 })
    }

    if (!rawProfile) {
      console.error('No profile found for user:', user.id);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Safely extract profile data including UPI fields
    const profile: ProfileData = {
      id: rawProfile.id as string,
      role: rawProfile.role as 'teacher' | 'parent' | 'student',
      full_name: rawProfile.full_name as string | null,
      email: rawProfile.email as string,
      upi_id: (rawProfile as Record<string, unknown>).upi_id as string | null || null,
      qr_code_url: (rawProfile as Record<string, unknown>).qr_code_url as string | null || null
    }

    console.log('Profile found:', profile);

    // Initialize response data
    const responseData: ResponseData = {
      profile,
      payments: []
    };

    // Fetch payments based on user role
    if (profile.role === 'teacher') {
      try {
        console.log('Fetching payments for teacher...');

        // For teachers, get their manual payment records (simplified)
        const { data: rawPayments, error: paymentsError  } = await supabase
          .from('payments')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20)

        if (paymentsError) {
          console.error('Payments fetch error:', paymentsError);
          responseData.payments = [];
        } else {
          console.log('Payments found:', rawPayments?.length || 0);

          // Transform to simple format for manual credits
          responseData.payments = (rawPayments || []).map((payment: Record<string, unknown>) => ({
            id: payment.id as string,
            student_id: payment.student_id as string,
            amount: Number(payment.amount) || 0,
            status: 'paid' as const,
            payment_date: payment.payment_date as string || payment.created_at as string,
            month_year: payment.created_at ? new Date(payment.created_at as string).toISOString().slice(0, 7) : '',
            notes: `Manual credit award - Payment confirmed by teacher`,
            created_at: payment.created_at as string,
            profiles: null, // Will be populated by frontend if needed
            classes: null   // Will be populated by frontend if needed
          }));
        }
      } catch (paymentsErr) {
        console.error('Payments fetch exception:', paymentsErr);
        responseData.payments = [];
      }
    } else if (profile.role === 'parent') {
      try {
        console.log('Fetching payments for parent...');

        // For parents, get payments for their children
        const { data: children, error: childrenError  } = await supabase
          .from('profiles')
          .select('id')
          .eq('parent_id', user.id)
          .eq('role', 'student')

        if (!childrenError && children && children.length > 0) {
          const childIds = children.map(child => child.id);

          // For parents, get their children's payment records
          const { data: rawPayments, error: paymentsError  } = await supabase
            .from('payments')
            .select('*')
            .in('student_id', childIds)
            .order('created_at', { ascending: false })
            .limit(20)

          if (!paymentsError && rawPayments) {
            responseData.payments = rawPayments.map((payment: Record<string, unknown>) => ({
              id: payment.id as string,
              student_id: payment.student_id as string,
              amount: Number(payment.amount) || 0,
              status: 'paid' as const,
              payment_date: payment.payment_date as string || payment.created_at as string,
              month_year: payment.created_at ? new Date(payment.created_at as string).toISOString().slice(0, 7) : '',
              notes: `Payment received - Credit hours awarded`,
              created_at: payment.created_at as string,
              profiles: null,
              classes: null
            }));
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

interface PostRequestBody {
  action: 'save_upi' | 'award_credits'
  upi_id?: string
  qr_code_url?: string  // base64 string
  parent_email?: string
  credit_hours?: number
  payment_amount?: number
  payment_note?: string
  student_id?: string
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await createAuthenticatedSupabaseClient()
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json() as PostRequestBody
    const { action, ...data } = body

    console.log('Payment API POST:', action, data);

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

async function handleUpiSave(
  supabase: TypedSupabaseClient,
  userId: string,
  data: Partial<PostRequestBody>
) {
  const { upi_id, qr_code_url } = data

  if (!upi_id) {
    return NextResponse.json({ error: 'UPI ID is required' }, { status: 400 })
  }

  console.log('Saving UPI data for user:', userId);

  // Update both UPI ID and QR code (base64) if provided
  const updateData: Record<string, unknown> = { upi_id }
  if (qr_code_url) {
    updateData.qr_code_url = qr_code_url
  }

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId)

  if (error) {
    console.error('UPI save error:', error);
    return NextResponse.json({ error: 'Failed to save UPI data' }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'UPI data saved successfully' })
}

// Helper function to generate month_year identifier (exactly 7 characters)
function generateUniqueMonthYear(): string {
  const currentDate = new Date();
  // Format: YYYY-MM (exactly 7 chars)
  return currentDate.toISOString().slice(0, 7);
}

// Helper function to create admin Supabase client
function createAdminSupabaseClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
      }
    }
  );
}

// Helper function to create a payment record
async function createPaymentRecord(
  studentId: string,
  creditHours: number,
  paymentAmount: number,
  paymentNote: string | undefined,
  monthYearValue: string
) {
  console.log('Environment check:', {
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
  });

  try {
    const adminSupabase = createAdminSupabaseClient();
    const currentDate = new Date();

    // Prepare payment record with all required fields
    const paymentRecord = {
      student_id: studentId,
      class_id: null, // Use null for credit purchases without a specific class
      amount: paymentAmount.toString(),
      status: 'paid' as const, // Always paid since teacher manually confirms
      payment_date: currentDate.toISOString().split('T')[0],
      due_date: currentDate.toISOString().split('T')[0], // Required field
      month_year: monthYearValue,
      notes: paymentNote || `Credit purchase - ${creditHours} hours`
    };

    console.log('Creating payment record with data:', {
      ...paymentRecord,
      student_id_length: studentId.length,
    });

    const { data: payment, error: paymentError  } = await adminSupabase
      .from('payments')
      .insert(paymentRecord)
      .select()
      .single();

    if (paymentError) {
      console.error('Payment insert error:', paymentError);

      // Provide more specific error messages based on the error code
      let errorMessage = 'Failed to create payment record';
      let statusCode = 500;

      if (paymentError.code === '42501') {
        errorMessage = 'Permission denied: Row-level security policy violation';
        console.error('RLS policy violation. Verify service role key is being used correctly.');
      } else if (paymentError.code === '23505') {
        errorMessage = 'Duplicate record: A payment with these details already exists';
        statusCode = 409; // Conflict
      } else if (paymentError.code === '23503') {
        errorMessage = 'Foreign key violation: Referenced record does not exist';
        statusCode = 400; // Bad request
      } else if (paymentError.code === '22P02') {
        errorMessage = 'Invalid input: Check data types of all fields';
        statusCode = 400; // Bad request
      }

      return {
        error: {
          message: errorMessage,
          details: paymentError.message,
          code: paymentError.code,
          hint: paymentError.hint || null,
          status: statusCode
        }
      };
    }

    return { payment };
  } catch (error) {
    console.error('Error creating payment record:', error);
    return {
      error: {
        message: error instanceof Error && error.message.includes('Missing Supabase')
          ? 'Server configuration error: Missing required environment variables'
          : 'Failed to create payment record',
        details: error instanceof Error ? error.message : 'Unknown error',
        status: 500
      }
    };
  }
}

async function handleAwardCredits(
  supabase: TypedSupabaseClient,
  userId: string,
  data: Partial<PostRequestBody>
) {
  const { parent_email, credit_hours, payment_amount, payment_note, student_id } = data;

  if (!parent_email || !credit_hours || !payment_amount) {
    return NextResponse.json({
      error: 'Parent email, credit hours, and payment amount are required'
    }, { status: 400 });
  }

  console.log('Creating payment record:', { parent_email, credit_hours, payment_amount, student_id });

  try {
    // Generate unique month_year value to avoid constraint violations
    const monthYearValue = generateUniqueMonthYear();

    // Use provided student_id directly if available
    if (student_id) {
      console.log('Using provided student_id:', student_id);

      const result = await createPaymentRecord(
        student_id,
        credit_hours,
        payment_amount,
        payment_note,
        monthYearValue
      );

      if (result.error) {
        return NextResponse.json({
          error: result.error.message,
          details: result.error.details,
          code: result.error.code,
          hint: result.error.hint
        }, { status: result.error.status });
      }

      return NextResponse.json({
        success: true,
        message: `Successfully awarded ${credit_hours} hours (₹${payment_amount})`,
        payment: result.payment
      });
    }

    // If no student_id provided, find parent and then find their child
    console.log('No student_id provided, looking up parent by email:', parent_email);

    // Find parent by email
    const { data: parent, error: parentError  } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', parent_email)
      .eq('role', 'parent')
      .single();

    if (parentError || !parent) {
      console.error('Parent lookup error:', parentError);
      return NextResponse.json({
        error: 'Parent not found',
        details: parentError?.message
      }, { status: 404 });
    }

    // Get parent's children (students)
    const { data: children, error: childrenError  } = await supabase
      .from('profiles')
      .select('id')
      .eq('parent_id', parent.id)
      .eq('role', 'student');

    if (childrenError || !children || children.length === 0) {
      console.error('Children lookup error:', childrenError);
      return NextResponse.json({
        error: 'No students found for this parent'
      }, { status: 404 });
    }

    // Use the first child
    const childId = children[0].id;
    console.log('Using first child of parent:', childId);

    const result = await createPaymentRecord(
      childId,
      credit_hours,
      payment_amount,
      payment_note,
      monthYearValue
    );

    if (result.error) {
      return NextResponse.json({
        error: result.error.message,
        details: result.error.details,
        code: result.error.code,
        hint: result.error.hint
      }, { status: result.error.status });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully awarded ${credit_hours} hours (₹${payment_amount}) to ${parent_email}`,
      payment: result.payment
    });
  } catch (error) {
    console.error('Error in handleAwardCredits:', error);
    return NextResponse.json({
      error: 'Failed to process credit award',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}