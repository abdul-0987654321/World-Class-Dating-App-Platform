# GitHub Azure Secrets Configuration Guide for Flamoral.com

**Repository**: oks-citadel/World-Class-Dating-App-Platform
**Last Updated**: 2025-12-15
**Status**: Configuration Required

---

## Executive Summary

This document provides step-by-step instructions for configuring all required Azure secrets in the GitHub repository for the Flamoral dating platform. These secrets are essential for CI/CD pipelines, infrastructure deployment, and application deployments.

---

## Table of Contents

1. [Required Azure Secrets](#required-azure-secrets)
2. [Prerequisites](#prerequisites)
3. [Secret Configuration Methods](#secret-configuration-methods)
4. [Step-by-Step Setup](#step-by-step-setup)
5. [Verification](#verification)
6. [Environment-Specific Secrets](#environment-specific-secrets)
7. [Troubleshooting](#troubleshooting)

---

## Required Azure Secrets

### 1. Core Azure Authentication Secrets

These secrets are used across all GitHub Actions workflows for Azure authentication and Terraform operations.

#### Repository-Level Secrets (Required)

| Secret Name | Description | Format | Used In |
|------------|-------------|--------|---------|
| `AZURE_CREDENTIALS` | Azure Service Principal credentials (JSON) | JSON object | terraform-version-a.yml, cd-*.yml, infrastructure-*.yml |
| `AZURE_CLIENT_ID` | Azure AD Application Client ID | GUID | All Azure workflows |
| `AZURE_CLIENT_SECRET` | Azure AD Application Client Secret | String (password) | All Azure workflows |
| `AZURE_TENANT_ID` | Azure AD Tenant ID | GUID | All Azure workflows |
| `AZURE_SUBSCRIPTION_ID` | Azure Subscription ID | GUID | All Azure workflows |

#### Environment-Specific Azure Secrets

| Secret Name | Description | Environment | Format |
|------------|-------------|-------------|--------|
| `AZURE_CLIENT_ID_DEV` | Dev environment service principal client ID | Development | GUID |
| `AZURE_CLIENT_SECRET_DEV` | Dev environment service principal secret | Development | String |
| `AZURE_SUBSCRIPTION_ID_DEV` | Dev environment subscription ID | Development | GUID |
| `AZURE_CLIENT_ID_STAGING` | Staging environment service principal client ID | Staging | GUID |
| `AZURE_CLIENT_SECRET_STAGING` | Staging environment service principal secret | Staging | String |
| `AZURE_SUBSCRIPTION_ID_STAGING` | Staging environment subscription ID | Staging | GUID |

### 2. Azure Container Registry (ACR) Secrets

These are used for building and pushing Docker images to Azure Container Registry.

| Secret Name | Description | Auto-Generated | Notes |
|------------|-------------|----------------|-------|
| ACR login credentials | Retrieved from Azure after ACR creation | Yes | Managed via AZURE_CREDENTIALS |

### 3. Azure Kubernetes Service (AKS) Secrets

These are used for deploying applications to AKS clusters.

| Secret Name | Description | Auto-Generated | Notes |
|------------|-------------|----------------|-------|
| AKS credentials | Retrieved from Azure after AKS creation | Yes | Managed via `az aks get-credentials` |

### 4. Azure Static Web Apps

| Secret Name | Description | Required For |
|------------|-------------|--------------|
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Deployment token for Azure Static Web Apps | azure-static-web-app.yml |

### 5. Third-Party Service Secrets

| Secret Name | Description | Required For | Priority |
|------------|-------------|--------------|----------|
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | Web app build | High |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps API key | Web app build | Medium |
| `VITE_AGORA_APP_ID` | Agora video calling app ID | Web app build | High |
| `VITE_TENOR_API_KEY` | Tenor GIF API key | Web app build | Low |
| `VITE_GA_MEASUREMENT_ID` | Google Analytics measurement ID | Web app build | Medium |
| `VITE_SENTRY_DSN` | Sentry error tracking DSN | Web app build | High |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID | Web app build | High |
| `VITE_FACEBOOK_APP_ID` | Facebook app ID | Web app build | High |
| `SLACK_WEBHOOK_URL` | Slack notifications webhook | CI/CD pipelines | Medium |
| `CODECOV_TOKEN` | Codecov integration token | mobile-cd.yml | Low |
| `NPM_TOKEN` | NPM package publishing token | release-pipeline.yml | Low |
| `EMAIL_USERNAME` | Email for notifications | release-pipeline.yml | Low |
| `EMAIL_PASSWORD` | Email password | release-pipeline.yml | Low |

### 6. Mobile App Signing Secrets

| Secret Name | Description | Required For |
|------------|-------------|--------------|
| `EXPO_TOKEN` | Expo access token | mobile-cd.yml |
| `IOS_CERTIFICATE_BASE64` | iOS signing certificate (base64) | mobile-cd.yml |
| `IOS_CERTIFICATE_PASSWORD` | iOS certificate password | mobile-cd.yml |
| `IOS_PROVISIONING_PROFILE_BASE64` | iOS provisioning profile (base64) | mobile-cd.yml |
| `APPLE_ID` | Apple Developer ID | mobile-cd.yml |
| `APPLE_APP_SPECIFIC_PASSWORD` | Apple app-specific password | mobile-cd.yml |
| `ANDROID_KEYSTORE_BASE64` | Android keystore (base64) | mobile-cd.yml |
| `ANDROID_KEYSTORE_PASSWORD` | Android keystore password | mobile-cd.yml |
| `ANDROID_KEY_ALIAS` | Android key alias | mobile-cd.yml |
| `ANDROID_KEY_PASSWORD` | Android key password | mobile-cd.yml |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | Google Play service account JSON | mobile-cd.yml |

---

## Prerequisites

Before configuring secrets, ensure you have:

1. **GitHub Repository Access**
   - Admin access to `oks-citadel/World-Class-Dating-App-Platform`
   - Permissions to create repository secrets

2. **Azure Account Access**
   - Owner or Contributor role on Azure subscription
   - Azure CLI installed and configured
   - Access to Azure portal

3. **Azure Resources Created**
   - Service Principals created for each environment
   - Azure subscriptions identified
   - Azure AD tenant ID known

4. **GitHub CLI (Optional but Recommended)**
   ```bash
   # Install GitHub CLI on Windows
   winget install GitHub.cli
   # or download from https://cli.github.com/
   ```

---

## Secret Configuration Methods

### Method 1: GitHub Web Interface (Recommended for Beginners)

**Pros**: Visual, user-friendly, no CLI required
**Cons**: Time-consuming for many secrets

**Steps**:
1. Navigate to https://github.com/oks-citadel/World-Class-Dating-App-Platform
2. Click **Settings** tab
3. Click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Enter secret name and value
6. Click **Add secret**

### Method 2: GitHub CLI (Recommended for Bulk Setup)

**Pros**: Fast, scriptable, repeatable
**Cons**: Requires GitHub CLI installation

**Steps**:
```bash
# Set secrets from command line
gh secret set SECRET_NAME --body "secret-value"

# Set secrets from file
gh secret set SECRET_NAME < secret-file.txt

# Set secrets from environment variable
gh secret set SECRET_NAME --env production --body "$AZURE_CLIENT_ID"
```

### Method 3: PowerShell Script (Automated)

See the [Automated Setup Script](#automated-setup-script) section below.

---

## Step-by-Step Setup

### Step 1: Create Azure Service Principals

#### For Production Environment

```powershell
# Login to Azure
az login

# Create service principal for production
$sp = az ad sp create-for-rbac --name "flamoral-prod-github-actions" `
  --role contributor `
  --scopes /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/flamoral-prod-rg `
  --sdk-auth `
  | ConvertFrom-Json

# Save the output - you'll need it for GitHub secrets
$sp | ConvertTo-Json
```

**Output will contain**:
- `clientId`: Use for AZURE_CLIENT_ID
- `clientSecret`: Use for AZURE_CLIENT_SECRET
- `tenantId`: Use for AZURE_TENANT_ID
- `subscriptionId`: Use for AZURE_SUBSCRIPTION_ID
- Full JSON: Use for AZURE_CREDENTIALS

#### For Development Environment

```powershell
# Create service principal for development
$spDev = az ad sp create-for-rbac --name "flamoral-dev-github-actions" `
  --role contributor `
  --scopes /subscriptions/<DEV_SUBSCRIPTION_ID>/resourceGroups/flamoral-dev-rg `
  --sdk-auth `
  | ConvertFrom-Json

$spDev | ConvertTo-Json
```

#### For Staging Environment

```powershell
# Create service principal for staging
$spStaging = az ad sp create-for-rbac --name "flamoral-staging-github-actions" `
  --role contributor `
  --scopes /subscriptions/<STAGING_SUBSCRIPTION_ID>/resourceGroups/flamoral-staging-rg `
  --sdk-auth `
  | ConvertFrom-Json

$spStaging | ConvertTo-Json
```

### Step 2: Get Azure Resource IDs

```powershell
# Get subscription ID
az account show --query id -o tsv

# Get tenant ID
az account show --query tenantId -o tsv

# List all subscriptions (if you have multiple)
az account list --output table
```

### Step 3: Configure GitHub Secrets via Web Interface

#### Navigate to Repository Settings
1. Go to https://github.com/oks-citadel/World-Class-Dating-App-Platform/settings/secrets/actions
2. Click **New repository secret**

#### Add Core Azure Secrets

**AZURE_CREDENTIALS**:
```json
{
  "clientId": "<client-id-from-sp-creation>",
  "clientSecret": "<client-secret-from-sp-creation>",
  "subscriptionId": "<subscription-id>",
  "tenantId": "<tenant-id>",
  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
  "resourceManagerEndpointUrl": "https://management.azure.com/",
  "activeDirectoryGraphResourceId": "https://graph.windows.net/",
  "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",
  "galleryEndpointUrl": "https://gallery.azure.com/",
  "managementEndpointUrl": "https://management.core.windows.net/"
}
```

**AZURE_CLIENT_ID**: `<client-id-from-sp-creation>`

**AZURE_CLIENT_SECRET**: `<client-secret-from-sp-creation>`

**AZURE_TENANT_ID**: `<tenant-id>`

**AZURE_SUBSCRIPTION_ID**: `<subscription-id>`

Repeat for environment-specific secrets:
- `AZURE_CLIENT_ID_DEV`
- `AZURE_CLIENT_SECRET_DEV`
- `AZURE_SUBSCRIPTION_ID_DEV`
- `AZURE_CLIENT_ID_STAGING`
- `AZURE_CLIENT_SECRET_STAGING`
- `AZURE_SUBSCRIPTION_ID_STAGING`

### Step 4: Configure Azure Static Web Apps Secret

```powershell
# Get the deployment token from Azure portal
# Navigate to: Azure Static Web Apps resource → Settings → Deployment → API token
# Copy the token and add it to GitHub secrets as AZURE_STATIC_WEB_APPS_API_TOKEN
```

Or via Azure CLI:
```powershell
az staticwebapp secrets list `
  --name flamoral-web-app `
  --resource-group flamoral-prod-rg `
  --query "properties.apiKey" -o tsv
```

### Step 5: Configure Third-Party Service Secrets

Create accounts and get API keys from:

1. **Stripe**: https://dashboard.stripe.com/apikeys
   - Get publishable key (starts with `pk_`)
   - Add as `VITE_STRIPE_PUBLISHABLE_KEY`

2. **Google Maps**: https://console.cloud.google.com/apis/credentials
   - Create API key
   - Add as `VITE_GOOGLE_MAPS_API_KEY`

3. **Agora**: https://console.agora.io/
   - Get App ID
   - Add as `VITE_AGORA_APP_ID`

4. **Sentry**: https://sentry.io/settings/projects/
   - Get DSN (Data Source Name)
   - Add as `VITE_SENTRY_DSN`

5. **Google OAuth**: https://console.cloud.google.com/apis/credentials
   - Create OAuth 2.0 Client ID
   - Add as `VITE_GOOGLE_CLIENT_ID`

6. **Facebook**: https://developers.facebook.com/apps/
   - Get App ID
   - Add as `VITE_FACEBOOK_APP_ID`

7. **Slack**: https://api.slack.com/messaging/webhooks
   - Create incoming webhook
   - Add as `SLACK_WEBHOOK_URL`

---

## Automated Setup Script

Create a PowerShell script to configure all secrets at once:

### `configure-github-secrets.ps1`

```powershell
# GitHub Azure Secrets Configuration Script for Flamoral
# Run this script with appropriate values filled in

param(
    [Parameter(Mandatory=$true)]
    [string]$RepositoryOwner = "oks-citadel",

    [Parameter(Mandatory=$true)]
    [string]$RepositoryName = "World-Class-Dating-App-Platform"
)

# Function to set GitHub secret
function Set-GitHubSecret {
    param(
        [string]$Name,
        [string]$Value
    )

    Write-Host "Setting secret: $Name" -ForegroundColor Cyan

    # Using GitHub CLI
    $Value | gh secret set $Name --repo "$RepositoryOwner/$RepositoryName"

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Successfully set $Name" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to set $Name" -ForegroundColor Red
    }
}

# Check if GitHub CLI is installed
if (!(Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: GitHub CLI (gh) is not installed." -ForegroundColor Red
    Write-Host "Install from: https://cli.github.com/" -ForegroundColor Yellow
    exit 1
}

# Check authentication
Write-Host "Checking GitHub CLI authentication..." -ForegroundColor Cyan
gh auth status
if ($LASTEXITCODE -ne 0) {
    Write-Host "Please login to GitHub CLI first: gh auth login" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n==== FLAMORAL GITHUB SECRETS CONFIGURATION ====" -ForegroundColor Magenta
Write-Host "Repository: $RepositoryOwner/$RepositoryName`n" -ForegroundColor Magenta

# Prompt for Azure credentials
Write-Host "==== AZURE CREDENTIALS (Production) ====" -ForegroundColor Yellow
$AzureClientId = Read-Host "Enter AZURE_CLIENT_ID"
$AzureClientSecret = Read-Host "Enter AZURE_CLIENT_SECRET" -AsSecureString
$AzureClientSecretPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($AzureClientSecret)
)
$AzureTenantId = Read-Host "Enter AZURE_TENANT_ID"
$AzureSubscriptionId = Read-Host "Enter AZURE_SUBSCRIPTION_ID"

# Create AZURE_CREDENTIALS JSON
$azureCredsJson = @{
    clientId = $AzureClientId
    clientSecret = $AzureClientSecretPlain
    subscriptionId = $AzureSubscriptionId
    tenantId = $AzureTenantId
    activeDirectoryEndpointUrl = "https://login.microsoftonline.com"
    resourceManagerEndpointUrl = "https://management.azure.com/"
    activeDirectoryGraphResourceId = "https://graph.windows.net/"
    sqlManagementEndpointUrl = "https://management.core.windows.net:8443/"
    galleryEndpointUrl = "https://gallery.azure.com/"
    managementEndpointUrl = "https://management.core.windows.net/"
} | ConvertTo-Json -Compress

# Set Production Azure Secrets
Write-Host "`n==== Setting Production Azure Secrets ====" -ForegroundColor Yellow
Set-GitHubSecret -Name "AZURE_CREDENTIALS" -Value $azureCredsJson
Set-GitHubSecret -Name "AZURE_CLIENT_ID" -Value $AzureClientId
Set-GitHubSecret -Name "AZURE_CLIENT_SECRET" -Value $AzureClientSecretPlain
Set-GitHubSecret -Name "AZURE_TENANT_ID" -Value $AzureTenantId
Set-GitHubSecret -Name "AZURE_SUBSCRIPTION_ID" -Value $AzureSubscriptionId

# Prompt for Dev environment (optional)
$configureDev = Read-Host "`nConfigure Development environment secrets? (y/n)"
if ($configureDev -eq 'y') {
    Write-Host "`n==== AZURE CREDENTIALS (Development) ====" -ForegroundColor Yellow
    $AzureClientIdDev = Read-Host "Enter AZURE_CLIENT_ID_DEV"
    $AzureClientSecretDev = Read-Host "Enter AZURE_CLIENT_SECRET_DEV" -AsSecureString
    $AzureClientSecretDevPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($AzureClientSecretDev)
    )
    $AzureSubscriptionIdDev = Read-Host "Enter AZURE_SUBSCRIPTION_ID_DEV"

    Set-GitHubSecret -Name "AZURE_CLIENT_ID_DEV" -Value $AzureClientIdDev
    Set-GitHubSecret -Name "AZURE_CLIENT_SECRET_DEV" -Value $AzureClientSecretDevPlain
    Set-GitHubSecret -Name "AZURE_SUBSCRIPTION_ID_DEV" -Value $AzureSubscriptionIdDev
}

# Prompt for Staging environment (optional)
$configureStaging = Read-Host "`nConfigure Staging environment secrets? (y/n)"
if ($configureStaging -eq 'y') {
    Write-Host "`n==== AZURE CREDENTIALS (Staging) ====" -ForegroundColor Yellow
    $AzureClientIdStaging = Read-Host "Enter AZURE_CLIENT_ID_STAGING"
    $AzureClientSecretStaging = Read-Host "Enter AZURE_CLIENT_SECRET_STAGING" -AsSecureString
    $AzureClientSecretStagingPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($AzureClientSecretStaging)
    )
    $AzureSubscriptionIdStaging = Read-Host "Enter AZURE_SUBSCRIPTION_ID_STAGING"

    Set-GitHubSecret -Name "AZURE_CLIENT_ID_STAGING" -Value $AzureClientIdStaging
    Set-GitHubSecret -Name "AZURE_CLIENT_SECRET_STAGING" -Value $AzureClientSecretStagingPlain
    Set-GitHubSecret -Name "AZURE_SUBSCRIPTION_ID_STAGING" -Value $AzureSubscriptionIdStaging
}

# Prompt for Azure Static Web Apps
$configureStaticWebApp = Read-Host "`nConfigure Azure Static Web Apps token? (y/n)"
if ($configureStaticWebApp -eq 'y') {
    $staticWebAppToken = Read-Host "Enter AZURE_STATIC_WEB_APPS_API_TOKEN" -AsSecureString
    $staticWebAppTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($staticWebAppToken)
    )
    Set-GitHubSecret -Name "AZURE_STATIC_WEB_APPS_API_TOKEN" -Value $staticWebAppTokenPlain
}

# Prompt for Third-Party Services
$configureThirdParty = Read-Host "`nConfigure Third-Party service secrets (Stripe, Google, etc.)? (y/n)"
if ($configureThirdParty -eq 'y') {
    Write-Host "`n==== Third-Party Services ====" -ForegroundColor Yellow

    # Only configure if values are provided
    $stripeKey = Read-Host "Enter VITE_STRIPE_PUBLISHABLE_KEY (or press Enter to skip)"
    if ($stripeKey) { Set-GitHubSecret -Name "VITE_STRIPE_PUBLISHABLE_KEY" -Value $stripeKey }

    $googleMapsKey = Read-Host "Enter VITE_GOOGLE_MAPS_API_KEY (or press Enter to skip)"
    if ($googleMapsKey) { Set-GitHubSecret -Name "VITE_GOOGLE_MAPS_API_KEY" -Value $googleMapsKey }

    $agoraAppId = Read-Host "Enter VITE_AGORA_APP_ID (or press Enter to skip)"
    if ($agoraAppId) { Set-GitHubSecret -Name "VITE_AGORA_APP_ID" -Value $agoraAppId }

    $sentryDsn = Read-Host "Enter VITE_SENTRY_DSN (or press Enter to skip)"
    if ($sentryDsn) { Set-GitHubSecret -Name "VITE_SENTRY_DSN" -Value $sentryDsn }

    $googleClientId = Read-Host "Enter VITE_GOOGLE_CLIENT_ID (or press Enter to skip)"
    if ($googleClientId) { Set-GitHubSecret -Name "VITE_GOOGLE_CLIENT_ID" -Value $googleClientId }

    $facebookAppId = Read-Host "Enter VITE_FACEBOOK_APP_ID (or press Enter to skip)"
    if ($facebookAppId) { Set-GitHubSecret -Name "VITE_FACEBOOK_APP_ID" -Value $facebookAppId }

    $slackWebhook = Read-Host "Enter SLACK_WEBHOOK_URL (or press Enter to skip)"
    if ($slackWebhook) { Set-GitHubSecret -Name "SLACK_WEBHOOK_URL" -Value $slackWebhook }
}

Write-Host "`n==== CONFIGURATION COMPLETE ====" -ForegroundColor Green
Write-Host "All specified secrets have been configured." -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Verify secrets at: https://github.com/$RepositoryOwner/$RepositoryName/settings/secrets/actions" -ForegroundColor White
Write-Host "2. Test a GitHub Actions workflow" -ForegroundColor White
Write-Host "3. Configure mobile app signing secrets if needed" -ForegroundColor White
```

### Usage

```powershell
# Run the script
.\configure-github-secrets.ps1 -RepositoryOwner "oks-citadel" -RepositoryName "World-Class-Dating-App-Platform"
```

---

## Verification

### Verify Secrets Are Set

#### Via GitHub Web Interface
1. Navigate to https://github.com/oks-citadel/World-Class-Dating-App-Platform/settings/secrets/actions
2. Verify all secrets are listed
3. Note: Values are hidden for security, you'll only see names and last updated timestamps

#### Via GitHub CLI
```bash
# List all repository secrets
gh secret list --repo oks-citadel/World-Class-Dating-App-Platform
```

#### Expected Output
```
ANDROID_KEY_ALIAS                    Updated 2025-12-15
ANDROID_KEY_PASSWORD                 Updated 2025-12-15
ANDROID_KEYSTORE_BASE64             Updated 2025-12-15
ANDROID_KEYSTORE_PASSWORD           Updated 2025-12-15
APPLE_APP_SPECIFIC_PASSWORD         Updated 2025-12-15
APPLE_ID                            Updated 2025-12-15
AZURE_CLIENT_ID                     Updated 2025-12-15
AZURE_CLIENT_ID_DEV                 Updated 2025-12-15
AZURE_CLIENT_ID_STAGING             Updated 2025-12-15
AZURE_CLIENT_SECRET                 Updated 2025-12-15
AZURE_CLIENT_SECRET_DEV             Updated 2025-12-15
AZURE_CLIENT_SECRET_STAGING         Updated 2025-12-15
AZURE_CREDENTIALS                   Updated 2025-12-15
AZURE_STATIC_WEB_APPS_API_TOKEN     Updated 2025-12-15
AZURE_SUBSCRIPTION_ID               Updated 2025-12-15
AZURE_SUBSCRIPTION_ID_DEV           Updated 2025-12-15
AZURE_SUBSCRIPTION_ID_STAGING       Updated 2025-12-15
AZURE_TENANT_ID                     Updated 2025-12-15
... (and more)
```

### Test Azure Authentication

Create a test workflow to verify Azure authentication:

```yaml
name: Test Azure Secrets
on:
  workflow_dispatch:

jobs:
  test-azure-connection:
    runs-on: ubuntu-latest
    steps:
      - name: Azure Login
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Test Azure CLI
        run: |
          az account show
          az group list --output table

      - name: Success
        run: echo "Azure authentication successful!"
```

Run this workflow manually to verify Azure secrets are working.

---

## Environment-Specific Secrets

### Production Environment

Configure additional secrets specific to production environment:

Navigate to: Repository → Settings → Environments → production → Add Secret

| Secret Name | Description |
|------------|-------------|
| `PROD_DATABASE_CONNECTION_STRING` | Production database connection string |
| `PROD_JWT_SECRET` | Production JWT signing secret |
| `PROD_ENCRYPTION_KEY` | Production data encryption key |

### Staging Environment

| Secret Name | Description |
|------------|-------------|
| `STAGING_DATABASE_CONNECTION_STRING` | Staging database connection string |
| `STAGING_JWT_SECRET` | Staging JWT signing secret |

### Development Environment

| Secret Name | Description |
|------------|-------------|
| `DEV_DATABASE_CONNECTION_STRING` | Development database connection string |
| `DEV_JWT_SECRET` | Development JWT signing secret |

---

## Troubleshooting

### Issue: Service Principal Creation Fails

**Error**: `Insufficient privileges to complete the operation`

**Solution**:
- Ensure you have Application Administrator or Global Administrator role in Azure AD
- Or ask your Azure AD admin to create the service principal
- Provide them the command from Step 1

### Issue: GitHub CLI Not Found

**Error**: `gh: command not found`

**Solution**:
```powershell
# Install GitHub CLI on Windows
winget install GitHub.cli

# Or download from
# https://cli.github.com/
```

### Issue: Cannot Set Secrets via CLI

**Error**: `HTTP 403: Resource not accessible by integration`

**Solution**:
- Ensure you're authenticated: `gh auth login`
- Ensure you have admin access to the repository
- Check repository permissions

### Issue: Azure Login Fails in Workflow

**Error**: `Error: Login failed with Error: UsernamePasswordCredentialUnavailableerror`

**Solution**:
- Verify AZURE_CREDENTIALS JSON format is correct
- Ensure clientId, clientSecret, subscriptionId, and tenantId are accurate
- Check service principal hasn't expired
- Verify service principal has Contributor role on the subscription

### Issue: Terraform Init Fails

**Error**: `Error: Error building ARM Config: Authenticating using the Azure CLI is only supported as a User`

**Solution**:
- Ensure ARM_* environment variables are set correctly in the workflow
- Verify service principal credentials are valid
- Check that workflow is using correct environment variables:
  ```yaml
  env:
    ARM_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
    ARM_CLIENT_SECRET: ${{ secrets.AZURE_CLIENT_SECRET }}
    ARM_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
    ARM_SUBSCRIPTION_ID: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
  ```

---

## Security Best Practices

1. **Rotate Secrets Regularly**
   - Service principals: Every 90 days
   - API keys: Every 180 days
   - Review access quarterly

2. **Use Environment-Specific Credentials**
   - Never share production credentials with dev/staging
   - Use separate service principals for each environment
   - Use separate subscriptions if possible

3. **Monitor Secret Usage**
   - Review GitHub Actions logs regularly
   - Monitor Azure Key Vault access logs
   - Set up alerts for unusual access patterns

4. **Limit Permissions**
   - Grant minimum necessary permissions
   - Use resource group scoped service principals
   - Avoid subscription-level contributors when possible

5. **Never Commit Secrets**
   - Use `.gitignore` for sensitive files
   - Use secret scanning tools
   - Enable GitHub secret scanning

---

## Next Steps

After configuring secrets:

1. **Test Workflows**
   - Run infrastructure deployment workflow
   - Test application deployment
   - Verify mobile app build

2. **Configure Environment Protection Rules**
   - Set up production environment approvals
   - Configure branch protection
   - Set up deployment freeze controls

3. **Set Up Monitoring**
   - Configure Slack notifications
   - Set up Sentry error tracking
   - Enable Azure Application Insights

4. **Document Changes**
   - Update team documentation
   - Share access procedures
   - Document secret rotation schedule

---

## Support

For issues or questions:

- **GitHub Repository**: https://github.com/oks-citadel/World-Class-Dating-App-Platform
- **Documentation**: See `docs/security/github-environment-setup.md`
- **Azure Documentation**: https://learn.microsoft.com/en-us/azure/

---

## Checklist

Use this checklist to track progress:

### Core Azure Secrets
- [ ] AZURE_CREDENTIALS
- [ ] AZURE_CLIENT_ID
- [ ] AZURE_CLIENT_SECRET
- [ ] AZURE_TENANT_ID
- [ ] AZURE_SUBSCRIPTION_ID

### Development Environment
- [ ] AZURE_CLIENT_ID_DEV
- [ ] AZURE_CLIENT_SECRET_DEV
- [ ] AZURE_SUBSCRIPTION_ID_DEV

### Staging Environment
- [ ] AZURE_CLIENT_ID_STAGING
- [ ] AZURE_CLIENT_SECRET_STAGING
- [ ] AZURE_SUBSCRIPTION_ID_STAGING

### Azure Services
- [ ] AZURE_STATIC_WEB_APPS_API_TOKEN

### Third-Party Services (Web App)
- [ ] VITE_STRIPE_PUBLISHABLE_KEY
- [ ] VITE_GOOGLE_MAPS_API_KEY
- [ ] VITE_AGORA_APP_ID
- [ ] VITE_TENOR_API_KEY
- [ ] VITE_GA_MEASUREMENT_ID
- [ ] VITE_SENTRY_DSN
- [ ] VITE_GOOGLE_CLIENT_ID
- [ ] VITE_FACEBOOK_APP_ID

### CI/CD Integrations
- [ ] SLACK_WEBHOOK_URL
- [ ] CODECOV_TOKEN (optional)
- [ ] NPM_TOKEN (optional)

### Mobile App Secrets (if deploying mobile apps)
- [ ] EXPO_TOKEN
- [ ] iOS signing certificates
- [ ] Android signing keys
- [ ] App store credentials

### Verification
- [ ] Test workflow executed successfully
- [ ] Azure authentication verified
- [ ] Terraform operations working
- [ ] Team documented and trained

---

**Document Version**: 1.0
**Last Updated**: 2025-12-15
**Next Review**: 2026-03-15
