# Remaining Tasks - Compiled from Daily Logs

**Last Updated:** January 26, 2025  
**Status:** Active tracking of outstanding tasks from all daily logs  
**Note:** Completed tasks have been removed from this list. See daily logs for completion details:
- `2025-11-20_FULL_SESSION.md` - GitHub Actions deployment, frontend fixes
- `2025-11-25_DATABASE_CLEANUP_AND_MIGRATION_PREP.md` - RLS grants fix, connection threshold fix, ESP32 verification
- `2025-01-26_HISTORICAL_DATA_UPDATES.md` - Historical graph updates (fan speed, pump line, data ranges)

---

## 🔴 High Priority Tasks

### 1. Alert Logic Implementation
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

### 2. Notification System Setup and Verification
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

### 3. Fee Structure and Billing System Design
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

### 4. Database Migration to New Architecture (After MVP)
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

### 1. Historical Graph Data Polish
**Source:** January 26, 2025  
**Status:** ⏳ **PENDING**

**Issue:**
- Graph rendering is working, but data handling needs refinement.
- Data aggregation and display logic should be optimized for better user experience.

**Requirements:**
- [ ] Review data aggregation logic in `get_historical_data` SQL function
- [ ] Ensure smooth transitions between data points
- [ ] Verify data accuracy for all time periods (24h, 7d, 30d, 1y)
- [ ] Address any edge cases with missing or null data
- [ ] Optimize frontend data processing performance

**Priority:** 🟠 **MEDIUM** - Polish after core functionality is working

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

## 🟢 Low Priority Tasks

### 3. Documentation Updates
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

### Business & Operations
- Alert Logic Implementation ⚠️ **IN PROGRESS** - ESP32 working, needs implementation
- Notification System Setup and Verification ⚠️ **PENDING** - Depends on Alert Logic
- Fee Structure and Billing System Design ⚠️ **NEW**

### Functionality & Testing
- Historical Graph Data Polish ⚠️ **NEW**
- Function Search Path Security ⚠️ **PENDING**

### Documentation & Optimization
- Documentation Updates ⚠️ **PENDING**
- Build Optimization (Performance) ⚠️ **PENDING**
- Code Cleanup ⚠️ **PENDING**

### Future Planning
- Database Migration to New Architecture (After MVP) ⚠️ **PREPARED**

---

## 🎯 Recommended Order of Completion

### Current Priority (High):
1. **Alert Logic Implementation** - ESP32 is working, implement alert monitoring
2. **Notification System Setup** - Depends on alert logic completion

### Next Priority (Medium):
3. **Historical Graph Data Polish** - Refine data handling
4. **Function Search Path Security** - Security best practice

### Future (Low Priority):
5. **Documentation Updates** - Manual deployment guides
6. **Build Optimization** - Performance improvements
7. **Code Cleanup** - Remove debug code, clean up files
8. **Database Migration** - After MVP completion

---

**Note:** 
- This document tracks ONLY remaining/active tasks
- When tasks are completed, they are removed from this list (not marked as done)
- Completed tasks are documented in daily logs with matching dates
- See `DAILY_LOG_CHECKLIST.md` for process on handling completed tasks
