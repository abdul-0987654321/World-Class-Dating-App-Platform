param(
    [string]$PAT = "debreCRPB4KlkNeEoe8GEAlGrR6LWDzwdoZB4o3QdiPamoNp7DAqJQQJ99BLACAAAAAAAAAAAAASAZDO3xAI"
)

$headers = @{
    Authorization = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(':' + $PAT))
}

Write-Host "=== Pipeline Definitions ===" -ForegroundColor Cyan
$pipelines = Invoke-RestMethod -Uri 'https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_apis/pipelines?api-version=7.1' -Headers $headers
$pipelines.value | ForEach-Object {
    Write-Host ("ID: " + $_.id + " - Name: " + $_.name)
}
