-- Create schedule_slots table with comprehensive schema
CREATE TABLE IF NOT EXISTS public.schedule_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME WITHOUT TIME ZONE NOT NULL,
  end_time TIME WITHOUT TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  title VARCHAR(255),
  description TEXT,
  subject VARCHAR(100),
  max_students INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'booked', 'cancelled', 'completed')),
  booked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  booked_at TIMESTAMP WITH TIME ZONE,
  google_meet_url VARCHAR(500),
  meeting_notes TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_type VARCHAR(20) CHECK (recurrence_type IN ('daily', 'weekly', 'monthly') OR recurrence_type IS NULL),
  recurrence_end_date DATE,
  parent_slot_id UUID REFERENCES public.schedule_slots(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_max_students CHECK (max_students > 0 AND max_students <= 10),
  CONSTRAINT valid_time_range CHECK (start_time < end_time),
  CONSTRAINT valid_duration CHECK (duration_minutes > 0 AND duration_minutes <= 480)
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_schedule_slots_teacher_date ON public.schedule_slots(teacher_id, date);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_status ON public.schedule_slots(status);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_booked_by ON public.schedule_slots(booked_by);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_recurring ON public.schedule_slots(is_recurring, parent_slot_id);

-- Add RLS policies
ALTER TABLE public.schedule_slots ENABLE ROW LEVEL SECURITY;

-- Teachers can see and manage their own slots
CREATE POLICY schedule_slots_teacher_policy ON public.schedule_slots
  FOR ALL
  USING (auth.uid() = teacher_id);

-- Students can see slots they've booked or available slots
CREATE POLICY schedule_slots_student_policy ON public.schedule_slots
  FOR SELECT
  USING (
    (auth.uid() = booked_by) OR 
    (status = 'available')
  );

-- Parents can see slots booked by their children or available slots
CREATE POLICY schedule_slots_parent_policy ON public.schedule_slots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = schedule_slots.booked_by 
      AND profiles.parent_id = auth.uid()
    ) OR 
    (status = 'available')
  );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_schedule_slots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_schedule_slots_updated_at_trigger
BEFORE UPDATE ON public.schedule_slots
FOR EACH ROW
EXECUTE FUNCTION update_schedule_slots_updated_at();