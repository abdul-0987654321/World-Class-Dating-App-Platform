# =============================================================================
# Flamoral Dating Platform - Build and Push to Azure Container Registry
# =============================================================================
# This script builds and pushes all Docker images to Azure Container Registry
# Usage: .\build-and-push-to-acr.ps1 [options]
# =============================================================================

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('dev', 'staging', 'prod')]
    [string]$Environment = 'dev',

    [Parameter(Mandatory=$false)]
    [string]$Tag = 'latest',

    [Parameter(Mandatory=$false)]
    [string]$Version = '1.0.0',

    [Parameter(Mandatory=$false)]
    [switch]$NoPush,

    [Parameter(Mandatory=$false)]
    [switch]$NoCache,

    [Parameter(Mandatory=$false)]
    [switch]$DryRun,

    [Parameter(Mandatory=$false)]
    [switch]$Help
)

# Show help
if ($Help) {
    Write-Host "Usage: .\build-and-push-to-acr.ps1 [OPTIONS]" -ForegroundColor White
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Yellow
    Write-Host "  -Environment <env>   Target environment: dev, staging, prod (default: dev)" -ForegroundColor White
    Write-Host "  -Tag <tag>           Docker image tag (default: latest)" -ForegroundColor White
    Write-Host "  -Version <version>   Application version (default: 1.0.0)" -ForegroundColor White
    Write-Host "  -NoPush              Build only, don't push to ACR" -ForegroundColor White
    Write-Host "  -NoCache             Build without cache" -ForegroundColor White
    Write-Host "  -DryRun              Show what would be done without executing" -ForegroundColor White
    Write-Host "  -Help                Show this help message" -ForegroundColor White
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  .\build-and-push-to-acr.ps1 -Environment prod -Tag v1.2.3" -ForegroundColor Cyan
    Write-Host "  .\build-and-push-to-acr.ps1 -Environment staging -NoCache" -ForegroundColor Cyan
    Write-Host "  .\build-and-push-to-acr.ps1 -DryRun" -ForegroundColor Cyan
    exit 0
}

# ACR configurations for different environments
$ACRRegistries = @{
    'dev' = 'flamoraldevacr'
    'staging' = 'flamoralstagingacr'
    'prod' = 'flamoralprodacr'
}

# Set variables
$ACRName = $ACRRegistries[$Environment]
$ACRUrl = "$ACRName.azurecr.io"
$BuildDate = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$VCSRef = try { git rev-parse --short HEAD 2>$null } catch { "unknown" }
$Push = -not $NoPush

# Get project root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$BackendDir = Join-Path $ProjectRoot "backend"
$ServicesDir = Join-Path $BackendDir "services"

# Print banner
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Blue
Write-Host "║  Flamoral Dating Platform - Build & Push to ACR                 ║" -ForegroundColor Blue
Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Blue
Write-Host ""
Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Environment:   " -NoNewline -ForegroundColor White
Write-Host "$Environment" -ForegroundColor Green
Write-Host "  ACR Registry:  " -NoNewline -ForegroundColor White
Write-Host "$ACRUrl" -ForegroundColor Green
Write-Host "  Tag:           " -NoNewline -ForegroundColor White
Write-Host "$Tag" -ForegroundColor Green
Write-Host "  Version:       " -NoNewline -ForegroundColor White
Write-Host "$Version" -ForegroundColor Green
Write-Host "  Build Date:    " -NoNewline -ForegroundColor White
Write-Host "$BuildDate" -ForegroundColor Green
Write-Host "  VCS Ref:       " -NoNewline -ForegroundColor White
Write-Host "$VCSRef" -ForegroundColor Green
Write-Host "  Push:          " -NoNewline -ForegroundColor White
Write-Host "$Push" -ForegroundColor Green
Write-Host "  Cache:         " -NoNewline -ForegroundColor White
Write-Host "$(-not $NoCache)" -ForegroundColor Green
Write-Host "  Dry Run:       " -NoNewline -ForegroundColor White
Write-Host "$DryRun" -ForegroundColor Green
Write-Host ""

