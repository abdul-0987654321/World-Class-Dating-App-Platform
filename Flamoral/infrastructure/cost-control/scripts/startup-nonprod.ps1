# =============================================================================
# Flamoral Dating Platform - Non-Production Startup Script
# =============================================================================
# This script starts/restores all non-production resources that were
# previously shutdown. Requires explicit approval before execution.
# =============================================================================

param(
    [Parameter(Mandatory=$false)]
    [switch]$DryRun = $false,

    [Parameter(Mandatory=$false)]
    [switch]$SkipConfirmation = $false,

    [Parameter(Mandatory=$false)]
    [string]$LogPath = ".\startup-log-$(Get-Date -Format 'yyyyMMdd-HHmmss').json",

    [Parameter(Mandatory=$false)]
    [ValidateSet("dev", "staging", "all")]
    [string]$Environment = "all"
)

$ErrorActionPreference = "Stop"

# =============================================================================
# Configuration
# =============================================================================
$environmentConfig = @{
    "dev" = @{
        ResourceGroups = @("flamoral-dev-rg")
        AKSNodeCount = 1
    }
    "staging" = @{
        ResourceGroups = @("flamoral-staging-rg")
        AKSNodeCount = 2
    }
}

$actionLog = @{
    StartTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    DryRun = $DryRun
    Environment = $Environment
    Actions = @()
    Errors = @()
    Summary = @{
        VMsStarted = 0
        AKSScaledUp = 0
        DatabasesStarted = 0
        AppServicesStarted = 0
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
        [string]$Status
    )

    $actionLog.Actions += @{
        Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        ResourceType = $ResourceType
        ResourceName = $ResourceName
        Action = $Action
        Status = $Status
    }
}

# =============================================================================
# Pre-flight Checks & Confirmation
# =============================================================================
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  Non-Production Resource Startup Script     " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Log "DRY RUN MODE - No changes will be made" "DRYRUN"
}

Write-Log "Target Environment: $Environment" "INFO"

if (-not $SkipConfirmation -and -not $DryRun) {
    Write-Host ""
    Write-Host "WARNING: This will start non-production resources and incur costs!" -ForegroundColor Yellow
    Write-Host ""
    $confirm = Read-Host "Type 'START' to confirm"
    if ($confirm -ne "START") {
        Write-Log "Operation cancelled by user" "WARNING"
        exit 0
    }
}

# Determine which resource groups to process
$targetGroups = @()
if ($Environment -eq "all") {
    $targetGroups = $environmentConfig.Values.ResourceGroups | ForEach-Object { $_ }
} else {
    $targetGroups = $environmentConfig[$Environment].ResourceGroups
}

# =============================================================================
# Start Non-Production Resources
# =============================================================================
Write-Host ""
Write-Host "=== Starting Non-Production Resources ===" -ForegroundColor Yellow

