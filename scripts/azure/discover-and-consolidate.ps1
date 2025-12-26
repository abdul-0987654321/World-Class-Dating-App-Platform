#Requires -Version 7.0
<#
.SYNOPSIS
    Flamoral Azure Resource Discovery and Consolidation Script

.DESCRIPTION
    This script discovers, inventories, and safely plans consolidation of
    Flamoral dating platform resources in Azure.

    SAFETY: This script is READ-ONLY by default. It only generates plans
    and commands but does NOT execute any destructive operations.

.PARAMETER SubscriptionId
    The Azure subscription ID to use.

.PARAMETER TargetResourceGroup
    The authoritative resource group for Flamoral resources.

.PARAMETER DryRun
    When true (default), only generates plans without making changes.

.PARAMETER ForceDelete
    When true, allows generation of delete commands.

.PARAMETER OutputDir
    Directory for output files. Defaults to ./azure-discovery-<timestamp>

.EXAMPLE
    .\discover-and-consolidate.ps1

.EXAMPLE
    .\discover-and-consolidate.ps1 -DryRun $false

.EXAMPLE
    .\discover-and-consolidate.ps1 -TargetResourceGroup "flamoral-dev-rg"

.NOTES
    Author: Flamoral Platform Team
    Date: 2024
#>

[CmdletBinding()]
param(
    [Parameter()]
    [string]$SubscriptionId = "ebd1613e-fea0-4b6d-8918-7e4de6a71c44",

    [Parameter()]
    [string]$TargetResourceGroup = "flamoral-prod-rg",

    [Parameter()]
    [bool]$DryRun = $true,

    [Parameter()]
    [bool]$ForceDelete = $false,

    [Parameter()]
    [string]$OutputDir = ""
)

# Set strict mode
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

#-------------------------------------------------------------------------------
# Configuration
#-------------------------------------------------------------------------------
if ([string]::IsNullOrEmpty($OutputDir)) {
    $OutputDir = "./azure-discovery-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
}

# Resource identification patterns
$NamePatterns = @("flamoral", "dating", "-prod-", "-dev-", "-staging-", "-test-")
$FlamoralTagValues = @("flamoral", "dating", "Flamoral", "Dating")

