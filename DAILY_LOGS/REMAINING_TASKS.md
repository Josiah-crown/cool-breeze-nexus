# Remaining Tasks - Compiled from Daily Logs

**Last Updated:** December 2, 2025  
**Status:** Active tracking of outstanding tasks from all daily logs  
**Note:** Completed tasks have been removed from this list. See daily logs for completion details:
- `2025-12-02_RLS_FIXES_AND_DELAYED_CLEANUP.md` - RLS fixes, 400 error fixes, delayed cleanup (⚠️ PENDING MIGRATION)
- `2025-12-01_COMPLETE_SESSION.md` - Alliance heatpump implementation, production fixes (COMPLETE ✅)
- `2025-12-01_COOLBREEZE_TRIGGER_FIX.md` - CoolBreeze trigger fix, fan animation bug fix (COMPLETE ✅)
- `2025-11-27_MANUFACTURER_TEMPLATE_SYSTEM.md` - Manufacturer template system created (COMPLETE ✅)
- `2025-11-26_HISTORICAL_DATA_FIX.md` - Historical data graph fixes, schema updates (fan/pump)
- `2025-11-20_FULL_SESSION.md` - GitHub Actions deployment, frontend fixes
- `2025-11-25_DATABASE_CLEANUP_AND_MIGRATION_PREP.md` - RLS grants fix, connection threshold fix, ESP32 verification

**Recent Updates (Dec 1, 2025 - 5:00 PM):**
- ✅ **CRITICAL FIX:** Discovered and fixed disabled CoolBreeze database triggers
- ✅ **PRODUCTION RESTORED:** Both Cirrus and CoolBreeze devices now working
- ✅ **UI BUG FIXED:** Fan animation now respects connection status (default state: off)
- ✅ **ALLIANCE HEATPUMP:** Complete implementation ready for testing
- 🔴 **NEW CRITICAL:** Test Alliance Heatpump (hardware deployment)
- 🔴 **NEW CRITICAL:** Optimize Mobile Display (site not readable on phones)
- ✅ Architecture documented, corrected misunderstanding
- ✅ Database migration completed and tested
- 🚨 Added 11 new tasks from Manufacturer Template System touchpoints analysis (Nov 27)
- 🔴 HIGH: Alert History Viewer, Voltage Config UI, Alert Testing added
- 🟠 MEDIUM: Manufacturer Settings Panel, Connection Quality Metrics added
- 🟢 LOW: 5 future enhancement tasks added

---

## 🔴 High Priority Tasks

### 0. Fix RLS and 400 Errors ⚠️ CRITICAL - NOT RESOLVED
**Source:** December 2, 2025  
**Status:** ⏳ **PENDING MIGRATION** - Fixes implemented but NOT verified

**Problem:**
- 403 Forbidden errors when querying `alliance_calculated` table (missing RLS policies)
- 400 Bad Request errors due to column mismatches (querying non-existent columns)
- Immediate deletion of `readings_raw` preventing debugging

**Fixes Implemented:**
- ✅ Created RLS policies for `alliance_calculated` table
- ✅ Updated `MachineCard.tsx` with conditional column selection
- ✅ Removed immediate DELETE from all three trigger functions
- ✅ Created `cleanup_old_readings_raw()` function (5-minute delayed cleanup)
- ✅ Created `clean_readings_raw()` function (fresh start)

**Migration Created:**
- `supabase/migrations/20250202_fix_rls_and_delayed_cleanup.sql`

**⚠️ CRITICAL: Issues NOT Resolved Yet**
- [ ] **MIGRATION NOT RUN** - Must execute `supabase migration up`
- [ ] **TESTING PENDING** - All fixes need verification:
  - [ ] Verify 403 errors are gone (check browser console)
  - [ ] Verify 400 errors are gone (check browser console)
  - [ ] Verify all machines display correctly
  - [ ] Verify Alliance heatpump shows Pump, Heat, Compressor status
  - [ ] Verify Cirrus/CoolBreeze show correct status indicators
  - [ ] Test that readings_raw data persists for 5 minutes
  - [ ] Verify data processes correctly to manufacturer tables
- [ ] **CLEANUP JOB NOT SET UP** - Choose and implement:
  - [ ] Option A: Manual cleanup (run periodically)
  - [ ] Option B: Edge Function + Cron job
  - [ ] Option C: pg_cron extension (if available)

**Files Modified:**
- `supabase/migrations/20250202_fix_rls_and_delayed_cleanup.sql` (NEW)
- `src/components/MachineCard.tsx` (UPDATED)

**Reference:**
- `DAILY_LOGS/2025-12-02_RLS_FIXES_AND_DELAYED_CLEANUP.md` - Full details
- `FIXES_2025-12-02.md` - Summary document

**Time Estimate:** 30 minutes (migration + testing)

**Priority:** 🚨 **CRITICAL** - Blocks frontend functionality, needs immediate attention

---

### 1. Test Alliance Heatpump 🚨 CRITICAL
**Source:** December 1, 2025  
**Status:** ⏳ **READY FOR TESTING** - Implementation complete, awaiting hardware deployment

**Completed:**
- ✅ Database migration created and tested (`20250201_alliance_heatpump_logic.sql`)
- ✅ Frontend components updated (MachineCard, StatusPanel, MachineDetailView)
- ✅ Edge function accepts GPIO5 data
- ✅ Compressor status logic implemented with 5-minute delay
- ✅ Corrected GPIO5 = PUMP, Current > 1A = HEAT

