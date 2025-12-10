# =============================================================================
# GitHub Secrets Setup Script
# =============================================================================
# This script helps configure the required GitHub secrets for the CI/CD pipelines
# Run this script after installing the GitHub CLI (gh)
# =============================================================================

param(
    [string]$Owner = "oks-citadel",
    [string]$Repo = "World-Class-Dating-App-Platform"
)

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "GitHub Secrets Configuration" -ForegroundColor Cyan
Write-Host "Repository: $Owner/$Repo" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if GitHub CLI is installed
$ghInstalled = Get-Command gh -ErrorAction SilentlyContinue
if (-not $ghInstalled) {
    Write-Host "GitHub CLI (gh) is not installed." -ForegroundColor Red
    Write-Host "Please install it from: https://cli.github.com/" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "After installation, run:" -ForegroundColor Yellow
    Write-Host "  gh auth login" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Check authentication
$authStatus = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Not authenticated with GitHub CLI." -ForegroundColor Red
    Write-Host "Please run: gh auth login" -ForegroundColor Yellow
    exit 1
}

Write-Host "Authenticated with GitHub CLI" -ForegroundColor Green
Write-Host ""

# =============================================================================
# Required Secrets Configuration
# =============================================================================

Write-Host "Required Secrets for CI/CD Pipelines:" -ForegroundColor Yellow
Write-Host ""

$secrets = @{
    # Azure Authentication (OIDC)
    "AZURE_CLIENT_ID" = @{
        Description = "Azure AD App Registration Client ID for OIDC authentication"
        Example = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        Required = $true
    }
    "AZURE_TENANT_ID" = @{
        Description = "Azure AD Tenant ID"
        Example = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        Required = $true
    }
    "AZURE_SUBSCRIPTION_ID" = @{
        Description = "Azure Subscription ID"
        Example = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        Required = $true
    }

    # Optional: Legacy credentials (if not using OIDC)
    "AZURE_CREDENTIALS" = @{
        Description = "Azure Service Principal credentials (JSON format)"
        Example = '{"clientId":"...","clientSecret":"...","subscriptionId":"...","tenantId":"..."}'
        Required = $false
    }

    # Security Scanning
    "SNYK_TOKEN" = @{
        Description = "Snyk API token for vulnerability scanning"
        Example = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        Required = $false
    }
    "CODECOV_TOKEN" = @{
        Description = "Codecov upload token for coverage reports"
        Example = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        Required = $false
    }

    # Notifications
    "SLACK_WEBHOOK_URL" = @{
        Description = "Slack webhook URL for deployment notifications"
        Example = "https://hooks.slack.com/services/xxx/xxx/xxx"
        Required = $false
    }

    # Environment URLs
    "DEV_API_URL" = @{
        Description = "Development API base URL"
        Example = "https://api.dev.flamoral.com"
        Required = $false
    }
    "DEV_URL" = @{
        Description = "Development frontend URL"
        Example = "https://dev.flamoral.com"
        Required = $false
    }
    "STAGING_API_URL" = @{
        Description = "Staging API base URL"
        Example = "https://api.staging.flamoral.com"
        Required = $false
    }
    "STAGING_URL" = @{
        Description = "Staging frontend URL"
        Example = "https://staging.flamoral.com"
        Required = $false
    }
    "PROD_API_URL" = @{
        Description = "Production API base URL"
        Example = "https://api.flamoral.com"
        Required = $false
    }
    "PROD_URL" = @{
        Description = "Production frontend URL"
        Example = "https://flamoral.com"
        Required = $false
    }

    # Test Credentials
    "TEST_USER_EMAIL" = @{
        Description = "Test user email for integration tests"
        Example = "test@example.com"
        Required = $false
    }
    "TEST_USER_PASSWORD" = @{
        Description = "Test user password for integration tests"
        Example = "TestPassword123!"
        Required = $false
    }
}

# Display secrets info
foreach ($secretName in $secrets.Keys | Sort-Object) {
    $secret = $secrets[$secretName]
    $reqStatus = if ($secret.Required) { "[REQUIRED]" } else { "[Optional]" }
    $color = if ($secret.Required) { "Red" } else { "Gray" }

    Write-Host "$reqStatus $secretName" -ForegroundColor $color
    Write-Host "  Description: $($secret.Description)" -ForegroundColor White
    Write-Host "  Example: $($secret.Example)" -ForegroundColor DarkGray
    Write-Host ""
}

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Interactive Secret Setup" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$setupInteractive = Read-Host "Would you like to set up secrets interactively? (y/n)"

if ($setupInteractive -eq "y") {
    Write-Host ""
    Write-Host "Setting up required secrets..." -ForegroundColor Yellow
    Write-Host ""

    foreach ($secretName in $secrets.Keys | Sort-Object) {
        $secret = $secrets[$secretName]

        if (-not $secret.Required) {
            $setupOptional = Read-Host "Set up optional secret '$secretName'? (y/n)"
            if ($setupOptional -ne "y") {
                continue
            }
        }

        Write-Host "Setting: $secretName" -ForegroundColor Cyan
        Write-Host "Description: $($secret.Description)" -ForegroundColor White

        $value = Read-Host "Enter value (or press Enter to skip)"

        if ($value) {
            Write-Host "Setting secret $secretName..." -ForegroundColor Yellow
            $value | gh secret set $secretName --repo "$Owner/$Repo"

            if ($LASTEXITCODE -eq 0) {
                Write-Host "Successfully set $secretName" -ForegroundColor Green
            } else {
                Write-Host "Failed to set $secretName" -ForegroundColor Red
            }
        } else {
            Write-Host "Skipped $secretName" -ForegroundColor Gray
        }

        Write-Host ""
    }
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "GitHub Environments Setup" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Please configure the following environments in GitHub:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. development" -ForegroundColor White
Write-Host "   - No protection rules required" -ForegroundColor Gray
Write-Host ""
Write-Host "2. staging" -ForegroundColor White
Write-Host "   - Required reviewers: 1" -ForegroundColor Gray
Write-Host "   - Deployment branches: staging" -ForegroundColor Gray
Write-Host ""
Write-Host "3. production" -ForegroundColor White
Write-Host "   - Required reviewers: 2" -ForegroundColor Gray
Write-Host "   - Wait timer: 5 minutes" -ForegroundColor Gray
Write-Host "   - Deployment branches: main" -ForegroundColor Gray
Write-Host ""
Write-Host "4. production-approval" -ForegroundColor White
Write-Host "   - Required reviewers: 2" -ForegroundColor Gray
Write-Host "   - Wait timer: 10 minutes" -ForegroundColor Gray
Write-Host ""
Write-Host "5. production-rollback" -ForegroundColor White
Write-Host "   - Required reviewers: 1" -ForegroundColor Gray
Write-Host "   - Wait timer: 0 (emergency)" -ForegroundColor Gray
Write-Host ""

Write-Host "Environment setup URL:" -ForegroundColor Cyan
Write-Host "https://github.com/$Owner/$Repo/settings/environments" -ForegroundColor White
Write-Host ""

Write-Host "================================================" -ForegroundColor Green
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Verify secrets are set: gh secret list --repo $Owner/$Repo" -ForegroundColor White
Write-Host "2. Configure environments in GitHub UI" -ForegroundColor White
Write-Host "3. Push to 'develop' branch to trigger CI" -ForegroundColor White
Write-Host "4. Monitor workflow runs at:" -ForegroundColor White
Write-Host "   https://github.com/$Owner/$Repo/actions" -ForegroundColor Cyan
