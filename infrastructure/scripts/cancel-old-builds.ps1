param(
    [string]$PAT = "debreCRPB4KlkNeEoe8GEAlGrR6LWDzwdoZB4o3QdiPamoNp7DAqJQQJ99BLACAAAAAAAAAAAAASAZDO3xAI",
    [switch]$KeepNewest
)

$headers = @{
    Authorization = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(':' + $PAT))
    'Content-Type' = 'application/json'
}

Write-Host "=== Canceling Old Queued Builds ===" -ForegroundColor Cyan

# Get all builds
$builds = Invoke-RestMethod -Uri 'https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_apis/build/builds?api-version=7.1' -Headers $headers

# Group by pipeline and find queued/in-progress builds
$ciBuilds = $builds.value | Where-Object { $_.definition.name -eq 'Flamoral-CI-Pipeline' -and $_.status -ne 'completed' } | Sort-Object id -Descending
$secBuilds = $builds.value | Where-Object { $_.definition.name -eq 'Flamoral-Security-Pipeline' -and $_.status -ne 'completed' } | Sort-Object id -Descending

Write-Host ""
Write-Host "Active CI Builds: $($ciBuilds.Count)" -ForegroundColor Yellow
Write-Host "Active Security Builds: $($secBuilds.Count)" -ForegroundColor Yellow

# Cancel all but the newest CI build
if ($ciBuilds.Count -gt 1) {
    $toCancel = $ciBuilds | Select-Object -Skip 1
    foreach ($build in $toCancel) {
        Write-Host "Canceling CI Build #$($build.id)..." -ForegroundColor Red
        $body = @{ status = 'cancelling' } | ConvertTo-Json
        try {
            Invoke-RestMethod -Uri "https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_apis/build/builds/$($build.id)?api-version=7.1" -Headers $headers -Method Patch -Body $body | Out-Null
            Write-Host "  Cancelled" -ForegroundColor Green
        } catch {
            Write-Host "  Failed: $_" -ForegroundColor Yellow
        }
    }
}

# Cancel all but the newest Security build
if ($secBuilds.Count -gt 1) {
    $toCancel = $secBuilds | Select-Object -Skip 1
    foreach ($build in $toCancel) {
        Write-Host "Canceling Security Build #$($build.id)..." -ForegroundColor Red
        $body = @{ status = 'cancelling' } | ConvertTo-Json
        try {
            Invoke-RestMethod -Uri "https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_apis/build/builds/$($build.id)?api-version=7.1" -Headers $headers -Method Patch -Body $body | Out-Null
            Write-Host "  Cancelled" -ForegroundColor Green
        } catch {
            Write-Host "  Failed: $_" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "=== Remaining Active Builds ===" -ForegroundColor Cyan
if ($ciBuilds.Count -gt 0) {
    Write-Host "CI: Build #$($ciBuilds[0].id) - $($ciBuilds[0].status)" -ForegroundColor Green
}
if ($secBuilds.Count -gt 0) {
    Write-Host "Security: Build #$($secBuilds[0].id) - $($secBuilds[0].status)" -ForegroundColor Green
}
