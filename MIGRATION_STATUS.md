# Migration Status Tracker

**Last Updated:** November 13, 2025

This file tracks which Supabase migrations have been run and which are pending.

## How to Use This File

1. **After running a migration in Supabase:**
   - Mark it as ✅ **RUN** in this file
   - Add the date you ran it
   - Note any issues encountered

2. **Before running migrations:**
   - Check this file to see what's pending
   - Run migrations in order (by timestamp in filename)
   - Update this file after each migration

3. **To check migration status in Supabase:**
   - Go to Supabase Dashboard → Database → Migrations
   - Compare with this list

---

## Migration Checklist

### ✅ Completed Migrations

| Migration File | Description | Date Run | Notes |
|---------------|-------------|----------|-------|
| `20250108000000_create_cirrus_table.sql` | Create CIRRUS table | Nov 13, 2025 | User ran manually |
| `20250108000014_remove_water_level_column.sql` | Remove water_level column | Nov 13, 2025 | User ran manually |

---

### ⏳ Pending Migrations (In Order)

| Migration File | Description | Priority | Status |
|---------------|-------------|----------|--------|
| `20250108000001_create_cirrus_processor.sql` | Create Cirrus processing function & trigger | ⚠️ **CRITICAL** | ⏳ Pending |
| `20250108000002_optimize_edge_function_rate_limit.sql` | Create rate limiting function | ⚠️ **HIGH** | ⏳ Pending |
| `20250108000003_add_manufacturer_column.sql` | Add manufacturer column to machines | ⚠️ **CRITICAL** | ⏳ Pending |
| `20250108000006_create_clean_readings_raw.sql` | Create clean readings_raw table | ⚠️ **CRITICAL** | ⏳ Pending |
| `20250108000007_create_machine_voltage_config.sql` | Create voltage config table | Medium | ⏳ Pending |
| `20250108000008_add_connection_status_calculation.sql` | Add connection status logic | Medium | ⏳ Pending |
| `20250108000009_add_temperature_validation.sql` | Add temperature validation | Medium | ⏳ Pending |
| `20250108000010_add_sensor_read_count.sql` | Add sensor_read_count column | Medium | ⏳ Pending |
| `20250108000004_add_cirrus_cleanup.sql` | Create cleanup functions | Low | ⏳ Pending |
| `20250108000005_setup_cirrus_cleanup_schedule.sql` | Setup automated cleanup | Low | ⏳ Pending |

---

## Migration Order (By Timestamp)

**Run in this exact order:**

1. ✅ `20250108000000_create_cirrus_table.sql` - **DONE**
2. ⏳ `20250108000001_create_cirrus_processor.sql` - **NEXT**
3. ⏳ `20250108000002_optimize_edge_function_rate_limit.sql`
4. ⏳ `20250108000003_add_manufacturer_column.sql` - **NEEDED FOR CHANGE MODEL**
5. ⏳ `20250108000004_add_cirrus_cleanup.sql`
6. ⏳ `20250108000005_setup_cirrus_cleanup_schedule.sql`
7. ⏳ `20250108000006_create_clean_readings_raw.sql` - **CRITICAL**
8. ⏳ `20250108000007_create_machine_voltage_config.sql`
9. ⏳ `20250108000008_add_connection_status_calculation.sql`
10. ⏳ `20250108000009_add_temperature_validation.sql`
11. ⏳ `20250108000010_add_sensor_read_count.sql`
12. ✅ `20250108000014_remove_water_level_column.sql` - **DONE**

---

## Quick Status Check

**Critical Migrations (Must Run):**
- [ ] Migration 1: Cirrus processor (creates trigger to process data)
- [ ] Migration 3: Manufacturer column (needed for "Change Model" feature)
- [ ] Migration 6: Clean readings_raw table (needed for data insertion)

**High Priority:**
- [ ] Migration 2: Rate limiting (prevents excessive API calls)

**Medium Priority:**
- [ ] Migrations 7-11: Additional features

**Low Priority:**
- [ ] Migrations 4-5: Cleanup functions (can run later)

---

## Notes

- **Edge Function:** Already deployed and handles missing columns gracefully
- **ESP32 Code:** Will work even if migrations not run (with reduced features)
- **Rate Limiting:** Edge function will skip if function doesn't exist
- **api_key_used Column:** Edge function will retry without it if column missing

---

## How to Run Migrations

1. Open Supabase Dashboard
2. Go to: **SQL Editor**
3. Copy contents of migration file
4. Paste into SQL Editor
5. Click **Run**
6. Check for errors
7. Update this file with ✅ status

---

## Troubleshooting

**If migration fails:**
- Check error message
- Verify previous migrations have been run
- Check if table/function already exists
- Some migrations use `IF NOT EXISTS` - safe to run multiple times

**If edge function errors:**
- Check if migrations have been run
- Edge function now handles missing columns gracefully
- Check Supabase logs for specific errors

