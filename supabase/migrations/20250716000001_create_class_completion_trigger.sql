-- Create a trigger to automatically deduct credits when a class is completed
CREATE OR REPLACE FUNCTION public.handle_class_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_id UUID;
  v_teacher_id UUID;
  v_enrollment_id UUID;
  v_credit_account_id UUID;
  v_class_duration NUMERIC;
  v_hours_to_deduct NUMERIC;
  v_description TEXT;
BEGIN
  -- Only process when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status != 'completed' OR OLD.status IS NULL) THEN
    -- Get student ID and teacher ID
    v_enrollment_id := NEW.enrollment_id;
    v_teacher_id := NEW.teacher_id;
    
    -- If we have an enrollment ID, get the student ID from it
    IF v_enrollment_id IS NOT NULL THEN
      SELECT student_id INTO v_student_id
      FROM public.enrollments
      WHERE id = v_enrollment_id;
    END IF;
    
    -- If we have a student email but no student ID, try to get it from profiles
    IF v_student_id IS NULL AND NEW.student_email IS NOT NULL THEN
      SELECT id INTO v_student_id
      FROM public.profiles
      WHERE email = NEW.student_email AND role = 'student';
    END IF;
    
    -- If we have both student ID and teacher ID, proceed with credit deduction
    IF v_student_id IS NOT NULL AND v_teacher_id IS NOT NULL THEN
      -- Find the credit account
      SELECT id INTO v_credit_account_id
      FROM public.credits
      WHERE student_id = v_student_id AND teacher_id = v_teacher_id AND is_active = TRUE;
      
      IF v_credit_account_id IS NOT NULL THEN
        -- Calculate hours to deduct (1 hour by default, or use class duration)
        v_class_duration := COALESCE(NEW.duration_minutes, 0) / 60.0;
        v_hours_to_deduct := GREATEST(1, ROUND(v_class_duration, 2)); -- At least 1 hour, rounded to 2 decimals
        
        -- Create description
        v_description := 'Class completed: ' || COALESCE(NEW.content, 'No description');
        IF LENGTH(v_description) > 255 THEN
          v_description := SUBSTRING(v_description, 1, 252) || '...';
        END IF;
        
        -- Perform the credit deduction
        BEGIN
          PERFORM public.manage_credit_transaction(
            v_credit_account_id,
            'deduction',
            v_hours_to_deduct,
            v_description,
            NEW.id,
            'class_log',
            v_teacher_id
          );
        EXCEPTION WHEN OTHERS THEN
          -- Log error but don't prevent class completion
          RAISE NOTICE 'Failed to deduct credits: %', SQLERRM;
        END;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS class_completion_trigger ON public.class_logs;
CREATE TRIGGER class_completion_trigger
AFTER UPDATE ON public.class_logs
FOR EACH ROW
EXECUTE FUNCTION public.handle_class_completion();