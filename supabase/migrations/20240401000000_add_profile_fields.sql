
-- Add new profile fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Student';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS education_level TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS year_of_studying INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS experience_years INTEGER;

-- Create avatars bucket if not exists
-- (Usually handled via Supabase Dashboard, but I can add RLS if needed)
