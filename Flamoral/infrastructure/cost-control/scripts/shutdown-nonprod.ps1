# =============================================================================
# Flamoral Dating Platform - Non-Production Shutdown Script
# =============================================================================
# This script safely shuts down/deallocates all non-production resources
# to minimize cloud costs. Production resources are NEVER modified.
# =============================================================================

param(
    [Parameter(Mandatory=$false)]
    [switch]$DryRun = $false,

    [Parameter(Mandatory=$false)]
    [switch]$Force = $false,

    [Parameter(Mandatory=$false)]
    [string]$LogPath = ".\shutdown-log-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
)

$ErrorActionPreference = "Stop"

# =============================================================================
# Configuration
# =============================================================================
$protectedResourceGroups = @(
    "flamoral-prod-rg",
    "flamoral-shared-rg",
    "flamoral-tfstate-rg",
    "NetworkWatcherRG"
)

$nonProdResourceGroups = @(
    "flamoral-dev-rg",
    "flamoral-staging-rg"
)

$actionLog = @{
    StartTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    DryRun = $DryRun
    Actions = @()
    Errors = @()
    Summary = @{
        VMsDeallocated = 0
        AKSScaledDown = 0
        DatabasesStopped = 0
        AppServicesStopped = 0
        TotalCostSavings = 0
    }
}

# =============================================================================
# Helper Functions
# =============================================================================
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")

    $timestamp = Get-Date -Format "HH:mm:ss"
    $color = switch ($Level) {
        "INFO" { "White" }
        "SUCCESS" { "Green" }
        "WARNING" { "Yellow" }
        "ERROR" { "Red" }
        "DRYRUN" { "Cyan" }
        default { "White" }
    }

    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
}

function Add-Action {
    param(
        [string]$ResourceType,
        [string]$ResourceName,
        [string]$Action,
        [string]$Status,
        [decimal]$EstimatedSavings = 0
    )

    $actionLog.Actions += @{
        Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        ResourceType = $ResourceType
        ResourceName = $ResourceName
        Action = $Action
        Status = $Status
        EstimatedMonthlySavings = $EstimatedSavings
    }
}

function Test-ProtectedResourceGroup {
    param([string]$ResourceGroup)
    return $protectedResourceGroups -contains $ResourceGroup
}

# =============================================================================
# Pre-flight Checks
# =============================================================================
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  Non-Production Resource Shutdown Script    " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Log "DRY RUN MODE - No changes will be made" "DRYRUN"
}

# Verify production is healthy before proceeding
Write-Log "Verifying production environment status..." "INFO"

$prodResources = az resource list --resource-group "flamoral-prod-rg" -o json 2>$null | ConvertFrom-Json
if ($prodResources) {
    Write-Log "Production resource group found with $($prodResources.Count) resources" "SUCCESS"
} else {
    Write-Log "WARNING: Could not verify production resources" "WARNING"
    if (-not $Force) {
        Write-Log "Use -Force to proceed anyway" "ERROR"
        exit 1
    }
}

# =============================================================================
# Shutdown Non-Production Resources
# =============================================================================
Write-Host ""
Write-Host "=== Starting Non-Production Shutdown ===" -ForegroundColor Yellow

