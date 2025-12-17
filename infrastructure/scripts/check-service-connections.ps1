param(
    [string]$PAT = "debreCRPB4KlkNeEoe8GEAlGrR6LWDzwdoZB4o3QdiPamoNp7DAqJQQJ99BLACAAAAAAAAAAAAASAZDO3xAI"
)

$headers = @{
    Authorization = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(":" + $PAT))
}

$org = "citadelcloudmanagement"
$project = "DatingPlatform"

Write-Host "=== Azure DevOps Service Connections ===" -ForegroundColor Cyan

try {
    $endpoints = Invoke-RestMethod -Uri "https://dev.azure.com/$org/$project/_apis/serviceendpoint/endpoints?api-version=7.1" -Headers $headers

    if ($endpoints.count -eq 0) {
        Write-Host "No service connections found" -ForegroundColor Yellow
    } else {
        Write-Host "Found $($endpoints.count) service connection(s):" -ForegroundColor Green
        Write-Host ""
        foreach ($ep in $endpoints.value) {
            Write-Host "Name: $($ep.name)" -ForegroundColor Yellow
            Write-Host "  Type: $($ep.type)"
            Write-Host "  ID: $($ep.id)"
            if ($ep.authorization.parameters.serviceprincipalid) {
                Write-Host "  Service Principal ID: $($ep.authorization.parameters.serviceprincipalid)"
            }
            if ($ep.authorization.parameters.tenantid) {
                Write-Host "  Tenant ID: $($ep.authorization.parameters.tenantid)"
            }
            if ($ep.data.subscriptionId) {
                Write-Host "  Subscription ID: $($ep.data.subscriptionId)"
            }
            Write-Host ""
        }
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
