# Azure Secrets Quick Reference - Flamoral Dating Platform

**Repository**: oks-citadel/World-Class-Dating-App-Platform
**Last Updated**: 2025-12-15

---

## Required Azure Secrets Summary

### Critical Secrets (Must Configure First)

| Secret Name | Purpose | Where to Get | Priority |
|------------|---------|--------------|----------|
| `AZURE_CLIENT_ID` | Azure service principal app ID | Azure AD App Registration | 🔴 Critical |
| `AZURE_CLIENT_SECRET` | Azure service principal password | Azure AD App Registration | 🔴 Critical |
| `AZURE_TENANT_ID` | Azure AD tenant ID | Azure portal | 🔴 Critical |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID | Azure portal | 🔴 Critical |
| `AZURE_CREDENTIALS` | Complete service principal JSON | Combination of above | 🔴 Critical |

### Environment-Specific Secrets

**Development**:
- `AZURE_CLIENT_ID_DEV`
- `AZURE_CLIENT_SECRET_DEV`
- `AZURE_SUBSCRIPTION_ID_DEV`

**Staging**:
- `AZURE_CLIENT_ID_STAGING`
- `AZURE_CLIENT_SECRET_STAGING`
- `AZURE_SUBSCRIPTION_ID_STAGING`

### Additional Azure Services

| Secret Name | Purpose | Priority |
|------------|---------|----------|
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Deploy web app to Azure Static Web Apps | 🟠 High |

---

## Quick Setup Commands

### Option 1: Automated Script (Recommended)

```powershell
# Navigate to project
cd C:\Users\citad\OneDrive\Documents\Dating\Flamoral

# Run automated configuration script
.\scripts\configure-github-azure-secrets.ps1
```

### Option 2: Manual Setup

#### Step 1: Create Azure Service Principal

```powershell
# Login to Azure
az login

# Create service principal for production
az ad sp create-for-rbac `
  --name "flamoral-prod-github-actions" `
  --role contributor `
  --scopes /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/flamoral-prod-rg `
  --sdk-auth

# Save the output - you'll need it for GitHub secrets
```

#### Step 2: Get Azure IDs

```powershell
# Get subscription ID
az account show --query id -o tsv

# Get tenant ID
az account show --query tenantId -o tsv
```

#### Step 3: Set GitHub Secrets

**Via Web Interface**:
1. Go to https://github.com/oks-citadel/World-Class-Dating-App-Platform/settings/secrets/actions
2. Click "New repository secret"
3. Add each secret from the table above

**Via GitHub CLI** (if installed):
```bash
# Install GitHub CLI first
winget install GitHub.cli

# Authenticate
gh auth login

# Set secrets
gh secret set AZURE_CLIENT_ID --body "<your-client-id>"
gh secret set AZURE_CLIENT_SECRET --body "<your-client-secret>"
gh secret set AZURE_TENANT_ID --body "<your-tenant-id>"
gh secret set AZURE_SUBSCRIPTION_ID --body "<your-subscription-id>"

# Set AZURE_CREDENTIALS (JSON format)
gh secret set AZURE_CREDENTIALS --body '{
  "clientId": "<client-id>",
  "clientSecret": "<client-secret>",
  "subscriptionId": "<subscription-id>",
  "tenantId": "<tenant-id>",
  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
  "resourceManagerEndpointUrl": "https://management.azure.com/",
  "activeDirectoryGraphResourceId": "https://graph.windows.net/",
  "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",
  "galleryEndpointUrl": "https://gallery.azure.com/",
  "managementEndpointUrl": "https://management.core.windows.net/"
}'
```

---

## Workflows That Use These Secrets

| Workflow File | Secrets Required | Purpose |
|--------------|------------------|---------|
| `terraform-version-a.yml` | AZURE_CREDENTIALS, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID, AZURE_SUBSCRIPTION_ID | Infrastructure deployment |
| `release-pipeline.yml` | AZURE_CREDENTIALS (for Docker registry) | Release creation and artifact building |
| `mobile-cd.yml` | Azure secrets (for mobile deployments) | Mobile app builds and deployments |
| `azure-static-web-app.yml` | AZURE_STATIC_WEB_APPS_API_TOKEN | Web app deployment |
| `cd-dev.yml` | AZURE_CLIENT_ID_DEV, AZURE_CLIENT_SECRET_DEV, etc. | Development environment CD |
| `cd-staging.yml` | AZURE_CLIENT_ID_STAGING, AZURE_CLIENT_SECRET_STAGING, etc. | Staging environment CD |
| `complete-cd-pipeline.yml` | All Azure secrets | Complete deployment pipeline |
| `infrastructure-tests.yml` | AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, etc. | Infrastructure testing |
| `infrastructure-drift-detection.yml` | AZURE_CREDENTIALS, ARM_* secrets | Drift detection |
| `build-acr-pipeline.yml` | AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, etc. | ACR image builds |
| `helm-deploy.yml` | AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, etc. | Helm chart deployments |

---

## Terraform Outputs (Auto-Generated Secrets)

