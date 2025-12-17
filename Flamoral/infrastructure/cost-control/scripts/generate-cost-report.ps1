# =============================================================================
# Flamoral Dating Platform - Cost Savings Report Generator
# =============================================================================
# This script generates a comprehensive cost analysis report including
# current spend, potential savings, and recommendations.
# =============================================================================

param(
    [Parameter(Mandatory=$false)]
    [string]$OutputPath = ".\cost-report-$(Get-Date -Format 'yyyyMMdd').md"
)

$ErrorActionPreference = "Stop"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  Cost Savings Report Generator              " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# =============================================================================
# Gather Resource Information
# =============================================================================

# Get subscription info
$subscription = az account show -o json | ConvertFrom-Json

# Define resource groups and their classification
$resourceGroups = @{
    "Production" = @("flamoral-prod-rg")
    "Shared" = @("flamoral-shared-rg", "flamoral-tfstate-rg")
    "Development" = @("flamoral-dev-rg")
    "Staging" = @("flamoral-staging-rg")
}

# Cost mapping for common resources (monthly USD estimates)
$costMap = @{
    # Compute
    "Microsoft.ContainerService/managedClusters" = 500
    "Microsoft.Compute/virtualMachines" = 150

    # Databases
    "Microsoft.DBforPostgreSQL/flexibleServers" = 300
    "Microsoft.DBforMySQL/flexibleServers" = 200
    "Microsoft.DocumentDB/databaseAccounts" = 100

    # Caching
    "Microsoft.Cache/Redis" = @{
        "Basic" = 16
        "Standard" = 50
        "Premium" = 411
    }

    # Messaging
    "Microsoft.SignalRService/SignalR" = @{
        "Free_F1" = 0
        "Standard_S1" = 49
        "Premium_P1" = 100
    }

    # CDN/Front Door
    "Microsoft.Cdn/profiles" = @{
        "Standard_AzureFrontDoor" = 35
        "Premium_AzureFrontDoor" = 325
    }

    # Container Registry
    "Microsoft.ContainerRegistry/registries" = @{
        "Basic" = 5
        "Standard" = 20
        "Premium" = 450
    }

    # Storage
    "Microsoft.Storage/storageAccounts" = 15

    # Networking
    "Microsoft.Network/publicIPAddresses" = 4
    "Microsoft.Network/applicationGateways" = 200
    "Microsoft.Network/loadBalancers" = 20

    # Key Vault
    "Microsoft.KeyVault/vaults" = 1

    # Monitoring
    "Microsoft.OperationalInsights/workspaces" = 30
    "Microsoft.Insights/components" = 5
}

# Collect all resources
$report = @{
    GeneratedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Subscription = @{
        Name = $subscription.name
        Id = $subscription.id
    }
    Environments = @{}
    Summary = @{
        TotalMonthlyCost = 0
        ProductionCost = 0
        SharedCost = 0
        NonProductionCost = 0
        PotentialSavings = 0
    }
    Resources = @()
    Recommendations = @()
}

Write-Host "Scanning resources..." -ForegroundColor Gray

foreach ($envType in $resourceGroups.Keys) {
    $envCost = 0
    $envResources = @()

    foreach ($rgName in $resourceGroups[$envType]) {
        Write-Host "  Scanning $rgName..." -ForegroundColor Gray

        try {
            $resources = az resource list --resource-group $rgName -o json 2>$null | ConvertFrom-Json

            foreach ($res in $resources) {
                $resType = $res.type
                $resSku = $res.sku.name

                # Calculate cost
                $cost = 0
                if ($costMap.ContainsKey($resType)) {
                    $costEntry = $costMap[$resType]
                    if ($costEntry -is [hashtable]) {
                        if ($resSku -and $costEntry.ContainsKey($resSku)) {
                            $cost = $costEntry[$resSku]
                        }
                    } else {
                        $cost = $costEntry
                    }
                }

                $resourceInfo = @{
                    Name = $res.name
                    Type = $resType
                    TypeShort = ($resType -split '/')[-1]
                    ResourceGroup = $rgName
                    Environment = $envType
                    SKU = $resSku
                    EstimatedMonthlyCost = $cost
                }

                $report.Resources += $resourceInfo
                $envResources += $resourceInfo
                $envCost += $cost
            }
        } catch {
            Write-Host "    Warning: Could not scan $rgName" -ForegroundColor Yellow
        }
    }

    $report.Environments[$envType] = @{
        ResourceGroups = $resourceGroups[$envType]
        ResourceCount = $envResources.Count
        Resources = $envResources
        EstimatedMonthlyCost = $envCost
    }

    $report.Summary.TotalMonthlyCost += $envCost

    if ($envType -eq "Production") {
        $report.Summary.ProductionCost = $envCost
    } elseif ($envType -eq "Shared") {
        $report.Summary.SharedCost = $envCost
    } else {
        $report.Summary.NonProductionCost += $envCost
    }
}

# Calculate potential savings
$report.Summary.PotentialSavings = $report.Summary.NonProductionCost

