# ============================================================================
# EXECUTE BUILD AND PUSH - Ready to Run Script
# ============================================================================
# This script will build and push all 9 services to Docker Hub
# with organized tags in ONE repository
#
# Prerequisites:
# 1. Docker Desktop must be running
# 2. Run this from PowerShell as Administrator
# 3. Be in the project root directory
# ============================================================================

$ErrorActionPreference = "Stop"

Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host " Docker Build and Push - Organized Repository" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$ProjectRoot = "C:\Users\Dell\OneDrive\Desktop\World-Class-Dating-App-Platform\World-Class-Dating-App-Platform"
$Repository = "citadelcloud1/world-class-dating-platform"
$Token = "dckr_pat_ouIaa9OjRdEf-s-lPeHDqkcufpI"

# Services to build
$Services = @(
    @{Name="api-gateway"; Port=4000},
    @{Name="user-service"; Port=3001},
    @{Name="messaging-service"; Port=3003},
    @{Name="matching-service"; Port=3002},
    @{Name="media-service"; Port=3004},
    @{Name="payment-service"; Port=3005},
    @{Name="notification-service"; Port=3008},
    @{Name="analytics-service"; Port=3007},
    @{Name="moderation-service"; Port=3009}
)

# ============================================================================
# Step 1: Verify Docker is Running
# ============================================================================

Write-Host "Step 1: Verifying Docker is running..." -ForegroundColor Yellow
try {
    $dockerVersion = docker version 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Docker is not running!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please:" -ForegroundColor Yellow
        Write-Host "1. Open Docker Desktop from Start Menu" -ForegroundColor Yellow
        Write-Host "2. Wait for 'Docker Desktop is running' message" -ForegroundColor Yellow
        Write-Host "3. Run this script again" -ForegroundColor Yellow
        Write-Host ""
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "✓ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Cannot connect to Docker daemon" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# ============================================================================
# Step 2: Navigate to Project Directory
# ============================================================================

Write-Host ""
Write-Host "Step 2: Navigating to project directory..." -ForegroundColor Yellow
if (Test-Path $ProjectRoot) {
    Set-Location $ProjectRoot
    Write-Host "✓ Changed to: $ProjectRoot" -ForegroundColor Green
} else {
    Write-Host "ERROR: Project directory not found: $ProjectRoot" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# ============================================================================
# Step 3: Login to Docker Hub
# ============================================================================

Write-Host ""
Write-Host "Step 3: Logging into Docker Hub..." -ForegroundColor Yellow
try {
    $Token | docker login --username citadelcloud1 --password-stdin 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Successfully logged into Docker Hub" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Failed to login to Docker Hub" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
} catch {
    Write-Host "ERROR: Docker Hub login failed" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# ============================================================================
# Step 4: Build and Push All Services
# ============================================================================

Write-Host ""
Write-Host "Step 4: Building and pushing all services..." -ForegroundColor Yellow
Write-Host "This will take 1-2 hours. Progress will be shown for each service." -ForegroundColor Cyan
Write-Host ""

$SuccessCount = 0
$FailCount = 0
$Results = @()

foreach ($Service in $Services) {
    $ServiceName = $Service.Name
    $ImageTag = "${Repository}:${ServiceName}-latest"
    $DockerfilePath = "backend\services\$ServiceName\Dockerfile"

    Write-Host "============================================================================" -ForegroundColor DarkCyan
    Write-Host " Building: $ServiceName" -ForegroundColor White
    Write-Host "============================================================================" -ForegroundColor DarkCyan

    # Check if Dockerfile exists
    if (-not (Test-Path $DockerfilePath)) {
        Write-Host "✗ Dockerfile not found: $DockerfilePath" -ForegroundColor Red
        $FailCount++
        $Results += [PSCustomObject]@{
            Service = $ServiceName
            Status = "Failed"
            Reason = "Dockerfile not found"
        }
        continue
    }

    # Build
    Write-Host "Building $ServiceName..." -ForegroundColor Cyan
    $BuildStart = Get-Date

    docker build -t $ImageTag -f $DockerfilePath . 2>&1 | Tee-Object -Variable BuildOutput | Out-Host

    if ($LASTEXITCODE -eq 0) {
        $BuildTime = (Get-Date) - $BuildStart
        Write-Host "✓ Build successful ($([math]::Round($BuildTime.TotalMinutes, 1)) minutes)" -ForegroundColor Green

        # Push
        Write-Host "Pushing $ServiceName to Docker Hub..." -ForegroundColor Cyan
        $PushStart = Get-Date

        docker push $ImageTag 2>&1 | Tee-Object -Variable PushOutput | Out-Host

        if ($LASTEXITCODE -eq 0) {
            $PushTime = (Get-Date) - $PushStart
            Write-Host "✓ Push successful ($([math]::Round($PushTime.TotalMinutes, 1)) minutes)" -ForegroundColor Green
            $SuccessCount++
            $Results += [PSCustomObject]@{
                Service = $ServiceName
                Status = "Success"
                Reason = "Built and pushed successfully"
            }
        } else {
            Write-Host "✗ Push failed" -ForegroundColor Red
            $FailCount++
            $Results += [PSCustomObject]@{
                Service = $ServiceName
                Status = "Failed"
                Reason = "Push failed"
            }
        }
    } else {
        Write-Host "✗ Build failed" -ForegroundColor Red
        $FailCount++
        $Results += [PSCustomObject]@{
            Service = $ServiceName
            Status = "Failed"
            Reason = "Build failed"
        }
    }

    Write-Host ""
}

# ============================================================================
# Step 5: Summary
# ============================================================================

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host " BUILD AND PUSH COMPLETE" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Results:" -ForegroundColor White
$Results | Format-Table -AutoSize

Write-Host ""
Write-Host "Summary:" -ForegroundColor White
Write-Host "  Successful: $SuccessCount" -ForegroundColor Green
Write-Host "  Failed:     $FailCount" -ForegroundColor $(if ($FailCount -eq 0) { "Green" } else { "Red" })
Write-Host "  Total:      $($Services.Count)" -ForegroundColor White
Write-Host ""

if ($SuccessCount -eq $Services.Count) {
    Write-Host "✓ ALL SERVICES BUILT AND PUSHED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host ""
    Write-Host "View your organized repository:" -ForegroundColor White
    Write-Host "https://hub.docker.com/r/citadelcloud1/world-class-dating-platform/tags" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Verify all tags are visible in Docker Hub" -ForegroundColor White
    Write-Host "2. Delete old repositories (see DOCKER_HUB_CLEANUP_INSTRUCTIONS.md)" -ForegroundColor White
} else {
    Write-Host "⚠ Some services failed. Please check the errors above." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To retry failed services, run this script again." -ForegroundColor White
}

Write-Host ""
Write-Host "Press Enter to exit..."
Read-Host
