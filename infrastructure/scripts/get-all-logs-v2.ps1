param(
    [string]$PAT = "debreCRPB4KlkNeEoe8GEAlGrR6LWDzwdoZB4o3QdiPamoNp7DAqJQQJ99BLACAAAAAAAAAAAAASAZDO3xAI",
    [int]$BuildId = 126
)

$headers = @{
    Authorization = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(":" + $PAT))
}

$org = "citadelcloudmanagement"
$project = "DatingPlatform"

Write-Host "=== Build #$BuildId Full Timeline ===" -ForegroundColor Cyan

$timeline = Invoke-RestMethod -Uri "https://dev.azure.com/$org/$project/_apis/build/builds/$BuildId/timeline?api-version=7.1" -Headers $headers

$timeline.records | ForEach-Object {
    $color = switch ($_.result) {
        "succeeded" { "Green" }
        "failed" { "Red" }
        "skipped" { "Yellow" }
        default { "White" }
    }
    Write-Host ("[$($_.type)] $($_.name)") -ForegroundColor $color
    Write-Host ("  State: $($_.state), Result: $($_.result)") -ForegroundColor $color

    # Show issues if any
    if ($_.issues -and $_.issues.Count -gt 0) {
        Write-Host "  Issues:" -ForegroundColor Red
        $_.issues | ForEach-Object {
            Write-Host "    - $($_.message)" -ForegroundColor Red
        }
    }

    # Show error count
    if ($_.errorCount -gt 0) {
        Write-Host "  Error Count: $($_.errorCount)" -ForegroundColor Red
    }
    Write-Host ""
}

# Get all logs
Write-Host "=== All Build Logs ===" -ForegroundColor Cyan

$logs = Invoke-RestMethod -Uri "https://dev.azure.com/$org/$project/_apis/build/builds/$BuildId/logs?api-version=7.1" -Headers $headers

foreach ($log in $logs.value) {
    Write-Host ""
    Write-Host "=== Log #$($log.id) ===" -ForegroundColor Yellow
    try {
        $logContent = Invoke-RestMethod -Uri "https://dev.azure.com/$org/$project/_apis/build/builds/$BuildId/logs/$($log.id)?api-version=7.1" -Headers $headers
        # Show last 50 lines if log is long
        $lines = $logContent -split "`n"
        if ($lines.Count -gt 50) {
            Write-Host "... (showing last 50 lines of $($lines.Count) total)" -ForegroundColor Gray
            $lines | Select-Object -Last 50
        } else {
            $logContent
        }
    } catch {
        Write-Host "Could not retrieve log: $_" -ForegroundColor Red
    }
}
