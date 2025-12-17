$azCmd = "C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin\az.cmd"
$resourceGroup = "rg-terraform-state-westus2"
$location = "westus2"
$storageAccount = "sttfstatedatingplatform"
$containerName = "tfstate"

Write-Host "=== Creating Terraform Backend Infrastructure ===" -ForegroundColor Cyan
Write-Host ""

# Register provider
Write-Host "Registering Microsoft.Storage provider..." -ForegroundColor Yellow
& $azCmd provider register --namespace Microsoft.Storage

# Wait a moment for registration
Start-Sleep -Seconds 5

# Create storage account
Write-Host ""
Write-Host "Creating storage account: $storageAccount" -ForegroundColor Yellow
& $azCmd storage account create --name $storageAccount --resource-group $resourceGroup --location $location --sku Standard_LRS --kind StorageV2 --allow-blob-public-access false

if ($LASTEXITCODE -eq 0) {
    Write-Host "Storage account created successfully!" -ForegroundColor Green

    # Create container
    Write-Host ""
    Write-Host "Creating blob container: $containerName" -ForegroundColor Yellow
    & $azCmd storage container create --name $containerName --account-name $storageAccount --auth-mode login

    if ($LASTEXITCODE -eq 0) {
        Write-Host "Blob container created successfully!" -ForegroundColor Green
    } else {
        Write-Host "Failed to create blob container" -ForegroundColor Red
    }
} else {
    Write-Host "Failed to create storage account" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Listing Storage Accounts ===" -ForegroundColor Cyan
& $azCmd storage account list --query "[].{name:name, resourceGroup:resourceGroup}" -o table
