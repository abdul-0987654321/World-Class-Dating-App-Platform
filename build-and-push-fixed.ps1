# Fixed Docker Build and Push Script
# Resolves API compatibility issues

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Docker Build & Push - Fixed Version" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Set Docker API version to compatible version
$env:DOCKER_API_VERSION = "1.43"
Write-Host "Set DOCKER_API_VERSION to 1.43" -ForegroundColor Green

# Docker Hub credentials
$DOCKER_USERNAME = "citadelcloud1"
$DOCKER_TOKEN = "dckr_pat_ouIaa9OjRdEf-s-lPeHDqkcufpI"
$DOCKER_REPO = "citadelcloud1/world-class-dating-platform"

# Date tag
$DATE_TAG = Get-Date -Format "yyyyMMdd"

Write-Host ""
Write-Host "Logging into Docker Hub..." -ForegroundColor Yellow

# Login to Docker Hub
$DOCKER_TOKEN | docker login --username $DOCKER_USERNAME --password-stdin

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to login to Docker Hub" -ForegroundColor Red
    Write-Host "Please check your credentials or restart Docker Desktop" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Successfully logged into Docker Hub" -ForegroundColor Green
Write-Host ""

# Services to build
$services = @(
    @{Name="analytics-service"; Path="backend/services/analytics-service"},
    @{Name="user-service"; Path="backend/services/user-service"},
    @{Name="matching-service"; Path="backend/services/matching-service"},
    @{Name="messaging-service"; Path="backend/services/messaging-service"},
    @{Name="media-service"; Path="backend/services/media-service"},
    @{Name="moderation-service"; Path="backend/services/moderation-service"},
    @{Name="notification-service"; Path="backend/services/notification-service"},
    @{Name="payment-service"; Path="backend/services/payment-service"},
    @{Name="api-gateway"; Path="backend/services/api-gateway"},
    @{Name="web-frontend"; Path="frontend/web"}
)

$successCount = 0
$failureCount = 0
$failedServices = @()

foreach ($service in $services) {
    $serviceName = $service.Name
    $servicePath = $service.Path

    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host "Building: $serviceName" -ForegroundColor Cyan
    Write-Host "=====================================" -ForegroundColor Cyan

    # Check if path exists
    if (-Not (Test-Path $servicePath)) {
        Write-Host "ERROR: Path not found: $servicePath" -ForegroundColor Red
        $failureCount++
        $failedServices += $serviceName
        continue
    }

    # Build image with latest tag
    $latestTag = "${DOCKER_REPO}:${serviceName}-latest"
    $dateTag = "${DOCKER_REPO}:${serviceName}-${DATE_TAG}"

    Write-Host "Building $latestTag..." -ForegroundColor Yellow

    docker build -t $latestTag -t $dateTag $servicePath

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to build $serviceName" -ForegroundColor Red
        $failureCount++
        $failedServices += $serviceName
        continue
    }

    Write-Host "Successfully built $serviceName" -ForegroundColor Green
    Write-Host ""

    # Push latest tag
    Write-Host "Pushing $latestTag..." -ForegroundColor Yellow
    docker push $latestTag

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to push $latestTag" -ForegroundColor Red
        $failureCount++
        $failedServices += $serviceName
        continue
    }

    Write-Host "Successfully pushed $latestTag" -ForegroundColor Green
    Write-Host ""

    # Push date tag
    Write-Host "Pushing $dateTag..." -ForegroundColor Yellow
    docker push $dateTag

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to push $dateTag" -ForegroundColor Red
        $failureCount++
        $failedServices += $serviceName
        continue
    }

    Write-Host "Successfully pushed $dateTag" -ForegroundColor Green
    Write-Host ""

    $successCount++
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Build Summary" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Total services: $($services.Count)" -ForegroundColor White
Write-Host "Successful: $successCount" -ForegroundColor Green
Write-Host "Failed: $failureCount" -ForegroundColor Red

if ($failureCount -gt 0) {
    Write-Host ""
    Write-Host "Failed services:" -ForegroundColor Red
    foreach ($failed in $failedServices) {
        Write-Host "  - $failed" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Docker Hub Repository:" -ForegroundColor Cyan
Write-Host "https://hub.docker.com/repository/docker/citadelcloud1/world-class-dating-platform/tags" -ForegroundColor White
Write-Host ""

Read-Host "Press Enter to exit"
