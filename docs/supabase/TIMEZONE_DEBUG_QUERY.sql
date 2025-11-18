-- Timezone Debug Query
-- Use this to check timezone issues with connection status

-- Replace 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42' with your machine ID

SELECT 
  m.id,
  m.name,
  m.is_connected,
  m.updated_at as machines_updated_at,
  -- Show times in both UTC and with timezone info
  NOW() as current_time_utc,
  NOW() AT TIME ZONE 'UTC' as current_time_utc_explicit,
  GREATEST(
    COALESCE(MAX(c.timestamp), '1970-01-01'::timestamptz),
    COALESCE(MAX(cb.timestamp), '1970-01-01'::timestamptz)
  ) as last_reading_timestamp,
  -- Calculate minutes ago using explicit UTC
  EXTRACT(EPOCH FROM ((NOW() AT TIME ZONE 'UTC') - GREATEST(
    COALESCE(MAX(c.timestamp), '1970-01-01'::timestamptz),
    COALESCE(MAX(cb.timestamp), '1970-01-01'::timestamptz)
  )))/60 as minutes_ago_utc,
  -- Check connection status
  CASE 
    WHEN EXTRACT(EPOCH FROM ((NOW() AT TIME ZONE 'UTC') - GREATEST(
      COALESCE(MAX(c.timestamp), '1970-01-01'::timestamptz),
      COALESCE(MAX(cb.timestamp), '1970-01-01'::timestamptz)
    )))/60 <= 15 THEN true
    ELSE false
  END as should_be_connected_utc,
  -- Show what the database thinks
  m.is_connected as database_says_connected
FROM public.machines m
LEFT JOIN public.cirrus c ON c.machine_id = m.id
LEFT JOIN public.coolbreeze cb ON cb.machine_id = m.id
WHERE m.id = 'c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42'
GROUP BY m.id, m.name, m.is_connected, m.updated_at;

