<#
.SYNOPSIS
    Fixes Terraform service principal permissions using Azure REST API directly.

.DESCRIPTION
    This script uses Azure REST API to grant the necessary permissions to the Azure DevOps
    service principal to access the Terraform state storage account. It doesn't require
    Azure CLI to be installed - it uses direct REST API calls.

.PARAMETER TenantId
    Azure AD Tenant ID

.PARAMETER ClientId
    Service Principal Client ID (App ID)

.PARAMETER ClientSecret
    Service Principal Client Secret

.EXAMPLE
    .\fix-terraform-permissions-rest.ps1 -TenantId "xxx" -ClientId "xxx" -ClientSecret "xxx"

.NOTES
    Requires a service principal with permissions to manage role assignments.
#>

param(
    [Parameter(Mandatory=$false)]
    [string]$TenantId,

    [Parameter(Mandatory=$false)]
    [string]$ClientId,

    [Parameter(Mandatory=$false)]
    [string]$ClientSecret
)

# Configuration
$config = @{
    ServicePrincipalObjectId = "41915ef0-8eb1-4c12-b821-471048089b63"
    SubscriptionId = "ebd1613e-fea0-4b6d-8918-7e4de6a71c44"
    ResourceGroupName = "rg-terraform-state-westus2"
    StorageAccountName = "sttfstatedatingplatform"
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Terraform Permission Fix (REST API)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# If credentials not provided, prompt for them
if (-not $TenantId) {
    Write-Host "Azure AD Tenant ID not provided." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "You can find this in Azure Portal:" -ForegroundColor White
    Write-Host "  Azure Active Directory > Overview > Tenant ID" -ForegroundColor Gray
    Write-Host ""
    $TenantId = Read-Host "Enter Tenant ID"
}

if (-not $ClientId) {
    Write-Host ""
    Write-Host "Service Principal Client ID (App ID) not provided." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "This should be a service principal with 'Owner' or 'User Access Administrator' role" -ForegroundColor White
    Write-Host "on the subscription to assign roles to other principals." -ForegroundColor White
    Write-Host ""
    $ClientId = Read-Host "Enter Client ID (App ID)"
}

if (-not $ClientSecret) {
    Write-Host ""
    Write-Host "Service Principal Client Secret not provided." -ForegroundColor Yellow
    $ClientSecret = Read-Host "Enter Client Secret" -AsSecureString
    $ClientSecret = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($ClientSecret))
}

Write-Host ""
Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "  Target Service Principal: $($config.ServicePrincipalObjectId)" -ForegroundColor White
Write-Host "  Storage Account: $($config.StorageAccountName)" -ForegroundColor White
Write-Host "  Resource Group: $($config.ResourceGroupName)" -ForegroundColor White
Write-Host "  Subscription: $($config.SubscriptionId)" -ForegroundColor White
Write-Host ""

# Get access token
Write-Host "Authenticating with Azure..." -ForegroundColor Yellow
try {
    $tokenUrl = "https://login.microsoftonline.com/$TenantId/oauth2/token"
    $tokenBody = @{
        grant_type    = "client_credentials"
        client_id     = $ClientId
        client_secret = $ClientSecret
        resource      = "https://management.azure.com/"
    }

    $tokenResponse = Invoke-RestMethod -Uri $tokenUrl -Method Post -Body $tokenBody -ContentType "application/x-www-form-urlencoded"
    $accessToken = $tokenResponse.access_token
    Write-Host "Authentication successful" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to authenticate" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $accessToken"
    "Content-Type" = "application/json"
}

# Role definitions to assign
$roles = @(
    @{
        Name = "Storage Account Key Operator Service Role"
        Id = "81a9662b-bebf-436f-a333-f67b29880f12"
        Description = "Allows listing storage account keys"
    },
    @{
        Name = "Storage Blob Data Contributor"
        Id = "ba92f5b4-2d11-453d-a403-e96b0029c9fe"
        Description = "Allows read/write/delete access to blob data"
    }
)

# Build scope
$scope = "/subscriptions/$($config.SubscriptionId)/resourceGroups/$($config.ResourceGroupName)/providers/Microsoft.Storage/storageAccounts/$($config.StorageAccountName)"

Write-Host ""
foreach ($role in $roles) {
    Write-Host "Assigning role: $($role.Name)" -ForegroundColor Yellow
    Write-Host "  Purpose: $($role.Description)" -ForegroundColor Gray

    # Generate unique GUID for role assignment
    $roleAssignmentId = [guid]::NewGuid().ToString()

    $roleAssignmentUrl = "https://management.azure.com$scope/providers/Microsoft.Authorization/roleAssignments/$($roleAssignmentId)?api-version=2022-04-01"

    $roleDefinitionId = "/subscriptions/$($config.SubscriptionId)/providers/Microsoft.Authorization/roleDefinitions/$($role.Id)"

    $body = @{
        properties = @{
            roleDefinitionId = $roleDefinitionId
            principalId = $config.ServicePrincipalObjectId
            principalType = "ServicePrincipal"
        }
    } | ConvertTo-Json -Depth 10

    try {
        $result = Invoke-RestMethod -Uri $roleAssignmentUrl -Method Put -Headers $headers -Body $body
        Write-Host "  Role assigned successfully" -ForegroundColor Green
    } catch {
        $errorMessage = $_.Exception.Message
        if ($errorMessage -match "RoleAssignmentExists") {
            Write-Host "  Role already assigned - skipping" -ForegroundColor Green
        } else {
            Write-Host "  WARNING: $errorMessage" -ForegroundColor Yellow
        }
    }
    Write-Host ""
}

# List current role assignments
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Verifying Role Assignments" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$listUrl = "https://management.azure.com$scope/providers/Microsoft.Authorization/roleAssignments?api-version=2022-04-01&`$filter=principalId eq '$($config.ServicePrincipalObjectId)'"

try {
    $assignments = Invoke-RestMethod -Uri $listUrl -Method Get -Headers $headers
    if ($assignments.value.Count -gt 0) {
        Write-Host "Role assignments on storage account:" -ForegroundColor Yellow
        foreach ($assignment in $assignments.value) {
            $roleDefId = $assignment.properties.roleDefinitionId.Split("/")[-1]
            $roleName = switch ($roleDefId) {
                "81a9662b-bebf-436f-a333-f67b29880f12" { "Storage Account Key Operator Service Role" }
                "ba92f5b4-2d11-453d-a403-e96b0029c9fe" { "Storage Blob Data Contributor" }
                "b24988ac-6180-42a0-ab88-20f7382dd24c" { "Contributor" }
                "8e3af657-a8ff-443c-a75c-2fe8c4bcb635" { "Owner" }
                default { $roleDefId }
            }
            Write-Host "  - $roleName" -ForegroundColor White
        }
    } else {
        Write-Host "No role assignments found on storage account" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Could not list role assignments: $($_.Exception.Message)" -ForegroundColor Yellow
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
Write-Host "Done!" -ForegroundColor Green
