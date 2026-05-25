-- ============================================================================
-- Process Backlog of Unprocessed Readings
-- ============================================================================
-- The triggers only fire on NEW inserts. Since data stopped 4-6 days ago,
-- we need to manually process the backlog of unprocessed readings.
-- This script will manually call the processing functions for each unprocessed reading.
-- ============================================================================

-- First, let's see how many unprocessed readings we have
SELECT 
  COUNT(*) as unprocessed_count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM readings_raw
WHERE created_at > NOW() - INTERVAL '7 days';

-- Option 1: Manually insert each reading again to trigger the functions
-- This will re-trigger the processing functions for existing readings
-- WARNING: This might create duplicates if data was partially processed
-- Let's check if there are any duplicates first

-- Check for readings that exist in readings_raw but not in processed tables
-- For CIRRUS machines
SELECT COUNT(*) as cirrus_unprocessed
FROM readings_raw rr
WHERE rr.created_at > NOW() - INTERVAL '7 days'
  AND EXISTS (
    SELECT 1 FROM machines m 
    WHERE m.id = rr.machine_id 
    AND (m.type = 'evaporative' OR m.manufacturer = 'Cirrus')
  )
  AND NOT EXISTS (
    SELECT 1 FROM cirrus c 
    WHERE c.machine_id = rr.machine_id 
    AND c.timestamp = COALESCE(rr.timestamp, rr.created_at)
  );

-- For ALLIANCE machines  
SELECT COUNT(*) as alliance_unprocessed
FROM readings_raw rr
WHERE rr.created_at > NOW() - INTERVAL '7 days'
  AND EXISTS (
    SELECT 1 FROM machines m 
    WHERE m.id = rr.machine_id 
    AND m.manufacturer = 'Alliance'
  )
  AND NOT EXISTS (
    SELECT 1 FROM alliance a 
    WHERE a.machine_id = rr.machine_id 
    AND a.timestamp = COALESCE(rr.timestamp, rr.created_at)
  );

-- For COOLBREEZE machines
SELECT COUNT(*) as coolbreeze_unprocessed
FROM readings_raw rr
WHERE rr.created_at > NOW() - INTERVAL '7 days'
  AND EXISTS (
    SELECT 1 FROM machines m 
    WHERE m.id = rr.machine_id 
    AND m.manufacturer = 'CoolBreeze'
  )
  AND NOT EXISTS (
    SELECT 1 FROM coolbreeze cb 
    WHERE cb.machine_id = rr.machine_id 
    AND cb.timestamp = COALESCE(cb.timestamp, cb.created_at)
  );

