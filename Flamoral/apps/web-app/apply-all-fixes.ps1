# Master script to apply all frontend fixes

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Flamoral Frontend Fix Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Change to web-app directory
$webAppPath = "C:\Users\citad\OneDrive\Documents\Dating\Flamoral\apps\web-app"
Set-Location $webAppPath

Write-Host "Step 1: Fixing API endpoint URLs..." -ForegroundColor Yellow
& ".\fix-api-urls.ps1"
Write-Host ""

Write-Host "Step 2: Fixing Tailwind color classes..." -ForegroundColor Yellow
& ".\fix-tailwind-colors.ps1"
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "All fixes applied successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run 'npm install' to ensure all dependencies are installed"
Write-Host "2. Run 'npm run type-check' to verify TypeScript compilation"
Write-Host "3. Run 'npm run build' to build the production bundle"
Write-Host "4. Run 'npm run dev' to start the development server"
Write-Host ""
