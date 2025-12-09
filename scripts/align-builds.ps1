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

Write-Host "=== Aligning Builds - Keeping Only Latest Per Pipeline ===" -ForegroundColor Cyan

# Get all builds
$buildsResponse = Invoke-RestMethod -Uri "$baseUrl/build/builds?api-version=7.1" -Headers $headers
$builds = $buildsResponse.value

# Group by pipeline and find in-progress duplicates
$inProgressBuilds = $builds | Where-Object { $_.status -eq "inProgress" }
$byPipeline = $inProgressBuilds | Group-Object { $_.definition.name }

foreach ($group in $byPipeline) {
    if ($group.Count -gt 1) {
        Write-Host "`nPipeline: $($group.Name) has $($group.Count) in-progress builds" -ForegroundColor Yellow
        # Sort by build ID (highest = newest), keep newest, cancel rest
        $sorted = $group.Group | Sort-Object -Property id -Descending
        $keepBuild = $sorted | Select-Object -First 1
        $cancelBuilds = $sorted | Select-Object -Skip 1

        Write-Host "  Keeping Build #$($keepBuild.id)" -ForegroundColor Green

        foreach ($build in $cancelBuilds) {
            Write-Host "  Cancelling older Build #$($build.id)..." -ForegroundColor Yellow
            try {
                $cancelBody = @{ status = "cancelling" } | ConvertTo-Json
                Invoke-RestMethod -Uri "$baseUrl/build/builds/$($build.id)?api-version=7.1" -Headers $headers -Method Patch -Body $cancelBody | Out-Null
                Write-Host "    Cancelled" -ForegroundColor Green
            } catch {
                Write-Host "    Failed: $_" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "`nPipeline: $($group.Name) - 1 in-progress build (OK)" -ForegroundColor Green
    }
}

# Queue a new Infrastructure pipeline build
Write-Host "`n=== Queuing Fresh Infrastructure Build ===" -ForegroundColor Cyan
$infraDefId = 13  # Flamoral-Infrastructure-Pipeline

$queueBody = @{
    definition = @{ id = $infraDefId }
    sourceBranch = "refs/heads/main"
    templateParameters = @{
        environment = "dev"
        terraformAction = "plan"
        autoApprove = "false"
    }
} | ConvertTo-Json -Depth 5

try {
    $newBuild = Invoke-RestMethod -Uri "$baseUrl/build/builds?api-version=7.1" -Headers $headers -Method Post -Body $queueBody
    Write-Host "Queued new Infrastructure build: #$($newBuild.id)" -ForegroundColor Green
    Write-Host "URL: https://dev.azure.com/$org/$project/_build/results?buildId=$($newBuild.id)" -ForegroundColor Cyan
} catch {
    Write-Host "Failed to queue: $_" -ForegroundColor Red
}

# Final status
Write-Host "`n=== Final Build Status ===" -ForegroundColor Cyan
Start-Sleep -Seconds 2
$finalBuilds = (Invoke-RestMethod -Uri "$baseUrl/build/builds?api-version=7.1" -Headers $headers).value
$finalBuilds | Where-Object { $_.status -ne "completed" } | ForEach-Object {
    $color = switch ($_.status) {
        "inProgress" { "Yellow" }
        "notStarted" { "Gray" }
        "cancelling" { "DarkYellow" }
        default { "White" }
    }
    Write-Host "Build #$($_.id) - $($_.definition.name) - $($_.status)" -ForegroundColor $color
}
