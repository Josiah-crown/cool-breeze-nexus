// ESP32 Data Receiver - Validates Machine API Key and inserts reading
// NOTE: This is a Deno Edge Function (not Node.js)
// TypeScript errors are expected in regular IDE, but file deploys correctly to Supabase

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
    // Get Authorization header (Machine API Key)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const machineApiKey = authHeader.replace('Bearer ', '')

    // Create Supabase client
    // Prefer EDGE_* variables to avoid CLI restrictions on SUPABASE_* secrets
    // @ts-ignore - Deno.env is available in Deno runtime
    const supabaseUrl =
      Deno.env.get('EDGE_SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL')
    // @ts-ignore - Deno.env is available in Deno runtime
    const supabaseKey =
      Deno.env.get('EDGE_SUPABASE_SERVICE_ROLE_KEY') ??
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing credentials:', { 
        hasUrl: !!supabaseUrl, 
        hasKey: !!supabaseKey,
        urlSource: Deno.env.get('EDGE_SUPABASE_URL') ? 'EDGE_*' : 'SUPABASE_*'
      })
      return new Response(
        JSON.stringify({ error: 'Missing Supabase credentials on the edge function' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get request body
    const reading = await req.json()
    
    console.log('Processing request for machine:', reading.machine_id)
    console.log('Received API key:', machineApiKey)

    // Validate Machine API Key
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('machine_id, is_active, key')
      .eq('key', machineApiKey)
      .eq('machine_id', reading.machine_id)
      .single()

    console.log('API key lookup result:', { 
      found: !!apiKeyData, 
      error: apiKeyError?.message,
      isActive: apiKeyData?.is_active 
    })

    if (apiKeyError || !apiKeyData || !apiKeyData.is_active) {
      console.error('API key validation failed:', { apiKeyError, apiKeyData })
      return new Response(
        JSON.stringify({ error: 'Invalid or inactive Machine API Key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Rate limiting: Check if enough time has passed since last call (2 minutes minimum)
    // Note: If function doesn't exist, we'll skip rate limiting (graceful degradation)
    let rateLimitData: boolean | null = null
    try {
      const { data, error: rateLimitError } = await supabase
        .rpc('check_rate_limit', {
          p_machine_id: reading.machine_id,
          p_min_interval_seconds: 120 // 2 minutes
        })

      if (rateLimitError) {
        console.error('Rate limit check error (function may not exist):', rateLimitError)
        // Continue anyway - don't block on rate limit check failure
        // This allows the function to work even if the migration hasn't been run
        rateLimitData = null
      } else {
        rateLimitData = data
      }
    } catch (err) {
      console.error('Rate limit check exception:', err)
      // Continue anyway - graceful degradation
      rateLimitData = null
    }

    if (rateLimitData === false) {
      console.log('Rate limit exceeded for machine:', reading.machine_id)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Rate limit exceeded. Please wait 2 minutes between updates.',
          retry_after: 120
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': '120'
          } 
        }
      )
    }

    // NO CALCULATIONS - Only insert RAW data!
    // All calculations will be done in Supabase database trigger
    // Map ESP32 field names to database column names
    // Support both Cirrus (voltage_input_1-4) and CoolBreeze (exhaust_voltage, fan_voltage, etc.) formats
    
    // Determine voltage input mapping
    // Cirrus sends: voltage_input_1, voltage_input_2, voltage_input_3, voltage_input_4
    // CoolBreeze sends: exhaust_voltage, fan_voltage, pump_voltage, drain_voltage
    // We map both to voltage_input_1-4 for readings_raw table
    
    const rawReading: any = {
      machine_id: reading.machine_id,
      motor_temp: reading.motor_temp,
      inside_temp: reading.inside_temp,
      outside_temp: reading.outside_temp,
      current: reading.current,
      voltage: reading.voltage || null, // Line voltage (230V for CoolBreeze, null for Cirrus)
      power: reading.power || null, // Apparent power (may be null - will be calculated in trigger)
      has_water: reading.has_water,
      sensor_read_count: reading.sensor_read_count || 1 // Number of readings averaged (default to 1)
    }
    
    // Only add api_key_used if column exists (migration may not be run yet)
    // This allows graceful degradation if the migration hasn't been applied
    try {
      // We'll try to insert it, but if it fails, we'll retry without it
      rawReading.api_key_used = machineApiKey.substring(0, 8) + '...' // Store partial key for tracking
    } catch (err) {
      // Column doesn't exist - skip it
      console.log('api_key_used column not available, skipping')
    }
    
    // Map voltage inputs - support both formats
    if (reading.voltage_input_1 !== undefined) {
      // Cirrus/Universal format (direct voltage_input_1-5)
      rawReading.voltage_input_1 = reading.voltage_input_1
      rawReading.voltage_input_2 = reading.voltage_input_2
      rawReading.voltage_input_3 = reading.voltage_input_3
      rawReading.voltage_input_4 = reading.voltage_input_4
      rawReading.voltage_input_5 = reading.voltage_input_5 || null  // GPIO5 - Float/Heat Relay
    } else if (reading.exhaust_voltage !== undefined) {
      // CoolBreeze format (named voltages) - map to voltage_input_1-4
      // Default mapping: exhaust=1, fan=2, pump=3, drain=4
      // This can be reconfigured per machine in machine_voltage_config table
      rawReading.voltage_input_1 = reading.exhaust_voltage
      rawReading.voltage_input_2 = reading.fan_voltage
      rawReading.voltage_input_3 = reading.pump_voltage
      rawReading.voltage_input_4 = reading.drain_voltage
      rawReading.voltage_input_5 = reading.voltage_input_5 || null  // Optional
    } else {
      // No voltage inputs provided - set to null
      rawReading.voltage_input_1 = null
      rawReading.voltage_input_2 = null
      rawReading.voltage_input_3 = null
      rawReading.voltage_input_4 = null
      rawReading.voltage_input_5 = null
    }

    // Insert RAW reading into readings_raw (bypass RLS with service role)
    // Database triggers will automatically route to correct manufacturer table (cirrus, coolbreeze, etc.)
    // Try with api_key_used first, if it fails, retry without it (graceful degradation)
    let { data, error } = await supabase
      .from('readings_raw')
      .insert(rawReading)
      .select()
      .single()

    // If error is about api_key_used column, retry without it
    if (error && error.message && error.message.includes('api_key_used')) {
      console.log('api_key_used column not found, retrying without it')
      delete rawReading.api_key_used
      const retryResult = await supabase
        .from('readings_raw')
        .insert(rawReading)
        .select()
        .single()
      data = retryResult.data
      error = retryResult.error
    }

    if (error) {
      console.error('Insert error:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update last_used_at for API key
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('key', machineApiKey)

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

