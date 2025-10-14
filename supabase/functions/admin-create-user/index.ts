// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace("Bearer ", "");

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Identify requester
    const { data: requesterData, error: requesterErr } = await adminClient.auth.getUser(token);
    if (requesterErr || !requesterData?.user) {
      return new Response(JSON.stringify({ error: "Invalid auth token" }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const requesterId = requesterData.user.id;

    // Load requester role (service role bypasses RLS)
    const { data: roleRows, error: roleErr } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', requesterId)
      .limit(1);

    if (roleErr) {
      return new Response(JSON.stringify({ error: roleErr.message }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const requesterRole = roleRows?.[0]?.role as 'super_admin' | 'admin' | 'client' | undefined;
    if (!requesterRole) {
      return new Response(JSON.stringify({ error: 'Requester has no role assigned' }), { 
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const {
      role, // 'admin' | 'client'
      name,
      email,
      password,
      cellNumber,
      country,
      state,
      city,
      street,
      suburb,
      poBox,
      fullNameBusiness,
      assignToAdmin, // optional - for super_admin assigning client to an admin
    } = body as any;

    // Basic validation
    if (!['admin','client'].includes(role)) {
      return new Response(JSON.stringify({ error: 'Invalid target role' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    if (!email || !password || !name) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Authorization rules
    if (requesterRole === 'admin' && role !== 'client') {
      return new Response(JSON.stringify({ error: 'Only super admins can create admin accounts' }), { 
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create auth user
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (createErr || !created?.user) {
      return new Response(JSON.stringify({ error: createErr?.message || 'Failed to create user' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const newUserId = created.user.id;

    // Create profile
    const { error: profileErr } = await adminClient.from('profiles').insert({
      id: newUserId,
      name,
      email,
      cell_number: cellNumber || '',
      country: country || '',
      state: state || '',
      city: city || '',
      street: street || '',
      suburb: suburb || '',
      po_box: poBox || null,
      full_name_business: fullNameBusiness || name,
    });
    if (profileErr) {
      return new Response(JSON.stringify({ error: profileErr.message }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Assign role
    const { error: roleInsertErr } = await adminClient.from('user_roles').insert({
      user_id: newUserId,
      role,
      created_by: requesterId,
    });
    if (roleInsertErr) {
      return new Response(JSON.stringify({ error: roleInsertErr.message }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Optional: if creating a client, assign to an admin
    if (role === 'client') {
      let adminId: string | undefined;
      if (requesterRole === 'admin') {
        adminId = requesterId; // admin assigns client to self
      } else if (requesterRole === 'super_admin') {
        adminId = assignToAdmin || requesterId; // fallback to requester if not provided
      }

      if (adminId) {
        const { error: assignmentErr } = await adminClient.from('client_admin_assignments').insert({
          client_id: newUserId,
          admin_id: adminId,
          assigned_by: requesterId,
        });
        if (assignmentErr) {
          return new Response(JSON.stringify({ error: assignmentErr.message }), { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, user_id: newUserId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error('Error in admin-create-user:', e);
    return new Response(JSON.stringify({ error: e?.message || 'Unexpected error' }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});