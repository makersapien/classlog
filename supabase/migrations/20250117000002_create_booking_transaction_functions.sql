-- Enhanced booking transaction functions for the class booking system
-- These functions work alongside the existing book_schedule_slot function

-- Function to book a slot with comprehensive validation and booking record creation
CREATE OR REPLACE FUNCTION book_slot_with_validation(
  p_schedule_slot_id UUID,
  p_student_id UUID,
  p_credit_account_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_slot RECORD;
  v_booking_id UUID;
  v_result JSON;
  v_credit_balance NUMERIC;
BEGIN
  -- Get slot details with lock
  SELECT * INTO v_slot
  FROM schedule_slots
  WHERE id = p_schedule_slot_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Schedule slot not found',
      'code', 'SLOT_NOT_FOUND'
    );
  END IF;
  
  -- Validate slot is available
  IF v_slot.status != 'available' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Schedule slot is not available',
      'code', 'SLOT_UNAVAILABLE',
      'current_status', v_slot.status
    );
  END IF;
  
  -- Validate slot is in the future
  IF v_slot.date < CURRENT_DATE OR 
     (v_slot.date = CURRENT_DATE AND v_slot.start_time <= CURRENT_TIME) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot book a slot in the past',
      'code', 'SLOT_IN_PAST'
    );
  END IF;
  
  -- Check credit balance
  SELECT balance_hours INTO v_credit_balance
  FROM credits
  WHERE id = p_credit_account_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Credit account not found or inactive',
      'code', 'CREDIT_ACCOUNT_NOT_FOUND'
    );
  END IF;
  
  IF v_credit_balance < 1 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient credits',
      'code', 'INSUFFICIENT_CREDITS',
      'current_balance', v_credit_balance
    );
  END IF;
  
  -- Check for booking conflicts
  IF check_booking_conflict(v_slot.teacher_id, v_slot.date, v_slot.start_time, v_slot.end_time) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Booking conflict detected',
      'code', 'BOOKING_CONFLICT'
    );
  END IF;
  
  -- Create booking record
  INSERT INTO bookings (
    teacher_id,
    student_id,
    schedule_slot_id,
    booking_date,
    start_time,
    end_time,
    status,
    notes
  )
  VALUES (
    v_slot.teacher_id,
    p_student_id,
    p_schedule_slot_id,
    v_slot.date,
    v_slot.start_time,
    v_slot.end_time,
    'confirmed',
    p_notes
  )
  RETURNING id INTO v_booking_id;
  
  -- Update schedule slot
  UPDATE schedule_slots
  SET 
    status = 'booked',
    booked_by = p_student_id,
    booked_at = NOW()
  WHERE id = p_schedule_slot_id;
  
  -- Deduct credit using existing function
  PERFORM process_credit_transaction(
    p_credit_account_id,
    'deduction',
    1,
    'Class booking: ' || v_slot.date || ' ' || v_slot.start_time || '-' || v_slot.end_time,
    'booking',
    v_booking_id::TEXT
  );
  
  -- Build success response
  v_result := json_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'schedule_slot_id', p_schedule_slot_id,
    'booking_date', v_slot.date,
    'start_time', v_slot.start_time,
    'end_time', v_slot.end_time,
    'credits_deducted', 1,
    'remaining_credits', v_credit_balance - 1
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Booking transaction failed',
      'code', 'TRANSACTION_ERROR',
      'details', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cancel a booking
CREATE OR REPLACE FUNCTION cancel_booking(
  p_booking_id UUID,
  p_student_id UUID,
  p_reason TEXT DEFAULT NULL,
  p_refund_credits BOOLEAN DEFAULT true
)
RETURNS JSON AS $$
DECLARE
  v_booking RECORD;
  v_credit_account_id UUID;
  v_result JSON;
  v_cancellation_deadline TIMESTAMP;