foreach ($rg in $targetGroups) {
    Write-Log "Processing resource group: $rg" "INFO"

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
    # 1. Start Virtual Machines
    # ===========================================
    $vms = $resources | Where-Object { $_.type -eq "Microsoft.Compute/virtualMachines" }
    foreach ($vm in $vms) {
        Write-Log "Starting VM: $($vm.name)" "INFO"

        if ($DryRun) {
            Write-Log "[DRYRUN] Would start VM: $($vm.name)" "DRYRUN"
            Add-Action "VirtualMachine" $vm.name "Start" "DryRun"
        } else {
            try {
                az vm start --resource-group $rg --name $vm.name --no-wait
                Write-Log "Started VM: $($vm.name)" "SUCCESS"
                Add-Action "VirtualMachine" $vm.name "Start" "Success"
                $actionLog.Summary.VMsStarted++
            } catch {
                Write-Log "Failed to start VM $($vm.name): $_" "ERROR"
                Add-Action "VirtualMachine" $vm.name "Start" "Failed"
                $actionLog.Errors += @{
                    Resource = $vm.name
                    Error = $_.ToString()
                }
            }
        }
    }

    # ===========================================
    # 2. Scale Up AKS Node Pools
    # ===========================================
    $aksClusters = $resources | Where-Object { $_.type -eq "Microsoft.ContainerService/managedClusters" }
    foreach ($aks in $aksClusters) {
        Write-Log "Scaling up AKS cluster: $($aks.name)" "INFO"

        # Determine node count based on environment
        $targetNodeCount = 2  # Default
        foreach ($envName in $environmentConfig.Keys) {
            if ($environmentConfig[$envName].ResourceGroups -contains $rg) {
                $targetNodeCount = $environmentConfig[$envName].AKSNodeCount
                break
            }
        }

        if ($DryRun) {
            Write-Log "[DRYRUN] Would scale up AKS: $($aks.name) to $targetNodeCount nodes" "DRYRUN"
            Add-Action "AKS" $aks.name "ScaleUp" "DryRun"
        } else {
            try {
                # Get node pools
                $nodePools = az aks nodepool list --resource-group $rg --cluster-name $aks.name -o json 2>$null | ConvertFrom-Json

                foreach ($pool in $nodePools) {
                    Write-Log "Scaling pool $($pool.name) to $targetNodeCount nodes" "INFO"
                    az aks nodepool scale --resource-group $rg --cluster-name $aks.name --name $pool.name --node-count $targetNodeCount --no-wait
                }
                Write-Log "Scaled up AKS: $($aks.name)" "SUCCESS"
                Add-Action "AKS" $aks.name "ScaleUp" "Success"
                $actionLog.Summary.AKSScaledUp++
            } catch {
                Write-Log "Failed to scale AKS $($aks.name): $_" "ERROR"
                Add-Action "AKS" $aks.name "ScaleUp" "Failed"
                $actionLog.Errors += @{
                    Resource = $aks.name
                    Error = $_.ToString()
                }
            }
        }
    }

    # ===========================================
    # 3. Start PostgreSQL Flexible Servers
    # ===========================================
    $postgresServers = $resources | Where-Object { $_.type -eq "Microsoft.DBforPostgreSQL/flexibleServers" }
    foreach ($pg in $postgresServers) {
        Write-Log "Starting PostgreSQL server: $($pg.name)" "INFO"

        if ($DryRun) {
            Write-Log "[DRYRUN] Would start PostgreSQL: $($pg.name)" "DRYRUN"
            Add-Action "PostgreSQL" $pg.name "Start" "DryRun"
        } else {
            try {
                az postgres flexible-server start --resource-group $rg --name $pg.name --no-wait
                Write-Log "Started PostgreSQL: $($pg.name)" "SUCCESS"
                Add-Action "PostgreSQL" $pg.name "Start" "Success"
                $actionLog.Summary.DatabasesStarted++
            } catch {
                Write-Log "Failed to start PostgreSQL $($pg.name): $_" "ERROR"
                Add-Action "PostgreSQL" $pg.name "Start" "Failed"
                $actionLog.Errors += @{
                    Resource = $pg.name
                    Error = $_.ToString()
                }
            }
        }
    }

    # ===========================================
    # 4. Start MySQL Flexible Servers
    # ===========================================
    $mysqlServers = $resources | Where-Object { $_.type -eq "Microsoft.DBforMySQL/flexibleServers" }
    foreach ($mysql in $mysqlServers) {
        Write-Log "Starting MySQL server: $($mysql.name)" "INFO"

        if ($DryRun) {
            Write-Log "[DRYRUN] Would start MySQL: $($mysql.name)" "DRYRUN"
            Add-Action "MySQL" $mysql.name "Start" "DryRun"
        } else {
            try {
                az mysql flexible-server start --resource-group $rg --name $mysql.name --no-wait
                Write-Log "Started MySQL: $($mysql.name)" "SUCCESS"
                Add-Action "MySQL" $mysql.name "Start" "Success"
                $actionLog.Summary.DatabasesStarted++
            } catch {
                Write-Log "Failed to start MySQL $($mysql.name): $_" "ERROR"
                Add-Action "MySQL" $mysql.name "Start" "Failed"
                $actionLog.Errors += @{
                    Resource = $mysql.name
                    Error = $_.ToString()
                }
            }
        }
    }

    # ===========================================
    # 5. Start App Services
    # ===========================================
    $appServices = $resources | Where-Object { $_.type -eq "Microsoft.Web/sites" }
    foreach ($app in $appServices) {
        Write-Log "Starting App Service: $($app.name)" "INFO"

        if ($DryRun) {
            Write-Log "[DRYRUN] Would start App Service: $($app.name)" "DRYRUN"
            Add-Action "AppService" $app.name "Start" "DryRun"
        } else {
            try {
                az webapp start --resource-group $rg --name $app.name
                Write-Log "Started App Service: $($app.name)" "SUCCESS"
                Add-Action "AppService" $app.name "Start" "Success"
                $actionLog.Summary.AppServicesStarted++
            } catch {
                Write-Log "Failed to start App Service $($app.name): $_" "ERROR"
                Add-Action "AppService" $app.name "Start" "Failed"
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
Write-Host "  STARTUP SUMMARY" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "VMs Started: $($actionLog.Summary.VMsStarted)"
Write-Host "AKS Clusters Scaled Up: $($actionLog.Summary.AKSScaledUp)"
Write-Host "Databases Started: $($actionLog.Summary.DatabasesStarted)"
Write-Host "App Services Started: $($actionLog.Summary.AppServicesStarted)"

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
