// ========================================
// IOT NEXUS - CREATE DEMO USERS
// ========================================
// Supabase Edge Function to create all demo users
// This uses the Admin API to create auth users programmatically
// ========================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the service role key (admin privileges)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('Creating demo users...')

    // Define all users to create
    const users = [
      // Super Admin
      { email: 'headoffice@crowntechnologies.co.za', name: 'Head Office', role: 'super_admin', company: null, installer: null },
      
      // Companies
      { email: 'ironhorse@company.com', name: 'Ironhorse', role: 'company', company: null, installer: null },
      { email: 'crown@crowntechnologies.co.za', name: 'Crowntechnologies', role: 'company', company: null, installer: null },
      { email: 'tom@tomhvac.com', name: 'TomHVAC', role: 'company', company: null, installer: null },
      
      // Installers for Ironhorse
      { email: 'blessing@installer.com', name: 'Blessing Mkhize', role: 'installer', company: 'ironhorse@company.com', installer: null },
      { email: 'thami@installer.com', name: 'Thami Ndlovu', role: 'installer', company: 'ironhorse@company.com', installer: null },
      { email: 'mark@installer.com', name: 'Mark Johnson', role: 'installer', company: 'ironhorse@company.com', installer: null },
      
      // Installers for Crown
      { email: 'james@installer.com', name: 'James Smith', role: 'installer', company: 'crown@crowntechnologies.co.za', installer: null },
      { email: 'david@installer.com', name: 'David Williams', role: 'installer', company: 'crown@crowntechnologies.co.za', installer: null },
      { email: 'michael@installer.com', name: 'Michael Brown', role: 'installer', company: 'crown@crowntechnologies.co.za', installer: null },
      { email: 'robert@installer.com', name: 'Robert Davis', role: 'installer', company: 'crown@crowntechnologies.co.za', installer: null },
      
      // Installers for TomHVAC
      { email: 'william@installer.com', name: 'William Miller', role: 'installer', company: 'tom@tomhvac.com', installer: null },
      { email: 'joseph@installer.com', name: 'Joseph Wilson', role: 'installer', company: 'tom@tomhvac.com', installer: null },
      { email: 'charles@installer.com', name: 'Charles Moore', role: 'installer', company: 'tom@tomhvac.com', installer: null },
    ]

    // Add 20 clients (2 per installer)
    const installers = [
      'blessing@installer.com', 'thami@installer.com', 'mark@installer.com',
      'james@installer.com', 'david@installer.com', 'michael@installer.com', 'robert@installer.com',
      'william@installer.com', 'joseph@installer.com', 'charles@installer.com'
    ]

    for (let i = 1; i <= 20; i++) {
      const installerEmail = installers[Math.floor((i - 1) / 2)]
      users.push({
        email: `client${i}@client.com`,
        name: `Client ${i}`,
        role: 'client',
        company: null,
        installer: installerEmail
      })
    }

    const userMap = new Map() // email -> user_id
    const password = 'Demo123!'

    // Create all auth users
    console.log(`Creating ${users.length} auth users...`)
    for (const user of users) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: password,
        email_confirm: true,
        user_metadata: { name: user.name }
      })

      if (error) {
        console.error(`Error creating user ${user.email}:`, error)
        continue
      }

      console.log(`✅ Created user: ${user.email}`)
      userMap.set(user.email, data.user.id)
    }

    console.log(`Created ${userMap.size} users successfully`)

    // Now create profiles, roles, and relationships using SQL
    const { data: sqlData, error: sqlError } = await supabaseAdmin.rpc('setup_demo_hierarchy', {
      user_data: JSON.stringify(Array.from(userMap.entries()))
    })

    if (sqlError) {
      console.error('Error setting up hierarchy:', sqlError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to set up user hierarchy',
          details: sqlError,
          usersCreated: userMap.size
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Demo users created successfully!',
        usersCreated: userMap.size,
        details: {
          superAdmin: 1,
          companies: 3,
          installers: 10,
          clients: 20,
          total: 34
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in create-demo-users function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

