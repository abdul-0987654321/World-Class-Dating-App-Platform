# Flamoral Security Fixes - Complete Installation Script (PowerShell)
# This script installs all dependencies and verifies security fixes

$ErrorActionPreference = "Stop"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Flamoral Security Fixes Installer" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

function Print-Status {
    param([string]$Message)
    Write-Host "[✓] $Message" -ForegroundColor Green
}

function Print-Error {
    param([string]$Message)
    Write-Host "[✗] $Message" -ForegroundColor Red
}

function Print-Warning {
    param([string]$Message)
    Write-Host "[!] $Message" -ForegroundColor Yellow
}

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Print-Error "Not in the Flamoral root directory. Please cd to the project root."
    exit 1
}

Print-Status "Found Flamoral project root"

# Navigate to auth service
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Installing Auth Service Dependencies" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

Push-Location backend\services\auth-service

# Install jwks-rsa for OAuth signature verification
Print-Status "Installing jwks-rsa for OAuth token verification..."
npm install jwks-rsa

# Verify installation
$jwksInstalled = npm list jwks-rsa 2>&1 | Select-String "jwks-rsa"
if ($jwksInstalled) {
    Print-Status "jwks-rsa installed successfully"
} else {
    Print-Error "Failed to install jwks-rsa"
    Pop-Location
    exit 1
}

Pop-Location

# Check if .env files exist
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Checking Environment Configuration" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# Auth Service
if (-not (Test-Path "backend\services\auth-service\.env")) {
    Print-Warning "Auth service .env file not found"
    Write-Host "    Creating from .env.example..."
    Copy-Item "backend\services\auth-service\.env.example" "backend\services\auth-service\.env"
    Print-Warning "Please update backend\services\auth-service\.env with your secrets!"
} else {
    Print-Status "Auth service .env file exists"
}

# API Gateway
if (-not (Test-Path "backend\services\api-gateway\.env")) {
    Print-Warning "API Gateway .env file not found"
    Write-Host "    Creating from .env.example..."
    Copy-Item "backend\services\api-gateway\.env.example" "backend\services\api-gateway\.env"
    Print-Warning "Please update backend\services\api-gateway\.env with your configuration!"
} else {
    Print-Status "API Gateway .env file exists"
}

# Verify JWT secrets are set
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Verifying Security Configuration" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

function Check-JwtSecret {
    param(
        [string]$EnvFile,
        [string]$SecretName
    )

    if (Test-Path $EnvFile) {
        $content = Get-Content $EnvFile -Raw
        $pattern = "^${SecretName}=(.+)$"

        if ($content -match $pattern) {
            $secretValue = $Matches[1].Trim()

            if ([string]::IsNullOrEmpty($secretValue) -or
                $secretValue -eq "CHANGE_ME_TO_SECURE_64_CHARACTER_HEX_STRING_MINIMUM_32_CHARS" -or
                $secretValue -eq "CHANGE_ME_TO_DIFFERENT_64_CHARACTER_HEX_STRING_MINIMUM_32_CHARS") {
                Print-Error "${SecretName} is not set or uses default value in ${EnvFile}"
                Write-Host "    Generate a secure secret:"
                Write-Host "    node -e `"console.log(require('crypto').randomBytes(32).toString('hex'))`""
                return $false
            }

            $length = $secretValue.Length
            if ($length -lt 32) {
                Print-Error "${SecretName} is too short (${length} chars, minimum 32)"
                return $false
            } else {
                Print-Status "${SecretName} is configured (${length} characters)"
                return $true
            }
        } else {
            Print-Error "${SecretName} not found in ${EnvFile}"
            return $false
        }
    } else {
        Print-Error "Environment file not found: ${EnvFile}"
        return $false
    }
}

# Check auth service JWT secrets
$jwtAccessOk = Check-JwtSecret "backend\services\auth-service\.env" "JWT_ACCESS_SECRET"
$jwtRefreshOk = Check-JwtSecret "backend\services\auth-service\.env" "JWT_REFRESH_SECRET"

# Check OAuth configuration
Write-Host ""
Print-Status "Checking OAuth configuration..."

function Check-OAuthConfig {
    $envFile = "backend\services\auth-service\.env"
    $configured = 0

    if (Test-Path $envFile) {
        $content = Get-Content $envFile -Raw

        if ($content -match "^GOOGLE_CLIENT_ID=(.+)$" -and $Matches[1] -notlike "*your-google-client-id*") {
            Print-Status "Google OAuth configured"
            $configured++
        } else {
            Print-Warning "Google OAuth not configured (optional)"
        }

        if ($content -match "^FACEBOOK_APP_ID=(.+)$" -and $Matches[1] -notlike "*your-facebook-app-id*") {
            Print-Status "Facebook OAuth configured"
            $configured++
        } else {
            Print-Warning "Facebook OAuth not configured (optional)"
        }

        if ($content -match "^APPLE_CLIENT_ID=(.+)$" -and $Matches[1] -notlike "*your-apple-*") {
            Print-Status "Apple OAuth configured"
            $configured++
        } else {
            Print-Warning "Apple OAuth not configured (optional)"
        }
    }

    if ($configured -eq 0) {
        Print-Warning "No OAuth providers configured. Social login will not work."
    } else {
        Print-Status "${configured} OAuth provider(s) configured"
    }
}

Check-OAuthConfig

# Check CSRF protection
Write-Host ""
if (Test-Path "backend\services\api-gateway\.env") {
    $content = Get-Content "backend\services\api-gateway\.env" -Raw
    if ($content -match "ENABLE_CSRF_PROTECTION=true") {
        Print-Status "CSRF protection is enabled"
    } else {
        Print-Warning "CSRF protection should be enabled in API Gateway .env"
    }
} else {
    Print-Warning "API Gateway .env not found, check .env.example"
}

# Summary
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Security Fixes Installation Summary" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

if ($jwtAccessOk -and $jwtRefreshOk) {
    Print-Status "All critical security fixes installed"
    Print-Status "JWT secrets are properly configured"
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "  1. Review and update .env files if needed"
    Write-Host "  2. Configure OAuth providers (optional)"
    Write-Host "  3. Restart auth-service: cd backend\services\auth-service; npm run dev"
    Write-Host "  4. Restart api-gateway: cd backend\services\api-gateway; npm run dev"
    Write-Host "  5. Run tests to verify everything works"
    Write-Host ""
    Print-Status "Security fixes are ready for deployment!"
} else {
    Print-Error "Critical configuration missing!"
    Write-Host ""
    Write-Host "Required actions:"
    Write-Host "  1. Generate secure JWT secrets:"
    Write-Host "     node -e `"console.log(require('crypto').randomBytes(32).toString('hex'))`""
    Write-Host ""
    Write-Host "  2. Update backend\services\auth-service\.env:"
    Write-Host "     - Set JWT_ACCESS_SECRET"
    Write-Host "     - Set JWT_REFRESH_SECRET"
    Write-Host ""
    Write-Host "  3. Run this script again to verify"
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "For detailed information, see: SECURITY_FIXES_COMPLETE_REPORT.md"
Write-Host ""
