param(
    [string]$PAT = "debreCRPB4KlkNeEoe8GEAlGrR6LWDzwdoZB4o3QdiPamoNp7DAqJQQJ99BLACAAAAAAAAAAAAASAZDO3xAI"
)

$headers = @{
    Authorization = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(":" + $PAT))
    "Content-Type" = "application/json"
}

$org = "citadelcloudmanagement"
$project = "DatingPlatform"
$pipelineId = 15  # Infrastructure pipeline ID

Write-Host "=== Queuing Infrastructure Pipeline ===" -ForegroundColor Cyan

$body = @{
    resources = @{
        repositories = @{
            self = @{
                refName = "refs/heads/main"
            }
        }
    }
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "https://dev.azure.com/$org/$project/_apis/pipelines/$pipelineId/runs?api-version=7.1" -Method Post -Headers $headers -Body $body
    Write-Host "Infrastructure pipeline run queued!" -ForegroundColor Green
    Write-Host "Build ID: $($response.id)"
    Write-Host "Build Number: $($response.name)"
    Write-Host "State: $($response.state)"
    Write-Host ""
    Write-Host "URL: https://dev.azure.com/$org/$project/_build/results?buildId=$($response.id)"
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    $_.ErrorDetails.Message
}
