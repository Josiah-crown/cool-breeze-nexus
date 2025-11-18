// Simple script to check and fix connection status
// Run with: node scripts/check-and-fix-connection.mjs

import { createClient } from '@supabase/supabase-js';

// Using service role key to bypass RLS for diagnostic purposes
// Get this from: Supabase Dashboard > Settings > API > service_role key (secret)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://wjyanxstvbiqefmgpccb.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found!');
  console.log('\n📝 To get your service role key:');
  console.log('   1. Go to Supabase Dashboard > Settings > API');
  console.log('   2. Copy the "service_role" key (secret, not anon key)');
  console.log('   3. Set it as environment variable:');
  console.log('      $env:SUPABASE_SERVICE_ROLE_KEY="your-key-here"');
  console.log('   4. Or edit this script and paste it directly on line 9\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const machineId = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42';

async function checkAndFix() {
  console.log('🔍 Checking connection status...\n');

  // Get latest cirrus reading
  const { data: cirrus, error: cirrusErr } = await supabase
    .from('cirrus')
    .select('*')
    .eq('machine_id', machineId)
    .order('timestamp', { ascending: false })
    .limit(1)
    .single();

  if (cirrusErr || !cirrus) {
    console.error('❌ Error fetching cirrus data:', cirrusErr?.message || 'No data');
    return;
  }

  // Get machine status
  const { data: machine, error: machineErr } = await supabase
    .from('machines')
    .select('*')
    .eq('id', machineId)
    .single();

  if (machineErr || !machine) {
    console.error('❌ Error fetching machine data:', machineErr?.message || 'No data');
    return;
  }

  const minutesAgo = (Date.now() - new Date(cirrus.timestamp).getTime()) / 1000 / 60;
  const shouldBeConnected = cirrus.is_connected === true && minutesAgo <= 15;

  console.log('📊 Current State:');
  console.log(`  Cirrus: is_connected=${cirrus.is_connected}, ${minutesAgo.toFixed(2)} min ago`);
  console.log(`  Machines: is_connected=${machine.is_connected}`);
  console.log(`  Should be: ${shouldBeConnected ? 'CONNECTED ✅' : 'DISCONNECTED ❌'}`);
  console.log(`  Match: ${machine.is_connected === shouldBeConnected ? '✅' : '❌ MISMATCH'}\n`);

  if (machine.is_connected !== shouldBeConnected) {
    console.log('🔧 Calling update function...');
    
    const { error: updateErr } = await supabase.rpc('update_machine_from_latest_reading', {
      p_machine_id: machineId
    });

    if (updateErr) {
      console.error('❌ Error calling function:', updateErr.message);
      console.log('\n💡 Try running Migration 26 first, or use DIRECT_FIX_CONNECTION.sql');
    } else {
      console.log('✅ Function called successfully!');
      
      // Check again
      const { data: updated } = await supabase
        .from('machines')
        .select('is_connected')
        .eq('id', machineId)
        .single();

      console.log(`\n📊 After fix: is_connected=${updated?.is_connected}`);
      console.log(`  Match: ${updated?.is_connected === shouldBeConnected ? '✅ FIXED!' : '❌ Still wrong'}`);
    }
  } else {
    console.log('✅ Already correct - no fix needed!');
  }
}

checkAndFix().catch(console.error);

