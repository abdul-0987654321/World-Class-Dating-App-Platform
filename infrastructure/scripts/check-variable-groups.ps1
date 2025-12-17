param(
    [string]$PAT = "debreCRPB4KlkNeEoe8GEAlGrR6LWDzwdoZB4o3QdiPamoNp7DAqJQQJ99BLACAAAAAAAAAAAAASAZDO3xAI"
)

$headers = @{
    Authorization = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(":" + $PAT))
}

$org = "citadelcloudmanagement"
$project = "DatingPlatform"

Write-Host "=== Variable Groups ===" -ForegroundColor Cyan

$varGroups = Invoke-RestMethod -Uri "https://dev.azure.com/$org/$project/_apis/distributedtask/variablegroups?api-version=7.1" -Headers $headers

$varGroups.value | ForEach-Object {
    Write-Host ""
    Write-Host ("Group: " + $_.name + " (ID: " + $_.id + ")") -ForegroundColor Yellow
    if ($_.variables) {
        $_.variables.PSObject.Properties | ForEach-Object {
            $val = if ($_.Value.isSecret) { "***" } else { $_.Value.value }
            Write-Host ("  " + $_.Name + ": " + $val)
        }
    }
}
