# Fix: Permission Denied for Cirrus Table

## Error
```
403 (Forbidden)
permission denied for table cirrus
```

## Solution

The RLS policy might not be working correctly. Run this SQL in Supabase to fix it:

```sql
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can view CIRRUS data for accessible machines" ON public.cirrus;

-- Recreate the policy with proper permissions
CREATE POLICY "Users can view CIRRUS data for accessible machines"
  ON public.cirrus
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.id = cirrus.machine_id
      AND (
        -- Super admin sees all
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'super_admin'
        )
        OR
        -- Machine owner
        m.owner_id = auth.uid()
        OR
        -- Company sees their machines and installer/client machines
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.installer_company_assignments ica ON ica.installer_id = m.owner_id
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'company'
          AND ica.company_id = ur.user_id
        )
        OR
        -- Installer sees their machines and client machines
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          LEFT JOIN public.client_admin_assignments caa ON caa.client_id = m.owner_id
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'installer'
          AND (m.owner_id = ur.user_id OR caa.admin_id = ur.user_id)
        )
      )
    )
  );
```

## Verify

After running the SQL, check:
1. Console error should disappear
2. Historical data should load
3. No more 403 errors