**Hardware Configuration:**
- **GPIO5** - Pump relay (12V pickup via voltage divider)
- **CT Sensor** - Current measurement (>1A = heating)
- **Temperature Sensors** - GPIO 21, 22, 23 (hardcoded in Arduino)
- **Voltage Sensor** - Main line voltage from CT

**Tasks:**
- [ ] Update Arduino code (add 4 lines for GPIO5 reading):
  ```cpp
  // 1. Declare: float gpio5Voltage = 0;
  // 2. Read: gpio5Voltage = readVoltage(5);
  // 3. Send: doc["voltage_input_5"] = gpio5Voltage;
  // 4. Debug: Serial.print(", GPIO5: "); Serial.print(gpio5Voltage, 3);
  ```
- [ ] Flash updated code to Alliance heatpump ESP32
- [ ] Deploy heatpump to field location
- [ ] Verify data flow:
  - [ ] ESP32 posts to Edge Function successfully
  - [ ] Data appears in `readings_raw` table
  - [ ] Trigger processes data to `alliance_calculated` table
  - [ ] Frontend displays: Connected, Pump, Heat, Compressor
- [ ] Test compressor status logic:
  - [ ] Verify "good" status when conditions met
  - [ ] Test 5-minute delay works correctly
  - [ ] Confirm never shows "failed" when pump is OFF
  - [ ] Check compressor status changes with real data
- [ ] Verify GPIO5 reading:
  - [ ] Check pump relay voltage reads correctly (12V when ON)
  - [ ] Confirm pump status shows correctly in frontend
- [ ] Test current-based heating detection:
  - [ ] Verify heat shows ON when current > 1A
  - [ ] Verify heat shows OFF when current < 1A
- [ ] Monitor for 24 hours to ensure stability

**Frontend Display (Expected):**
```
Alliance Heatpump Card:
├─ Connected   (green/gray)
├─ Pump       (GPIO5 relay - green when >6V)
├─ Heat       (CT current - green when >1A)
└─ Compressor (good=green, warning=yellow, failed=red)
```

**Reference Documents:**
- `HEATPUMP_IMPLEMENTATION_CHECKLIST.md` - Complete deployment guide
- `ARDUINO_UPDATE_INSTRUCTIONS.md` - Arduino code changes (4 lines)
- `CORRECTED_HEATPUMP_LOGIC_SUMMARY.md` - What changed and why
- `DAILY_LOGS/2025-12-01_COMPLETE_SESSION.md` - Full implementation details

**Impact:**
- ✅ First heatpump manufacturer ready for production
- ✅ Validates heatpump logic and compressor monitoring
- ✅ Proves system works for multiple machine types
- ✅ Opens market for heatpump installations

**Time Estimate:** 2-3 hours (hardware deployment + testing)

**Priority:** 🚨 **CRITICAL** - Hardware ready, needs field deployment

---

### 0.5. Optimize Mobile Display 🚨 CRITICAL
**Source:** December 1, 2025  
**Status:** ⏳ **NEW** - Site not properly responsive on mobile devices

**Problem:**
- Website doesn't properly resize for cellphones
- UI elements not readable on small screens
- Machine cards may not stack properly
- Navigation might be broken on mobile
- Touch interactions may not work correctly
- Dashboard likely overflows on mobile viewport
- Text might be too small to read
- Buttons might be too small to tap easily

**Tasks:**
- [ ] **Audit Current Mobile Experience:**
  - [ ] Test on actual mobile devices (iPhone, Android)
  - [ ] Test in Chrome DevTools mobile emulation
  - [ ] Document all issues with screenshots
  - [ ] Check viewport meta tag in HTML
  - [ ] Review CSS media queries

- [ ] **Fix Responsive Layout:**
  - [ ] Update machine cards to stack properly on mobile
  - [ ] Fix dashboard grid layout for small screens
  - [ ] Ensure navigation menu works on mobile (hamburger?)
  - [ ] Fix any horizontal scrolling issues
  - [ ] Update sidebar/panel behavior for mobile
  - [ ] Test landscape and portrait orientations

- [ ] **Fix Typography:**
  - [ ] Ensure all text is readable (min 14-16px on mobile)
  - [ ] Fix any text overflow issues
  - [ ] Update font sizes for mobile in CSS
  - [ ] Test readability in bright sunlight

- [ ] **Fix Touch Interactions:**
  - [ ] Ensure all buttons are at least 44x44px (Apple guideline)
  - [ ] Add proper touch feedback
  - [ ] Fix any hover-only interactions
  - [ ] Test all clickable elements
  - [ ] Ensure dropdowns work on mobile

- [ ] **Fix Specific Components:**
  - [ ] `MachineCard.tsx` - Card sizing and layout
  - [ ] `DashboardView.tsx` - Grid layout
  - [ ] `MachineDetailView.tsx` - Detail panel on mobile
  - [ ] `StatusPanel.tsx` - Status indicators
  - [ ] `NavigationMenu` - Mobile navigation
  - [ ] `AlertThresholdsEditor.tsx` - Form inputs
  - [ ] Historical graphs - Touch zoom/pan

- [ ] **CSS Media Queries to Add:**
  ```css
  /* Mobile phones */
  @media (max-width: 640px) {
    /* Stack cards vertically */
    /* Increase touch targets */
    /* Adjust font sizes */
  }
  
  /* Tablets */
  @media (max-width: 1024px) {
    /* 2-column grid instead of 3+ */
  }
  ```

- [ ] **Test on Real Devices:**
  - [ ] iPhone (Safari)
  - [ ] Android phone (Chrome)
  - [ ] iPad/tablet
  - [ ] Test all major features work on mobile
  - [ ] Test in both portrait and landscape

