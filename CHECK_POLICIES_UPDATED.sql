-- Check if policies were updated correctly
SELECT 
  tablename,
  policyname,
  cmd,
  roles,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('cirrus', 'alliance', 'coolbreeze')
  AND cmd = 'INSERT'
ORDER BY tablename, policyname;

