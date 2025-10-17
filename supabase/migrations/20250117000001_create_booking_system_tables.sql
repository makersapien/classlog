-- Create additional tables for the class booking system
-- This migration extends the existing schedule_slots table with supporting tables

-- 1. Share Tokens Table for student booking links
CREATE TABLE IF NOT EXISTS public.share_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token VARCHAR(64) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  access_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 year'),
  CONSTRAINT unique_active_student_teacher UNIQUE (student_id, teacher_id, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- 2. Time Slots Table for recurring availability patterns (complements schedule_slots)
CREATE TABLE IF NOT EXISTS public.time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week VARCHAR(10) NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
  start_time TIME WITHOUT TIME ZONE NOT NULL,
  end_time TIME WITHOUT TIME ZONE NOT NULL,
  is_available BOOLEAN DEFAULT true,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_end_date DATE,
  subject VARCHAR(100),
  duration_minutes INTEGER DEFAULT 60,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_time_range_slots CHECK (start_time < end_time),
  CONSTRAINT valid_duration_slots CHECK (duration_minutes > 0 AND duration_minutes <= 480)
);

-- 3. Bookings Table for tracking individual bookings (extends schedule_slots functionality)
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  schedule_slot_id UUID REFERENCES public.schedule_slots(id) ON DELETE CASCADE,
  time_slot_id UUID REFERENCES public.time_slots(id) ON DELETE SET NULL,
  booking_date DATE NOT NULL,
  start_time TIME WITHOUT TIME ZONE NOT NULL,
  end_time TIME WITHOUT TIME ZONE NOT NULL,
  status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')),
  booked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  cancellation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_booking_time_range CHECK (start_time < end_time),
  CONSTRAINT valid_booking_date CHECK (booking_date >= CURRENT_DATE)
);

-- 4. Blocked Slots Table for teacher busy periods
CREATE TABLE IF NOT EXISTS public.blocked_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week VARCHAR(10) CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
  start_time TIME WITHOUT TIME ZONE NOT NULL,
  end_time TIME WITHOUT TIME ZONE NOT NULL,
  date DATE, -- for one-time blocks
  is_recurring BOOLEAN DEFAULT false,
  reason VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_blocked_time_range CHECK (start_time < end_time),
  CONSTRAINT blocked_slot_date_or_day CHECK (
    (date IS NOT NULL AND day_of_week IS NULL) OR 
    (date IS NULL AND day_of_week IS NOT NULL)
  )
);

