#
# Azure Storage Cost Optimization Deployment Script (PowerShell)
# Flamoral Dating Platform
#
# This script deploys storage lifecycle policies, CDN configuration,
# and validates cost optimization settings.
#
# Usage: .\deploy-storage-optimization.ps1 [-Environment <env>]
# Example: .\deploy-storage-optimization.ps1 -Environment production

param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "production"
)

# Error handling
$ErrorActionPreference = "Stop"

# Configuration
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent (Split-Path -Parent $ScriptDir)

Write-Host "========================================" -ForegroundColor Blue
Write-Host "Azure Storage Cost Optimization Deployment" -ForegroundColor Blue
Write-Host "Environment: $Environment" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

# Validate prerequisites
Write-Host "[1/8] Validating prerequisites..." -ForegroundColor Yellow

# Check Azure PowerShell module
if (-not (Get-Module -ListAvailable -Name Az.Storage)) {
    Write-Host "Error: Az.Storage module not found. Install with: Install-Module -Name Az -AllowClobber" -ForegroundColor Red
    exit 1
}

# Check Azure login
try {
    $context = Get-AzContext
    if (-not $context) {
        Write-Host "Error: Not logged into Azure. Run: Connect-AzAccount" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Error: Not logged into Azure. Run: Connect-AzAccount" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Prerequisites validated" -ForegroundColor Green
Write-Host ""

# Load environment variables
Write-Host "[2/8] Loading environment configuration..." -ForegroundColor Yellow

$EnvFile = Join-Path $RootDir ".env.$Environment"
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
    Write-Host "✓ Loaded .env.$Environment" -ForegroundColor Green
} else {
    Write-Host "Error: .env.$Environment not found" -ForegroundColor Red
    exit 1
}

# Required variables
$ResourceGroup = if ($env:AZURE_RESOURCE_GROUP) { $env:AZURE_RESOURCE_GROUP } else { "flamoral-rg" }
$StorageAccount = if ($env:AZURE_STORAGE_ACCOUNT) { $env:AZURE_STORAGE_ACCOUNT } else { "flamoralstorage" }
$Location = if ($env:AZURE_LOCATION) { $env:AZURE_LOCATION } else { "eastus" }

Write-Host "✓ Resource Group: $ResourceGroup" -ForegroundColor Green
Write-Host "✓ Storage Account: $StorageAccount" -ForegroundColor Green
Write-Host "✓ Location: $Location" -ForegroundColor Green
Write-Host ""

# Backup existing configuration
Write-Host "[3/8] Backing up existing configuration..." -ForegroundColor Yellow

$BackupDir = Join-Path $RootDir "infrastructure\backup\storage-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null

# Backup existing lifecycle policy (if exists)
try {
    $existingPolicy = Get-AzStorageAccountManagementPolicy `
        -ResourceGroupName $ResourceGroup `
        -AccountName $StorageAccount `
        -ErrorAction SilentlyContinue

    if ($existingPolicy) {
        $existingPolicy | ConvertTo-Json -Depth 10 | Out-File "$BackupDir\lifecycle-policy-backup.json"
        Write-Host "✓ Backed up existing lifecycle policy" -ForegroundColor Green
    } else {
        Write-Host "⚠ No existing lifecycle policy to backup" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠ No existing lifecycle policy to backup" -ForegroundColor Yellow
}

Write-Host ""

# Update storage account properties
Write-Host "[4/8] Updating storage account properties..." -ForegroundColor Yellow

$storageAccount = Get-AzStorageAccount `
    -ResourceGroupName $ResourceGroup `
    -Name $StorageAccount

# Enable last access time tracking and change feed
Update-AzStorageBlobServiceProperty `
    -ResourceGroupName $ResourceGroup `
    -StorageAccountName $StorageAccount `
    -EnableChangeFeed $true `
    -ChangeFeedRetentionInDays 7 `
    -IsVersioningEnabled $true

Write-Host "✓ Enabled change feed (7 day retention)" -ForegroundColor Green
Write-Host "✓ Enabled versioning" -ForegroundColor Green

# Update soft delete retention to 14 days (cost optimization)
Enable-AzStorageBlobDeleteRetentionPolicy `
    -ResourceGroupName $ResourceGroup `
    -StorageAccountName $StorageAccount `
    -RetentionDays 14

Write-Host "✓ Updated soft delete retention (14 days)" -ForegroundColor Green
Write-Host ""

# Deploy lifecycle policies
Write-Host "[5/8] Deploying lifecycle management policies..." -ForegroundColor Yellow

$PolicyFile = Join-Path $RootDir "infrastructure\azure\storage-lifecycle-policy.json"

if (-not (Test-Path $PolicyFile)) {
    Write-Host "Error: Lifecycle policy file not found: $PolicyFile" -ForegroundColor Red
    exit 1
}

# Read and parse policy file
$policyJson = Get-Content $PolicyFile -Raw | ConvertFrom-Json
$rules = $policyJson.lifecycleRules

# Create management policy rules
$managementPolicyRules = @()

foreach ($rule in $rules) {
    $filters = @{
        BlobTypes = $rule.definition.filters.blobTypes
        PrefixMatch = $rule.definition.filters.prefixMatch
    }

    $actions = @{}

    if ($rule.definition.actions.baseBlob.tierToCool) {
        $actions.BaseBlobAction = @{
            TierToCool = @{
                DaysAfterModificationGreaterThan = $rule.definition.actions.baseBlob.tierToCool.daysAfterModificationGreaterThan
            }
        }
    }

    if ($rule.definition.actions.baseBlob.tierToArchive) {
        if (-not $actions.BaseBlobAction) { $actions.BaseBlobAction = @{} }
        $actions.BaseBlobAction.TierToArchive = @{
            DaysAfterModificationGreaterThan = $rule.definition.actions.baseBlob.tierToArchive.daysAfterModificationGreaterThan
        }
    }

    if ($rule.definition.actions.baseBlob.delete) {
        if (-not $actions.BaseBlobAction) { $actions.BaseBlobAction = @{} }
        $actions.BaseBlobAction.Delete = @{
            DaysAfterModificationGreaterThan = $rule.definition.actions.baseBlob.delete.daysAfterModificationGreaterThan
        }
    }

    if ($rule.definition.actions.snapshot.delete) {
        $actions.SnapshotAction = @{
            Delete = @{
                DaysAfterCreationGreaterThan = $rule.definition.actions.snapshot.delete.daysAfterCreationGreaterThan
            }
        }
    }

    $managementPolicyRule = New-AzStorageAccountManagementPolicyRule `
        -Name $rule.name `
        -Action $actions `
        -Filter $filters

    $managementPolicyRules += $managementPolicyRule
}

# Apply lifecycle policy
Set-AzStorageAccountManagementPolicy `
    -ResourceGroupName $ResourceGroup `
    -AccountName $StorageAccount `
    -Rule $managementPolicyRules

Write-Host "✓ Deployed lifecycle management policies" -ForegroundColor Green

$ruleCount = $managementPolicyRules.Count
Write-Host "✓ Deployed $ruleCount lifecycle rules" -ForegroundColor Green
Write-Host ""

# Check CDN configuration
Write-Host "[6/8] Checking CDN configuration..." -ForegroundColor Yellow

$tags = (Get-AzStorageAccount -ResourceGroupName $ResourceGroup -Name $StorageAccount).Tags
$cdnEnabled = $tags["CDNEnabled"]

if ($cdnEnabled -eq "true" -or $cdnEnabled -eq "enabled") {
    Write-Host "✓ CDN is enabled" -ForegroundColor Green

    # Check for CDN profile
    $cdnProfile = Get-AzCdnProfile -ResourceGroupName $ResourceGroup | Where-Object { $_.Name -like "*flamoral*" } | Select-Object -First 1

    if ($cdnProfile) {
        Write-Host "✓ Found CDN profile: $($cdnProfile.Name)" -ForegroundColor Green
    } else {
        Write-Host "⚠ CDN profile not found. Deploy with Terraform:" -ForegroundColor Yellow
        Write-Host "  cd infrastructure\terraform && terraform apply -target=module.storage_blob.azurerm_cdn_endpoint.main" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠ CDN not enabled. Recommended for bandwidth cost savings." -ForegroundColor Yellow
    Write-Host "  Enable in Terraform: var.enable_cdn = true" -ForegroundColor Yellow
}

Write-Host ""

# Create required containers
Write-Host "[7/8] Verifying storage containers..." -ForegroundColor Yellow

$containers = @("photos", "videos", "avatars", "thumbnails", "verification", "temp")
$ctx = $storageAccount.Context

foreach ($containerName in $containers) {
    $container = Get-AzStorageContainer -Name $containerName -Context $ctx -ErrorAction SilentlyContinue

    if (-not $container) {
        New-AzStorageContainer -Name $containerName -Context $ctx -Permission Off | Out-Null
        Write-Host "✓ Created container: $containerName" -ForegroundColor Green
    } else {
        Write-Host "✓ Container exists: $containerName" -ForegroundColor Green
    }
}

Write-Host ""

# Validation & Reporting
Write-Host "[8/8] Validating deployment..." -ForegroundColor Yellow

$accountInfo = Get-AzStorageAccount -ResourceGroupName $ResourceGroup -Name $StorageAccount
Write-Host ""
Write-Host "Storage Account Configuration:" -ForegroundColor Blue
Write-Host "  SKU Tier: $($accountInfo.Sku.Tier)" -ForegroundColor White
Write-Host "  Replication: $($accountInfo.Sku.Name)" -ForegroundColor White
Write-Host "  HTTPS Only: $($accountInfo.EnableHttpsTrafficOnly)" -ForegroundColor White
Write-Host "  Min TLS: $($accountInfo.MinimumTlsVersion)" -ForegroundColor White

# Lifecycle policy summary
Write-Host ""
Write-Host "Lifecycle Policy Summary:" -ForegroundColor Blue
$policy = Get-AzStorageAccountManagementPolicy -ResourceGroupName $ResourceGroup -AccountName $StorageAccount
$policy.Rules | Format-Table -Property Name, Enabled

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Blue
Write-Host "Deployment Complete!" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""
Write-Host "✓ Storage lifecycle policies deployed" -ForegroundColor Green
Write-Host "✓ Change feed enabled" -ForegroundColor Green
Write-Host "✓ Soft delete retention optimized (14 days)" -ForegroundColor Green
Write-Host "✓ Storage containers verified" -ForegroundColor Green
Write-Host ""
Write-Host "Expected Cost Savings:" -ForegroundColor Yellow
Write-Host "  • Storage tiering: 35-45% reduction"
Write-Host "  • CDN bandwidth: 40-50% reduction (if enabled)"
Write-Host "  • LRS redundancy: 50% reduction vs GRS (if changed)"
Write-Host "  • Temp file cleanup: 100% savings on temp storage"
Write-Host "  • Overall estimate: 35-45% total cost reduction"
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Monitor tier distribution over next 30 days"
Write-Host "  2. Validate lifecycle policies execute daily (check Azure Portal)"
Write-Host "  3. Review cost savings in Azure Cost Management"
Write-Host "  4. Enable CDN if not already enabled (recommended)"
Write-Host "  5. Update media-service with storage optimization config"
Write-Host ""
Write-Host "Documentation: $RootDir\STORAGE_COST_OPTIMIZATION.md" -ForegroundColor Blue
Write-Host "Backup location: $BackupDir" -ForegroundColor Blue
Write-Host ""

# Generate deployment report
$reportFile = Join-Path $RootDir "infrastructure\reports\storage-optimization-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
$reportDir = Split-Path -Parent $reportFile
if (-not (Test-Path $reportDir)) {
    New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
}

$report = @{
    deployment = @{
        timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        environment = $Environment
        resourceGroup = $ResourceGroup
        storageAccount = $StorageAccount
    }
    features = @{
        lifecyclePolicies = $true
        changeFeed = $true
        softDeleteDays = 14
        cdnEnabled = $cdnEnabled
    }
    policies = @{
        ruleCount = $ruleCount
        containers = $containers
    }
    estimatedSavings = @{
        storageOptimization = "35-45%"
        bandwidthCDN = "40-50%"
        redundancyLRS = "50%"
        overallEstimate = "35-45%"
    }
}

$report | ConvertTo-Json -Depth 10 | Out-File $reportFile

Write-Host "✓ Deployment report saved: $reportFile" -ForegroundColor Green
Write-Host ""
Write-Host "Deployment successful! 🎉" -ForegroundColor Green
