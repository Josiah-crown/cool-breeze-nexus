-- Fix RLS policies for cirrus table to allow diagnostic queries
-- This allows the anon key to read from cirrus table (for diagnostic purposes)

-- Check current policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'cirrus';

-- Drop existing restrictive policies (if any)
DROP POLICY IF EXISTS "Allow anon to read cirrus" ON public.cirrus;

-- Create a policy that allows reading cirrus data
-- Note: This is for diagnostic purposes - adjust based on your security needs
CREATE POLICY "Allow anon to read cirrus"
ON public.cirrus
FOR SELECT
TO anon
USING (true);

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'cirrus';

