-- Migration: Create credit deduction function for class completion
-- This function handles automatic credit deduction when a class is marked as completed

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

-- Function to handle partial credit deduction (when insufficient credits)
CREATE OR REPLACE FUNCTION public.process_partial_credit_deduction(
  p_class_log_id UUID,
  p_max_credits_to_deduct NUMERIC DEFAULT NULL
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
  
  -- Ensure we have a student_id
  IF v_class_log.student_id IS NULL THEN
    RAISE EXCEPTION 'Student ID is required for credit deduction';
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
    RAISE EXCEPTION 'No active credit account found for student % with teacher %', 
      v_class_log.student_id, v_class_log.teacher_id;
  END IF;
  
  v_available_credits := COALESCE(v_credit_account.balance_hours, 0);
  
  -- Determine credits to deduct (limited by available credits and optional max)
  v_credits_to_deduct := LEAST(
    v_available_credits,
    v_class_duration_hours,
    COALESCE(p_max_credits_to_deduct, v_class_duration_hours)
  );
  
  -- Determine payment status
  IF v_credits_to_deduct >= v_class_duration_hours THEN
    v_payment_status := 'paid';
  ELSIF v_credits_to_deduct > 0 THEN
    v_payment_status := 'partial';
  ELSE
    v_payment_status := 'unpaid';
  END IF;
  
  -- Perform credit deduction if needed
  IF v_credits_to_deduct > 0 THEN
    SELECT public.manage_credit_transaction(
      v_credit_account.id,
      'deduction',
      v_credits_to_deduct,
      'Partial payment for class: ' || COALESCE(v_class_log.content, 'Class on ' || v_class_log.date),
      p_class_log_id,
      'class_log',
      v_class_log.teacher_id
    ) INTO v_deduction_result;
  END IF;
  
  -- Update class log with payment information
  UPDATE public.class_logs
  SET 
    credits_deducted = COALESCE(credits_deducted, 0) + v_credits_to_deduct,
    is_paid = (v_payment_status = 'paid'),
    payment_status = v_payment_status,
    updated_at = NOW()
  WHERE id = p_class_log_id;
  
  -- Prepare result
  v_result := jsonb_build_object(
    'success', true,
    'message', 'Partial credit deduction processed',
    'class_log_id', p_class_log_id,
    'credits_deducted', v_credits_to_deduct,
    'total_credits_deducted', COALESCE(v_class_log.credits_deducted, 0) + v_credits_to_deduct,
    'payment_status', v_payment_status,
    'is_paid', (v_payment_status = 'paid'),
    'class_duration_hours', v_class_duration_hours,
    'remaining_balance', v_available_credits - v_credits_to_deduct,
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
COMMENT ON FUNCTION public.process_partial_credit_deduction(UUID, NUMERIC) IS 'Processes partial credit deduction with optional maximum limit';
COMMENT ON FUNCTION public.preview_class_credit_deduction(UUID) IS 'Previews credit deduction without actually performing it';