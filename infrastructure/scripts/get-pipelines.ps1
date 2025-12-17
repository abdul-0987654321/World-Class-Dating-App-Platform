param(
    [string]$PAT = "debreCRPB4KlkNeEoe8GEAlGrR6LWDzwdoZB4o3QdiPamoNp7DAqJQQJ99BLACAAAAAAAAAAAAASAZDO3xAI"
)

$headers = @{
    Authorization = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(':' + $PAT))
}

Write-Host "=== All Pipeline Definitions ===" -ForegroundColor Cyan

$pipelines = Invoke-RestMethod -Uri 'https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_apis/pipelines?api-version=7.1' -Headers $headers

$pipelines.value | ForEach-Object {
    Write-Host ""
    Write-Host ("Pipeline: " + $_.name) -ForegroundColor Yellow
    Write-Host ("  ID: " + $_.id)
    Write-Host ("  URL: https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_build?definitionId=" + $_.id)
}

Write-Host ""
Write-Host "=== Recent Builds ===" -ForegroundColor Cyan

$builds = Invoke-RestMethod -Uri 'https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_apis/build/builds?api-version=7.1' -Headers $headers

$builds.value | Select-Object -First 15 | ForEach-Object {
    $color = switch ($_.result) {
        "succeeded" { "Green" }
        "failed" { "Red" }
        "canceled" { "Yellow" }
        default { "White" }
    }
    Write-Host ("Build #" + $_.id + " - " + $_.definition.name + " - Status: " + $_.status + " - Result: " + $_.result) -ForegroundColor $color
    Write-Host ("  URL: " + $_.url -replace '_apis/build/builds', '_build/results?buildId=' -replace '\?api-version=7.1', '')
}
