-- Create notifications table for in-app notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_role VARCHAR(20) NOT NULL CHECK (user_role IN ('teacher', 'student', 'parent')),
  type VARCHAR(50) NOT NULL CHECK (type IN ('booking_created', 'booking_cancelled', 'class_reminder', 'system', 'booking_activity')),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  data JSONB,
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_notifications_user_role ON notifications(user_id, user_role);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own notifications
CREATE POLICY notifications_user_policy ON notifications
  FOR ALL USING (user_id = auth.uid());

-- Function to create booking notifications
CREATE OR REPLACE FUNCTION create_booking_notification(
  p_user_id UUID,
  p_user_role VARCHAR,
  p_type VARCHAR,
  p_title VARCHAR,
  p_message TEXT,
  p_priority VARCHAR DEFAULT 'medium',
  p_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id,
    user_role,
    type,
    title,
    message,
    priority,
    data
  ) VALUES (
    p_user_id,
    p_user_role,
    p_type,
    p_title,
    p_message,
    p_priority,
    p_data
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old notifications (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notifications 
  WHERE created_at < NOW() - INTERVAL '30 days'
  AND read = true;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create notification preferences table
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_role VARCHAR(20) NOT NULL CHECK (user_role IN ('teacher', 'student', 'parent')),
  email_booking_confirmation BOOLEAN DEFAULT true,
  email_booking_cancellation BOOLEAN DEFAULT true,
  email_class_reminders BOOLEAN DEFAULT true,
  email_weekly_summary BOOLEAN DEFAULT false,
  inapp_booking_activity BOOLEAN DEFAULT true,
  inapp_class_reminders BOOLEAN DEFAULT true,
  inapp_system_notifications BOOLEAN DEFAULT true,
  reminder_24h_enabled BOOLEAN DEFAULT true,
  reminder_1h_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, user_role)
);

-- Create indexes for notification preferences
CREATE INDEX idx_notification_preferences_user ON notification_preferences(user_id, user_role);

-- Enable RLS for notification preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for notification preferences
CREATE POLICY notification_preferences_user_policy ON notification_preferences
  FOR ALL USING (user_id = auth.uid());

-- Create trigger to update updated_at for notification preferences
CREATE TRIGGER trigger_update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();