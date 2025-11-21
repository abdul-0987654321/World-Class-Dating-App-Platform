# ============================================
# ConnectSphere - Complete Docker Build & Push Script
# Builds and pushes all services to Docker Hub
# ============================================

$ErrorActionPreference = "Stop"

# Configuration
$DOCKER_USERNAME = "citadelcloud1"
$DOCKER_REPO = "citadelcloud1/world-class-dating-platform"
$VERSION = "1.0.0"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "ConnectSphere Docker Build & Push" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Function to build and tag image
function Build-And-Tag {
    param(
        [string]$ServiceName,
        [string]$Context,
        [string]$Dockerfile
    )

    Write-Host "Building $ServiceName..." -ForegroundColor Yellow

    $tags = @(
        "${DOCKER_REPO}:${ServiceName}-latest",
        "${DOCKER_REPO}:${ServiceName}-v${VERSION}",
        "${DOCKER_REPO}:${ServiceName}-$(Get-Date -Format 'yyyyMMdd')"
    )

    $tagArgs = $tags | ForEach-Object { "-t", $_ }

    try {
        $buildCmd = "docker build $tagArgs -f `"$Dockerfile`" `"$Context`""
        Write-Host "Command: $buildCmd" -ForegroundColor Gray

        & docker build @tagArgs -f "$Dockerfile" "$Context"

        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ $ServiceName built successfully" -ForegroundColor Green
            return $true
        } else {
            Write-Host "✗ Failed to build $ServiceName" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "✗ Error building $ServiceName : $_" -ForegroundColor Red
        return $false
    }
}

# Function to push image
function Push-Image {
    param([string]$ServiceName)

    Write-Host "Pushing $ServiceName images..." -ForegroundColor Yellow

    $tags = @(
        "${DOCKER_REPO}:${ServiceName}-latest",
        "${DOCKER_REPO}:${ServiceName}-v${VERSION}",
        "${DOCKER_REPO}:${ServiceName}-$(Get-Date -Format 'yyyyMMdd')"
    )

    $success = $true
    foreach ($tag in $tags) {
        try {
            Write-Host "  Pushing $tag..." -ForegroundColor Gray
            & docker push "$tag"
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✓ Pushed $tag" -ForegroundColor Green
            } else {
                Write-Host "  ✗ Failed to push $tag" -ForegroundColor Red
                $success = $false
            }
        } catch {
            Write-Host "  ✗ Error pushing $tag : $_" -ForegroundColor Red
            $success = $false
        }
    }

    return $success
}

# Change to project directory
$ProjectRoot = $PSScriptRoot
Set-Location $ProjectRoot

Write-Host "Project root: $ProjectRoot" -ForegroundColor Cyan
Write-Host ""