# Generate recommendations
$report.Recommendations = @(
    @{
        Category = "Non-Production Shutdown"
        Potential = $report.Summary.NonProductionCost
        Description = "Deallocate/stop all dev and staging resources when not in use"
    }
)

# Check for expensive resources that could be downsized
foreach ($res in $report.Resources) {
    if ($res.Type -eq "Microsoft.Cache/Redis" -and $res.SKU -eq "Premium") {
        $report.Recommendations += @{
            Category = "Right-sizing"
            Resource = $res.Name
            Potential = 350
            Description = "Consider using Standard tier Redis for non-production ($411 -> $50/mo)"
        }
    }
    if ($res.Type -eq "Microsoft.ContainerRegistry/registries" -and $res.SKU -eq "Premium" -and $res.Environment -ne "Production") {
        $report.Recommendations += @{
            Category = "Right-sizing"
            Resource = $res.Name
            Potential = 430
            Description = "Use Basic tier ACR for dev/test ($450 -> $20/mo)"
        }
    }
}

# =============================================================================
# Generate Markdown Report
# =============================================================================
$md = @"
# Flamoral Dating Platform - Cost Analysis Report

**Generated:** $($report.GeneratedAt)
**Subscription:** $($report.Subscription.Name) ($($report.Subscription.Id))

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Total Estimated Monthly Cost** | `$$($report.Summary.TotalMonthlyCost) |
| Production Cost | `$$($report.Summary.ProductionCost) |
| Shared Infrastructure Cost | `$$($report.Summary.SharedCost) |
| Non-Production Cost | `$$($report.Summary.NonProductionCost) |
| **Potential Monthly Savings** | `$$($report.Summary.PotentialSavings) |

---

## Resource Inventory by Environment

"@

foreach ($envType in @("Production", "Shared", "Development", "Staging")) {
    if ($report.Environments.ContainsKey($envType)) {
        $env = $report.Environments[$envType]
        $md += @"

### $envType

- **Resource Groups:** $($env.ResourceGroups -join ', ')
- **Resource Count:** $($env.ResourceCount)
- **Estimated Monthly Cost:** `$$($env.EstimatedMonthlyCost)

| Resource | Type | SKU | Est. Cost |
|----------|------|-----|-----------|

"@
        foreach ($res in $env.Resources | Sort-Object -Property EstimatedMonthlyCost -Descending) {
            $md += "| $($res.Name) | $($res.TypeShort) | $($res.SKU) | `$$($res.EstimatedMonthlyCost) |`n"
        }
    }
}

$md += @"

---

## Cost Optimization Recommendations

"@

$totalPotentialSavings = 0
$i = 1
foreach ($rec in $report.Recommendations) {
    $md += @"
### $i. $($rec.Category)

"@
    if ($rec.Resource) {
        $md += "**Resource:** $($rec.Resource)`n`n"
    }
    $md += @"
**Potential Savings:** `$$($rec.Potential)/month

$($rec.Description)

"@
    $totalPotentialSavings += $rec.Potential
    $i++
}

$md += @"

---

## Total Potential Savings

If all recommendations are implemented:

| Current Monthly Cost | Potential Savings | New Monthly Cost |
|---------------------|-------------------|------------------|
| `$$($report.Summary.TotalMonthlyCost) | `$$totalPotentialSavings | `$$($report.Summary.TotalMonthlyCost - $totalPotentialSavings) |

**Annual Savings Potential:** `$$($totalPotentialSavings * 12)

---

## Actions Taken

### Resources Protected
- Production resource groups have resource locks applied
- Deletion protection enabled on critical resources

### Budget Alerts Configured
- Production: `$1,500/month with 50%, 75%, 90%, 100% alerts
- Development: `$100/month
- Staging: `$200/month
- Subscription Total: `$2,500/month

### Automation Available
- `shutdown-nonprod.ps1` - Stop all non-production resources
- `startup-nonprod.ps1` - Start non-production resources (requires approval)
- `inventory-resources.ps1` - Generate current resource inventory

---

## Next Steps

1. **Immediate:** Run shutdown-nonprod.ps1 to stop unused dev/test resources
2. **Short-term:** Review right-sizing recommendations
3. **Ongoing:** Monitor budget alerts and adjust thresholds as needed

---

*Report generated by Flamoral Cost Control Automation*
"@

# Save report
$md | Out-File -FilePath $OutputPath -Encoding UTF8
Write-Host ""
Write-Host "Report saved to: $OutputPath" -ForegroundColor Green

# Output summary to console
Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  COST SUMMARY" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Total Monthly Cost: `$$($report.Summary.TotalMonthlyCost)" -ForegroundColor White
Write-Host "  - Production: `$$($report.Summary.ProductionCost)" -ForegroundColor Green
Write-Host "  - Shared: `$$($report.Summary.SharedCost)" -ForegroundColor White
Write-Host "  - Non-Production: `$$($report.Summary.NonProductionCost)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Potential Savings: `$$totalPotentialSavings/month (`$$($totalPotentialSavings * 12)/year)" -ForegroundColor Green

return $report
