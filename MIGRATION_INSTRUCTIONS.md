# Migration Instructions for Credit Deduction System

## Overview
Before implementing task 5, the following database migrations need to be applied to add payment tracking functionality to the class logging system.

## How to Apply Migrations

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `scripts/migration-commands.sql`
4. Execute the SQL commands

### Option 2: Supabase CLI (if available)
```bash
supabase db push
```

### Option 3: Manual Application
Run each migration file individually in your database:
1. `supabase/migrations/20250121000001_add_payment_tracking_to_class_logs.sql`
2. `supabase/migrations/20250121000002_create_class_credit_deduction_function.sql`
3. `supabase/migrations/20250121000003_update_class_completion_trigger.sql`

## What These Migrations Do

### Migration 1: Add Payment Tracking Fields
- Adds `credits_deducted`, `is_paid`, `payment_status`, and `student_id` columns to `class_logs` table
- Creates indexes for better query performance
- Adds triggers to automatically populate `student_id` from `enrollment_id`

### Migration 2: Create Credit Deduction Functions
- `process_class_credit_deduction()` - Main function to handle automatic credit deduction
- `preview_class_credit_deduction()` - Preview function to test deduction scenarios
- Handles all edge cases: insufficient balance, no credit account, double deduction prevention

### Migration 3: Update Class Completion Trigger
- Updates the existing class completion trigger to use new credit deduction functions
- Automatically processes credit deduction when classes are marked as completed
- Provides proper error handling and fallback behavior

## Verification

After applying migrations, run this test to verify everything is working:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_url SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/test-credit-deduction-simple.js
```

Expected output should show:
- ✅ New columns exist in class_logs table
- ✅ Credit deduction functions are available
- ✅ Class completion trigger is active

## Next Steps

Once migrations are applied successfully, you can proceed with:
- Task 5: Add payment status display across interfaces
- Task 6: Implement payment reminder system
- Task 7: Create parent credit balance view
- And so on...

## Rollback (if needed)

If you need to rollback these changes:
```sql
-- Remove new columns
ALTER TABLE public.class_logs 
DROP COLUMN IF EXISTS credits_deducted,
DROP COLUMN IF EXISTS is_paid,
DROP COLUMN IF EXISTS payment_status,
DROP COLUMN IF EXISTS student_id;

-- Remove functions
DROP FUNCTION IF EXISTS public.process_class_credit_deduction(UUID);
DROP FUNCTION IF EXISTS public.preview_class_credit_deduction(UUID);

-- Restore original trigger (if you have the original function)
-- You would need to restore the original handle_class_completion function
```

## Important Notes

1. **Backup First**: Always backup your database before applying migrations
2. **Test Environment**: Apply to a test environment first if possible
3. **Existing Data**: The migrations are designed to be safe for existing data
4. **Dependencies**: These migrations depend on existing `credits` and `credit_transactions` tables
5. **Performance**: New indexes are created to maintain query performance

## Support

If you encounter issues:
1. Check the Supabase logs for detailed error messages
2. Verify that all prerequisite tables exist (`credits`, `credit_transactions`, `enrollments`, `profiles`)
3. Ensure you have the necessary database permissions
4. Run the verification queries in `scripts/migration-commands.sql`