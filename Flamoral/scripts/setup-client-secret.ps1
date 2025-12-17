# Setup ARM_CLIENT_SECRET for Azure DevOps Pipeline
# This script creates a new client secret for the Service Principal
# and updates the Azure DevOps Variable Group

param(
    [Parameter(Mandatory=$false)]
    [string]$TenantId = "ed27e9a3-1b1c-46c9-8a73-a4f3609d75c0",

    [Parameter(Mandatory=$false)]
    [string]$ClientId = "55936d47-c25a-4c12-b281-9644baafdcab",

    [Parameter(Mandatory=$false)]
    [string]$DevOpsPAT,

    [Parameter(Mandatory=$false)]
    [string]$Organization = "citadelcloudmanagement",

    [Parameter(Mandatory=$false)]
    [string]$Project = "DatingPlatform",

    [Parameter(Mandatory=$false)]
    [int]$VariableGroupId = 17
)

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Azure Service Principal Secret Setup" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Device Code Flow to get Azure AD token
Write-Host "[Step 1/4] Starting Device Code Authentication..." -ForegroundColor Yellow
Write-Host ""

$deviceCodeBody = @{
    client_id = "1950a258-227b-4e31-a9cf-717495945fc2"  # Azure PowerShell client ID
    resource  = "https://graph.microsoft.com"
    scope     = "Application.ReadWrite.All"
}

try {
    $deviceCodeResponse = Invoke-RestMethod -Method Post `
        -Uri "https://login.microsoftonline.com/$TenantId/oauth2/devicecode" `
        -Body $deviceCodeBody `
        -ContentType "application/x-www-form-urlencoded"

    Write-Host "=======================================================" -ForegroundColor Green
    Write-Host "IMPORTANT: Complete authentication in your browser" -ForegroundColor Green
    Write-Host "=======================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "1. Go to: https://microsoft.com/devicelogin" -ForegroundColor Cyan
    Write-Host "2. Enter code: $($deviceCodeResponse.user_code)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Waiting for authentication..." -ForegroundColor Gray

    # Poll for token
    $tokenBody = @{
        grant_type  = "urn:ietf:params:oauth:grant-type:device_code"
        client_id   = "1950a258-227b-4e31-a9cf-717495945fc2"
        code        = $deviceCodeResponse.device_code
    }

    $maxAttempts = 60
    $attempt = 0
    $token = $null

    while ($attempt -lt $maxAttempts -and $null -eq $token) {
        Start-Sleep -Seconds 5
        $attempt++

        try {
            $tokenResponse = Invoke-RestMethod -Method Post `
                -Uri "https://login.microsoftonline.com/$TenantId/oauth2/token" `
                -Body $tokenBody `
                -ContentType "application/x-www-form-urlencoded"

            $token = $tokenResponse.access_token
            Write-Host "Authentication successful!" -ForegroundColor Green
        }
        catch {
            $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
            if ($errorResponse.error -ne "authorization_pending") {
                throw $_
            }
            Write-Host "." -NoNewline -ForegroundColor Gray
        }
    }

    if ($null -eq $token) {
        throw "Authentication timeout. Please run the script again."
    }

    Write-Host ""

}
catch {
    Write-Host "Error during device code authentication: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Create new client secret using Microsoft Graph
Write-Host ""
Write-Host "[Step 2/4] Creating new client secret for Service Principal..." -ForegroundColor Yellow

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/json"
}

# First get the Service Principal Object ID (different from App ID)
try {
    $spResponse = Invoke-RestMethod -Method Get `
        -Uri "https://graph.microsoft.com/v1.0/applications?`$filter=appId eq '$ClientId'" `
        -Headers $headers

    if ($spResponse.value.Count -eq 0) {
        throw "Service Principal not found with App ID: $ClientId"
    }

    $appObjectId = $spResponse.value[0].id
    Write-Host "Found Application Object ID: $appObjectId" -ForegroundColor Gray

}
catch {
    Write-Host "Error finding Service Principal: $_" -ForegroundColor Red
    exit 1
}

