-- Create teacher privacy settings table for GDPR compliance and privacy controls
-- This migration adds privacy management features for teachers

-- 1. Teacher Privacy Settings Table
CREATE TABLE IF NOT EXISTS public.teacher_privacy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hide_student_names_in_calendar BOOLEAN DEFAULT false,
  allow_student_notes BOOLEAN DEFAULT true,
  share_booking_analytics BOOLEAN DEFAULT false,
  data_retention_days INTEGER DEFAULT 2555, -- 7 years default
  require_booking_confirmation BOOLEAN DEFAULT false,
  allow_late_cancellations BOOLEAN DEFAULT false,
  auto_delete_expired_tokens BOOLEAN DEFAULT true,
  anonymize_old_audit_logs BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_teacher_privacy_settings UNIQUE (teacher_id),
  CONSTRAINT valid_retention_days CHECK (data_retention_days > 0 AND data_retention_days <= 3650)
);

-- 2. Data Processing Requests Table for GDPR compliance
CREATE TABLE IF NOT EXISTS public.data_processing_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('export', 'delete', 'anonymize', 'rectify')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  requested_by UUID NOT NULL REFERENCES public.profiles(id),
  request_details JSONB,
  processing_notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_teacher_privacy_settings_teacher ON public.teacher_privacy_settings(teacher_id);
CREATE INDEX IF NOT EXISTS idx_data_processing_requests_student_teacher ON public.data_processing_requests(student_id, teacher_id);
CREATE INDEX IF NOT EXISTS idx_data_processing_requests_status ON public.data_processing_requests(status);
CREATE INDEX IF NOT EXISTS idx_data_processing_requests_type ON public.data_processing_requests(request_type);

-- Add RLS policies for privacy settings

-- Teacher Privacy Settings policies
ALTER TABLE public.teacher_privacy_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY teacher_privacy_settings_owner_policy ON public.teacher_privacy_settings
  FOR ALL
  USING (auth.uid() = teacher_id);

-- Data Processing Requests policies
ALTER TABLE public.data_processing_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY data_processing_requests_student_policy ON public.data_processing_requests
  FOR ALL
  USING (auth.uid() = student_id OR auth.uid() = requested_by);

CREATE POLICY data_processing_requests_teacher_policy ON public.data_processing_requests
  FOR ALL
  USING (auth.uid() = teacher_id);

CREATE POLICY data_processing_requests_admin_policy ON public.data_processing_requests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Add trigger for updated_at timestamps
CREATE TRIGGER update_teacher_privacy_settings_updated_at
  BEFORE UPDATE ON public.teacher_privacy_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_processing_requests_updated_at
  BEFORE UPDATE ON public.data_processing_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enhanced privacy functions

-- Function to export student data for GDPR compliance
CREATE OR REPLACE FUNCTION export_student_data(
  p_student_id UUID,
  p_teacher_id UUID,
  p_requested_by UUID
)
RETURNS JSON AS $
DECLARE
  v_export_data JSON;
  v_request_id UUID;
