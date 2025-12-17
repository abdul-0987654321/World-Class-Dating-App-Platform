$PAT = 'debreCRPB4KlkNeEoe8GEAlGrR6LWDzwdoZB4o3QdiPamoNp7DAqJQQJ99BLACAAAAAAAAAAAAASAZDO3xAI'
$headers = @{
    Authorization = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(':' + $PAT))
}

# Get all variable groups
$vg = Invoke-RestMethod -Uri 'https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_apis/distributedtask/variablegroups?api-version=7.1' -Headers $headers

Write-Host "=== Variable Groups ==="
foreach ($group in $vg.value) {
    Write-Host ""
    Write-Host "Group: $($group.name) (ID: $($group.id))" -ForegroundColor Cyan
    foreach ($var in $group.variables.PSObject.Properties) {
        $value = $var.Value.value
        if ($var.Value.isSecret) {
            $value = "***SECRET***"
        }
        Write-Host "  $($var.Name) = $value"
    }
}
