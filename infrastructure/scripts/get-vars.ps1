param(
    [string]$PAT = "debreCRPB4KlkNeEoe8GEAlGrR6LWDzwdoZB4o3QdiPamoNp7DAqJQQJ99BLACAAAAAAAAAAAAASAZDO3xAI"
)

$headers = @{
    Authorization = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(":" + $PAT))
}

$variableGroups = Invoke-RestMethod -Uri "https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_apis/distributedtask/variablegroups?api-version=7.1" -Headers $headers
$commonGroup = $variableGroups.value | Where-Object { $_.name -eq "datingplatform-terraform-common" }

Write-Host "Variable Group: $($commonGroup.name)"
Write-Host ""
Write-Host "Variables:"
$commonGroup.variables.PSObject.Properties | ForEach-Object {
    $val = if ($_.Value.isSecret) { "[SECRET]" } else { $_.Value.value }
    Write-Host "  $($_.Name): $val"
}
