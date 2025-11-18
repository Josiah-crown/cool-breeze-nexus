-- Complete Connection Status Diagnostic - ONE QUERY SHOWS EVERYTHING
-- Replace 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42' with your machine ID
-- Run this single query to see all diagnostic info at once

SELECT 
  -- Cirrus table info
  c.timestamp as cirrus_timestamp,
  c.is_connected as cirrus_is_connected,
  ROUND(EXTRACT(EPOCH FROM (NOW() - c.timestamp))/60, 2) as cirrus_minutes_ago,
  c.current as cirrus_current,
  
  -- Machines table info
  m.name as machine_name,
  m.is_connected as machines_is_connected,
  m.updated_at as machines_updated_at,
  ROUND(EXTRACT(EPOCH FROM (NOW() - m.updated_at))/60, 2) as machines_minutes_since_update,
  m.current as machines_current,
  
  -- Diagnostic
  CASE 
    WHEN c.is_connected = true AND EXTRACT(EPOCH FROM (NOW() - c.timestamp))/60 <= 15 
    THEN 'SHOULD BE CONNECTED'
    WHEN c.is_connected = false 
    THEN 'SHOULD BE DISCONNECTED (Cirrus says disconnected)'
    WHEN EXTRACT(EPOCH FROM (NOW() - c.timestamp))/60 > 15 
    THEN 'SHOULD BE DISCONNECTED (Data > 15 min old)'
    ELSE 'UNKNOWN'
  END as expected_status,
  
  CASE 
    WHEN c.is_connected = m.is_connected THEN 'MATCH'
    ELSE 'MISMATCH - Tables disagree!'
  END as status_match

FROM public.machines m
LEFT JOIN (
  SELECT machine_id, timestamp, is_connected, current
  FROM public.cirrus
  WHERE machine_id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42'
  ORDER BY timestamp DESC
  LIMIT 1
) c ON c.machine_id = m.id
WHERE m.id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42';

