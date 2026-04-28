// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Use POST' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { machine_id: machineId, period, table_name: tableName } = body;

    if (!machineId) {
      return new Response(
        JSON.stringify({ error: 'machine_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create admin client with service role key (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Call the JSONB wrapper RPC. This returns a single JSONB value (an
    // array of row objects) so PostgREST's default row limit (~1000) can't
    // truncate our 7d_3m / 30d_10m / 1y_1h buffers. The wrapper delegates
    // to get_historical_data() internally, so all aggregation logic is
    // still defined in one place.
    console.log('Calling RPC with params:', { machineId, period, tableName });
    const { data, error } = await supabaseAdmin.rpc('get_historical_data_json', {
      p_machine_id: machineId,
      p_period: period || '24h',
      p_table_name: tableName || 'cirrus',
    });

    if (error) {
      console.error('RPC error:', error);
      return new Response(
        JSON.stringify({ error: 'Database RPC error', details: error.message }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // `data` is already a JSON array (Postgres JSONB -> JS array), so we
    // can forward it directly without reshaping.
    const rows = Array.isArray(data) ? data : [];
    console.log('RPC returned data, length:', rows.length);
    
    return new Response(
      JSON.stringify({ data: rows }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (err: any) {
    console.error('Error in get-historical-data function:', err);
    return new Response(
      JSON.stringify({ error: 'Internal error', message: err?.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

