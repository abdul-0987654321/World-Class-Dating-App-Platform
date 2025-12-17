param(
    [string]$PAT = "debreCRPB4KlkNeEoe8GEAlGrR6LWDzwdoZB4o3QdiPamoNp7DAqJQQJ99BLACAAAAAAAAAAAAASAZDO3xAI"
)

$headers = @{
    Authorization = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(":" + $PAT))
    "Content-Type" = "application/json"
}

$org = "citadelcloudmanagement"
$project = "DatingPlatform"
$varGroupId = 17  # datingplatform-terraform-common

Write-Host "=== Updating Variable Group ===" -ForegroundColor Cyan

# Get current variable group
$currentGroup = Invoke-RestMethod -Uri "https://dev.azure.com/$org/$project/_apis/distributedtask/variablegroups/$varGroupId`?api-version=7.1" -Headers $headers

Write-Host "Current values:" -ForegroundColor Yellow
Write-Host "  TF_STATE_RESOURCE_GROUP: $($currentGroup.variables.TF_STATE_RESOURCE_GROUP.value)"
Write-Host "  TF_STATE_STORAGE_ACCOUNT: $($currentGroup.variables.TF_STATE_STORAGE_ACCOUNT.value)"
Write-Host "  TF_STATE_CONTAINER: $($currentGroup.variables.TF_STATE_CONTAINER.value)"

# Update the variables to match what Bootstrap pipeline created
$currentGroup.variables.TF_STATE_RESOURCE_GROUP.value = "flamoral-terraform-state-rg"
$currentGroup.variables.TF_STATE_STORAGE_ACCOUNT.value = "flamoraltfstate"
# TF_STATE_CONTAINER is already "tfstate" which is correct

$body = $currentGroup | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "https://dev.azure.com/$org/$project/_apis/distributedtask/variablegroups/$varGroupId`?api-version=7.1" -Method Put -Headers $headers -Body $body
    Write-Host ""
    Write-Host "Variable group updated successfully!" -ForegroundColor Green
    Write-Host "New values:" -ForegroundColor Yellow
    Write-Host "  TF_STATE_RESOURCE_GROUP: $($response.variables.TF_STATE_RESOURCE_GROUP.value)"
    Write-Host "  TF_STATE_STORAGE_ACCOUNT: $($response.variables.TF_STATE_STORAGE_ACCOUNT.value)"
    Write-Host "  TF_STATE_CONTAINER: $($response.variables.TF_STATE_CONTAINER.value)"
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    $_.ErrorDetails.Message
}
