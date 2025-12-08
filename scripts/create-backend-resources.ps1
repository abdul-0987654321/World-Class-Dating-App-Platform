param(
    [string]$DevOpsPAT = "debreCRPB4KlkNeEoe8GEAlGrR6LWDzwdoZB4o3QdiPamoNp7DAqJQQJ99BLACAAAAAAAAAAAAASAZDO3xAI",
    [string]$ClientSecret = ""
)

$ErrorActionPreference = "Stop"

# Azure DevOps API headers
$devopsHeaders = @{
    Authorization = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(":" + $DevOpsPAT))
    "Content-Type" = "application/json"
}

$org = "citadelcloudmanagement"
$project = "DatingPlatform"

Write-Host "=== Step 1: Get Service Principal Credentials from Variable Group ===" -ForegroundColor Cyan

# Get variable groups
$variableGroups = Invoke-RestMethod -Uri "https://dev.azure.com/$org/$project/_apis/distributedtask/variablegroups?api-version=7.1" -Headers $devopsHeaders
$commonGroup = $variableGroups.value | Where-Object { $_.name -eq "datingplatform-terraform-common" }

if (-not $commonGroup) {
    Write-Host "Variable group 'datingplatform-terraform-common' not found!" -ForegroundColor Red
    exit 1
}

Write-Host "Found variable group: $($commonGroup.name) (ID: $($commonGroup.id))" -ForegroundColor Green

# Get the variables
$vars = $commonGroup.variables
$clientId = $vars.ARM_CLIENT_ID.value
$tenantId = $vars.ARM_TENANT_ID.value
$subscriptionId = $vars.ARM_SUBSCRIPTION_ID.value

Write-Host ""
Write-Host "Credentials found:" -ForegroundColor Yellow
Write-Host "  Client ID: $clientId"
Write-Host "  Tenant ID: $tenantId"
Write-Host "  Subscription ID: $subscriptionId"

if (-not $clientId -or -not $tenantId -or -not $subscriptionId) {
    Write-Host "Missing required credentials in variable group!" -ForegroundColor Red
    exit 1
}

# Get client secret from parameter or prompt
if (-not $ClientSecret) {
    $ClientSecret = $env:ARM_CLIENT_SECRET
}
if (-not $ClientSecret) {
    Write-Host ""
    Write-Host "Client secret is stored securely and cannot be retrieved via API." -ForegroundColor Yellow
    Write-Host "Please enter the ARM_CLIENT_SECRET:" -ForegroundColor Yellow
    $secureSecret = Read-Host -AsSecureString
    $ClientSecret = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureSecret))
}

