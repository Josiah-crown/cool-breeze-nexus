-- Quick Fix: Update connection status for your machine
-- Replace 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42' with your machine ID
-- This will force update the machines table from the latest cirrus reading

SELECT public.update_machine_from_latest_reading('c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42');

-- Verify it worked
SELECT 
  name,
  is_connected,
  updated_at,
  current,
  motor_temp
FROM public.machines
WHERE id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42';

