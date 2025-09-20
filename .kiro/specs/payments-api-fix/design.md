# Design Document

## Overview

This design document outlines the approach to fix the payments API issues that are preventing teachers from awarding credits to students. The solution addresses two main problems:

1. Next.js cookie handling errors due to synchronous access of the cookies() function
2. Row-level security policy violations when inserting payment records in Supabase

## Architecture

The payments API is part of the Next.js application's API routes and interacts with a Supabase backend. The current architecture follows a standard Next.js API route pattern but has issues with cookie handling and database security policies.

### Current Flow:

1. Teacher initiates credit award from the TeacherDashboard component
2. Frontend sends a POST request to `/api/payments` with action "award_credits"
3. API creates a Supabase client using cookies
4. API attempts to insert a payment record using the client
5. Error occurs due to RLS policy violation and/or cookie handling

### Improved Flow:

1. Teacher initiates credit award from the TeacherDashboard component
2. Frontend sends a POST request to `/api/payments` with action "award_credits"
3. API properly awaits cookies() before creating a Supabase client
4. API creates a properly configured service role client to bypass RLS
5. API successfully inserts the payment record
6. API returns success response with payment details

## Components and Interfaces

### API Route Handler

The main component to modify is the `/api/payments` route handler. The key changes include:

1. Update cookie handling to use proper async patterns
2. Correctly configure the service role client to bypass RLS
3. Ensure all required fields for the payments table are provided

```typescript
// Updated function signature for proper cookie handling
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    // Properly await cookies before using them
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })
    
    // Rest of the function...
  }
}

// Updated function to properly use service role
async function handleAwardCredits(
  supabase: TypedSupabaseClient,
  cookieStore: ReadonlyRequestCookies,
  userId: string, 
  data: Partial<PostRequestBody>
) {
  // Create properly configured service role client
  const adminSupabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
      }
    }
  )
  
  // Rest of the function...
}
```

### Database Schema

The payments table has the following required fields that must be properly handled:

- `student_id`: UUID of the student
- `class_id`: UUID of the class (can be null for credit purchases)
- `amount`: String representing the payment amount
- `status`: String enum ('paid', 'pending', etc.)
- `payment_date`: Date of payment
- `due_date`: Due date for the payment
- `month_year`: String in format 'YYYY-MM' (must be unique per student/class)
- `notes`: Optional notes about the payment

## Data Models

The existing data models will remain unchanged. The key interfaces used in the payments API are:

```typescript
interface PostRequestBody {
  action: 'save_upi' | 'award_credits'
  upi_id?: string
  qr_code_url?: string
  parent_email?: string
  credit_hours?: number
  payment_amount?: number
  payment_note?: string
  student_id?: string
}

interface PaymentRecord {
  id: string
  student_id: string
  amount: number
  status: 'paid'
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
```

## Error Handling

The error handling will be improved to provide more detailed information about failures:

1. Specific error handling for cookie-related errors
2. Detailed logging for RLS policy violations
3. Clear error messages for missing required fields
4. Proper error responses with appropriate HTTP status codes

## Testing Strategy

The fix will be tested using the following approach:

1. Manual testing of the credit award flow from the TeacherDashboard
2. Verification of successful payment record creation in the database
3. Checking logs for any remaining errors
4. Testing with different user roles to ensure proper authorization

## Security Considerations

1. The service role key should only be used server-side and never exposed to the client
2. RLS bypass should only be used for specific operations that require it
3. User authentication should still be verified before performing any operations
4. Input validation should be thorough to prevent injection attacks