# Node.js Backend Services
$NodeServices = @(
    "api-gateway",
    "auth-service",
    "user-service",
    "matching-service",
    "messaging-service",
    "media-service",
    "payment-service",
    "notification-service",
    "analytics-service",
    "moderation-service",
    "realtime-service",
    "admin-service",
    "automation-service",
    "advertising-service",
    "workflow-engine"
)

# Python AI Services
$AIServices = @(
    "ai-services/recommendation-service",
    "ai-services/photo-analysis",
    "ai-services/nlp-service",
    "ai-services/fraud-detection",
    "ai-services/dating-coach-service",
    "ai-services/content-generator"
)

# Build statistics
$TotalServices = 0
$SuccessfulBuilds = 0
$FailedBuilds = 0
$FailedServiceNames = @()

# Function to execute command (with dry-run support)
function Invoke-Command-Safe {
    param([string]$Command)

    if ($DryRun) {
        Write-Host "[DRY-RUN] $Command" -ForegroundColor Cyan
        return $true
    } else {
        Invoke-Expression $Command
        return $LASTEXITCODE -eq 0
    }
}

# Function to build a service
function Build-Service {
    param(
        [string]$ServicePath
    )

    $ServiceName = Split-Path -Leaf $ServicePath
    $FullPath = Join-Path $ServicesDir $ServicePath

    $script:TotalServices++

    # Check if service directory exists
    if (-not (Test-Path $FullPath)) {
        Write-Host "✗ Service directory not found: $FullPath" -ForegroundColor Red
        $script:FailedBuilds++
        $script:FailedServiceNames += "$ServiceName (directory not found)"
        return $false
    }

    # Check if Dockerfile exists
    $DockerfilePath = Join-Path $FullPath "Dockerfile"
    if (-not (Test-Path $DockerfilePath)) {
        Write-Host "⚠ No Dockerfile found for $ServiceName, skipping..." -ForegroundColor Yellow
        $script:TotalServices--
        return $true
    }

    # Image names with multiple tags
    $ImagePrefix = "flamoral/"
    $ImageBase = "$ACRUrl/${ImagePrefix}${ServiceName}"
    $ImageLatest = "${ImageBase}:latest"
    $ImageTag = "${ImageBase}:${Tag}"
    $ImageVersion = "${ImageBase}:${Version}"
    $ImageEnv = "${ImageBase}:${Environment}-latest"

    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
    Write-Host "Building: " -NoNewline -ForegroundColor Blue
    Write-Host "$ServiceName" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue

    # Build arguments
    $BuildArgs = ""
    if ($NoCache) {
        $BuildArgs = "--no-cache"
    }

    # Build the Docker image
    Write-Host "Building image..." -ForegroundColor Yellow

    $DockerCommand = "docker build $BuildArgs " +
        "--build-arg BUILD_DATE=`"$BuildDate`" " +
        "--build-arg VCS_REF=`"$VCSRef`" " +
        "--build-arg VERSION=`"$Version`" " +
        "-t `"$ImageLatest`" " +
        "-t `"$ImageTag`" " +
        "-t `"$ImageVersion`" " +
        "-t `"$ImageEnv`" " +
        "-f `"$DockerfilePath`" " +
        "`"$ProjectRoot`""

    if (Invoke-Command-Safe $DockerCommand) {
        Write-Host "✓ Successfully built $ServiceName" -ForegroundColor Green
        Write-Host "  Tags:" -ForegroundColor White
        Write-Host "    - $ImageLatest" -ForegroundColor Gray
        Write-Host "    - $ImageTag" -ForegroundColor Gray
        Write-Host "    - $ImageVersion" -ForegroundColor Gray
        Write-Host "    - $ImageEnv" -ForegroundColor Gray

        $script:SuccessfulBuilds++
        return $true
    } else {
        Write-Host "✗ Failed to build $ServiceName" -ForegroundColor Red
        $script:FailedBuilds++
        $script:FailedServiceNames += $ServiceName
        return $false
    }
}

# Function to push images for a service
function Push-ServiceImages {
    param(
        [string]$ServicePath
    )

    $ServiceName = Split-Path -Leaf $ServicePath
    $ImagePrefix = "flamoral/"
    $ImageBase = "$ACRUrl/${ImagePrefix}${ServiceName}"

    $Images = @(
        "${ImageBase}:latest",
        "${ImageBase}:${Tag}",
        "${ImageBase}:${Version}",
        "${ImageBase}:${Environment}-latest"
    )

    Write-Host "Pushing: " -NoNewline -ForegroundColor Blue
    Write-Host "$ServiceName" -ForegroundColor Cyan

    foreach ($Image in $Images) {
        Write-Host "  Pushing $Image..." -ForegroundColor Yellow
        if (Invoke-Command-Safe "docker push `"$Image`"") {
            Write-Host "  ✓ Pushed successfully" -ForegroundColor Green
        } else {
            Write-Host "  ✗ Failed to push" -ForegroundColor Red
            return $false
        }
    }

    return $true
}