BEGIN
  -- Get booking details with lock
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id AND student_id = p_student_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Booking not found or access denied',
      'code', 'BOOKING_NOT_FOUND'
    );
  END IF;
  
  -- Check if booking can be cancelled
  IF v_booking.status != 'confirmed' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Booking cannot be cancelled',
      'code', 'BOOKING_NOT_CANCELLABLE',
      'current_status', v_booking.status
    );
  END IF;
  
  -- Check cancellation policy (24 hours before class)
  v_cancellation_deadline := (v_booking.booking_date || ' ' || v_booking.start_time)::TIMESTAMP - INTERVAL '24 hours';
  
  IF NOW() > v_cancellation_deadline THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cannot cancel within 24 hours of class time',
      'code', 'CANCELLATION_POLICY_VIOLATION',
      'deadline', v_cancellation_deadline
    );
  END IF;
  
  -- Update booking status
  UPDATE bookings
  SET 
    status = 'cancelled',
    cancelled_at = NOW(),
    cancellation_reason = p_reason
  WHERE id = p_booking_id;
  
  -- Update schedule slot back to available
  UPDATE schedule_slots
  SET 
    status = 'available',
    booked_by = NULL,
    booked_at = NULL
  WHERE id = v_booking.schedule_slot_id;
  
  -- Refund credits if requested
  IF p_refund_credits THEN
    -- Find the credit account
    SELECT id INTO v_credit_account_id
    FROM credits
    WHERE student_id = p_student_id 
      AND teacher_id = v_booking.teacher_id
      AND is_active = true;
    
    IF FOUND THEN
      PERFORM process_credit_transaction(
        v_credit_account_id,
        'refund',
        1,
        'Booking cancellation refund: ' || v_booking.booking_date || ' ' || v_booking.start_time || '-' || v_booking.end_time,
        'booking_cancellation',
        p_booking_id::TEXT
      );
    END IF;
  END IF;
  
  v_result := json_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'cancelled_at', NOW(),
    'credits_refunded', CASE WHEN p_refund_credits THEN 1 ELSE 0 END
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cancellation failed',
      'code', 'CANCELLATION_ERROR',
      'details', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get available slots for a student (with privacy filtering)
