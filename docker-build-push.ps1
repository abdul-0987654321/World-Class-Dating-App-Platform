# Docker Build and Push Script for World-Class Dating Platform (PowerShell)
# Builds all services and pushes to Docker Hub

param(
    [switch]$SkipLogin = $false
)

$ErrorActionPreference = "Stop"

# Configuration
$DOCKER_USERNAME = "citadelcloud1"
$DOCKER_REPO = "world-class-dating-platform"
$DATE_TAG = Get-Date -Format "yyyyMMdd"

Write-Host "================================" -ForegroundColor Blue
Write-Host "Docker Build & Push Script" -ForegroundColor Blue
Write-Host "================================" -ForegroundColor Blue
Write-Host ""

# Check if Docker is running
try {
    docker info | Out-Null
} catch {
    Write-Host "Error: Docker is not running" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and try again"
    exit 1
}

# Login to Docker Hub (unless skipped)
if (-not $SkipLogin) {
    Write-Host "Logging in to Docker Hub..." -ForegroundColor Blue
    docker login
}

# List of services to build
$SERVICES = @(
    @{Name="user-service"; Port=3001},
    @{Name="matching-service"; Port=3002},
    @{Name="messaging-service"; Port=3003},
    @{Name="media-service"; Port=3004},
    @{Name="moderation-service"; Port=3005},
    @{Name="notification-service"; Port=3008},
    @{Name="analytics-service"; Port=3007},
    @{Name="payment-service"; Port=3009},
    @{Name="api-gateway"; Port=4000}
)

$SUCCESS_COUNT = 0
$FAILED_SERVICES = @()

# Build and push each service
foreach ($service in $SERVICES) {
    $serviceName = $service.Name
    $servicePort = $service.Port

    Write-Host ""
    Write-Host "================================" -ForegroundColor Blue
    Write-Host "Building $serviceName" -ForegroundColor Blue
    Write-Host "================================" -ForegroundColor Blue

    $SERVICE_PATH = "backend\services\$serviceName"

    if (-not (Test-Path $SERVICE_PATH)) {
        Write-Host "Warning: $SERVICE_PATH not found, skipping..." -ForegroundColor Yellow
        continue
    }

    # Build image
    Write-Host "Building Docker image..." -ForegroundColor Green
    $latestTag = "${DOCKER_USERNAME}/${DOCKER_REPO}:${serviceName}-latest"
    $dateTag = "${DOCKER_USERNAME}/${DOCKER_REPO}:${serviceName}-${DATE_TAG}"

    try {
        docker build `
            -t $latestTag `
            -t $dateTag `
            $SERVICE_PATH

        Write-Host "✓ Build successful" -ForegroundColor Green

        # Push images
        Write-Host "Pushing images to Docker Hub..." -ForegroundColor Green
        docker push $latestTag
        docker push $dateTag

        Write-Host "✓ Push successful" -ForegroundColor Green
        $SUCCESS_COUNT++

    } catch {
        Write-Host "✗ Build failed for $serviceName" -ForegroundColor Red
        $FAILED_SERVICES += $serviceName
    }
}

# Build frontend
Write-Host ""
Write-Host "================================" -ForegroundColor Blue
Write-Host "Building Frontend (Web)" -ForegroundColor Blue
Write-Host "================================" -ForegroundColor Blue

if (Test-Path "frontend\web") {
    try {
        $latestTag = "${DOCKER_USERNAME}/${DOCKER_REPO}:web-frontend-latest"
        $dateTag = "${DOCKER_USERNAME}/${DOCKER_REPO}:web-frontend-${DATE_TAG}"

        docker build `
            -t $latestTag `
            -t $dateTag `
            frontend\web

        Write-Host "✓ Build successful" -ForegroundColor Green

        docker push $latestTag
        docker push $dateTag

        Write-Host "✓ Push successful" -ForegroundColor Green
        $SUCCESS_COUNT++

    } catch {
        Write-Host "✗ Build failed for web-frontend" -ForegroundColor Red
        $FAILED_SERVICES += "web-frontend"
    }
}

# Summary
Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "Build Summary" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host "Successful builds: $SUCCESS_COUNT" -ForegroundColor Green

if ($FAILED_SERVICES.Count -gt 0) {
    Write-Host "Failed builds: $($FAILED_SERVICES.Count)" -ForegroundColor Red
    Write-Host "Failed services:" -ForegroundColor Red
    foreach ($failed in $FAILED_SERVICES) {
        Write-Host "  - $failed" -ForegroundColor Red
    }
} else {
    Write-Host "All services built and pushed successfully!" -ForegroundColor Green
}

Write-Host ""
Write-Host "Docker Hub repository:" -ForegroundColor Blue
Write-Host "https://hub.docker.com/repository/docker/${DOCKER_USERNAME}/${DOCKER_REPO}/general" -ForegroundColor Cyan
Write-Host ""
