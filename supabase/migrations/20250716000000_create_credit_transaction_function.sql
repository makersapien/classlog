-- Create a function to manage credit transactions in a transactional way
CREATE OR REPLACE FUNCTION public.manage_credit_transaction(
  p_credit_account_id UUID,
  p_transaction_type TEXT,
  p_hours_amount NUMERIC,
  p_description TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_performed_by UUID DEFAULT NULL
) 
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_credit_account RECORD;
  v_new_balance NUMERIC;
  v_total_purchased NUMERIC;
  v_total_used NUMERIC;
  v_transaction_id UUID;
  v_result JSONB;
BEGIN
  -- Lock the credit account for update
  SELECT * INTO v_credit_account
  FROM public.credits
  WHERE id = p_credit_account_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credit account not found';
  END IF;
  
  -- Initialize values
  v_new_balance := COALESCE(v_credit_account.balance_hours, 0);
  v_total_purchased := COALESCE(v_credit_account.total_purchased, 0);
  v_total_used := COALESCE(v_credit_account.total_used, 0);
  
  -- Process based on transaction type
  CASE p_transaction_type
    WHEN 'purchase' THEN
      v_new_balance := v_new_balance + p_hours_amount;
      v_total_purchased := v_total_purchased + p_hours_amount;
    WHEN 'deduction' THEN
      IF v_new_balance < p_hours_amount THEN
        RAISE EXCEPTION 'Insufficient credit balance';
      END IF;
      v_new_balance := v_new_balance - p_hours_amount;
      v_total_used := v_total_used + p_hours_amount;
    WHEN 'adjustment' THEN
      v_new_balance := v_new_balance + p_hours_amount; -- Can be negative for reduction
    WHEN 'refund' THEN
      v_new_balance := v_new_balance + p_hours_amount;
      v_total_used := v_total_used - p_hours_amount;
      IF v_total_used < 0 THEN
        v_total_used := 0; -- Ensure total used doesn't go negative
      END IF;
    ELSE
      RAISE EXCEPTION 'Invalid transaction type: %', p_transaction_type;
  END CASE;
  
  -- Update the credit account
  UPDATE public.credits
  SET 
    balance_hours = v_new_balance,
    total_purchased = v_total_purchased,
    total_used = v_total_used,
    updated_at = NOW()
  WHERE id = p_credit_account_id;
  
  -- Create the transaction record
  INSERT INTO public.credit_transactions (
    credit_account_id,
    transaction_type,
    hours_amount,
    balance_after,
    description,
    reference_id,
    reference_type,
    performed_by,
    created_at
  ) VALUES (
    p_credit_account_id,
    p_transaction_type,
    p_hours_amount,
    v_new_balance,
    p_description,
    p_reference_id,
    p_reference_type,
    p_performed_by,
    NOW()
  )
  RETURNING id INTO v_transaction_id;
  
  -- Prepare result
  v_result := jsonb_build_object(
    'transaction_id', v_transaction_id,
    'credit_account_id', p_credit_account_id,
    'transaction_type', p_transaction_type,
    'hours_amount', p_hours_amount,
    'new_balance', v_new_balance,
    'total_purchased', v_total_purchased,
    'total_used', v_total_used
  );
  
  RETURN v_result;
END;
$$;

-- Create a helper function to check if manage_credit_transaction exists
CREATE OR REPLACE FUNCTION public.check_credit_transaction_function()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_function_exists BOOLEAN;
  v_result JSONB;
BEGIN
  -- Check if the function exists
  SELECT EXISTS (
    SELECT 1 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'manage_credit_transaction'
  ) INTO v_function_exists;
  
  -- Prepare result
  v_result := jsonb_build_object(
    'function_exists', v_function_exists,
    'function_name', 'manage_credit_transaction',
    'schema', 'public'
  );
  
  RETURN v_result;
END;
$$;