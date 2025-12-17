# Fix Analytics Service Routing Issues
# This script fixes the analytics controller routing to match the expected /api/v1/api/analytics pattern

Write-Host "Fixing Analytics Service Routing..." -ForegroundColor Cyan

$gatewayPath = "C:\Users\citad\OneDrive\Documents\Dating\Flamoral\backend\services\api-gateway"
$controllerFile = "$gatewayPath\src\controllers\analytics.controller.ts"

# Backup the file first
Write-Host "Creating backup..." -ForegroundColor Yellow
Copy-Item $controllerFile "$controllerFile.backup" -Force

# Read the content
$content = Get-Content $controllerFile -Raw

# Fix the controller decorator
$content = $content -replace "@Controller\('analytics'\)", "@Controller('api/analytics')"

# Write back
Set-Content $controllerFile $content -NoNewline

Write-Host "Fixed analytics controller routing!" -ForegroundColor Green
Write-Host "  Changed: @Controller('analytics')" -ForegroundColor Gray
Write-Host "  To:      @Controller('api/analytics')" -ForegroundColor Gray
Write-Host ""
Write-Host "Routes will now be:" -ForegroundColor Cyan
Write-Host "  /api/v1/api/analytics/dashboard" -ForegroundColor White
Write-Host "  /api/v1/api/analytics/events" -ForegroundColor White
Write-Host "  /api/v1/api/analytics/engagement" -ForegroundColor White
Write-Host "  etc..." -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Rebuild the API gateway service" -ForegroundColor White
Write-Host "  2. Restart the service" -ForegroundColor White
Write-Host "  3. Test the endpoint: GET /api/v1/api/analytics/dashboard" -ForegroundColor White
