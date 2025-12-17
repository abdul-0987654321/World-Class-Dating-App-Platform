param(
    [string]$PAT = "debreCRPB4KlkNeEoe8GEAlGrR6LWDzwdoZB4o3QdiPamoNp7DAqJQQJ99BLACAAAAAAAAAAAAASAZDO3xAI",
    [int]$BuildId = 87
)

$headers = @{
    Authorization = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(':' + $PAT))
}

Write-Host "=== Build #$BuildId Timeline ===" -ForegroundColor Cyan

$timeline = Invoke-RestMethod -Uri "https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_apis/build/builds/$BuildId/timeline?api-version=7.1" -Headers $headers

$timeline.records | Where-Object { $_.type -eq 'Stage' -or $_.type -eq 'Job' } | ForEach-Object {
    $indent = ''
    if ($_.type -eq 'Job') { $indent = '  ' }

    $statusColor = switch ($_.state) {
        "completed" { if ($_.result -eq "succeeded") { "Green" } elseif ($_.result -eq "failed") { "Red" } else { "Yellow" } }
        "inProgress" { "Cyan" }
        "pending" { "Gray" }
        default { "White" }
    }

    Write-Host ($indent + $_.name + " - State: " + $_.state + " - Result: " + $_.result) -ForegroundColor $statusColor
}
