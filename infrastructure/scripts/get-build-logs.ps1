param(
    [int]$BuildId = 123,
    [string]$PAT = "debreCRPB4KlkNeEoe8GEAlGrR6LWDzwdoZB4o3QdiPamoNp7DAqJQQJ99BLACAAAAAAAAAAAAASAZDO3xAI"
)

$headers = @{
    Authorization = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(":" + $PAT))
}

$baseUrl = "https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_apis"

# Get timeline to find failed task
$timeline = Invoke-RestMethod -Uri "$baseUrl/build/builds/$BuildId/timeline?api-version=7.1" -Headers $headers

# Find the Terraform Init & Validate task
$terraformTask = $timeline.records | Where-Object { $_.name -like "*Terraform Init*" -and $_.type -eq "Task" }

if ($terraformTask -and $terraformTask.log) {
    Write-Host "=== Terraform Init & Validate Logs ===" -ForegroundColor Cyan
    $logUrl = $terraformTask.log.url
    $logContent = Invoke-RestMethod -Uri $logUrl -Headers $headers

    # Show last 100 lines
    $lines = $logContent -split "`n"
    $startIndex = [Math]::Max(0, $lines.Count - 100)
    $lines[$startIndex..($lines.Count-1)] | ForEach-Object {
        if ($_ -match "Error|error|ERROR|failed|FAILED") {
            Write-Host $_ -ForegroundColor Red
        } elseif ($_ -match "Warning|warning|WARNING") {
            Write-Host $_ -ForegroundColor Yellow
        } else {
            Write-Host $_
        }
    }
} else {
    Write-Host "Could not find Terraform Init & Validate task logs" -ForegroundColor Red
    Write-Host ""
    Write-Host "Available tasks:" -ForegroundColor Yellow
    $timeline.records | Where-Object { $_.type -eq "Task" } | ForEach-Object {
        Write-Host "  - $($_.name) (Result: $($_.result))"
    }
}
