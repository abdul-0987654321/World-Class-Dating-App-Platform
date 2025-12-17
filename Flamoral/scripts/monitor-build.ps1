param(
    [string]$PAT = "debreCRPB4KlkNeEoe8GEAlGrR6LWDzwdoZB4o3QdiPamoNp7DAqJQQJ99BLACAAAAAAAAAAAAASAZDO3xAI",
    [int]$BuildId = 0,
    [int]$RefreshSeconds = 15
)

$headers = @{
    Authorization = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(':' + $PAT))
}

function Get-BuildStatus {
    param($id)

    $build = Invoke-RestMethod -Uri "https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_apis/build/builds/$id`?api-version=7.1" -Headers $headers
    $timeline = Invoke-RestMethod -Uri "https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_apis/build/builds/$id/timeline?api-version=7.1" -Headers $headers

    Clear-Host
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host " Build #$id Monitor" -ForegroundColor Cyan
    Write-Host " Pipeline: $($build.definition.name)" -ForegroundColor White
    Write-Host " Commit: $($build.sourceVersion.Substring(0,7))" -ForegroundColor White
    Write-Host " Status: $($build.status) | Result: $($build.result)" -ForegroundColor $(if ($build.result -eq 'succeeded') { 'Green' } elseif ($build.result -eq 'failed') { 'Red' } else { 'Yellow' })
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""

    # Stages
    Write-Host "STAGES:" -ForegroundColor Cyan
    $stages = $timeline.records | Where-Object { $_.type -eq 'Stage' } | Sort-Object order
    foreach ($stage in $stages) {
        $icon = switch ($stage.result) {
            'succeeded' { '[OK]'; $color = 'Green' }
            'succeededWithIssues' { '[OK]'; $color = 'Yellow' }
            'failed' { '[X]'; $color = 'Red' }
            'skipped' { '[-]'; $color = 'DarkGray' }
            default {
                if ($stage.state -eq 'inProgress') { '[>>]'; $color = 'Cyan' }
                else { '[ ]'; $color = 'Gray' }
            }
        }
        Write-Host "  $icon $($stage.name)" -ForegroundColor $color
    }

    Write-Host ""
    Write-Host "JOBS:" -ForegroundColor Cyan
    $jobs = $timeline.records | Where-Object { $_.type -eq 'Job' -and $_.state -ne 'pending' } | Sort-Object order
    foreach ($job in $jobs) {
        $icon = switch ($job.result) {
            'succeeded' { '[OK]'; $color = 'Green' }
            'succeededWithIssues' { '[OK]'; $color = 'Yellow' }
            'failed' { '[X]'; $color = 'Red' }
            'skipped' { '[-]'; $color = 'DarkGray' }
            default {
                if ($job.state -eq 'inProgress') { '[>>]'; $color = 'Cyan' }
                else { '[ ]'; $color = 'Gray' }
            }
        }
        Write-Host "  $icon $($job.name)" -ForegroundColor $color
    }

    Write-Host ""
    Write-Host "Last updated: $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor DarkGray
    Write-Host "Press Ctrl+C to stop monitoring" -ForegroundColor DarkGray

    return $build.status
}

# If no build ID provided, get the latest CI build
if ($BuildId -eq 0) {
    $builds = Invoke-RestMethod -Uri 'https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_apis/build/builds?api-version=7.1' -Headers $headers
    $latest = $builds.value | Where-Object { $_.definition.name -eq 'Flamoral-CI-Pipeline' } | Sort-Object id -Descending | Select-Object -First 1
    $BuildId = $latest.id
    Write-Host "Monitoring latest CI build: #$BuildId" -ForegroundColor Yellow
    Start-Sleep -Seconds 2
}

# Monitor loop
while ($true) {
    $status = Get-BuildStatus -id $BuildId
    if ($status -eq 'completed') {
        Write-Host ""
        Write-Host "Build completed!" -ForegroundColor Green
        break
    }
    Start-Sleep -Seconds $RefreshSeconds
}
