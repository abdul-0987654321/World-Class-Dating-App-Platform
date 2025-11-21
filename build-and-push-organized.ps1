# ============================================================================
# Docker Build and Push Script - Organized Repository Structure
# ============================================================================
# This script builds all 9 microservices and pushes them to ONE Docker Hub
# repository with organized tags
#
# Repository: citadelcloud1/world-class-dating-platform
# Tag Format: <service-name>-<version|environment|latest>
# ============================================================================

param(
    [string]$Environment = "latest",  # latest, dev, staging, prod
    [string]$Version = "",             # e.g., "v1.0.0" (leave empty for no version tag)
    [switch]$IncludeDateTag = $false,  # Add date-based tag (YYYY-MM-DD)
    [switch]$SkipBuild = $false,       # Skip building, only tag and push
    [switch]$DryRun = $false           # Show what would happen without executing
)

# Configuration
$ErrorActionPreference = "Stop"
$ProjectRoot = "C:\Users\Dell\OneDrive\Desktop\World-Class-Dating-App-Platform\World-Class-Dating-App-Platform"
$Repository = "citadelcloud1/world-class-dating-platform"
$Token = "dckr_pat_ouIaa9OjRdEf-s-lPeHDqkcufpI"
$DateTag = Get-Date -Format "yyyy-MM-dd"

# Define all services
$Services = @(
    @{Name = "api-gateway"; Port = 4000},
    @{Name = "user-service"; Port = 3001},
    @{Name = "messaging-service"; Port = 3003},
    @{Name = "matching-service"; Port = 3002},
    @{Name = "media-service"; Port = 3004},
    @{Name = "payment-service"; Port = 3005},
    @{Name = "notification-service"; Port = 3006},
    @{Name = "analytics-service"; Port = 3007},
    @{Name = "moderation-service"; Port = 3008}
)

# ============================================================================
# Helper Functions
# ============================================================================

function Write-Header {
    param([string]$Message)
    Write-Host "`n============================================================================" -ForegroundColor Cyan
    Write-Host " $Message" -ForegroundColor Cyan
    Write-Host "============================================================================`n" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "→ $Message" -ForegroundColor Yellow
}

function Write-Step {
    param([string]$Message)
    Write-Host "`n$Message" -ForegroundColor Magenta
}

# ============================================================================
# Validation
# ============================================================================

Write-Header "Docker Build & Push - Organized Repository Structure"

Write-Host "Configuration:" -ForegroundColor White
Write-Host "  Repository: $Repository" -ForegroundColor Gray
Write-Host "  Environment: $Environment" -ForegroundColor Gray
if ($Version) {
    Write-Host "  Version: $Version" -ForegroundColor Gray
}
if ($IncludeDateTag) {
    Write-Host "  Date Tag: $DateTag" -ForegroundColor Gray
}
Write-Host "  Dry Run: $DryRun" -ForegroundColor Gray
Write-Host ""

# Change to project directory
if (-not $DryRun) {
    Set-Location $ProjectRoot
    Write-Success "Changed to project directory: $ProjectRoot"
}

# ============================================================================
# Docker Login
# ============================================================================

Write-Step "Step 1: Docker Hub Authentication"

if (-not $DryRun) {
    try {
        $Token | docker login --username citadelcloud1 --password-stdin 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Successfully logged in to Docker Hub"
        } else {
            Write-Error "Failed to login to Docker Hub"
            exit 1
        }
    } catch {
        Write-Error "Error during Docker login: $_"
        exit 1
    }
} else {
    Write-Info "DRY RUN: Would login to Docker Hub as citadelcloud1"
}

# ============================================================================
# Build and Push All Services
# ============================================================================

$BuildResults = @()
$PushResults = @()

foreach ($Service in $Services) {
    $ServiceName = $Service.Name

    Write-Header "Processing: $ServiceName"

    # Define tags for this service
    $Tags = @()

    # Always include environment tag (latest, dev, staging, prod)
    $Tags += "$Repository`:$ServiceName-$Environment"

    # Add version tag if specified
    if ($Version) {
        $Tags += "$Repository`:$ServiceName-$Version"
    }

    # Add date tag if requested
    if ($IncludeDateTag) {
        $Tags += "$Repository`:$ServiceName-$DateTag"
    }

    Write-Info "Tags to be created:"
    foreach ($Tag in $Tags) {
        Write-Host "    - $Tag" -ForegroundColor Gray
    }

    # ========================================================================
    # Build Step
    # ========================================================================

    if (-not $SkipBuild) {
        Write-Step "Building $ServiceName..."

        $DockerfilePath = "backend\services\$ServiceName\Dockerfile"
        $PrimaryTag = $Tags[0]

        if (-not $DryRun) {
            Write-Info "Building with primary tag: $PrimaryTag"

            $BuildOutput = docker build -t $PrimaryTag -f $DockerfilePath . 2>&1

            if ($LASTEXITCODE -eq 0) {
                Write-Success "Successfully built $ServiceName"
                $BuildResults += [PSCustomObject]@{
                    Service = $ServiceName
                    Status = "Success"
                    Tag = $PrimaryTag
                }
            } else {
                Write-Error "Failed to build $ServiceName"
                Write-Host $BuildOutput -ForegroundColor Red
                $BuildResults += [PSCustomObject]@{
                    Service = $ServiceName
                    Status = "Failed"
                    Tag = $PrimaryTag
                    Error = $BuildOutput
                }
                continue
            }
        } else {
            Write-Info "DRY RUN: Would build with command:"
            Write-Host "    docker build -t $PrimaryTag -f $DockerfilePath ." -ForegroundColor Gray
        }

        # ====================================================================
        # Tag Additional Tags
        # ====================================================================

        if ($Tags.Count -gt 1) {
            Write-Step "Creating additional tags..."

            for ($i = 1; $i -lt $Tags.Count; $i++) {
                $AdditionalTag = $Tags[$i]

                if (-not $DryRun) {
                    Write-Info "Tagging as: $AdditionalTag"
                    docker tag $PrimaryTag $AdditionalTag

                    if ($LASTEXITCODE -eq 0) {
                        Write-Success "Tagged: $AdditionalTag"
                    } else {
                        Write-Error "Failed to tag: $AdditionalTag"
                    }
                } else {
                    Write-Info "DRY RUN: Would tag as: $AdditionalTag"
                }
            }
        }
    } else {
        Write-Info "Skipping build (SkipBuild flag set)"
    }

    # ========================================================================
    # Push Step
    # ========================================================================

    Write-Step "Pushing tags to Docker Hub..."

    foreach ($Tag in $Tags) {
        if (-not $DryRun) {
            Write-Info "Pushing: $Tag"

            docker push $Tag 2>&1 | Out-Null

            if ($LASTEXITCODE -eq 0) {
                Write-Success "Successfully pushed: $Tag"
                $PushResults += [PSCustomObject]@{
                    Service = $ServiceName
                    Status = "Success"
                    Tag = $Tag
                }
            } else {
                Write-Error "Failed to push: $Tag"
                $PushResults += [PSCustomObject]@{
                    Service = $ServiceName
                    Status = "Failed"
                    Tag = $Tag
                }
            }
        } else {
            Write-Info "DRY RUN: Would push: $Tag"
        }
    }
}

