-- Migration: Add payment tracking fields to class_logs table
-- This migration adds the necessary fields to track credit deductions and payment status for each class

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