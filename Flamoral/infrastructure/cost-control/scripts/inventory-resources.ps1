# =============================================================================
# Flamoral Dating Platform - Resource Inventory Script
# =============================================================================
# This script inventories all Azure resources by environment and generates
# a cost analysis report.
# =============================================================================

param(
    [Parameter(Mandatory=$false)]
    [string]$OutputPath = ".\inventory-report.json"
)

$ErrorActionPreference = "Stop"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  Flamoral Resource Inventory & Cost Report  " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Define environment configuration
$environments = @{
    "Production" = @{
        ResourceGroups = @("flamoral-prod-rg")
        Tags = @{ "Environment" = "production" }
        Protected = $true
    }
    "Staging" = @{
        ResourceGroups = @("flamoral-staging-rg")
        Tags = @{ "Environment" = "staging"; "env" = "staging" }
        Protected = $false
    }
    "Development" = @{
        ResourceGroups = @("flamoral-dev-rg")
        Tags = @{ "Environment" = "dev"; "env" = "dev" }
        Protected = $false
    }
    "Shared" = @{
        ResourceGroups = @("flamoral-shared-rg", "flamoral-tfstate-rg")
        Tags = @{ "Environment" = "shared" }
        Protected = $true
    }
}

# Cost estimates per resource type (monthly USD)
$costEstimates = @{
    "Microsoft.Cache/Redis" = @{
        "Basic" = 16
        "Standard" = 50
        "Premium" = 411
    }
    "Microsoft.SignalRService/SignalR" = @{
        "Free_F1" = 0
        "Standard_S1" = 49
        "Premium_P1" = 100
    }
    "Microsoft.Cdn/profiles" = @{
        "Standard_AzureFrontDoor" = 35
        "Premium_AzureFrontDoor" = 325
    }
    "Microsoft.ContainerRegistry/registries" = @{
        "Basic" = 5
        "Standard" = 20
        "Premium" = 450
    }
    "Microsoft.DBforPostgreSQL/flexibleServers" = @{
        "Burstable" = 25
        "GeneralPurpose" = 200
        "MemoryOptimized" = 400
    }
    "Microsoft.ContainerService/managedClusters" = @{
        "default" = 500
    }
    "Microsoft.Storage/storageAccounts" = @{
        "default" = 10
    }
    "Microsoft.KeyVault/vaults" = @{
        "standard" = 0.50
        "premium" = 1
    }
    "Microsoft.OperationalInsights/workspaces" = @{
        "default" = 30
    }
    "Microsoft.Network/publicIPAddresses" = @{
        "Standard" = 4
        "Basic" = 3
    }
}

$inventory = @{
    GeneratedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Subscription = (az account show --query "{Name:name, Id:id}" -o json | ConvertFrom-Json)
    Environments = @{}
    Summary = @{
        TotalResources = 0
        TotalEstimatedMonthlyCost = 0
        ProductionCost = 0
        NonProductionCost = 0
        SavingsIfShutdown = 0
    }
}

foreach ($envName in $environments.Keys) {
    $envConfig = $environments[$envName]
    Write-Host "`n=== $envName Environment ===" -ForegroundColor Yellow

    $envInventory = @{
        Resources = @()
        ResourceCount = 0
        EstimatedMonthlyCost = 0
        Protected = $envConfig.Protected
    }

    foreach ($rg in $envConfig.ResourceGroups) {
        Write-Host "  Scanning resource group: $rg" -ForegroundColor Gray

        try {
            $resources = az resource list --resource-group $rg -o json 2>$null | ConvertFrom-Json

            if ($resources) {
                foreach ($resource in $resources) {
                    $resourceType = $resource.type
                    $resourceName = $resource.name
                    $sku = $resource.sku.name

                    # Calculate estimated cost
                    $estimatedCost = 0
                    if ($costEstimates.ContainsKey($resourceType)) {
                        $skuCosts = $costEstimates[$resourceType]
                        if ($sku -and $skuCosts.ContainsKey($sku)) {
                            $estimatedCost = $skuCosts[$sku]
                        } elseif ($skuCosts.ContainsKey("default")) {
                            $estimatedCost = $skuCosts["default"]
                        }
                    }

                    $resourceInfo = @{
                        Name = $resourceName
                        Type = $resourceType
                        ResourceGroup = $rg
                        Location = $resource.location
                        SKU = $sku
                        EstimatedMonthlyCost = $estimatedCost
                        CanBeShutdown = $false
                    }

                    # Determine if resource can be shutdown
                    $shutdownableTypes = @(
                        "Microsoft.Compute/virtualMachines",
                        "Microsoft.ContainerService/managedClusters",
                        "Microsoft.DBforPostgreSQL/flexibleServers",
                        "Microsoft.DBforMySQL/flexibleServers",
                        "Microsoft.Sql/servers/databases",
                        "Microsoft.Web/sites"
                    )

                    if ($shutdownableTypes -contains $resourceType) {
                        $resourceInfo.CanBeShutdown = $true
                    }

                    $envInventory.Resources += $resourceInfo
                    $envInventory.EstimatedMonthlyCost += $estimatedCost
                    $envInventory.ResourceCount++

                    Write-Host "    - $resourceName ($resourceType) - `$$estimatedCost/mo" -ForegroundColor White
                }
            }
        } catch {
            Write-Host "    Warning: Could not scan $rg - $_" -ForegroundColor Yellow
        }
    }

    $inventory.Environments[$envName] = $envInventory
    $inventory.Summary.TotalResources += $envInventory.ResourceCount
    $inventory.Summary.TotalEstimatedMonthlyCost += $envInventory.EstimatedMonthlyCost

    if ($envConfig.Protected) {
        $inventory.Summary.ProductionCost += $envInventory.EstimatedMonthlyCost
    } else {
        $inventory.Summary.NonProductionCost += $envInventory.EstimatedMonthlyCost

        # Calculate potential savings from shutdownable resources
        $shutdownableCost = ($envInventory.Resources | Where-Object { $_.CanBeShutdown } |
                            Measure-Object -Property EstimatedMonthlyCost -Sum).Sum
        if ($shutdownableCost) {
            $inventory.Summary.SavingsIfShutdown += $shutdownableCost
        }
    }

    Write-Host "  Subtotal: $($envInventory.ResourceCount) resources, `$$($envInventory.EstimatedMonthlyCost)/mo" -ForegroundColor Green
}

# Output summary
Write-Host "`n=============================================" -ForegroundColor Cyan
Write-Host "  SUMMARY" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Total Resources: $($inventory.Summary.TotalResources)"
Write-Host "Estimated Monthly Cost: `$$($inventory.Summary.TotalEstimatedMonthlyCost)"
Write-Host "  - Production/Shared: `$$($inventory.Summary.ProductionCost)"
Write-Host "  - Non-Production: `$$($inventory.Summary.NonProductionCost)"
Write-Host "Potential Savings (shutdown non-prod): `$$($inventory.Summary.SavingsIfShutdown)" -ForegroundColor Green

# Save report
$inventory | ConvertTo-Json -Depth 10 | Out-File -FilePath $OutputPath -Encoding UTF8
Write-Host "`nReport saved to: $OutputPath" -ForegroundColor Cyan

return $inventory
