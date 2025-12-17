# PowerShell Script to Verify CDN and API URL Configuration
# This script checks all environment files for correct configuration

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Flamoral CDN/API Configuration Verifier" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = $PSScriptRoot
$issuesFound = 0

# Function to check if file contains expected variable
function Test-EnvVariable {
    param(
        [string]$filePath,
        [string]$variableName,
        [string]$expectedValue = $null,
        [bool]$shouldExist = $true
    )

    if (-not (Test-Path $filePath)) {
        Write-Host "  ✗ File not found: $filePath" -ForegroundColor Red
        return $false
    }

    $content = Get-Content $filePath -Raw
    $pattern = [regex]::Escape($variableName) + "="

    if ($shouldExist) {
        if ($content -match $pattern) {
            if ($expectedValue) {
                $fullPattern = [regex]::Escape("$variableName=$expectedValue")
                if ($content -match $fullPattern) {
                    Write-Host "  ✓ $variableName is correctly set" -ForegroundColor Green
                    return $true
                } else {
                    Write-Host "  ⚠ $variableName exists but value may be incorrect" -ForegroundColor Yellow
                    $script:issuesFound++
                    return $false
                }
            } else {
                Write-Host "  ✓ $variableName is present" -ForegroundColor Green
                return $true
            }
        } else {
            Write-Host "  ✗ $variableName is missing" -ForegroundColor Red
            $script:issuesFound++
            return $false
        }
    } else {
        if ($content -notmatch $pattern) {
            Write-Host "  ✓ $variableName is not present (as expected)" -ForegroundColor Green
            return $true
        } else {
            Write-Host "  ⚠ $variableName should not be present" -ForegroundColor Yellow
            return $false
        }
    }
}

# Function to check for hardcoded URLs in source files
function Test-HardcodedUrls {
    param(
        [string]$directory,
        [string[]]$extensions
    )

    $hardcodedUrls = @()

    Get-ChildItem -Path $directory -Recurse -Include $extensions | ForEach-Object {
        $content = Get-Content $_.FullName -Raw
        if ($content -match "https?://(?!.*import\.meta\.env)(?!.*process\.env)" -and
            $content -match "(localhost|flamoral\.com)") {
            # Check if it's actually a hardcoded URL and not using env variables
            if ($content -match "(?<!VITE_)(?<!env\.)https?://(localhost|.*flamoral\.com)" -and
                $content -notmatch "//.*https?://") { # Ignore commented lines
                $hardcodedUrls += $_.FullName
            }
        }
    }

    return $hardcodedUrls
}

# Verify Web App Development Environment
Write-Host "Checking Web App .env.development..." -ForegroundColor Cyan
$devFile = "$projectRoot\apps\web-app\.env.development"
Test-EnvVariable -filePath $devFile -variableName "VITE_API_URL" -expectedValue "http://localhost:4000/api/v1"
Test-EnvVariable -filePath $devFile -variableName "VITE_SOCKET_URL" -expectedValue "http://localhost:4000"
Test-EnvVariable -filePath $devFile -variableName "VITE_CDN_URL" -expectedValue "http://localhost:8080"
Test-EnvVariable -filePath $devFile -variableName "VITE_MEDIA_CDN_URL" -expectedValue "http://localhost:8080"
Write-Host ""

# Verify Web App Staging Environment
Write-Host "Checking Web App .env.staging..." -ForegroundColor Cyan
$stagingFile = "$projectRoot\apps\web-app\.env.staging"
Test-EnvVariable -filePath $stagingFile -variableName "VITE_API_URL"
Test-EnvVariable -filePath $stagingFile -variableName "VITE_SOCKET_URL"
Test-EnvVariable -filePath $stagingFile -variableName "VITE_CDN_URL" -expectedValue "https://cdn-staging.flamoral.com"
Test-EnvVariable -filePath $stagingFile -variableName "VITE_MEDIA_CDN_URL" -expectedValue "https://media-staging.flamoral.com"
Write-Host ""

