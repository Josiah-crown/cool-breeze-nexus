// Quick diagnostic script using Supabase JS client
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wjyanxstvbiqefmgpccb.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseKey) {
  console.error('❌ VITE_SUPABASE_ANON_KEY not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const machineId = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42';

async function diagnose() {
  console.log('🔍 Diagnosing connection status...\n');

  // Get latest cirrus reading
  const { data: cirrusData, error: cirrusError } = await supabase
    .from('cirrus')
    .select('*')
    .eq('machine_id', machineId)
    .order('timestamp', { ascending: false })
    .limit(1)
    .single();

  if (cirrusError) {
    console.error('❌ Error fetching cirrus data:', cirrusError);
    return;
  }

  // Get machine status
  const { data: machineData, error: machineError } = await supabase
    .from('machines')
    .select('*')
    .eq('id', machineId)
    .single();

  if (machineError) {
    console.error('❌ Error fetching machine data:', machineError);
    return;
  }

  // Calculate minutes ago
  const minutesAgo = cirrusData 
    ? (Date.now() - new Date(cirrusData.timestamp).getTime()) / 1000 / 60
    : null;

  console.log('📊 DIAGNOSTIC RESULTS:\n');
  console.log('=== CIRRUS TABLE ===');
  console.log('Timestamp:', cirrusData?.timestamp || 'NO DATA');
  console.log('is_connected:', cirrusData?.is_connected);
  console.log('Minutes ago:', minutesAgo?.toFixed(2) || 'N/A');
  console.log('Current:', cirrusData?.current || 'N/A');
  
  console.log('\n=== MACHINES TABLE ===');
  console.log('Name:', machineData?.name);
  console.log('is_connected:', machineData?.is_connected);
  console.log('Updated at:', machineData?.updated_at);
  console.log('Current:', machineData?.current || 'N/A');

  console.log('\n=== ANALYSIS ===');
  const shouldBeConnected = cirrusData?.is_connected === true && minutesAgo <= 15;
  console.log('Should be connected:', shouldBeConnected ? '✅ YES' : '❌ NO');
  console.log('Reason:', 
    !cirrusData?.is_connected ? 'Cirrus says disconnected' :
    minutesAgo > 15 ? `Data is ${minutesAgo.toFixed(2)} minutes old (> 15 min)` :
    'Should be connected!'
  );
  
  const isMismatch = machineData?.is_connected !== shouldBeConnected;
  console.log('\nStatus match:', isMismatch ? '❌ MISMATCH!' : '✅ MATCHED');
  
  if (isMismatch) {
    console.log('\n🔧 FIXING...');
    // Call the update function
    const { error: updateError } = await supabase.rpc('update_machine_from_latest_reading', {
      p_machine_id: machineId
    });
    
    if (updateError) {
      console.error('❌ Error calling update function:', updateError);
    } else {
      console.log('✅ Update function called successfully');
      
      // Check again
      const { data: updatedMachine } = await supabase
        .from('machines')
        .select('is_connected')
        .eq('id', machineId)
        .single();
      
      console.log('\n=== AFTER FIX ===');
      console.log('is_connected:', updatedMachine?.is_connected);
      console.log('Match:', updatedMachine?.is_connected === shouldBeConnected ? '✅ FIXED!' : '❌ Still mismatched');
    }
  }
}

diagnose().catch(console.error);

