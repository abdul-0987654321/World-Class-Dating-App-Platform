param(
    [string]$PAT = "debreCRPB4KlkNeEoe8GEAlGrR6LWDzwdoZB4o3QdiPamoNp7DAqJQQJ99BLACAAAAAAAAAAAAASAZDO3xAI"
)

$headers = @{
    Authorization = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(":" + $PAT))
}

$org = "citadelcloudmanagement"

Write-Host "=== Default Agent Pool Agents ===" -ForegroundColor Cyan

# Pool ID 1 is "Default"
$agents = Invoke-RestMethod -Uri "https://dev.azure.com/$org/_apis/distributedtask/pools/1/agents?api-version=7.1" -Headers $headers

if ($agents.count -eq 0) {
    Write-Host "No agents registered in Default pool!" -ForegroundColor Red
} else {
    $agents.value | ForEach-Object {
        $color = if ($_.status -eq "online") { "Green" } else { "Red" }
        Write-Host ""
        Write-Host "Agent: $($_.name)" -ForegroundColor $color
        Write-Host "  ID: $($_.id)"
        Write-Host "  Status: $($_.status)"
        Write-Host "  Enabled: $($_.enabled)"
        if ($_.assignedRequest) {
            Write-Host "  Currently running: Build $($_.assignedRequest.requestId)" -ForegroundColor Yellow
        } else {
            Write-Host "  Currently idle" -ForegroundColor Gray
        }
    }
}

Write-Host ""
Write-Host "=== Current Running Builds ===" -ForegroundColor Cyan

$project = "DatingPlatform"
$builds = Invoke-RestMethod -Uri "https://dev.azure.com/$org/$project/_apis/build/builds?statusFilter=inProgress,notStarted&api-version=7.1" -Headers $headers

if ($builds.count -eq 0) {
    Write-Host "No builds currently running or queued" -ForegroundColor Gray
} else {
    $builds.value | ForEach-Object {
        Write-Host "Build #$($_.id) - $($_.definition.name) - Status: $($_.status)" -ForegroundColor Yellow
    }
}