# ============================================================================
# Summary Report
# ============================================================================

Write-Header "Build and Push Summary"

if (-not $SkipBuild) {
    Write-Host "`nBuild Results:" -ForegroundColor White
    Write-Host "============================================" -ForegroundColor Gray

    $BuildResults | ForEach-Object {
        $Symbol = if ($_.Status -eq "Success") { "✓" } else { "✗" }
        $Color = if ($_.Status -eq "Success") { "Green" } else { "Red" }
        Write-Host "$Symbol $($_.Service): $($_.Status)" -ForegroundColor $Color
    }

    $SuccessfulBuilds = ($BuildResults | Where-Object { $_.Status -eq "Success" }).Count
    $TotalBuilds = $BuildResults.Count
    Write-Host "`nSuccessful Builds: $SuccessfulBuilds / $TotalBuilds" -ForegroundColor $(if ($SuccessfulBuilds -eq $TotalBuilds) { "Green" } else { "Yellow" })
}

Write-Host "`nPush Results:" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Gray

$PushResults | ForEach-Object {
    $Symbol = if ($_.Status -eq "Success") { "✓" } else { "✗" }
    $Color = if ($_.Status -eq "Success") { "Green" } else { "Red" }
    Write-Host "$Symbol $($_.Tag)" -ForegroundColor $Color
}

$SuccessfulPushes = ($PushResults | Where-Object { $_.Status -eq "Success" }).Count
$TotalPushes = $PushResults.Count
Write-Host "`nSuccessful Pushes: $SuccessfulPushes / $TotalPushes" -ForegroundColor $(if ($SuccessfulPushes -eq $TotalPushes) { "Green" } else { "Yellow" })

# ============================================================================
# Repository Information
# ============================================================================

Write-Host "`n"
Write-Header "Docker Hub Repository"

Write-Host "View your organized repository:" -ForegroundColor White
Write-Host "https://hub.docker.com/r/citadelcloud1/world-class-dating-platform/tags" -ForegroundColor Cyan

Write-Host "`nAll services are now in ONE repository with organized tags:" -ForegroundColor White
foreach ($Service in $Services) {
    Write-Host "  • $($Service.Name)-$Environment" -ForegroundColor Gray
}

if ($DryRun) {
    Write-Host "`n" -NoNewline
    Write-Host "DRY RUN COMPLETE" -ForegroundColor Yellow -BackgroundColor DarkGray
    Write-Host "Re-run without -DryRun to execute actual build and push" -ForegroundColor Yellow
}

Write-Host "`n"

# ============================================================================
# Usage Examples
# ============================================================================

<#
.SYNOPSIS
    Build and push all microservices to Docker Hub with organized tags

.DESCRIPTION
    This script builds all 9 microservices and pushes them to a single
    Docker Hub repository with a clean, organized tagging structure.

.PARAMETER Environment
    The environment tag to use: latest (default), dev, staging, or prod

.PARAMETER Version
    Optional version tag (e.g., "v1.0.0")

.PARAMETER IncludeDateTag
    Include a date-based tag (YYYY-MM-DD format)

.PARAMETER SkipBuild
    Skip building images, only tag and push existing images

.PARAMETER DryRun
    Show what would happen without actually executing

.EXAMPLE
    .\build-and-push-organized.ps1
    Build and push all services with "-latest" tags

.EXAMPLE
    .\build-and-push-organized.ps1 -Environment prod -Version "v1.0.0"
    Build and push with both "-prod" and "-v1.0.0" tags

.EXAMPLE
    .\build-and-push-organized.ps1 -Environment prod -Version "v1.0.0" -IncludeDateTag
    Build and push with "-prod", "-v1.0.0", and "-2025-01-19" tags

.EXAMPLE
    .\build-and-push-organized.ps1 -DryRun
    Preview what would happen without executing

.EXAMPLE
    .\build-and-push-organized.ps1 -SkipBuild -Environment staging
    Re-tag existing images as "-staging" and push

#>
