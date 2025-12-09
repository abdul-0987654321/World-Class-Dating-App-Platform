param(
    [int]$BuildId = 147,
    [string]$PAT = "debreCRPB4KlkNeEoe8GEAlGrR6LWDzwdoZB4o3QdiPamoNp7DAqJQQJ99BLACAAAAAAAAAAAAASAZDO3xAI"
)

$headers = @{
    Authorization = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(":" + $PAT))
}

$org = "citadelcloudmanagement"
$project = "DatingPlatform"

Write-Host "=== Build #$BuildId Timeline ===" -ForegroundColor Cyan

$timeline = Invoke-RestMethod -Uri "https://dev.azure.com/$org/$project/_apis/build/builds/$BuildId/timeline?api-version=7.1" -Headers $headers

# Find all failed steps
$failed = $timeline.records | Where-Object { $_.result -eq 'failed' }

$failed | ForEach-Object {
    Write-Host ""
    Write-Host "=== FAILED ===" -ForegroundColor Red
    Write-Host ("Name: " + $_.name) -ForegroundColor Yellow
    Write-Host ("Type: " + $_.type)
    Write-Host ("Log ID: " + $_.log.id)

    if ($_.log.id) {
        Write-Host ""
        Write-Host "=== Log Content ===" -ForegroundColor Cyan
        $logUrl = "https://dev.azure.com/$org/$project/_apis/build/builds/$BuildId/logs/$($_.log.id)?api-version=7.1"
        $logContent = Invoke-RestMethod -Uri $logUrl -Headers $headers
        # Show last 100 lines
        $lines = $logContent -split "`n"
        $startIndex = [Math]::Max(0, $lines.Count - 100)
        $lines[$startIndex..($lines.Count-1)] | ForEach-Object { Write-Host $_ }
    }
}
