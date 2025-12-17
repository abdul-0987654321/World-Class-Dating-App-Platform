param(
    [string]$PAT = "debreCRPB4KlkNeEoe8GEAlGrR6LWDzwdoZB4o3QdiPamoNp7DAqJQQJ99BLACAAAAAAAAAAAAASAZDO3xAI",
    [string]$StatusFilter = ""
)

$headers = @{
    Authorization = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(':' + $PAT))
}

$uri = 'https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_apis/build/builds?api-version=7.1'
if ($StatusFilter) {
    $uri += "&statusFilter=$StatusFilter"
}

Write-Host "=== Builds ===" -ForegroundColor Cyan
$builds = Invoke-RestMethod -Uri $uri -Headers $headers

$builds.value | Select-Object -First 20 | ForEach-Object {
    $color = switch ($_.result) {
        "succeeded" { "Green" }
        "failed" { "Red" }
        "canceled" { "Yellow" }
        "partiallySucceeded" { "Yellow" }
        default { "White" }
    }
    Write-Host ("Build #{0} - {1} - Status: {2} - Result: {3}" -f $_.id, $_.definition.name, $_.status, $_.result) -ForegroundColor $color
}
