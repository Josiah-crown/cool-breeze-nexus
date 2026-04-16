# ========================================
# Pull Exact Production Schema
# ========================================
# This script pulls the EXACT current schema from production
# and applies it to staging, avoiding all the old migration conflicts
# ========================================

Write-Host "========================================" -ForegroundColor Green
Write-Host "Pull Exact Production Schema" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Get project refs
Write-Host "Available projects:" -ForegroundColor Yellow
npx supabase@latest projects list

Write-Host ""
$PROD_REF = Read-Host "Enter PRODUCTION project ref"
$STAGING_REF = Read-Host "Enter STAGING project ref"

Write-Host ""
Write-Host "Step 1: Pulling EXACT schema from PRODUCTION..." -ForegroundColor Yellow
npx supabase@latest link --project-ref $PROD_REF
npx supabase@latest db pull

Write-Host ""
Write-Host "Schema pulled! Check for a new migration file like: YYYYMMDDHHMMSS_remote_schema.sql" -ForegroundColor Green
Write-Host ""

$LATEST_MIGRATION = Get-ChildItem -Path "supabase\migrations\*.sql" | 
    Sort-Object LastWriteTime -Descending | 
    Select-Object -First 1

Write-Host "Latest migration file: $($LATEST_MIGRATION.Name)" -ForegroundColor Cyan
Write-Host ""

Read-Host "Review the migration file. Press Enter to continue..."

Write-Host ""
Write-Host "Step 2: Clearing staging migration history..." -ForegroundColor Yellow
Write-Host "Go to Staging SQL Editor and run:" -ForegroundColor White
Write-Host "DELETE FROM supabase_migrations.schema_migrations;" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter after clearing migration history..."

Write-Host ""
Write-Host "Step 3: Moving old migrations to backup..." -ForegroundColor Yellow

# Create backup folder
New-Item -ItemType Directory -Path "supabase\migrations\backup_old" -Force | Out-Null

# Move old migrations (keep the new one)
$KEEP_FILE = $LATEST_MIGRATION.Name
Get-ChildItem -Path "supabase\migrations\*.sql" | 
    Where-Object { $_.Name -ne $KEEP_FILE -and $_.Name -notlike "*backup*" } |
    Move-Item -Destination "supabase\migrations\backup_old\" -Force

Write-Host "Old migrations moved to: supabase\migrations\backup_old\" -ForegroundColor Green
Write-Host ""

Write-Host "Step 4: Pushing exact schema to STAGING..." -ForegroundColor Yellow
npx supabase@latest link --project-ref $STAGING_REF
npx supabase@latest db push

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Done! Staging should now match production exactly." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""



