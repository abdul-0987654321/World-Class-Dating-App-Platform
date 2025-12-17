param(
    [string]$PAT = "debreCRPB4KlkNeEoe8GEAlGrR6LWDzwdoZB4o3QdiPamoNp7DAqJQQJ99BLACAAAAAAAAAAAAASAZDO3xAI"
)

$headers = @{
    Authorization = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(":" + $PAT))
    "Content-Type" = "application/json"
}

$org = "citadelcloudmanagement"
$project = "DatingPlatform"

Write-Host "=== Updating Variable Group ===" -ForegroundColor Cyan

# Get variable groups
$variableGroups = Invoke-RestMethod -Uri "https://dev.azure.com/$org/$project/_apis/distributedtask/variablegroups?api-version=7.1" -Headers $headers
$commonGroup = $variableGroups.value | Where-Object { $_.name -eq "datingplatform-terraform-common" }

Write-Host "Found variable group ID: $($commonGroup.id)" -ForegroundColor Green
Write-Host ""
Write-Host "Current TF State values:" -ForegroundColor Yellow
Write-Host "  TF_STATE_RESOURCE_GROUP: $($commonGroup.variables.TF_STATE_RESOURCE_GROUP.value)"
Write-Host "  TF_STATE_STORAGE_ACCOUNT: $($commonGroup.variables.TF_STATE_STORAGE_ACCOUNT.value)"
Write-Host "  TF_STATE_CONTAINER: $($commonGroup.variables.TF_STATE_CONTAINER.value)"

# Update the variable group with Flamoral naming
$updateBody = @{
    id = $commonGroup.id
    name = $commonGroup.name
    type = $commonGroup.type
    variables = @{
        ARM_SUBSCRIPTION_ID = @{ value = $commonGroup.variables.ARM_SUBSCRIPTION_ID.value }
        ARM_TENANT_ID = @{ value = $commonGroup.variables.ARM_TENANT_ID.value }
        ARM_CLIENT_ID = @{ value = $commonGroup.variables.ARM_CLIENT_ID.value }
        ARM_CLIENT_SECRET = @{ value = ""; isSecret = $true }
        TF_STATE_RESOURCE_GROUP = @{ value = "flamoral-terraform-state-rg" }
        TF_STATE_STORAGE_ACCOUNT = @{ value = "flamoraltfstate" }
        TF_STATE_CONTAINER = @{ value = "tfstate" }
    }
} | ConvertTo-Json -Depth 5

Write-Host ""
Write-Host "Updating to Flamoral naming..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "https://dev.azure.com/$org/_apis/distributedtask/variablegroups/$($commonGroup.id)?api-version=7.1" -Method Put -Headers $headers -Body $updateBody
    Write-Host "Variable group updated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "New TF State values:" -ForegroundColor Green
    Write-Host "  TF_STATE_RESOURCE_GROUP: flamoral-terraform-state-rg"
    Write-Host "  TF_STATE_STORAGE_ACCOUNT: flamoraltfstate"
    Write-Host "  TF_STATE_CONTAINER: tfstate"
} catch {
    Write-Host "Failed to update variable group: $_" -ForegroundColor Red
    Write-Host $_.ErrorDetails.Message -ForegroundColor Red
}
