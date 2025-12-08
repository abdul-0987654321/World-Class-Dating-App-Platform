param(
    [string]$PAT = "debreCRPB4KlkNeEoe8GEAlGrR6LWDzwdoZB4o3QdiPamoNp7DAqJQQJ99BLACAAAAAAAAAAAAASAZDO3xAI"
)

$headers = @{
    Authorization = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(":" + $PAT))
    "Content-Type" = "application/json"
}

$org = "citadelcloudmanagement"
$project = "DatingPlatform"

Write-Host "=== Cancelling Non-Bootstrap Queued Builds ===" -ForegroundColor Cyan

$builds = Invoke-RestMethod -Uri "https://dev.azure.com/$org/$project/_apis/build/builds?statusFilter=inProgress,notStarted&api-version=7.1" -Headers $headers

$builds.value | ForEach-Object {
    if ($_.definition.name -ne "Bootstrap - Create Terraform Backend") {
        Write-Host "Cancelling Build #$($_.id) - $($_.definition.name)" -ForegroundColor Yellow

        $body = @{ status = "cancelling" } | ConvertTo-Json

        try {
            $result = Invoke-RestMethod -Uri "https://dev.azure.com/$org/$project/_apis/build/builds/$($_.id)?api-version=7.1" -Method Patch -Headers $headers -Body $body
            Write-Host "  Cancelled" -ForegroundColor Green
        } catch {
            Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "Keeping Build #$($_.id) - $($_.definition.name)" -ForegroundColor Green
    }
}