#-------------------------------------------------------------------------------
# Helper Functions
#-------------------------------------------------------------------------------
function Write-LogInfo {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-LogSuccess {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-LogWarning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-LogError {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Write-LogSection {
    param([string]$Title)
    Write-Host ""
    Write-Host ("=" * 79) -ForegroundColor White
    Write-Host " $Title" -ForegroundColor White
    Write-Host ("=" * 79) -ForegroundColor White
}

function Test-AzureCLI {
    try {
        $null = az version 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Azure CLI check failed"
        }
    }
    catch {
        Write-LogError "Azure CLI (az) is not installed. Please install it first."
        exit 1
    }

    try {
        $null = az account show 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Not logged in"
        }
    }
    catch {
        Write-LogError "Not logged in to Azure. Please run 'az login' first."
        exit 1
    }
}

function Initialize-OutputDirectory {
    if (-not (Test-Path $OutputDir)) {
        New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    }
    Write-LogInfo "Output directory: $OutputDir"
}

function Test-IsFlamoralResource {
    param(
        [Parameter(Mandatory)]
        [PSObject]$Resource
    )

    $name = $Resource.name.ToLower()
    $resourceGroup = $Resource.resourceGroup.ToLower()

    # Check name patterns
    foreach ($pattern in $NamePatterns) {
        if ($name.Contains($pattern.ToLower()) -or $resourceGroup.Contains($pattern.ToLower())) {
            return $true
        }
    }

    # Check tags
    if ($null -ne $Resource.tags) {
        foreach ($tagValue in $FlamoralTagValues) {
            if ($Resource.tags.project -eq $tagValue -or
                $Resource.tags.application -eq $tagValue) {
                return $true
            }
        }
    }

    return $false
}

#-------------------------------------------------------------------------------
# Phase 1: Discovery (READ-ONLY)
#-------------------------------------------------------------------------------
function Invoke-ResourceDiscovery {
    Write-LogSection "PHASE 1: RESOURCE DISCOVERY (READ-ONLY)"

    # Set subscription
    Write-LogInfo "Setting subscription to: $SubscriptionId"
    az account set --subscription $SubscriptionId
    if ($LASTEXITCODE -ne 0) {
        Write-LogError "Failed to set subscription"
        exit 1
    }

    # Get current subscription info
    Write-LogInfo "Current subscription:"
    az account show --output table

    # Discover all resource groups
    Write-LogInfo "Discovering resource groups..."
    $resourceGroups = az group list --output json | ConvertFrom-Json
    $resourceGroups | ConvertTo-Json -Depth 10 | Out-File "$OutputDir/resource-groups.json" -Encoding UTF8
    az group list --output table | Out-File "$OutputDir/resource-groups.txt" -Encoding UTF8

    Write-LogSuccess "Found $($resourceGroups.Count) resource groups"

    # Discover all resources
    Write-LogInfo "Discovering all resources (this may take a moment)..."
    $allResources = az resource list --output json | ConvertFrom-Json
    $allResources | ConvertTo-Json -Depth 10 | Out-File "$OutputDir/all-resources.json" -Encoding UTF8
    az resource list --output table | Out-File "$OutputDir/all-resources.txt" -Encoding UTF8

    Write-LogSuccess "Found $($allResources.Count) total resources"

    # Create resource inventory with detailed info
    Write-LogInfo "Creating detailed resource inventory..."
    $inventory = $allResources | ForEach-Object {
        [PSCustomObject]@{
            id            = $_.id
            name          = $_.name
            type          = $_.type
            location      = $_.location
            resourceGroup = $_.resourceGroup
            tags          = $_.tags
            sku           = $_.sku
            kind          = $_.kind
            managedBy     = $_.managedBy
        }
    }
    $inventory | ConvertTo-Json -Depth 10 | Out-File "$OutputDir/resource-inventory.json" -Encoding UTF8

    return $allResources
}

#-------------------------------------------------------------------------------
# Phase 2: Identification
#-------------------------------------------------------------------------------
function Invoke-ResourceIdentification {
    param(
        [Parameter(Mandatory)]
        [array]$AllResources
    )

    Write-LogSection "PHASE 2: RESOURCE IDENTIFICATION"
    Write-LogInfo "Identifying Flamoral resources by patterns and tags..."

    # Identify Flamoral resources
    $flamoralResources = $AllResources | Where-Object { Test-IsFlamoralResource -Resource $_ }
    $flamoralResources | ConvertTo-Json -Depth 10 | Out-File "$OutputDir/flamoral-resources.json" -Encoding UTF8

    Write-LogSuccess "Identified $($flamoralResources.Count) Flamoral resources"

    # Identify non-Flamoral resources
    $nonFlamoralResources = $AllResources | Where-Object { -not (Test-IsFlamoralResource -Resource $_) }
    $nonFlamoralResources | ConvertTo-Json -Depth 10 | Out-File "$OutputDir/non-flamoral-resources.json" -Encoding UTF8

    Write-LogInfo "Found $($nonFlamoralResources.Count) non-Flamoral resources (will be excluded)"

    # Group resources by resource group
    Write-LogInfo "Grouping resources by resource group..."
    $groupedResources = $flamoralResources | Group-Object -Property resourceGroup | ForEach-Object {
        [PSCustomObject]@{
            resourceGroup = $_.Name
            count         = $_.Count
            resources     = $_.Group | ForEach-Object {
                [PSCustomObject]@{
                    name = $_.name
                    type = $_.type
                }
            }
        }
    }
    $groupedResources | ConvertTo-Json -Depth 10 | Out-File "$OutputDir/resources-by-group.json" -Encoding UTF8

    # Create evidence files for each resource
    Write-LogInfo "Creating evidence files..."
    $evidenceDir = Join-Path $OutputDir "evidence"
    if (-not (Test-Path $evidenceDir)) {
        New-Item -ItemType Directory -Path $evidenceDir -Force | Out-Null
    }

    foreach ($resource in $flamoralResources) {
        $safeName = $resource.name -replace '[/:]', '_'
        $resource | ConvertTo-Json -Depth 10 | Out-File "$evidenceDir/$safeName.json" -Encoding UTF8
    }

    Write-LogSuccess "Evidence files created in $evidenceDir/"

    return $flamoralResources
}

#-------------------------------------------------------------------------------
# Phase 3: Dependency Analysis
#-------------------------------------------------------------------------------
function Invoke-DependencyAnalysis {
    param(
        [Parameter(Mandatory)]
        [array]$FlamoralResources
    )

    Write-LogSection "PHASE 3: DEPENDENCY ANALYSIS"

    # Analyze VNets and Subnets
    Write-LogInfo "Analyzing Virtual Networks..."
    $vnets = $FlamoralResources | Where-Object { $_.type -eq "Microsoft.Network/virtualNetworks" }
    foreach ($vnet in $vnets) {
        $vnetName = Split-Path $vnet.id -Leaf
        $rg = $vnet.resourceGroup
        Write-LogInfo "  Checking VNet: $vnetName"

        try {
            $subnets = az network vnet subnet list --resource-group $rg --vnet-name $vnetName --output json 2>$null
            if ($subnets) {
                $subnets | Out-File "$OutputDir/vnet-subnets-$vnetName.json" -Encoding UTF8
            }
        }
        catch {
            Write-LogWarning "  Could not get subnets for $vnetName"
        }
    }

    # Analyze AKS clusters
    Write-LogInfo "Analyzing AKS clusters..."
    $aksClusters = $FlamoralResources | Where-Object { $_.type -eq "Microsoft.ContainerService/managedClusters" }
    foreach ($aks in $aksClusters) {
        $aksName = Split-Path $aks.id -Leaf
        $rg = $aks.resourceGroup
        Write-LogInfo "  Checking AKS: $aksName"

        try {
            $nodePools = az aks nodepool list --resource-group $rg --cluster-name $aksName --output json 2>$null
            if ($nodePools) {
                $nodePools | Out-File "$OutputDir/aks-nodepools-$aksName.json" -Encoding UTF8
            }

            $aksDetails = az aks show --resource-group $rg --name $aksName --output json 2>$null
            if ($aksDetails) {
                $aksDetails | Out-File "$OutputDir/aks-details-$aksName.json" -Encoding UTF8
            }
        }
        catch {
            Write-LogWarning "  Could not get details for AKS $aksName"
        }
    }

    # Analyze databases
    Write-LogInfo "Analyzing databases..."
    $databases = $FlamoralResources | Where-Object {
        $_.type -in @(
            "Microsoft.DBforPostgreSQL/flexibleServers",
            "Microsoft.DBforPostgreSQL/servers",
            "Microsoft.Sql/servers",
            "Microsoft.DocumentDB/databaseAccounts"
        )
    }
    if ($databases.Count -gt 0) {
        $databases | ConvertTo-Json -Depth 10 | Out-File "$OutputDir/databases.json" -Encoding UTF8
        Write-LogInfo "  Found $($databases.Count) database resources"
    }

    # Analyze Key Vaults
    Write-LogInfo "Analyzing Key Vaults..."
    $keyVaults = $FlamoralResources | Where-Object { $_.type -eq "Microsoft.KeyVault/vaults" }
    if ($keyVaults.Count -gt 0) {
        $keyVaults | ConvertTo-Json -Depth 10 | Out-File "$OutputDir/keyvaults.json" -Encoding UTF8

        foreach ($kv in $keyVaults) {
            $kvName = Split-Path $kv.id -Leaf
            $rg = $kv.resourceGroup
            Write-LogInfo "  Checking Key Vault: $kvName"

            try {
                $kvDetails = az keyvault show --name $kvName --resource-group $rg --output json 2>$null
                if ($kvDetails) {
                    $kvDetails | Out-File "$OutputDir/keyvault-$kvName.json" -Encoding UTF8
                }
            }
            catch {
                Write-LogWarning "  Could not get details for Key Vault $kvName"
            }
        }
        Write-LogWarning "Key Vaults found - these should NEVER be deleted (soft-delete issues)"
    }

    # Analyze Private Endpoints
    Write-LogInfo "Analyzing Private Endpoints..."
    $privateEndpoints = $FlamoralResources | Where-Object { $_.type -eq "Microsoft.Network/privateEndpoints" }
    if ($privateEndpoints.Count -gt 0) {
        $privateEndpoints | ConvertTo-Json -Depth 10 | Out-File "$OutputDir/private-endpoints.json" -Encoding UTF8
        Write-LogInfo "  Found $($privateEndpoints.Count) private endpoints"
    }

    # Check for resources managed by other resources
    Write-LogInfo "Checking for managed resources..."
    $managedResources = $FlamoralResources |
    Where-Object { $null -ne $_.managedBy } |
    Group-Object -Property managedBy |
    ForEach-Object {
        [PSCustomObject]@{
            managedBy = $_.Name
            resources = $_.Group | ForEach-Object {
                [PSCustomObject]@{
                    name = $_.name
                    type = $_.type
                }
            }
        }
    }
    $managedResources | ConvertTo-Json -Depth 10 | Out-File "$OutputDir/managed-resources.json" -Encoding UTF8

    Write-LogSuccess "Dependency analysis complete"
}

#-------------------------------------------------------------------------------
# Phase 4: Consolidation Plan
#-------------------------------------------------------------------------------
function New-ConsolidationPlan {
    param(
        [Parameter(Mandatory)]
        [array]$FlamoralResources
    )

    Write-LogSection "PHASE 4: CONSOLIDATION PLAN"

    $planFile = Join-Path $OutputDir "consolidation-plan.md"
    $moveFile = Join-Path $OutputDir "move-commands.ps1"
    $deleteFile = Join-Path $OutputDir "delete-commands.ps1"
    $rollbackFile = Join-Path $OutputDir "rollback-plan.md"

    # Get resources in target RG vs other RGs
    $inTarget = $FlamoralResources | Where-Object { $_.resourceGroup -eq $TargetResourceGroup }
    $outsideTarget = $FlamoralResources | Where-Object { $_.resourceGroup -ne $TargetResourceGroup }

    Write-LogInfo "Resources in ${TargetResourceGroup}: $($inTarget.Count)"
    Write-LogInfo "Resources outside ${TargetResourceGroup}: $($outsideTarget.Count)"

    #---------------------------------------------------------------------------
    # Generate Consolidation Plan (Markdown)
    #---------------------------------------------------------------------------
    $inTargetTable = ($inTarget | ForEach-Object { "| $($_.name) | $($_.type) |" }) -join "`n"
    $outsideTargetTable = ($outsideTarget | ForEach-Object { "| $($_.name) | $($_.resourceGroup) | $($_.type) |" }) -join "`n"
    $keyVaultWarnings = ($FlamoralResources | Where-Object { $_.type -eq "Microsoft.KeyVault/vaults" } | ForEach-Object { "- **Key Vault:** $($_.name) - DO NOT DELETE" }) -join "`n"
    $outsideTargetLocations = ($outsideTarget | ForEach-Object { "- **$($_.name)**: $($_.resourceGroup)" }) -join "`n"

    $planContent = @"
# Flamoral Azure Resource Consolidation Plan

**Generated:** $(Get-Date)
**Subscription:** $SubscriptionId
**Target Resource Group:** $TargetResourceGroup
**Mode:** $(if ($DryRun) { "DRY RUN" } else { "LIVE" })

## Summary

| Category | Count |
|----------|-------|
| Total Flamoral Resources | $($FlamoralResources.Count) |
| Already in Target RG | $($inTarget.Count) |
| Need to be Moved | $($outsideTarget.Count) |

## Resources Already in Target RG

These resources are already in ``$TargetResourceGroup`` and require no action:

| Name | Type |
|------|------|
$inTargetTable

## Resources to be Moved

These resources are in other resource groups and may be candidates for consolidation:

| Name | Current RG | Type |
|------|------------|------|
$outsideTargetTable

## Resources NOT to be Moved

The following resource types should NOT be moved due to limitations or risks:

- **Key Vaults** - Soft-delete complications, secret references
- **Managed Identities** - Role assignments may break
- **AKS Node Resource Groups** - Managed by AKS
- **Resources with Active Connections** - May cause downtime

## Safety Warnings

$keyVaultWarnings

## Recommended Actions

1. Review this plan carefully before executing any commands
2. Ensure you have backups of all critical resources
3. Run move commands during maintenance window
4. Test all services after moves complete
5. Keep rollback plan ready

## Files Generated

- ``move-commands.ps1`` - Commands to move resources (review before executing)
- ``delete-commands.ps1`` - Commands to delete resources (DANGEROUS - requires manual review)
- ``rollback-plan.md`` - Steps to rollback if issues occur
- ``resource-inventory.json`` - Full inventory of all resources
"@

    $planContent | Out-File $planFile -Encoding UTF8
    Write-LogSuccess "Consolidation plan created: $planFile"

    #---------------------------------------------------------------------------
    # Generate Move Commands (PowerShell)
    #---------------------------------------------------------------------------
    $moveCommands = @"
#Requires -Version 7.0
<#
.SYNOPSIS
    Flamoral Resource Move Commands

.DESCRIPTION
    GENERATED FILE - Review carefully before executing!
    This script moves resources to the target resource group.
    Some resources may not be movable - check Azure documentation.

.PARAMETER DryRun
    When true (default), only previews changes without making them.
#>

[CmdletBinding()]
param(
    [Parameter()]
    [bool]`$DryRun = `$true
)

`$ErrorActionPreference = "Stop"

`$SubscriptionId = "$SubscriptionId"
`$TargetResourceGroup = "$TargetResourceGroup"

az account set --subscription `$SubscriptionId

Write-Host "Moving resources to: `$TargetResourceGroup"
Write-Host "Dry run mode: `$DryRun"
Write-Host ""

"@

    foreach ($resource in $outsideTarget) {
        # Skip resources that shouldn't be moved
        if ($resource.type -eq "Microsoft.KeyVault/vaults" -or
            $resource.type -eq "Microsoft.ManagedIdentity/userAssignedIdentities" -or
            $null -ne $resource.managedBy) {
            continue
        }

        $moveCommands += @"

# Move: $($resource.name) ($($resource.type))
if (`$DryRun) {
    Write-Host "[DRY RUN] Would move: $($resource.name)"
} else {
    Write-Host "Moving: $($resource.name)"
    try {
        az resource move --destination-group `$TargetResourceGroup --ids "$($resource.id)"
    } catch {
        Write-Warning "Failed to move: $($resource.name)"
    }
}

"@
    }

    $moveCommands | Out-File $moveFile -Encoding UTF8
    Write-LogSuccess "Move commands generated: $moveFile"

    #---------------------------------------------------------------------------
    # Generate Delete Commands (with safety checks)
    #---------------------------------------------------------------------------
    $deleteCommands = @"
#Requires -Version 7.0
<#
.SYNOPSIS
    Flamoral Resource Delete Commands

.DESCRIPTION
    DANGEROUS - This script deletes resources!

    SAFETY REQUIREMENTS:
    1. ForceDelete must be set to `$true
    2. Each resource requires manual confirmation
    3. Key Vaults are NEVER deleted
    4. Resources with active connections are skipped

.PARAMETER ForceDelete
    Must be set to `$true to enable deletions.
#>

[CmdletBinding()]
param(
    [Parameter()]
    [bool]`$ForceDelete = `$false
)

if (-not `$ForceDelete) {
    Write-Host "ERROR: This script requires -ForceDelete `$true to run" -ForegroundColor Red
    Write-Host "This is a safety measure to prevent accidental deletions" -ForegroundColor Red
    exit 1
}

`$SubscriptionId = "$SubscriptionId"
az account set --subscription `$SubscriptionId

Write-Host "==========================================" -ForegroundColor Red
Write-Host "  DANGER: RESOURCE DELETION SCRIPT" -ForegroundColor Red
Write-Host "==========================================" -ForegroundColor Red
Write-Host ""
Write-Host "This script will DELETE resources."
Write-Host "Press Ctrl+C to abort."
Write-Host ""

`$confirmation = Read-Host "Type 'DELETE' to continue"
if (`$confirmation -ne "DELETE") {
    Write-Host "Aborted."
    exit 1
}

