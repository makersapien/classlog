-- Enhanced Interactive Calendar Booking System Schema
-- Migration: 20250123000001_create_interactive_calendar_schema.sql
-- This migration adds interactive drag-and-drop assignment features to the existing booking system

-- Add assignment fields to existing schedule_slots table (additive enhancement)
ALTER TABLE public.schedule_slots 
ADD COLUMN IF NOT EXISTS assigned_student_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_student_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS assignment_expiry TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS assignment_status VARCHAR(20) DEFAULT NULL CHECK (assignment_status IN ('pending', 'confirmed', 'declined', 'expired') OR assignment_status IS NULL);

-- Update the status enum to include 'assigned' (extends existing enum)
ALTER TABLE public.schedule_slots 
DROP CONSTRAINT IF EXISTS schedule_slots_status_check;

ALTER TABLE public.schedule_slots 
ADD CONSTRAINT schedule_slots_status_check 
CHECK (status IN ('unavailable', 'available', 'assigned', 'booked', 'cancelled', 'completed'));

-- Create slot_assignments table for tracking pending assignments
CREATE TABLE IF NOT EXISTS public.slot_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_ids UUID[] NOT NULL, -- Array of slot IDs being assigned
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_name VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined', 'expired')),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  declined_at TIMESTAMP WITH TIME ZONE,
  expired_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_expiry CHECK (expires_at > assigned_at),
  CONSTRAINT valid_confirmation CHECK (
    (status = 'confirmed' AND confirmed_at IS NOT NULL) OR
    (status = 'declined' AND declined_at IS NOT NULL) OR
    (status = 'expired' AND expired_at IS NOT NULL) OR
    (status = 'pending' AND confirmed_at IS NULL AND declined_at IS NULL AND expired_at IS NULL)
  )
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_schedule_slots_assigned_student ON public.schedule_slots(assigned_student_id);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_assignment_status ON public.schedule_slots(assignment_status);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_assignment_expiry ON public.schedule_slots(assignment_expiry);

CREATE INDEX IF NOT EXISTS idx_slot_assignments_teacher ON public.slot_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_slot_assignments_student ON public.slot_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_slot_assignments_status ON public.slot_assignments(status);
CREATE INDEX IF NOT EXISTS idx_slot_assignments_expires_at ON public.slot_assignments(expires_at);

-- Add RLS policies for slot_assignments
ALTER TABLE public.slot_assignments ENABLE ROW LEVEL SECURITY;

-- Teachers can see and manage their own assignments
CREATE POLICY slot_assignments_teacher_policy ON public.slot_assignments
  FOR ALL
  USING (auth.uid() = teacher_id);

-- Students can see assignments made to them
CREATE POLICY slot_assignments_student_policy ON public.slot_assignments
  FOR SELECT
  USING (auth.uid() = student_id);

-- Students can update their own assignments (confirm/decline)
CREATE POLICY slot_assignments_student_update_policy ON public.slot_assignments
  FOR UPDATE
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id AND status IN ('confirmed', 'declined'));

-- Parents can see assignments made to their children
CREATE POLICY slot_assignments_parent_policy ON public.slot_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = slot_assignments.student_id 
      AND profiles.parent_id = auth.uid()
    )
  );

-- Parents can update assignments for their children (confirm/decline)
CREATE POLICY slot_assignments_parent_update_policy ON public.slot_assignments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = slot_assignments.student_id 
      AND profiles.parent_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = slot_assignments.student_id 
      AND profiles.parent_id = auth.uid()
    ) AND status IN ('confirmed', 'declined')
  );

-- Add trigger to update updated_at timestamp for slot_assignments
CREATE OR REPLACE FUNCTION update_slot_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_slot_assignments_updated_at_trigger
BEFORE UPDATE ON public.slot_assignments
FOR EACH ROW
EXECUTE FUNCTION update_slot_assignments_updated_at();

-- Function to automatically expire assignments
CREATE OR REPLACE FUNCTION expire_slot_assignments()
RETURNS void AS $$
BEGIN
  -- Update expired assignments
  UPDATE public.slot_assignments 
  SET 
    status = 'expired',
    expired_at = NOW(),
    updated_at = NOW()
  WHERE 
    status = 'pending' 
    AND expires_at < NOW();
    
  -- Update corresponding schedule slots to available
  UPDATE public.schedule_slots 
  SET 
    status = 'available',
    assigned_student_id = NULL,
    assigned_student_name = NULL,
    assignment_expiry = NULL,
    assignment_status = NULL,
    updated_at = NOW()
  WHERE 
    assignment_status = 'pending'
    AND assignment_expiry < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to handle assignment confirmation
CREATE OR REPLACE FUNCTION confirm_slot_assignment(
  assignment_id UUID,
  action TEXT -- 'confirm' or 'decline'
)
RETURNS JSON AS $$
DECLARE
  assignment_record public.slot_assignments%ROWTYPE;
  slot_id UUID;
  result JSON;
BEGIN
  -- Get the assignment record
  SELECT * INTO assignment_record
  FROM public.slot_assignments
  WHERE id = assignment_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Assignment not found or already processed');
  END IF;
  
  -- Check if assignment has expired
  IF assignment_record.expires_at < NOW() THEN
    RETURN json_build_object('success', false, 'error', 'Assignment has expired');
  END IF;
  
  IF action = 'confirm' THEN
    -- Update assignment status
    UPDATE public.slot_assignments 
    SET 
      status = 'confirmed',
      confirmed_at = NOW(),
      updated_at = NOW()
    WHERE id = assignment_id;
    
    -- Convert assigned slots to booked status
    UPDATE public.schedule_slots 
    SET 
      status = 'booked',
      booked_by = assignment_record.student_id,
      booked_at = NOW(),
      assignment_status = 'confirmed',
      updated_at = NOW()
    WHERE id = ANY(assignment_record.slot_ids);
    
    result := json_build_object(
      'success', true, 
      'message', 'Assignment confirmed successfully',
      'slots_booked', array_length(assignment_record.slot_ids, 1)
    );
    
  ELSIF action = 'decline' THEN
    -- Update assignment status
    UPDATE public.slot_assignments 
    SET 
      status = 'declined',
      declined_at = NOW(),
      updated_at = NOW()
    WHERE id = assignment_id;
    
    -- Return slots to available status
    UPDATE public.schedule_slots 
    SET 
      status = 'available',
      assigned_student_id = NULL,
      assigned_student_name = NULL,
      assignment_expiry = NULL,
      assignment_status = NULL,
      updated_at = NOW()
    WHERE id = ANY(assignment_record.slot_ids);
    
    result := json_build_object(
      'success', true, 
      'message', 'Assignment declined successfully',
      'slots_released', array_length(assignment_record.slot_ids, 1)
    );
    
  ELSE
    RETURN json_build_object('success', false, 'error', 'Invalid action. Use "confirm" or "decline"');
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION confirm_slot_assignment(UUID, TEXT) TO authenticated;