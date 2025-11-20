# Daily Log - November 18, 2025

## Session Summary

### Time Period
Full day session - Focused on fixing RLS (Row Level Security) issues preventing historical data display on the website.

### Overview
Comprehensive debugging session to resolve 403 Forbidden errors when accessing historical data from the `cirrus` table. The root cause was missing table-level GRANT permissions, not RLS policy logic.

---

## ✅ Major Accomplishments

### 1. Fixed Historical Data RLS Access Issue
**Status:** ✅ **RESOLVED** - Historical data now displays correctly on website

**Problem:**
- Users getting `403 (Forbidden)` errors when trying to access historical data
- Error message: `permission denied for table cirrus`
- Even with `USING (true)` policy, access was still blocked

**Root Cause:**
- Missing table-level `GRANT SELECT` permissions for `authenticated` and `anon` roles
- RLS policies control **which rows** users can see
- Table-level GRANTs control **whether** users can access the table at all
- Without GRANTs, RLS policies are irrelevant

**Solution:**
- Created `15_FIX_TABLE_PERMISSIONS.sql` which grants SELECT permission to `authenticated` and `anon` roles
- This was the missing piece that all previous RLS policy fixes couldn't address

**Files Created:**
- `15_FIX_TABLE_PERMISSIONS.sql` - **THE FIX** (grants table-level permissions)
- Multiple diagnostic and fix attempts (01-14) that helped narrow down the issue

### 2. UI Improvements - Manufacturer Display
**Status:** ✅ **COMPLETED**

**Changes Made:**
- Added manufacturer dropdown to "Add New Machine" dialog
  - Only appears if multiple manufacturers available for machine type
  - Auto-selects if only one manufacturer option
- Display manufacturer name on machine card (13px text, centered)
- Added "Change Manufacturer" option to 3-dot menu on machine card
- Fixed spacing between text elements below machine name (gap-1 for consistent spacing)

**Files Modified:**
- `src/components/AddMachineDialog.tsx` - Manufacturer selection logic
- `src/components/MachineCard.tsx` - Manufacturer display and menu item
- `src/components/ChangeManufacturerDialog.tsx` - Updated text from "Model" to "Manufacturer"
- `src/pages/Dashboard.tsx` - Pass manufacturer prop correctly
- `src/types/machine.ts` - Added manufacturer field
- `src/hooks/useMachineData.tsx` - Map manufacturer from database

### 3. Historical Data Display System
**Status:** ✅ **WORKING** - Data now displays correctly

**Components:**
- Historical data fetching from `cirrus` and `coolbreeze` tables
- Chart rendering with proper data alignment (timestamp-based mapping)
- Time period selection (24h, 7d, 30d, 1y)
- Proper field mapping (ambient_temp→outsideTemp, duct_temp→insideTemp, etc.)

**Files:**
- `src/lib/historicalData.ts` - Data fetching logic
- `src/components/MachineDetailView.tsx` - Chart display component
- `src/lib/machineConfig.ts` - Manufacturer-to-table mapping

---

## 🔧 Technical Details

### RLS Policy Fix Journey
We tried multiple approaches before finding the root cause:

1. **Initial Attempts (02-09):** Tried various RLS policy structures
   - Using `has_role()` function
   - Direct role checks
   - Separate policies vs combined policies
   - Enum casting vs no casting

2. **Diagnostics (04, 06, 12):** Created comprehensive diagnostic queries
   - Verified user roles
   - Tested `has_role()` function
   - Checked policy structure
   - Confirmed RLS was enabled

3. **Nuclear Option (10, 12):** Created `USING (true)` policy
   - Even this didn't work, confirming issue wasn't with policy logic

4. **Final Fix (15):** Table-level GRANT permissions
   - This was the missing piece!
   - `GRANT SELECT ON public.cirrus TO authenticated;`
   - `GRANT SELECT ON public.cirrus TO anon;`

### Key Learnings

1. **RLS vs GRANTs:**
   - RLS policies = Row-level access (which rows can you see?)
   - GRANTs = Table-level access (can you access the table at all?)
   - Both are required for proper access control

2. **Supabase REST API:**
   - When RLS is enabled, you MUST have both:
     - Table-level GRANT (allows role to access table)
     - RLS policy (controls which rows are visible)
   - Missing GRANTs will cause 403 errors even with permissive RLS policies

