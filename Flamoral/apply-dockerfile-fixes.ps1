# =============================================================================
# Apply Dockerfile Fixes Script (PowerShell)
# =============================================================================
# This script backs up original Dockerfiles and applies all fixes
#
# Usage:
#   .\apply-dockerfile-fixes.ps1
#
# To revert changes:
#   .\apply-dockerfile-fixes.ps1 -Revert
# =============================================================================

param(
    [switch]$Revert
)

# Backup suffix
$BackupSuffix = ".backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

# Function to print colored output
function Print-Status {
    param([string]$Message)
    Write-Host "[✓] $Message" -ForegroundColor Green
}

function Print-Warning {
    param([string]$Message)
    Write-Host "[!] $Message" -ForegroundColor Yellow
}

function Print-Error {
    param([string]$Message)
    Write-Host "[✗] $Message" -ForegroundColor Red
}

# Function to backup and replace file
function Backup-And-Replace {
    param(
        [string]$Original,
        [string]$Fixed
    )

    if (-not (Test-Path $Fixed)) {
        Print-Warning "Fixed file not found: $Fixed"
        return $false
    }

    if (Test-Path $Original) {
        Copy-Item $Original -Destination "${Original}${BackupSuffix}"
        Print-Status "Backed up: $Original"
    }

    Copy-Item $Fixed -Destination $Original
    Print-Status "Applied fix: $Original"
    return $true
}

# Function to revert changes
function Revert-Changes {
    Print-Status "Reverting Dockerfile changes..."

    # Find all backup files
    Get-ChildItem -Recurse -Filter "*${BackupSuffix}" | ForEach-Object {
        $original = $_.FullName -replace [regex]::Escape($BackupSuffix), ""
        Move-Item $_.FullName -Destination $original -Force
        Print-Status "Restored: $original"
    }

    Print-Status "All changes reverted"
    exit 0
}

# Check for revert flag
if ($Revert) {
    Revert-Changes
}

# =============================================================================
# Main Execution
# =============================================================================

Write-Host "=======================================================================" -ForegroundColor Cyan
Write-Host "  Flamoral Dockerfile Fixes Application Script" -ForegroundColor Cyan
Write-Host "=======================================================================" -ForegroundColor Cyan
Write-Host ""

Print-Status "Starting Dockerfile fixes application..."
Write-Host ""