CREATE OR REPLACE FUNCTION get_student_calendar(
  p_share_token TEXT,
  p_week_start DATE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_token_info RECORD;
  v_week_start DATE;
  v_week_end DATE;
  v_slots JSON;
  v_student_bookings JSON;
BEGIN
  -- Validate token and get student/teacher info
  SELECT * INTO v_token_info
  FROM validate_share_token(p_share_token);
  
  IF NOT v_token_info.is_valid THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or expired booking link',
      'code', 'INVALID_TOKEN'
    );
  END IF;
  
  -- Set week boundaries
  v_week_start := COALESCE(p_week_start, CURRENT_DATE);
  v_week_end := v_week_start + INTERVAL '6 days';
  
  -- Get available slots and student's own bookings
  SELECT json_agg(
    json_build_object(
      'id', ss.id,
      'date', ss.date,
      'start_time', ss.start_time,
      'end_time', ss.end_time,
      'duration_minutes', ss.duration_minutes,
      'subject', ss.subject,
      'status', CASE 
        WHEN ss.status = 'available' THEN 'available'
        WHEN ss.booked_by = v_token_info.student_id THEN 'my_booking'
        ELSE 'booked'
      END,
      'is_my_booking', ss.booked_by = v_token_info.student_id,
      'booking_id', CASE 
        WHEN ss.booked_by = v_token_info.student_id THEN b.id
        ELSE NULL
      END
    )
  ) INTO v_slots
  FROM schedule_slots ss
  LEFT JOIN bookings b ON b.schedule_slot_id = ss.id AND b.student_id = v_token_info.student_id
  WHERE ss.teacher_id = v_token_info.teacher_id
    AND ss.date BETWEEN v_week_start AND v_week_end
    AND (
      ss.status = 'available' OR 
      ss.booked_by = v_token_info.student_id OR
      (ss.status = 'booked' AND ss.booked_by != v_token_info.student_id)
    )
  ORDER BY ss.date, ss.start_time;
  
  -- Get student's upcoming bookings
  SELECT json_agg(
    json_build_object(
      'id', b.id,
      'date', b.booking_date,
      'start_time', b.start_time,
      'end_time', b.end_time,
      'status', b.status,
      'notes', b.notes
    )
  ) INTO v_student_bookings
  FROM bookings b
  WHERE b.student_id = v_token_info.student_id
    AND b.teacher_id = v_token_info.teacher_id
    AND b.booking_date >= CURRENT_DATE
    AND b.status IN ('confirmed', 'completed')
  ORDER BY b.booking_date, b.start_time;
  
  RETURN json_build_object(
    'success', true,
    'student_name', v_token_info.student_name,
    'teacher_name', v_token_info.teacher_name,
    'week_start', v_week_start,
    'week_end', v_week_end,
    'slots', COALESCE(v_slots, '[]'::JSON),
    'upcoming_bookings', COALESCE(v_student_bookings, '[]'::JSON)
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to load calendar',
      'code', 'CALENDAR_ERROR',
      'details', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get teacher's booking analytics
CREATE OR REPLACE FUNCTION get_teacher_booking_stats(
  p_teacher_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_stats JSON;
BEGIN
  v_start_date := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days');
  v_end_date := COALESCE(p_end_date, CURRENT_DATE + INTERVAL '30 days');
  
  SELECT json_build_object(
    'total_slots', COUNT(*),
    'available_slots', COUNT(*) FILTER (WHERE status = 'available'),
    'booked_slots', COUNT(*) FILTER (WHERE status = 'booked'),
    'completed_slots', COUNT(*) FILTER (WHERE status = 'completed'),
    'cancelled_slots', COUNT(*) FILTER (WHERE status = 'cancelled'),
    'utilization_rate', ROUND(
      (COUNT(*) FILTER (WHERE status IN ('booked', 'completed'))::NUMERIC / 
       NULLIF(COUNT(*), 0) * 100), 2
    ),
    'total_bookings', (
      SELECT COUNT(*) 
      FROM bookings 
      WHERE teacher_id = p_teacher_id 
        AND booking_date BETWEEN v_start_date AND v_end_date
    ),
    'confirmed_bookings', (
      SELECT COUNT(*) 
      FROM bookings 
      WHERE teacher_id = p_teacher_id 
        AND booking_date BETWEEN v_start_date AND v_end_date
        AND status = 'confirmed'
    ),
    'cancelled_bookings', (
      SELECT COUNT(*) 
      FROM bookings 
      WHERE teacher_id = p_teacher_id 
        AND booking_date BETWEEN v_start_date AND v_end_date
        AND status = 'cancelled'
    ),
    'cancellation_rate', ROUND(
      (SELECT COUNT(*) FROM bookings 
       WHERE teacher_id = p_teacher_id 
         AND booking_date BETWEEN v_start_date AND v_end_date
         AND status = 'cancelled')::NUMERIC / 
      NULLIF((SELECT COUNT(*) FROM bookings 
              WHERE teacher_id = p_teacher_id 
                AND booking_date BETWEEN v_start_date AND v_end_date), 0) * 100, 2
    )
  ) INTO v_stats
  FROM schedule_slots
  WHERE teacher_id = p_teacher_id
    AND date BETWEEN v_start_date AND v_end_date;
  
  RETURN json_build_object(
    'success', true,
    'period_start', v_start_date,
    'period_end', v_end_date,
    'stats', v_stats
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to load booking statistics',
      'code', 'STATS_ERROR',
      'details', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION book_slot_with_validation(UUID, UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_booking(UUID, UUID, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_student_calendar(TEXT, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_teacher_booking_stats(UUID, DATE, DATE) TO authenticated;