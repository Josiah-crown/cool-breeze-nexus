// CIRRUS Data Cleanup Edge Function
// Calls the database cleanup function to delete records older than 1 year
// Can be scheduled via external cron service or called manually

// @ts-ignore - Deno runtime, not Node.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// @ts-ignore - Deno.serve is available in Deno runtime
Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role
    // @ts-ignore - Deno.env is available in Deno runtime
    const supabaseUrl =
      Deno.env.get('EDGE_SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL')
    // @ts-ignore - Deno.env is available in Deno runtime
    const supabaseKey =
      Deno.env.get('EDGE_SUPABASE_SERVICE_ROLE_KEY') ??
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing credentials')
      return new Response(
        JSON.stringify({ error: 'Missing Supabase credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Call cleanup function
    const { data, error } = await supabase.rpc('auto_cleanup_cirrus_data')

    if (error) {
      console.error('Cleanup error:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Cleanup completed:', data)

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})


