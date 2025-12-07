$PAT = 'debreCRPB4KlkNeEoe8GEAlGrR6LWDzwdoZB4o3QdiPamoNp7DAqJQQJ99BLACAAAAAAAAAAAAASAZDO3xAI'
$headers = @{
    'Authorization' = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(":$PAT"))
}

Write-Host "=== Agent Pools ===" -ForegroundColor Cyan
$pools = Invoke-RestMethod -Uri 'https://dev.azure.com/citadelcloudmanagement/_apis/distributedtask/pools?api-version=7.1' -Headers $headers

foreach ($pool in $pools.value) {
    Write-Host "`nPool: $($pool.name) (ID: $($pool.id))" -ForegroundColor Yellow

    # Get agents in pool
    $agents = Invoke-RestMethod -Uri "https://dev.azure.com/citadelcloudmanagement/_apis/distributedtask/pools/$($pool.id)/agents?api-version=7.1" -Headers $headers

    if ($agents.count -eq 0) {
        Write-Host "  No agents configured" -ForegroundColor Red
    } else {
        foreach ($agent in $agents.value) {
            $statusColor = if ($agent.status -eq 'online') { 'Green' } else { 'Red' }
            Write-Host "  Agent: $($agent.name)" -NoNewline
            Write-Host " - Status: $($agent.status)" -ForegroundColor $statusColor -NoNewline
            Write-Host " - Enabled: $($agent.enabled)"
        }
    }
}