After running Terraform, these resources are automatically created and accessible:

### From `infrastructure/terraform/environments/dev/outputs.tf`:
- ACR admin username and password
- AKS kubeconfig
- PostgreSQL connection string
- Redis connection string
- Storage account connection string
- Application Insights connection string
- SignalR connection string

### From `infrastructure/terraform/environments/prod/outputs.tf`:
- All above for production
- Azure Front Door endpoint
- Azure Key Vault URIs for service-specific vaults
- DNS zone nameservers (for GoDaddy configuration)

**Note**: These are retrieved dynamically by workflows using Azure CLI, not stored as GitHub secrets.

---

## Third-Party Secrets (Optional but Recommended)

For full functionality, also configure these third-party service secrets:

### High Priority
| Secret Name | Service | Get From |
|------------|---------|----------|
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe | https://dashboard.stripe.com/apikeys |
| `VITE_AGORA_APP_ID` | Agora | https://console.agora.io/ |
| `VITE_SENTRY_DSN` | Sentry | https://sentry.io/settings/projects/ |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth | https://console.cloud.google.com/apis/credentials |
| `VITE_FACEBOOK_APP_ID` | Facebook | https://developers.facebook.com/apps/ |

### Medium Priority
| Secret Name | Service | Get From |
|------------|---------|----------|
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps | https://console.cloud.google.com/apis/credentials |
| `VITE_GA_MEASUREMENT_ID` | Google Analytics | https://analytics.google.com/analytics/web/ |
| `SLACK_WEBHOOK_URL` | Slack | https://api.slack.com/messaging/webhooks |

### Low Priority (Optional)
| Secret Name | Service | Get From |
|------------|---------|----------|
| `VITE_TENOR_API_KEY` | Tenor GIFs | https://tenor.com/developer/dashboard |
| `CODECOV_TOKEN` | Codecov | https://codecov.io/ |
| `NPM_TOKEN` | NPM | https://www.npmjs.com/settings/~/tokens |

---

## Verification

### Check Secrets Are Set

```bash
# List all repository secrets
gh secret list --repo oks-citadel/World-Class-Dating-App-Platform
```

### Test Azure Authentication

Create and run this test workflow:

```yaml
name: Test Azure Secrets
on: workflow_dispatch

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Azure Login
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Test Azure CLI
        run: |
          az account show
          echo "Azure authentication successful!"
```

---

## Troubleshooting

### Issue: Service Principal Creation Fails
**Solution**: Ensure you have Application Administrator role in Azure AD

### Issue: GitHub CLI Not Found
**Solution**: `winget install GitHub.cli`

### Issue: Cannot Set Secrets
**Solution**: Ensure you have admin access to the repository

### Issue: Workflow Fails with Authentication Error
**Solution**: Verify all 5 core Azure secrets are set correctly

---

## Security Best Practices

1. ✅ **Rotate secrets every 90 days**
2. ✅ **Use environment-specific credentials**
3. ✅ **Never commit secrets to Git**
4. ✅ **Use minimum necessary permissions**
5. ✅ **Monitor secret access in Azure AD**

---

## Configuration Checklist

### Minimum Required (To Run Infrastructure)
- [ ] AZURE_CLIENT_ID
- [ ] AZURE_CLIENT_SECRET
- [ ] AZURE_TENANT_ID
- [ ] AZURE_SUBSCRIPTION_ID
- [ ] AZURE_CREDENTIALS

### Web App Deployment
- [ ] AZURE_STATIC_WEB_APPS_API_TOKEN
- [ ] VITE_STRIPE_PUBLISHABLE_KEY
- [ ] VITE_GOOGLE_MAPS_API_KEY
- [ ] VITE_SENTRY_DSN

### Mobile App Deployment (if needed)
- [ ] EXPO_TOKEN
- [ ] iOS signing certificates
- [ ] Android signing keys

### Notifications
- [ ] SLACK_WEBHOOK_URL

### Multi-Environment Setup
- [ ] Development environment secrets
- [ ] Staging environment secrets
- [ ] Production environment secrets

---

## Quick Links

- **Full Setup Guide**: [GITHUB_AZURE_SECRETS_SETUP.md](./GITHUB_AZURE_SECRETS_SETUP.md)
- **Automated Script**: [scripts/configure-github-azure-secrets.ps1](./scripts/configure-github-azure-secrets.ps1)
- **GitHub Secrets Page**: https://github.com/oks-citadel/World-Class-Dating-App-Platform/settings/secrets/actions
- **Azure Portal**: https://portal.azure.com
- **GitHub Documentation**: https://docs.github.com/en/actions/security-guides/encrypted-secrets

---

## Support

**Issues?** See the full documentation in `GITHUB_AZURE_SECRETS_SETUP.md`

**Need Help?**
- Check Terraform outputs: `terraform output -json`
- Review workflow logs in GitHub Actions
- Verify Azure resource creation in Azure portal

---

**Document Version**: 1.0
**Created**: 2025-12-15
**Next Review**: 2026-03-15
