param(
    [string]$PAT = "debreCRPB4KlkNeEoe8GEAlGrR6LWDzwdoZB4o3QdiPamoNp7DAqJQQJ99BLACAAAAAAAAAAAAASAZDO3xAI"
)

$headers = @{
    Authorization = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(":" + $PAT))
    "Content-Type" = "application/json"
}

$org = "citadelcloudmanagement"
$project = "DatingPlatform"
$baseUrl = "https://dev.azure.com/$org/$project/_apis"

Write-Host "=== Fetching All Builds ===" -ForegroundColor Cyan
$buildsResponse = Invoke-RestMethod -Uri "$baseUrl/build/builds?api-version=7.1" -Headers $headers
$builds = $buildsResponse.value

Write-Host "`n=== Current Build Status ===" -ForegroundColor Yellow
$builds | Select-Object -First 15 | ForEach-Object {
    $color = switch ($_.status) {
        "completed" { if ($_.result -eq "succeeded") { "Green" } else { "Red" } }
        "inProgress" { "Yellow" }
        "notStarted" { "Gray" }
        default { "White" }
    }
    Write-Host ("Build #$($_.id) - $($_.definition.name) - Status: $($_.status) - Result: $($_.result)") -ForegroundColor $color
}

# Find queued builds (notStarted status)
$queuedBuilds = $builds | Where-Object { $_.status -eq "notStarted" }
$inProgressBuilds = $builds | Where-Object { $_.status -eq "inProgress" }

Write-Host "`n=== Queued Builds to Cancel ===" -ForegroundColor Magenta
if ($queuedBuilds.Count -eq 0) {
    Write-Host "No queued builds found." -ForegroundColor Green
} else {
    foreach ($build in $queuedBuilds) {
        Write-Host "Cancelling Build #$($build.id) - $($build.definition.name)..." -ForegroundColor Yellow
        try {
            $cancelBody = @{ status = "cancelling" } | ConvertTo-Json
            Invoke-RestMethod -Uri "$baseUrl/build/builds/$($build.id)?api-version=7.1" -Headers $headers -Method Patch -Body $cancelBody
            Write-Host "  Cancelled successfully" -ForegroundColor Green
        } catch {
            Write-Host "  Failed to cancel: $_" -ForegroundColor Red
        }
    }
}

Write-Host "`n=== In-Progress Builds ===" -ForegroundColor Cyan
if ($inProgressBuilds.Count -eq 0) {
    Write-Host "No in-progress builds." -ForegroundColor Green
} else {
    foreach ($build in $inProgressBuilds) {
        Write-Host "Build #$($build.id) - $($build.definition.name) - Running" -ForegroundColor Yellow
    }
}

# Get the most recent build
$latestBuild = $builds | Select-Object -First 1
Write-Host "`n=== Latest Build ===" -ForegroundColor Cyan
Write-Host "Build #$($latestBuild.id) - $($latestBuild.definition.name)"
Write-Host "Status: $($latestBuild.status) | Result: $($latestBuild.result)"
Write-Host "Started: $($latestBuild.startTime)"
Write-Host "URL: https://dev.azure.com/$org/$project/_build/results?buildId=$($latestBuild.id)"
