-- Migration to integrate booking system with ClassLogger time tracking
-- This adds booking_id to class_logs and creates functions for automatic session management

-- 1. Add booking_id column to class_logs table
ALTER TABLE public.class_logs 
ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL;

-- Create index for booking_id lookups
CREATE INDEX IF NOT EXISTS idx_class_logs_booking_id ON public.class_logs(booking_id);

-- 2. Function to check if a booking time matches an actual class session
CREATE OR REPLACE FUNCTION public.check_booking_class_match(
  p_booking_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  v_booking RECORD;
  v_class_log RECORD;
  v_result JSONB;
BEGIN
  -- Get booking details
  SELECT b.*, 
         sp.full_name as student_name, sp.email as student_email,
         tp.full_name as teacher_name, tp.email as teacher_email
  INTO v_booking
  FROM public.bookings b
  JOIN public.profiles sp ON sp.id = b.student_id
  JOIN public.profiles tp ON tp.id = b.teacher_id
  WHERE b.id = p_booking_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Booking not found',
      'code', 'BOOKING_NOT_FOUND'
    );
  END IF;
  
  -- Look for a class log that matches this booking
  SELECT * INTO v_class_log
  FROM public.class_logs cl
  WHERE cl.teacher_id = v_booking.teacher_id
    AND cl.student_email = v_booking.student_email
    AND cl.date = v_booking.booking_date
    AND cl.status = 'completed'
    AND ABS(EXTRACT(EPOCH FROM (
      cl.start_time::time - v_booking.start_time::time
    ))) <= 1800 -- Within 30 minutes of booked time
  ORDER BY ABS(EXTRACT(EPOCH FROM (
    cl.start_time::time - v_booking.start_time::time
  )))
  LIMIT 1;
  
  IF FOUND THEN
    -- Update the class log to link it to this booking
    UPDATE public.class_logs
    SET booking_id = p_booking_id,
        attachments = COALESCE(attachments, '{}'::jsonb) || jsonb_build_object(
          'booking_matched', true,
          'booking_id', p_booking_id,
          'matched_at', NOW()
        )
    WHERE id = v_class_log.id;
    
    -- Update booking status to completed
    UPDATE public.bookings
    SET status = 'completed',
        completed_at = v_class_log.end_time,
        updated_at = NOW()
    WHERE id = p_booking_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'matched', true,
      'class_log_id', v_class_log.id,
      'booking_id', p_booking_id,
      'message', 'Booking matched with completed class',
      'time_difference_minutes', EXTRACT(EPOCH FROM (
        v_class_log.start_time::time - v_booking.start_time::time
      )) / 60
    );
  ELSE
    RETURN jsonb_build_object(
      'success', true,
      'matched', false,
      'booking_id', p_booking_id,
      'message', 'No matching class found for this booking'
    );
  END IF;
END;
$;

-- 3. Function to mark a booking as no-show if no class happened
CREATE OR REPLACE FUNCTION public.mark_booking_no_show(
  p_booking_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  v_booking RECORD;
BEGIN
  -- Get booking details
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id AND status = 'confirmed';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Booking not found or not confirmed',
      'code', 'BOOKING_NOT_FOUND'
    );
  END IF;
  
  -- Check if booking time has passed
  IF (v_booking.booking_date || ' ' || v_booking.end_time)::timestamp > NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot mark as no-show before booking time has passed',
      'code', 'BOOKING_NOT_ENDED'
    );
  END IF;
  
  -- Update booking status to no_show
  UPDATE public.bookings
  SET 
    status = 'no_show',
    updated_at = NOW()
  WHERE id = p_booking_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'message', 'Booking marked as no-show'
  );
END;
$;

-- 4. Function to check for completed bookings and match them with class logs
CREATE OR REPLACE FUNCTION public.match_bookings_with_classes()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  v_booking RECORD;
  v_results JSONB := '[]'::jsonb;
  v_match_result JSONB;
  v_processed_count INTEGER := 0;
BEGIN
  -- Find confirmed bookings from the past 24 hours that haven't been matched
  FOR v_booking IN
    SELECT b.*, 
           sp.full_name as student_name,
           tp.full_name as teacher_name
    FROM public.bookings b
    JOIN public.profiles sp ON sp.id = b.student_id
    JOIN public.profiles tp ON tp.id = b.teacher_id
    WHERE b.status = 'confirmed'
      AND (b.booking_date || ' ' || b.end_time)::timestamp < NOW()
      AND (b.booking_date || ' ' || b.end_time)::timestamp > NOW() - INTERVAL '24 hours'
      AND NOT EXISTS (
        SELECT 1 FROM public.class_logs cl 
        WHERE cl.booking_id = b.id
      )
  LOOP
    -- Try to match this booking with a class log
    SELECT public.check_booking_class_match(v_booking.id) INTO v_match_result;
    
    v_results := v_results || jsonb_build_object(
      'booking_id', v_booking.id,
      'student_name', v_booking.student_name,
      'teacher_name', v_booking.teacher_name,
      'booking_date', v_booking.booking_date,
      'booking_time', v_booking.start_time,
      'match_result', v_match_result
    );
    
    v_processed_count := v_processed_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'processed_bookings', v_results,
    'count', v_processed_count
  );