3. **For Future Machine Types:**
   - Always include `GRANT SELECT` statements in migration files
   - Don't assume permissions are inherited
   - Test with `USING (true)` policy first to verify GRANTs work

---

## 📁 Files Created Today

### SQL Fixes and Diagnostics (in TODAY folder):
- `01_FIX_MANUFACTURER_FOR_EXISTING_MACHINE.sql` - Set manufacturer for existing machines
- `02_FIX_RLS_FOR_CIRRUS_HISTORICAL_DATA.sql` - Initial RLS fix attempt
- `02B_FIX_RLS_SIMPLIFIED.sql` - Simplified approach
- `02C_FIX_RLS_COMPLETE.sql` - Complete fix with verification
- `02D_FIX_RLS_WITH_GRANTS.sql` - Added function grants
- `03_FINAL_RLS_FIX.sql` - Comprehensive fix
- `04_DEBUG_RLS_WHY_BLOCKING.sql` - Diagnostic queries
- `05_EMERGENCY_RLS_FIX.sql` - Emergency approach
- `06_QUICK_USER_CHECK.sql` - User role verification
- `07_MATCH_MACHINES_TABLE_POLICIES.sql` - Match machines table structure
- `08_VERIFY_AND_FIX_ACTIVE_POLICIES.sql` - Policy verification
- `09_EXACT_MATCH_MACHINES_POLICY.sql` - Exact match without enum cast
- `10_NUCLEAR_OPTION_TEMPORARY_FIX.sql` - Test with USING (true)
- `12_FINAL_DIAGNOSTIC.sql` - Comprehensive diagnostic
- `13_USE_ORIGINAL_MIGRATION_POLICY.sql` - Original migration structure
- `14_CHECK_TABLE_PERMISSIONS.sql` - Check GRANTs
- `15_FIX_TABLE_PERMISSIONS.sql` - **THE FIX** (grants table permissions)

### Diagnostic Files:
- `QUICK_DIAGNOSTIC.sql` - Quick state check
- `DIAGNOSE_RLS_ISSUE.sql` - RLS diagnostic
- `DIAGNOSE_ZERO_COUNT.sql` - Zero count diagnostic
- `CHECK_HISTORICAL_DATA_FOR_MACHINE.sql` - Machine-specific check
- `03_CHECK_HISTORICAL_DATA_AFTER_FIX.sql` - Post-fix verification

### Documentation:
- `README.md` - Today's workflow guide
- `QUICK_CHECK_HISTORICAL_DATA.md` - Troubleshooting guide
- `TEST_RLS_FROM_FRONTEND.md` - Frontend testing guide
- `11_CHECK_SUPABASE_LOGS.md` - Log checking guide

### Documentation Created:
- `docs/supabase/RLS_POLICY_TEMPLATE_FOR_NEW_TABLES.md` - Template for future machine types

---

## 🐛 Issues Resolved

1. ✅ **403 Forbidden Error** - Fixed by adding table-level GRANT permissions
2. ✅ **Manufacturer Display** - Added to machine card with proper spacing
3. ✅ **Manufacturer Selection** - Added dropdown to Add Machine dialog
4. ✅ **Change Manufacturer Menu** - Added to 3-dot menu on machine card
5. ✅ **Text Spacing** - Fixed spacing between machine name, location, owner, manufacturer

---

## 📝 Notes for Future

### When Adding New Machine Types/Manufacturers:

1. **Create Processing Table:**
   - Create table with proper schema
   - Enable RLS: `ALTER TABLE public.newtable ENABLE ROW LEVEL SECURITY;`

2. **Grant Table Permissions (CRITICAL!):**
   ```sql
   GRANT SELECT ON public.newtable TO authenticated;
   GRANT SELECT ON public.newtable TO anon;
   ```

3. **Create RLS Policies:**
   - Use template from `docs/supabase/RLS_POLICY_TEMPLATE_FOR_NEW_TABLES.md`
   - Match the structure of machines table policies
   - Grant EXECUTE on `has_role()` function

4. **Test:**
   - Create test policy with `USING (true)` first
   - If that works, replace with proper policies
   - If that doesn't work, check GRANTs

### Key Principle:
**GRANTs first, then RLS policies.** Without GRANTs, RLS policies won't matter.

---

## 🎯 Next Steps

1. ✅ Create daily log (this file)
2. ✅ Move completed files from TODAY folder to proper locations
3. ✅ Create DATA_MANAGEMENT.md with organization system
4. ⏳ **Fix GitHub Actions deployment** - FTP authentication failing
5. ⏳ **Manually upload website** - Use cPanel File Manager as temporary solution
6. ⏳ **Verify website works** - Test historical data and manufacturer features on live site