**Files to Update:**
- `index.html` - Verify viewport meta tag
- `src/index.css` or `src/App.css` - Global mobile styles
- `src/components/MachineCard.tsx` - Card responsive design
- `src/components/DashboardView.tsx` - Dashboard grid
- `src/components/MachineDetailView.tsx` - Detail view mobile
- `src/components/StatusPanel.tsx` - Status layout
- `src/components/NavigationMenu.tsx` - Mobile nav (if exists)
- `tailwind.config.js` - Mobile breakpoints (if using Tailwind)

**Impact:**
- 🔴 **CRITICAL:** Users can't use site on mobile devices
- ✅ Makes system accessible from field locations
- ✅ Improves UX for installers/technicians on-site
- ✅ Modern web standard (mobile-first design)
- ✅ Increases user satisfaction and adoption

**Time Estimate:** 4-6 hours
- Audit: 1 hour
- Layout fixes: 2-3 hours
- Component fixes: 1-2 hours
- Testing: 1 hour

**Priority:** 🚨 **CRITICAL** - Basic functionality issue

---

### 1. Manufacturer Template System ✅ COMPLETE
**Source:** November 27, 2025 (Session 8:35 AM)
**Status:** ✅ **COMPLETE** - Template system created and documented

**Completed:**
- ✅ Created comprehensive manufacturer template system
- ✅ Fill-in-the-blank template (`NEW_MANUFACTURER_TEMPLATE.txt`)
- ✅ Complete technical specification (`MANUFACTURER_TEMPLATE_SYSTEM.md`)
- ✅ Implementation automation guide (`IMPLEMENTATION_AUTOMATION_GUIDE.md`)
- ✅ Quick start guide (`QUICK_START.md`)
- ✅ Complete touchpoints checklist (`SYSTEM_TOUCHPOINTS_CHECKLIST.md`)
- ✅ Identified 10 missing process steps with priorities
- ✅ Updated main documentation (`README.md`)

**What It Does:**
- Provides template for defining sensors, logic, and alerts
- Automatically adjusts historical graph (lines and bars in correct positions)
- Automatically adjusts frontend UI (alert thresholds, expanded card)
- Automatically adjusts Supabase setup (tables, triggers, RLS)
- Identifies all system touchpoints and missing features

**Location:**
- All files in `docs/machine_parameters/`
- Start here: `docs/machine_parameters/QUICK_START.md`

**Time to Use:**
- Fill template: 10 minutes
- Automated implementation: ~2 hours
- Testing: 15 minutes

**Impact:**
- ✅ Can now add manufacturers in ~2.25 hours (vs 4+ hours manual)
- ✅ Consistent structure across all manufacturers
- ✅ Self-documenting system
- ✅ Scalable to unlimited manufacturers

---

### 2. Alert Logic Implementation
**Source:** November 25, 2025  
**Status:** ⏳ **IN PROGRESS** - ESP32 is working, alert logic needs to be implemented

**Current Status:**
- ✅ ESP32 integration complete - Device is working in the field using `ESP32_Cirrus_Optimized_2Min.ino`
- ✅ Alert thresholds UI complete - Users can configure thresholds per machine
- ✅ Database schema ready - Alert tables and configuration tables exist
- ⏳ Alert checking logic - Needs to be implemented to monitor sensor data
- ⏳ Email sending - Needs to be implemented when alerts trigger

**Tasks:**
- [ ] Implement alert checking logic (monitors sensor data from ESP32)
- [ ] Check all alert conditions against configured thresholds:
  - [ ] Motor overheating (motor_temp > threshold for duration)
  - [ ] Motor overcurrent (current > threshold for duration)
  - [ ] Fan failure (fan_active but current < threshold)
  - [ ] Ineffective cooling/heating (delta_t < threshold for duration)
  - [ ] Low water (cooling on but no water for duration)
  - [ ] Other manufacturer-specific alerts
- [ ] Create alert state tracking (when alerts trigger/resolve)
- [ ] Implement email sending when alerts trigger
- [ ] Implement recovery notifications (when alerts resolve)
- [ ] Create alert history logging
- [ ] Test with real ESP32 data from field device

**Important Documents:**
- `docs/general/COMPLETE_ALERT_PARAMETERS.md` - All 17 alert conditions documented
- `docs/general/SESSION_PROGRESS_2025-11-08.md` - Alert system implementation details
- `supabase/migrations/archive/20251108000001_add_alert_system.sql` - Alert system migration (already run)

**Files to Update:**
- Create Supabase Edge Function or database trigger for alert checking
- Update `src/components/AlertThresholdsEditor.tsx` if needed
- Create alert monitoring service/function
- Email sending implementation (Supabase Edge Function or external service)

**Impact:**
- Critical for system functionality
- Users need alerts when machines have issues
- Enables proactive maintenance

---

### 3. Notification System Setup and Verification
**Source:** November 19, 2025  
**Status:** ⏳ **PENDING** - Depends on Alert Logic Implementation (Task 5)

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

**Note:** This task depends on Task 1 (Alert Logic Implementation) being completed first.

---

### 4. Fee Structure and Billing System Design
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

### 5. Database Migration to New Architecture (After MVP)
**Source:** November 25, 2025  
**Status:** ⏳ **PREPARED** - Ready for migration when new Supabase instance is set up