END;
$;

-- 5. Enhanced function to get comprehensive booking analytics for teachers
CREATE OR REPLACE FUNCTION public.get_booking_analytics(
  p_teacher_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_total_bookings INTEGER;
  v_completed_bookings INTEGER;
  v_cancelled_bookings INTEGER;
  v_no_show_bookings INTEGER;
  v_total_hours NUMERIC;
  v_utilization_rate NUMERIC;
  v_booking_vs_actual JSONB;
  v_monthly_trends JSONB;
  v_student_stats JSONB;
  v_time_slot_popularity JSONB;
  v_result JSONB;
BEGIN
  -- Set default date range (last 30 days)
  v_start_date := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days');
  v_end_date := COALESCE(p_end_date, CURRENT_DATE);
  
  -- Get booking counts
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'completed') as completed,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
    COUNT(*) FILTER (WHERE status = 'no_show') as no_show
  INTO v_total_bookings, v_completed_bookings, v_cancelled_bookings, v_no_show_bookings
  FROM public.bookings
  WHERE teacher_id = p_teacher_id
    AND booking_date BETWEEN v_start_date AND v_end_date;
  
  -- Calculate total hours from completed bookings
  SELECT COALESCE(SUM(
    EXTRACT(EPOCH FROM (end_time::time - start_time::time)) / 3600
  ), 0) INTO v_total_hours
  FROM public.bookings
  WHERE teacher_id = p_teacher_id
    AND booking_date BETWEEN v_start_date AND v_end_date
    AND status = 'completed';
  
  -- Calculate utilization rate (completed vs total bookings)
  v_utilization_rate := CASE 
    WHEN v_total_bookings > 0 THEN 
      ROUND((v_completed_bookings::NUMERIC / v_total_bookings::NUMERIC) * 100, 2)
    ELSE 0
  END;
  
  -- Get booking vs actual class correlation
  SELECT jsonb_agg(
    jsonb_build_object(
      'booking_id', b.id,
      'booking_date', b.booking_date,
      'booking_start', b.start_time,
      'booking_end', b.end_time,
      'actual_start', cl.start_time,
      'actual_end', cl.end_time,
      'actual_duration', cl.duration_minutes,
      'student_name', sp.full_name,
      'student_email', sp.email,
      'status', b.status,
      'matched', CASE WHEN cl.id IS NOT NULL THEN true ELSE false END,
      'time_difference_minutes', CASE 
        WHEN cl.start_time IS NOT NULL THEN 
          EXTRACT(EPOCH FROM (cl.start_time::time - b.start_time::time)) / 60
        ELSE NULL
      END
    )
  ) INTO v_booking_vs_actual
  FROM public.bookings b
  LEFT JOIN public.class_logs cl ON cl.booking_id = b.id
  LEFT JOIN public.profiles sp ON sp.id = b.student_id
  WHERE b.teacher_id = p_teacher_id
    AND b.booking_date BETWEEN v_start_date AND v_end_date;
  
  -- Get monthly booking trends
  SELECT jsonb_agg(
    jsonb_build_object(
      'month', TO_CHAR(booking_date, 'YYYY-MM'),
      'total_bookings', COUNT(*),
      'completed_bookings', COUNT(*) FILTER (WHERE status = 'completed'),
      'cancelled_bookings', COUNT(*) FILTER (WHERE status = 'cancelled'),
      'no_show_bookings', COUNT(*) FILTER (WHERE status = 'no_show')
    )
  ) INTO v_monthly_trends
  FROM public.bookings
  WHERE teacher_id = p_teacher_id
    AND booking_date BETWEEN v_start_date AND v_end_date
  GROUP BY TO_CHAR(booking_date, 'YYYY-MM')
  ORDER BY TO_CHAR(booking_date, 'YYYY-MM');
  
  -- Get student booking statistics
  SELECT jsonb_agg(
    jsonb_build_object(
      'student_id', sp.id,
      'student_name', sp.full_name,
      'student_email', sp.email,
      'total_bookings', COUNT(*),
      'completed_bookings', COUNT(*) FILTER (WHERE b.status = 'completed'),
      'cancelled_bookings', COUNT(*) FILTER (WHERE b.status = 'cancelled'),
      'no_show_bookings', COUNT(*) FILTER (WHERE b.status = 'no_show'),
      'total_hours', COALESCE(SUM(
        CASE WHEN b.status = 'completed' THEN
          EXTRACT(EPOCH FROM (b.end_time::time - b.start_time::time)) / 3600
        ELSE 0 END
      ), 0)
    )
  ) INTO v_student_stats
  FROM public.bookings b
  JOIN public.profiles sp ON sp.id = b.student_id
  WHERE b.teacher_id = p_teacher_id
    AND b.booking_date BETWEEN v_start_date AND v_end_date
  GROUP BY sp.id, sp.full_name, sp.email
  ORDER BY COUNT(*) DESC;
  
  -- Get time slot popularity
  SELECT jsonb_agg(
    jsonb_build_object(
      'time_slot', start_time,
      'day_of_week', TO_CHAR(booking_date, 'Day'),
      'booking_count', COUNT(*),
      'completion_rate', ROUND(
        (COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2
      )
    )
  ) INTO v_time_slot_popularity
  FROM public.bookings
  WHERE teacher_id = p_teacher_id
    AND booking_date BETWEEN v_start_date AND v_end_date
  GROUP BY start_time, TO_CHAR(booking_date, 'Day')
  ORDER BY COUNT(*) DESC
  LIMIT 10;
  
  -- Build result
  v_result := jsonb_build_object(
    'period', jsonb_build_object(
      'start_date', v_start_date,
      'end_date', v_end_date
    ),
    'summary', jsonb_build_object(
      'total_bookings', v_total_bookings,
      'completed_bookings', v_completed_bookings,
      'cancelled_bookings', v_cancelled_bookings,
      'no_show_bookings', v_no_show_bookings,
      'total_hours', v_total_hours,
      'utilization_rate', v_utilization_rate
    ),
    'booking_vs_actual', COALESCE(v_booking_vs_actual, '[]'::jsonb),
    'monthly_trends', COALESCE(v_monthly_trends, '[]'::jsonb),
    'student_statistics', COALESCE(v_student_stats, '[]'::jsonb),
    'time_slot_popularity', COALESCE(v_time_slot_popularity, '[]'::jsonb)
  );
  
  RETURN v_result;
END;
$;

-- 6. Function to process no-shows for bookings that didn't have classes
CREATE OR REPLACE FUNCTION public.process_booking_no_shows()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  v_booking RECORD;
  v_results JSONB := '[]'::jsonb;
  v_no_show_count INTEGER := 0;
BEGIN
  -- Find confirmed bookings that ended more than 1 hour ago with no matching class
  FOR v_booking IN
    SELECT b.*, 
           sp.full_name as student_name,
           tp.full_name as teacher_name
    FROM public.bookings b
    JOIN public.profiles sp ON sp.id = b.student_id
    JOIN public.profiles tp ON tp.id = b.teacher_id
    WHERE b.status = 'confirmed'
      AND (b.booking_date || ' ' || b.end_time)::timestamp < NOW() - INTERVAL '1 hour'
      AND NOT EXISTS (
        SELECT 1 FROM public.class_logs cl 
        WHERE cl.teacher_id = b.teacher_id
          AND cl.student_email = sp.email
          AND cl.date = b.booking_date
          AND cl.status = 'completed'
          AND ABS(EXTRACT(EPOCH FROM (
            cl.start_time::time - b.start_time::time
          ))) <= 1800 -- Within 30 minutes
      )
  LOOP
    -- Mark as no-show
    UPDATE public.bookings
    SET status = 'no_show',
        updated_at = NOW()
    WHERE id = v_booking.id;
    
    v_results := v_results || jsonb_build_object(
      'booking_id', v_booking.id,
      'student_name', v_booking.student_name,
      'teacher_name', v_booking.teacher_name,
      'booking_date', v_booking.booking_date,
      'booking_time', v_booking.start_time
    );
    
    v_no_show_count := v_no_show_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'no_show_bookings', v_results,
    'count', v_no_show_count,
    'message', 'Processed ' || v_no_show_count || ' no-show bookings'
  );
END;
$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.check_booking_class_match(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_booking_no_show(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_bookings_with_classes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_booking_analytics(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_booking_no_shows() TO authenticated;

-- Create cron job entries for booking management (to be set up separately)
COMMENT ON FUNCTION public.match_bookings_with_classes() IS 'Should be called every hour by a cron job to match completed bookings with class logs';
COMMENT ON FUNCTION public.process_booking_no_shows() IS 'Should be called every few hours by a cron job to process no-show bookings';