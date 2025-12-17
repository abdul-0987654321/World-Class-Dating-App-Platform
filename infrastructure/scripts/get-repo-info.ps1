param(
    [string]$PAT = "debreCRPB4KlkNeEoe8GEAlGrR6LWDzwdoZB4o3QdiPamoNp7DAqJQQJ99BLACAAAAAAAAAAAAASAZDO3xAI"
)

$headers = @{
    Authorization = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(":" + $PAT))
}

$org = "citadelcloudmanagement"
$project = "DatingPlatform"

Write-Host "=== Getting Repository Info ===" -ForegroundColor Cyan

$repos = Invoke-RestMethod -Uri "https://dev.azure.com/$org/$project/_apis/git/repositories?api-version=7.1" -Headers $headers

Write-Host "Repositories found:" -ForegroundColor Green
$repos.value | ForEach-Object {
    Write-Host "  Name: $($_.name)" -ForegroundColor Yellow
    Write-Host "  ID: $($_.id)"
    Write-Host "  Default Branch: $($_.defaultBranch)"
    Write-Host ""
}
