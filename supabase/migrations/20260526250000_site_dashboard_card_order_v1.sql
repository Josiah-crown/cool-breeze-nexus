-- Persist dashboard machine card order per site (or unassigned bucket). Clients read only; managers reorder.

CREATE TABLE IF NOT EXISTS public.site_dashboard_card_order (
  group_key TEXT NOT NULL,
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_key, machine_id),
  CONSTRAINT site_dashboard_card_order_group_key_chk CHECK (
    group_key = 'unassigned'
    OR group_key ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  )
);

CREATE INDEX IF NOT EXISTS idx_site_dashboard_card_order_group_sort
  ON public.site_dashboard_card_order (group_key, sort_order);

DROP TRIGGER IF EXISTS update_site_dashboard_card_order_updated_at ON public.site_dashboard_card_order;
CREATE TRIGGER update_site_dashboard_card_order_updated_at
  BEFORE UPDATE ON public.site_dashboard_card_order
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.site_dashboard_card_order ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view dashboard card order" ON public.site_dashboard_card_order;
CREATE POLICY "Users can view dashboard card order" ON public.site_dashboard_card_order
  FOR SELECT
  USING (
    (
      group_key <> 'unassigned'
      AND public.user_can_access_site(group_key::uuid)
    )
    OR (
      group_key = 'unassigned'
      AND EXISTS (
        SELECT 1
        FROM public.machines m
        WHERE m.id = machine_id
          AND (
            m.owner_id = auth.uid()
            OR public.has_role(auth.uid(), 'super_admin')
            OR public.user_manages_account(m.owner_id)
          )
      )
    )
  );

DROP POLICY IF EXISTS "Managers can manage dashboard card order" ON public.site_dashboard_card_order;
CREATE POLICY "Managers can manage dashboard card order" ON public.site_dashboard_card_order
  FOR ALL
  USING (
    NOT public.has_role(auth.uid(), 'client')
    AND (
      (
        group_key <> 'unassigned'
        AND public.user_can_manage_site(group_key::uuid)
      )
      OR (
        group_key = 'unassigned'
        AND EXISTS (
          SELECT 1
          FROM public.machines m
          WHERE m.id = machine_id
            AND public.user_manages_account(m.owner_id)
        )
      )
    )
  )
  WITH CHECK (
    NOT public.has_role(auth.uid(), 'client')
    AND (
      (
        group_key <> 'unassigned'
        AND public.user_can_manage_site(group_key::uuid)
      )
      OR (
        group_key = 'unassigned'
        AND EXISTS (
          SELECT 1
          FROM public.machines m
          WHERE m.id = machine_id
            AND public.user_manages_account(m.owner_id)
        )
      )
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_dashboard_card_order TO authenticated;
GRANT ALL ON public.site_dashboard_card_order TO service_role;
