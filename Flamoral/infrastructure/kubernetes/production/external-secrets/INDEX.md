# External Secrets Configuration - File Index

Complete index of all files in the External Secrets configuration for Flamoral Dating Platform.

## Overview

This directory contains a complete External Secrets Operator setup for syncing Azure Key Vault secrets to Kubernetes secrets in the production environment.

**Key Vault URL**: `https://flamoral-prod-kv.vault.azure.net`
**Namespace**: `flamoral`
**Total Files**: 14 (2,711+ lines of configuration and documentation)

---

## Core Configuration Files

### 1. `secret-store.yaml` (42 lines)
**Purpose**: Defines the SecretStore and ClusterSecretStore resources

**Contains**:
- ServiceAccount with Azure Workload Identity annotations
- SecretStore configuration for namespace-scoped access
- ClusterSecretStore for cluster-wide access

**Key Settings**:
- Authentication: Azure Workload Identity
- Vault URL: `https://flamoral-prod-kv.vault.azure.net`
- Service Account: `external-secrets-sa`

**When to modify**:
- Changing Key Vault URL
- Updating managed identity credentials
- Switching authentication methods

---

### 2. `auth-secrets.yaml` (60 lines)
**Purpose**: Syncs authentication and authorization secrets

**Secrets Managed** (8 secrets):
- `JWT_SECRET` - General JWT signing key
- `JWT_ACCESS_SECRET` - Access token signing key
- `JWT_REFRESH_SECRET` - Refresh token signing key
- `SERVICE_API_KEY` - Internal service authentication
- `SESSION_SECRET` - Session encryption key
- `GOOGLE_CLIENT_SECRET` - Google OAuth
- `FACEBOOK_APP_SECRET` - Facebook OAuth
- `APPLE_PRIVATE_KEY` - Apple OAuth

**Refresh Interval**: 6 hours

**Output Secret**: `flamoral-auth-secrets`

---

### 3. `payment-secrets.yaml` (41 lines)
**Purpose**: Syncs Stripe payment gateway credentials

**Secrets Managed** (3 secrets):
- `STRIPE_SECRET_KEY` - Stripe API secret key
- `STRIPE_WEBHOOK_SECRET` - Webhook signature validation
- `STRIPE_PUBLISHABLE_KEY` - Client-side publishable key

**Refresh Interval**: 12 hours

**Output Secret**: `flamoral-payment-secrets`

---

### 4. `notification-secrets.yaml` (51 lines)
**Purpose**: Syncs notification service credentials

**Secrets Managed** (5 secrets):
- `SENDGRID_API_KEY` - Email notifications (SendGrid)
- `TWILIO_ACCOUNT_SID` - SMS account identifier
- `TWILIO_AUTH_TOKEN` - SMS authentication
- `FIREBASE_PRIVATE_KEY` - Push notifications
- `FCM_SERVER_KEY` - Firebase Cloud Messaging

**Refresh Interval**: 12 hours

**Output Secret**: `flamoral-notification-secrets`

---

### 5. `media-secrets.yaml` (63 lines)
**Purpose**: Syncs media storage and processing credentials

**Secrets Managed** (10 secrets):
- `AZURE_STORAGE_KEY` - Blob storage access
- `AZURE_STORAGE_CONNECTION_STRING` - Full connection string
- `AZURE_FACE_API_KEY` - Face verification AI
- `AZURE_CONTENT_MODERATOR_KEY` - Content moderation AI
- `AZURE_COMPUTER_VISION_KEY` - Image analysis AI
- `AGORA_APP_ID` - Video/voice chat app ID
- `AGORA_APP_CERTIFICATE` - Video/voice certificate
- `AGORA_CUSTOMER_KEY` - Agora API key
- `AGORA_CUSTOMER_SECRET` - Agora API secret

**Refresh Interval**: 12 hours

**Output Secret**: `flamoral-media-secrets`

---

### 6. `database-secrets.yaml` (95 lines)
**Purpose**: Syncs database and cache credentials with templating

