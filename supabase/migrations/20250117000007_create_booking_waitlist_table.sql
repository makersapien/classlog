-- Create booking waitlist table for managing waiting lists for popular time slots
CREATE TABLE booking_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  schedule_slot_id UUID REFERENCES schedule_slots(id) ON DELETE SET NULL,
  time_slot_id UUID REFERENCES time_slots(id) ON DELETE SET NULL,
  preferred_date DATE,
  day_of_week VARCHAR(10),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  priority INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'expired', 'fulfilled')),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  notified_at TIMESTAMP,
  fulfilled_at TIMESTAMP,
  notes TEXT
);

-- Create indexes for efficient querying
CREATE INDEX idx_booking_waitlist_teacher_status ON booking_waitlist(teacher_id, status);
CREATE INDEX idx_booking_waitlist_student_status ON booking_waitlist(student_id, status);
CREATE INDEX idx_booking_waitlist_time_slot ON booking_waitlist(day_of_week, start_time, end_time, status);
CREATE INDEX idx_booking_waitlist_schedule_slot ON booking_waitlist(schedule_slot_id, status);
CREATE INDEX idx_booking_waitlist_expires_at ON booking_waitlist(expires_at) WHERE status = 'notified';
CREATE INDEX idx_booking_waitlist_priority_created ON booking_waitlist(priority DESC, created_at ASC) WHERE status = 'waiting';

-- Add RLS policies
ALTER TABLE booking_waitlist ENABLE ROW LEVEL SECURITY;

-- Teachers can manage waitlist for their slots
CREATE POLICY waitlist_teacher_policy ON booking_waitlist
  FOR ALL USING (auth.uid() = teacher_id);

-- Students can view and manage their own waitlist entries
CREATE POLICY waitlist_student_policy ON booking_waitlist
  FOR ALL USING (auth.uid() = student_id);

-- Function to automatically expire old waitlist entries
CREATE OR REPLACE FUNCTION expire_old_waitlist_entries()
RETURNS void AS $$
BEGIN
  UPDATE booking_waitlist 
  SET status = 'expired'
  WHERE status = 'notified' 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to notify next person in waitlist when a slot becomes available
CREATE OR REPLACE FUNCTION notify_next_in_waitlist(
  p_teacher_id UUID,
  p_day_of_week VARCHAR(10),
  p_start_time TIME,
  p_end_time TIME,
  p_preferred_date DATE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  next_waitlist_id UUID;
BEGIN
  -- Find the next person in line
  SELECT id INTO next_waitlist_id
  FROM booking_waitlist
  WHERE teacher_id = p_teacher_id
    AND day_of_week = p_day_of_week
    AND start_time = p_start_time
    AND end_time = p_end_time
    AND status = 'waiting'
    AND (p_preferred_date IS NULL OR preferred_date = p_preferred_date)
  ORDER BY priority DESC, created_at ASC
  LIMIT 1;

  -- If someone is waiting, notify them
  IF next_waitlist_id IS NOT NULL THEN
    UPDATE booking_waitlist
    SET status = 'notified',
        notified_at = NOW(),
        expires_at = NOW() + INTERVAL '24 hours'
    WHERE id = next_waitlist_id;
  END IF;

  RETURN next_waitlist_id;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up fulfilled/expired waitlist entries (run periodically)
CREATE OR REPLACE FUNCTION cleanup_waitlist_entries()
RETURNS void AS $$
BEGIN
  -- Remove expired entries older than 30 days
  DELETE FROM booking_waitlist
  WHERE status IN ('expired', 'fulfilled')
    AND created_at < NOW() - INTERVAL '30 days';
    
  -- Expire old notified entries
  UPDATE booking_waitlist
  SET status = 'expired'
  WHERE status = 'notified'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically notify next in waitlist when a booking is cancelled
CREATE OR REPLACE FUNCTION handle_booking_cancellation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if booking was cancelled
  IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
    -- Get the day of week from the booking date
    PERFORM notify_next_in_waitlist(
      NEW.teacher_id,
      TO_CHAR(NEW.booking_date::date, 'Day'),
      NEW.start_time,
      NEW.end_time,
      NEW.booking_date::date
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for booking cancellations
CREATE TRIGGER booking_cancellation_waitlist_trigger
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION handle_booking_cancellation();

-- Trigger to automatically notify next in waitlist when a schedule slot becomes available
CREATE OR REPLACE FUNCTION handle_schedule_slot_availability()
RETURNS TRIGGER AS $$
DECLARE
  slot_day_of_week VARCHAR(10);
BEGIN
  -- Only process if slot became available
  IF OLD.status != 'available' AND NEW.status = 'available' THEN
    -- Get day of week from date
    slot_day_of_week := TO_CHAR(NEW.date::date, 'Day');
    
    PERFORM notify_next_in_waitlist(
      NEW.teacher_id,
      TRIM(slot_day_of_week),
      NEW.start_time,
      NEW.end_time,
      NEW.date::date
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for schedule slot availability
CREATE TRIGGER schedule_slot_availability_waitlist_trigger
  AFTER UPDATE ON schedule_slots
  FOR EACH ROW
  EXECUTE FUNCTION handle_schedule_slot_availability();

-- Add comments for documentation
COMMENT ON TABLE booking_waitlist IS 'Manages waiting lists for popular time slots when they are fully booked';
COMMENT ON COLUMN booking_waitlist.priority IS 'Higher priority numbers get notified first (default 1, can be increased for VIP students)';
COMMENT ON COLUMN booking_waitlist.status IS 'Current status: waiting (in queue), notified (slot available), expired (notification expired), fulfilled (booked the slot)';
COMMENT ON FUNCTION notify_next_in_waitlist IS 'Automatically notifies the next person in waitlist when a slot becomes available';
COMMENT ON FUNCTION cleanup_waitlist_entries IS 'Periodic cleanup function to remove old waitlist entries';