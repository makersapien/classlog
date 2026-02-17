-- Combined migration script for credit deduction system
-- Run these commands in your Supabase SQL editor or database console

-- ============================================================================
-- Migration 1: Add payment tracking fields to class_logs table
-- ============================================================================

-- Add payment tracking columns to class_logs table
ALTER TABLE public.class_logs 
ADD COLUMN IF NOT EXISTS credits_deducted DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'partial', 'unpaid'));

-- Add student_id column to class_logs for direct student reference (derived from enrollment_id)
ALTER TABLE public.class_logs 
ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_class_logs_payment_status ON public.class_logs(payment_status);
CREATE INDEX IF NOT EXISTS idx_class_logs_is_paid ON public.class_logs(is_paid);
CREATE INDEX IF NOT EXISTS idx_class_logs_student_id ON public.class_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_class_logs_credits_deducted ON public.class_logs(credits_deducted) WHERE credits_deducted > 0;

-- Create a function to populate student_id from enrollment_id for existing records
CREATE OR REPLACE FUNCTION populate_class_logs_student_id()
RETURNS INTEGER AS $
DECLARE
  v_updated_count INTEGER := 0;
BEGIN
  -- Update class_logs with student_id from enrollments table
  UPDATE public.class_logs cl
  SET student_id = e.student_id
  FROM public.enrollments e
  WHERE cl.enrollment_id = e.id
    AND cl.student_id IS NULL
    AND e.student_id IS NOT NULL;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN v_updated_count;
END;
$ LANGUAGE plpgsql;

-- Run the function to populate existing records
SELECT populate_class_logs_student_id();

-- Create a trigger to automatically set student_id when enrollment_id is set
CREATE OR REPLACE FUNCTION set_student_id_from_enrollment()
RETURNS TRIGGER AS $
BEGIN
  -- If enrollment_id is being set and student_id is null, populate it
  IF NEW.enrollment_id IS NOT NULL AND NEW.student_id IS NULL THEN
    SELECT student_id INTO NEW.student_id
    FROM public.enrollments
    WHERE id = NEW.enrollment_id;
  END IF;
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Create trigger for automatic student_id population
DROP TRIGGER IF EXISTS set_student_id_trigger ON public.class_logs;
CREATE TRIGGER set_student_id_trigger
  BEFORE INSERT OR UPDATE ON public.class_logs
  FOR EACH ROW
  EXECUTE FUNCTION set_student_id_from_enrollment();

-- Add comments for documentation
COMMENT ON COLUMN public.class_logs.credits_deducted IS 'Number of credit hours deducted for this class session';
COMMENT ON COLUMN public.class_logs.is_paid IS 'Whether this class session has been fully paid for';
COMMENT ON COLUMN public.class_logs.payment_status IS 'Payment status: paid (fully covered by credits), partial (partially covered), unpaid (no credits deducted)';
COMMENT ON COLUMN public.class_logs.student_id IS 'Direct reference to student profile, derived from enrollment_id';

-- ============================================================================
-- Migration 2: Create credit deduction functions
-- ============================================================================