# Login to ACR
if ($Push -and -not $DryRun) {
    Write-Host "Logging in to Azure Container Registry..." -ForegroundColor Yellow
    $LoginResult = az acr login --name $ACRName 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Successfully logged in to ACR" -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host "✗ Failed to login to ACR. Make sure you're authenticated with Azure CLI." -ForegroundColor Red
        Write-Host "Run: az login" -ForegroundColor Yellow
        exit 1
    }
}

# Build all Node.js services
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║  Building Node.js Backend Services                              ║" -ForegroundColor Yellow
Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow

foreach ($Service in $NodeServices) {
    Build-Service $Service
}

# Build all AI services
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║  Building Python AI Services                                    ║" -ForegroundColor Yellow
Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow

foreach ($Service in $AIServices) {
    Build-Service $Service
}

# Build Frontend
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║  Building Frontend Web Application                              ║" -ForegroundColor Yellow
Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow

$FrontendDockerfile = Join-Path $ProjectRoot "apps\web-app\Dockerfile"
if (Test-Path $FrontendDockerfile) {
    $TotalServices++
    $ImageBase = "$ACRUrl/flamoral/frontend-web"

    Write-Host "Building: " -NoNewline -ForegroundColor Blue
    Write-Host "frontend-web" -ForegroundColor Cyan

    $DockerCommand = "docker build " +
        "--build-arg BUILD_DATE=`"$BuildDate`" " +
        "--build-arg VCS_REF=`"$VCSRef`" " +
        "--build-arg VERSION=`"$Version`" " +
        "-t `"${ImageBase}:latest`" " +
        "-t `"${ImageBase}:${Tag}`" " +
        "-t `"${ImageBase}:${Version}`" " +
        "-t `"${ImageBase}:${Environment}-latest`" " +
        "-f `"$FrontendDockerfile`" " +
        "`"$ProjectRoot\apps\web-app`""

    if (Invoke-Command-Safe $DockerCommand) {
        Write-Host "✓ Successfully built frontend-web" -ForegroundColor Green
        $SuccessfulBuilds++
    } else {
        Write-Host "✗ Failed to build frontend-web" -ForegroundColor Red
        $FailedBuilds++
        $FailedServiceNames += "frontend-web"
    }
} else {
    Write-Host "⚠ No frontend Dockerfile found, skipping..." -ForegroundColor Yellow
}

# Print build summary
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Blue
Write-Host "║  Build Summary                                                   ║" -ForegroundColor Blue
Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Blue
Write-Host ""
Write-Host "  Total Services:  " -NoNewline -ForegroundColor White
Write-Host "$TotalServices" -ForegroundColor Cyan
Write-Host "  Successful:      " -NoNewline -ForegroundColor White
Write-Host "$SuccessfulBuilds" -ForegroundColor Green
Write-Host "  Failed:          " -NoNewline -ForegroundColor White
Write-Host "$FailedBuilds" -ForegroundColor Red
Write-Host ""

# Show failed services
if ($FailedBuilds -gt 0) {
    Write-Host "Failed Services:" -ForegroundColor Red
    foreach ($FailedService in $FailedServiceNames) {
        Write-Host "  ✗ $FailedService" -ForegroundColor Red
    }
    Write-Host ""
}

# Push images if requested and all builds succeeded
if ($Push) {
    if ($FailedBuilds -eq 0) {
        Write-Host ""
        Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
        Write-Host "║  Pushing Images to ACR                                          ║" -ForegroundColor Yellow
        Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
        Write-Host ""

        # Push Node.js services
        foreach ($Service in $NodeServices) {
            $ServiceName = Split-Path -Leaf $Service
            $FullPath = Join-Path $ServicesDir $Service
            $DockerfilePath = Join-Path $FullPath "Dockerfile"
            if (Test-Path $DockerfilePath) {
                Push-ServiceImages $Service
                Write-Host ""
            }
        }

        # Push AI services
        foreach ($Service in $AIServices) {
            $ServiceName = Split-Path -Leaf $Service
            $FullPath = Join-Path $ServicesDir $Service
            $DockerfilePath = Join-Path $FullPath "Dockerfile"
            if (Test-Path $DockerfilePath) {
                Push-ServiceImages $Service
                Write-Host ""
            }
        }

        # Push frontend
        if (Test-Path $FrontendDockerfile) {
            $ImageBase = "$ACRUrl/flamoral/frontend-web"
            Write-Host "Pushing: " -NoNewline -ForegroundColor Blue
            Write-Host "frontend-web" -ForegroundColor Cyan
            foreach ($TagName in @("latest", $Tag, $Version, "${Environment}-latest")) {
                Write-Host "  Pushing ${ImageBase}:${TagName}..." -ForegroundColor Yellow
                Invoke-Command-Safe "docker push `"${ImageBase}:${TagName}`""
            }
            Write-Host ""
        }

        Write-Host "✓ All images pushed successfully" -ForegroundColor Green
    } else {
        Write-Host "✗ Cannot push images - some builds failed" -ForegroundColor Red
        exit 1
    }
}

