param(
    [string]$PAT = "debreCRPB4KlkNeEoe8GEAlGrR6LWDzwdoZB4o3QdiPamoNp7DAqJQQJ99BLACAAAAAAAAAAAAASAZDO3xAI"
)

$headers = @{
    Authorization = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(":" + $PAT))
}

$org = "citadelcloudmanagement"

Write-Host "=== Azure DevOps Agent Pools ===" -ForegroundColor Cyan

$pools = Invoke-RestMethod -Uri "https://dev.azure.com/$org/_apis/distributedtask/pools?api-version=7.1" -Headers $headers

$pools.value | ForEach-Object {
    $color = if ($_.isHosted) { "Yellow" } else { "Green" }
    Write-Host ""
    Write-Host "Pool: $($_.name)" -ForegroundColor $color
    Write-Host "  ID: $($_.id)"
    Write-Host "  Is Hosted: $($_.isHosted)"
    Write-Host "  Size: $($_.size)"
    Write-Host "  Auto-Provision: $($_.autoProvision)"
}
