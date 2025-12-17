# =============================================================================
# Bootstrap Terraform Backend - Manual Script
# =============================================================================
# Run this script if the Azure DevOps pipeline cannot create the backend
# Requires: Azure CLI installed and logged in with appropriate permissions
# =============================================================================

param(
    [string]$ResourceGroupName = "flamoral-terraform-state-rg",
    [string]$StorageAccountName = "flamoraltfstate",
    [string]$ContainerName = "tfstate",
    [string]$Location = "eastus"
)

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Terraform Backend Bootstrap Script" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Check if Azure CLI is installed
$azVersion = az version 2>$null
if (-not $azVersion) {
    Write-Host "ERROR: Azure CLI is not installed!" -ForegroundColor Red
    Write-Host "Install from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
}

# Check if logged in
$account = az account show 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Host "Not logged in to Azure. Running 'az login'..." -ForegroundColor Yellow
    az login
    $account = az account show | ConvertFrom-Json
}

Write-Host "Logged in as: $($account.user.name)" -ForegroundColor Green
Write-Host "Subscription: $($account.name) ($($account.id))" -ForegroundColor Green
Write-Host ""

# Create Resource Group
Write-Host "Step 1: Creating Resource Group..." -ForegroundColor Yellow
$rgExists = az group exists --name $ResourceGroupName
if ($rgExists -eq "true") {
    Write-Host "  Resource Group already exists" -ForegroundColor Green
} else {
    az group create `
        --name $ResourceGroupName `
        --location $Location `
        --tags Purpose=TerraformState Project=Flamoral ManagedBy=Terraform
    Write-Host "  Resource Group created" -ForegroundColor Green
}

# Create Storage Account
Write-Host ""
Write-Host "Step 2: Creating Storage Account..." -ForegroundColor Yellow
$saExists = az storage account show --name $StorageAccountName --resource-group $ResourceGroupName 2>$null
if ($saExists) {
    Write-Host "  Storage Account already exists" -ForegroundColor Green
} else {
    az storage account create `
        --name $StorageAccountName `
        --resource-group $ResourceGroupName `
        --location $Location `
        --sku Standard_LRS `
        --kind StorageV2 `
        --https-only true `
        --min-tls-version TLS1_2 `
        --allow-blob-public-access false `
        --tags Purpose=TerraformState Project=Flamoral ManagedBy=Terraform
    Write-Host "  Storage Account created" -ForegroundColor Green
}

# Create Blob Container
Write-Host ""
Write-Host "Step 3: Creating Blob Container..." -ForegroundColor Yellow
$storageKey = (az storage account keys list `
    --resource-group $ResourceGroupName `
    --account-name $StorageAccountName `
    --query '[0].value' -o tsv)

$containerExists = az storage container exists `
    --name $ContainerName `
    --account-name $StorageAccountName `
    --account-key $storageKey `
    --query exists -o tsv

if ($containerExists -eq "true") {
    Write-Host "  Blob Container already exists" -ForegroundColor Green
} else {
    az storage container create `
        --name $ContainerName `
        --account-name $StorageAccountName `
        --account-key $storageKey `
        --public-access off
    Write-Host "  Blob Container created" -ForegroundColor Green
}

# Verify
Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Terraform Backend Created Successfully!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Resource Group:   $ResourceGroupName" -ForegroundColor White
Write-Host "Storage Account:  $StorageAccountName" -ForegroundColor White
Write-Host "Container:        $ContainerName" -ForegroundColor White
Write-Host "Location:         $Location" -ForegroundColor White
Write-Host ""
Write-Host "Backend Configuration for Terraform:" -ForegroundColor Yellow
Write-Host @"
terraform {
  backend "azurerm" {
    resource_group_name  = "$ResourceGroupName"
    storage_account_name = "$StorageAccountName"
    container_name       = "$ContainerName"
    key                  = "flamoral-dev.tfstate"
  }
}
"@ -ForegroundColor Gray
Write-Host ""
Write-Host "You can now run the Infrastructure pipeline!" -ForegroundColor Green