-- Function to handle credit deduction for completed classes
CREATE OR REPLACE FUNCTION public.process_class_credit_deduction(
  p_class_log_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  v_class_log RECORD;
  v_credit_account RECORD;
  v_class_duration_hours NUMERIC;
  v_available_credits NUMERIC;
  v_credits_to_deduct NUMERIC;
  v_deduction_result JSONB;
  v_payment_status TEXT;
  v_result JSONB;
BEGIN
  -- Get class log details
  SELECT * INTO v_class_log
  FROM public.class_logs
  WHERE id = p_class_log_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Class log not found: %', p_class_log_id;
  END IF;
  
  -- Check if credits have already been deducted
  IF v_class_log.credits_deducted > 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Credits already deducted for this class',
      'credits_deducted', v_class_log.credits_deducted,
      'payment_status', v_class_log.payment_status,
      'already_processed', true
    );
  END IF;
  
  -- Ensure we have a student_id
  IF v_class_log.student_id IS NULL THEN
    RAISE EXCEPTION 'Student ID is required for credit deduction';
  END IF;
  
  -- Calculate class duration in hours
  IF v_class_log.duration_minutes IS NULL OR v_class_log.duration_minutes <= 0 THEN
    RAISE EXCEPTION 'Valid duration_minutes is required for credit deduction';
  END IF;
  
  v_class_duration_hours := v_class_log.duration_minutes / 60.0;
  
  -- Find the student's credit account with the teacher
  SELECT * INTO v_credit_account
  FROM public.credits
  WHERE student_id = v_class_log.student_id
    AND teacher_id = v_class_log.teacher_id
    AND is_active = true;
  
  IF NOT FOUND THEN
    -- No credit account found, mark as unpaid
    UPDATE public.class_logs
    SET 
      credits_deducted = 0,
      is_paid = false,
      payment_status = 'unpaid',
      updated_at = NOW()
    WHERE id = p_class_log_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'No credit account found, marked as unpaid',
      'credits_deducted', 0,
      'payment_status', 'unpaid',
      'class_duration_hours', v_class_duration_hours,
      'available_credits', 0
    );
  END IF;
  
  v_available_credits := COALESCE(v_credit_account.balance_hours, 0);
  
  -- Determine how many credits to deduct
  IF v_available_credits >= v_class_duration_hours THEN
    -- Full deduction possible
    v_credits_to_deduct := v_class_duration_hours;
    v_payment_status := 'paid';
  ELSIF v_available_credits > 0 THEN
    -- Partial deduction
    v_credits_to_deduct := v_available_credits;
    v_payment_status := 'partial';
  ELSE
    -- No credits available
    v_credits_to_deduct := 0;
    v_payment_status := 'unpaid';
  END IF;
  
  -- Perform credit deduction if needed
  IF v_credits_to_deduct > 0 THEN
    BEGIN
      -- Use the existing credit transaction function
      SELECT public.manage_credit_transaction(
        v_credit_account.id,
        'deduction',
        v_credits_to_deduct,
        'Class session: ' || COALESCE(v_class_log.content, 'Class on ' || v_class_log.date),
        p_class_log_id,
        'class_log',
        v_class_log.teacher_id
      ) INTO v_deduction_result;
      
    EXCEPTION WHEN OTHERS THEN
      -- If deduction fails, mark as unpaid
      v_credits_to_deduct := 0;
      v_payment_status := 'unpaid';
      
      RAISE WARNING 'Credit deduction failed for class %: %', p_class_log_id, SQLERRM;
    END;
  END IF;
  
  -- Update class log with payment information
  UPDATE public.class_logs
  SET 
    credits_deducted = v_credits_to_deduct,
    is_paid = (v_payment_status = 'paid'),
    payment_status = v_payment_status,
    updated_at = NOW()
  WHERE id = p_class_log_id;
  
  -- Calculate remaining balance after deduction
  v_available_credits := v_available_credits - v_credits_to_deduct;
  
  -- Prepare result
  v_result := jsonb_build_object(
    'success', true,
    'message', 'Credit deduction processed successfully',
    'class_log_id', p_class_log_id,
    'credits_deducted', v_credits_to_deduct,
    'payment_status', v_payment_status,
    'is_paid', (v_payment_status = 'paid'),
    'class_duration_hours', v_class_duration_hours,
    'remaining_balance', v_available_credits,
    'deduction_result', v_deduction_result
  );
  
  RETURN v_result;
END;
$;

