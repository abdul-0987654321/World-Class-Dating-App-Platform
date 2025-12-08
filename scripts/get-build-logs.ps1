param(
    [int]$BuildId = 61,
    [string]$PAT = "debreCRPB4KlkNeEoe8GEAlGrR6LWDzwdoZB4o3QdiPamoNp7DAqJQQJ99BLACAAAAAAAAAAAAASAZDO3xAI"
)

$headers = @{
    Authorization = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(':' + $PAT))
}

# Get timeline
$timeline = Invoke-RestMethod -Uri "https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_apis/build/builds/$($BuildId)/timeline?api-version=7.1" -Headers $headers

# Find failed jobs
$failedJobs = $timeline.records | Where-Object { $_.result -eq "failed" -and $_.type -eq "Job" }

foreach ($job in $failedJobs) {
    Write-Host "`n=== Failed Job: $($job.name) ===" -ForegroundColor Red
    Write-Host "  State: $($job.state)" -ForegroundColor Yellow
    Write-Host "  Issues:" -ForegroundColor Yellow

    # Show any issues
    if ($job.issues) {
        foreach ($issue in $job.issues) {
            Write-Host "    - $($issue.message)" -ForegroundColor Red
        }
    }

    # Get log for this job
    if ($job.log) {
        try {
            $logUrl = $job.log.url
            $logContent = Invoke-RestMethod -Uri $logUrl -Headers $headers

            # Show last 50 lines of log
            $lines = $logContent -split "`n"
            $lastLines = $lines | Select-Object -Last 50
            Write-Host ($lastLines -join "`n")
        } catch {
            Write-Host "Could not fetch log: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  No log available" -ForegroundColor Yellow
    }
}

# Also show failed tasks
Write-Host "`n=== Failed Tasks ===" -ForegroundColor Cyan
$failedTasks = $timeline.records | Where-Object { $_.result -eq "failed" -and $_.type -eq "Task" }
foreach ($task in $failedTasks) {
    Write-Host "Task: $($task.name)" -ForegroundColor Red
    if ($task.issues) {
        foreach ($issue in $task.issues) {
            Write-Host "  - $($issue.message)" -ForegroundColor Yellow
        }
    }
}
