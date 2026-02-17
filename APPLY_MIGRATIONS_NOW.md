# 🚨 URGENT: Apply Migrations Before Proceeding

## Status
The credit deduction migrations **MUST** be applied manually before Task 5 can be implemented.

## Quick Steps to Apply Migrations

### 1. Open Supabase Dashboard
- Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
- Select your project: `ptacvbijmjoteceybnod`

### 2. Open SQL Editor
- Click on "SQL Editor" in the left sidebar
- Click "New Query"

### 3. Copy and Execute Migration SQL
- Open the file: `scripts/migration-commands.sql`
- Copy ALL the contents (it's a combined migration script)
- Paste into the SQL Editor
- Click "Run" to execute

### 4. Verify Success
After running the SQL, you should see:
- ✅ New columns added to `class_logs` table
- ✅ New functions created for credit deduction
- ✅ Updated trigger for automatic credit deduction

### 5. Test the Migration
Run this command to verify everything is working:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://ptacvbijmjoteceybnod.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0YWN2YmlqbWpvdGVjZXlibm9kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTgxNzI5NywiZXhwIjoyMDY1MzkzMjk3fQ.U02ibbq0w_FmCJVnsfub7ct9xiAAFSNkiPLKUaaiZ1I node scripts/test-credit-deduction-simple.js
```

Expected output should show:
- ✅ New columns exist in class_logs table
- ✅ Credit deduction functions are available

## What These Migrations Do

1. **Add Payment Tracking Fields**: Adds `credits_deducted`, `is_paid`, `payment_status`, and `student_id` columns to `class_logs`
2. **Create Credit Functions**: Adds functions for automatic credit deduction when classes complete
3. **Update Trigger**: Modifies the class completion trigger to use the new credit deduction system

## After Migration is Applied

Once the migration is successfully applied, I can proceed with:
- ✅ Task 5: Add payment status display across interfaces
- Task 6: Implement payment reminder system
- Task 7: Create parent credit balance view

## Need Help?

If you encounter any issues:
1. Check the Supabase dashboard logs for error messages
2. Make sure you have admin permissions on the database
3. Try running the migration in smaller chunks if needed

---

**⚠️ IMPORTANT**: Task 5 implementation will fail without these migrations applied first!