-- Function to get credit deduction preview (without actually deducting)
CREATE OR REPLACE FUNCTION public.preview_class_credit_deduction(
  p_class_log_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  v_class_log RECORD;
  v_credit_account RECORD;
  v_class_duration_hours NUMERIC;
  v_available_credits NUMERIC;
  v_credits_to_deduct NUMERIC;
  v_payment_status TEXT;
  v_result JSONB;
BEGIN
  -- Get class log details
  SELECT * INTO v_class_log
  FROM public.class_logs
  WHERE id = p_class_log_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Class log not found: %', p_class_log_id;
  END IF;
  
  -- Calculate class duration in hours
  v_class_duration_hours := COALESCE(v_class_log.duration_minutes, 60) / 60.0;
  
  -- Find the student's credit account with the teacher
  SELECT * INTO v_credit_account
  FROM public.credits
  WHERE student_id = v_class_log.student_id
    AND teacher_id = v_class_log.teacher_id
    AND is_active = true;
  
  IF NOT FOUND THEN
    v_available_credits := 0;
    v_credits_to_deduct := 0;
    v_payment_status := 'unpaid';
  ELSE
    v_available_credits := COALESCE(v_credit_account.balance_hours, 0);
    
    -- Determine how many credits would be deducted
    IF v_available_credits >= v_class_duration_hours THEN
      v_credits_to_deduct := v_class_duration_hours;
      v_payment_status := 'paid';
    ELSIF v_available_credits > 0 THEN
      v_credits_to_deduct := v_available_credits;
      v_payment_status := 'partial';
    ELSE
      v_credits_to_deduct := 0;
      v_payment_status := 'unpaid';
    END IF;
  END IF;
  
  -- Prepare result
  v_result := jsonb_build_object(
    'class_log_id', p_class_log_id,
    'class_duration_hours', v_class_duration_hours,
    'available_credits', v_available_credits,
    'credits_to_deduct', v_credits_to_deduct,
    'payment_status', v_payment_status,
    'is_paid', (v_payment_status = 'paid'),
    'remaining_balance_after', v_available_credits - v_credits_to_deduct,
    'has_credit_account', (v_credit_account IS NOT NULL),
    'already_processed', (v_class_log.credits_deducted > 0)
  );
  
  RETURN v_result;
END;
$;

-- Add comments for documentation
COMMENT ON FUNCTION public.process_class_credit_deduction(UUID) IS 'Processes automatic credit deduction when a class is completed';
COMMENT ON FUNCTION public.preview_class_credit_deduction(UUID) IS 'Previews credit deduction without actually performing it';

-- ============================================================================
-- Migration 3: Update class completion trigger
-- ============================================================================

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS class_completion_trigger ON public.class_logs;
DROP FUNCTION IF EXISTS public.handle_class_completion();

-- Create updated class completion handler that uses our new credit deduction function
CREATE OR REPLACE FUNCTION public.handle_class_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  v_deduction_result JSONB;
  v_student_id UUID;
BEGIN
  -- Only process when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status != 'completed' OR OLD.status IS NULL) THEN
    
    -- Ensure we have a student_id (should be populated by the student_id trigger)
    v_student_id := NEW.student_id;
    
    -- If student_id is still null, try to get it from enrollment
    IF v_student_id IS NULL AND NEW.enrollment_id IS NOT NULL THEN
      SELECT student_id INTO v_student_id
      FROM public.enrollments
      WHERE id = NEW.enrollment_id;
      
      -- Update the record with the student_id
      IF v_student_id IS NOT NULL THEN
        UPDATE public.class_logs
        SET student_id = v_student_id
        WHERE id = NEW.id;
        
        -- Update NEW record for the rest of this trigger
        NEW.student_id := v_student_id;
      END IF;
    END IF;
    
    -- If we still don't have student_id, try to get it from student_email
    IF v_student_id IS NULL AND NEW.student_email IS NOT NULL THEN
      SELECT id INTO v_student_id
      FROM public.profiles
      WHERE email = NEW.student_email AND role = 'student';
      
      -- Update the record with the student_id
      IF v_student_id IS NOT NULL THEN
        UPDATE public.class_logs
        SET student_id = v_student_id
        WHERE id = NEW.id;
        
        -- Update NEW record for the rest of this trigger
        NEW.student_id := v_student_id;
      END IF;
    END IF;
    
    -- Process credit deduction if we have the required information
    IF v_student_id IS NOT NULL AND NEW.teacher_id IS NOT NULL THEN
      BEGIN
        -- Use our new credit deduction function
        SELECT public.process_class_credit_deduction(NEW.id) INTO v_deduction_result;
        
        -- Log the result for debugging
        RAISE NOTICE 'Credit deduction result for class %: %', NEW.id, v_deduction_result;
        
      EXCEPTION WHEN OTHERS THEN
        -- Log error but don't prevent class completion
        RAISE WARNING 'Failed to process credit deduction for class %: %', NEW.id, SQLERRM;
        
        -- Set default payment status if deduction failed
        UPDATE public.class_logs
        SET 
          credits_deducted = 0,
          is_paid = false,
          payment_status = 'unpaid',
          updated_at = NOW()
        WHERE id = NEW.id;
      END;
    ELSE
      -- Missing required information, mark as unpaid
      RAISE NOTICE 'Cannot process credit deduction for class % - missing student_id (%) or teacher_id (%)', 
        NEW.id, v_student_id, NEW.teacher_id;
      
      UPDATE public.class_logs
      SET 
        credits_deducted = 0,
        is_paid = false,
        payment_status = 'unpaid',
        updated_at = NOW()
      WHERE id = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$;

-- Create the updated trigger
CREATE TRIGGER class_completion_trigger
AFTER UPDATE ON public.class_logs
FOR EACH ROW
EXECUTE FUNCTION public.handle_class_completion();

-- Add comments for documentation
COMMENT ON FUNCTION public.handle_class_completion() IS 'Updated trigger function that uses the new credit deduction system with payment tracking';

-- ============================================================================
-- Verification queries (run these to test the migration)
-- ============================================================================

-- Test 1: Check if new columns exist
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'class_logs' 
  AND column_name IN ('credits_deducted', 'is_paid', 'payment_status', 'student_id')
ORDER BY column_name;

-- Test 2: Check if functions exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name IN ('process_class_credit_deduction', 'preview_class_credit_deduction', 'handle_class_completion')
  AND routine_schema = 'public';

-- Test 3: Check if trigger exists
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'class_completion_trigger';

-- Test 4: Preview credit deduction (should return error for fake ID)
SELECT public.preview_class_credit_deduction('00000000-0000-0000-0000-000000000000');

-- ============================================================================
-- Migration complete!
-- ============================================================================