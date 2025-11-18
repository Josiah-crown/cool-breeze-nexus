# RLS Policy Template for New Processing Tables

## Problem
When creating new processing tables (like `cirrus`, `coolbreeze`, or future machine types), RLS policies must be set up correctly or users will get 403 Forbidden errors when trying to access historical data.

## Solution Template

When creating a new processing table (e.g., `newmanufacturer`), use this template:

### 1. Create the Table
```sql
CREATE TABLE IF NOT EXISTS public.newmanufacturer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- ... your columns ...
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_newmanufacturer_machine_timestamp UNIQUE (machine_id, timestamp)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_newmanufacturer_machine_id ON public.newmanufacturer(machine_id);
CREATE INDEX IF NOT EXISTS idx_newmanufacturer_timestamp ON public.newmanufacturer(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_newmanufacturer_machine_timestamp ON public.newmanufacturer(machine_id, timestamp DESC);
```

### 2. Enable RLS
```sql
ALTER TABLE public.newmanufacturer ENABLE ROW LEVEL SECURITY;
```

### 3. Grant Execute on has_role() Function
**CRITICAL:** This is often missed and causes 403 errors!
```sql
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO anon;
```

### 4. Create SELECT Policy (Copy this exactly)
```sql
CREATE POLICY "Users can view NEWMANUFACTURER data for accessible machines"
  ON public.newmanufacturer
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.machines m
      WHERE m.id = newmanufacturer.machine_id
      AND (
        -- Super admin sees all
        public.has_role(auth.uid(), 'super_admin'::public.app_role)
        OR
        -- Machine owner
        m.owner_id = auth.uid()
        OR
        -- Installer sees their machines and client machines
        (public.has_role(auth.uid(), 'installer'::public.app_role) AND (
          m.owner_id = auth.uid() 
          OR m.owner_id IN (
            SELECT client_id FROM public.client_admin_assignments WHERE admin_id = auth.uid()
          )
        ))
        OR
        -- Company sees their machines and installer/client machines
        (public.has_role(auth.uid(), 'company'::public.app_role) AND (
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
    )
  );
```

### 5. Create INSERT/UPDATE Policies for Service Role
```sql
-- Service role can insert (for triggers)
CREATE POLICY "Service role can insert NEWMANUFACTURER data"
  ON public.newmanufacturer
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Service role can update
CREATE POLICY "Service role can update NEWMANUFACTURER data"
  ON public.newmanufacturer
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);
```

## Key Points to Remember

1. **Always grant EXECUTE on has_role()** - This is the #1 cause of 403 errors
2. **Use `TO authenticated`** - Explicitly specify the role
3. **Use `public.has_role()` with enum cast** - Always cast to `::public.app_role`
4. **Match machines table logic** - Use the exact same access logic as the machines table
5. **Test immediately** - Run a SELECT query after creating policies to verify they work

## Common Mistakes

❌ **Don't do this:**
```sql
-- Missing GRANT
CREATE POLICY ... -- Will fail with 403

-- Wrong role check
AND ur.role = 'super_admin' -- Should use has_role() function

-- Missing TO authenticated
CREATE POLICY ... -- Without TO authenticated, might not work
```

✅ **Do this:**
```sql
-- Grant first
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;

-- Use has_role() function
public.has_role(auth.uid(), 'super_admin'::public.app_role)

-- Specify role
TO authenticated
```

## Verification Checklist

After creating a new processing table, verify:

- [ ] Table created with RLS enabled
- [ ] Indexes created for performance
- [ ] `GRANT EXECUTE` on `has_role()` function
- [ ] SELECT policy created with `TO authenticated`
- [ ] INSERT/UPDATE policies for service_role
- [ ] Test query works: `SELECT COUNT(*) FROM public.newmanufacturer`
- [ ] Frontend can fetch data without 403 errors

## Quick Reference

**For cirrus table:**
- See: `supabase/migrations/20250108000000_create_cirrus_table.sql`
- Fix: `TODAY/02D_FIX_RLS_WITH_GRANTS.sql`

**For coolbreeze table:**
- See: `supabase/migrations/20250108000011_create_coolbreeze_table.sql`
- Apply same RLS pattern

**For future tables:**
- Copy the RLS policy from cirrus/coolbreeze
- Replace table name
- Don't forget the GRANT!

