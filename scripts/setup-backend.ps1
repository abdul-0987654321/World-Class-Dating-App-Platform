#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Sets up Azure Storage backend for Terraform state management.

.DESCRIPTION
    This script creates the necessary Azure resources for storing Terraform state:
    - Resource Group: rg-terraform-state-westus2
    - Storage Account: sttfstatedatingplatform (with versioning enabled)
    - Container: tfstate
    - Enables soft delete and point-in-time recovery

.PARAMETER SubscriptionId
    The Azure subscription ID. Defaults to the DatingPlatform subscription.

.PARAMETER Location
    The Azure region. Defaults to westus2.

.EXAMPLE
    .\setup-backend.ps1
    .\setup-backend.ps1 -SubscriptionId "your-subscription-id" -Location "eastus2"

.NOTES
    Author: DatingPlatform DevOps Team
    Requires: Azure CLI, Azure PowerShell module
#>

[CmdletBinding()]
param(
    [Parameter()]
    [string]$SubscriptionId = "ebd1613e-fea0-4b6d-8918-7e4de6a71c44",

    [Parameter()]
    [string]$Location = "westus2",

    [Parameter()]
    [string]$ResourceGroupName = "rg-terraform-state-westus2",

    [Parameter()]
    [string]$StorageAccountName = "sttfstatedatingplatform",

    [Parameter()]
    [string]$ContainerName = "tfstate"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Terraform Backend Setup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Azure CLI is installed
try {
    $azVersion = az version --output json | ConvertFrom-Json
    Write-Host "Azure CLI Version: $($azVersion.'azure-cli')" -ForegroundColor Green
}
catch {
    Write-Error "Azure CLI is not installed. Please install it from https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
}

# Check if logged in
Write-Host "Checking Azure login status..." -ForegroundColor Yellow
$account = az account show --output json 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Host "Not logged in. Initiating login..." -ForegroundColor Yellow
    az login --tenant "citadelcloudmanagementgmail.onmicrosoft.com"
}

# Set subscription
Write-Host "Setting subscription to: $SubscriptionId" -ForegroundColor Yellow
az account set --subscription $SubscriptionId

# Verify subscription
$currentSub = az account show --output json | ConvertFrom-Json
Write-Host "Current Subscription: $($currentSub.name) ($($currentSub.id))" -ForegroundColor Green

# Create Resource Group
Write-Host ""
Write-Host "Creating Resource Group: $ResourceGroupName" -ForegroundColor Yellow
$rgExists = az group exists --name $ResourceGroupName
if ($rgExists -eq "true") {
    Write-Host "Resource Group already exists." -ForegroundColor Green
}
else {
    az group create `
        --name $ResourceGroupName `
        --location $Location `
        --tags "Purpose=TerraformState" "Project=DatingPlatform" "ManagedBy=Terraform" `
        --output none
    Write-Host "Resource Group created successfully." -ForegroundColor Green
}

# Create Storage Account
Write-Host ""
Write-Host "Creating Storage Account: $StorageAccountName" -ForegroundColor Yellow
$saExists = az storage account show --name $StorageAccountName --resource-group $ResourceGroupName 2>$null
if ($saExists) {
    Write-Host "Storage Account already exists." -ForegroundColor Green
}
else {
    az storage account create `
        --name $StorageAccountName `
        --resource-group $ResourceGroupName `
        --location $Location `
        --sku "Standard_GRS" `
        --kind "StorageV2" `
        --access-tier "Hot" `
        --https-only true `
        --min-tls-version "TLS1_2" `
        --allow-blob-public-access false `
        --tags "Purpose=TerraformState" "Project=DatingPlatform" "ManagedBy=Terraform" `
        --output none
    Write-Host "Storage Account created successfully." -ForegroundColor Green
}

# Enable blob versioning
Write-Host ""
Write-Host "Enabling blob versioning..." -ForegroundColor Yellow
az storage account blob-service-properties update `
    --account-name $StorageAccountName `
    --resource-group $ResourceGroupName `
    --enable-versioning true `
    --output none
Write-Host "Blob versioning enabled." -ForegroundColor Green

# Enable soft delete for blobs
Write-Host ""
Write-Host "Enabling soft delete for blobs (14 days retention)..." -ForegroundColor Yellow
az storage account blob-service-properties update `
    --account-name $StorageAccountName `
    --resource-group $ResourceGroupName `
    --enable-delete-retention true `
    --delete-retention-days 14 `
    --output none
Write-Host "Blob soft delete enabled." -ForegroundColor Green

# Enable soft delete for containers
Write-Host ""
Write-Host "Enabling soft delete for containers (14 days retention)..." -ForegroundColor Yellow
az storage account blob-service-properties update `
    --account-name $StorageAccountName `
    --resource-group $ResourceGroupName `
    --enable-container-delete-retention true `
    --container-delete-retention-days 14 `
    --output none
Write-Host "Container soft delete enabled." -ForegroundColor Green

# Get storage account key
$storageKey = az storage account keys list `
    --account-name $StorageAccountName `
    --resource-group $ResourceGroupName `
    --query "[0].value" `
    --output tsv

# Create container
Write-Host ""
Write-Host "Creating blob container: $ContainerName" -ForegroundColor Yellow
$containerExists = az storage container exists `
    --name $ContainerName `
    --account-name $StorageAccountName `
    --account-key $storageKey `
    --query "exists" `
    --output tsv

if ($containerExists -eq "true") {
    Write-Host "Container already exists." -ForegroundColor Green
}
else {
    az storage container create `
        --name $ContainerName `
        --account-name $StorageAccountName `
        --account-key $storageKey `
        --output none
    Write-Host "Container created successfully." -ForegroundColor Green
}

# Enable resource lock to prevent accidental deletion
Write-Host ""
Write-Host "Creating delete lock on Resource Group..." -ForegroundColor Yellow
$lockExists = az lock show --name "DoNotDelete" --resource-group $ResourceGroupName 2>$null
if (-not $lockExists) {
    az lock create `
        --name "DoNotDelete" `
        --resource-group $ResourceGroupName `
        --lock-type CanNotDelete `
        --notes "Protects Terraform state storage from accidental deletion" `
        --output none
    Write-Host "Delete lock created." -ForegroundColor Green
}
else {
    Write-Host "Delete lock already exists." -ForegroundColor Green
}

# Output summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend Configuration Details:" -ForegroundColor Yellow
Write-Host "  Resource Group:    $ResourceGroupName"
Write-Host "  Storage Account:   $StorageAccountName"
Write-Host "  Container:         $ContainerName"
Write-Host "  Location:          $Location"
Write-Host ""
Write-Host "Use these values in your backend.tf:" -ForegroundColor Yellow
Write-Host @"
terraform {
  backend "azurerm" {
    resource_group_name  = "$ResourceGroupName"
    storage_account_name = "$StorageAccountName"
    container_name       = "$ContainerName"
    key                  = "<environment>.terraform.tfstate"
  }
}
"@

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Run configure-sp.ps1 to set up service principal authentication"
Write-Host "2. Initialize Terraform in your environment directory"
Write-Host "3. Run 'terraform plan' to verify configuration"
