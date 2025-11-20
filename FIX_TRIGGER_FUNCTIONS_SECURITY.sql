-- FIX: Update Trigger Functions to Use SECURITY DEFINER
-- This allows triggers to bypass RLS when inserting notification preferences

-- Update the create function
CREATE OR REPLACE FUNCTION public.create_machine_notification_preferences()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
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

-- Update the update function
CREATE OR REPLACE FUNCTION public.update_machine_notification_preferences_on_owner_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_owner_id UUID;
  v_owner_role TEXT;
  v_installer_id UUID;
  v_company_id UUID;
  v_super_admin_id UUID;
BEGIN
  -- Only run if owner_id actually changed
  IF OLD.owner_id IS DISTINCT FROM NEW.owner_id THEN
    -- Delete all existing notification preferences for this machine
    DELETE FROM public.machine_notification_preferences
    WHERE machine_id = NEW.id;
    
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
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

