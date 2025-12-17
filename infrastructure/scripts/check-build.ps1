param(
    [int]$BuildId = 123,
    [string]$PAT = "debreCRPB4KlkNeEoe8GEAlGrR6LWDzwdoZB4o3QdiPamoNp7DAqJQQJ99BLACAAAAAAAAAAAAASAZDO3xAI"
)

$headers = @{
    Authorization = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(":" + $PAT))
}

$baseUrl = "https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_apis"

$build = Invoke-RestMethod -Uri "$baseUrl/build/builds/$BuildId`?api-version=7.1" -Headers $headers

Write-Host "=== Build #$BuildId Status ===" -ForegroundColor Cyan
Write-Host "Pipeline: $($build.definition.name)"
Write-Host "Status: $($build.status)"
Write-Host "Result: $($build.result)"
Write-Host "Queue Time: $($build.queueTime)"
Write-Host "Start Time: $($build.startTime)"
Write-Host "Finish Time: $($build.finishTime)"

if ($build.status -eq "completed" -and $build.result -eq "failed") {
    Write-Host ""
    Write-Host "=== Failed Tasks ===" -ForegroundColor Yellow
    $timeline = Invoke-RestMethod -Uri "$baseUrl/build/builds/$BuildId/timeline?api-version=7.1" -Headers $headers
    $failed = $timeline.records | Where-Object { $_.result -eq "failed" }
    foreach ($record in $failed) {
        Write-Host "FAILED: $($record.name)" -ForegroundColor Red
        if ($record.issues) {
            foreach ($issue in $record.issues) {
                Write-Host "  - $($issue.message)" -ForegroundColor DarkRed
            }
        }
    }

    Write-Host ""
    Write-Host "=== Build Logs Link ===" -ForegroundColor Yellow
    Write-Host "https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_build/results?buildId=$BuildId&view=logs"
}

if ($build.status -eq "inProgress") {
    Write-Host ""
    Write-Host "Build is still running..." -ForegroundColor Yellow
    Write-Host "Monitor at: https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_build/results?buildId=$BuildId"
}

if ($build.status -eq "completed" -and $build.result -eq "succeeded") {
    Write-Host ""
    Write-Host "BUILD SUCCEEDED!" -ForegroundColor Green
}
