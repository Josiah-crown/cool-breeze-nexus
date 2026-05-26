-- Site ERF pins: machine must belong to the site's client owner (sites.owner_id).
-- Fixes cross-client pins (e.g. Neil Britz machines on Greg Payne's site).

CREATE OR REPLACE FUNCTION public.site_machine_matches_site_owner(p_site_id UUID, p_machine_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sites s
    INNER JOIN public.machines m ON m.id = p_machine_id
    WHERE s.id = p_site_id
      AND m.owner_id = s.owner_id
  );
$$;

-- Remove pins that were saved under the old broad UI scope
DELETE FROM public.site_machine_positions smp
USING public.sites s, public.machines m
WHERE smp.site_id = s.id
  AND smp.machine_id = m.id
  AND m.owner_id IS DISTINCT FROM s.owner_id;

DROP POLICY IF EXISTS "Users can view site machine positions" ON public.site_machine_positions;
CREATE POLICY "Users can view site machine positions" ON public.site_machine_positions
  FOR SELECT
  USING (
    public.user_can_access_site(site_id)
    AND public.site_machine_matches_site_owner(site_id, machine_id)
  );

DROP POLICY IF EXISTS "Managers can manage site machine positions" ON public.site_machine_positions;
CREATE POLICY "Managers can manage site machine positions" ON public.site_machine_positions
  FOR ALL
  USING (
    public.user_can_manage_site(site_id)
    AND public.site_machine_matches_site_owner(site_id, machine_id)
  )
  WITH CHECK (
    public.user_can_manage_site(site_id)
    AND public.site_machine_matches_site_owner(site_id, machine_id)
  );