**Preparation Completed:**
- [x] Database architecture analyzed and documented
- [x] New architecture designed (manufacturer-agnostic pattern)
- [x] Complete SQL schema created (`000_COMPLETE_DATABASE_SCHEMA.sql`)
- [x] Migration guide created (`MIGRATION_GUIDE_NEW_SUPABASE.md`)
- [x] Files to update checklist created (`FILES_TO_UPDATE_AFTER_MIGRATION.md`)
- [x] Code files marked with TODO comments for future updates
- [x] Old migration files archived

**New Architecture:**
- `{manufacturer}_raw` - Raw data (2 weeks retention)
- `{manufacturer}_calculated` - Processed data (1 year retention)
- `{manufacturer}_notifications` - Notification thresholds per manufacturer
- `{manufacturer}_voltage_config` - Voltage input mappings per manufacturer
- `machine_connection_status` - Shared connection tracking

**Migration Tasks (After MVP):**
- [ ] Set up new Supabase instance
- [ ] Run `000_COMPLETE_DATABASE_SCHEMA.sql`
- [ ] Migrate existing data (if applicable)
- [ ] Create processing triggers (`{manufacturer}_raw` → `{manufacturer}_calculated`)
- [ ] Create cleanup jobs (auto-delete old data)
- [ ] Update frontend code (table name changes)
- [ ] Update ESP32 code (use `{manufacturer}_raw` tables)
- [ ] Test all functionality
- [ ] Drop old tables after migration verified

**Files Created:**
- `SUPABASE_ANALYSIS_AND_CLEANUP_PLAN.md` - Database analysis
- `PROPOSED_DATABASE_ARCHITECTURE.md` - Architecture proposal
- `DATABASE_SCHEMA.md` - Schema documentation
- `MIGRATION_GUIDE_NEW_SUPABASE.md` - Migration guide
- `FILES_TO_UPDATE_AFTER_MIGRATION.md` - Update checklist
- `supabase/migrations/000_COMPLETE_DATABASE_SCHEMA.sql` - Complete schema

**Impact:**
- ✅ Expansion-friendly: Add manufacturer = add 4 tables
- ✅ Historical data: 2 weeks raw + 1 year calculated
- ✅ Better organization: Self-contained per manufacturer
- ✅ Generic voltage mapping: Custom_1-6 system

**Priority:** 🟠 **MEDIUM** - After MVP, when setting up new Supabase instance

---

## 🟡 Medium Priority Tasks

### 1. ESP32 ↔ Database Schema Synchronization 🚨 CRITICAL
**Source:** November 27, 2025  
**Status:** ⏳ **IN PROGRESS** - Schema contracts created, version tracking pending
**Priority:** 🔴 **CRITICAL** - Prevents data mismatches

**Problem:**
- ESP32 sends data to database with specific field names
- If ESP32 code changes, database might not match
- If database schema changes, ESP32 output might not match
- Adding new GPIOs/sensors requires coordinated updates

**Progress:**
- ✅ **COMPLETED (Nov 27, 2025):**
  - Schema contract created for Cirrus (`docs/machine_parameters/cirrus/ESP32_SCHEMA_CONTRACT.md`)
  - Schema contract created for CoolBreeze (`docs/machine_parameters/coolbreeze/ESP32_SCHEMA_CONTRACT.md`)
  - Automatic extraction script created (`scripts/extract_esp32_schema.py`)
  - Hardware documentation created (`docs/hardware/ESP32_DATABASE_SCHEMA_SYNC.md`)
  
- ✅ **COMPLETED (Dec 1, 2025):**
  - Architecture documented (`docs/hardware/CORRECT_DATA_FLOW.md`)
  - **CRITICAL FIX:** Discovered and fixed disabled CoolBreeze triggers
  - **UI FIX:** Fixed fan animation default state (respects connection status)

**Remaining Tasks:**
- [ ] Create ESP32 schema contract for Alliance:
  - [ ] `docs/machine_parameters/alliance/ESP32_SCHEMA_CONTRACT.md`
- [ ] Add version tracking to database:
  - [ ] Add `firmware_version` column to `readings_raw` table
  - [ ] Add `schema_version` column to `readings_raw` table
- [ ] Update ESP32 code to send version info:
  - [ ] Add firmware version to JSON payload
  - [ ] Add schema version to JSON payload
  - [ ] Update Cirrus firmware
  - [ ] Update CoolBreeze firmware
- [ ] Create schema validation script:
  - [ ] Python/Node.js script to validate ESP32 payload against database
  - [ ] Check required fields present
  - [ ] Check field types match
  - [ ] Check values within validation ranges
- [ ] Document GPIO expansion process:
  - [ ] How to add new voltage inputs (voltage_input_5, voltage_input_6)
  - [ ] How to add new analog sensors
  - [ ] Update process for database schema
  - [ ] Update process for frontend
- [ ] Create compatibility matrix:
  - [ ] Track which ESP32 firmware works with which database version
  - [ ] Document breaking changes

**Files Created:**
- `docs/hardware/ESP32_DATABASE_SCHEMA_SYNC.md` - Complete synchronization guide
- `docs/machine_parameters/cirrus/ESP32_SCHEMA_CONTRACT.md` - Cirrus schema
- `docs/machine_parameters/coolbreeze/ESP32_SCHEMA_CONTRACT.md` - CoolBreeze schema
- `scripts/extract_esp32_schema.py` - Automatic extraction tool
- `docs/hardware/CORRECT_DATA_FLOW.md` - Architecture documentation

