param(
    [int]$PipelineId = 15,
    [string]$PAT = "debreCRPB4KlkNeEoe8GEAlGrR6LWDzwdoZB4o3QdiPamoNp7DAqJQQJ99BLACAAAAAAAAAAAAASAZDO3xAI"
)

$headers = @{
    Authorization = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(':' + $PAT))
    'Content-Type' = 'application/json'
}

$body = @{
    definition = @{ id = $PipelineId }
    sourceBranch = 'refs/heads/main'
    reason = 'manual'
} | ConvertTo-Json

Write-Host "Triggering pipeline ID $PipelineId..." -ForegroundColor Yellow
$result = Invoke-RestMethod -Uri 'https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_apis/build/builds?api-version=7.1' -Method Post -Headers $headers -Body $body

Write-Host ""
Write-Host "Pipeline triggered!" -ForegroundColor Green
Write-Host ("Build ID: " + $result.id) -ForegroundColor Cyan
Write-Host ("Build Number: " + $result.buildNumber) -ForegroundColor Cyan
Write-Host ("URL: https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_build/results?buildId=" + $result.id) -ForegroundColor Cyan
