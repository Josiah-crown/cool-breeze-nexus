# ========================================
# Supabase CLI Sync Script (PowerShell)
# ========================================
# Purpose: Automate schema sync from Production to Staging
# Usage: .\cli_sync_script.ps1
# ========================================

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Green
Write-Host "Supabase CLI Schema Sync" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Determine if we should use npx or direct supabase command
$USE_NPX = $false
$SUPABASE_CMD = "supabase"

try {
    $null = Get-Command supabase -ErrorAction Stop
    Write-Host "Supabase CLI found (direct install)" -ForegroundColor Green
} catch {
    # Try using npx instead
    try {
        $null = npx supabase@latest --version 2>&1
        $USE_NPX = $true
        $SUPABASE_CMD = "npx supabase@latest"
        Write-Host "Using Supabase CLI via npx (no installation needed)" -ForegroundColor Green
    } catch {
        Write-Host "Error: Supabase CLI is not available" -ForegroundColor Red
        Write-Host "Options:" -ForegroundColor Yellow
        Write-Host "1. Use npx (recommended): Already available via npm" -ForegroundColor Yellow
        Write-Host "2. Install via Scoop: scoop install supabase" -ForegroundColor Yellow
        Write-Host "3. Download binary from: https://github.com/supabase/cli/releases" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "See CLI_INSTALL_WINDOWS.md for details" -ForegroundColor Yellow
        exit 1
    }
}

# Function to execute supabase commands
function Invoke-Supabase {
    param([string[]]$Arguments)
    if ($USE_NPX) {
        & npx supabase@latest $Arguments
    } else {
        & supabase $Arguments
    }
}

# Check if logged in
try {
    $null = Invoke-Supabase -Arguments @("projects", "list") 2>&1
    Write-Host "Logged in to Supabase" -ForegroundColor Green
} catch {
    Write-Host "Not logged in. Please login:" -ForegroundColor Yellow
    Invoke-Supabase -Arguments @("login")
}

Write-Host ""

# Get project refs
Write-Host "Available projects:" -ForegroundColor Yellow
Invoke-Supabase -Arguments @("projects", "list")

Write-Host ""
$PROD_REF = Read-Host "Enter PRODUCTION project ref"
$STAGING_REF = Read-Host "Enter STAGING project ref"

Write-Host ""
Write-Host "Step 1: Pulling schema from PRODUCTION..." -ForegroundColor Yellow
Invoke-Supabase -Arguments @("link", "--project-ref", $PROD_REF)
Invoke-Supabase -Arguments @("db", "pull")

Write-Host "Schema pulled from production" -ForegroundColor Green
Write-Host ""

# Get the latest migration file
$LATEST_MIGRATION = Get-ChildItem -Path "supabase\migrations\*.sql" | 
    Sort-Object LastWriteTime -Descending | 
    Select-Object -First 1

Write-Host "Latest migration: $($LATEST_MIGRATION.Name)" -ForegroundColor Yellow
Write-Host ""

Read-Host "Review the migration file above. Press Enter to continue..."

Write-Host ""
Write-Host "Step 2: Linking to STAGING..." -ForegroundColor Yellow
Invoke-Supabase -Arguments @("link", "--project-ref", $STAGING_REF)

Write-Host "Linked to staging" -ForegroundColor Green
Write-Host ""

$RESET_CONFIRM = Read-Host "Have you reset the staging database? (y/n)"
if ($RESET_CONFIRM -ne "y") {
    Write-Host ""
    Write-Host "Options to reset staging database:" -ForegroundColor Yellow
    Write-Host "1. Delete and recreate staging project (fastest)" -ForegroundColor Cyan
    Write-Host "2. Use SQL script to drop all objects (keeps project)" -ForegroundColor Cyan
    Write-Host "3. Skip reset (may cause conflicts if objects exist)" -ForegroundColor Cyan
    Write-Host ""
    $RESET_OPTION = Read-Host "Choose option (1/2/3)"
    
    if ($RESET_OPTION -eq "1") {
        Write-Host ""
        Write-Host "Steps to delete and recreate:" -ForegroundColor Yellow
        Write-Host "1. Go to Staging project dashboard" -ForegroundColor White
        Write-Host "2. Settings -> General -> Delete Project" -ForegroundColor White
        Write-Host "3. Create a new project with the same name" -ForegroundColor White
        Write-Host "4. Note the new project ref" -ForegroundColor White
        Write-Host ""
        $NEW_REF = Read-Host "Enter the NEW staging project ref (or press Enter to use current)"
        if ($NEW_REF) {
            $STAGING_REF = $NEW_REF
            Write-Host "Updated staging ref to: $STAGING_REF" -ForegroundColor Green
            Invoke-Supabase -Arguments @("link", "--project-ref", $STAGING_REF)
        }
        Read-Host "Press Enter after recreating the project..."
    } elseif ($RESET_OPTION -eq "2") {
        Write-Host ""
        Write-Host "To reset via SQL:" -ForegroundColor Yellow
        Write-Host "1. Go to Staging project -> SQL Editor" -ForegroundColor White
        Write-Host "2. Run the script: reset_staging_database.sql" -ForegroundColor White
        Write-Host "3. This will drop all tables, functions, and triggers" -ForegroundColor White
        Write-Host ""
        Read-Host "Press Enter after running the SQL reset script..."
    } else {
        Write-Host ""
        Write-Host "Skipping reset. Continuing with migration..." -ForegroundColor Yellow
        Write-Host "Note: You may encounter errors if objects already exist." -ForegroundColor Yellow
        Write-Host ""
    }
}

Write-Host ""
Write-Host "Step 3: Pushing migrations to STAGING..." -ForegroundColor Yellow
Invoke-Supabase -Arguments @("db", "push")

Write-Host "Migrations pushed to staging" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "Schema sync complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Migrate data using: 20251208_simple_data_export.sql"
Write-Host "2. Verify with: 20251208_check_migration_status.sql"
Write-Host ""
