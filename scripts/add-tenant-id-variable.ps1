$PAT = 'debreCRPB4KlkNeEoe8GEAlGrR6LWDzwdoZB4o3QdiPamoNp7DAqJQQJ99BLACAAAAAAAAAAAAASAZDO3xAI'
$headers = @{
    Authorization = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(':' + $PAT))
    'Content-Type' = 'application/json'
}

# Get the existing variable group (ID 17 = datingplatform-terraform-common)
$vg = Invoke-RestMethod -Uri 'https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_apis/distributedtask/variablegroups/17?api-version=7.1' -Headers $headers

Write-Host "Current variables in datingplatform-terraform-common:"
$vg.variables.PSObject.Properties | ForEach-Object { Write-Host "  $($_.Name)" }

# Add TF_VAR_tenant_id using the same value as ARM_TENANT_ID
$vg.variables | Add-Member -NotePropertyName "TF_VAR_tenant_id" -NotePropertyValue @{ value = "ed27e9a3-1b1c-46c9-8a73-a4f3609d75c0" } -Force

Write-Host ""
Write-Host "Updated variables:"
$vg.variables.PSObject.Properties | ForEach-Object { Write-Host "  $($_.Name)" }

# Update the variable group
$body = $vg | ConvertTo-Json -Depth 10

$response = Invoke-RestMethod -Uri 'https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_apis/distributedtask/variablegroups/17?api-version=7.1' -Method Put -Headers $headers -Body $body

Write-Host ""
Write-Host "Variable group updated successfully!" -ForegroundColor Green
Write-Host "TF_VAR_tenant_id = $($response.variables.TF_VAR_tenant_id.value)"