try {
    # 1. Backend main Dockerfile
    Print-Status "Fixing backend/Dockerfile..."
    Backup-And-Replace `
        "backend\Dockerfile" `
        "backend\Dockerfile.fixed"

    # 2. Infrastructure production Dockerfile
    Print-Status "Fixing infrastructure/docker/backend/Dockerfile.production..."
    Backup-And-Replace `
        "infrastructure\docker\backend\Dockerfile.production" `
        "infrastructure\docker\backend\Dockerfile.production.fixed"

    # 3. Realtime service Dockerfile
    Print-Status "Fixing backend/services/realtime-service/Dockerfile..."
    Backup-And-Replace `
        "backend\services\realtime-service\Dockerfile" `
        "backend\services\realtime-service\Dockerfile.fixed"

    # 4. Advertising service Dockerfile
    Print-Status "Fixing backend/services/advertising-service/Dockerfile..."
    Backup-And-Replace `
        "backend\services\advertising-service\Dockerfile" `
        "backend\services\advertising-service\Dockerfile.fixed"

    # 5. Workflow engine Dockerfile
    Print-Status "Fixing backend/services/workflow-engine/Dockerfile..."
    Backup-And-Replace `
        "backend\services\workflow-engine\Dockerfile" `
        "backend\services\workflow-engine\Dockerfile.fixed"

    # 6. AI Services - Photo Analysis
    Print-Status "Fixing backend/services/ai-services/photo-analysis/Dockerfile..."
    Backup-And-Replace `
        "backend\services\ai-services\photo-analysis\Dockerfile" `
        "backend\services\ai-services\photo-analysis\Dockerfile.fixed"

    # 7. AI Services - Fraud Detection
    Print-Status "Fixing backend/services/ai-services/fraud-detection/Dockerfile..."
    Backup-And-Replace `
        "backend\services\ai-services\fraud-detection\Dockerfile" `
        "backend\services\ai-services\fraud-detection\Dockerfile.fixed"

    # 8. AI Services - Dating Coach
    Print-Status "Fixing backend/services/ai-services/dating-coach-service/Dockerfile..."
    Backup-And-Replace `
        "backend\services\ai-services\dating-coach-service\Dockerfile" `
        "backend\services\ai-services\dating-coach-service\Dockerfile.fixed"

    # 9. AI Services - Content Generator
    Print-Status "Fixing backend/services/ai-services/content-generator/Dockerfile..."
    Backup-And-Replace `
        "backend\services\ai-services\content-generator\Dockerfile" `
        "backend\services\ai-services\content-generator\Dockerfile.fixed"

    Write-Host ""
    Print-Status "All Dockerfile fixes applied successfully!"
    Write-Host ""

    # =============================================================================
    # Cleanup .fixed files
    # =============================================================================

    $response = Read-Host "Do you want to remove the .fixed files? (y/n)"
    if ($response -eq 'y' -or $response -eq 'Y') {
        Get-ChildItem -Recurse -Filter "Dockerfile.fixed" | ForEach-Object {
            Remove-Item $_.FullName
            Print-Status "Removed: $($_.FullName)"
        }
        Get-ChildItem -Recurse -Filter "Dockerfile.*.fixed" | ForEach-Object {
            Remove-Item $_.FullName
            Print-Status "Removed: $($_.FullName)"
        }
    }

    Write-Host ""
    Write-Host "=======================================================================" -ForegroundColor Cyan
    Write-Host "  Summary of Changes" -ForegroundColor Cyan
    Write-Host "=======================================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "✓ Fixed backend/Dockerfile"
    Write-Host "  - Added curl for health checks"
    Write-Host "  - Removed failing migrations copy"
    Write-Host ""
    Write-Host "✓ Fixed infrastructure/docker/backend/Dockerfile.production"
    Write-Host "  - Separated build and production dependencies"
    Write-Host "  - Added curl for health checks"
    Write-Host ""
    Write-Host "✓ Fixed backend/services/realtime-service/Dockerfile"
    Write-Host "  - Fixed go.mod path issues"
    Write-Host "  - Simplified build flags"
    Write-Host ""
    Write-Host "✓ Fixed backend/services/advertising-service/Dockerfile"
    Write-Host "  - Changed wget to curl for health checks"
    Write-Host "  - Added dumb-init for signal handling"
    Write-Host ""
    Write-Host "✓ Fixed backend/services/workflow-engine/Dockerfile"
    Write-Host "  - Changed port from 4011 to 4013 (avoid conflict)"
    Write-Host ""
    Write-Host "✓ Fixed AI Services Dockerfiles (4 services)"
    Write-Host "  - Updated COPY paths for monorepo build context"
    Write-Host "  - All services: photo-analysis, fraud-detection,"
    Write-Host "    dating-coach-service, content-generator"
    Write-Host ""
    Write-Host "=======================================================================" -ForegroundColor Cyan
    Write-Host "  Next Steps" -ForegroundColor Cyan
    Write-Host "=======================================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Review the changes in each Dockerfile"
    Write-Host "2. Update docker-compose.yml:"
    Write-Host "   - Change workflow-engine port to 4013"
    Write-Host "   - Verify build contexts for AI services"
    Write-Host "3. Test builds:"
    Write-Host "   docker-compose -f infrastructure/docker/docker-compose.yml build"
    Write-Host "4. Test individual services:"
    Write-Host "   docker-compose -f infrastructure/docker/docker-compose.yml up -d [service-name]"
    Write-Host ""
    Write-Host "To revert all changes, run:"
    Write-Host "  .\apply-dockerfile-fixes.ps1 -Revert"
    Write-Host ""
    Write-Host "Backup files are saved with suffix: $BackupSuffix"
    Write-Host ""
    Print-Status "Done!"

} catch {
    Print-Error "An error occurred: $_"
    exit 1
}
