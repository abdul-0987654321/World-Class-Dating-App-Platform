param(
    [string]$PAT = "debreCRPB4KlkNeEoe8GEAlGrR6LWDzwdoZB4o3QdiPamoNp7DAqJQQJ99BLACAAAAAAAAAAAAASAZDO3xAI"
)

$headers = @{
    Authorization = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(":" + $PAT))
    "Content-Type" = "application/json"
}

$org = "citadelcloudmanagement"
$project = "DatingPlatform"

Write-Host "=== Cancelling ALL Queued/Running Builds ===" -ForegroundColor Cyan

$builds = Invoke-RestMethod -Uri "https://dev.azure.com/$org/$project/_apis/build/builds?statusFilter=inProgress,notStarted&api-version=7.1" -Headers $headers

if ($builds.count -eq 0) {
    Write-Host "No builds to cancel" -ForegroundColor Green
} else {
    $builds.value | ForEach-Object {
        Write-Host "Cancelling Build #$($_.id) - $($_.definition.name)" -ForegroundColor Yellow
        $body = @{ status = "cancelling" } | ConvertTo-Json
        try {
            Invoke-RestMethod -Uri "https://dev.azure.com/$org/$project/_apis/build/builds/$($_.id)?api-version=7.1" -Method Patch -Headers $headers -Body $body | Out-Null
            Write-Host "  Cancelled" -ForegroundColor Green
        } catch {
            Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "All builds cancelled." -ForegroundColor Cyan
