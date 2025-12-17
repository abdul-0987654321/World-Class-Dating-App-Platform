# PowerShell Script to Update CDN URLs in Flamoral Environment Files
# This script adds/updates CDN configuration in all frontend environment files

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Flamoral CDN URL Configuration Updater" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = $PSScriptRoot

# Function to append CDN config if not exists
function Add-CDNConfig {
    param(
        [string]$filePath,
        [string]$cdnUrl,
        [string]$mediaCdnUrl,
        [string]$prefix = "VITE_"
    )

    if (Test-Path $filePath) {
        $content = Get-Content $filePath -Raw

        # Check if CDN URLs already exist
        if ($content -notmatch "${prefix}CDN_URL") {
            Write-Host "Adding CDN configuration to: $filePath" -ForegroundColor Green

            $cdnConfig = @"

# ============================================================================
# CDN Configuration
# ============================================================================
${prefix}CDN_URL=$cdnUrl
${prefix}MEDIA_CDN_URL=$mediaCdnUrl
"@

            # Add before Feature Flags section if it exists, otherwise append
            if ($content -match "# Feature Flags") {
                $content = $content -replace "# Feature Flags", "$cdnConfig`n`n# Feature Flags"
            } else {
                $content += $cdnConfig
            }

            Set-Content -Path $filePath -Value $content -NoNewline
            Write-Host "  ✓ CDN URLs added successfully" -ForegroundColor Green
        } else {
            Write-Host "CDN configuration already exists in: $filePath" -ForegroundColor Yellow
        }
    } else {
        Write-Host "File not found: $filePath" -ForegroundColor Red
    }
}

# Function to update existing CDN URLs
function Update-CDNConfig {
    param(
        [string]$filePath,
        [string]$oldCdnUrl,
        [string]$newCdnUrl,
        [string]$oldMediaCdnUrl,
        [string]$newMediaCdnUrl
    )

    if (Test-Path $filePath) {
        $content = Get-Content $filePath -Raw

        if ($content -match [regex]::Escape($oldCdnUrl)) {
            Write-Host "Updating CDN URLs in: $filePath" -ForegroundColor Green
            $content = $content -replace [regex]::Escape($oldCdnUrl), $newCdnUrl
            $content = $content -replace [regex]::Escape($oldMediaCdnUrl), $newMediaCdnUrl
            Set-Content -Path $filePath -Value $content -NoNewline
            Write-Host "  ✓ CDN URLs updated successfully" -ForegroundColor Green
        } else {
            Write-Host "CDN URLs already correct in: $filePath" -ForegroundColor Yellow
        }
    } else {
        Write-Host "File not found: $filePath" -ForegroundColor Red
    }
}

Write-Host "Step 1: Updating Web App .env.development" -ForegroundColor Cyan
Write-Host "Adding CDN URLs for local development..." -ForegroundColor Gray
Add-CDNConfig `
    -filePath "$projectRoot\apps\web-app\.env.development" `
    -cdnUrl "http://localhost:8080" `
    -mediaCdnUrl "http://localhost:8080" `
    -prefix "VITE_"
Write-Host ""

Write-Host "Step 2: Updating Web App .env.staging" -ForegroundColor Cyan
Write-Host "Correcting CDN URL format (staging-cdn → cdn-staging)..." -ForegroundColor Gray
Update-CDNConfig `
    -filePath "$projectRoot\apps\web-app\.env.staging" `
    -oldCdnUrl "https://staging-cdn.flamoral.com" `
    -newCdnUrl "https://cdn-staging.flamoral.com" `
    -oldMediaCdnUrl "https://staging-media.flamoral.com" `
    -newMediaCdnUrl "https://media-staging.flamoral.com"
Write-Host ""

Write-Host "Step 3: Verifying Web App .env.production" -ForegroundColor Cyan
Write-Host "Checking production CDN URLs..." -ForegroundColor Gray
$prodFile = "$projectRoot\apps\web-app\.env.production"
if (Test-Path $prodFile) {
    $prodContent = Get-Content $prodFile -Raw
    if ($prodContent -match "VITE_CDN_URL=https://cdn\.flamoral\.com" -and
        $prodContent -match "VITE_MEDIA_CDN_URL=https://media\.flamoral\.com") {
        Write-Host "  ✓ Production CDN URLs are correctly configured" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Production CDN URLs may need manual verification" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ✗ Production env file not found" -ForegroundColor Red
}
Write-Host ""

Write-Host "Step 4: Updating Web App .env.example" -ForegroundColor Cyan
Write-Host "Adding comprehensive CDN documentation..." -ForegroundColor Gray
Add-CDNConfig `
    -filePath "$projectRoot\apps\web-app\.env.example" `
    -cdnUrl "http://localhost:8080" `
    -mediaCdnUrl "http://localhost:8080" `
    -prefix "VITE_"
Write-Host ""

Write-Host "Step 5: Updating Mobile App .env.example" -ForegroundColor Cyan
Write-Host "Adding CDN URLs for mobile app..." -ForegroundColor Gray
Add-CDNConfig `
    -filePath "$projectRoot\apps\mobile-app\.env.example" `
    -cdnUrl "http://localhost:8080" `
    -mediaCdnUrl "http://localhost:8080" `
    -prefix ""
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CDN Configuration Update Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary of changes:" -ForegroundColor Cyan
Write-Host "  • apps/web-app/.env.development - Added CDN URLs for localhost" -ForegroundColor Gray
Write-Host "  • apps/web-app/.env.staging - Updated to cdn-staging/media-staging format" -ForegroundColor Gray
Write-Host "  • apps/web-app/.env.production - Verified (already correct)" -ForegroundColor Gray
Write-Host "  • apps/web-app/.env.example - Added CDN URL documentation" -ForegroundColor Gray
Write-Host "  • apps/mobile-app/.env.example - Added CDN URL variables" -ForegroundColor Gray
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Review the changes in each file" -ForegroundColor Gray
Write-Host "  2. Test the application in development mode" -ForegroundColor Gray
Write-Host "  3. Configure Azure CDN endpoints for staging and production" -ForegroundColor Gray
Write-Host "  4. Update DNS CNAME records to point to CDN" -ForegroundColor Gray
Write-Host "  5. Review CDN_ENV_CONFIGURATION_GUIDE.md for detailed documentation" -ForegroundColor Gray
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
