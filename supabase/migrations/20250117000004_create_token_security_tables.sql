-- Create token security and audit logging tables
-- This migration adds comprehensive security features for share tokens

-- 1. Token Audit Logs Table for security monitoring
CREATE TABLE IF NOT EXISTS public.token_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of the token (not the actual token)
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL CHECK (action IN ('access', 'generation', 'regeneration', 'deactivation')),
  client_info JSONB, -- Store user agent, IP, referer, etc.
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Rate Limiting Table for API endpoints
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier VARCHAR(255) NOT NULL, -- IP address, user ID, or token hash
  endpoint VARCHAR(100) NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  window_end TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 hour'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_rate_limit_window UNIQUE (identifier, endpoint, window_start)
);

-- 3. Security Events Table for monitoring suspicious activities
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'token_validation_failed', 
    'rate_limit_exceeded', 
    'suspicious_access_pattern',
    'token_expired_access_attempt',
    'invalid_token_format',
    'csrf_validation_failed'
  )),
  severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  details JSONB NOT NULL,
  client_info JSONB,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_token_audit_logs_student_teacher ON public.token_audit_logs(student_id, teacher_id);
CREATE INDEX IF NOT EXISTS idx_token_audit_logs_timestamp ON public.token_audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_token_audit_logs_action ON public.token_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_token_audit_logs_token_hash ON public.token_audit_logs(token_hash);

CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON public.rate_limits(identifier);
CREATE INDEX IF NOT EXISTS idx_rate_limits_endpoint ON public.rate_limits(endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.rate_limits(window_start, window_end);

CREATE INDEX IF NOT EXISTS idx_security_events_type ON public.security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON public.security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON public.security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_resolved ON public.security_events(resolved) WHERE resolved = false;

-- Add RLS policies for security tables

-- Token Audit Logs policies
ALTER TABLE public.token_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY token_audit_logs_teacher_policy ON public.token_audit_logs
  FOR SELECT
  USING (auth.uid() = teacher_id);

CREATE POLICY token_audit_logs_admin_policy ON public.token_audit_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Rate Limits policies (admin only)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY rate_limits_admin_policy ON public.rate_limits
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Security Events policies (admin only)
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY security_events_admin_policy ON public.security_events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Enhanced token security functions

-- Function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
  p_event_type TEXT,
  p_severity TEXT DEFAULT 'medium',
  p_details JSONB DEFAULT '{}',
  p_client_info JSONB DEFAULT NULL
)
RETURNS UUID AS $
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO security_events (event_type, severity, details, client_info)
  VALUES (p_event_type, p_severity, p_details, p_client_info)
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and update rate limits
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT,
  p_endpoint TEXT,
  p_max_requests INTEGER DEFAULT 100,
  p_window_minutes INTEGER DEFAULT 60
)
RETURNS JSON AS $
DECLARE
  v_current_count INTEGER;
  v_window_start TIMESTAMP WITH TIME ZONE;
  v_window_end TIMESTAMP WITH TIME ZONE;
  v_remaining INTEGER;
BEGIN
  v_window_start := DATE_TRUNC('minute', NOW()) - (EXTRACT(MINUTE FROM NOW())::INTEGER % p_window_minutes) * INTERVAL '1 minute';
  v_window_end := v_window_start + (p_window_minutes * INTERVAL '1 minute');
  
  -- Get current count for this window
  SELECT COALESCE(request_count, 0) INTO v_current_count
  FROM rate_limits
  WHERE identifier = p_identifier
    AND endpoint = p_endpoint
    AND window_start = v_window_start;
  
  -- Check if limit exceeded
  IF v_current_count >= p_max_requests THEN
    -- Log security event
    PERFORM log_security_event(
      'rate_limit_exceeded',
      'medium',
      json_build_object(
        'identifier', p_identifier,
        'endpoint', p_endpoint,
        'current_count', v_current_count,
        'max_requests', p_max_requests
      )
    );
    
    RETURN json_build_object(
      'allowed', false,
      'remaining', 0,
      'reset_time', EXTRACT(EPOCH FROM v_window_end),
      'current_count', v_current_count
    );
  END IF;
  
  -- Update or insert rate limit record
  INSERT INTO rate_limits (identifier, endpoint, request_count, window_start, window_end)
  VALUES (p_identifier, p_endpoint, 1, v_window_start, v_window_end)
  ON CONFLICT (identifier, endpoint, window_start)
  DO UPDATE SET request_count = rate_limits.request_count + 1;
  
  v_remaining := p_max_requests - (v_current_count + 1);
  
  RETURN json_build_object(
    'allowed', true,
    'remaining', v_remaining,
    'reset_time', EXTRACT(EPOCH FROM v_window_end),
    'current_count', v_current_count + 1
  );
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced token validation function with security logging
CREATE OR REPLACE FUNCTION validate_share_token_secure(
  p_token TEXT,
  p_client_info JSONB DEFAULT NULL
)
RETURNS JSON AS $
DECLARE
  v_token_data RECORD;
  v_token_hash TEXT;
  v_result JSON;
