-- Allow users to insert their own client role at signup (safe: only 'client')
CREATE POLICY "Users can insert their own client role"
ON public.user_roles
FOR INSERT
WITH CHECK (user_id = auth.uid() AND role = 'client'::app_role);