# Simple Backup Script for Cool Breeze Nexus
# Creates a ZIP backup excluding node_modules, dist, and .git

$timestamp = Get-Date -Format "yyyy-MM-dd-HHmm"
$backupName = "cool-breeze-nexus-BACKUP-$timestamp.zip"
$tempDir = "temp-backup-$timestamp"

Write-Host "Creating backup: $backupName" -ForegroundColor Cyan

# Create temp directory
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

# Copy files excluding large directories
Write-Host "Copying files..." -ForegroundColor Yellow
robocopy . $tempDir /E /XD node_modules dist .git temp-backup* /XF *.zip /NFL /NDL /NJH /NJS /NP

# Create ZIP
Write-Host "Creating ZIP archive..." -ForegroundColor Yellow
Compress-Archive -Path "$tempDir\*" -DestinationPath $backupName -Force

# Cleanup temp directory
Remove-Item -Path $tempDir -Recurse -Force

# Show result
if (Test-Path $backupName) {
    $size = [math]::Round((Get-Item $backupName).Length / 1MB, 2)
    Write-Host ""
    Write-Host "SUCCESS! Backup created:" -ForegroundColor Green
    Write-Host "  File: $backupName" -ForegroundColor White
    Write-Host "  Size: $size MB" -ForegroundColor White
    Write-Host ""
    Write-Host "To restore: Extract ZIP, run 'npm install', then 'npm run dev'" -ForegroundColor Cyan
} else {
    Write-Host "ERROR: Backup failed!" -ForegroundColor Red
}

