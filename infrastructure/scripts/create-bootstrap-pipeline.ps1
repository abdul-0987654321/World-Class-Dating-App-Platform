param(
    [string]$PAT = "debreCRPB4KlkNeEoe8GEAlGrR6LWDzwdoZB4o3QdiPamoNp7DAqJQQJ99BLACAAAAAAAAAAAAASAZDO3xAI"
)

$headers = @{
    Authorization = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(":" + $PAT))
    "Content-Type" = "application/json"
}

$org = "citadelcloudmanagement"
$project = "DatingPlatform"

Write-Host "=== Creating Bootstrap Pipeline ===" -ForegroundColor Cyan

# Create the pipeline definition
$body = @{
    name = "Bootstrap - Create Terraform Backend"
    folder = "\"
    configuration = @{
        type = "yaml"
        path = "/pipelines/azure-pipelines-bootstrap.yml"
        repository = @{
            id = "ca2c4828-4c25-4499-b79e-59d84a98f6ab"
            type = "azureReposGit"
            name = "DatingPlatform"
        }
    }
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "https://dev.azure.com/$org/$project/_apis/pipelines?api-version=7.1" -Method Post -Headers $headers -Body $body
    Write-Host "Bootstrap pipeline created!" -ForegroundColor Green
    Write-Host "Pipeline ID: $($response.id)"
    Write-Host "Pipeline Name: $($response.name)"
    $response | ConvertTo-Json
} catch {
    $errorMsg = $_.Exception.Message
    if ($errorMsg -match "already exists") {
        Write-Host "Pipeline already exists, fetching existing pipelines..." -ForegroundColor Yellow
        $pipelines = Invoke-RestMethod -Uri "https://dev.azure.com/$org/$project/_apis/pipelines?api-version=7.1" -Headers $headers
        $bootstrap = $pipelines.value | Where-Object { $_.name -like "*Bootstrap*" -or $_.name -like "*bootstrap*" }
        if ($bootstrap) {
            Write-Host "Found existing bootstrap pipeline:" -ForegroundColor Green
            $bootstrap | ForEach-Object {
                Write-Host "  Pipeline ID: $($_.id) - Name: $($_.name)"
            }
        }
    } else {
        Write-Host "Error: $errorMsg" -ForegroundColor Red
        $_.ErrorDetails.Message
    }
}
