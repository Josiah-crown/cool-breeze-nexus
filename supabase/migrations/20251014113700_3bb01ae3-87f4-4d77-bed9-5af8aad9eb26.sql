-- Create a super admin account
-- First, get the user ID for josiah145@gmail.com and update their role to super_admin
UPDATE public.user_roles
SET role = 'super_admin'
WHERE user_id IN (
  SELECT id FROM public.profiles WHERE email = 'josiah145@gmail.com'
);