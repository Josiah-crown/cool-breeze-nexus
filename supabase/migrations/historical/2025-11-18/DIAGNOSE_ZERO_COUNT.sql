-- Diagnose why test query returns 0
-- This will help us understand if it's a data issue or RLS issue

-- 1. Check current user and role
SELECT 
  'Current User Info' as check_type,
  auth.uid() as user_id,
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) as user_role,
  (SELECT COUNT(*) FROM public.user_roles WHERE user_id = auth.uid()) as role_count;

-- 2. Check if cirrus table has ANY data at all
-- NOTE: This query might be blocked by RLS if you're not super_admin
-- If it returns 0, try running as service_role or check if RLS is blocking
SELECT 
  'Total Cirrus Records (RLS filtered)' as check_type,
  COUNT(*) as total_records,
  COUNT(DISTINCT machine_id) as unique_machines,
  MIN(timestamp) as oldest_record,
  MAX(timestamp) as newest_record
FROM public.cirrus;

-- 2b. Check specific machine (replace with your machine ID)
-- Replace 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42' with your actual machine_id
SELECT 
  'Cirrus Data for Specific Machine' as check_type,
  machine_id,
  COUNT(*) as record_count,
  MIN(timestamp) as oldest_record,
  MAX(timestamp) as newest_record,
  MAX(timestamp) >= NOW() - INTERVAL '24 hours' as has_recent_data
FROM public.cirrus
WHERE machine_id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42'
GROUP BY machine_id;

-- 3. Check what machines the current user can see
SELECT 
  'User Accessible Machines' as check_type,
  m.id as machine_id,
  m.name,
  m.type,
  m.manufacturer,
  m.owner_id,
  CASE 
    WHEN m.owner_id = auth.uid() THEN 'Owner'
    WHEN public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN 'Super Admin'
    ELSE 'No Access'
  END as access_reason
FROM public.machines m
WHERE m.owner_id = auth.uid()
   OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
   OR (public.has_role(auth.uid(), 'installer'::public.app_role) AND (
     m.owner_id = auth.uid() 
     OR m.owner_id IN (
       SELECT client_id FROM public.client_admin_assignments WHERE admin_id = auth.uid()
     )
   ))
   OR (public.has_role(auth.uid(), 'company'::public.app_role) AND (
     m.owner_id = auth.uid()
     OR m.owner_id IN (
       SELECT installer_id FROM public.installer_company_assignments WHERE company_id = auth.uid()
     )
     OR m.owner_id IN (
       SELECT client_id FROM public.client_admin_assignments 
       WHERE admin_id IN (
         SELECT installer_id FROM public.installer_company_assignments WHERE company_id = auth.uid()
       )
     )
   ));

-- 4. Check if those machines have data in cirrus (this should work with RLS)
SELECT 
  'Cirrus Data for Accessible Machines' as check_type,
  m.id as machine_id,
  m.name,
  COUNT(c.id) as cirrus_record_count,
  MAX(c.timestamp) as latest_reading
FROM public.machines m
LEFT JOIN public.cirrus c ON c.machine_id = m.id
WHERE (
  m.owner_id = auth.uid()
   OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
   OR (public.has_role(auth.uid(), 'installer'::public.app_role) AND (
     m.owner_id = auth.uid() 
     OR m.owner_id IN (
       SELECT client_id FROM public.client_admin_assignments WHERE admin_id = auth.uid()
     )
   ))
   OR (public.has_role(auth.uid(), 'company'::public.app_role) AND (
     m.owner_id = auth.uid()
     OR m.owner_id IN (
       SELECT installer_id FROM public.installer_company_assignments WHERE company_id = auth.uid()
     )
     OR m.owner_id IN (
       SELECT client_id FROM public.client_admin_assignments 
       WHERE admin_id IN (
         SELECT installer_id FROM public.installer_company_assignments WHERE company_id = auth.uid()
       )
     )
   ))
)
GROUP BY m.id, m.name
ORDER BY cirrus_record_count DESC;

-- 5. Test the RLS policy directly (this is what the frontend does)
SELECT 
  'RLS Policy Test' as check_type,
  COUNT(*) as accessible_records
FROM public.cirrus c
WHERE EXISTS (
  SELECT 1 FROM public.machines m
  WHERE m.id = c.machine_id
  AND (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR m.owner_id = auth.uid()
    OR (public.has_role(auth.uid(), 'installer'::public.app_role) AND (
      m.owner_id = auth.uid() 
      OR m.owner_id IN (
        SELECT client_id FROM public.client_admin_assignments WHERE admin_id = auth.uid()
      )
    ))
    OR (public.has_role(auth.uid(), 'company'::public.app_role) AND (
      m.owner_id = auth.uid()
      OR m.owner_id IN (
        SELECT installer_id FROM public.installer_company_assignments WHERE company_id = auth.uid()
      )
      OR m.owner_id IN (
        SELECT client_id FROM public.client_admin_assignments 
        WHERE admin_id IN (
          SELECT installer_id FROM public.installer_company_assignments WHERE company_id = auth.uid()
        )
      )
    ))
  )
);

