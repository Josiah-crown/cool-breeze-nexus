# Remaining Tasks - Compiled from Daily Logs

**Last Updated:** November 20, 2025  
**Status:** Active tracking of outstanding tasks from all daily logs  
**Tasks Completed Today:** Migration 4, RLS Policy for Cirrus, Verify Live Website, Fix Connection Status Function

---

## 🔴 High Priority Tasks

### 1. Fix GitHub Actions Deployment
**Source:** November 18, 2025  
**Status:** ✅ **COMPLETED** - November 19, 2025

**Tasks Completed:**
- [x] Added environment variables to GitHub Secrets (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`)
- [x] Updated workflow file to pass environment variables during build
- [x] Verified GitHub Secrets for FTP deployment (`CPANEL_HOST`, `CPANEL_USER`, `CPANEL_PASS`)
- [x] Tested deployment - builds and uploads successfully
- [x] Verified login/authentication works after deployment

**Files:**
- `.github/workflows/deploy.yml` - Updated with environment variables
- `DEPLOYMENT_GUIDE_GITHUB.md` - Created comprehensive deployment guide

**Result:**
- ✅ GitHub Actions deployment now works correctly
- ✅ Environment variables embedded during build
- ✅ Site connects to Supabase after deployment
- ✅ Login/authentication working

---

### 2. Run Migration 4: Add Manufacturer Column
**Source:** November 13, 2025  
**Status:** ✅ **COMPLETED** - Previously completed

**Tasks Completed:**
- [x] Run migration: `supabase/migrations/20250108000003_add_manufacturer_column.sql`
- [x] Added `manufacturer` column to `machines` table
- [x] Fixed console error: `column machines.manufacturer does not exist`

**Result:**
- ✅ "Change Model" feature now works
- ✅ Manufacturer selection functionality enabled

---

### 3. Fix RLS Policy for Cirrus Table
**Source:** November 13, 2025  
**Status:** ✅ **COMPLETED** - Previously completed

**Tasks Completed:**
- [x] Ran SQL from `FIX_CIRRUS_RLS.md`
- [x] Fixed: `permission denied for table cirrus` (403 Forbidden)
- [x] Historical data now loads correctly

**Result:**
- ✅ Historical data display working
- ✅ Users can view charts without errors

---

### 4. Verify Live Website
**Source:** November 18, 2025  
**Status:** ✅ **COMPLETED** - November 20, 2025

**Tasks Completed:**
- [x] Tested all new color scheme on production
- [x] Verified logo displays correctly at new size
- [x] Tested all buttons and interactive elements
- [x] Verified all container borders display correctly
- [x] Tested responsive design with new colors
- [x] Tested historical data display
- [x] Tested manufacturer features
- [x] Verified all new functionality works on production

**Result:**
- ✅ All production testing completed
- ✅ Website verified and working correctly

---

### 5. Notification System Setup and Verification
**Source:** November 19, 2025  
**Status:** ⏳ **NEW TASK** - Needs comprehensive setup and testing

**Tasks:**
- [ ] Verify email notification system is properly configured
- [ ] Test notification delivery for all alert types:
  - [ ] Motor overheating alerts (critical)
  - [ ] Motor overcurrent alerts (warning)
  - [ ] Connection status changes (device offline/online)
  - [ ] Alert threshold breaches
  - [ ] Recovery notifications (when alerts resolve)
- [ ] Verify notification recipients panel functionality
- [ ] Test notification toggles (enable/disable per user)
- [ ] Verify SMTP configuration is working
- [ ] Test email sending from Supabase Edge Functions
- [ ] Verify all user roles receive appropriate notifications:
  - [ ] Super Admin notifications
  - [ ] Company notifications
  - [ ] Installer notifications
  - [ ] Client notifications
- [ ] Test notification frequency settings (reminder intervals)
- [ ] Verify recovery email settings (send when alert resolves)
- [ ] Test notification preferences persistence
- [ ] Check email delivery logs
- [ ] Verify email templates are correct

**Files to Review:**
- `src/components/NotificationRecipientsPanel.tsx` - Notification management UI
- `src/components/AlertThresholdsEditor.tsx` - Alert configuration
- Supabase Edge Functions for email sending
- SMTP configuration in Supabase or cPanel
- Email templates (if any)

**Impact:**
- Critical for user engagement
- Users need to be notified of machine issues
- Affects user trust and system reliability

---

### 6. Fee Structure and Billing System Design
**Source:** November 19, 2025  
**Status:** ⏳ **NEW TASK** - Business model and payment system needed

**Research Phase:**
- [ ] Research payment processing options:
  - [ ] Stripe (recommended for subscriptions)
  - [ ] PayPal
  - [ ] Square
  - [ ] Other payment gateways
- [ ] Compare pricing, features, and integration complexity
- [ ] Select payment provider

**Fee Structure Design:**
- [ ] Determine pricing model:
  - [ ] Per machine pricing (e.g., $X per machine per month)
  - [ ] Tiered subscription plans (Basic, Pro, Enterprise)
  - [ ] Usage-based pricing (per data point, per alert)
  - [ ] Flat monthly/annual subscription
  - [ ] Hybrid model (base fee + per machine)
- [ ] Define pricing tiers and features:
  - [ ] Free tier (if applicable)
  - [ ] Basic tier (X machines, basic features)
  - [ ] Pro tier (Y machines, advanced features)
  - [ ] Enterprise tier (unlimited, all features)
- [ ] Determine billing frequency:
  - [ ] Monthly billing
  - [ ] Quarterly billing
  - [ ] Annual billing (with discount)
  - [ ] One-time setup fees

**Implementation Tasks:**
- [ ] Set up payment provider account
- [ ] Integrate payment processing API
- [ ] Create billing dashboard for clients:
  - [ ] Current subscription status
  - [ ] Payment history
  - [ ] Invoice downloads
  - [ ] Payment method management
  - [ ] Billing address management
- [ ] Implement invoice generation system:
  - [ ] Automatic invoice creation
  - [ ] Invoice templates
  - [ ] PDF generation
  - [ ] Email delivery of invoices
- [ ] Create payment history tracking:
  - [ ] Database schema for payments
  - [ ] Payment status tracking
  - [ ] Refund handling
- [ ] Implement subscription management:
  - [ ] Upgrade/downgrade plans
  - [ ] Cancel subscriptions
  - [ ] Prorated billing
  - [ ] Trial periods
- [ ] Payment failure handling:
  - [ ] Failed payment notifications
  - [ ] Retry logic
  - [ ] Account suspension for non-payment
  - [ ] Payment recovery workflows
- [ ] Automated billing reminders:
  - [ ] Payment due reminders
  - [ ] Overdue payment notices
  - [ ] Subscription renewal reminders

**Database Schema Needed:**
- [ ] `subscriptions` table (user_id, plan_type, status, billing_cycle, etc.)
- [ ] `payments` table (subscription_id, amount, status, transaction_id, etc.)
- [ ] `invoices` table (subscription_id, amount, due_date, status, etc.)
- [ ] `billing_history` table (payment records, refunds, etc.)

**Files to Create:**
- `src/components/BillingDashboard.tsx` - Client billing interface
- `src/components/PaymentMethodForm.tsx` - Payment method management
- `src/components/InvoiceList.tsx` - Invoice history
- `src/components/SubscriptionPlans.tsx` - Plan selection/upgrade
- Supabase Edge Functions for payment processing
- Database migrations for billing tables

**Impact:**
- Critical for monetization
- Enables sustainable business model
- Affects user onboarding and retention

---

## 🟡 Medium Priority Tasks

### 7. Fix Connection Status Function (Permanent)
**Source:** November 17, 2025  
**Status:** ✅ **COMPLETED** - November 20, 2025

**Tasks Completed:**
- [x] Direct SQL fix (`DIRECT_FIX_CONNECTION.sql`) implemented and working
- [x] Connection status updates working correctly
- [x] Solution has been running reliably

**Result:**
- ✅ Connection status function working correctly
- ✅ Using `DIRECT_FIX_CONNECTION.sql` as stable solution
- ✅ Can be revisited if issues arise in the future

**Files:**
- `docs/supabase/DIRECT_FIX_CONNECTION.sql` - **Solution (working and stable)**

**Note:**
- Workaround is sufficient and stable - no need to fix underlying function unless it breaks

---

### 8. Continue Cirrus Setup Migrations
**Source:** November 13, 2025  
**Status:** ⏳ **PENDING** - Critical migrations not run

**Migrations to Run (In Order):**
1. [ ] Migration 2: `20250108000001_create_cirrus_processor.sql` ⚠️ **CRITICAL**
2. [ ] Migration 3: `20250108000002_optimize_edge_function_rate_limit.sql`
3. [ ] Migration 5: `20250108000006_create_clean_readings_raw.sql` (check first)
4. [ ] Migration 6: `20250108000007_create_machine_voltage_config.sql`
5. [ ] Migration 7: `20250108000008_add_connection_status_calculation.sql`
6. [ ] Migration 8: `20250108000009_add_temperature_validation.sql`
7. [ ] Migration 9: `20250108000010_add_sensor_read_count.sql` (check first)
8. [ ] Migration 10: `20250108000004_add_cirrus_cleanup.sql`
9. [ ] Migration 11: `20250108000005_setup_cirrus_cleanup_schedule.sql`

**Impact:**
- Migration 2 is CRITICAL - enables data processing
- Without these, data pipeline won't work correctly

---

### 9. Update Supabase Authentication URLs
**Source:** November 18, 2025  
**Status:** ⏳ **PENDING**

**Tasks:**
- [ ] Add production URL to Supabase dashboard
- [ ] Update Site URL: `https://iotnexus.site`
- [ ] Update Redirect URLs: `https://iotnexus.site/**`

**Location:**
- Supabase Dashboard → Authentication → URL Configuration

---

### 10. Environment Variables on Server
**Source:** November 18, 2025  
**Status:** ⏳ **PENDING**

**Tasks:**
- [ ] Verify `VITE_SUPABASE_URL` is set
- [ ] Verify `VITE_SUPABASE_PUBLISHABLE_KEY` is set
- [ ] Check if they're in the build or need to be set on server

**Note:**
- Vite environment variables are typically baked into the build
- May need to rebuild if variables changed

---

### 11. Historical Data Testing
**Source:** November 17, 2025  
**Status:** ⏳ **PENDING** - Ready to test with real data

**Tasks:**
- [ ] Verify historical data is being stored in `cirrus` and `coolbreeze` tables
- [ ] Test historical data display with real data
- [ ] Verify time period selection (24h, 7d, 30d, 1y) works correctly
- [ ] Ensure charts render properly with actual data points
- [ ] Test empty state handling (when no historical data exists)
- [ ] Verify field mapping between processing tables and frontend
- [ ] Test with both Cirrus and CoolBreeze machines
- [ ] Test query performance for large datasets (1 year of data)

**Testing Checklist:**
- [ ] Create test machine with historical data
- [ ] Test 24-hour view
- [ ] Test 7-day view
- [ ] Test 30-day view
- [ ] Test 1-year view
- [ ] Test with no data (new machine)
- [ ] Test with both Cirrus and CoolBreeze machines
- [ ] Verify chart rendering performance

---

### 12. Verify Trigger Chain
**Source:** November 17, 2025  
**Status:** ⏳ **PENDING**

**Tasks:**
- [ ] Confirm `trigger_auto_update_machine_on_cirrus_insert` fires correctly
- [ ] Verify `trigger_auto_update_machine_on_coolbreeze_insert` works
- [ ] Test that new readings automatically update connection status
- [ ] Test edge cases:
  - [ ] Device disconnects (no data for >15 minutes)
  - [ ] Device reconnects after being offline
  - [ ] Verify readings are zeroed out when disconnected

---

## 🟢 Low Priority Tasks

### 13. Documentation Updates
**Source:** November 18, 2025  
**Status:** ⏳ **PENDING**

**Tasks:**
- [ ] Update deployment guide with manual upload process
- [ ] Document GitHub Actions troubleshooting
- [ ] Create quick reference for manual deployments
- [ ] Document color scheme guidelines (from November 19)

---

### 14. Build Optimization (Performance)
**Source:** November 18, 2025  
**Status:** ⏳ **PENDING** - Low priority optimization

**Issue:**
- Build shows warnings about chunk size (1,050.76 kB JS file)
- Warning: "Some chunks are larger than 500 kB after minification"
- Impact: Slower initial page load, especially on mobile/slow connections

**Solutions to Consider:**
- [ ] Use dynamic `import()` for code-splitting
- [ ] Configure `build.rollupOptions.output.manualChunks` for better chunking
- [ ] Split large components into separate chunks
- [ ] Lazy load routes/components that aren't immediately needed

**Priority:** Low - site works, but optimization would improve performance

---

### 15. Test ESP32 Code
**Source:** November 13, 2025  
**Status:** ⏳ **PENDING** - Code ready, needs real-world testing

**Tasks:**
- [ ] Verify temperature validation works
- [ ] Verify WiFi robustness improvements
- [ ] Verify new boot button logic (5-second hold)
- [ ] Test data transmission at 2-minute intervals
- [ ] Verify sensor read count tracking
- [ ] Test error handling and fallback mechanisms

**Files:**
- `hardware/esp32/ESP32_Cirrus_Optimized_2Min/ESP32_Cirrus_Optimized_2Min.ino`
- `hardware/esp32/ESP32_HVAC_CoolBreezeNexus_V2_Optimized.ino`

---

### 16. Code Cleanup
**Source:** November 17, 2025  
**Status:** ⏳ **PENDING**

**Tasks:**
- [ ] Remove temporary debug logging from components
- [ ] Clean up diagnostic SQL files (archive, don't delete)
- [ ] Remove commented-out code
- [ ] Update connection status troubleshooting guide
- [ ] Document the trigger chain in `SUPABASE_DATA_FLOW_GUIDE.md`
- [ ] Create quick reference for common fixes

---

## 📋 Task Summary by Category

### Deployment & Production
1. ✅ Fix GitHub Actions Deployment - **COMPLETED**
2. ✅ Verify Live Website - **COMPLETED**
3. Update Supabase Authentication URLs (Task 9)
4. Environment Variables on Server (Task 10)

### Database & Migrations
5. ✅ Run Migration 4: Add Manufacturer Column - **COMPLETED**
6. ✅ Fix RLS Policy for Cirrus Table - **COMPLETED**
7. Continue Cirrus Setup Migrations (Task 8 - 9 migrations pending)

### Business & Operations
8. Notification System Setup and Verification ⚠️ **NEW** (Task 5)
9. Fee Structure and Billing System Design ⚠️ **NEW** (Task 6)

### Functionality & Testing
10. ✅ Fix Connection Status Function (Permanent) (Task 7) - **COMPLETED**
11. Historical Data Testing (Task 11)
12. Verify Trigger Chain (Task 12)
13. Test ESP32 Code (Task 15)

### Documentation & Optimization
14. Documentation Updates (Task 13)
15. Build Optimization (Performance) (Task 14)
16. Code Cleanup (Task 16)

---

## 🎯 Recommended Order of Completion

### Week 1 (Critical):
1. ✅ Run Migration 4 (Manufacturer Column) - **COMPLETED**
2. ✅ Fix RLS Policy for Cirrus Table - **COMPLETED**
3. Run Migration 2 (Cirrus Processor) - **CRITICAL**
4. ✅ Verify Live Website - **COMPLETED**

### Week 2 (High Priority):
5. ✅ Fix GitHub Actions Deployment - **COMPLETED**
6. Continue remaining Cirrus migrations
7. Notification System Setup and Verification - **NEW**
8. Historical Data Testing
9. ✅ Fix Connection Status Function - **COMPLETED**

### Week 3 (Business Model):
10. Fee Structure and Billing System Design - **NEW** (Task 6)
   - Research payment providers
   - Design pricing model
   - Begin implementation

### Week 4+ (Medium/Low Priority):
11. Update Supabase Authentication URLs
12. Environment Variables on Server
13. Verify Trigger Chain
14. Test ESP32 Code
15. Documentation Updates
16. Build Optimization
17. Code Cleanup

---

**Note:** This document should be updated as tasks are completed. Mark items with ✅ when done and update status accordingly.

