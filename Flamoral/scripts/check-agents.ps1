param(
    [string]$PAT = "debreCRPB4KlkNeEoe8GEAlGrR6LWDzwdoZB4o3QdiPamoNp7DAqJQQJ99BLACAAAAAAAAAAAAASAZDO3xAI"
)

$headers = @{
    Authorization = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(':' + $PAT))
}

Write-Host "=== Agent Pools ===" -ForegroundColor Cyan

$pools = Invoke-RestMethod -Uri 'https://dev.azure.com/citadelcloudmanagement/_apis/distributedtask/pools?api-version=7.1' -Headers $headers

foreach ($pool in $pools.value) {
    Write-Host ""
    Write-Host "Pool: $($pool.name) (ID: $($pool.id))" -ForegroundColor Yellow

    # Get agents in this pool
    $agents = Invoke-RestMethod -Uri "https://dev.azure.com/citadelcloudmanagement/_apis/distributedtask/pools/$($pool.id)/agents?api-version=7.1" -Headers $headers

    if ($agents.count -gt 0) {
        foreach ($agent in $agents.value) {
            $statusColor = switch ($agent.status) {
                "online" { "Green" }
                "offline" { "Red" }
                default { "Yellow" }
            }
            Write-Host "  Agent: $($agent.name) - Status: $($agent.status) - Enabled: $($agent.enabled)" -ForegroundColor $statusColor
        }
    } else {
        Write-Host "  No agents in this pool" -ForegroundColor Gray
    }
}