**Impact:**
- 🔴 **CRITICAL:** Prevents data loss and system failures
- ✅ Schema contracts now documented for Cirrus and CoolBreeze
- ✅ Critical production issue resolved (disabled triggers)
- ✅ Both Cirrus and CoolBreeze devices now working
- ⏳ Version tracking still needed for future-proofing

**Time Remaining:** 2-3 hours
- Version tracking: 1 hour
- Validation script: 1-2 hours
- Testing: 30 minutes

---

### 2. Alert History Viewer
**Source:** November 27, 2025 (Manufacturer Template System Touchpoints Analysis)  
**Status:** ⏳ **NEW** - Missing feature identified
**Priority:** 🔴 **HIGH** - Needed for troubleshooting

**Problem:**
- Users can see current alerts
- No way to view past alerts
- Can't analyze alert patterns
- Can't see alert history for troubleshooting

**Tasks:**
- [ ] Create `alert_history` table in database:
  - [ ] Fields: machine_id, alert_type, triggered_at, resolved_at, duration, severity
  - [ ] Indexes for fast querying
  - [ ] RLS policies
- [ ] Create `AlertHistoryPanel.tsx` component:
  - [ ] Table view of past alerts
  - [ ] Filter by machine, date range, severity
  - [ ] Search functionality
  - [ ] Export to CSV
- [ ] Integrate into MachineDetailView:
  - [ ] Add "Alert History" tab
  - [ ] Show last 100 alerts
  - [ ] Link to full history page
- [ ] Add alert logging:
  - [ ] Log when alerts trigger
  - [ ] Log when alerts resolve
  - [ ] Log alert parameters at time of trigger
- [ ] Create analytics:
  - [ ] Most frequent alerts per machine
  - [ ] Average alert duration
  - [ ] Alert patterns (time of day, etc.)

**Impact:**
- ✅ Troubleshoot recurring issues
- ✅ Identify machine patterns
- ✅ Prove alert system working
- ✅ Historical compliance records

**Time Estimate:** 4 hours

---

### 3. Voltage Configuration UI
**Source:** November 27, 2025 (Manufacturer Template System Touchpoints Analysis)  
**Status:** ⏳ **NEW** - Missing feature identified
**Priority:** 🔴 **HIGH** - Needed for installation flexibility

**Problem:**
- Voltage input mappings are hardcoded per manufacturer
- Different installations might wire voltage inputs differently
- No UI to configure voltage input functions per machine
- Installers can't adapt to site-specific wiring

**Tasks:**
- [ ] Create `VoltageConfigEditor.tsx` component:
  - [ ] Dropdown to assign function to each voltage_input_1-6
  - [ ] Functions: fan, pump, drain, exhaust, compressor, heater, custom
  - [ ] Set active threshold per input (default 6.0V)
  - [ ] Save/reset functionality
- [ ] Integrate into MachineDetailView:
  - [ ] Add "Voltage Configuration" section
  - [ ] Show current mappings
  - [ ] Allow editing (admin/installer only)
- [ ] Update database trigger logic:
  - [ ] Read voltage config from `machine_voltage_config` table
  - [ ] Apply config when processing raw data
  - [ ] Calculate fan_active, pump_active based on config
- [ ] Add validation:
  - [ ] Can't assign same function to multiple inputs
  - [ ] Threshold must be 0-12V
  - [ ] Warn if changing config for machine with data

**Impact:**
- ✅ Flexibility for different installations
- ✅ Support non-standard wiring
- ✅ Easier troubleshooting (verify wiring)
- ✅ Better installer experience

**Time Estimate:** 2-3 hours

---

### 4. Alert Testing & Simulation
**Source:** November 27, 2025 (Manufacturer Template System Touchpoints Analysis)  
**Status:** ⏳ **NEW** - Missing feature identified
**Priority:** 🔴 **HIGH** - Needed for reliability

**Problem:**
- Can't test alert logic without waiting for real conditions
- Can't verify alerts will trigger correctly
- Difficult to test email notifications
- Hard to demo alert system to users

**Tasks:**
- [ ] Create `AlertTestPanel.tsx` component:
  - [ ] Simulate alert conditions
  - [ ] Trigger test alerts without real data
  - [ ] Test email delivery
  - [ ] See what would trigger based on current thresholds
- [ ] Create backend test function:
  - [ ] Manually trigger alert for machine
  - [ ] Send test email to configured recipients
  - [ ] Log test results
- [ ] Add to MachineDetailView:
  - [ ] "Test Alerts" button in alert thresholds section
  - [ ] Shows which alerts would trigger now
  - [ ] "Send Test Email" button
- [ ] Validation mode:
  - [ ] Show if thresholds are too sensitive/too loose
  - [ ] Suggest adjustments based on historical data
  - [ ] Predict alert frequency

**Impact:**
- ✅ Verify alert logic works before deployment
- ✅ Test email notifications reliably
- ✅ Better demos for users
- ✅ Faster troubleshooting

**Time Estimate:** 3 hours

---

### 5. Manufacturer-Specific Settings Panel
**Source:** November 27, 2025 (Manufacturer Template System Touchpoints Analysis)  
**Status:** ⏳ **NEW** - Missing feature
**Priority:** 🟠 **MEDIUM** - Nice to have

**Problem:**
- Some manufacturers need custom operational parameters
- Examples: pump cycle time, water flush interval, drain timer
- These are manufacturer-specific, not machine-specific
- No UI to configure these settings

**Tasks:**
- [ ] Extend `machines` table or create `machine_settings` table
- [ ] Create `ManufacturerSettingsPanel.tsx` component
- [ ] Define common settings:
  - [ ] Connection timeout
  - [ ] Data retention period
  - [ ] Update interval expected
  - [ ] Manufacturer-specific parameters
