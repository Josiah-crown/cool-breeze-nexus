# Quickest Fix for Connection Status Issue

## The Problem
- `cirrus` table shows `is_connected = true`
- `machines` table shows `is_connected = false`
- Migration 26 didn't fix it
- Diagnostic script has RLS permission issues

## The Solution (Choose One)

### Option 1: Direct SQL Fix (FASTEST - 30 seconds)
1. Open Supabase Dashboard > SQL Editor
2. Copy and paste the entire contents of `docs/supabase/DIRECT_FIX_CONNECTION.sql`
3. Replace the machine ID if needed
4. Click "Run"
5. Done! ✅

This will:
- Show you the current state
- Fix the mismatch directly
- Verify it worked

### Option 2: Fix RLS First, Then Use Script
1. Run `docs/supabase/FIX_RLS_FOR_CIRRUS.sql` in SQL Editor
2. Then run: `node scripts/check-and-fix-connection.mjs`

### Option 3: Use Service Role Key
1. Get service role key from: Dashboard > Settings > API > service_role (secret)
2. Set it: `$env:SUPABASE_SERVICE_ROLE_KEY="your-key"`
3. Run: `node scripts/check-and-fix-connection.mjs`

## Recommended: Use Option 1
It's the fastest and will fix the issue immediately. Then we can investigate why Migration 26 didn't work.

