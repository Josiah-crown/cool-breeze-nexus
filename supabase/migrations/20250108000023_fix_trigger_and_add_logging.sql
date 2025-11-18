-- Fix trigger to ensure it fires correctly and add error handling
-- The issue is that triggers might be failing silently

-- Enhanced trigger function with better error handling
CREATE OR REPLACE FUNCTION public.trigger_update_machine_on_cirrus_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Update machines table with latest reading
  -- Use PERFORM to execute without returning results
  BEGIN
    PERFORM public.update_machine_from_latest_reading(NEW.machine_id);
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'Error updating machine % from cirrus reading: %', NEW.machine_id, SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced trigger function for CoolBreeze
CREATE OR REPLACE FUNCTION public.trigger_update_machine_on_coolbreeze_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Update machines table with latest reading
  BEGIN
    PERFORM public.update_machine_from_latest_reading(NEW.machine_id);
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'Error updating machine % from coolbreeze reading: %', NEW.machine_id, SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate triggers to ensure they're active
DROP TRIGGER IF EXISTS trigger_auto_update_machine_on_cirrus_insert ON public.cirrus;
CREATE TRIGGER trigger_auto_update_machine_on_cirrus_insert
  AFTER INSERT OR UPDATE ON public.cirrus
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_machine_on_cirrus_insert();

DROP TRIGGER IF EXISTS trigger_auto_update_machine_on_coolbreeze_insert ON public.coolbreeze;
CREATE TRIGGER trigger_auto_update_machine_on_coolbreeze_insert
  AFTER INSERT OR UPDATE ON public.coolbreeze
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_machine_on_coolbreeze_insert();

-- Test: Manually update all machines to fix current state
-- This will update all machines based on their latest readings
DO $$
DECLARE
  v_machine RECORD;
BEGIN
  FOR v_machine IN SELECT id FROM public.machines LOOP
    BEGIN
      PERFORM public.update_machine_from_latest_reading(v_machine.id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error updating machine %: %', v_machine.id, SQLERRM;
    END;
  END LOOP;
END $$;

COMMENT ON FUNCTION public.trigger_update_machine_on_cirrus_insert IS 'Trigger function to auto-update machines table when new Cirrus reading is inserted. Includes error handling.';
COMMENT ON FUNCTION public.trigger_update_machine_on_coolbreeze_insert IS 'Trigger function to auto-update machines table when new CoolBreeze reading is inserted. Includes error handling.';