# Create new client secret
try {
    $secretBody = @{
        passwordCredential = @{
            displayName = "terraform-pipeline-$(Get-Date -Format 'yyyyMMdd')"
            endDateTime = (Get-Date).AddYears(1).ToString("yyyy-MM-ddTHH:mm:ssZ")
        }
    } | ConvertTo-Json

    $secretResponse = Invoke-RestMethod -Method Post `
        -Uri "https://graph.microsoft.com/v1.0/applications/$appObjectId/addPassword" `
        -Headers $headers `
        -Body $secretBody

    $newSecret = $secretResponse.secretText
    Write-Host "New client secret created successfully!" -ForegroundColor Green
    Write-Host "Secret hint: $($newSecret.Substring(0,4))****$($newSecret.Substring($newSecret.Length-4))" -ForegroundColor Gray

}
catch {
    Write-Host "Error creating client secret: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Get DevOps PAT if not provided
if ([string]::IsNullOrEmpty($DevOpsPAT)) {
    Write-Host ""
    Write-Host "[Step 3/4] Azure DevOps PAT Required" -ForegroundColor Yellow
    Write-Host "Enter your Azure DevOps Personal Access Token: " -NoNewline
    $DevOpsPAT = Read-Host -AsSecureString
    $DevOpsPAT = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($DevOpsPAT))
}

# Step 4: Update Azure DevOps Variable Group
Write-Host ""
Write-Host "[Step 4/4] Updating Azure DevOps Variable Group..." -ForegroundColor Yellow

$devOpsHeaders = @{
    "Authorization" = "Basic $([Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(":$DevOpsPAT")))"
    "Content-Type"  = "application/json"
}

try {
    # Get current variable group
    $vgResponse = Invoke-RestMethod -Method Get `
        -Uri "https://dev.azure.com/$Organization/$Project/_apis/distributedtask/variablegroups/$VariableGroupId`?api-version=7.1" `
        -Headers $devOpsHeaders

    # Update the ARM_CLIENT_SECRET
    $vgResponse.variables.ARM_CLIENT_SECRET = @{
        value    = $newSecret
        isSecret = $true
    }

    # Remove properties that shouldn't be in the update request
    $updateBody = @{
        id                              = $vgResponse.id
        type                            = $vgResponse.type
        name                            = $vgResponse.name
        variables                       = $vgResponse.variables
        variableGroupProjectReferences  = $vgResponse.variableGroupProjectReferences
    } | ConvertTo-Json -Depth 10

    $updateResponse = Invoke-RestMethod -Method Put `
        -Uri "https://dev.azure.com/$Organization/$Project/_apis/distributedtask/variablegroups/$VariableGroupId`?api-version=7.1" `
        -Headers $devOpsHeaders `
        -Body $updateBody

    Write-Host "Variable Group updated successfully!" -ForegroundColor Green

}
catch {
    Write-Host "Error updating Variable Group: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Manual Update Instructions:" -ForegroundColor Yellow
    Write-Host "1. Go to: https://dev.azure.com/$Organization/$Project/_library?itemType=VariableGroups&view=VariableGroupView&variableGroupId=$VariableGroupId"
    Write-Host "2. Click on 'datingplatform-terraform-common'"
    Write-Host "3. Find ARM_CLIENT_SECRET and click the lock icon"
    Write-Host "4. Paste this secret value: " -NoNewline
    Write-Host $newSecret -ForegroundColor Cyan
    Write-Host "5. Click Save"
    exit 1
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "SUCCESS! Setup Complete" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Re-run the Terraform-Infrastructure-Deploy pipeline"
Write-Host "2. The pipeline should now authenticate successfully"
Write-Host ""
Write-Host "Secret expires: $((Get-Date).AddYears(1).ToString('yyyy-MM-dd'))" -ForegroundColor Gray
