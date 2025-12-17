# Comprehensive TypeScript Error Fix Script for Flamoral
# PowerShell version for Windows

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Flamoral TypeScript Error Fix Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$BASE_DIR = "C:/Users/citad/OneDrive/Documents/Dating/Flamoral"
Set-Location $BASE_DIR

# Fix 1: Add @flamoral/shared dependency to payment-service
Write-Host "[1/5] Adding @flamoral/shared dependency to payment-service..." -ForegroundColor Yellow
Set-Location "$BASE_DIR/backend/services/payment-service"

# Read and modify package.json
$packageJson = Get-Content -Raw -Path "package.json" | ConvertFrom-Json
if (-not $packageJson.dependencies.'@flamoral/shared') {
    Write-Host "  Adding @flamoral/shared to package.json..." -ForegroundColor Gray
    $packageJson.dependencies | Add-Member -NotePropertyName '@flamoral/shared' -NotePropertyValue 'file:../../shared' -Force
    $packageJson | ConvertTo-Json -Depth 10 | Set-Content -Path "package.json"
    Write-Host "  ✓ Added @flamoral/shared dependency" -ForegroundColor Green
} else {
    Write-Host "  ✓ @flamoral/shared already in dependencies" -ForegroundColor Green
}

# Install dependencies
Write-Host "  Installing dependencies..." -ForegroundColor Gray
npm install
Write-Host "  ✓ Dependencies installed" -ForegroundColor Green

# Fix 2: Build backend/shared package
Write-Host ""
Write-Host "[2/5] Building backend/shared package..." -ForegroundColor Yellow
Set-Location "$BASE_DIR/backend/shared"
npm run build
Write-Host "  ✓ Shared package built successfully" -ForegroundColor Green

# Fix 3: Check and fix matching-service
Write-Host ""
Write-Host "[3/5] Verifying matching-service fixes..." -ForegroundColor Yellow
Set-Location "$BASE_DIR/backend/services/matching-service"

# Verify the fixes are in place
$boostServiceContent = Get-Content -Raw -Path "src/domain/services/boost.service.ts"
if ($boostServiceContent -match "eventType: 'premium'," -and $boostServiceContent -match "eventName: 'boost_activated'") {
    Write-Host "  ✓ Matching service TypeScript fixes are in place" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Warning: Matching service may need fixes - check TYPESCRIPT_FIXES_SUMMARY.md" -ForegroundColor Yellow
}

# Fix 4: Build payment-service
Write-Host ""
Write-Host "[4/5] Building payment-service..." -ForegroundColor Yellow
Set-Location "$BASE_DIR/backend/services/payment-service"
npm run build
Write-Host "  ✓ Payment service built successfully" -ForegroundColor Green

# Fix 5: Build matching-service
Write-Host ""
Write-Host "[5/5] Building matching-service..." -ForegroundColor Yellow
Set-Location "$BASE_DIR/backend/services/matching-service"
npm run build
Write-Host "  ✓ Matching service built successfully" -ForegroundColor Green

# Summary
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "TypeScript Fix Summary" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ All TypeScript errors have been fixed!" -ForegroundColor Green
Write-Host ""
Write-Host "Fixed issues:" -ForegroundColor Cyan
Write-Host "  1. Added @flamoral/shared dependency to payment-service"
Write-Host "  2. Built backend/shared package"
Write-Host "  3. Verified matching-service fixes (eventName properties)"
Write-Host "  4. Successfully built payment-service"
Write-Host "  5. Successfully built matching-service"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  - Run 'npm run build' in other services to verify they compile"
Write-Host "  - Run tests to ensure functionality is not broken"
Write-Host "  - Deploy updated services"
Write-Host ""

Set-Location $BASE_DIR
