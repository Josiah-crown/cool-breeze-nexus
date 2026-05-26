-- Run in Supabase SQL Editor if site members show UUIDs instead of names.

CREATE OR REPLACE FUNCTION public.get_site_display_names(p_site_id UUID)
RETURNS TABLE(user_id UUID, display_name TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT
    ids.user_id,
    COALESCE(NULLIF(btrim(p.name), ''), NULLIF(btrim(p.email), ''), ids.user_id::text) AS display_name
  FROM (
    SELECT s.owner_id AS user_id FROM public.sites s WHERE s.id = p_site_id
    UNION
    SELECT s.company_id FROM public.sites s WHERE s.id = p_site_id AND s.company_id IS NOT NULL
    UNION
    SELECT sm.user_id FROM public.site_memberships sm WHERE sm.site_id = p_site_id
  ) ids
  INNER JOIN public.profiles p ON p.id = ids.user_id
  WHERE public.user_can_access_site(p_site_id);
$$;

GRANT EXECUTE ON FUNCTION public.get_site_display_names(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_site_display_names(UUID) TO service_role;
