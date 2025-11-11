-- ========================================
-- MACHINE NOTIFICATION PREFERENCES
-- ========================================
-- Per-user notification settings for each machine
-- Allows each user in the hierarchy to control their own notifications

-- Create the table
CREATE TABLE IF NOT EXISTS public.machine_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one row per user per machine
  UNIQUE(machine_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_machine_notif_prefs_machine_id ON public.machine_notification_preferences(machine_id);
CREATE INDEX IF NOT EXISTS idx_machine_notif_prefs_user_id ON public.machine_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_machine_notif_prefs_enabled ON public.machine_notification_preferences(enabled);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.machine_notification_preferences TO authenticated;
GRANT SELECT ON public.machine_notification_preferences TO anon;

-- Function to auto-create notification preferences for new machines
CREATE OR REPLACE FUNCTION public.create_machine_notification_preferences()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id UUID;
  v_owner_role TEXT;
  v_installer_id UUID;
  v_company_id UUID;
  v_super_admin_id UUID;
BEGIN
  -- Get the machine owner
  v_owner_id := NEW.owner_id;
  
  -- Find super admin (always gets notifications)
  SELECT user_id INTO v_super_admin_id
  FROM public.user_roles
  WHERE role = 'super_admin'
  LIMIT 1;
  
  -- Determine owner's role
  SELECT role INTO v_owner_role
  FROM public.user_roles
  WHERE user_id = v_owner_id
  LIMIT 1;
  
  -- Always add super admin
  IF v_super_admin_id IS NOT NULL THEN
    INSERT INTO public.machine_notification_preferences (machine_id, user_id, enabled)
    VALUES (NEW.id, v_super_admin_id, true)
    ON CONFLICT (machine_id, user_id) DO NOTHING;
  END IF;
  
  -- Handle based on owner's role
  IF v_owner_role = 'client' THEN
    -- Owner is client: add installer -> company -> client
    SELECT admin_id INTO v_installer_id
    FROM public.client_admin_assignments
    WHERE client_id = v_owner_id
    LIMIT 1;
    
    IF v_installer_id IS NOT NULL THEN
      -- Add installer
      INSERT INTO public.machine_notification_preferences (machine_id, user_id, enabled)
      VALUES (NEW.id, v_installer_id, true)
      ON CONFLICT (machine_id, user_id) DO NOTHING;
      
      -- Find company
      SELECT company_id INTO v_company_id
      FROM public.installer_company_assignments
      WHERE installer_id = v_installer_id
      LIMIT 1;
      
      IF v_company_id IS NOT NULL THEN
        -- Add company
        INSERT INTO public.machine_notification_preferences (machine_id, user_id, enabled)
        VALUES (NEW.id, v_company_id, true)
        ON CONFLICT (machine_id, user_id) DO NOTHING;
      END IF;
    END IF;
    
    -- Add client (owner)
    INSERT INTO public.machine_notification_preferences (machine_id, user_id, enabled)
    VALUES (NEW.id, v_owner_id, true)
    ON CONFLICT (machine_id, user_id) DO NOTHING;
    
  ELSIF v_owner_role = 'installer' THEN
    -- Owner is installer: add company -> installer
    SELECT company_id INTO v_company_id
    FROM public.installer_company_assignments
    WHERE installer_id = v_owner_id
    LIMIT 1;
    
    IF v_company_id IS NOT NULL THEN
      -- Add company
      INSERT INTO public.machine_notification_preferences (machine_id, user_id, enabled)
      VALUES (NEW.id, v_company_id, true)
      ON CONFLICT (machine_id, user_id) DO NOTHING;
    END IF;
    
    -- Add installer (owner)
    INSERT INTO public.machine_notification_preferences (machine_id, user_id, enabled)
    VALUES (NEW.id, v_owner_id, true)
    ON CONFLICT (machine_id, user_id) DO NOTHING;
    
  ELSIF v_owner_role = 'company' THEN
    -- Owner is company: add company only
    INSERT INTO public.machine_notification_preferences (machine_id, user_id, enabled)
    VALUES (NEW.id, v_owner_id, true)
    ON CONFLICT (machine_id, user_id) DO NOTHING;
    
  ELSIF v_owner_role = 'super_admin' THEN
    -- Owner is super admin: only super admin (already added above)
    NULL;
    
  ELSE
    -- Unknown role: add owner anyway
    INSERT INTO public.machine_notification_preferences (machine_id, user_id, enabled)
    VALUES (NEW.id, v_owner_id, true)
    ON CONFLICT (machine_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-populate notification preferences on INSERT
DROP TRIGGER IF EXISTS trigger_create_machine_notification_preferences ON public.machines;
CREATE TRIGGER trigger_create_machine_notification_preferences
AFTER INSERT ON public.machines
FOR EACH ROW
EXECUTE FUNCTION public.create_machine_notification_preferences();

-- Function to handle ownership changes (UPDATE)
CREATE OR REPLACE FUNCTION public.update_machine_notification_preferences_on_owner_change()
RETURNS TRIGGER AS $$
DECLARE
  v_new_owner_id UUID;
  v_owner_role TEXT;
  v_installer_id UUID;
  v_company_id UUID;
  v_super_admin_id UUID;
BEGIN
  -- Only run if owner_id actually changed
  IF OLD.owner_id IS DISTINCT FROM NEW.owner_id THEN
    RAISE NOTICE 'Machine % ownership changed from % to %', NEW.id, OLD.owner_id, NEW.owner_id;
    
    -- Delete all existing notification preferences for this machine
    DELETE FROM public.machine_notification_preferences
    WHERE machine_id = NEW.id;
    
    RAISE NOTICE 'Deleted old notification preferences for machine %', NEW.id;
    
    -- Get new owner
    v_new_owner_id := NEW.owner_id;
    
    -- Find super admin (always gets notifications)
    SELECT user_id INTO v_super_admin_id
    FROM public.user_roles
    WHERE role = 'super_admin'
    LIMIT 1;
    
    -- Determine new owner's role
    SELECT role INTO v_owner_role
    FROM public.user_roles
    WHERE user_id = v_new_owner_id
    LIMIT 1;
    
    -- Always add super admin
    IF v_super_admin_id IS NOT NULL THEN
      INSERT INTO public.machine_notification_preferences (machine_id, user_id, enabled)
      VALUES (NEW.id, v_super_admin_id, true);
    END IF;
    
    -- Handle based on new owner's role
    IF v_owner_role = 'client' THEN
      -- Owner is client: add installer -> company -> client
      SELECT admin_id INTO v_installer_id
      FROM public.client_admin_assignments
      WHERE client_id = v_new_owner_id
      LIMIT 1;
      
      IF v_installer_id IS NOT NULL THEN
        -- Add installer
        INSERT INTO public.machine_notification_preferences (machine_id, user_id, enabled)
        VALUES (NEW.id, v_installer_id, true);
        
        -- Find company
        SELECT company_id INTO v_company_id
        FROM public.installer_company_assignments
        WHERE installer_id = v_installer_id
        LIMIT 1;
        
        IF v_company_id IS NOT NULL THEN
          -- Add company
          INSERT INTO public.machine_notification_preferences (machine_id, user_id, enabled)
          VALUES (NEW.id, v_company_id, true);
        END IF;
      END IF;
      
      -- Add client (owner)
      INSERT INTO public.machine_notification_preferences (machine_id, user_id, enabled)
      VALUES (NEW.id, v_new_owner_id, true);
      
    ELSIF v_owner_role = 'installer' THEN
      -- Owner is installer: add company -> installer
      SELECT company_id INTO v_company_id
      FROM public.installer_company_assignments
      WHERE installer_id = v_new_owner_id
      LIMIT 1;
      
      IF v_company_id IS NOT NULL THEN
        -- Add company
        INSERT INTO public.machine_notification_preferences (machine_id, user_id, enabled)
        VALUES (NEW.id, v_company_id, true);
      END IF;
      
      -- Add installer (owner)
      INSERT INTO public.machine_notification_preferences (machine_id, user_id, enabled)
      VALUES (NEW.id, v_new_owner_id, true);
      
    ELSIF v_owner_role = 'company' THEN
      -- Owner is company: add company only
      INSERT INTO public.machine_notification_preferences (machine_id, user_id, enabled)
      VALUES (NEW.id, v_new_owner_id, true);
      
    ELSIF v_owner_role = 'super_admin' THEN
      -- Owner is super admin: only super admin (already added above)
      NULL;
      
    ELSE
      -- Unknown role: add owner anyway
      INSERT INTO public.machine_notification_preferences (machine_id, user_id, enabled)
      VALUES (NEW.id, v_new_owner_id, true);
    END IF;
    
    RAISE NOTICE 'Created new notification preferences for machine % with new owner %', NEW.id, v_new_owner_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to handle ownership changes on UPDATE
DROP TRIGGER IF EXISTS trigger_update_machine_notification_preferences ON public.machines;
CREATE TRIGGER trigger_update_machine_notification_preferences
AFTER UPDATE ON public.machines
FOR EACH ROW
WHEN (OLD.owner_id IS DISTINCT FROM NEW.owner_id)
EXECUTE FUNCTION public.update_machine_notification_preferences_on_owner_change();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_machine_notif_prefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_machine_notif_prefs_updated_at ON public.machine_notification_preferences;
CREATE TRIGGER trigger_update_machine_notif_prefs_updated_at
BEFORE UPDATE ON public.machine_notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_machine_notif_prefs_updated_at();

-- Backfill existing machines with notification preferences
DO $$
DECLARE
  v_machine RECORD;
  v_owner_id UUID;
  v_owner_role TEXT;
  v_installer_id UUID;
  v_company_id UUID;
  v_super_admin_id UUID;
  v_count INT := 0;
BEGIN
  RAISE NOTICE 'Starting backfill of notification preferences...';
  
  -- Get super admin
  SELECT user_id INTO v_super_admin_id
  FROM public.user_roles
  WHERE role = 'super_admin'
  LIMIT 1;
  
  RAISE NOTICE 'Super admin ID: %', v_super_admin_id;
  
  -- Loop through all existing machines
  FOR v_machine IN SELECT id, owner_id FROM public.machines LOOP
    v_owner_id := v_machine.owner_id;
    v_installer_id := NULL;
    v_company_id := NULL;
    v_owner_role := NULL;
    
    -- Get owner's role
    SELECT role INTO v_owner_role
    FROM public.user_roles
    WHERE user_id = v_owner_id
    LIMIT 1;
    
    -- Always add super admin
    IF v_super_admin_id IS NOT NULL THEN
      INSERT INTO public.machine_notification_preferences (machine_id, user_id, enabled)
      VALUES (v_machine.id, v_super_admin_id, true)
      ON CONFLICT (machine_id, user_id) DO NOTHING;
    END IF;
    
    -- Handle based on owner's role
    IF v_owner_role = 'client' THEN
      -- Owner is client: add installer -> company -> client
      SELECT admin_id INTO v_installer_id
      FROM public.client_admin_assignments
      WHERE client_id = v_owner_id
      LIMIT 1;
      
      IF v_installer_id IS NOT NULL THEN
        -- Add installer
        INSERT INTO public.machine_notification_preferences (machine_id, user_id, enabled)
        VALUES (v_machine.id, v_installer_id, true)
        ON CONFLICT (machine_id, user_id) DO NOTHING;
        
        -- Find company
        SELECT company_id INTO v_company_id
        FROM public.installer_company_assignments
        WHERE installer_id = v_installer_id
        LIMIT 1;
        
        IF v_company_id IS NOT NULL THEN
          -- Add company
          INSERT INTO public.machine_notification_preferences (machine_id, user_id, enabled)
          VALUES (v_machine.id, v_company_id, true)
          ON CONFLICT (machine_id, user_id) DO NOTHING;
        END IF;
      END IF;
      
      -- Add client (owner)
      INSERT INTO public.machine_notification_preferences (machine_id, user_id, enabled)
      VALUES (v_machine.id, v_owner_id, true)
      ON CONFLICT (machine_id, user_id) DO NOTHING;
      
    ELSIF v_owner_role = 'installer' THEN
      -- Owner is installer: add company -> installer
      SELECT company_id INTO v_company_id
      FROM public.installer_company_assignments
      WHERE installer_id = v_owner_id
      LIMIT 1;
      
      IF v_company_id IS NOT NULL THEN
        -- Add company
        INSERT INTO public.machine_notification_preferences (machine_id, user_id, enabled)
        VALUES (v_machine.id, v_company_id, true)
        ON CONFLICT (machine_id, user_id) DO NOTHING;
      END IF;
      
      -- Add installer (owner)
      INSERT INTO public.machine_notification_preferences (machine_id, user_id, enabled)
      VALUES (v_machine.id, v_owner_id, true)
      ON CONFLICT (machine_id, user_id) DO NOTHING;
      
    ELSIF v_owner_role = 'company' THEN
      -- Owner is company: add company only
      INSERT INTO public.machine_notification_preferences (machine_id, user_id, enabled)
      VALUES (v_machine.id, v_owner_id, true)
      ON CONFLICT (machine_id, user_id) DO NOTHING;
      
    ELSIF v_owner_role = 'super_admin' THEN
      -- Owner is super admin: only super admin (already added above)
      NULL;
      
    ELSE
      -- Unknown role: add owner anyway
      RAISE NOTICE 'Unknown role for owner %: %', v_owner_id, v_owner_role;
      INSERT INTO public.machine_notification_preferences (machine_id, user_id, enabled)
      VALUES (v_machine.id, v_owner_id, true)
      ON CONFLICT (machine_id, user_id) DO NOTHING;
    END IF;
    
    v_count := v_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Backfilled notification preferences for % machines', v_count;
  RAISE NOTICE 'Total preferences created: %', (SELECT COUNT(*) FROM public.machine_notification_preferences);
END $$;

