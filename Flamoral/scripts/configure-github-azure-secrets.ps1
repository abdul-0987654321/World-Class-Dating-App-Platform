# ==============================================================================
# GitHub Azure Secrets Configuration Script for Flamoral Dating Platform
# ==============================================================================
# This script automates the configuration of Azure secrets in GitHub repository
# for CI/CD pipelines and infrastructure deployment.
#
# Prerequisites:
# - GitHub CLI (gh) installed
# - Authenticated with GitHub CLI (gh auth login)
# - Admin access to the repository
# - Azure service principal credentials ready
#
# Usage:
#   .\configure-github-azure-secrets.ps1
# ==============================================================================

param(
    [Parameter(Mandatory=$false)]
    [string]$RepositoryOwner = "oks-citadel",

    [Parameter(Mandatory=$false)]
    [string]$RepositoryName = "World-Class-Dating-App-Platform",

    [Parameter(Mandatory=$false)]
    [switch]$SkipValidation
)

# ==============================================================================
# Functions
# ==============================================================================

function Write-Header {
    param([string]$Text)
    Write-Host "`n========================================" -ForegroundColor Magenta
    Write-Host $Text -ForegroundColor Magenta
    Write-Host "========================================`n" -ForegroundColor Magenta
}

function Write-Step {
    param([string]$Text)
    Write-Host "▶ $Text" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Text)
    Write-Host "✓ $Text" -ForegroundColor Green
}

function Write-Error {
    param([string]$Text)
    Write-Host "✗ $Text" -ForegroundColor Red
}

function Write-Warning {
    param([string]$Text)
    Write-Host "⚠ $Text" -ForegroundColor Yellow
}

function Set-GitHubSecret {
    param(
        [string]$Name,
        [string]$Value,
        [switch]$Sensitive
    )

    if ([string]::IsNullOrWhiteSpace($Value)) {
        Write-Warning "Skipping $Name (no value provided)"
        return $false
    }

    try {
        if ($Sensitive) {
            Write-Step "Setting secret: $Name (value hidden)"
        } else {
            Write-Step "Setting secret: $Name"
        }

        # Using GitHub CLI to set secret
        $Value | gh secret set $Name --repo "$RepositoryOwner/$RepositoryName" 2>&1 | Out-Null

        if ($LASTEXITCODE -eq 0) {
            Write-Success "Successfully set $Name"
            return $true
        } else {
            Write-Error "Failed to set $Name"
            return $false
        }
    }
    catch {
        Write-Error "Error setting $Name : $($_.Exception.Message)"
        return $false
    }
}

function Read-SecureValue {
    param(
        [string]$Prompt,
        [switch]$Optional
    )

    if ($Optional) {
        $Prompt = "$Prompt (press Enter to skip)"
    }

    $secureString = Read-Host $Prompt -AsSecureString
    $plainText = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureString)
    )

    return $plainText
}

# ==============================================================================
# Pre-flight Checks
# ==============================================================================

Write-Header "FLAMORAL GITHUB AZURE SECRETS CONFIGURATION"
Write-Host "Repository: $RepositoryOwner/$RepositoryName`n" -ForegroundColor White

if (-not $SkipValidation) {
    Write-Step "Running pre-flight checks..."

    # Check GitHub CLI
    if (!(Get-Command gh -ErrorAction SilentlyContinue)) {
        Write-Error "GitHub CLI (gh) is not installed."
        Write-Host "Install from: https://cli.github.com/" -ForegroundColor Yellow
        exit 1
    }
    Write-Success "GitHub CLI found"

    # Check GitHub authentication
    Write-Step "Checking GitHub CLI authentication..."
    $authStatus = gh auth status 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Not authenticated with GitHub CLI"
        Write-Host "Please run: gh auth login" -ForegroundColor Yellow
        exit 1
    }
    Write-Success "Authenticated with GitHub"

    # Check repository access
    Write-Step "Verifying repository access..."
    $repoCheck = gh repo view "$RepositoryOwner/$RepositoryName" --json name 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Cannot access repository: $RepositoryOwner/$RepositoryName"
        Write-Host "Please verify you have access to this repository" -ForegroundColor Yellow
        exit 1
    }
    Write-Success "Repository access verified"
}

# ==============================================================================
# Configuration Prompts
# ==============================================================================

Write-Header "AZURE CREDENTIALS CONFIGURATION"

Write-Host "You will need Azure service principal credentials." -ForegroundColor White
Write-Host "If you haven't created them yet, run:" -ForegroundColor Yellow
Write-Host "  az ad sp create-for-rbac --name 'flamoral-github-actions' --role contributor --sdk-auth`n" -ForegroundColor Yellow

$proceed = Read-Host "Do you have the Azure service principal credentials ready? (y/n)"
if ($proceed -ne 'y') {
    Write-Warning "Please create the service principal first and re-run this script."
    exit 0
}

# ==============================================================================
# Production Azure Secrets
# ==============================================================================

Write-Header "PRODUCTION ENVIRONMENT SECRETS"

