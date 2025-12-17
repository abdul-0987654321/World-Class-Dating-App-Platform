$PAT = 'debreCRPB4KlkNeEoe8GEAlGrR6LWDzwdoZB4o3QdiPamoNp7DAqJQQJ99BLACAAAAAAAAAAAAASAZDO3xAI'
$headers = @{
    Authorization = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(':' + $PAT))
}
$builds = Invoke-RestMethod -Uri 'https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_apis/build/builds?api-version=7.1' -Headers $headers
Write-Host '=== Latest 5 Builds ===' -ForegroundColor Cyan
$builds.value | Select-Object -First 5 | ForEach-Object {
    Write-Host ('Build #{0} - {1} - Status: {2} - Result: {3}' -f $_.id, $_.definition.name, $_.status, $_.result)
}
