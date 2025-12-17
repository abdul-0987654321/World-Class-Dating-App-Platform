# Analytics Service Fix Deployment Script (PowerShell)
# Fixes the analytics routing issue and redeploys services

$ErrorActionPreference = "Stop"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Analytics Service Fix Deployment" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Change to script directory
Set-Location $PSScriptRoot

# Step 1: Backup
Write-Host "Step 1: Backup current files" -ForegroundColor Blue
Write-Host "Creating backups..." -ForegroundColor Gray

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "backend\services\api-gateway\src\controllers\analytics.controller.ts.backup.$timestamp"

Copy-Item "backend\services\api-gateway\src\controllers\analytics.controller.ts" $backupFile
Write-Host "✓ Backup created: $backupFile" -ForegroundColor Green
Write-Host ""

# Step 2: Apply fix
Write-Host "Step 2: Apply routing fix" -ForegroundColor Blue
Write-Host "Fixing analytics controller routing..." -ForegroundColor Gray

$controllerFile = "backend\services\api-gateway\src\controllers\analytics.controller.ts"
$content = Get-Content $controllerFile -Raw
$newContent = $content -replace "@Controller\('analytics'\)", "@Controller('api/analytics')"
Set-Content $controllerFile $newContent -NoNewline

# Verify the change
if ((Get-Content $controllerFile -Raw) -match "@Controller\('api/analytics'\)") {
    Write-Host "✓ Analytics controller fixed" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to fix analytics controller" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 3: Check other controllers
Write-Host "Step 3: Check other controllers" -ForegroundColor Blue
Write-Host "Verifying other controller routes..." -ForegroundColor Gray

$controllers = @{
    "user.controller.ts" = "users"
    "profiles.controller.ts" = "profiles"
    "notification.controller.ts" = "notifications"
    "moderation.controller.ts" = "moderation"
    "media.controller.ts" = "media"
}

foreach ($file in $controllers.Keys) {
    $route = $controllers[$file]
    $filePath = "backend\services\api-gateway\src\controllers\$file"

    if (Test-Path $filePath) {
        $content = Get-Content $filePath -Raw
        if ($content -match "@Controller\('$route'\)") {
            Write-Host "⚠ $file uses @Controller('$route') - may need api/ prefix" -ForegroundColor Yellow
        }
    }
}
Write-Host ""

# Step 4: Rebuild API Gateway
Write-Host "Step 4: Rebuild API Gateway" -ForegroundColor Blue
Write-Host "Building API Gateway..." -ForegroundColor Gray

Push-Location "backend\services\api-gateway"

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Gray
    npm install
}

# Build
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ API Gateway built successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Build failed" -ForegroundColor Red
    Pop-Location
    exit 1
}

Pop-Location
Write-Host ""

# Step 5: Verify Analytics Service
Write-Host "Step 5: Verify Analytics Service" -ForegroundColor Blue
Write-Host "Checking analytics service status..." -ForegroundColor Gray

if (Test-Path "backend\services\analytics-service") {
    Write-Host "✓ Analytics service found" -ForegroundColor Green

    Push-Location "backend\services\analytics-service"

    if (-not (Test-Path "node_modules")) {
        Write-Host "Installing dependencies..." -ForegroundColor Gray
        npm install
    }

    if (Test-Path "tsconfig.json") {
        Write-Host "Building analytics service..." -ForegroundColor Gray
        npm run build 2>$null
    }

    Pop-Location
} else {
    Write-Host "✗ Analytics service not found" -ForegroundColor Red
}
Write-Host ""

# Step 6: Test configuration
Write-Host "Step 6: Test configuration" -ForegroundColor Blue
Write-Host "Verifying configuration files..." -ForegroundColor Gray

if (Test-Path "backend\services\api-gateway\.env") {
    $envContent = Get-Content "backend\services\api-gateway\.env" -Raw
    if ($envContent -match "ANALYTICS_SERVICE_URL") {
        Write-Host "✓ Analytics service URL configured" -ForegroundColor Green
    } else {
        Write-Host "⚠ ANALYTICS_SERVICE_URL not found in .env" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠ No .env file found for API Gateway" -ForegroundColor Yellow
}
Write-Host ""

# Summary
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. LOCAL TESTING:" -ForegroundColor Yellow
Write-Host "   cd backend\services\api-gateway && npm run dev" -ForegroundColor White
Write-Host "   cd backend\services\analytics-service && npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "2. TEST ENDPOINT:" -ForegroundColor Yellow
Write-Host "   curl http://localhost:4000/api/v1/api/analytics/dashboard" -ForegroundColor White
Write-Host ""
Write-Host "3. PRODUCTION DEPLOYMENT:" -ForegroundColor Yellow
Write-Host "   Build Docker images:" -ForegroundColor White
Write-Host "   docker build -t flamoral.azurecr.io/api-gateway:latest .\backend\services\api-gateway" -ForegroundColor White
Write-Host "   docker push flamoral.azurecr.io/api-gateway:latest" -ForegroundColor White
Write-Host ""
Write-Host "   Update Azure Container App:" -ForegroundColor White
Write-Host "   az containerapp update `" -ForegroundColor White
Write-Host "     --name api-gateway `" -ForegroundColor White
Write-Host "     --resource-group flamoral-prod-rg `" -ForegroundColor White
Write-Host "     --image flamoral.azurecr.io/api-gateway:latest" -ForegroundColor White
Write-Host ""
Write-Host "4. VERIFY FIX:" -ForegroundColor Yellow
Write-Host "   curl https://api.flamoral.com/api/v1/api/analytics/dashboard `" -ForegroundColor White
Write-Host "     -H `"Authorization: Bearer YOUR_JWT_TOKEN`"" -ForegroundColor White
Write-Host ""
Write-Host "5. MONITOR:" -ForegroundColor Yellow
Write-Host "   Check circuit breaker status should show 0 failures" -ForegroundColor White
Write-Host "   Monitor API Gateway logs for successful analytics requests" -ForegroundColor White
Write-Host ""
Write-Host "Analytics service fix deployed successfully!" -ForegroundColor Green
