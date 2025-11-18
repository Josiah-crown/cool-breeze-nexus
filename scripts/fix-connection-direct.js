// Direct fix using Supabase REST API
// This bypasses RLS and directly queries/updates the database

const SUPABASE_URL = 'https://wjyanxstvbiqefmgpccb.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.log('⚠️  SUPABASE_SERVICE_ROLE_KEY not found.');
  console.log('📝 Please run this query directly in Supabase SQL Editor instead:');
  console.log('');
  console.log('See: docs/supabase/DIRECT_FIX_CONNECTION.sql');
  process.exit(0);
}

const machineId = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42';

async function fixConnection() {
  // Get latest cirrus reading
  const cirrusResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/cirrus?machine_id=eq.${machineId}&order=timestamp.desc&limit=1`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      }
    }
  );

  const cirrusData = await cirrusResponse.json();
  const latestCirrus = cirrusData[0];

  if (!latestCirrus) {
    console.log('❌ No cirrus data found');
    return;
  }

  const minutesAgo = (Date.now() - new Date(latestCirrus.timestamp).getTime()) / 1000 / 60;
  const shouldBeConnected = latestCirrus.is_connected === true && minutesAgo <= 15;

  console.log('📊 Current State:');
  console.log('  Cirrus is_connected:', latestCirrus.is_connected);
  console.log('  Minutes ago:', minutesAgo.toFixed(2));
  console.log('  Should be connected:', shouldBeConnected);

  // Get current machine status
  const machineResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/machines?id=eq.${machineId}`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      }
    }
  );

  const machineData = await machineResponse.json();
  const machine = machineData[0];

  console.log('  Machines is_connected:', machine?.is_connected);
  console.log('  Match:', machine?.is_connected === shouldBeConnected ? '✅' : '❌ MISMATCH');

  if (machine?.is_connected !== shouldBeConnected) {
    console.log('\n🔧 Fixing...');
    
    // Update machines table
    const updateResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/machines?id=eq.${machineId}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          is_connected: shouldBeConnected,
          motor_temp: shouldBeConnected ? latestCirrus.motor_temp : 0,
          outside_temp: shouldBeConnected ? latestCirrus.ambient_temp : 0,
          inside_temp: shouldBeConnected ? latestCirrus.duct_temp : 0,
          delta_t: shouldBeConnected ? latestCirrus.delta_t : 0,
          current: shouldBeConnected ? latestCirrus.current : 0,
          voltage: shouldBeConnected ? latestCirrus.voltage : 0,
          power: shouldBeConnected ? latestCirrus.power : 0,
          is_on: shouldBeConnected ? latestCirrus.is_on : false,
          is_cooling: shouldBeConnected ? latestCirrus.is_cooling : false,
          fan_active: shouldBeConnected ? latestCirrus.fan_active : false,
          has_water: shouldBeConnected ? latestCirrus.has_water : false,
          overall_status: shouldBeConnected ? latestCirrus.overall_status : 'offline',
          motor_status: shouldBeConnected ? latestCirrus.motor_status : 'normal',
          updated_at: new Date().toISOString()
        })
      }
    );

    if (updateResponse.ok) {
      console.log('✅ Fixed! Machines table updated.');
    } else {
      const error = await updateResponse.text();
      console.error('❌ Error updating:', error);
    }
  } else {
    console.log('\n✅ Already matched - no fix needed!');
  }
}

fixConnection().catch(console.error);

