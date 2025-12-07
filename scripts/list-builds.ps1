$PAT = 'debreCRPB4KlkNeEoe8GEAlGrR6LWDzwdoZB4o3QdiPamoNp7DAqJQQJ99BLACAAAAAAAAAAAAASAZDO3xAI'
$headers = @{
    'Authorization' = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(":$PAT"))
}

Write-Host "=== Recent Builds ===" -ForegroundColor Cyan
$builds = Invoke-RestMethod -Uri 'https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_apis/build/builds?api-version=7.1' -Headers $headers

$builds.value | Select-Object -First 10 | ForEach-Object {
    $statusColor = switch ($_.status) {
        'completed' { if ($_.result -eq 'succeeded') { 'Green' } else { 'Red' } }
        'inProgress' { 'Yellow' }
        'notStarted' { 'Gray' }
        default { 'White' }
    }
    Write-Host "Build #$($_.id) - $($_.definition.name)" -NoNewline
    Write-Host " - Status: $($_.status)" -ForegroundColor $statusColor -NoNewline
    if ($_.result) {
        Write-Host " - Result: $($_.result)" -ForegroundColor $statusColor
    } else {
        Write-Host ""
    }
}
