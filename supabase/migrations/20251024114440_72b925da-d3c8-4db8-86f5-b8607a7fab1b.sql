-- Create API keys table for ESP32 authentication
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  machine_id UUID REFERENCES public.machines(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true NOT NULL,
  description TEXT
);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Policies for API keys
CREATE POLICY "Users can view API keys for their machines"
  ON public.api_keys FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.machines
      WHERE machines.id = api_keys.machine_id
      AND machines.owner_id = auth.uid()
    )
    OR
    public.has_role(auth.uid(), 'super_admin')
    OR
    EXISTS (
      SELECT 1 FROM public.machines m
      JOIN public.user_roles ur ON m.owner_id = ur.user_id
      WHERE m.id = api_keys.machine_id
      AND (
        (public.has_role(auth.uid(), 'company') AND EXISTS (
          SELECT 1 FROM public.installer_company_assignments ica
          WHERE ica.company_id = auth.uid()
          AND (ica.installer_id = m.owner_id OR ica.installer_id IN (
            SELECT user_id FROM public.client_admin_assignments WHERE admin_id = m.owner_id
          ))
        ))
        OR
        (public.has_role(auth.uid(), 'installer') AND EXISTS (
          SELECT 1 FROM public.client_admin_assignments caa
          WHERE caa.admin_id = auth.uid() AND caa.client_id = m.owner_id
        ))
      )
    )
  );

CREATE POLICY "Super admins and machine owners can create API keys"
  ON public.api_keys FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR
    EXISTS (
      SELECT 1 FROM public.machines
      WHERE machines.id = api_keys.machine_id
      AND machines.owner_id = auth.uid()
    )
  );

CREATE POLICY "Super admins and creators can delete API keys"
  ON public.api_keys FOR DELETE
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR created_by = auth.uid()
  );

CREATE POLICY "Super admins and creators can update API keys"
  ON public.api_keys FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR created_by = auth.uid()
  );

-- Add index for faster lookups
CREATE INDEX idx_api_keys_machine_id ON public.api_keys(machine_id);
CREATE INDEX idx_api_keys_key ON public.api_keys(key);