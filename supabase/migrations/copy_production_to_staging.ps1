# ========================================
# Copy Production Database to Staging
# ========================================
# This script uses Supabase CLI with Docker to copy production to staging
# ========================================

# Configuration
$PRODUCTION_REF = "wjyanxstvbiqefmgpccb"
$STAGING_REF = "pnbcgceootbfpcksvmcq"
$DUMP_FILE = "production_full.sql"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Copy Production to Staging" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Get passwords
Write-Host "Step 1: Database Passwords" -ForegroundColor Yellow
Write-Host "You need to provide your database passwords:" -ForegroundColor White
Write-Host ""
$PROD_PASSWORD = Read-Host "Enter PRODUCTION database password" -AsSecureString
$STAGING_PASSWORD = Read-Host "Enter STAGING database password" -AsSecureString

# Convert secure strings to plain text (for command line)
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($PROD_PASSWORD)
$PROD_PASSWORD_PLAIN = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($STAGING_PASSWORD)
$STAGING_PASSWORD_PLAIN = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

Write-Host ""

# Step 2: Check Docker
Write-Host "Step 2: Checking Docker..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "✓ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker is not running!" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and try again." -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Step 3: Dump Production
Write-Host "Step 3: Dumping Production Database..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor White

$PROD_URL = "postgresql://postgres:$PROD_PASSWORD_PLAIN@db.$PRODUCTION_REF.supabase.co:5432/postgres"

try {
    npx supabase@latest db dump --db-url $PROD_URL -f $DUMP_FILE
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Production database dumped successfully" -ForegroundColor Green
        Write-Host "  File: $DUMP_FILE" -ForegroundColor Gray
    } else {
        Write-Host "✗ Failed to dump production database" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "✗ Error dumping production: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 4: Restore to Staging
Write-Host "Step 4: Restoring to Staging Database..." -ForegroundColor Yellow
Write-Host "This may take several minutes..." -ForegroundColor White

$STAGING_URL = "postgresql://postgres:$STAGING_PASSWORD_PLAIN@db.$STAGING_REF.supabase.co:5432/postgres"

try {
    # Note: db push doesn't accept --file flag, we need to use psql or another method
    # Let's use psql directly
    Write-Host "Using psql to restore..." -ForegroundColor Gray
    
    # Check if psql is available
    $psqlAvailable = Get-Command psql -ErrorAction SilentlyContinue
    if (-not $psqlAvailable) {
        Write-Host "✗ psql not found. Please install PostgreSQL client tools." -ForegroundColor Red
        Write-Host "Alternative: Manually run the SQL file in Staging SQL Editor" -ForegroundColor Yellow
        Write-Host "File location: $PWD\$DUMP_FILE" -ForegroundColor Gray
        exit 1
    }
    
    $env:PGPASSWORD = $STAGING_PASSWORD_PLAIN
    psql -h "db.$STAGING_REF.supabase.co" -U postgres -d postgres -p 5432 -f $DUMP_FILE
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Staging database restored successfully" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to restore staging database" -ForegroundColor Red
        Write-Host "You can manually run the SQL file in Staging SQL Editor" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "✗ Error restoring to staging: $_" -ForegroundColor Red
    Write-Host "You can manually run the SQL file in Staging SQL Editor" -ForegroundColor Yellow
    Write-Host "File location: $PWD\$DUMP_FILE" -ForegroundColor Gray
    exit 1
} finally {
    # Clear password from environment
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host ""

# Step 5: Verification
Write-Host "Step 5: Verification" -ForegroundColor Yellow
Write-Host "Please run this query in BOTH Production and Staging SQL Editors:" -ForegroundColor White
Write-Host ""
Write-Host "SELECT 'profiles' AS table_name, COUNT(*) AS count FROM public.profiles" -ForegroundColor Cyan
Write-Host "UNION ALL SELECT 'machines', COUNT(*) FROM public.machines" -ForegroundColor Cyan
Write-Host "UNION ALL SELECT 'readings_raw', COUNT(*) FROM public.readings_raw" -ForegroundColor Cyan
Write-Host "UNION ALL SELECT 'cirrus', COUNT(*) FROM public.cirrus" -ForegroundColor Cyan
Write-Host "UNION ALL SELECT 'alliance', COUNT(*) FROM public.alliance" -ForegroundColor Cyan
Write-Host "UNION ALL SELECT 'coolbreeze', COUNT(*) FROM public.coolbreeze" -ForegroundColor Cyan
Write-Host "ORDER BY table_name;" -ForegroundColor Cyan
Write-Host ""
Write-Host "Counts should match (or be very close)!" -ForegroundColor White
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Copy Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan



