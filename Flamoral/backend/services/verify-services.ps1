# Service Configuration Verification Script (PowerShell)
# This script verifies that all backend services are properly configured

Write-Host "========================================"
Write-Host "Backend Service Configuration Verifier"
Write-Host "========================================"
Write-Host ""

# Define services and their ports
$services = @{
    "api-gateway" = 4000
    "auth-service" = 3001
    "user-service" = 3001
    "matching-service" = 3002
    "messaging-service" = 3003
    "moderation-service" = 3004
    "payment-service" = 3005
    "media-service" = 3006
    "analytics-service" = 3007
    "notification-service" = 3008
    "advertising-service" = 3010
    "workflow-engine" = 3011
}

$totalChecks = 0
$passedChecks = 0
$failedChecks = 0

Write-Host "Checking service configurations..."
Write-Host ""

foreach ($service in $services.Keys) {
    $port = $services[$service]
    Write-Host "---------------------------------------"
    Write-Host "Service: $service (Port: $port)"
    Write-Host "---------------------------------------"

    # Check if main.ts exists
    $mainPath = "$service/src/main.ts"
    if (Test-Path $mainPath) {
        Write-Host "✓ main.ts exists" -ForegroundColor Green
        $totalChecks++
        $passedChecks++

        # Read file content
        $content = Get-Content $mainPath -Raw

        # Check if port is configured correctly
        if ($content -match "\|\| $port") {
            Write-Host "✓ Port $port configured correctly" -ForegroundColor Green
            $totalChecks++
            $passedChecks++
        } else {
            Write-Host "✗ Port $port not found in configuration" -ForegroundColor Red
            $totalChecks++
            $failedChecks++
        }

        # Check if CORS is configured
        if ($content -match "enableCors") {
            Write-Host "✓ CORS configured" -ForegroundColor Green
            $totalChecks++
            $passedChecks++
        } else {
            Write-Host "✗ CORS not configured" -ForegroundColor Red
            $totalChecks++
            $failedChecks++
        }

        # Check if health endpoint exclusion exists
        if ($content -match "health") {
            Write-Host "✓ Health endpoint configuration found" -ForegroundColor Green
            $totalChecks++
            $passedChecks++
        } else {
            Write-Host "⚠ Health endpoint configuration not found" -ForegroundColor Yellow
            $totalChecks++
            $failedChecks++
        }

        # Check if Swagger is configured
        if ($content -match "SwaggerModule") {
            Write-Host "✓ Swagger documentation configured" -ForegroundColor Green
            $totalChecks++
            $passedChecks++
        } else {
            Write-Host "✗ Swagger documentation not configured" -ForegroundColor Red
            $totalChecks++
            $failedChecks++
        }

    } else {
        Write-Host "✗ main.ts does NOT exist" -ForegroundColor Red
        $totalChecks++
        $failedChecks++
    }

    # Check if health controller exists
    $healthPath = "$service/src/health/health.controller.ts"
    if (Test-Path $healthPath) {
        Write-Host "✓ Health controller exists" -ForegroundColor Green
        $totalChecks++
        $passedChecks++
    } else {
        Write-Host "⚠ Health controller does NOT exist" -ForegroundColor Yellow
        $totalChecks++
    }

    # Check if app.module.ts exists
    $appModulePath = "$service/src/app.module.ts"
    if (Test-Path $appModulePath) {
        Write-Host "✓ App module exists" -ForegroundColor Green
        $totalChecks++
        $passedChecks++
    } else {
        Write-Host "⚠ App module does NOT exist (needs to be created)" -ForegroundColor Yellow
        $totalChecks++
    }

    # Check if package.json exists
    $packagePath = "$service/package.json"
    if (Test-Path $packagePath) {
        Write-Host "✓ package.json exists" -ForegroundColor Green
        $totalChecks++
        $passedChecks++
    } else {
        Write-Host "⚠ package.json does NOT exist (needs to be created)" -ForegroundColor Yellow
        $totalChecks++
    }

    Write-Host ""
}

Write-Host "========================================"
Write-Host "Verification Summary"
Write-Host "========================================"
Write-Host "Total checks: $totalChecks"
Write-Host "Passed: $passedChecks" -ForegroundColor Green
Write-Host "Failed/Warning: $($totalChecks - $passedChecks)" -ForegroundColor Yellow
Write-Host ""

# Calculate success rate
$successRate = [math]::Round(($passedChecks * 100) / $totalChecks, 2)
Write-Host "Success rate: $successRate%"
Write-Host ""

if ($successRate -ge 80) {
    Write-Host "✓ Configuration is in good shape!" -ForegroundColor Green
    exit 0
} elseif ($successRate -ge 60) {
    Write-Host "⚠ Configuration needs some work." -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "✗ Configuration needs significant work." -ForegroundColor Red
    exit 2
}
