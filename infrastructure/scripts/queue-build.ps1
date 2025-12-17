param(
    [string]$PAT = "debreCRPB4KlkNeEoe8GEAlGrR6LWDzwdoZB4o3QdiPamoNp7DAqJQQJ99BLACAAAAAAAAAAAAASAZDO3xAI",
    [int]$DefinitionId = 16
)

$headers = @{
    Authorization = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(':' + $PAT))
    'Content-Type' = 'application/json'
}

# Queue a new build
$body = @{
    definition = @{ id = $DefinitionId }
} | ConvertTo-Json

$result = Invoke-RestMethod -Uri 'https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_apis/build/builds?api-version=7.1' -Method Post -Headers $headers -Body $body
Write-Host "Queued new build #$($result.id) for definition $DefinitionId"