$azureClientId = Read-Host "Enter AZURE_CLIENT_ID (production)"
$azureClientSecret = Read-SecureValue -Prompt "Enter AZURE_CLIENT_SECRET (production)"
$azureTenantId = Read-Host "Enter AZURE_TENANT_ID"
$azureSubscriptionId = Read-Host "Enter AZURE_SUBSCRIPTION_ID (production)"

# Create AZURE_CREDENTIALS JSON
$azureCredsJson = @{
    clientId = $azureClientId
    clientSecret = $azureClientSecret
    subscriptionId = $azureSubscriptionId
    tenantId = $azureTenantId
    activeDirectoryEndpointUrl = "https://login.microsoftonline.com"
    resourceManagerEndpointUrl = "https://management.azure.com/"
    activeDirectoryGraphResourceId = "https://graph.windows.net/"
    sqlManagementEndpointUrl = "https://management.core.windows.net:8443/"
    galleryEndpointUrl = "https://gallery.azure.com/"
    managementEndpointUrl = "https://management.core.windows.net/"
} | ConvertTo-Json -Compress

Write-Host "`nSetting production Azure secrets..." -ForegroundColor Cyan
$successCount = 0
$totalCount = 5

if (Set-GitHubSecret -Name "AZURE_CREDENTIALS" -Value $azureCredsJson -Sensitive) { $successCount++ }
if (Set-GitHubSecret -Name "AZURE_CLIENT_ID" -Value $azureClientId) { $successCount++ }
if (Set-GitHubSecret -Name "AZURE_CLIENT_SECRET" -Value $azureClientSecret -Sensitive) { $successCount++ }
if (Set-GitHubSecret -Name "AZURE_TENANT_ID" -Value $azureTenantId) { $successCount++ }
if (Set-GitHubSecret -Name "AZURE_SUBSCRIPTION_ID" -Value $azureSubscriptionId) { $successCount++ }

Write-Host "`nProduction secrets: $successCount/$totalCount configured" -ForegroundColor $(if ($successCount -eq $totalCount) { "Green" } else { "Yellow" })

# ==============================================================================
# Development Environment Secrets
# ==============================================================================

$configureDev = Read-Host "`nConfigure Development environment secrets? (y/n)"
if ($configureDev -eq 'y') {
    Write-Header "DEVELOPMENT ENVIRONMENT SECRETS"

    $azureClientIdDev = Read-Host "Enter AZURE_CLIENT_ID_DEV"
    $azureClientSecretDev = Read-SecureValue -Prompt "Enter AZURE_CLIENT_SECRET_DEV"
    $azureSubscriptionIdDev = Read-Host "Enter AZURE_SUBSCRIPTION_ID_DEV"

    Write-Host "`nSetting development Azure secrets..." -ForegroundColor Cyan
    $devSuccessCount = 0
    $devTotalCount = 3

    if (Set-GitHubSecret -Name "AZURE_CLIENT_ID_DEV" -Value $azureClientIdDev) { $devSuccessCount++ }
    if (Set-GitHubSecret -Name "AZURE_CLIENT_SECRET_DEV" -Value $azureClientSecretDev -Sensitive) { $devSuccessCount++ }
    if (Set-GitHubSecret -Name "AZURE_SUBSCRIPTION_ID_DEV" -Value $azureSubscriptionIdDev) { $devSuccessCount++ }

    Write-Host "`nDevelopment secrets: $devSuccessCount/$devTotalCount configured" -ForegroundColor $(if ($devSuccessCount -eq $devTotalCount) { "Green" } else { "Yellow" })
}

# ==============================================================================
# Staging Environment Secrets
# ==============================================================================

$configureStaging = Read-Host "`nConfigure Staging environment secrets? (y/n)"
if ($configureStaging -eq 'y') {
    Write-Header "STAGING ENVIRONMENT SECRETS"

    $azureClientIdStaging = Read-Host "Enter AZURE_CLIENT_ID_STAGING"
    $azureClientSecretStaging = Read-SecureValue -Prompt "Enter AZURE_CLIENT_SECRET_STAGING"
    $azureSubscriptionIdStaging = Read-Host "Enter AZURE_SUBSCRIPTION_ID_STAGING"

    Write-Host "`nSetting staging Azure secrets..." -ForegroundColor Cyan
    $stagingSuccessCount = 0
    $stagingTotalCount = 3

    if (Set-GitHubSecret -Name "AZURE_CLIENT_ID_STAGING" -Value $azureClientIdStaging) { $stagingSuccessCount++ }
    if (Set-GitHubSecret -Name "AZURE_CLIENT_SECRET_STAGING" -Value $azureClientSecretStaging -Sensitive) { $stagingSuccessCount++ }
    if (Set-GitHubSecret -Name "AZURE_SUBSCRIPTION_ID_STAGING" -Value $azureSubscriptionIdStaging) { $stagingSuccessCount++ }

    Write-Host "`nStaging secrets: $stagingSuccessCount/$stagingTotalCount configured" -ForegroundColor $(if ($stagingSuccessCount -eq $stagingTotalCount) { "Green" } else { "Yellow" })
}