**Secrets Managed** (11 base secrets):
- PostgreSQL: `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- Read Replicas: `DB_READ_REPLICA_1_URL`, `DB_READ_REPLICA_2_URL`
- MongoDB: `MONGODB_URI`
- Redis: `REDIS_HOST`, `REDIS_PASSWORD`
- Azure Service Bus: `AZURE_SERVICE_BUS_CONNECTION_STRING`

**Templated Outputs** (additional):
- `DATABASE_URL` - Full PostgreSQL connection string
- `REDIS_URL` - Full Redis connection string
- Connection configuration (ports, TLS settings)

**Refresh Interval**: 1 hour (most frequent due to critical nature)

**Output Secret**: `flamoral-database-secrets`

---

## Deployment & Automation Scripts

### 7. `deploy.sh` (305 lines)
**Purpose**: Automated deployment script for Bash/Linux/macOS

**Features**:
- Prerequisite checks (kubectl, helm, az)
- Environment variable validation
- External Secrets Operator installation
- Key Vault access verification
- Secret existence validation
- Step-by-step deployment with error handling
- Colored output for better UX
- Rollback on failure

**Usage**:
```bash
export AZURE_CLIENT_ID="xxx"
export AZURE_TENANT_ID="xxx"
./deploy.sh
```

---

### 8. `deploy.ps1` (321 lines)
**Purpose**: Automated deployment script for PowerShell/Windows

**Features**: Same as `deploy.sh` but for Windows environments

**Usage**:
```powershell
$env:AZURE_CLIENT_ID = "xxx"
$env:AZURE_TENANT_ID = "xxx"
./deploy.ps1
```

---

### 9. `validate.sh` (174 lines)
**Purpose**: Validation script to verify deployment health

**Checks**:
1. Namespace existence
2. External Secrets Operator status
3. SecretStore health
4. ExternalSecret sync status
5. Kubernetes secret creation
6. Azure Key Vault connectivity
7. Recent operator logs

**Usage**:
```bash
./validate.sh
```

**Exit Codes**:
- `0` - All checks passed
- `1` - One or more checks failed

---

### 10. `kustomization.yaml` (23 lines)
**Purpose**: Kustomize configuration for GitOps deployment

**Features**:
- Defines resource ordering
- Applies common labels
- Adds annotations
- Namespace scoping

**Usage**:
```bash
kubectl apply -k .
```

---

## Documentation

### 11. `README.md` (275 lines)
**Purpose**: Comprehensive overview and usage guide

**Sections**:
- Overview and architecture
- File structure explanation
- Secret groups and categories
- Deployment instructions
- Verification procedures
- Troubleshooting guide
- Secret rotation procedures
- Security best practices
- Usage in deployments (examples)

**Target Audience**: Developers and DevOps engineers

---

### 12. `DEPLOYMENT-GUIDE.md` (532 lines)
**Purpose**: Detailed step-by-step deployment manual

**Sections**:
- Prerequisites checklist
- Quick start options
- Detailed setup (7 steps)
- Verification procedures
- Comprehensive troubleshooting
- Rollback procedures
- Best practices
- Additional resources

**Target Audience**: DevOps engineers performing initial setup

---

### 13. `keyvault-secrets-reference.md` (340 lines)
**Purpose**: Complete reference for all Azure Key Vault secrets

**Sections**:
- Quick commands
- Secret-by-secret documentation
- Where to obtain secret values
- Example Azure CLI commands
- Bulk import script
- Verification procedures
- Security best practices
- Troubleshooting

**Target Audience**: Platform administrators managing secrets

---

### 14. `QUICK-REFERENCE.md` (389 lines)
**Purpose**: Cheat sheet for common operations

**Sections**:
- Deployment commands
- Verification commands
- Troubleshooting quick fixes
- Azure Key Vault operations
- Kubernetes secrets operations
- Monitoring commands
- Maintenance procedures
- Common issues table
- Useful aliases
- Emergency procedures

**Target Audience**: Daily operators and on-call engineers

---

## Usage Workflow

### Initial Setup
1. Read `DEPLOYMENT-GUIDE.md`
2. Review `keyvault-secrets-reference.md`
3. Populate Azure Key Vault
4. Run `deploy.sh` or `deploy.ps1`
5. Run `validate.sh`

### Daily Operations
1. Use `QUICK-REFERENCE.md` for common tasks
2. Monitor with commands from quick reference
3. Check `README.md` for specific issues

### Troubleshooting
1. Check `QUICK-REFERENCE.md` for quick fixes
2. Consult `DEPLOYMENT-GUIDE.md` troubleshooting section
3. Review `README.md` for detailed explanations

### Maintenance
1. Update secrets in Azure Key Vault
2. Force refresh if needed (quick reference)
3. Verify sync (validation script)
4. Test in staging first

---

## File Dependencies

```
secret-store.yaml (must be applied first)
    ↓
    ├── auth-secrets.yaml
    ├── payment-secrets.yaml
    ├── notification-secrets.yaml
    ├── media-secrets.yaml
    └── database-secrets.yaml