if (-not $ClientSecret) {
    Write-Host "Client secret is required!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Step 2: Get Azure Access Token ===" -ForegroundColor Cyan

$tokenBody = @{
    grant_type = "client_credentials"
    client_id = $clientId
    client_secret = $ClientSecret
    resource = "https://management.azure.com/"
}

try {
    $tokenResponse = Invoke-RestMethod -Uri "https://login.microsoftonline.com/$tenantId/oauth2/token" -Method Post -Body $tokenBody
    $accessToken = $tokenResponse.access_token
    Write-Host "Successfully obtained Azure access token" -ForegroundColor Green
} catch {
    Write-Host "Failed to get access token: $_" -ForegroundColor Red
    exit 1
}

$azureHeaders = @{
    Authorization = "Bearer $accessToken"
    "Content-Type" = "application/json"
}

# Use the Flamoral naming from variables-common.yml
$resourceGroupName = "flamoral-terraform-state-rg"
$storageAccountName = "flamoraltfstate"
$containerName = "tfstate"
$location = "westus2"

Write-Host ""
Write-Host "=== Step 3: Create Resource Group ===" -ForegroundColor Cyan
Write-Host "Creating: $resourceGroupName in $location"

$rgBody = @{
    location = $location
    tags = @{
        Purpose = "TerraformState"
        Project = "Flamoral"
        ManagedBy = "Terraform"
    }
} | ConvertTo-Json

try {
    $rgResponse = Invoke-RestMethod -Uri "https://management.azure.com/subscriptions/$subscriptionId/resourceGroups/${resourceGroupName}?api-version=2021-04-01" -Method Put -Headers $azureHeaders -Body $rgBody
    Write-Host "Resource Group created/updated successfully" -ForegroundColor Green
} catch {
    Write-Host "Failed to create resource group: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Step 4: Create Storage Account ===" -ForegroundColor Cyan
Write-Host "Creating: $storageAccountName"

$saBody = @{
    location = $location
    sku = @{
        name = "Standard_GRS"
    }
    kind = "StorageV2"
    properties = @{
        accessTier = "Hot"
        supportsHttpsTrafficOnly = $true
        minimumTlsVersion = "TLS1_2"
        allowBlobPublicAccess = $false
    }
    tags = @{
        Purpose = "TerraformState"
        Project = "Flamoral"
        ManagedBy = "Terraform"
    }
} | ConvertTo-Json -Depth 5

try {
    $saResponse = Invoke-RestMethod -Uri "https://management.azure.com/subscriptions/$subscriptionId/resourceGroups/$resourceGroupName/providers/Microsoft.Storage/storageAccounts/${storageAccountName}?api-version=2023-01-01" -Method Put -Headers $azureHeaders -Body $saBody
    Write-Host "Storage Account creation initiated" -ForegroundColor Green

    # Wait for storage account to be ready
    Write-Host "Waiting for storage account provisioning..." -ForegroundColor Yellow
    $maxWait = 120
    $waited = 0
    while ($waited -lt $maxWait) {
        Start-Sleep -Seconds 5
        $waited += 5
        try {
            $saStatus = Invoke-RestMethod -Uri "https://management.azure.com/subscriptions/$subscriptionId/resourceGroups/$resourceGroupName/providers/Microsoft.Storage/storageAccounts/${storageAccountName}?api-version=2023-01-01" -Headers $azureHeaders
            if ($saStatus.properties.provisioningState -eq "Succeeded") {
                Write-Host "Storage Account provisioned successfully" -ForegroundColor Green
                break
            }
            Write-Host "  Status: $($saStatus.properties.provisioningState)..."
        } catch {
            Write-Host "  Checking status..."
        }
    }
} catch {
    $errorMsg = $_.Exception.Message
    if ($errorMsg -match "StorageAccountAlreadyExists" -or $errorMsg -match "already exists") {
        Write-Host "Storage Account already exists" -ForegroundColor Green
    } else {
        Write-Host "Failed to create storage account: $errorMsg" -ForegroundColor Red
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "=== Step 5: Create Blob Container ===" -ForegroundColor Cyan
Write-Host "Creating container: $containerName"

$containerBody = @{
    properties = @{
        publicAccess = "None"
    }
} | ConvertTo-Json

try {
    $containerResponse = Invoke-RestMethod -Uri "https://management.azure.com/subscriptions/$subscriptionId/resourceGroups/$resourceGroupName/providers/Microsoft.Storage/storageAccounts/$storageAccountName/blobServices/default/containers/${containerName}?api-version=2023-01-01" -Method Put -Headers $azureHeaders -Body $containerBody
    Write-Host "Blob Container created successfully" -ForegroundColor Green
} catch {
    $errorMsg = $_.Exception.Message
    if ($errorMsg -match "ContainerAlreadyExists" -or $errorMsg -match "already exists") {
        Write-Host "Container already exists" -ForegroundColor Green
    } else {
        Write-Host "Failed to create container: $errorMsg" -ForegroundColor Red
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Terraform Backend Setup Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Resources Created:" -ForegroundColor Green
Write-Host "  Resource Group:   $resourceGroupName"
Write-Host "  Storage Account:  $storageAccountName"
Write-Host "  Container:        $containerName"
Write-Host "  Location:         $location"
Write-Host ""
Write-Host "You can now run the Infrastructure pipeline!" -ForegroundColor Yellow
