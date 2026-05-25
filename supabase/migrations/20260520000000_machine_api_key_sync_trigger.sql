-- Keep `api_keys` in sync with `machines` on insert so esp32-data-receiver can validate
-- (Bearer key + body.machine_id must match a row in api_keys). Uses SECURITY DEFINER so
-- installers/companies creating machines for another owner_id still get a key row.

CREATE OR REPLACE FUNCTION public.sync_machine_api_key_row()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.api_keys WHERE machine_id = NEW.id LIMIT 1) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.api_keys (key, machine_id, created_by, description, is_active)
  VALUES (
    NEW.api_key,
    NEW.id,
    COALESCE(auth.uid(), NEW.owner_id),
    'Provisioned with machine',
    true
  )
  ON CONFLICT (key) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_machines_sync_api_key_row ON public.machines;
CREATE TRIGGER trg_machines_sync_api_key_row
  AFTER INSERT ON public.machines
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_machine_api_key_row();

-- Machines created before this trigger (or rows missing due to manual DB edits)
INSERT INTO public.api_keys (key, machine_id, created_by, description, is_active)
SELECT m.api_key, m.id, m.owner_id, 'Backfilled from machines.api_key', true
FROM public.machines m
WHERE NOT EXISTS (SELECT 1 FROM public.api_keys ak WHERE ak.machine_id = m.id)
ON CONFLICT (key) DO NOTHING;
