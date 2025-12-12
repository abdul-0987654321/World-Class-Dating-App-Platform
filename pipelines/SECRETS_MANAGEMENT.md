# Secrets Management Guide - Flamoral Dating Platform

This document provides comprehensive guidance on managing secrets and sensitive configuration for the Flamoral Dating Platform CI/CD pipelines.

## Table of Contents

1. [Overview](#overview)
2. [GitHub Actions Secrets](#github-actions-secrets)
3. [Azure DevOps Secrets](#azure-devops-secrets)
4. [Secret Rotation](#secret-rotation)
5. [Best Practices](#best-practices)
6. [Emergency Procedures](#emergency-procedures)

---

## Overview

The platform uses multiple secret management systems:

- **GitHub Secrets**: For GitHub Actions workflows
- **Azure Key Vault**: For runtime application secrets
- **Azure DevOps Variable Groups**: For Azure Pipelines
- **Environment Variables**: For environment-specific configuration

### Security Principles

1. **Least Privilege**: Grant minimum necessary permissions
2. **Rotation**: Regularly rotate all secrets (90 days max)
3. **Encryption**: All secrets encrypted at rest and in transit
4. **Audit**: All secret access is logged
5. **Separation**: Production secrets completely isolated

---

## GitHub Actions Secrets

### Required Secrets by Environment

#### **Development Environment**

```yaml
# Azure Credentials
AZURE_CREDENTIALS_DEV: |
  {
    "clientId": "<app-id>",
    "clientSecret": "<password>",
    "subscriptionId": "<subscription-id>",
    "tenantId": "<tenant-id>"
  }

AZURE_CLIENT_ID_DEV: "<app-id>"
AZURE_CLIENT_SECRET_DEV: "<password>"
AZURE_TENANT_ID: "<tenant-id>"
AZURE_SUBSCRIPTION_ID_DEV: "<subscription-id>"

# URLs
DEV_API_URL: "https://api-dev.flamoral.com"
DEV_WEB_URL: "https://dev.flamoral.com"
```

#### **Staging Environment**

```yaml
# Azure Credentials
AZURE_CREDENTIALS_STAGING: |
  {
    "clientId": "<app-id>",
    "clientSecret": "<password>",
    "subscriptionId": "<subscription-id>",
    "tenantId": "<tenant-id>"
  }

AZURE_CLIENT_ID_STAGING: "<app-id>"
AZURE_CLIENT_SECRET_STAGING: "<password>"
AZURE_SUBSCRIPTION_ID_STAGING: "<subscription-id>"

# URLs
STAGING_API_URL: "https://api-staging.flamoral.com"
STAGING_URL: "https://staging.flamoral.com"
```

#### **Production Environment**

```yaml
# Azure Credentials
AZURE_CREDENTIALS: |
  {
    "clientId": "<app-id>",
    "clientSecret": "<password>",
    "subscriptionId": "<subscription-id>",
    "tenantId": "<tenant-id>"
  }

AZURE_CLIENT_ID: "<app-id>"
AZURE_CLIENT_SECRET: "<password>"
AZURE_SUBSCRIPTION_ID: "<subscription-id>"

# URLs
PROD_API_URL: "https://api.flamoral.com"
PROD_URL: "https://flamoral.com"
```

#### **Mobile App Secrets**

```yaml
# iOS
IOS_CERTIFICATE_BASE64: "<base64-encoded-p12-certificate>"
IOS_CERTIFICATE_PASSWORD: "<certificate-password>"
IOS_PROVISIONING_PROFILE_BASE64: "<base64-encoded-mobileprovision>"
APPLE_ID: "<apple-developer-id>"
APPLE_APP_SPECIFIC_PASSWORD: "<app-specific-password>"

# Android
ANDROID_KEYSTORE_BASE64: "<base64-encoded-keystore>"
ANDROID_KEYSTORE_PASSWORD: "<keystore-password>"
ANDROID_KEY_ALIAS: "<key-alias>"
ANDROID_KEY_PASSWORD: "<key-password>"
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: "<service-account-json>"

# Expo
EXPO_TOKEN: "<expo-access-token>"
```

#### **Third-Party Services**

```yaml
# Code Coverage
CODECOV_TOKEN: "<codecov-token>"

# Security Scanning
SNYK_TOKEN: "<snyk-api-token>"
SEMGREP_APP_TOKEN: "<semgrep-token>"

# Infrastructure
INFRACOST_API_KEY: "<infracost-api-key>"

# Notifications
SLACK_WEBHOOK_URL: "https://hooks.slack.com/services/..."
MS_TEAMS_WEBHOOK_URI: "https://outlook.office.com/webhook/..."

# Email
EMAIL_USERNAME: "github-actions@flamoral.com"
EMAIL_PASSWORD: "<app-password>"

# NPM Publishing
NPM_TOKEN: "<npm-access-token>"
```

### Setting Secrets in GitHub

#### Repository Secrets

```bash
# Navigate to: Settings > Secrets and variables > Actions > New repository secret

# Using GitHub CLI
gh secret set AZURE_CREDENTIALS_DEV < azure-credentials-dev.json
gh secret set SLACK_WEBHOOK_URL --body "https://hooks.slack.com/..."
```

#### Environment Secrets

```bash
# Create environment-specific secrets
gh secret set AZURE_CREDENTIALS --env production < azure-creds-prod.json
gh secret set AZURE_CREDENTIALS_STAGING --env staging < azure-creds-staging.json
```

---

## Azure DevOps Secrets

### Variable Groups

#### **flamoral-common-vars** (Variable Group ID: 1)

```yaml
Variables:
  - nodeVersion: '20.x'
  - pythonVersion: '3.11'
  - terraformVersion: '1.6.0'
```

#### **flamoral-terraform-vars** (Variable Group ID: 15)

```yaml
Variables:
  - TF_STATE_RESOURCE_GROUP: 'flamoral-tfstate-rg'
  - TF_STATE_STORAGE_ACCOUNT: 'flamoraltfstate'
  - TF_STATE_CONTAINER: 'tfstate'

Secrets (Key Vault Linked):
  - ARM_CLIENT_ID
  - ARM_CLIENT_SECRET
  - ARM_TENANT_ID
  - ARM_SUBSCRIPTION_ID
```

#### **flamoral-dev-vars** (Variable Group ID: 2)

```yaml
Variables:
  - ENVIRONMENT: 'development'
  - RESOURCE_GROUP: 'flamoral-dev-rg'
  - AKS_CLUSTER_NAME: 'flamoral-dev-aks'

Secrets:
  - DEV_DATABASE_PASSWORD
  - DEV_REDIS_PASSWORD
  - DEV_JWT_SECRET
```

#### **flamoral-staging-vars** (Variable Group ID: 3)

```yaml
Variables:
  - ENVIRONMENT: 'staging'
  - RESOURCE_GROUP: 'flamoral-staging-rg'
  - AKS_CLUSTER_NAME: 'flamoral-staging-aks'

Secrets:
  - STAGING_DATABASE_PASSWORD
  - STAGING_REDIS_PASSWORD
  - STAGING_JWT_SECRET
```

#### **flamoral-prod-vars** (Variable Group ID: 4)

```yaml
Variables:
  - ENVIRONMENT: 'production'
  - RESOURCE_GROUP: 'flamoral-prod-rg'
  - AKS_CLUSTER_NAME: 'flamoral-prod-aks'

Secrets:
  - PROD_DATABASE_PASSWORD
  - PROD_REDIS_PASSWORD
  - PROD_JWT_SECRET
  - PROD_ENCRYPTION_KEY
```

### Service Connections

#### Required Service Connections

1. **Azure-Service-Connection**
   - Type: Azure Resource Manager
   - Scope: Subscription
   - Service Principal with Contributor role

2. **ACR-Connection**
   - Type: Docker Registry
   - Registry: flamoralprodacr.azurecr.io

3. **GitHub-Connection**
   - Type: GitHub
   - For repository access

### Creating Variable Groups

```bash
# Using Azure CLI
az pipelines variable-group create \
  --name "flamoral-prod-vars" \
  --variables \
    ENVIRONMENT=production \
    RESOURCE_GROUP=flamoral-prod-rg \
  --organization https://dev.azure.com/flamoral \
  --project FlamoralDating
```

### Linking Azure Key Vault

```bash
# Link Key Vault to Variable Group
az pipelines variable-group variable create \
  --group-id 4 \
  --name "PROD_DATABASE_PASSWORD" \
  --secret true \
  --value "$(az keyvault secret show --vault-name flamoral-prod-kv --name db-password --query value -o tsv)" \
  --organization https://dev.azure.com/flamoral \
  --project FlamoralDating
```

---

## Secret Rotation

### Rotation Schedule

| Secret Type | Rotation Frequency | Owner |
|-------------|-------------------|-------|
| Service Principals | 90 days | DevOps Team |
| Database Passwords | 90 days | Database Admin |
| API Keys | 180 days | Backend Team |
| SSL Certificates | Before expiry | Security Team |
| Mobile Signing Certs | Annually | Mobile Team |

### Rotation Procedures

#### Azure Service Principal Rotation

```bash
# 1. Create new secret for existing service principal
az ad sp credential reset \
  --id <app-id> \
  --append \
  --credential-description "Rotated $(date +%Y-%m-%d)"

# 2. Update GitHub Secrets
gh secret set AZURE_CLIENT_SECRET --body "<new-secret>"

# 3. Update Azure DevOps Variable Groups
az pipelines variable-group variable update \
  --group-id 15 \
  --name ARM_CLIENT_SECRET \
  --secret-value "<new-secret>"

# 4. Verify new secret works
# Run test pipeline

# 5. Delete old secret
az ad sp credential delete \
  --id <app-id> \
  --key-id <old-key-id>
```

#### Database Password Rotation

```bash
# 1. Create new password
NEW_PASSWORD=$(openssl rand -base64 32)

# 2. Update database
az postgres flexible-server update \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-db \
  --admin-password "$NEW_PASSWORD"

# 3. Update Key Vault
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name db-password \
  --value "$NEW_PASSWORD"

# 4. Update Kubernetes secrets
kubectl create secret generic flamoral-db-secrets \
  --from-literal=password="$NEW_PASSWORD" \
  --namespace flamoral-prod \
  --dry-run=client -o yaml | kubectl apply -f -

# 5. Restart pods to pick up new secret
kubectl rollout restart deployment -n flamoral-prod
```

### Automated Rotation

The platform includes automated secret rotation workflows:

- `.github/workflows/secret-rotation-drift-repair.yml`
- Runs weekly
- Rotates non-critical secrets automatically
- Sends notifications for manual rotations

---

## Best Practices

### DO

✅ **Use Environment Protection Rules**
- Require approvals for production deployments
- Limit who can approve deployments

✅ **Encrypt Secrets Before Storing**
```bash
# Encrypt file with GPG before committing
gpg --symmetric --cipher-algo AES256 secrets.txt
```

✅ **Use Short-Lived Tokens**
- Azure Managed Identities where possible
- OIDC tokens for GitHub Actions

✅ **Audit Secret Access**
```bash
# Review Azure Key Vault access logs
az monitor activity-log list \
  --resource-group flamoral-prod-rg \
  --namespace Microsoft.KeyVault
```

✅ **Use Separate Secrets Per Environment**
- Never share production secrets with dev/staging

### DON'T

❌ **Never Commit Secrets to Git**
```bash
# Use .gitignore
echo "*.env" >> .gitignore
echo "secrets.txt" >> .gitignore
echo "*.pem" >> .gitignore
```

❌ **Never Log Secrets**
```javascript
// Bad
console.log('Database password:', process.env.DB_PASSWORD);

// Good
console.log('Database connected');
```

❌ **Never Use Default/Weak Passwords**
```bash
# Generate strong passwords
openssl rand -base64 32
```

❌ **Never Share Secrets via Email/Chat**
- Use secure secret sharing tools
- Azure Key Vault, 1Password, LastPass

---

## Emergency Procedures

### Secret Compromise

#### Immediate Actions (Within 1 Hour)

1. **Revoke Compromised Secret**
   ```bash
   # Revoke service principal
   az ad sp credential delete --id <app-id> --key-id <key-id>

   # Rotate database password
   az postgres flexible-server update \
     --resource-group <rg> \
     --name <server> \
     --admin-password "<new-password>"
   ```

2. **Disable Affected Resources**
   ```bash
   # Disable app registration
   az ad app update --id <app-id> --available-to-other-tenants false
   ```

3. **Notify Security Team**
   - Email: security@flamoral.com
   - Slack: #security-incidents

#### Recovery Actions (Within 24 Hours)

1. **Audit Access Logs**
   ```bash
   az monitor activity-log list \
     --start-time $(date -u -d '24 hours ago' '+%Y-%m-%dT%H:%M:%SZ') \
     --resource-group flamoral-prod-rg
   ```

2. **Rotate All Related Secrets**
   - Follow rotation procedures above
   - Update all affected systems

3. **Review and Update Policies**
   - Implement additional controls
   - Update incident response plan

### Key Vault Disaster Recovery

```bash
# Backup Key Vault
az keyvault secret backup \
  --vault-name flamoral-prod-kv \
  --name <secret-name> \
  --file <backup-file>

# Restore Key Vault
az keyvault secret restore \
  --vault-name flamoral-prod-kv \
  --file <backup-file>
```

---

## Required Secrets Checklist

### Pre-Deployment Checklist

- [ ] Azure service principals created for all environments
- [ ] Azure Key Vaults provisioned
- [ ] GitHub repository secrets configured
- [ ] Azure DevOps variable groups created
- [ ] Service connections established
- [ ] Mobile app signing certificates generated
- [ ] Third-party API keys obtained
- [ ] SSL certificates purchased and configured
- [ ] Notification webhooks configured
- [ ] All secrets documented in password manager

### Post-Deployment Checklist

- [ ] All secrets tested in dev environment
- [ ] Staging secrets validated
- [ ] Production secrets configured
- [ ] Secret rotation schedule established
- [ ] Audit logging enabled
- [ ] Backup procedures tested
- [ ] Team trained on secret management
- [ ] Incident response plan documented

---

## Support

For questions or issues related to secrets management:

- **DevOps Team**: devops@flamoral.com
- **Security Team**: security@flamoral.com
- **On-Call**: +1-555-FLAMORAL

## References

- [GitHub Actions Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Azure Key Vault Best Practices](https://learn.microsoft.com/en-us/azure/key-vault/general/best-practices)
- [Azure DevOps Variable Groups](https://learn.microsoft.com/en-us/azure/devops/pipelines/library/variable-groups)
