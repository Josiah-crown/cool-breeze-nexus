// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const machineTypes = ['fan', 'heatpump', 'airconditioner'];

Deno.serve(async (req) => {
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

    const { setup_key } = await req.json();
    
    if (setup_key !== 'SETUP_DEMO_2025') {
      throw new Error('Invalid setup key');
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Delete all existing data
    await adminClient.from('machines').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminClient.from('api_keys').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminClient.from('client_admin_assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminClient.from('installer_company_assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminClient.from('user_roles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminClient.from('profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Delete all auth users
    const { data: { users } } = await adminClient.auth.admin.listUsers();
    for (const user of users) {
      await adminClient.auth.admin.deleteUser(user.id);
    }

    const password = 'Winning2025';
    const userIds: Record<string, string> = {};

    // 1. Create Super Admin
    const { data: superAdmin } = await adminClient.auth.admin.createUser({
      email: 'headoffice@crowntechnologies.com',
      password,
      email_confirm: true,
      user_metadata: { name: 'Crowntechnologies head office' },
    });
    userIds.superAdmin = superAdmin!.user.id;
    
    await adminClient.from('profiles').insert({
      id: userIds.superAdmin,
      name: 'Crowntechnologies head office',
      email: 'headoffice@crowntechnologies.com',
      cell_number: '+27000000000',
      country: 'South Africa',
      state: 'Gauteng',
      city: 'Johannesburg',
      street: 'Main Street',
      suburb: 'CBD',
      full_name_business: 'Crown Technologies Head Office',
    });
    
    await adminClient.from('user_roles').insert({
      user_id: userIds.superAdmin,
      role: 'super_admin',
      created_by: userIds.superAdmin,
    });

    // 2. Create Company
    const { data: company } = await adminClient.auth.admin.createUser({
      email: 'company@crowntechnologies.com',
      password,
      email_confirm: true,
      user_metadata: { name: 'Crowntechnologies' },
    });
    userIds.company = company!.user.id;
    
    await adminClient.from('profiles').insert({
      id: userIds.company,
      name: 'Crowntechnologies',
      email: 'company@crowntechnologies.com',
      cell_number: '+27111111111',
      country: 'South Africa',
      state: 'Gauteng',
      city: 'Johannesburg',
      street: 'Corporate Drive',
      suburb: 'Sandton',
      full_name_business: 'Crown Technologies',
    });
    
    await adminClient.from('user_roles').insert({
      user_id: userIds.company,
      role: 'company',
      created_by: userIds.superAdmin,
    });

    // 3. Create Installers
    const installers = [
      { name: 'Blessing', email: 'blessing@crowntechnologies.com', cell: '+27222222222' },
      { name: 'Thami', email: 'thami@crowntechnologies.com', cell: '+27333333333' },
      { name: 'Mark', email: 'mark@crowntechnologies.com', cell: '+27444444444' },
    ];

    for (const installer of installers) {
      const { data: user } = await adminClient.auth.admin.createUser({
        email: installer.email,
        password,
        email_confirm: true,
        user_metadata: { name: installer.name },
      });
      userIds[installer.name] = user!.user.id;
      
      await adminClient.from('profiles').insert({
        id: userIds[installer.name],
        name: installer.name,
        email: installer.email,
        cell_number: installer.cell,
        country: 'South Africa',
        state: 'Gauteng',
        city: 'Johannesburg',
        street: 'Installer Street',
        suburb: 'Randburg',
        full_name_business: `${installer.name} Installations`,
      });
      
      await adminClient.from('user_roles').insert({
        user_id: userIds[installer.name],
        role: 'installer',
        created_by: userIds.superAdmin,
      });
      
      await adminClient.from('installer_company_assignments').insert({
        installer_id: userIds[installer.name],
        company_id: userIds.company,
        assigned_by: userIds.superAdmin,
      });
    }

    // 4. Create Clients
    const clients = [
      { name: 'Afrihost', email: 'afrihost@crowntechnologies.com', cell: '+27555555555', installer: 'Blessing' },
      { name: 'Neil Britz', email: 'neil@crowntechnologies.com', cell: '+27666666666', installer: 'Thami' },
      { name: 'Sean Prohn', email: 'sean@crowntechnologies.com', cell: '+27777777777', installer: 'Mark' },
    ];

    for (const client of clients) {
      const { data: user } = await adminClient.auth.admin.createUser({
        email: client.email,
        password,
        email_confirm: true,
        user_metadata: { name: client.name },
      });
      userIds[client.name] = user!.user.id;
      
      await adminClient.from('profiles').insert({
        id: userIds[client.name],
        name: client.name,
        email: client.email,
        cell_number: client.cell,
        country: 'South Africa',
        state: 'Western Cape',
        city: 'Cape Town',
        street: 'Client Avenue',
        suburb: 'Green Point',
        full_name_business: client.name,
      });
      
      await adminClient.from('user_roles').insert({
        user_id: userIds[client.name],
        role: 'client',
        created_by: userIds[client.installer],
      });
      
      await adminClient.from('client_admin_assignments').insert({
        client_id: userIds[client.name],
        admin_id: userIds[client.installer],
        assigned_by: userIds.superAdmin,
      });
    }

    // 5. Create 27 machines (9 of each type)
    // Distribution: Blessing (5), Thami (4), Mark (4), Afrihost (5), Neil (5), Sean (4)
    const machineDistribution = [
      { owner: 'Blessing', count: 5 },
      { owner: 'Thami', count: 4 },
      { owner: 'Mark', count: 4 },
      { owner: 'Afrihost', count: 5 },
      { owner: 'Neil Britz', count: 5 },
      { owner: 'Sean Prohn', count: 4 },
    ];

    let machineIndex = 0;
    let typeIndex = 0;
    
    for (const dist of machineDistribution) {
      for (let i = 0; i < dist.count; i++) {
        const type = machineTypes[typeIndex % 3];
        machineIndex++;
        
        await adminClient.from('machines').insert({
          owner_id: userIds[dist.owner],
          name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${machineIndex}`,
          type: type,
          is_on: machineIndex % 2 === 0,
          is_connected: true,
          has_water: true,
          is_cooling: machineIndex % 3 === 0,
          fan_active: machineIndex % 2 === 1,
          motor_temp: 45 + (machineIndex % 15),
          outside_temp: 25 + (machineIndex % 10),
          inside_temp: 20 + (machineIndex % 8),
          delta_t: 5 + (machineIndex % 5),
          current: 10 + (machineIndex % 5),
          voltage: 220 + (machineIndex % 20),
          power: 2000 + (machineIndex * 100),
          overall_status: machineIndex % 9 === 0 ? 'error' : (machineIndex % 5 === 0 ? 'warning' : 'good'),
          motor_status: machineIndex % 9 === 0 ? 'critical' : (machineIndex % 5 === 0 ? 'warning' : 'normal'),
        });
        
        typeIndex++;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Demo data created successfully',
        accounts: {
          super_admin: { email: 'headoffice@crowntechnologies.com', password },
          company: { email: 'company@crowntechnologies.com', password },
          installers: [
            { name: 'Blessing', email: 'blessing@crowntechnologies.com', password },
            { name: 'Thami', email: 'thami@crowntechnologies.com', password },
            { name: 'Mark', email: 'mark@crowntechnologies.com', password },
          ],
          clients: [
            { name: 'Afrihost', email: 'afrihost@crowntechnologies.com', password, installer: 'Blessing' },
            { name: 'Neil Britz', email: 'neil@crowntechnologies.com', password, installer: 'Thami' },
            { name: 'Sean Prohn', email: 'sean@crowntechnologies.com', password, installer: 'Mark' },
          ],
        },
        machines: '27 machines created (9 fans, 9 heatpumps, 9 airconditioners)',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error('Error in setup-demo-data:', e);
    return new Response(JSON.stringify({ error: e?.message || 'Unexpected error' }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
