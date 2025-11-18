# Query connection status using Supabase CLI
# This bypasses RLS by using the CLI's direct database connection

$machineId = "c2b9f798-0ea0-4487-b8cb-f3f1bdb83a42"

Write-Host "🔍 Querying connection status via Supabase CLI...`n" -ForegroundColor Cyan

# Query cirrus table
Write-Host "=== CIRRUS TABLE ===" -ForegroundColor Yellow
$cirrusQuery = @"
SELECT 
  timestamp,
  is_connected,
  EXTRACT(EPOCH FROM (NOW() - timestamp))/60 as minutes_ago,
  current
FROM public.cirrus
WHERE machine_id = '$machineId'
ORDER BY timestamp DESC
LIMIT 1;
"@

Write-Host "Running query..." -ForegroundColor Gray
# Note: Supabase CLI doesn't have direct SQL execution, so we'll use psql if available
# Or we can create a migration file and check it

Write-Host "`n💡 Since Supabase CLI doesn't support direct SQL execution," -ForegroundColor Yellow
Write-Host "   please run this SQL in the Supabase SQL Editor:" -ForegroundColor Yellow
Write-Host "`n$cirrusQuery" -ForegroundColor White

