-- Add DELETE policies for machines table

-- Super admins can delete any machine
CREATE POLICY "Super admins can delete machines"
ON public.machines
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Admins can delete their own machines and their clients' machines
CREATE POLICY "Admins can delete their own and clients' machines"
ON public.machines
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND (
    owner_id = auth.uid() 
    OR owner_id IN (
      SELECT client_id 
      FROM client_admin_assignments 
      WHERE admin_id = auth.uid()
    )
  )
);

-- Machine owners can delete their own machines
CREATE POLICY "Owners can delete their own machines"
ON public.machines
FOR DELETE
USING (owner_id = auth.uid());