foreach ($rg in $nonProdResourceGroups) {
    Write-Log "Processing resource group: $rg" "INFO"

    # Safety check
    if (Test-ProtectedResourceGroup $rg) {
        Write-Log "SKIPPING $rg - marked as protected!" "ERROR"
        continue
    }

    try {
        $resources = az resource list --resource-group $rg -o json 2>$null | ConvertFrom-Json
    } catch {
        Write-Log "Resource group $rg not found or empty" "WARNING"
        continue
    }

    if (-not $resources) {
        Write-Log "No resources found in $rg" "INFO"
        continue
    }

    # ===========================================
    # 1. Deallocate Virtual Machines
    # ===========================================
    $vms = $resources | Where-Object { $_.type -eq "Microsoft.Compute/virtualMachines" }
    foreach ($vm in $vms) {
        Write-Log "Deallocating VM: $($vm.name)" "INFO"

        if ($DryRun) {
            Write-Log "[DRYRUN] Would deallocate VM: $($vm.name)" "DRYRUN"
            Add-Action "VirtualMachine" $vm.name "Deallocate" "DryRun" 100
        } else {
            try {
                az vm deallocate --resource-group $rg --name $vm.name --no-wait
                Write-Log "Deallocated VM: $($vm.name)" "SUCCESS"
                Add-Action "VirtualMachine" $vm.name "Deallocate" "Success" 100
                $actionLog.Summary.VMsDeallocated++
                $actionLog.Summary.TotalCostSavings += 100
            } catch {
                Write-Log "Failed to deallocate VM $($vm.name): $_" "ERROR"
                Add-Action "VirtualMachine" $vm.name "Deallocate" "Failed"
                $actionLog.Errors += @{
                    Resource = $vm.name
                    Error = $_.ToString()
                }
            }
        }
    }

    # ===========================================
    # 2. Scale Down AKS Node Pools
    # ===========================================
    $aksClusters = $resources | Where-Object { $_.type -eq "Microsoft.ContainerService/managedClusters" }
    foreach ($aks in $aksClusters) {
        Write-Log "Scaling down AKS cluster: $($aks.name)" "INFO"

        if ($DryRun) {
            Write-Log "[DRYRUN] Would scale down AKS: $($aks.name)" "DRYRUN"
            Add-Action "AKS" $aks.name "ScaleDown" "DryRun" 400
        } else {
            try {
                # Get node pools
                $nodePools = az aks nodepool list --resource-group $rg --cluster-name $aks.name -o json 2>$null | ConvertFrom-Json

                foreach ($pool in $nodePools) {
                    if ($pool.mode -ne "System") {
                        Write-Log "Scaling user pool $($pool.name) to 0 nodes" "INFO"
                        az aks nodepool scale --resource-group $rg --cluster-name $aks.name --name $pool.name --node-count 0 --no-wait
                    } else {
                        Write-Log "Scaling system pool $($pool.name) to minimum (1 node)" "INFO"
                        az aks nodepool scale --resource-group $rg --cluster-name $aks.name --name $pool.name --node-count 1 --no-wait
                    }
                }
                Write-Log "Scaled down AKS: $($aks.name)" "SUCCESS"
                Add-Action "AKS" $aks.name "ScaleDown" "Success" 400
                $actionLog.Summary.AKSScaledDown++
                $actionLog.Summary.TotalCostSavings += 400
            } catch {
                Write-Log "Failed to scale AKS $($aks.name): $_" "ERROR"
                Add-Action "AKS" $aks.name "ScaleDown" "Failed"
                $actionLog.Errors += @{
                    Resource = $aks.name
                    Error = $_.ToString()
                }
            }
        }
    }

    # ===========================================
    # 3. Stop PostgreSQL Flexible Servers
    # ===========================================
    $postgresServers = $resources | Where-Object { $_.type -eq "Microsoft.DBforPostgreSQL/flexibleServers" }
    foreach ($pg in $postgresServers) {
        Write-Log "Stopping PostgreSQL server: $($pg.name)" "INFO"

        if ($DryRun) {
            Write-Log "[DRYRUN] Would stop PostgreSQL: $($pg.name)" "DRYRUN"
            Add-Action "PostgreSQL" $pg.name "Stop" "DryRun" 200
        } else {
            try {
                az postgres flexible-server stop --resource-group $rg --name $pg.name --no-wait
                Write-Log "Stopped PostgreSQL: $($pg.name)" "SUCCESS"
                Add-Action "PostgreSQL" $pg.name "Stop" "Success" 200
                $actionLog.Summary.DatabasesStopped++
                $actionLog.Summary.TotalCostSavings += 200
            } catch {
                Write-Log "Failed to stop PostgreSQL $($pg.name): $_" "ERROR"
                Add-Action "PostgreSQL" $pg.name "Stop" "Failed"
                $actionLog.Errors += @{
                    Resource = $pg.name
                    Error = $_.ToString()
                }
            }
        }
    }

    # ===========================================
    # 4. Stop MySQL Flexible Servers
    # ===========================================
    $mysqlServers = $resources | Where-Object { $_.type -eq "Microsoft.DBforMySQL/flexibleServers" }
    foreach ($mysql in $mysqlServers) {
        Write-Log "Stopping MySQL server: $($mysql.name)" "INFO"

        if ($DryRun) {
            Write-Log "[DRYRUN] Would stop MySQL: $($mysql.name)" "DRYRUN"
            Add-Action "MySQL" $mysql.name "Stop" "DryRun" 150
        } else {
            try {
                az mysql flexible-server stop --resource-group $rg --name $mysql.name --no-wait
                Write-Log "Stopped MySQL: $($mysql.name)" "SUCCESS"
                Add-Action "MySQL" $mysql.name "Stop" "Success" 150
                $actionLog.Summary.DatabasesStopped++
                $actionLog.Summary.TotalCostSavings += 150
            } catch {
                Write-Log "Failed to stop MySQL $($mysql.name): $_" "ERROR"
                Add-Action "MySQL" $mysql.name "Stop" "Failed"
                $actionLog.Errors += @{
                    Resource = $mysql.name
                    Error = $_.ToString()
                }
            }
        }
    }

    # ===========================================
    # 5. Stop/Scale App Services
    # ===========================================
    $appServices = $resources | Where-Object { $_.type -eq "Microsoft.Web/sites" }
    foreach ($app in $appServices) {
        Write-Log "Stopping App Service: $($app.name)" "INFO"

        if ($DryRun) {
            Write-Log "[DRYRUN] Would stop App Service: $($app.name)" "DRYRUN"
            Add-Action "AppService" $app.name "Stop" "DryRun" 50
        } else {
            try {
                az webapp stop --resource-group $rg --name $app.name
                Write-Log "Stopped App Service: $($app.name)" "SUCCESS"
                Add-Action "AppService" $app.name "Stop" "Success" 50
                $actionLog.Summary.AppServicesStopped++
                $actionLog.Summary.TotalCostSavings += 50
            } catch {
                Write-Log "Failed to stop App Service $($app.name): $_" "ERROR"
                Add-Action "AppService" $app.name "Stop" "Failed"
                $actionLog.Errors += @{
                    Resource = $app.name
                    Error = $_.ToString()
                }
            }
        }
    }
}

# =============================================================================
# Summary
# =============================================================================
$actionLog.EndTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  SHUTDOWN SUMMARY" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "VMs Deallocated: $($actionLog.Summary.VMsDeallocated)"
Write-Host "AKS Clusters Scaled Down: $($actionLog.Summary.AKSScaledDown)"
Write-Host "Databases Stopped: $($actionLog.Summary.DatabasesStopped)"
Write-Host "App Services Stopped: $($actionLog.Summary.AppServicesStopped)"
Write-Host "Estimated Monthly Savings: `$$($actionLog.Summary.TotalCostSavings)" -ForegroundColor Green

if ($actionLog.Errors.Count -gt 0) {
    Write-Host ""
    Write-Host "ERRORS ENCOUNTERED: $($actionLog.Errors.Count)" -ForegroundColor Red
    foreach ($err in $actionLog.Errors) {
        Write-Host "  - $($err.Resource): $($err.Error)" -ForegroundColor Red
    }
}

# Save log
$actionLog | ConvertTo-Json -Depth 10 | Out-File -FilePath $LogPath -Encoding UTF8
Write-Host ""
Write-Host "Log saved to: $LogPath" -ForegroundColor Cyan

return $actionLog
