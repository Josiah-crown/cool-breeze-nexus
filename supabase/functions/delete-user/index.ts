import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create client with service role key for admin operations
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Create client with user's token to verify their identity
    const supabaseUser = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get the requesting user
    const { data: { user: requestingUser }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !requestingUser) {
      throw new Error('Invalid user token');
    }

    // Get requesting user's role
    const { data: requestingUserRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .single();

    if (roleError || !requestingUserRole) {
      throw new Error('Could not determine user role');
    }

    const { user_id: userIdToDelete } = await req.json();

    if (!userIdToDelete) {
      throw new Error('user_id is required');
    }

    // Get the role of user to be deleted
    const { data: targetUserRole, error: targetRoleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userIdToDelete)
      .single();

    if (targetRoleError || !targetUserRole) {
      throw new Error('Could not find user to delete');
    }

    // Authorization checks
    const isSelfDelete = requestingUser.id === userIdToDelete;
    const isRequestingSuperAdmin = requestingUserRole.role === 'super_admin';
    const isRequestingAdmin = requestingUserRole.role === 'admin';
    const isTargetSuperAdmin = targetUserRole.role === 'super_admin';
    const isTargetClient = targetUserRole.role === 'client';

    // Check if this is the last super admin
    if (isTargetSuperAdmin) {
      const { data: superAdminCount } = await supabaseAdmin.rpc('count_super_admins');
      
      if (superAdminCount <= 1) {
        return new Response(
          JSON.stringify({ 
            error: 'Cannot delete the last super admin account. Create another super admin first.' 
          }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Verify authorization
    if (!isSelfDelete) {
      // If not self-delete, check if user has permission
      if (!isRequestingSuperAdmin) {
        // If not super admin, check if admin deleting their client
        if (isRequestingAdmin && isTargetClient) {
          const { data: assignment } = await supabaseAdmin
            .from('client_admin_assignments')
            .select('id')
            .eq('admin_id', requestingUser.id)
            .eq('client_id', userIdToDelete)
            .single();

          if (!assignment) {
            throw new Error('Not authorized to delete this user');
          }
        } else {
          throw new Error('Not authorized to delete this user');
        }
      }
    }

    // Delete user from auth (this will cascade to other tables via RLS and ON DELETE CASCADE)
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userIdToDelete);

    if (deleteAuthError) {
      console.error('Error deleting user from auth:', deleteAuthError);
      throw deleteAuthError;
    }

    console.log(`User ${userIdToDelete} deleted successfully by ${requestingUser.id}`);

    return new Response(
      JSON.stringify({ success: true, message: 'User deleted successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in delete-user function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: error.message.includes('Not authorized') ? 403 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