# No resources are automatically marked for deletion.
# Review the resource inventory and manually add delete commands for truly redundant resources.
#
# Example format:
# Write-Host "Deleting: <resource-name>"
# az resource delete --ids "<resource-id>" --verbose
#
# NEVER DELETE:
# - Key Vaults (soft-delete issues)
# - Resources with active connections
# - AKS node resource groups
# - Resources referenced by other resources

Write-Host "No automatic deletions configured."
Write-Host "Review resource-inventory.json and manually add delete commands if needed."
"@

    $deleteCommands | Out-File $deleteFile -Encoding UTF8
    Write-LogSuccess "Delete commands generated: $deleteFile"

    #---------------------------------------------------------------------------
    # Generate Rollback Plan
    #---------------------------------------------------------------------------
    $rollbackContent = @"
# Flamoral Resource Consolidation - Rollback Plan

**Generated:** $(Get-Date)

## Pre-Move Checklist

Before executing any moves:

1. [ ] Export all resource configurations: ``az resource show --ids <id> > backup.json``
2. [ ] Document current resource group assignments
3. [ ] Verify all services are healthy
4. [ ] Notify team of maintenance window
5. [ ] Have Azure support contact ready

## Rollback Procedures

### If Move Fails

1. Check Azure Activity Log for errors
2. Verify resource is still in original location
3. Check for lock or policy violations
4. Retry with ``--verbose`` flag

