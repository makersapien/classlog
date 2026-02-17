-- =====================================================
-- INTERACTIVE CALENDAR BOOKING SYSTEM - COMPLETE MIGRATION
-- =====================================================
-- Copy and paste this entire script into Supabase SQL Editor
-- Execute it all at once or run each section separately

-- =====================================================
-- SECTION 1: Add Assignment Fields to schedule_slots
-- =====================================================

-- Add new columns to existing schedule_slots table
ALTER TABLE public.schedule_slots 
ADD COLUMN IF NOT EXISTS assigned_student_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_student_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS assignment_expiry TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS assignment_status VARCHAR(20) DEFAULT NULL CHECK (assignment_status IN ('pending', 'confirmed', 'declined', 'expired') OR assignment_status IS NULL);

-- Update the status constraint to include 'assigned'
ALTER TABLE public.schedule_slots 
DROP CONSTRAINT IF EXISTS schedule_slots_status_check;

ALTER TABLE public.schedule_slots 
ADD CONSTRAINT schedule_slots_status_check 
CHECK (status IN ('unavailable', 'available', 'assigned', 'booked', 'cancelled', 'completed'));

-- =====================================================
-- SECTION 2: Create slot_assignments Table
-- =====================================================

-- Create the slot assignments tracking table
CREATE TABLE IF NOT EXISTS public.slot_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_ids UUID[] NOT NULL,
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

-- =====================================================
-- SECTION 3: Create Indexes for Performance
-- =====================================================

-- Indexes for schedule_slots new columns
CREATE INDEX IF NOT EXISTS idx_schedule_slots_assigned_student ON public.schedule_slots(assigned_student_id);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_assignment_status ON public.schedule_slots(assignment_status);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_assignment_expiry ON public.schedule_slots(assignment_expiry);

-- Indexes for slot_assignments table
CREATE INDEX IF NOT EXISTS idx_slot_assignments_teacher ON public.slot_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_slot_assignments_student ON public.slot_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_slot_assignments_status ON public.slot_assignments(status);
CREATE INDEX IF NOT EXISTS idx_slot_assignments_expires_at ON public.slot_assignments(expires_at);

-- =====================================================
-- SECTION 4: Enable Row Level Security
-- =====================================================

-- Enable RLS on slot_assignments table
ALTER TABLE public.slot_assignments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SECTION 5: Create RLS Policies
-- =====================================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS slot_assignments_teacher_policy ON public.slot_assignments;
DROP POLICY IF EXISTS slot_assignments_student_policy ON public.slot_assignments;
DROP POLICY IF EXISTS slot_assignments_student_update_policy ON public.slot_assignments;
DROP POLICY IF EXISTS slot_assignments_parent_policy ON public.slot_assignments;
DROP POLICY IF EXISTS slot_assignments_parent_update_policy ON public.slot_assignments;

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

-- =====================================================
-- SECTION 6: Create Trigger Function
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_slot_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS update_slot_assignments_updated_at_trigger ON public.slot_assignments;
CREATE TRIGGER update_slot_assignments_updated_at_trigger
BEFORE UPDATE ON public.slot_assignments
FOR EACH ROW
EXECUTE FUNCTION update_slot_assignments_updated_at();

-- =====================================================
-- SECTION 7: Create Utility Functions
-- =====================================================

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
  action TEXT
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

-- =====================================================
-- SECTION 8: Grant Permissions
-- =====================================================

-- Grant execute permission on functions
GRANT EXECUTE ON FUNCTION confirm_slot_assignment(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION expire_slot_assignments() TO authenticated;

-- =====================================================
-- SECTION 9: Verification Queries (Optional)
-- =====================================================

-- Uncomment these to verify the migration worked:

-- Check if new columns exist
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'schedule_slots' 
-- AND column_name IN ('assigned_student_id', 'assigned_student_name', 'assignment_expiry', 'assignment_status');

-- Check if slot_assignments table exists
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'slot_assignments';

-- Check if functions exist
-- SELECT routine_name FROM information_schema.routines 
-- WHERE routine_name IN ('confirm_slot_assignment', 'expire_slot_assignments');

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
-- Your database is now ready for interactive calendar booking!
-- 
-- Next steps:
-- 1. Test the new API endpoints
-- 2. Implement drag-and-drop UI components  
-- 3. Build student assignment workflows
-- =====================================================