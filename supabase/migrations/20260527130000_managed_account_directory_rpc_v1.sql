-- Directory of managed accounts for super_admin (all) and company (their org tree).

CREATE OR REPLACE FUNCTION public.get_managed_account_directory()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_is_super BOOLEAN;
  v_is_company BOOLEAN;
  v_result JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_is_super := public.has_role(v_uid, 'super_admin');
  v_is_company := public.has_role(v_uid, 'company');

  IF NOT v_is_super AND NOT v_is_company THEN
    RAISE EXCEPTION 'Not authorized to view managed accounts';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', row.id,
        'role', row.role,
        'name', row.display_name,
        'email', row.email,
        'business_name', row.business_name,
        'cell_number', row.cell_number,
        'company_id', row.company_id,
        'company_name', row.company_name,
        'installer_id', row.installer_id,
        'installer_name', row.installer_name,
        'machine_count', row.machine_count,
        'site_count', row.site_count,
        'assigned_at', row.assigned_at
      )
      ORDER BY row.role, row.display_name
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM (
    SELECT
      p.id,
      ur.role::text AS role,
      COALESCE(NULLIF(btrim(p.name), ''), NULLIF(btrim(p.email), ''), p.id::text) AS display_name,
      p.email,
      NULLIF(btrim(p.full_name_business), '') AS business_name,
      NULLIF(btrim(p.cell_number), '') AS cell_number,
      COALESCE(ica_co.company_id, CASE WHEN ur.role = 'company' THEN p.id END) AS company_id,
      COALESCE(
        NULLIF(btrim(pc_co.name), ''),
        NULLIF(btrim(pc_co.email), ''),
        CASE WHEN ur.role = 'company' THEN COALESCE(NULLIF(btrim(p.name), ''), p.email) END
      ) AS company_name,
      CASE WHEN ur.role = 'client' THEN ca.admin_id WHEN ur.role = 'installer' THEN p.id END AS installer_id,
      CASE
        WHEN ur.role = 'client' THEN COALESCE(NULLIF(btrim(pi.name), ''), NULLIF(btrim(pi.email), ''))
        WHEN ur.role = 'installer' THEN COALESCE(NULLIF(btrim(p.name), ''), p.email)
      END AS installer_name,
      (SELECT count(*)::bigint FROM public.machines m WHERE m.owner_id = p.id) AS machine_count,
      (SELECT count(*)::bigint FROM public.sites s WHERE s.owner_id = p.id) AS site_count,
      ca.assigned_at
    FROM public.profiles p
    INNER JOIN public.user_roles ur ON ur.user_id = p.id
    LEFT JOIN public.client_admin_assignments ca ON ca.client_id = p.id AND ur.role = 'client'
    LEFT JOIN public.installer_company_assignments ica_inst
      ON ica_inst.installer_id = p.id AND ur.role = 'installer'
    LEFT JOIN public.installer_company_assignments ica_co
      ON ica_co.installer_id = ca.admin_id AND ur.role = 'client'
    LEFT JOIN public.profiles pc_co ON pc_co.id = COALESCE(ica_inst.company_id, ica_co.company_id)
    LEFT JOIN public.profiles pi ON pi.id = ca.admin_id
    WHERE ur.role IN ('super_admin', 'company', 'installer', 'client')
      AND (
        v_is_super
        OR (
          v_is_company
          AND (
            p.id = v_uid
            OR ica_inst.company_id = v_uid
            OR ica_co.company_id = v_uid
          )
        )
      )
  ) row;

  RETURN jsonb_build_object(
    'viewer_role', CASE WHEN v_is_super THEN 'super_admin' ELSE 'company' END,
    'accounts', v_result
  );
END;
$$;

COMMENT ON FUNCTION public.get_managed_account_directory() IS
  'Returns company/installer/client accounts visible to super_admin (all) or company (own org).';

GRANT EXECUTE ON FUNCTION public.get_managed_account_directory() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_managed_account_directory() TO service_role;
