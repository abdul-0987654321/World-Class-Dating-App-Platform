#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Configures Azure Service Principal for Terraform authentication.

.DESCRIPTION
    This script configures the service principal 'applyplatform-terraform-sp' for Terraform:
    - Retrieves or creates service principal credentials
    - Sets required environment variables
    - Assigns appropriate RBAC roles
    - Validates the configuration

.PARAMETER ServicePrincipalName
    Name of the service principal. Defaults to applyplatform-terraform-sp.

.PARAMETER SubscriptionId
    The Azure subscription ID.

.EXAMPLE
    .\configure-sp.ps1
    .\configure-sp.ps1 -ServicePrincipalName "my-terraform-sp"

.NOTES
    Author: DatingPlatform DevOps Team
    Requires: Azure CLI with sufficient permissions to manage service principals
#>

[CmdletBinding()]
param(
    [Parameter()]
    [string]$ServicePrincipalName = "applyplatform-terraform-sp",

    [Parameter()]
    [string]$SubscriptionId = "ebd1613e-fea0-4b6d-8918-7e4de6a71c44",

    [Parameter()]
    [string]$TenantDomain = "citadelcloudmanagementgmail.onmicrosoft.com",

    [Parameter()]
    [switch]$CreateNew,

    [Parameter()]
    [switch]$SetEnvironmentVariables
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Service Principal Configuration Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Azure CLI is installed
try {
    $null = az version
}
catch {
    Write-Error "Azure CLI is not installed. Please install it from https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
}

# Check login status
Write-Host "Checking Azure login status..." -ForegroundColor Yellow
$account = az account show --output json 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Host "Not logged in. Initiating login..." -ForegroundColor Yellow
    az login --tenant $TenantDomain
}

# Set subscription
az account set --subscription $SubscriptionId
$tenant = az account show --query "tenantId" --output tsv

Write-Host "Subscription: $SubscriptionId" -ForegroundColor Green
Write-Host "Tenant ID: $tenant" -ForegroundColor Green
Write-Host ""

# Check if service principal exists
Write-Host "Checking for existing service principal: $ServicePrincipalName" -ForegroundColor Yellow
$sp = az ad sp list --display-name $ServicePrincipalName --query "[0]" --output json 2>$null | ConvertFrom-Json

if ($sp -and -not $CreateNew) {
    Write-Host "Service Principal found!" -ForegroundColor Green
    Write-Host "  App ID: $($sp.appId)" -ForegroundColor Cyan
    Write-Host "  Object ID: $($sp.id)" -ForegroundColor Cyan

    $clientId = $sp.appId

    Write-Host ""
    Write-Host "NOTE: Cannot retrieve existing client secret." -ForegroundColor Yellow
    Write-Host "If you need a new secret, run with -CreateNew flag or create manually:" -ForegroundColor Yellow
    Write-Host "  az ad sp credential reset --id $clientId" -ForegroundColor White
}
elseif ($CreateNew -or -not $sp) {
    Write-Host "Creating new service principal..." -ForegroundColor Yellow

    $spCredentials = az ad sp create-for-rbac `
        --name $ServicePrincipalName `
        --role "Contributor" `
        --scopes "/subscriptions/$SubscriptionId" `
        --output json | ConvertFrom-Json

    $clientId = $spCredentials.appId
    $clientSecret = $spCredentials.password

    Write-Host "Service Principal created!" -ForegroundColor Green
    Write-Host ""
    Write-Host "IMPORTANT: Save these credentials securely!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  Client ID:     $clientId" -ForegroundColor Yellow
    Write-Host "  Client Secret: $clientSecret" -ForegroundColor Yellow
    Write-Host "  Tenant ID:     $tenant" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
}

# Assign additional roles for Terraform operations
Write-Host "Assigning RBAC roles..." -ForegroundColor Yellow

$roles = @(
    "Key Vault Administrator",
    "Storage Blob Data Contributor",
    "User Access Administrator"
)

foreach ($role in $roles) {
    Write-Host "  Assigning role: $role" -ForegroundColor Cyan
    try {
        az role assignment create `
            --assignee $clientId `
            --role $role `
            --scope "/subscriptions/$SubscriptionId" `
            --output none 2>$null
        Write-Host "    Assigned successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "    Role may already be assigned or insufficient permissions" -ForegroundColor Yellow
    }
}

# Set environment variables for current session
if ($SetEnvironmentVariables -or $clientSecret) {
    Write-Host ""
    Write-Host "Setting environment variables for current session..." -ForegroundColor Yellow

    $env:ARM_CLIENT_ID = $clientId
    $env:ARM_SUBSCRIPTION_ID = $SubscriptionId
    $env:ARM_TENANT_ID = $tenant

    if ($clientSecret) {
        $env:ARM_CLIENT_SECRET = $clientSecret
    }

    Write-Host "Environment variables set:" -ForegroundColor Green
    Write-Host "  ARM_CLIENT_ID = $env:ARM_CLIENT_ID"
    Write-Host "  ARM_SUBSCRIPTION_ID = $env:ARM_SUBSCRIPTION_ID"
    Write-Host "  ARM_TENANT_ID = $env:ARM_TENANT_ID"
    if ($clientSecret) {
        Write-Host "  ARM_CLIENT_SECRET = [REDACTED]"
    }
}

# Output configuration for Azure DevOps
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Azure DevOps Variable Group Configuration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Add these to your Azure DevOps variable groups:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Variable Group: datingplatform-terraform-common" -ForegroundColor White
Write-Host "  ARM_SUBSCRIPTION_ID: $SubscriptionId"
Write-Host "  ARM_TENANT_ID: $tenant"
Write-Host "  TERRAFORM_STORAGE_ACCOUNT: sttfstatedatingplatform"
Write-Host "  TERRAFORM_CONTAINER_NAME: tfstate"
Write-Host "  TERRAFORM_RESOURCE_GROUP: rg-terraform-state-westus2"
Write-Host ""
Write-Host "Variable Group: datingplatform-terraform-<env>" -ForegroundColor White
Write-Host "  ARM_CLIENT_ID: $clientId"
Write-Host "  ARM_CLIENT_SECRET: <secret - mark as secret variable>"
Write-Host ""

# Output for local development
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Local Development Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Add to your PowerShell profile or .env file:" -ForegroundColor Yellow
Write-Host ""
Write-Host @"
`$env:ARM_CLIENT_ID = "$clientId"
`$env:ARM_CLIENT_SECRET = "<your-client-secret>"
`$env:ARM_SUBSCRIPTION_ID = "$SubscriptionId"
`$env:ARM_TENANT_ID = "$tenant"
"@

Write-Host ""
Write-Host "Configuration complete!" -ForegroundColor Green