- [ ] Integrate into MachineDetailView
- [ ] Use settings in calculations and triggers

**Impact:**
- ✅ Support manufacturer-specific behavior
- ✅ Configurable timeouts and intervals
- ✅ Better customization per installation

**Time Estimate:** 2-3 hours

---

### 6. Connection Quality Metrics
**Source:** November 27, 2025 (Manufacturer Template System Touchpoints Analysis)  
**Status:** ⏳ **NEW** - Missing feature
**Priority:** 🟠 **MEDIUM** - Nice to have

**Problem:**
- Can only see if machine is connected or not
- No visibility into connection quality
- Can't predict connection failures
- No historical connection tracking

**Tasks:**
- [ ] Extend `machine_connection_status` table:
  - [ ] Add connection quality score (0-100)
  - [ ] Track ping latency
  - [ ] Track packet loss
  - [ ] Track consecutive failures
- [ ] Create `ConnectionQualityWidget.tsx` component:
  - [ ] Show connection quality graph
  - [ ] Show uptime percentage
  - [ ] Show last 24 hours of connection status
- [ ] Add to MachineDetailView
- [ ] Alert on poor connection quality (optional)

**Impact:**
- ✅ Predict connection failures
- ✅ Troubleshoot connectivity issues
- ✅ Track uptime SLA
- ✅ Better support experience

**Time Estimate:** 2 hours

---

### 7. Historical Data Polish
**Source:** November 26, 2025
**Status:** ⏳ **PENDING**

**Goal:** Refine data handling for historical graphs (graph visualization is good, but data logic needs polish).

**Tasks:**
- [ ] Review how data is processed and displayed
- [ ] Optimize data handling logic as needed
- [ ] Ensure consistent behavior across all machine types

**Priority:** 🟠 **MEDIUM** - UX refinement

---

### 2. Fix Function Search Path Security (Security Best Practice)
**Source:** November 20, 2025  
**Status:** ⏳ **PENDING**

**Problem:**
- 28 database functions are missing `SET search_path = public`
- This is a security best practice to prevent SQL injection
- Supabase linter is flagging this as a security warning

**Tasks:**
- [ ] Create migration to add `SET search_path = public` to all functions
- [ ] Update all trigger functions (e.g., `create_machine_notification_preferences`)
- [ ] Update all cleanup functions (e.g., `cleanup_old_cirrus_data`)
- [ ] Update all status calculation functions (e.g., `calculate_machine_connection_status`)
- [ ] Update all validation functions (e.g., `validate_temperature_reading`)
- [ ] Test that all functions still work after update
- [ ] Verify Supabase linter warnings are resolved

**Impact:**
- ✅ **Long-term security improvement** - Protects against SQL injection
- ✅ **No breaking changes** - Functions work exactly the same
- ✅ **No performance impact** - Negligible overhead
- ✅ **One-time fix** - Apply once, protects forever

**Priority:** 🟠 **MEDIUM** - Should fix soon for security, but not urgent

**Time Estimate:** ~6 minutes (5 min to create migration, 1 min to run)

**Reference:** See `FUNCTION_SEARCH_PATH_EXPLANATION.md` for detailed explanation

**Files:**
- `FUNCTION_SEARCH_PATH_EXPLANATION.md` - Detailed explanation of the fix
- `supabase/Errors and warnings/Security warnings.txt` - Lists all affected functions

---

### 3. Implement Secret Scanning & Security Hardening
**Source:** November 26, 2025
**Status:** ⏳ **NEW** - Security best practice

**Goal:** Prevent secret leaks and harden codebase security using automated tools.