-- 5. Student Color Themes Table for booking portal customization
CREATE TABLE IF NOT EXISTS public.student_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  color_theme VARCHAR(20) DEFAULT 'blue' CHECK (color_theme IN ('red', 'blue', 'purple', 'amber', 'emerald', 'pink', 'indigo', 'teal')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_student_teacher_theme UNIQUE (student_id, teacher_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_share_tokens_token ON public.share_tokens(token) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_share_tokens_student_teacher ON public.share_tokens(student_id, teacher_id);
CREATE INDEX IF NOT EXISTS idx_share_tokens_expires ON public.share_tokens(expires_at) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_time_slots_teacher_day ON public.time_slots(teacher_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_time_slots_available ON public.time_slots(is_available) WHERE is_available = true;

CREATE INDEX IF NOT EXISTS idx_bookings_teacher_date ON public.bookings(teacher_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_student_date ON public.bookings(student_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_schedule_slot ON public.bookings(schedule_slot_id);

CREATE INDEX IF NOT EXISTS idx_blocked_slots_teacher_date ON public.blocked_slots(teacher_id, date);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_teacher_day ON public.blocked_slots(teacher_id, day_of_week);

CREATE INDEX IF NOT EXISTS idx_student_themes_student_teacher ON public.student_themes(student_id, teacher_id);

-- Add RLS policies for all new tables

-- Share Tokens policies
ALTER TABLE public.share_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY share_tokens_teacher_policy ON public.share_tokens
  FOR ALL
  USING (auth.uid() = teacher_id);

CREATE POLICY share_tokens_student_policy ON public.share_tokens
  FOR SELECT
  USING (auth.uid() = student_id AND is_active = true);

-- Time Slots policies
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY time_slots_teacher_policy ON public.time_slots
  FOR ALL
  USING (auth.uid() = teacher_id);

CREATE POLICY time_slots_view_policy ON public.time_slots
  FOR SELECT
  USING (is_available = true);

-- Bookings policies
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY bookings_teacher_policy ON public.bookings
  FOR ALL
  USING (auth.uid() = teacher_id);

CREATE POLICY bookings_student_policy ON public.bookings
  FOR ALL
  USING (auth.uid() = student_id);

CREATE POLICY bookings_parent_policy ON public.bookings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = bookings.student_id 
      AND profiles.parent_id = auth.uid()
    )
  );

-- Blocked Slots policies
ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY blocked_slots_teacher_policy ON public.blocked_slots
  FOR ALL
  USING (auth.uid() = teacher_id);

-- Student Themes policies
ALTER TABLE public.student_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY student_themes_teacher_policy ON public.student_themes
  FOR ALL
  USING (auth.uid() = teacher_id);

CREATE POLICY student_themes_student_policy ON public.student_themes
  FOR SELECT
  USING (auth.uid() = student_id);

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_time_slots_updated_at
  BEFORE UPDATE ON public.time_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_themes_updated_at
  BEFORE UPDATE ON public.student_themes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Database functions for booking operations

-- Function to generate secure share tokens
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to create or update share token for a student
CREATE OR REPLACE FUNCTION create_share_token(
  p_student_id UUID,
  p_teacher_id UUID
)
RETURNS TEXT AS $$
DECLARE
  v_token TEXT;
  v_existing_token TEXT;
BEGIN
  -- Check if active token already exists
  SELECT token INTO v_existing_token
  FROM share_tokens
  WHERE student_id = p_student_id 
    AND teacher_id = p_teacher_id 
    AND is_active = true
    AND expires_at > NOW();
  
  IF v_existing_token IS NOT NULL THEN
    RETURN v_existing_token;
  END IF;
  
  -- Deactivate any existing tokens
  UPDATE share_tokens 
  SET is_active = false 
  WHERE student_id = p_student_id 
    AND teacher_id = p_teacher_id 
    AND is_active = true;
  
  -- Generate new token
  v_token := generate_share_token();
  
  -- Insert new token
  INSERT INTO share_tokens (student_id, teacher_id, token, is_active, expires_at)
  VALUES (p_student_id, p_teacher_id, v_token, true, NOW() + INTERVAL '1 year');
  
  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate share token and get student info
CREATE OR REPLACE FUNCTION validate_share_token(p_token TEXT)
RETURNS TABLE (
  student_id UUID,
  teacher_id UUID,
  student_name TEXT,
  teacher_name TEXT,
  is_valid BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    st.student_id,
    st.teacher_id,
    sp.full_name as student_name,
    tp.full_name as teacher_name,
    (st.is_active AND st.expires_at > NOW()) as is_valid
  FROM share_tokens st
  JOIN profiles sp ON sp.id = st.student_id
  JOIN profiles tp ON tp.id = st.teacher_id
  WHERE st.token = p_token;
  
  -- Update access count if token is valid
  UPDATE share_tokens 
  SET access_count = access_count + 1,
      last_accessed = NOW()
  WHERE token = p_token 
    AND is_active = true 
    AND expires_at > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create recurring time slots
CREATE OR REPLACE FUNCTION create_recurring_slots(
  p_teacher_id UUID,
  p_day_of_week TEXT,
  p_start_time TIME,
  p_end_time TIME,
  p_weeks INTEGER DEFAULT 4,
  p_subject TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_current_date DATE;
  v_end_date DATE;
  v_day_number INTEGER;
BEGIN
  -- Convert day name to number (0 = Sunday, 1 = Monday, etc.)
  v_day_number := CASE p_day_of_week
    WHEN 'Sunday' THEN 0
    WHEN 'Monday' THEN 1
    WHEN 'Tuesday' THEN 2
    WHEN 'Wednesday' THEN 3
    WHEN 'Thursday' THEN 4
    WHEN 'Friday' THEN 5
    WHEN 'Saturday' THEN 6
  END;
  
  -- Find the next occurrence of the specified day
  v_current_date := CURRENT_DATE + (v_day_number - EXTRACT(DOW FROM CURRENT_DATE))::INTEGER;
  IF v_current_date <= CURRENT_DATE THEN
    v_current_date := v_current_date + INTERVAL '7 days';
  END IF;
  
  v_end_date := v_current_date + (p_weeks * INTERVAL '7 days');
  
  -- Create schedule slots for each week
  WHILE v_current_date < v_end_date LOOP
    INSERT INTO schedule_slots (
      teacher_id, 
      date, 
      start_time, 
      end_time, 
      status, 
      subject,
      is_recurring,
      duration_minutes
    )
    VALUES (
      p_teacher_id,
      v_current_date,
      p_start_time,
      p_end_time,
      'available',
      p_subject,
      true,
      EXTRACT(EPOCH FROM (p_end_time - p_start_time)) / 60
    );
    
    v_count := v_count + 1;
    v_current_date := v_current_date + INTERVAL '7 days';
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check for booking conflicts
CREATE OR REPLACE FUNCTION check_booking_conflict(
  p_teacher_id UUID,
  p_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_conflict_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_conflict_count
  FROM bookings b
  WHERE b.teacher_id = p_teacher_id
    AND b.booking_date = p_date
    AND b.status IN ('confirmed', 'completed')
    AND (p_exclude_booking_id IS NULL OR b.id != p_exclude_booking_id)
    AND (
      (p_start_time >= b.start_time AND p_start_time < b.end_time) OR
      (p_end_time > b.start_time AND p_end_time <= b.end_time) OR
      (p_start_time <= b.start_time AND p_end_time >= b.end_time)
    );
  
  RETURN v_conflict_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;