### If Service Disruption Occurs

1. Check AKS cluster status: ``az aks show -g <rg> -n <name>``
2. Check database connectivity
3. Verify private endpoint status
4. Check Key Vault access policies

### Emergency Contacts

- Azure Support: https://portal.azure.com/#blade/Microsoft_Azure_Support/HelpAndSupportBlade
- Team Lead: [Add contact]
- On-call: [Add contact]

## Resource Original Locations

$outsideTargetLocations

## Post-Rollback Verification

1. [ ] All services responding
2. [ ] Database connections working
3. [ ] AKS pods running
4. [ ] Monitoring alerts clear
"@

    $rollbackContent | Out-File $rollbackFile -Encoding UTF8
    Write-LogSuccess "Rollback plan generated: $rollbackFile"
}

#-------------------------------------------------------------------------------
# Phase 5: Safety Summary
#-------------------------------------------------------------------------------
function Write-SafetySummary {
    Write-LogSection "SAFETY SUMMARY"

    Write-LogInfo "Generated files in: $OutputDir"
    Write-Host ""
    Write-Host "  Resource Inventory:"
    Write-Host "    - resource-inventory.json     Complete resource list"
    Write-Host "    - flamoral-resources.json     Flamoral-specific resources"
    Write-Host "    - non-flamoral-resources.json Resources to exclude"
    Write-Host "    - resources-by-group.json     Resources grouped by RG"
    Write-Host ""
    Write-Host "  Analysis:"
    Write-Host "    - managed-resources.json      Resource dependencies"
    Write-Host "    - evidence/                   Per-resource evidence files"
    Write-Host ""
    Write-Host "  Action Plans:"
    Write-Host "    - consolidation-plan.md       Human-readable plan"
    Write-Host "    - move-commands.ps1           Resource move commands"
    Write-Host "    - delete-commands.ps1         Resource delete commands"
    Write-Host "    - rollback-plan.md            Emergency rollback steps"
    Write-Host ""

    Write-LogWarning "IMPORTANT SAFETY NOTES:"
    Write-Host ""
    Write-Host "  1. This script performed READ-ONLY operations"
    Write-Host "  2. Review consolidation-plan.md before any actions"
    Write-Host "  3. move-commands.ps1 runs in DRY RUN mode by default"
    Write-Host "  4. delete-commands.ps1 requires -ForceDelete `$true"
    Write-Host "  5. Key Vaults are NEVER deleted automatically"
    Write-Host "  6. Always have a rollback plan ready"
    Write-Host ""

    if ($DryRun) {
        Write-LogInfo "DRY RUN mode - no changes were made"
    }
    else {
        Write-LogWarning "LIVE mode - review all generated scripts before execution"
    }
}

