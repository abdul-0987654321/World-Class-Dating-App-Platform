param(
    [int]$BuildId = 63,
    [string]$PAT = "debreCRPB4KlkNeEoe8GEAlGrR6LWDzwdoZB4o3QdiPamoNp7DAqJQQJ99BLACAAAAAAAAAAAAASAZDO3xAI"
)

$headers = @{
    Authorization = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(':' + $PAT))
}

Write-Host "=== Build #$BuildId Details ===" -ForegroundColor Cyan
$build = Invoke-RestMethod -Uri "https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_apis/build/builds/$($BuildId)?api-version=7.1" -Headers $headers

Write-Host "Build Number: $($build.buildNumber)"
Write-Host "Definition: $($build.definition.name)"
Write-Host "Status: $($build.status)"
Write-Host "Result: $($build.result)"
Write-Host "Source Version: $($build.sourceVersion)"
Write-Host "Source Branch: $($build.sourceBranch)"
Write-Host "Start Time: $($build.startTime)"
Write-Host "Finish Time: $($build.finishTime)"

Write-Host "`n=== Timeline ===" -ForegroundColor Cyan
$timeline = Invoke-RestMethod -Uri "https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_apis/build/builds/$($BuildId)/timeline?api-version=7.1" -Headers $headers

$timeline.records | Where-Object { $_.type -eq "Job" -or $_.type -eq "Stage" } | ForEach-Object {
    $color = switch ($_.result) {
        "succeeded" { "Green" }
        "failed" { "Red" }
        "canceled" { "Yellow" }
        "skipped" { "Gray" }
        default { "White" }
    }
    Write-Host ("  [{0}] {1}: {2} - {3}" -f $_.type, $_.name, $_.state, $_.result) -ForegroundColor $color
}
