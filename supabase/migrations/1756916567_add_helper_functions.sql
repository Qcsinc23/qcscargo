-- Migration: add_helper_functions
-- Created at: 1756916567

-- Add helper function for executing raw SQL queries (used by edge functions)
CREATE OR REPLACE FUNCTION execute_sql(query text, params text[] DEFAULT NULL)
RETURNS SETOF json AS $$
BEGIN
  -- This is a placeholder function for edge function compatibility
  -- In production, edge functions should use direct SQL queries
  RAISE EXCEPTION 'execute_sql function not implemented - use direct queries instead';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add pg_advisory_xact_lock function for proper advisory locking
CREATE OR REPLACE FUNCTION pg_advisory_xact_lock(lock_id bigint)
RETURNS void AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(lock_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;;