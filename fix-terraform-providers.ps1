# Fix script to add missing Terraform provider requirements
# This script adds helm and kubernetes providers to all environment main.tf files

$ErrorActionPreference = "Stop"

Write-Host "Fixing Terraform provider requirements..." -ForegroundColor Cyan
Write-Host ""

function Fix-Providers {
    param(
        [string]$FilePath,
        [string]$EnvName
    )

    Write-Host "Processing $EnvName environment: $FilePath" -ForegroundColor Yellow

    # Check if file exists
    if (-not (Test-Path $FilePath)) {
        Write-Host "  - File not found, skipping" -ForegroundColor Red
        return
    }

    # Read the file
    $content = Get-Content $FilePath -Raw

    # Check if helm provider already exists
    if ($content -match '"hashicorp/helm"') {
        Write-Host "  - helm provider already exists, skipping" -ForegroundColor Green
        return
    }

    # Find the position after the random provider block
    $lines = Get-Content $FilePath

    $newLines = @()
    $inserted = $false

    for ($i = 0; $i -lt $lines.Count; $i++) {
        $newLines += $lines[$i]

        # Check if we're at the closing brace of the random provider
        if (-not $inserted -and $lines[$i] -match '^\s*}\s*$' -and $i -gt 0 -and $lines[$i-1] -match 'version.*3\.6\.0') {
            # Insert helm and kubernetes providers
            $newLines += '    helm = {'
            $newLines += '      source  = "hashicorp/helm"'
            $newLines += '      version = "~> 2.12"'
            $newLines += '    }'
            $newLines += '    kubernetes = {'
            $newLines += '      source  = "hashicorp/kubernetes"'
            $newLines += '      version = "~> 2.24"'
            $newLines += '    }'
            $inserted = $true
        }
    }

    # Write the file back
    $newLines | Set-Content $FilePath -Force
    Write-Host "  - Added helm and kubernetes providers" -ForegroundColor Green
}

# Base path
$basePath = "C:/Users/citad/OneDrive/Documents/Dating/DatingPlatform/terraform/environments"

# Fix dev environment
Fix-Providers -FilePath "$basePath/dev/main.tf" -EnvName "dev"

# Fix test environment
Fix-Providers -FilePath "$basePath/test/main.tf" -EnvName "test"

# Fix prod environment
Fix-Providers -FilePath "$basePath/prod/main.tf" -EnvName "prod"

Write-Host ""
Write-Host "Provider fixes complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "--------"
Write-Host "Added the following providers to all environments:"
Write-Host "  - hashicorp/helm ~> 2.12"
Write-Host "  - hashicorp/kubernetes ~> 2.24"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Review the changes in each environment's main.tf"
Write-Host "2. Run 'terraform init' in each environment directory"
Write-Host "3. Run 'terraform validate' to verify the configuration"
Write-Host ""
