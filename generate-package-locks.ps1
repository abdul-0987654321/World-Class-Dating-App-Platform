# PowerShell script to generate package-lock.json files for all backend services
Write-Host "Generating package-lock.json files for backend services..." -ForegroundColor Cyan

$services = @(
    "advertising-service",
    "analytics-service",
    "api-gateway",
    "auth-service",
    "matching-service",
    "media-service",
    "messaging-service",
    "moderation-service",
    "notification-service",
    "payment-service",
    "user-service"
)

$successCount = 0
$failCount = 0
$results = @()

foreach ($service in $services) {
    $servicePath = "backend\services\$service"
    Write-Host "`nProcessing: $service" -ForegroundColor Yellow

    if (Test-Path $servicePath) {
        Push-Location $servicePath

        try {
            # Run npm install
            npm install 2>&1 | Out-Null

            # Check if package-lock.json was created
            if (Test-Path "package-lock.json") {
                Write-Host "  SUCCESS: Generated package-lock.json for $service" -ForegroundColor Green
                $results += "  [OK] $service"
                $successCount++
            } else {
                Write-Host "  ERROR: package-lock.json not created for $service" -ForegroundColor Red
                $results += "  [FAIL] $service - package-lock.json not created"
                $failCount++
            }
        }
        catch {
            Write-Host "  ERROR: Failed to run npm install for $service" -ForegroundColor Red
            Write-Host "  Error: $_" -ForegroundColor Red
            $results += "  [FAIL] $service - npm install failed: $_"
            $failCount++
        }
        finally {
            Pop-Location
        }
    } else {
        Write-Host "  WARNING: Service directory not found: $servicePath" -ForegroundColor Red
        $results += "  [SKIP] $service - directory not found"
        $failCount++
    }
}

Write-Host "`n" + ("="*70) -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host ("="*70) -ForegroundColor Cyan
Write-Host "Total services processed: $($services.Count)" -ForegroundColor White
Write-Host "Successful: $successCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor Red
Write-Host "`nDetails:" -ForegroundColor White
$results | ForEach-Object { Write-Host $_ }
Write-Host ("="*70) -ForegroundColor Cyan

if ($failCount -eq 0) {
    Write-Host "`nAll package-lock.json files generated successfully!" -ForegroundColor Green
} else {
    Write-Host "`nSome package-lock.json files failed to generate. Please review the errors above." -ForegroundColor Red
}
