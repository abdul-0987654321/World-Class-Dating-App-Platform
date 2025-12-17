param(
    [string]$PAT = "debreCRPB4KlkNeEoe8GEAlGrR6LWDzwdoZB4o3QdiPamoNp7DAqJQQJ99BLACAAAAAAAAAAAAASAZDO3xAI",
    [int]$BuildId = 126
)

$headers = @{
    Authorization = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(":" + $PAT))
}

$org = "citadelcloudmanagement"
$project = "DatingPlatform"

Write-Host "=== Build #$BuildId All Records ===" -ForegroundColor Cyan

$timeline = Invoke-RestMethod -Uri "https://dev.azure.com/$org/$project/_apis/build/builds/$BuildId/timeline?api-version=7.1" -Headers $headers

Write-Host "Total records: $($timeline.records.Count)"
$timeline.records | ForEach-Object {
    $color = switch ($_.result) {
        "succeeded" { "Green" }
        "failed" { "Red" }
        "skipped" { "Yellow" }
        default { "White" }
    }
    Write-Host ("[$($_.type)] $($_.name): $($_.state) - $($_.result)") -ForegroundColor $color
}

Write-Host ""
Write-Host "=== Getting Build Logs ===" -ForegroundColor Cyan

$logs = Invoke-RestMethod -Uri "https://dev.azure.com/$org/$project/_apis/build/builds/$BuildId/logs?api-version=7.1" -Headers $headers

Write-Host "Total logs: $($logs.count)"
$logs.value | ForEach-Object {
    Write-Host "Log #$($_.id): $($_.type)"
}

# Get the last few logs which typically contain the error
if ($logs.count -gt 0) {
    Write-Host ""
    Write-Host "=== Last Log Content ===" -ForegroundColor Yellow
    $lastLogId = $logs.value[-1].id
    try {
        $logContent = Invoke-RestMethod -Uri "https://dev.azure.com/$org/$project/_apis/build/builds/$BuildId/logs/$($lastLogId)?api-version=7.1" -Headers $headers
        $logContent
    } catch {
        Write-Host "Could not retrieve log: $_" -ForegroundColor Red
    }
}