# Verify images in ACR
if ($Push -and -not $DryRun -and ($FailedBuilds -eq 0)) {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
    Write-Host "║  Verifying Images in ACR                                        ║" -ForegroundColor Yellow
    Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
    Write-Host ""

    Write-Host "Repositories in ${ACRName}:" -ForegroundColor Cyan
    az acr repository list --name $ACRName --output table

    Write-Host ""
    Write-Host "Recent images (showing tags):" -ForegroundColor Cyan
    # Show tags for a few key services
    foreach ($Service in @("user-service", "api-gateway", "auth-service")) {
        Write-Host ""
        Write-Host "Tags for flamoral/${Service}:" -ForegroundColor Yellow
        az acr repository show-tags --name $ACRName --repository "flamoral/${Service}" --orderby time_desc --output table 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  (No images found)" -ForegroundColor Gray
        }
    }
}

# Final status
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Blue
if ($FailedBuilds -eq 0) {
    Write-Host "║  ✓ All builds and pushes completed successfully!                ║" -ForegroundColor Green
    Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Blue
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Green
    Write-Host "  1. Deploy to Kubernetes: kubectl set image deployment/<name> <container>=${ACRUrl}/flamoral/<service>:${Tag}" -ForegroundColor White
    Write-Host "  2. Update Helm values: --set image.tag=${Tag}" -ForegroundColor White
    Write-Host "  3. Verify deployment: kubectl rollout status deployment/<name>" -ForegroundColor White
    exit 0
} else {
    Write-Host "║  ✗ Some builds failed - check output above                       ║" -ForegroundColor Red
    Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Blue
    exit 1
}
