-- ============================================================================
-- Check Production Device Status
-- Run this to see which devices stopped sending data and when
-- ============================================================================

-- Check last reading time for all devices
SELECT 
  m.id,
  m.name,
  m.manufacturer,
  m.type,
  MAX(rr.created_at) as last_reading_raw,
  NOW() - MAX(rr.created_at) as time_since_last_reading,
  CASE 
    WHEN MAX(rr.created_at) > NOW() - INTERVAL '1 hour' THEN '✅ Active'
    WHEN MAX(rr.created_at) > NOW() - INTERVAL '24 hours' THEN '⚠️ Recent'
    WHEN MAX(rr.created_at) > NOW() - INTERVAL '7 days' THEN '🔴 Inactive'
    ELSE '❌ No Data'
  END as status
FROM machines m
LEFT JOIN readings_raw rr ON rr.machine_id = m.id
GROUP BY m.id, m.name, m.manufacturer, m.type
ORDER BY MAX(rr.created_at) DESC NULLS LAST;

-- Count devices by status
SELECT 
  CASE 
    WHEN MAX(rr.created_at) > NOW() - INTERVAL '1 hour' THEN 'Active (< 1 hour)'
    WHEN MAX(rr.created_at) > NOW() - INTERVAL '24 hours' THEN 'Recent (< 24 hours)'
    WHEN MAX(rr.created_at) > NOW() - INTERVAL '7 days' THEN 'Inactive (< 7 days)'
    ELSE 'No Data (> 7 days)'
  END as status_category,
  COUNT(*) as device_count
FROM machines m
LEFT JOIN readings_raw rr ON rr.machine_id = m.id
GROUP BY m.id
HAVING COUNT(*) > 0 OR TRUE
ORDER BY MIN(rr.created_at) DESC NULLS LAST;

-- Devices that stopped around Jan 6-8 (the problematic period)
SELECT 
  m.id,
  m.name,
  m.manufacturer,
  MAX(rr.created_at) as last_reading,
  COUNT(*) as total_readings
FROM machines m
JOIN readings_raw rr ON rr.machine_id = m.id
WHERE rr.created_at < '2026-01-09'::timestamp
  AND rr.created_at > '2026-01-05'::timestamp
GROUP BY m.id, m.name, m.manufacturer
HAVING MAX(rr.created_at) BETWEEN '2026-01-05'::timestamp AND '2026-01-09'::timestamp
ORDER BY MAX(rr.created_at) DESC;

