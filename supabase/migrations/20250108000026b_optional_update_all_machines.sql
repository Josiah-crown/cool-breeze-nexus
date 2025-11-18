-- Migration 26b: OPTIONAL - Update all machines after function fix
-- Only run this if you want to update all machines immediately
-- Otherwise, machines will update automatically on next data insert

-- Update all machines now (optional - comment out if you don't want this)
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