# Verify Web App Production Environment
Write-Host "Checking Web App .env.production..." -ForegroundColor Cyan
$prodFile = "$projectRoot\apps\web-app\.env.production"
Test-EnvVariable -filePath $prodFile -variableName "VITE_API_URL" -expectedValue "https://api.flamoral.com/api/v1"
Test-EnvVariable -filePath $prodFile -variableName "VITE_SOCKET_URL" -expectedValue "https://api.flamoral.com"
Test-EnvVariable -filePath $prodFile -variableName "VITE_CDN_URL" -expectedValue "https://cdn.flamoral.com"
Test-EnvVariable -filePath $prodFile -variableName "VITE_MEDIA_CDN_URL" -expectedValue "https://media.flamoral.com"
Write-Host ""

# Verify Web App Example
Write-Host "Checking Web App .env.example..." -ForegroundColor Cyan
$exampleFile = "$projectRoot\apps\web-app\.env.example"
Test-EnvVariable -filePath $exampleFile -variableName "VITE_API_URL"
Test-EnvVariable -filePath $exampleFile -variableName "VITE_SOCKET_URL"
Test-EnvVariable -filePath $exampleFile -variableName "VITE_CDN_URL"
Test-EnvVariable -filePath $exampleFile -variableName "VITE_MEDIA_CDN_URL"
Write-Host ""

# Verify Mobile App Example
Write-Host "Checking Mobile App .env.example..." -ForegroundColor Cyan
$mobileExampleFile = "$projectRoot\apps\mobile-app\.env.example"
Test-EnvVariable -filePath $mobileExampleFile -variableName "API_BASE_URL"
Test-EnvVariable -filePath $mobileExampleFile -variableName "WEBSOCKET_URL"
Test-EnvVariable -filePath $mobileExampleFile -variableName "CDN_URL"
Test-EnvVariable -filePath $mobileExampleFile -variableName "MEDIA_CDN_URL"
Write-Host ""

# Check for hardcoded URLs in source code
Write-Host "Checking for hardcoded URLs in source code..." -ForegroundColor Cyan
$webAppSrc = "$projectRoot\apps\web-app\src"
$mobileAppSrc = "$projectRoot\apps\mobile-app\src"

if (Test-Path $webAppSrc) {
    Write-Host "Scanning web app source files..." -ForegroundColor Gray
    $hardcodedWeb = Test-HardcodedUrls -directory $webAppSrc -extensions @("*.ts", "*.tsx", "*.js", "*.jsx")
    if ($hardcodedWeb.Count -eq 0) {
        Write-Host "  ✓ No hardcoded URLs found in web app" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Found hardcoded URLs in:" -ForegroundColor Red
        $hardcodedWeb | ForEach-Object { Write-Host "    $_" -ForegroundColor Yellow }
        $script:issuesFound += $hardcodedWeb.Count
    }
}

if (Test-Path $mobileAppSrc) {
    Write-Host "Scanning mobile app source files..." -ForegroundColor Gray
    $hardcodedMobile = Test-HardcodedUrls -directory $mobileAppSrc -extensions @("*.ts", "*.tsx", "*.js", "*.jsx")
    if ($hardcodedMobile.Count -eq 0) {
        Write-Host "  ✓ No hardcoded URLs found in mobile app" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Found hardcoded URLs in:" -ForegroundColor Red
        $hardcodedMobile | ForEach-Object { Write-Host "    $_" -ForegroundColor Yellow }
        $script:issuesFound += $hardcodedMobile.Count
    }
}
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
if ($issuesFound -eq 0) {
    Write-Host "✓ All Configuration Checks Passed!" -ForegroundColor Green
} else {
    Write-Host "⚠ Found $issuesFound issue(s) that need attention" -ForegroundColor Yellow
    Write-Host "Please review the issues above and make corrections" -ForegroundColor Yellow
}
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Configuration files checked:" -ForegroundColor Cyan
Write-Host "  • apps/web-app/.env.development" -ForegroundColor Gray
Write-Host "  • apps/web-app/.env.staging" -ForegroundColor Gray
Write-Host "  • apps/web-app/.env.production" -ForegroundColor Gray
Write-Host "  • apps/web-app/.env.example" -ForegroundColor Gray
Write-Host "  • apps/mobile-app/.env.example" -ForegroundColor Gray
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
