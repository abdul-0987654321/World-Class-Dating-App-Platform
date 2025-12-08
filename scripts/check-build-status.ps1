param(
    [string]$PAT = "debreCRPB4KlkNeEoe8GEAlGrR6LWDzwdoZB4o3QdiPamoNp7DAqJQQJ99BLACAAAAAAAAAAAAASAZDO3xAI",
    [int]$BuildId = 107
)

$headers = @{
    Authorization = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(':' + $PAT))
}

Write-Host "=== Build #$BuildId Status ===" -ForegroundColor Cyan

# Get build info
$build = Invoke-RestMethod -Uri "https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_apis/build/builds/$BuildId?api-version=7.1" -Headers $headers
Write-Host "Pipeline: $($build.definition.name)"
Write-Host "Status: $($build.status)"
Write-Host "Result: $($build.result)"
Write-Host "Source: $($build.sourceBranch)"
Write-Host "Commit: $($build.sourceVersion.Substring(0,7))"
Write-Host ""

# Get timeline to see stages/jobs
$timeline = Invoke-RestMethod -Uri "https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_apis/build/builds/$BuildId/timeline?api-version=7.1" -Headers $headers

Write-Host "=== Stages ===" -ForegroundColor Cyan
$stages = $timeline.records | Where-Object { $_.type -eq 'Stage' } | Sort-Object order
$stages | ForEach-Object {
    $color = switch ($_.result) {
        'succeeded' { 'Green' }
        'failed' { 'Red' }
        'skipped' { 'DarkGray' }
        default { 'Yellow' }
    }
    $status = if ($_.state -eq 'completed') { $_.result } else { $_.state }
    Write-Host ("  " + $_.name + ": " + $status) -ForegroundColor $color
}

Write-Host ""
Write-Host "=== Jobs ===" -ForegroundColor Cyan
$jobs = $timeline.records | Where-Object { $_.type -eq 'Job' } | Sort-Object order
$jobs | ForEach-Object {
    $color = switch ($_.result) {
        'succeeded' { 'Green' }
        'failed' { 'Red' }
        'skipped' { 'DarkGray' }
        default { 'Yellow' }
    }
    $status = if ($_.state -eq 'completed') { $_.result } else { $_.state }
    Write-Host ("  " + $_.name + ": " + $status) -ForegroundColor $color
}