# ==============================================================================
# Azure Static Web Apps
# ==============================================================================

$configureStaticWebApp = Read-Host "`nConfigure Azure Static Web Apps deployment token? (y/n)"
if ($configureStaticWebApp -eq 'y') {
    Write-Header "AZURE STATIC WEB APPS"

    Write-Host "Get your deployment token from:" -ForegroundColor Yellow
    Write-Host "Azure Portal → Static Web Apps → Settings → Deployment → API token`n" -ForegroundColor Yellow

    $staticWebAppToken = Read-SecureValue -Prompt "Enter AZURE_STATIC_WEB_APPS_API_TOKEN"

    if (Set-GitHubSecret -Name "AZURE_STATIC_WEB_APPS_API_TOKEN" -Value $staticWebAppToken -Sensitive) {
        Write-Success "Static Web Apps token configured"
    }
}

# ==============================================================================
# Third-Party Services
# ==============================================================================

$configureThirdParty = Read-Host "`nConfigure Third-Party service secrets (Stripe, Google Maps, etc.)? (y/n)"
if ($configureThirdParty -eq 'y') {
    Write-Header "THIRD-PARTY SERVICES"

    Write-Host "Press Enter to skip any optional secret`n" -ForegroundColor Yellow

    # Stripe
    $stripeKey = Read-Host "Enter VITE_STRIPE_PUBLISHABLE_KEY (starts with pk_) [Optional]"
    if ($stripeKey) { Set-GitHubSecret -Name "VITE_STRIPE_PUBLISHABLE_KEY" -Value $stripeKey }

    # Google Maps
    $googleMapsKey = Read-Host "Enter VITE_GOOGLE_MAPS_API_KEY [Optional]"
    if ($googleMapsKey) { Set-GitHubSecret -Name "VITE_GOOGLE_MAPS_API_KEY" -Value $googleMapsKey }

    # Agora
    $agoraAppId = Read-Host "Enter VITE_AGORA_APP_ID [Optional]"
    if ($agoraAppId) { Set-GitHubSecret -Name "VITE_AGORA_APP_ID" -Value $agoraAppId }

    # Tenor
    $tenorApiKey = Read-Host "Enter VITE_TENOR_API_KEY [Optional]"
    if ($tenorApiKey) { Set-GitHubSecret -Name "VITE_TENOR_API_KEY" -Value $tenorApiKey }

    # Google Analytics
    $gaId = Read-Host "Enter VITE_GA_MEASUREMENT_ID [Optional]"
    if ($gaId) { Set-GitHubSecret -Name "VITE_GA_MEASUREMENT_ID" -Value $gaId }

    # Sentry
    $sentryDsn = Read-Host "Enter VITE_SENTRY_DSN [Optional]"
    if ($sentryDsn) { Set-GitHubSecret -Name "VITE_SENTRY_DSN" -Value $sentryDsn }

    # Google OAuth
    $googleClientId = Read-Host "Enter VITE_GOOGLE_CLIENT_ID [Optional]"
    if ($googleClientId) { Set-GitHubSecret -Name "VITE_GOOGLE_CLIENT_ID" -Value $googleClientId }

    # Facebook
    $facebookAppId = Read-Host "Enter VITE_FACEBOOK_APP_ID [Optional]"
    if ($facebookAppId) { Set-GitHubSecret -Name "VITE_FACEBOOK_APP_ID" -Value $facebookAppId }

    # Slack
    $slackWebhook = Read-Host "Enter SLACK_WEBHOOK_URL [Optional]"
    if ($slackWebhook) { Set-GitHubSecret -Name "SLACK_WEBHOOK_URL" -Value $slackWebhook -Sensitive }
}

# ==============================================================================
# Summary
# ==============================================================================

Write-Header "CONFIGURATION COMPLETE"

Write-Host "All specified secrets have been configured successfully!`n" -ForegroundColor Green

Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Verify secrets at: https://github.com/$RepositoryOwner/$RepositoryName/settings/secrets/actions" -ForegroundColor White
Write-Host "2. Test a GitHub Actions workflow to ensure Azure authentication works" -ForegroundColor White
Write-Host "3. Configure environment-specific secrets if needed" -ForegroundColor White
Write-Host "4. Set up mobile app signing secrets (if deploying mobile apps)" -ForegroundColor White

Write-Host "`nDocumentation:" -ForegroundColor Cyan
Write-Host "- Full setup guide: GITHUB_AZURE_SECRETS_SETUP.md" -ForegroundColor White
Write-Host "- GitHub environment setup: docs/security/github-environment-setup.md" -ForegroundColor White
Write-Host "- Secrets management: pipelines/SECRETS_MANAGEMENT.md" -ForegroundColor White

Write-Host "`n" -ForegroundColor White
Write-Host "Thank you for using the Flamoral secrets configuration script!" -ForegroundColor Magenta
Write-Host "========================================`n" -ForegroundColor Magenta
