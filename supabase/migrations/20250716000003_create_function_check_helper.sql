-- Create a helper function to check if a specific function exists
CREATE OR REPLACE FUNCTION public.pg_get_function_result(function_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_function_exists BOOLEAN;
  v_function_source TEXT;
  v_result JSONB;
BEGIN
  -- Check if the function exists
  SELECT EXISTS (
    SELECT 1 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = function_name
  ) INTO v_function_exists;
  
  -- Get function source if it exists
  IF v_function_exists THEN
    SELECT pg_get_functiondef(p.oid)
    INTO v_function_source
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = function_name
    LIMIT 1;
  END IF;
  
  -- Prepare result
  v_result := jsonb_build_object(
    'function_exists', v_function_exists,
    'function_name', function_name,
    'schema', 'public',
    'source_available', v_function_source IS NOT NULL
  );
  
  RETURN v_result;
END;
$$;