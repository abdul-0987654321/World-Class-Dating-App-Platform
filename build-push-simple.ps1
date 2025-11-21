# Simple Build and Push Script
# Run this after ensuring Docker Desktop is running

$ErrorActionPreference = "Continue"

Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host " Docker Build and Push - Organized Repository" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan

$ProjectRoot = "C:\Users\Dell\OneDrive\Desktop\World-Class-Dating-App-Platform\World-Class-Dating-App-Platform"
$Repo = "citadelcloud1/world-class-dating-platform"
$Token = "dckr_pat_ouIaa9OjRdEf-s-lPeHDqkcufpI"

# Check Docker
Write-Host "`nChecking Docker..." -ForegroundColor Yellow
docker ps 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker is not running!" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and try again." -ForegroundColor Yellow
    exit 1
}
Write-Host "Docker is running" -ForegroundColor Green

# Navigate to project
Write-Host "`nNavigating to project..." -ForegroundColor Yellow
Set-Location $ProjectRoot
Write-Host "Location: $ProjectRoot" -ForegroundColor Green

# Login to Docker Hub
Write-Host "`nLogging into Docker Hub..." -ForegroundColor Yellow
$Token | docker login --username citadelcloud1 --password-stdin
if ($LASTEXITCODE -eq 0) {
    Write-Host "Login successful" -ForegroundColor Green
} else {
    Write-Host "Login failed" -ForegroundColor Red
    exit 1
}

# Services
$Services = @(
    "api-gateway",
    "user-service",
    "messaging-service",
    "matching-service",
    "media-service",
    "payment-service",
    "notification-service",
    "analytics-service",
    "moderation-service"
)

Write-Host "`n============================================================================" -ForegroundColor Cyan
Write-Host " Building and Pushing Services (This will take 1-2 hours)" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan

$Success = 0
$Failed = 0

foreach ($Service in $Services) {
    Write-Host "`n--- Building: $Service ---" -ForegroundColor White

    $ImageTag = "${Repo}:${Service}-latest"
    $Dockerfile = "backend\services\$Service\Dockerfile"

    # Build
    Write-Host "Building..." -ForegroundColor Cyan
    docker build -t $ImageTag -f $Dockerfile .

    if ($LASTEXITCODE -eq 0) {
        Write-Host "Build successful" -ForegroundColor Green

        # Push
        Write-Host "Pushing..." -ForegroundColor Cyan
        docker push $ImageTag

        if ($LASTEXITCODE -eq 0) {
            Write-Host "Push successful" -ForegroundColor Green
            $Success++
        } else {
            Write-Host "Push failed" -ForegroundColor Red
            $Failed++
        }
    } else {
        Write-Host "Build failed" -ForegroundColor Red
        $Failed++
    }
}

Write-Host "`n============================================================================" -ForegroundColor Cyan
Write-Host " SUMMARY" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "Successful: $Success" -ForegroundColor Green
Write-Host "Failed: $Failed" -ForegroundColor $(if ($Failed -eq 0) { "Green" } else { "Red" })

if ($Success -eq $Services.Count) {
    Write-Host "`nALL SERVICES COMPLETED!" -ForegroundColor Green
    Write-Host "View at: https://hub.docker.com/r/citadelcloud1/world-class-dating-platform/tags" -ForegroundColor Cyan
} else {
    Write-Host "`nSome services failed. Review errors above." -ForegroundColor Yellow
}