```

**Note**: All ExternalSecret files depend on SecretStore being ready

---

## Secret Mapping

### Azure Key Vault → Kubernetes

| ExternalSecret | Key Vault Secrets | K8s Secret | Keys |
|----------------|-------------------|------------|------|
| auth-secrets | 8 secrets | flamoral-auth-secrets | 8 keys |
| payment-secrets | 3 secrets | flamoral-payment-secrets | 3 keys |
| notification-secrets | 5 secrets | flamoral-notification-secrets | 5 keys |
| media-secrets | 10 secrets | flamoral-media-secrets | 10 keys |
| database-secrets | 11 secrets | flamoral-database-secrets | 17 keys* |

*database-secrets includes templated outputs

---

## Refresh Intervals

| ExternalSecret | Interval | Reason |
|----------------|----------|--------|
| database-secrets | 1 hour | Critical infrastructure |
| auth-secrets | 6 hours | Security-sensitive |
| payment-secrets | 12 hours | Standard rotation |
| notification-secrets | 12 hours | Standard rotation |
| media-secrets | 12 hours | Standard rotation |

---

## Security Considerations

1. **Never commit actual secret values** to version control
2. **Use workload identity** instead of service principal secrets
3. **Enable Key Vault soft delete** and purge protection
4. **Implement regular rotation** for all secrets
5. **Monitor Key Vault access logs** for suspicious activity
6. **Use least privilege** for Key Vault access policies
7. **Test in staging first** before production changes

---

## Maintenance Schedule

### Daily
- Monitor ExternalSecret sync status
- Check External Secrets Operator logs for errors

### Weekly
- Review Key Vault access logs
- Verify all secrets are syncing correctly

### Monthly
- Review and update secret rotation schedule
- Audit Key Vault access policies
- Update documentation if configuration changes

### Quarterly
- Rotate critical secrets (JWT, API keys)
- Review and update security policies
- Test disaster recovery procedures

---

## Support Resources

### Documentation Files
- `README.md` - General overview
- `DEPLOYMENT-GUIDE.md` - Setup instructions
- `QUICK-REFERENCE.md` - Daily operations
- `keyvault-secrets-reference.md` - Secret details
- `INDEX.md` - This file

### Scripts
- `deploy.sh` / `deploy.ps1` - Automated deployment
- `validate.sh` - Health check

### External Resources
- [External Secrets Docs](https://external-secrets.io/)
- [Azure Workload Identity](https://azure.github.io/azure-workload-identity/)
- [Azure Key Vault Best Practices](https://docs.microsoft.com/en-us/azure/key-vault/general/best-practices)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-13 | Initial configuration created |

---

## Quick Links

- **Getting Started**: [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md)
- **Cheat Sheet**: [QUICK-REFERENCE.md](QUICK-REFERENCE.md)
- **Secret List**: [keyvault-secrets-reference.md](keyvault-secrets-reference.md)
- **Detailed Docs**: [README.md](README.md)

---

**Configuration Path**: `/infrastructure/kubernetes/production/external-secrets/`
**Last Updated**: 2025-12-13
**Maintained By**: DevOps Team
