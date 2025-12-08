param(
    [int[]]$BuildIds = @(73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84),
    [string]$PAT = "debreCRPB4KlkNeEoe8GEAlGrR6LWDzwdoZB4o3QdiPamoNp7DAqJQQJ99BLACAAAAAAAAAAAAASAZDO3xAI"
)

$headers = @{
    Authorization = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(':' + $PAT))
    'Content-Type' = 'application/json'
}

Write-Host "=== Canceling Builds ===" -ForegroundColor Cyan
Write-Host ""

foreach ($buildId in $BuildIds) {
    Write-Host "Canceling Build #$buildId..." -ForegroundColor Yellow
    $body = '{"status":"cancelling"}'
    try {
        $uri = "https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_apis/build/builds/$buildId`?api-version=7.1"
        Invoke-RestMethod -Uri $uri -Method Patch -Headers $headers -Body $body | Out-Null
        Write-Host "  Build #$buildId canceled" -ForegroundColor Green
    } catch {
        Write-Host "  Failed to cancel Build #${buildId}: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
