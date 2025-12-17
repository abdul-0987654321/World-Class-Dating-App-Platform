$PAT = 'debreCRPB4KlkNeEoe8GEAlGrR6LWDzwdoZB4o3QdiPamoNp7DAqJQQJ99BLACAAAAAAAAAAAAASAZDO3xAI'
$headers = @{
    Authorization = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(':' + $PAT))
    'Content-Type' = 'application/json'
}

# Queue a new build for Terraform-Infrastructure-Deploy (definition ID 11)
$body = @{
    definition = @{ id = 11 }
    sourceBranch = 'refs/heads/main'
    reason = 'manual'
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri 'https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_apis/build/builds?api-version=7.1' -Method Post -Headers $headers -Body $body

Write-Host "Build queued successfully!" -ForegroundColor Green
Write-Host "Build ID: $($response.id)"
Write-Host "Build Number: $($response.buildNumber)"
Write-Host "Status: $($response.status)"
Write-Host "URL: https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_build/results?buildId=$($response.id)"
