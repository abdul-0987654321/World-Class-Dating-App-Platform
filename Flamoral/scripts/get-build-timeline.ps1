param(
    [string]$PAT = "debreCRPB4KlkNeEoe8GEAlGrR6LWDzwdoZB4o3QdiPamoNp7DAqJQQJ99BLACAAAAAAAAAAAAASAZDO3xAI",
    [int]$BuildId = 126
)

$headers = @{
    Authorization = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(":" + $PAT))
}

$org = "citadelcloudmanagement"
$project = "DatingPlatform"

Write-Host "=== Build #$BuildId Timeline ===" -ForegroundColor Cyan

$timeline = Invoke-RestMethod -Uri "https://dev.azure.com/$org/$project/_apis/build/builds/$BuildId/timeline?api-version=7.1" -Headers $headers

$timeline.records | Where-Object { $_.type -eq "Task" } | ForEach-Object {
    $color = switch ($_.result) {
        "succeeded" { "Green" }
        "failed" { "Red" }
        "skipped" { "Yellow" }
        default { "White" }
    }
    Write-Host ("$($_.name): $($_.state) - $($_.result)") -ForegroundColor $color
    if ($_.result -eq "failed" -and $_.issues) {
        Write-Host "  Issues:" -ForegroundColor Red
        $_.issues | ForEach-Object {
            Write-Host "    - $($_.message)" -ForegroundColor Red
        }
    }
}

# Get any failed task logs
$failedTasks = $timeline.records | Where-Object { $_.type -eq "Task" -and $_.result -eq "failed" }
if ($failedTasks) {
    Write-Host ""
    Write-Host "=== Failed Task Logs ===" -ForegroundColor Red
    foreach ($task in $failedTasks) {
        if ($task.log.url) {
            Write-Host "Task: $($task.name)" -ForegroundColor Yellow
            try {
                $log = Invoke-RestMethod -Uri $task.log.url -Headers $headers
                Write-Host $log
            } catch {
                Write-Host "Could not retrieve log: $_" -ForegroundColor Red
            }
        }
    }
}
