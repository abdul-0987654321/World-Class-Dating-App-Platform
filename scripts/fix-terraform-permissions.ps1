<#
.SYNOPSIS
    Fixes Terraform service principal permissions for state storage access.

.DESCRIPTION
    This script grants the necessary permissions to the Azure DevOps service principal
    to access the Terraform state storage account. It assigns the "Storage Account Key
    Operator Service Role" which allows the service principal to list storage account keys.

.PARAMETER ServicePrincipalObjectId
    The Object ID of the service principal (default: 41915ef0-8eb1-4c12-b821-471048089b63)

.PARAMETER SubscriptionId
    The Azure subscription ID (default: ebd1613e-fea0-4b6d-8918-7e4de6a71c44)

.PARAMETER ResourceGroupName
    The resource group containing the storage account (default: rg-terraform-state-westus2)

.PARAMETER StorageAccountName
    The Terraform state storage account name (default: sttfstatedatingplatform)

.EXAMPLE
    .\fix-terraform-permissions.ps1

.EXAMPLE
    .\fix-terraform-permissions.ps1 -ServicePrincipalObjectId "your-object-id"

.NOTES
    Requires Azure CLI to be installed and logged in with sufficient permissions.
#>

param(
    [string]$ServicePrincipalObjectId = "41915ef0-8eb1-4c12-b821-471048089b63",
    [string]$SubscriptionId = "ebd1613e-fea0-4b6d-8918-7e4de6a71c44",
    [string]$ResourceGroupName = "rg-terraform-state-westus2",
    [string]$StorageAccountName = "sttfstatedatingplatform"
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Terraform Permission Fix Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Find Azure CLI
$azCmd = $null
$azPaths = @(
    "C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin\az.cmd",
    "C:\Program Files (x86)\Microsoft SDKs\Azure\CLI2\wbin\az.cmd",
    "$env:LOCALAPPDATA\Programs\Azure CLI\wbin\az.cmd"
)

foreach ($path in $azPaths) {
    if (Test-Path $path) {
        $azCmd = $path
        break
    }
}

# Also check if az is in PATH
if (-not $azCmd) {
    $azInPath = Get-Command az -ErrorAction SilentlyContinue
    if ($azInPath) {
        $azCmd = "az"
    }
}

# Check if Azure CLI is installed
Write-Host "Checking Azure CLI installation..." -ForegroundColor Yellow
if (-not $azCmd) {
    Write-Host "ERROR: Azure CLI is not installed or not in PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Azure CLI:" -ForegroundColor Yellow
    Write-Host "  winget install -e --id Microsoft.AzureCLI" -ForegroundColor White
    Write-Host ""
    Write-Host "Or download from: https://aka.ms/installazurecliwindows" -ForegroundColor White
    exit 1
}
Write-Host "Azure CLI found at: $azCmd" -ForegroundColor Green
Write-Host ""

# Create az function to use the correct path
function Invoke-Az {
    param([string[]]$Arguments)
    & $azCmd @Arguments
}

# Check if logged in
Write-Host "Checking Azure login status..." -ForegroundColor Yellow
$account = & $azCmd account show 2>&1 | ConvertFrom-Json -ErrorAction SilentlyContinue
if ($LASTEXITCODE -ne 0 -or $null -eq $account) {
    Write-Host "Not logged in to Azure. Initiating login..." -ForegroundColor Yellow
    & $azCmd login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to login to Azure" -ForegroundColor Red
        exit 1
    }
    $account = & $azCmd account show 2>&1 | ConvertFrom-Json -ErrorAction SilentlyContinue
}
Write-Host "Logged in as: $($account.user.name)" -ForegroundColor Green
Write-Host ""

# Set the subscription
Write-Host "Setting subscription to: $SubscriptionId" -ForegroundColor Yellow
& $azCmd account set --subscription $SubscriptionId
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to set subscription" -ForegroundColor Red
    exit 1
}
Write-Host "Subscription set successfully" -ForegroundColor Green
Write-Host ""

# Build the scope
$scope = "/subscriptions/$SubscriptionId/resourceGroups/$ResourceGroupName/providers/Microsoft.Storage/storageAccounts/$StorageAccountName"

Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "  Service Principal Object ID: $ServicePrincipalObjectId" -ForegroundColor White
Write-Host "  Storage Account: $StorageAccountName" -ForegroundColor White
Write-Host "  Resource Group: $ResourceGroupName" -ForegroundColor White
Write-Host "  Subscription: $SubscriptionId" -ForegroundColor White
Write-Host ""

# Check if storage account exists
Write-Host "Verifying storage account exists..." -ForegroundColor Yellow
$storageAccount = & $azCmd storage account show --name $StorageAccountName --resource-group $ResourceGroupName 2>&1 | ConvertFrom-Json -ErrorAction SilentlyContinue
if ($LASTEXITCODE -ne 0 -or $null -eq $storageAccount) {
    Write-Host "ERROR: Storage account '$StorageAccountName' not found in resource group '$ResourceGroupName'" -ForegroundColor Red
    exit 1
}
Write-Host "Storage account verified" -ForegroundColor Green
Write-Host ""

# Define roles to assign
$roles = @(
    @{
        Name = "Storage Account Key Operator Service Role"
        Description = "Allows listing storage account keys (required for Terraform state backend)"
    },
    @{
        Name = "Storage Blob Data Contributor"
        Description = "Allows read/write/delete access to blob containers (required for state file operations)"
    }
)

# Assign roles
foreach ($role in $roles) {
    Write-Host "Assigning role: $($role.Name)" -ForegroundColor Yellow
    Write-Host "  Purpose: $($role.Description)" -ForegroundColor Gray

    # Check if role assignment already exists
    $existingAssignment = & $azCmd role assignment list --assignee $ServicePrincipalObjectId --role $role.Name --scope $scope 2>&1 | ConvertFrom-Json -ErrorAction SilentlyContinue

    if ($existingAssignment -and $existingAssignment.Count -gt 0) {
        Write-Host "  Role already assigned - skipping" -ForegroundColor Green
    } else {
        # Create role assignment
        $result = & $azCmd role assignment create --assignee $ServicePrincipalObjectId --role $role.Name --scope $scope 2>&1

        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Role assigned successfully" -ForegroundColor Green
        } else {
            Write-Host "  WARNING: Failed to assign role" -ForegroundColor Yellow
            Write-Host "  Error: $result" -ForegroundColor Red
        }
    }
    Write-Host ""
}

# Verify assignments
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Verifying Role Assignments" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$assignments = & $azCmd role assignment list --assignee $ServicePrincipalObjectId --all 2>&1 | ConvertFrom-Json -ErrorAction SilentlyContinue

if ($assignments) {
    Write-Host "Current role assignments for service principal:" -ForegroundColor Yellow
    foreach ($assignment in $assignments) {
        Write-Host "  - $($assignment.roleDefinitionName)" -ForegroundColor White
        Write-Host "    Scope: $($assignment.scope)" -ForegroundColor Gray
    }
} else {
    Write-Host "No role assignments found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Next Steps" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Wait 1-2 minutes for role propagation" -ForegroundColor White
Write-Host "2. Re-run the Terraform pipeline:" -ForegroundColor White
Write-Host "   https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_build?definitionId=15" -ForegroundColor Cyan
Write-Host ""
Write-Host "If the pipeline still fails, ensure the service principal also has:" -ForegroundColor Yellow
Write-Host "  - Contributor role on the target subscription/resource groups" -ForegroundColor White
Write-Host "  - Key Vault Administrator role (if using Key Vault)" -ForegroundColor White
Write-Host ""
Write-Host "Done!" -ForegroundColor Green
