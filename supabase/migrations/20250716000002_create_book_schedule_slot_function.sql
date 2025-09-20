-- Create a function to book a schedule slot and deduct credits in a transactional way
CREATE OR REPLACE FUNCTION public.book_schedule_slot(
  p_slot_id UUID,
  p_student_id UUID,
  p_credit_account_id UUID
) 
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_slot RECORD;
  v_credit_account RECORD;
  v_new_balance NUMERIC;
  v_transaction_id UUID;
  v_result JSONB;
BEGIN
  -- Lock the schedule slot for update
  SELECT * INTO v_slot
  FROM public.schedule_slots
  WHERE id = p_slot_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Schedule slot not found';
  END IF;
  
  -- Check if the slot is available
  IF v_slot.status != 'available' THEN
    RAISE EXCEPTION 'Schedule slot is not available';
  END IF;
  
  -- Lock the credit account for update
  SELECT * INTO v_credit_account
  FROM public.credits
  WHERE id = p_credit_account_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credit account not found';
  END IF;
  
  -- Check if the student has enough credits
  IF v_credit_account.balance_hours < 1 THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;
  
  -- Update the schedule slot
  UPDATE public.schedule_slots
  SET 
    status = 'booked',
    student_id = p_student_id,
    updated_at = NOW()
  WHERE id = p_slot_id;
  
  -- Deduct credits
  v_new_balance := v_credit_account.balance_hours - 1;
  
  UPDATE public.credits
  SET 
    balance_hours = v_new_balance,
    total_used = COALESCE(total_used, 0) + 1,
    updated_at = NOW()
  WHERE id = p_credit_account_id;
  
  -- Create the credit transaction record
  INSERT INTO public.credit_transactions (
    credit_account_id,
    transaction_type,
    hours_amount,
    balance_after,
    description,
    reference_id,
    reference_type,
    created_at
  ) VALUES (
    p_credit_account_id,
    'deduction',
    1,
    v_new_balance,
    'Class slot booking: ' || v_slot.date || ' ' || v_slot.start_time || '-' || v_slot.end_time,
    p_slot_id,
    'schedule_slot',
    NOW()
  )
  RETURNING id INTO v_transaction_id;
  
  -- Prepare result
  v_result := jsonb_build_object(
    'transaction_id', v_transaction_id,
    'slot_id', p_slot_id,
    'student_id', p_student_id,
    'credit_account_id', p_credit_account_id,
    'new_balance', v_new_balance,
    'slot_date', v_slot.date,
    'slot_start_time', v_slot.start_time,
    'slot_end_time', v_slot.end_time
  );
  
  RETURN v_result;
END;
$$;