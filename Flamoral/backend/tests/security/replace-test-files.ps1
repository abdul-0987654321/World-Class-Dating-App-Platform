# PowerShell script to replace old security test files with fixed versions
# Run this from: tests/security directory

Write-Host "Replacing old security test files with fixed versions..." -ForegroundColor Cyan

# Backup old files
Write-Host "Backing up old files..." -ForegroundColor Yellow
if (Test-Path "sqli.test.ts") {
    Move-Item -Path "sqli.test.ts" -Destination "sqli.test.ts.old" -Force
    Write-Host "  - Backed up sqli.test.ts" -ForegroundColor Green
}
if (Test-Path "xss.test.ts") {
    Move-Item -Path "xss.test.ts" -Destination "xss.test.ts.old" -Force
    Write-Host "  - Backed up xss.test.ts" -ForegroundColor Green
}
if (Test-Path "auth.test.ts") {
    Move-Item -Path "auth.test.ts" -Destination "auth.test.ts.old" -Force
    Write-Host "  - Backed up auth.test.ts" -ForegroundColor Green
}

# Rename fixed files
Write-Host "`nRenaming fixed files..." -ForegroundColor Yellow
if (Test-Path "sqli-fixed.test.ts") {
    Move-Item -Path "sqli-fixed.test.ts" -Destination "sqli.test.ts" -Force
    Write-Host "  - Renamed sqli-fixed.test.ts to sqli.test.ts" -ForegroundColor Green
}
if (Test-Path "xss-fixed.test.ts") {
    Move-Item -Path "xss-fixed.test.ts" -Destination "xss.test.ts" -Force
    Write-Host "  - Renamed xss-fixed.test.ts to xss.test.ts" -ForegroundColor Green
}
if (Test-Path "auth-fixed.test.ts") {
    Move-Item -Path "auth-fixed.test.ts" -Destination "auth.test.ts" -Force
    Write-Host "  - Renamed auth-fixed.test.ts to auth.test.ts" -ForegroundColor Green
}

Write-Host "`nFile replacement complete!" -ForegroundColor Cyan
Write-Host "Old files backed up with .old extension" -ForegroundColor Gray
Write-Host "`nTo verify, run:" -ForegroundColor Yellow
Write-Host "  npm test -- --testPathPattern=security --testTimeout=60000" -ForegroundColor White
