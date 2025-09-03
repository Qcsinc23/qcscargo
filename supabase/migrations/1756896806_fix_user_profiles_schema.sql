-- Migration: fix_user_profiles_schema
-- Created at: 1756896806

-- Add missing columns to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'customer',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS address TEXT;

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- Update existing records to have proper defaults
UPDATE user_profiles 
SET role = 'customer', status = 'active' 
WHERE role IS NULL OR status IS NULL;;