-- Migration: Update class completion trigger to use new credit deduction function
-- This replaces the existing trigger with one that uses our new payment tracking fields

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

-- Add a manual trigger function for processing existing completed classes
CREATE OR REPLACE FUNCTION public.process_existing_completed_classes()
RETURNS TABLE (
  class_log_id UUID,
  processing_result JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  v_class_record RECORD;
  v_result JSONB;
BEGIN
  -- Process all completed classes that haven't had credits deducted yet
  FOR v_class_record IN
    SELECT id, student_id, teacher_id, status, credits_deducted
    FROM public.class_logs
    WHERE status = 'completed'
      AND COALESCE(credits_deducted, 0) = 0
      AND student_id IS NOT NULL
      AND teacher_id IS NOT NULL
  LOOP
    BEGIN
      -- Process credit deduction for this class
      SELECT public.process_class_credit_deduction(v_class_record.id) INTO v_result;
      
      -- Return the result
      class_log_id := v_class_record.id;
      processing_result := v_result;
      RETURN NEXT;
      
    EXCEPTION WHEN OTHERS THEN
      -- Return error result
      class_log_id := v_class_record.id;
      processing_result := jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'class_log_id', v_class_record.id
      );
      RETURN NEXT;
    END;
  END LOOP;
END;
$;

-- Add comments for documentation
COMMENT ON FUNCTION public.handle_class_completion() IS 'Updated trigger function that uses the new credit deduction system with payment tracking';
COMMENT ON FUNCTION public.process_existing_completed_classes() IS 'Helper function to process credit deductions for existing completed classes';