#-------------------------------------------------------------------------------
# Main Execution
#-------------------------------------------------------------------------------
function Main {
    Write-Host ""
    Write-Host "+=============================================================================+" -ForegroundColor Cyan
    Write-Host "|     Flamoral Azure Resource Discovery and Consolidation Script             |" -ForegroundColor Cyan
    Write-Host "|                                                                             |" -ForegroundColor Cyan
    Write-Host "|     Mode: $(if ($DryRun) { 'DRY RUN (Read-Only)' } else { 'LIVE              ' })                                          |" -ForegroundColor Cyan
    Write-Host "+=============================================================================+" -ForegroundColor Cyan
    Write-Host ""

    Test-AzureCLI
    Initialize-OutputDirectory

    $allResources = Invoke-ResourceDiscovery
    $flamoralResources = Invoke-ResourceIdentification -AllResources $allResources
    Invoke-DependencyAnalysis -FlamoralResources $flamoralResources
    New-ConsolidationPlan -FlamoralResources $flamoralResources
    Write-SafetySummary

    Write-LogSuccess "Discovery and planning complete!"
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "  1. Review: $OutputDir/consolidation-plan.md"
    Write-Host "  2. Review: $OutputDir/move-commands.ps1"
    Write-Host "  3. Execute moves during maintenance window"
    Write-Host ""
}

# Run main function
Main