# Check Docker is running
Write-Host "Checking Docker..." -ForegroundColor Yellow
try {
    $null = docker ps 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker is not available: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Login to Docker Hub
Write-Host "Logging into Docker Hub..." -ForegroundColor Yellow
Write-Host "Note: Manual login may be required if automated login fails" -ForegroundColor Gray

# Create auth file manually to bypass API issues
$dockerConfig = @{
    auths = @{
        "https://index.docker.io/v1/" = @{
            auth = "Y2l0YWRlbGNsb3VkMTpkY2tyX3BhdF9sMlFWX1JURTNTY05nQ2lTMWhVYlM5aGppQTA="
        }
    }
}

$dockerConfigPath = "$env:USERPROFILE\.docker\config.json"
$dockerConfigPath | Split-Path | New-Item -ItemType Directory -Force | Out-Null
$dockerConfig | ConvertTo-Json -Depth 10 | Set-Content $dockerConfigPath

Write-Host "✓ Docker credentials configured" -ForegroundColor Green
Write-Host ""

# Build tracking
$buildResults = @{}

# ============================================
# BUILD BACKEND
# ============================================
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "1/3 Building Backend Service" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

$backendContext = Join-Path $ProjectRoot "backend-unified"
$backendDockerfile = Join-Path $backendContext "Dockerfile"

if (Test-Path $backendDockerfile) {
    $buildResults["backend"] = Build-And-Tag -ServiceName "backend" -Context $backendContext -Dockerfile $backendDockerfile
} else {
    Write-Host "✗ Backend Dockerfile not found at $backendDockerfile" -ForegroundColor Red
    $buildResults["backend"] = $false
}

Write-Host ""

# ============================================
# BUILD FRONTEND
# ============================================
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "2/3 Building Frontend Service" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

$frontendContext = Join-Path $ProjectRoot "frontend\web"
$frontendDockerfile = Join-Path $ProjectRoot "infrastructure\docker\frontend\Dockerfile"

if (Test-Path $frontendDockerfile) {
    $buildResults["frontend"] = Build-And-Tag -ServiceName "frontend" -Context $frontendContext -Dockerfile $frontendDockerfile
} else {
    Write-Host "✗ Frontend Dockerfile not found at $frontendDockerfile" -ForegroundColor Red
    $buildResults["frontend"] = $false
}

Write-Host ""

# ============================================
# BUILD NGINX GATEWAY
# ============================================
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "3/3 Building NGINX Gateway" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

$nginxContext = Join-Path $ProjectRoot "infrastructure\docker\nginx"
$nginxDockerfile = Join-Path $nginxContext "Dockerfile"

if (Test-Path $nginxDockerfile) {
    $buildResults["nginx"] = Build-And-Tag -ServiceName "nginx" -Context $nginxContext -Dockerfile $nginxDockerfile
} else {
    Write-Host "✗ NGINX Dockerfile not found at $nginxDockerfile" -ForegroundColor Red
    $buildResults["nginx"] = $false
}

Write-Host ""

# ============================================
# BUILD SUMMARY
# ============================================
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Build Summary" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

$successCount = ($buildResults.Values | Where-Object { $_ -eq $true }).Count
$totalCount = $buildResults.Count

foreach ($service in $buildResults.Keys) {
    $status = if ($buildResults[$service]) { "✓ SUCCESS" } else { "✗ FAILED" }
    $color = if ($buildResults[$service]) { "Green" } else { "Red" }
    Write-Host "$service : $status" -ForegroundColor $color
}

Write-Host ""
Write-Host "Built: $successCount/$totalCount services" -ForegroundColor $(if ($successCount -eq $totalCount) { "Green" } else { "Yellow" })
Write-Host ""

if ($successCount -eq 0) {
    Write-Host "✗ No images were built successfully. Aborting push." -ForegroundColor Red
    exit 1
}

# ============================================
# PUSH TO DOCKER HUB
# ============================================
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Pushing Images to Docker Hub" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$pushResults = @{}

foreach ($service in $buildResults.Keys) {
    if ($buildResults[$service]) {
        $pushResults[$service] = Push-Image -ServiceName $service
        Write-Host ""
    } else {
        Write-Host "Skipping $service (build failed)" -ForegroundColor Yellow
        Write-Host ""
    }
}

# ============================================
# PUSH SUMMARY
# ============================================
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Push Summary" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

$pushSuccessCount = ($pushResults.Values | Where-Object { $_ -eq $true }).Count
$pushTotalCount = $pushResults.Count

foreach ($service in $pushResults.Keys) {
    $status = if ($pushResults[$service]) { "✓ PUSHED" } else { "✗ FAILED" }
    $color = if ($pushResults[$service]) { "Green" } else { "Red" }
    Write-Host "$service : $status" -ForegroundColor $color
}

Write-Host ""
Write-Host "Pushed: $pushSuccessCount/$pushTotalCount images" -ForegroundColor $(if ($pushSuccessCount -eq $pushTotalCount) { "Green" } else { "Yellow" })
Write-Host ""

# ============================================
# FINAL STATUS
# ============================================
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Deployment Complete" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Docker Hub Repository: https://hub.docker.com/r/$DOCKER_REPO" -ForegroundColor Cyan
Write-Host ""
Write-Host "Available Tags:" -ForegroundColor Yellow
Write-Host "  - backend-latest, backend-v$VERSION" -ForegroundColor Gray
Write-Host "  - frontend-latest, frontend-v$VERSION" -ForegroundColor Gray
Write-Host "  - nginx-latest, nginx-v$VERSION" -ForegroundColor Gray
Write-Host ""

if ($pushSuccessCount -eq $pushTotalCount -and $pushTotalCount -gt 0) {
    Write-Host "✓ All images successfully pushed to Docker Hub!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "⚠ Some images failed to push. Check logs above." -ForegroundColor Yellow
    exit 1
}