BEGIN
  -- Verify the requester has permission
  IF p_requested_by != p_student_id AND p_requested_by != p_teacher_id THEN
    -- Check if requester is parent or admin
    IF NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = p_requested_by 
      AND (role = 'admin' OR (role = 'parent' AND EXISTS (
        SELECT 1 FROM profiles child 
        WHERE child.id = p_student_id AND child.parent_id = p_requested_by
      )))
    ) THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Insufficient permissions to export data',
        'code', 'PERMISSION_DENIED'
      );
    END IF;
  END IF;
  
  -- Create data processing request
  INSERT INTO data_processing_requests (
    student_id, teacher_id, request_type, requested_by, status
  )
  VALUES (p_student_id, p_teacher_id, 'export', p_requested_by, 'processing')
  RETURNING id INTO v_request_id;
  
  -- Collect all student data
  SELECT json_build_object(
    'personal_data', json_build_object(
      'profile', (
        SELECT json_build_object(
          'id', id,
          'full_name', full_name,
          'email', email,
          'grade', grade,
          'subject', subject,
          'created_at', created_at
        )
        FROM profiles 
        WHERE id = p_student_id
      ),
      'bookings', (
        SELECT COALESCE(json_agg(
          json_build_object(
            'id', id,
            'booking_date', booking_date,
            'start_time', start_time,
            'end_time', end_time,
            'status', status,
            'notes', notes,
            'created_at', created_at
          )
        ), '[]'::json)
        FROM bookings 
        WHERE student_id = p_student_id AND teacher_id = p_teacher_id
      ),
      'share_tokens', (
        SELECT COALESCE(json_agg(
          json_build_object(
            'created_at', created_at,
            'expires_at', expires_at,
            'access_count', access_count,
            'last_accessed', last_accessed,
            'is_active', is_active
          )
        ), '[]'::json)
        FROM share_tokens 
        WHERE student_id = p_student_id AND teacher_id = p_teacher_id
      ),
      'audit_logs', (
        SELECT COALESCE(json_agg(
          json_build_object(
            'action', action,
            'timestamp', timestamp,
            'client_info', CASE 
              WHEN client_info IS NOT NULL THEN json_build_object(
                'userAgent', 'anonymized',
                'ipAddress', 'anonymized',
                'timestamp', (client_info->>'timestamp')
              )
              ELSE NULL
            END
          )
        ), '[]'::json)
        FROM token_audit_logs 
        WHERE student_id = p_student_id AND teacher_id = p_teacher_id
      )
    ),
    'metadata', json_build_object(
      'export_date', NOW(),
      'request_id', v_request_id,
      'data_retention_period', '7 years from last activity',
      'contact_info', 'privacy@classlogger.com'
    )
  ) INTO v_export_data;
  
  -- Mark request as completed
  UPDATE data_processing_requests 
  SET status = 'completed', completed_at = NOW()
  WHERE id = v_request_id;
  
  RETURN json_build_object(
    'success', true,
    'request_id', v_request_id,
    'data', v_export_data
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Mark request as failed
    UPDATE data_processing_requests 
    SET status = 'failed', processing_notes = SQLERRM
    WHERE id = v_request_id;
    
    RETURN json_build_object(
      'success', false,
      'error', 'Data export failed',
      'details', SQLERRM
    );
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete/anonymize student data for GDPR compliance
CREATE OR REPLACE FUNCTION delete_student_data(
  p_student_id UUID,
  p_teacher_id UUID,
  p_requested_by UUID,
  p_delete_bookings BOOLEAN DEFAULT false,
  p_anonymize_only BOOLEAN DEFAULT false
)
RETURNS JSON AS $
DECLARE
  v_request_id UUID;
  v_deleted_count INTEGER := 0;
BEGIN
  -- Verify the requester has permission
  IF p_requested_by != p_student_id AND p_requested_by != p_teacher_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = p_requested_by 
      AND (role = 'admin' OR (role = 'parent' AND EXISTS (
        SELECT 1 FROM profiles child 
        WHERE child.id = p_student_id AND child.parent_id = p_requested_by
      )))
    ) THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Insufficient permissions to delete data',
        'code', 'PERMISSION_DENIED'
      );
    END IF;
  END IF;
  
  -- Create data processing request
  INSERT INTO data_processing_requests (
    student_id, teacher_id, 
    request_type, requested_by, 
    status, request_details
  )
  VALUES (
    p_student_id, p_teacher_id, 
    CASE WHEN p_anonymize_only THEN 'anonymize' ELSE 'delete' END,
    p_requested_by, 'processing',
    json_build_object(
      'delete_bookings', p_delete_bookings,
      'anonymize_only', p_anonymize_only
    )
  )
  RETURNING id INTO v_request_id;
  
  -- Deactivate share tokens
  UPDATE share_tokens 
  SET is_active = false 
  WHERE student_id = p_student_id AND teacher_id = p_teacher_id;
  v_deleted_count := v_deleted_count + 1;
  
  -- Handle bookings
  IF p_delete_bookings THEN
    -- Cancel future bookings
    UPDATE bookings 
    SET status = 'cancelled', 
        cancellation_reason = 'Data deletion request',
        notes = CASE WHEN p_anonymize_only THEN NULL ELSE notes END
    WHERE student_id = p_student_id 
      AND teacher_id = p_teacher_id 
      AND booking_date >= CURRENT_DATE;
    v_deleted_count := v_deleted_count + 1;
  END IF;
  
  -- Handle audit logs
  IF p_anonymize_only THEN
    -- Anonymize audit logs
    UPDATE token_audit_logs 
    SET client_info = json_build_object(
      'userAgent', 'anonymized',
      'ipAddress', 'anonymized',
      'timestamp', COALESCE(client_info->>'timestamp', timestamp::text)
    )
    WHERE student_id = p_student_id AND teacher_id = p_teacher_id;
  ELSE
    -- Delete audit logs older than 1 year
    DELETE FROM token_audit_logs 
    WHERE student_id = p_student_id 
      AND teacher_id = p_teacher_id 
      AND timestamp < NOW() - INTERVAL '1 year';
  END IF;
  v_deleted_count := v_deleted_count + 1;
  
  -- Mark request as completed
  UPDATE data_processing_requests 
  SET status = 'completed', 
      completed_at = NOW(),
      processing_notes = 'Processed ' || v_deleted_count || ' record types'
  WHERE id = v_request_id;
  
  RETURN json_build_object(
    'success', true,
    'request_id', v_request_id,
    'processed_records', v_deleted_count,
    'anonymized_only', p_anonymize_only
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Mark request as failed
    UPDATE data_processing_requests 
    SET status = 'failed', processing_notes = SQLERRM
    WHERE id = v_request_id;
    
    RETURN json_build_object(
      'success', false,
      'error', 'Data deletion failed',
      'details', SQLERRM
    );
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired data based on privacy settings
CREATE OR REPLACE FUNCTION cleanup_expired_privacy_data()
RETURNS INTEGER AS $
DECLARE
  v_cleaned_count INTEGER := 0;
  v_setting RECORD;
BEGIN
  -- Loop through each teacher's privacy settings
  FOR v_setting IN 
    SELECT teacher_id, data_retention_days, auto_delete_expired_tokens, anonymize_old_audit_logs
    FROM teacher_privacy_settings
  LOOP
    -- Clean up expired tokens if enabled
    IF v_setting.auto_delete_expired_tokens THEN
      UPDATE share_tokens 
      SET is_active = false 
      WHERE teacher_id = v_setting.teacher_id 
        AND expires_at < NOW() - (v_setting.data_retention_days || ' days')::INTERVAL;
      v_cleaned_count := v_cleaned_count + 1;
    END IF;
    
    -- Anonymize old audit logs if enabled
    IF v_setting.anonymize_old_audit_logs THEN
      UPDATE token_audit_logs 
      SET client_info = json_build_object(
        'userAgent', 'anonymized',
        'ipAddress', 'anonymized',
        'timestamp', COALESCE(client_info->>'timestamp', timestamp::text)
      )
      WHERE teacher_id = v_setting.teacher_id 
        AND timestamp < NOW() - (v_setting.data_retention_days || ' days')::INTERVAL
        AND client_info IS NOT NULL
        AND client_info->>'userAgent' != 'anonymized';
      v_cleaned_count := v_cleaned_count + 1;
    END IF;
  END LOOP;
  
  RETURN v_cleaned_count;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION export_student_data(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_student_data(UUID, UUID, UUID, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_privacy_data() TO authenticated;

-- Create a scheduled job to clean up expired privacy data (if pg_cron is available)
-- This would typically be set up separately in production
-- SELECT cron.schedule('cleanup-privacy-data', '0 3 * * 0', 'SELECT cleanup_expired_privacy_data();');