BEGIN
  -- Input validation
  IF p_token IS NULL OR LENGTH(p_token) != 64 THEN
    PERFORM log_security_event(
      'invalid_token_format',
      'low',
      json_build_object('token_length', COALESCE(LENGTH(p_token), 0)),
      p_client_info
    );
    
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid token format',
      'code', 'INVALID_FORMAT'
    );
  END IF;
  
  -- Generate token hash for logging
  v_token_hash := encode(digest(p_token, 'sha256'), 'hex');
  
  -- Get token data
  SELECT 
    st.*,
    sp.full_name as student_name,
    tp.full_name as teacher_name
  INTO v_token_data
  FROM share_tokens st
  JOIN profiles sp ON sp.id = st.student_id
  JOIN profiles tp ON tp.id = st.teacher_id
  WHERE st.token = p_token;
  
  -- Check if token exists
  IF NOT FOUND THEN
    PERFORM log_security_event(
      'token_validation_failed',
      'medium',
      json_build_object('reason', 'token_not_found', 'token_hash', v_token_hash),
      p_client_info
    );
    
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or expired booking link',
      'code', 'INVALID_TOKEN'
    );
  END IF;
  
  -- Check if token is active
  IF NOT v_token_data.is_active THEN
    PERFORM log_security_event(
      'token_validation_failed',
      'medium',
      json_build_object('reason', 'token_inactive', 'token_hash', v_token_hash),
      p_client_info
    );
    
    RETURN json_build_object(
      'success', false,
      'error', 'Booking link has been deactivated',
      'code', 'TOKEN_INACTIVE'
    );
  END IF;
  
  -- Check expiration
  IF v_token_data.expires_at <= NOW() THEN
    PERFORM log_security_event(
      'token_expired_access_attempt',
      'low',
      json_build_object(
        'token_hash', v_token_hash,
        'expired_at', v_token_data.expires_at,
        'student_id', v_token_data.student_id,
        'teacher_id', v_token_data.teacher_id
      ),
      p_client_info
    );
    
    RETURN json_build_object(
      'success', false,
      'error', 'Booking link has expired',
      'code', 'TOKEN_EXPIRED'
    );
  END IF;
  
  -- Log successful access
  INSERT INTO token_audit_logs (token_hash, student_id, teacher_id, action, client_info)
  VALUES (v_token_hash, v_token_data.student_id, v_token_data.teacher_id, 'access', p_client_info);
  
  -- Update access count
  UPDATE share_tokens
  SET 
    access_count = access_count + 1,
    last_accessed = NOW()
  WHERE token = p_token;
  
  -- Check if token needs rotation (approaching expiration or high access count)
  v_result := json_build_object(
    'success', true,
    'student_id', v_token_data.student_id,
    'teacher_id', v_token_data.teacher_id,
    'student_name', v_token_data.student_name,
    'teacher_name', v_token_data.teacher_name,
    'access_count', v_token_data.access_count + 1,
    'expires_at', v_token_data.expires_at,
    'needs_rotation', (
      v_token_data.expires_at <= NOW() + INTERVAL '30 days' OR
      v_token_data.access_count >= 9000
    )
  );
  
  RETURN v_result;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old audit logs and rate limit records
CREATE OR REPLACE FUNCTION cleanup_security_data()
RETURNS INTEGER AS $
DECLARE
  v_deleted_count INTEGER := 0;
BEGIN
  -- Delete audit logs older than 1 year
  DELETE FROM token_audit_logs 
  WHERE created_at < NOW() - INTERVAL '1 year';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  -- Delete expired rate limit records
  DELETE FROM rate_limits 
  WHERE window_end < NOW() - INTERVAL '1 day';
  
  -- Delete resolved security events older than 6 months
  DELETE FROM security_events 
  WHERE resolved = true AND resolved_at < NOW() - INTERVAL '6 months';
  
  RETURN v_deleted_count;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION log_security_event(TEXT, TEXT, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit(TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_share_token_secure(TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_security_data() TO authenticated;

-- Create a scheduled job to clean up old security data (if pg_cron is available)
-- This would typically be set up separately in production
-- SELECT cron.schedule('cleanup-security-data', '0 2 * * 0', 'SELECT cleanup_security_data();');