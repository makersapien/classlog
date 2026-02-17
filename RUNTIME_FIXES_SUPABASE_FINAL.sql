-- ============================================================================
-- RUNTIME FIXES FOR SUPABASE DATABASE (FINAL VERSION)
-- This script creates all missing functions and fixes runtime 500 errors
-- ============================================================================

-- ============================================================================
-- 1. DROP AND RECREATE VALIDATE SHARE TOKEN FUNCTION
-- ============================================================================

-- Drop existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS validate_share_token(TEXT);

-- Create the enhanced version
CREATE FUNCTION validate_share_token(p_token TEXT)
RETURNS TABLE(
  is_valid BOOLEAN,
  student_id UUID,
  teacher_id UUID,
  student_name TEXT,
  teacher_name TEXT,
  expires_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  v_token_data RECORD;
BEGIN
  -- Get token data
  SELECT 
    st.*,
    sp.full_name as student_name,
    tp.full_name as teacher_name
  INTO v_token_data
  FROM share_tokens st
  JOIN profiles sp ON sp.id = st.student_id
  JOIN profiles tp ON tp.id = st.teacher_id
  WHERE st.token = p_token
    AND st.is_active = true
    AND st.expires_at > NOW();
  
  IF FOUND THEN
    RETURN QUERY SELECT 
      true as is_valid,
      v_token_data.student_id,
      v_token_data.teacher_id,
      v_token_data.student_name,
      v_token_data.teacher_name,
      v_token_data.expires_at;
  ELSE
    RETURN QUERY SELECT 
      false as is_valid,
      NULL::UUID as student_id,
      NULL::UUID as teacher_id,
      NULL::TEXT as student_name,
      NULL::TEXT as teacher_name,
      NULL::TIMESTAMP WITH TIME ZONE as expires_at;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. BOOKING CONFLICT CHECK FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION check_booking_conflict(
  p_teacher_id UUID,
  p_date DATE,
  p_start_time TIME,
  p_end_time TIME
)
RETURNS BOOLEAN AS $$
DECLARE
  v_conflict_count INTEGER;
BEGIN
  -- Check for overlapping bookings
  SELECT COUNT(*) INTO v_conflict_count
  FROM bookings b
  WHERE b.teacher_id = p_teacher_id
    AND b.booking_date = p_date
    AND b.status IN ('confirmed', 'completed')
    AND (
      (b.start_time <= p_start_time AND b.end_time > p_start_time) OR
      (b.start_time < p_end_time AND b.end_time >= p_end_time) OR
      (b.start_time >= p_start_time AND b.end_time <= p_end_time)
    );
  
  RETURN v_conflict_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. CREDIT TRANSACTION PROCESSING FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION process_credit_transaction(
  p_credit_account_id UUID,
  p_transaction_type TEXT,
  p_hours_amount NUMERIC,
  p_description TEXT,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
  v_transaction_id UUID;
BEGIN
  -- Get current balance with lock
  SELECT balance_hours INTO v_current_balance
  FROM credits
  WHERE id = p_credit_account_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Credit account not found'
    );
  END IF;
  
  -- Calculate new balance based on transaction type
  CASE p_transaction_type
    WHEN 'purchase', 'adjustment', 'refund' THEN
      v_new_balance := v_current_balance + p_hours_amount;
    WHEN 'deduction' THEN
      v_new_balance := v_current_balance - p_hours_amount;
      IF v_new_balance < 0 THEN
        RETURN json_build_object(
          'success', false,
          'error', 'Insufficient credits',
          'current_balance', v_current_balance,
          'required', p_hours_amount
        );
      END IF;
    ELSE
      RETURN json_build_object(
        'success', false,
        'error', 'Invalid transaction type'
      );
  END CASE;
  
  -- Update credit balance
  UPDATE credits
  SET 
    balance_hours = v_new_balance,
    total_used = CASE 
      WHEN p_transaction_type = 'deduction' THEN total_used + p_hours_amount
      ELSE total_used
    END,
    total_purchased = CASE 
      WHEN p_transaction_type = 'purchase' THEN total_purchased + p_hours_amount
      ELSE total_purchased
    END,
    updated_at = NOW()
  WHERE id = p_credit_account_id;
  
  -- Create transaction record
  INSERT INTO credit_transactions (
    credit_account_id,
    transaction_type,
    hours_amount,
    balance_after,
    description,
    reference_type,
    reference_id
  )
  VALUES (
    p_credit_account_id,
    p_transaction_type,
    p_hours_amount,
    v_new_balance,
    p_description,
    p_reference_type,
    p_reference_id
  )
  RETURNING id INTO v_transaction_id;
  
  RETURN json_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'previous_balance', v_current_balance,
    'new_balance', v_new_balance,
    'amount', p_hours_amount
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Transaction failed',
      'details', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. MATCH BOOKINGS WITH CLASSES FUNCTION (for cron jobs)
-- ============================================================================

CREATE OR REPLACE FUNCTION match_bookings_with_classes()
RETURNS JSON AS $$
DECLARE
  v_matched_count INTEGER := 0;
  v_processed_bookings JSON;
  v_booking RECORD;
  v_class_log RECORD;
BEGIN
  -- Find confirmed bookings that have corresponding completed class logs
  FOR v_booking IN
    SELECT b.*, p.full_name as student_name
    FROM bookings b
    JOIN profiles p ON p.id = b.student_id
    WHERE b.status = 'confirmed'
      AND b.booking_date <= CURRENT_DATE
  LOOP
    -- Look for matching class log
    SELECT * INTO v_class_log
    FROM class_logs cl
    WHERE cl.teacher_id = v_booking.teacher_id
      AND cl.student_id = v_booking.student_id
      AND cl.date = v_booking.booking_date
      AND cl.status = 'completed'
      AND ABS(EXTRACT(EPOCH FROM (cl.start_time::TIME - v_booking.start_time))) < 3600; -- Within 1 hour
    
    IF FOUND THEN
      -- Update booking status to completed
      UPDATE bookings
      SET 
        status = 'completed',
        completed_at = NOW()
      WHERE id = v_booking.id;
      
      v_matched_count := v_matched_count + 1;
    END IF;
  END LOOP;
  
  -- Get processed bookings for response
  SELECT json_agg(
    json_build_object(
      'booking_id', id,
      'student_name', (SELECT full_name FROM profiles WHERE id = student_id),
      'booking_date', booking_date,
      'status', status,
      'match_result', json_build_object('matched', status = 'completed')
    )
  ) INTO v_processed_bookings
  FROM bookings
  WHERE updated_at >= NOW() - INTERVAL '1 hour';
  
  RETURN json_build_object(
    'success', true,
    'count', v_matched_count,
    'processed_bookings', COALESCE(v_processed_bookings, '[]'::JSON)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. PROCESS NO-SHOW BOOKINGS FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION process_booking_no_shows()
RETURNS JSON AS $$
DECLARE
  v_no_show_count INTEGER := 0;
  v_no_show_bookings JSON;
BEGIN
  -- Mark bookings as no-show if they're past the time and no class log exists
  UPDATE bookings
  SET status = 'no_show'
  WHERE status = 'confirmed'
    AND booking_date < CURRENT_DATE
    AND NOT EXISTS (
      SELECT 1 FROM class_logs cl
      WHERE cl.teacher_id = bookings.teacher_id
        AND cl.student_id = bookings.student_id
        AND cl.date = bookings.booking_date
        AND cl.status = 'completed'
    );
  
  GET DIAGNOSTICS v_no_show_count = ROW_COUNT;
  
  -- Get no-show bookings for response
  SELECT json_agg(
    json_build_object(
      'booking_id', id,
      'student_name', (SELECT full_name FROM profiles WHERE id = student_id),
      'booking_date', booking_date,
      'status', status
    )
  ) INTO v_no_show_bookings
  FROM bookings
  WHERE status = 'no_show'
    AND updated_at >= NOW() - INTERVAL '1 hour';
  
  RETURN json_build_object(
    'success', true,
    'count', v_no_show_count,
    'no_show_bookings', COALESCE(v_no_show_bookings, '[]'::JSON)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. GET TEACHER STUDENTS FUNCTION (if missing)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_teacher_students(p_teacher_id UUID)
RETURNS TABLE(
  id UUID,
  student_id UUID,
  student_name TEXT,
  parent_name TEXT,
  parent_email TEXT,
  subject TEXT,
  year_group TEXT,
  classes_per_week INTEGER,
  classes_per_recharge INTEGER,
  tentative_schedule JSONB,
  whatsapp_group_url TEXT,
  google_meet_url TEXT,
  setup_completed BOOLEAN,
  enrollment_date DATE,
  status TEXT,
  class_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.student_id,
    sp.full_name as student_name,
    pp.full_name as parent_name,
    pp.email as parent_email,
    e.subject,
    e.year_group,
    e.classes_per_week,
    e.classes_per_recharge,
    e.tentative_schedule,
    e.whatsapp_group_url,
    e.google_meet_url,
    e.setup_completed,
    e.enrollment_date::DATE,
    e.status,
    c.name as class_name
  FROM enrollments e
  JOIN profiles sp ON sp.id = e.student_id
  LEFT JOIN profiles pp ON pp.id = sp.parent_id
  LEFT JOIN classes c ON c.id = e.class_id
  WHERE e.teacher_id = p_teacher_id
    AND e.status = 'active'
  ORDER BY sp.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION validate_share_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_booking_conflict(UUID, DATE, TIME, TIME) TO authenticated;
GRANT EXECUTE ON FUNCTION process_credit_transaction(UUID, TEXT, NUMERIC, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION match_bookings_with_classes() TO authenticated;
GRANT EXECUTE ON FUNCTION process_booking_no_shows() TO authenticated;
GRANT EXECUTE ON FUNCTION get_teacher_students(UUID) TO authenticated;

-- Grant to anon for public booking functions
GRANT EXECUTE ON FUNCTION validate_share_token(TEXT) TO anon;

-- ============================================================================
-- 8. CREATE MISSING INDEXES FOR PERFORMANCE
-- ============================================================================

-- Indexes for bookings table
CREATE INDEX IF NOT EXISTS idx_bookings_teacher_date_status ON bookings(teacher_id, booking_date, status);
CREATE INDEX IF NOT EXISTS idx_bookings_student_date ON bookings(student_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_schedule_slot ON bookings(schedule_slot_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status_date ON bookings(status, booking_date);

-- Indexes for schedule_slots table
CREATE INDEX IF NOT EXISTS idx_schedule_slots_teacher_date ON schedule_slots(teacher_id, date);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_status ON schedule_slots(status);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_booked_by ON schedule_slots(booked_by) WHERE booked_by IS NOT NULL;

-- Indexes for credits table
CREATE INDEX IF NOT EXISTS idx_credits_student_teacher ON credits(student_id, teacher_id);
CREATE INDEX IF NOT EXISTS idx_credits_parent_teacher ON credits(parent_id, teacher_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_credits_active ON credits(is_active) WHERE is_active = true;

-- Indexes for share_tokens table
CREATE INDEX IF NOT EXISTS idx_share_tokens_student_teacher ON share_tokens(student_id, teacher_id);
CREATE INDEX IF NOT EXISTS idx_share_tokens_active ON share_tokens(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_share_tokens_expires ON share_tokens(expires_at);

-- ============================================================================
-- 9. UPDATE RLS POLICIES (if needed)
-- ============================================================================

-- Ensure anon users can access booking functions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'share_tokens' 
    AND policyname = 'Allow anon access to booking functions'
  ) THEN
    CREATE POLICY "Allow anon access to booking functions" ON share_tokens
      FOR SELECT TO anon
      USING (is_active = true AND expires_at > NOW());
  END IF;
END
$$;

-- ============================================================================
-- 10. COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Runtime fixes completed successfully!';
  RAISE NOTICE 'All required functions and indexes have been created.';
  RAISE NOTICE 'Your booking system should now work without 500 errors.';
END
$$;