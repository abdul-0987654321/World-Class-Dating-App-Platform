param(
    [string]$PAT = "debreCRPB4KlkNeEoe8GEAlGrR6LWDzwdoZB4o3QdiPamoNp7DAqJQQJ99BLACAAAAAAAAAAAAASAZDO3xAI",
    [int]$BuildId = 101
)

$headers = @{
    Authorization = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(':' + $PAT))
}

Write-Host "=== Build #$BuildId Logs ===" -ForegroundColor Cyan

# Get timeline to find failed tasks
$timeline = Invoke-RestMethod -Uri "https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_apis/build/builds/$BuildId/timeline?api-version=7.1" -Headers $headers

# Find failed tasks
$failedTasks = $timeline.records | Where-Object { $_.result -eq 'failed' -and $_.type -eq 'Task' }

if ($failedTasks) {
    foreach ($task in $failedTasks | Select-Object -First 3) {
        Write-Host ""
        Write-Host "=== Failed Task: $($task.name) ===" -ForegroundColor Red
        
        if ($task.log) {
            try {
                $logContent = Invoke-RestMethod -Uri $task.log.url -Headers $headers
                # Show last 50 lines of log
                $lines = $logContent -split "`n"
                $lastLines = $lines | Select-Object -Last 50
                $lastLines | ForEach-Object { Write-Host $_ }
            } catch {
                Write-Host "Could not fetch log: $_" -ForegroundColor Yellow
            }
        }
    }
} else {
    Write-Host "No failed tasks found with logs" -ForegroundColor Yellow
    
    # Check for failed jobs instead
    $failedJobs = $timeline.records | Where-Object { $_.result -eq 'failed' -and $_.type -eq 'Job' }
    Write-Host "Failed jobs: $($failedJobs.Count)"
    $failedJobs | ForEach-Object {
        Write-Host "  - $($_.name)" -ForegroundColor Red
    }
}
