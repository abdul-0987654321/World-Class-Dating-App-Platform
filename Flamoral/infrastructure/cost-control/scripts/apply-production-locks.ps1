# =============================================================================
# Flamoral Dating Platform - Production Resource Lock Script
# =============================================================================
# This script applies resource locks to production resources to prevent
# accidental deletion or modification.
# =============================================================================

param(
    [Parameter(Mandatory=$false)]
    [switch]$DryRun = $false,

    [Parameter(Mandatory=$false)]
    [ValidateSet("CanNotDelete", "ReadOnly")]
    [string]$LockLevel = "CanNotDelete",

    [Parameter(Mandatory=$false)]
    [switch]$RemoveLocks = $false
)

$ErrorActionPreference = "Stop"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  Production Resource Lock Script            " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "[DRY RUN] No changes will be made" -ForegroundColor Cyan
}

# =============================================================================
# Configuration
# =============================================================================
$productionResourceGroups = @(
    "flamoral-prod-rg",
    "flamoral-shared-rg",
    "flamoral-tfstate-rg"
)

$lockName = "production-protection-lock"

# =============================================================================
# Apply or Remove Locks
# =============================================================================
foreach ($rg in $productionResourceGroups) {
    Write-Host ""
    Write-Host "=== Processing: $rg ===" -ForegroundColor Yellow

    # Check if resource group exists
    $rgExists = az group exists --name $rg 2>$null
    if ($rgExists -ne "true") {
        Write-Host "  Resource group does not exist, skipping" -ForegroundColor Yellow
        continue
    }

    if ($RemoveLocks) {
        Write-Host "  Removing lock from $rg..."

        if ($DryRun) {
            Write-Host "  [DRY RUN] Would remove lock: $lockName" -ForegroundColor Cyan
        } else {
            try {
                az lock delete --name $lockName --resource-group $rg 2>$null
                Write-Host "  Lock removed successfully" -ForegroundColor Green
            } catch {
                Write-Host "  No lock found or error removing lock" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "  Applying $LockLevel lock to $rg..."

        if ($DryRun) {
            Write-Host "  [DRY RUN] Would create lock: $lockName ($LockLevel)" -ForegroundColor Cyan
        } else {
            try {
                # Check if lock already exists
                $existingLock = az lock show --name $lockName --resource-group $rg 2>$null

                if ($existingLock) {
                    Write-Host "  Lock already exists, updating..." -ForegroundColor Yellow
                    az lock delete --name $lockName --resource-group $rg 2>$null
                }

                az lock create --name $lockName `
                    --resource-group $rg `
                    --lock-type $LockLevel `
                    --notes "Production protection lock - Created by cost-control automation"

                Write-Host "  Lock applied successfully" -ForegroundColor Green
            } catch {
                Write-Host "  Failed to apply lock: $_" -ForegroundColor Red
            }
        }
    }

    # List current locks
    Write-Host "  Current locks:"
    $locks = az lock list --resource-group $rg -o json 2>$null | ConvertFrom-Json
    if ($locks -and $locks.Count -gt 0) {
        foreach ($lock in $locks) {
            Write-Host "    - $($lock.name): $($lock.level)" -ForegroundColor White
        }
    } else {
        Write-Host "    (no locks)" -ForegroundColor Gray
    }
}

# =============================================================================
# Apply Critical Resource Locks (Individual Resources)
# =============================================================================
if (-not $RemoveLocks) {
    Write-Host ""
    Write-Host "=== Applying Critical Resource Locks ===" -ForegroundColor Yellow

    $criticalResources = @(
        @{
            Name = "flamoralacr"
            ResourceGroup = "flamoral-shared-rg"
            ResourceType = "Microsoft.ContainerRegistry/registries"
            LockName = "acr-protection-lock"
        },
        @{
            Name = "flamoral-prod-redis"
            ResourceGroup = "flamoral-prod-rg"
            ResourceType = "Microsoft.Cache/Redis"
            LockName = "redis-protection-lock"
        },
        @{
            Name = "flamoral.com"
            ResourceGroup = "flamoral-prod-rg"
            ResourceType = "Microsoft.Network/dnszones"
            LockName = "dns-protection-lock"
        }
    )

    foreach ($resource in $criticalResources) {
        Write-Host ""
        Write-Host "  Locking: $($resource.Name) ($($resource.ResourceType))"

        if ($DryRun) {
            Write-Host "  [DRY RUN] Would create resource lock" -ForegroundColor Cyan
        } else {
            try {
                az lock create --name $resource.LockName `
                    --resource-group $resource.ResourceGroup `
                    --resource-name $resource.Name `
                    --resource-type $resource.ResourceType `
                    --lock-type $LockLevel `
                    --notes "Critical resource protection lock"

                Write-Host "  Lock applied" -ForegroundColor Green
            } catch {
                Write-Host "  Warning: $_" -ForegroundColor Yellow
            }
        }
    }
}

# =============================================================================
# Summary
# =============================================================================
Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  LOCK OPERATION SUMMARY" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

if ($RemoveLocks) {
    Write-Host "Locks have been REMOVED from production resources" -ForegroundColor Yellow
    Write-Host "Resources are now unprotected!" -ForegroundColor Red
} else {
    Write-Host "Locks have been APPLIED to production resources" -ForegroundColor Green
    Write-Host "Lock Level: $LockLevel" -ForegroundColor White
    Write-Host ""
    Write-Host "Protected Resource Groups:" -ForegroundColor White
    foreach ($rg in $productionResourceGroups) {
        Write-Host "  - $rg" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "NOTE: To modify locked resources, you must first remove the locks"
Write-Host "Run with -RemoveLocks to remove all production locks"
