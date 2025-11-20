// ========================================
// IOT NEXUS - CREATE ALL 34 DEMO USERS
// ========================================
// Node.js script using Supabase Admin SDK
// Creates demo users for testing the platform
// ========================================

import { createClient } from '@supabase/supabase-js'

// Your Supabase credentials
const SUPABASE_URL = 'https://wjyanxstvbiqefmgpccb.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqeWFueHN0dmJpcWVmbWdwY2NiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjIzMjg0NSwiZXhwIjoyMDc3ODA4ODQ1fQ.LkSilEK_DT2SFfJb57R1QuDOHj3amYB46e1xu4UIBoQ' // Get from Supabase Dashboard > Settings > API

// Create admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const users = [
  // Super Admin
  { email: 'headoffice@crowntechnologies.co.za', name: 'Head Office' },
  
  // Companies (3)
  { email: 'ironhorse@company.com', name: 'Ironhorse' },
  { email: 'crown@crowntechnologies.co.za', name: 'Crowntechnologies' },
  { email: 'tom@tomhvac.com', name: 'TomHVAC' },
  
  // Installers (10)
  { email: 'blessing@installer.com', name: 'Blessing Mkhize' },
  { email: 'thami@installer.com', name: 'Thami Ndlovu' },
  { email: 'mark@installer.com', name: 'Mark Johnson' },
  { email: 'james@installer.com', name: 'James Smith' },
  { email: 'david@installer.com', name: 'David Williams' },
  { email: 'michael@installer.com', name: 'Michael Brown' },
  { email: 'robert@installer.com', name: 'Robert Davis' },
  { email: 'william@installer.com', name: 'William Miller' },
  { email: 'joseph@installer.com', name: 'Joseph Wilson' },
  { email: 'charles@installer.com', name: 'Charles Moore' },
]

// Add 20 clients
for (let i = 1; i <= 20; i++) {
  users.push({
    email: `client${i}@client.com`,
    name: `Client ${i}`
  })
}

async function createUsers() {
  console.log('========================================')
  console.log('IOT NEXUS - CREATING DEMO USERS')
  console.log('========================================')
  console.log(`Creating ${users.length} users...`)
  console.log('Password for all: Demo123!')
  console.log('========================================\n')

  let created = 0
  let skipped = 0

  for (const user of users) {
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: 'Demo123!',
        email_confirm: true,
        user_metadata: { name: user.name }
      })

      if (error) {
        if (error.message.includes('already registered')) {
          console.log(`⏭️  Skipped: ${user.email} (already exists)`)
          skipped++
        } else {
          console.error(`❌ Error: ${user.email} - ${error.message}`)
        }
      } else {
        console.log(`✅ Created: ${user.email}`)
        created++
      }
    } catch (err) {
      console.error(`❌ Exception: ${user.email} - ${err.message}`)
    }
  }

  console.log('\n========================================')
  console.log('SUMMARY')
  console.log('========================================')
  console.log(`✅ Created: ${created}`)
  console.log(`⏭️  Skipped: ${skipped}`)
  console.log(`📊 Total: ${users.length}`)
  console.log('========================================\n')
  console.log('Next steps:')
  console.log('1. Run SETUP_DEMO.sql in Supabase SQL Editor')
  console.log('2. Login at http://localhost:8080')
  console.log('3. Email: headoffice@crowntechnologies.co.za')
  console.log('4. Password: Demo123!')
  console.log('========================================')
}

createUsers().catch(console.error)