**Tasks:**
- [ ] Install & Configure **GitGuardian** (or similar) for secret detection
  - Reference: [GitGuardian for VS Code](https://marketplace.visualstudio.com/items?itemName=gitguardian-secret-security.gitguardian)
- [ ] Scan codebase for existing exposed secrets/API keys
- [ ] Configure pre-commit hooks to prevent accidental secret commits
- [ ] Review and rotate any exposed keys found during scan
- [ ] Watch security best practices video for additional tips
  - Reference: [Security Video](https://www.youtube.com/watch?v=diuBTBjx7Qc)

**Impact:**
- ✅ **Prevent Data Leaks:** Stops accidental commit of API keys/credentials
- ✅ **Security Compliance:** Industry standard practice
- ✅ **Risk Reduction:** Mitigates potential unauthorized access

**Priority:** 🟠 **MEDIUM** - Important for long-term security

---

## 🟢 Low Priority Tasks

### 1. Historical Data Retention Settings UI
**Source:** November 27, 2025 (Manufacturer Template System Touchpoints Analysis)  
**Status:** ⏳ **NEW** - Missing feature
**Priority:** 🟢 **LOW** - Rarely changed

**Problem:**
- Data retention is hardcoded (14 days raw, 1 year calculated)
- Some users might want longer retention
- Some might want shorter to save costs
- No UI to customize per machine or company

**Tasks:**
- [ ] Add retention settings to `machines` table or company settings
- [ ] Create UI to configure retention
- [ ] Update cleanup functions to respect custom retention
- [ ] Show estimated storage cost per retention period

**Impact:**
- ✅ Flexibility for different needs
- ✅ Cost optimization for users
- ✅ Compliance with data policies

**Time Estimate:** 1-2 hours

---

### 2. Firmware Version Tracking
**Source:** November 27, 2025 (Manufacturer Template System Touchpoints Analysis)  
**Status:** ⏳ **NEW** - Missing feature
**Priority:** 🟢 **LOW** - Useful for support

**Problem:**
- Don't know what firmware version each ESP32 is running
- Can't track if device needs update
- Difficult to troubleshoot version-specific issues
- No visibility into fleet firmware status

**Tasks:**
- [ ] Add `firmware_version` to all `_raw` tables (see ESP32 Schema Sync task)
- [ ] Update ESP32 code to send firmware version
- [ ] Display firmware version in MachineDetailView
- [ ] Add "Firmware" column to machine list
- [ ] Create firmware update notification system
- [ ] Track which machines need updates

**Impact:**
- ✅ Better support and troubleshooting
- ✅ Track firmware deployment
- ✅ Identify outdated devices
- ✅ Version-specific bug fixes

**Time Estimate:** 1 hour (if combined with ESP32 Schema Sync task)

---

### 3. Bulk Configuration Import/Export
**Source:** November 27, 2025 (Manufacturer Template System Touchpoints Analysis)  
**Status:** ⏳ **NEW** - Missing feature
**Priority:** 🟢 **LOW** - Rarely used

**Problem:**
- Can't easily copy configuration from one machine to another
- Can't backup alert threshold configurations
- Can't share configurations across installations
- Manual setup for similar machines

**Tasks:**
- [ ] Create export function:
  - [ ] Export alert thresholds to JSON
  - [ ] Export voltage config to JSON
  - [ ] Export machine settings to JSON
- [ ] Create import function:
  - [ ] Import configuration from JSON
  - [ ] Validate before applying
  - [ ] Apply to single machine or multiple
- [ ] Add UI:
  - [ ] Export button in alert thresholds editor
  - [ ] Import button with file picker
  - [ ] Bulk apply to multiple machines

**Impact:**
- ✅ Faster setup for similar machines
- ✅ Configuration backup/restore
- ✅ Share best practices

**Time Estimate:** 2-3 hours

---

### 4. Custom Dashboard Widgets (Manufacturer-Specific)
**Source:** November 27, 2025 (Manufacturer Template System Touchpoints Analysis)  
**Status:** ⏳ **NEW** - Missing feature
**Priority:** 🟢 **LOW** - Future enhancement

**Problem:**
- Dashboard is generic for all machine types
- Some manufacturers could benefit from specialized views
- Examples: water level gauge, pump cycle chart, efficiency score
- One-size-fits-all dashboard

**Tasks:**
- [ ] Create widget system:
  - [ ] Base widget component
  - [ ] Widget registration system
  - [ ] Layout configuration
- [ ] Create manufacturer-specific widgets:
  - [ ] Cirrus: Water system widget
  - [ ] Alliance: Setpoint tracking widget
  - [ ] CoolBreeze: Efficiency score widget
- [ ] Add to dashboard:
  - [ ] Widget picker
  - [ ] Drag-and-drop layout
  - [ ] Save layout per user

**Impact:**
- ✅ Better UX for specific machine types
- ✅ Quick insights at a glance
- ✅ Customizable dashboards

**Time Estimate:** 4-6 hours

---

### 5. Multi-Language Support
**Source:** November 27, 2025 (Manufacturer Template System Touchpoints Analysis)  
**Status:** ⏳ **NEW** - Missing feature
**Priority:** 🟢 **LOW** - International deployments only

**Problem:**
- System is English-only
- International users might need other languages
- Manufacturer-specific terminology varies by region
- Unit conversions (°C vs °F) hardcoded

**Tasks:**
- [ ] Set up i18n framework (react-i18next)
- [ ] Extract all strings to translation files
- [ ] Add language selector
- [ ] Translate common terms
- [ ] Support manufacturer-specific term translations
- [ ] Add unit preferences:
  - [ ] Temperature: °C / °F / K
  - [ ] Current: A
  - [ ] Power: W / kW
  - [ ] Voltage: V
- [ ] Date/time locale formatting

**Impact:**
- ✅ International market access
- ✅ Better user experience for non-English speakers
- ✅ Localized terminology

**Time Estimate:** 6-8 hours

---

### 6. Documentation Updates
**Source:** November 18, 2025  
**Status:** ⏳ **PENDING**

**Tasks:**
- [ ] Update deployment guide with manual upload process
- [ ] Document GitHub Actions troubleshooting
- [ ] Create quick reference for manual deployments
- [ ] Document color scheme guidelines (from November 19)

---

### 4. Build Optimization (Performance)
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


### 5. Code Cleanup
**Source:** November 17, 2025  
**Status:** ✅ **COMPLETED** (December 1, 2025)

**Tasks:**
- [x] Remove temporary debug logging from components
- [x] Clean up diagnostic SQL files (archive, don't delete)
- [x] Remove commented-out code
- [x] Update connection status troubleshooting guide
- [x] Document the trigger chain in `SUPABASE_DATA_FLOW_GUIDE.md`
- [x] Create quick reference for common fixes

**Completed:**
- Removed all temporary debug logging (console.log with emojis/DEBUG labels) from components
- Archived diagnostic SQL files to `supabase/scripts/archive/`
- Reviewed commented-out code (only explanatory comments remain, which are fine)
- Created `docs/supabase/CONNECTION_STATUS_TROUBLESHOOTING.md` - Complete troubleshooting guide
- Created `docs/supabase/SUPABASE_DATA_FLOW_GUIDE.md` - Complete trigger chain documentation
- Created `docs/general/QUICK_FIX_REFERENCE.md` - Quick reference for common fixes

---

## 📋 Task Summary by Category

### ✅ Critical Fixes Completed (Dec 1, 2025)
- **CoolBreeze Database Triggers** - DISABLED triggers preventing data processing → **FIXED**
- **Edge Function Architecture** - Corrected misunderstanding, restored Cirrus functionality
- **Fan Animation Bug** - Fixed default state to respect connection status → **FIXED**
- **Alliance Heatpump Implementation** - Complete database and frontend implementation → **READY FOR TESTING**
- **ESP32 Schema Contracts** - Created for Cirrus and CoolBreeze (Nov 27, partial completion)
- **Architecture Documentation** - Complete data flow documented
- **Heatpump Logic Correction** - Fixed GPIO5/Current mapping (was backwards)

### 🚨 NEW CRITICAL TASKS (Must Do IMMEDIATELY)
- **Test Alliance Heatpump** 🔴 **TOP PRIORITY** - Hardware ready, needs field deployment
- **Optimize Mobile Display** 🔴 **TOP PRIORITY** - Site not readable on cellphones

### 🔴 Critical Infrastructure (IN PROGRESS)
- **ESP32 ↔ Database Schema Synchronization** 🚨 **IN PROGRESS** - Schema contracts done, version tracking pending
- **Alert History Viewer** ⚠️ **NEW** - HIGH priority for troubleshooting
- **Voltage Configuration UI** ⚠️ **NEW** - HIGH priority for flexibility
- **Alert Testing & Simulation** ⚠️ **NEW** - HIGH priority for reliability

### Business & Operations
- **Alert Logic Implementation** ⚠️ **IN PROGRESS** - ESP32 working, needs implementation
- **Notification System Setup and Verification** ⚠️ **PENDING** - Depends on Alert Logic
- **Fee Structure and Billing System Design** ⚠️ **NEW**

### Functionality & Testing
- **Manufacturer-Specific Settings Panel** ⚠️ **NEW** - MEDIUM priority
- **Connection Quality Metrics** ⚠️ **NEW** - MEDIUM priority
- **Historical Data Polish** ⚠️ **PENDING**
- **Function Search Path Security** ⚠️ **PENDING**
- **Implement Secret Scanning & Security Hardening** ⚠️ **NEW**

### Future Enhancements (Low Priority)
- **Historical Data Retention Settings UI** ⚠️ **NEW**
- **Firmware Version Tracking** ⚠️ **NEW**
- **Bulk Configuration Import/Export** ⚠️ **NEW**
- **Custom Dashboard Widgets** ⚠️ **NEW**
- **Multi-Language Support** ⚠️ **NEW**

### Documentation & Optimization
- **Documentation Updates** ⚠️ **PENDING**
- **Build Optimization (Performance)** ⚠️ **PENDING**
- **Code Cleanup** ⚠️ **PENDING**

### Future Planning
- **Database Migration to New Architecture (After MVP)** ⚠️ **PREPARED**

---

## 🎯 Recommended Order of Completion

### 🚨 CRITICAL (Do IMMEDIATELY):
1. **Test Alliance Heatpump** 🔴 **TOP PRIORITY** - Implementation complete, needs field deployment
   - ✅ Database migration complete
   - ✅ Frontend updated
   - ⏳ Update Arduino code (4 lines)
   - ⏳ Flash to ESP32 and deploy to field
   - ⏳ Test all functionality with real data
   - ~2-3 hours

2. **Optimize Mobile Display** 🔴 **TOP PRIORITY** - Site not usable on cellphones
   - ⏳ Audit mobile experience
   - ⏳ Fix responsive layouts
   - ⏳ Fix touch interactions
   - ⏳ Test on real devices
   - ~4-6 hours

3. **ESP32 ↔ Database Schema Synchronization** 🔴 **IN PROGRESS** - Complete version tracking
   - ✅ Schema contracts created for Cirrus and CoolBreeze
   - ✅ Production issue fixed (disabled triggers)
   - ⏳ Add version tracking to database and ESP32 code
   - ~2-3 hours remaining

### High Priority (Do SOON):
4. **Alert Logic Implementation** - ESP32 is working, implement alert monitoring
5. **Alert History Viewer** - Needed for troubleshooting alerts
6. **Alert Testing & Simulation** - Verify alert logic works correctly
7. **Notification System Setup** - Depends on alert logic completion
8. **Voltage Configuration UI** - Flexibility for different installations

### Medium Priority (Next Sprint):
9. **Manufacturer-Specific Settings Panel** - Custom operational parameters
10. **Connection Quality Metrics** - Track connection reliability
11. **Historical Data Polish** - UX refinement
12. **Function Search Path Security** - Security best practice
13. **Secret Scanning & Hardening** - Prevent leaks

### Low Priority (Future Enhancements):
14. **Historical Data Retention Settings UI** - Rarely needed
15. **Firmware Version Tracking** - Nice for support
16. **Bulk Configuration Import/Export** - Rarely used
17. **Custom Dashboard Widgets** - Future enhancement
18. **Multi-Language Support** - International only
19. **Documentation Updates** - Manual deployment guides
20. **Build Optimization** - Performance improvements
21. **Code Cleanup** - Remove debug code, clean up files

### After MVP:
22. **Fee Structure and Billing System** - Business model
23. **Database Migration** - New architecture when ready

---

**Note:** 
- This document tracks ONLY remaining/active tasks
- When tasks are completed, they are removed from this list (not marked as done)
- Completed tasks are documented in daily logs with matching dates
- See `DAILY_LOG_CHECKLIST.md` for process on handling completed tasks