---

## 🚀 Deployment Attempts

### GitHub Actions Deployment
**Status:** ⏳ **IN PROGRESS** - FTP authentication issues

**Attempts Made:**
1. ✅ Fixed workflow file indentation
2. ✅ Fixed FTP action version (`v4` → `v4.3.4`)
3. ✅ Fixed `local-dir` path (added trailing slash: `dist/`)
4. ✅ Fixed `server-dir` path (added trailing slash: `/public_html/`)
5. ❌ **FTP Authentication Failed** - `530 Login authentication failed`

**Current Issue:**
- GitHub Secrets (`CPANEL_USER`, `CPANEL_PASS`) may be incorrect
- Or server only supports SFTP instead of FTPS
- Need to verify credentials or switch to SFTP

**Temporary Solution:**
- Manual upload via cPanel File Manager (see below)

### Manual Upload Process
**For immediate deployment:**

1. **Build locally:**
   ```bash
   npm run build
   ```

2. **Login to cPanel:**
   - Go to your cPanel dashboard
   - Navigate to **File Manager**

3. **Upload files:**
   - Go to `/public_html` directory
   - Delete old files (or backup first)
   - Upload ALL contents from `dist/` folder
   - Make sure `index.html` is in the root of `/public_html`

4. **Set permissions:**
   - Files: 644
   - Folders: 755

5. **Test website:**
   - Visit `https://iotnexus.site`
   - Hard refresh: Ctrl+Shift+R
   - Test new features

---

## 📊 Statistics

- **SQL Files Created:** 25+
- **Diagnostic Queries:** 5
- **Documentation Files:** 6
- **Issues Resolved:** 5
- **Deployment Attempts:** 4
- **Time to Resolution:** Full day debugging session
- **Root Cause:** Missing table-level GRANT permissions

---

## ⏳ Remaining Tasks

### High Priority
1. **Fix GitHub Actions Deployment**
   - Verify GitHub Secrets (`CPANEL_USER`, `CPANEL_PASS`)
   - Test FTP connection manually with FileZilla
   - Determine if server supports FTPS or SFTP
   - Update workflow file if SFTP is needed
   - Or update credentials in GitHub Secrets

2. **Verify Live Website**
   - Test historical data display
   - Test manufacturer features
   - Verify all new functionality works on production

### Medium Priority
3. **Update Supabase Authentication URLs**
   - Add production URL to Supabase dashboard
   - Update Site URL: `https://iotnexus.site`
   - Update Redirect URLs: `https://iotnexus.site/**`

4. **Environment Variables on Server**
   - Verify `VITE_SUPABASE_URL` is set
   - Verify `VITE_SUPABASE_PUBLISHABLE_KEY` is set
   - Check if they're in the build or need to be set on server

### Low Priority
5. **Documentation Updates**
   - Update deployment guide with manual upload process
   - Document GitHub Actions troubleshooting
   - Create quick reference for manual deployments

6. **Build Optimization (Performance)**
   - **Issue:** Build shows warnings about chunk size (1,050.76 kB JS file)
   - **Warning:** "Some chunks are larger than 500 kB after minification"
   - **Impact:** Slower initial page load, especially on mobile/slow connections
   - **Solutions to consider:**
     - Use dynamic `import()` for code-splitting
     - Configure `build.rollupOptions.output.manualChunks` for better chunking
     - Split large components into separate chunks
     - Lazy load routes/components that aren't immediately needed
   - **Priority:** Low - site works, but optimization would improve performance
   - **Note:** Build completed successfully, these are optimization suggestions only

---

## 💡 Key Takeaways

1. **Always check table-level permissions (GRANTs) before debugging RLS policies.** In Supabase, both are required for proper access control. The `authenticated` role needs explicit `GRANT SELECT` permission on tables, even when RLS is enabled.

2. **GitHub Actions workflow files are sensitive to:**
   - Action version numbers (must be specific, not just `v4`)
   - Path formatting (must end with `/` for folders)
   - YAML indentation (must be exact)

3. **FTP deployment requires:**
   - Correct credentials in GitHub Secrets
   - Correct protocol (FTPS vs SFTP)
   - Correct path formatting (trailing slashes)

4. **Manual deployment is always a backup option** when automated deployment fails.

