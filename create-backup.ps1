# Quick Backup Script
# Creates a ZIP backup excluding node_modules, dist, and .git

$timestamp = Get-Date -Format "yyyy-MM-dd-HHmm"
$backupName = "cool-breeze-nexus-BACKUP-$timestamp.zip"
$tempDir = "temp-backup-$timestamp"
$projectRoot = Get-Location

Write-Host "🔄 Creating backup..." -ForegroundColor Cyan
Write-Host "Excluding: node_modules, dist, .git" -ForegroundColor Yellow

# Create temporary directory
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

# Copy files excluding large folders
Write-Host "📁 Copying files..." -ForegroundColor Cyan
robocopy . $tempDir /E /XD node_modules dist .git /XF *.zip /NFL /NDL /NJH /NJS

# Create ZIP
Write-Host "📦 Creating ZIP archive..." -ForegroundColor Cyan
Compress-Archive -Path "$tempDir\*" -DestinationPath $backupName -Force -CompressionLevel Optimal

# Cleanup
Remove-Item -Recurse -Force $tempDir

$size = (Get-Item $backupName).Length / 1MB
Write-Host "✅ Backup created successfully!" -ForegroundColor Green
Write-Host "📦 File: $backupName" -ForegroundColor White
Write-Host "📊 Size: $([math]::Round($size, 2)) MB" -ForegroundColor White
Write-Host ""
Write-Host "💡 To restore: Extract ZIP, run 'npm install', then 'npm run dev'" -ForegroundColor Yellow

