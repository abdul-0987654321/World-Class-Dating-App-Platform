# OAuth Secret Naming Mismatch Fix - Summary

## Overview
This document summarizes the fixes applied to resolve the OAuth secret naming mismatch between Terraform KeyVault definitions and External Secrets Operator (ESO) references.

## Problem Statement
There was a naming inconsistency between:
- **ESO ExternalSecret manifests** which referenced OAuth secrets with one naming convention
- **Terraform KeyVault definitions** which defined the same secrets with different names

This mismatch would cause ESO to fail when trying to pull OAuth secrets from Azure KeyVault.

## Strategy
**Approach**: Update ESO manifests to match Terraform naming (preserving existing KeyVault secrets)

This minimizes disruption since KeyVault secrets may already exist in production environments.

---

## Changes Made

### 1. Fixed OAuth Secret References in ESO

#### File: `infrastructure/kubernetes/production/external-secrets/auth-secrets.yaml`

**BEFORE (Incorrect):**
```yaml
# OAuth Secrets
- secretKey: GOOGLE_CLIENT_SECRET
  remoteRef:
    key: google-oauth-secret          # WRONG
- secretKey: FACEBOOK_APP_SECRET
  remoteRef:
    key: facebook-oauth-secret        # WRONG
- secretKey: APPLE_PRIVATE_KEY
  remoteRef:
    key: apple-oauth-key              # WRONG
```

**AFTER (Corrected):**
```yaml
# OAuth Secrets - Aligned with Terraform KeyVault definitions
- secretKey: GOOGLE_CLIENT_SECRET
  remoteRef:
    key: google-client-secret         # FIXED
- secretKey: FACEBOOK_APP_SECRET
  remoteRef:
    key: facebook-app-secret          # FIXED
- secretKey: APPLE_PRIVATE_KEY
  remoteRef:
    key: apple-private-key            # FIXED
```

---

### 2. Added Missing Secrets to Terraform KeyVault Definitions

#### File: `infrastructure/terraform/modules/service-vaults/main.tf`

Added the following missing secrets that were referenced in ESO but not defined in Terraform:

#### **Data Vault** (Database & Cache)
Added:
- `redis-host`
- `db-host`
- `db-name`
- `db-user`
- `db-password`
- `db-read-replica-1-url`
- `db-read-replica-2-url`

#### **External Vault** (Third-party APIs)
Added:
- `twilio-account-sid`
- `fcm-server-key`
- `agora-app-id` (was missing)
- `agora-customer-key` (was missing)

#### **Infrastructure Vault**
Added:
- `azure-computer-vision-key`

#### **Payment Vault**
Added:
- `stripe-publishable-key`

---

### 3. Fixed Azure Service Bus Naming Inconsistency

#### File: `infrastructure/kubernetes/production/external-secrets/database-secrets.yaml`

**BEFORE:**
```yaml
- secretKey: serviceBusConnectionString
  remoteRef:
    key: azure-servicebus-connection-string    # Missing hyphen
```

**AFTER:**
```yaml
- secretKey: serviceBusConnectionString
  remoteRef:
    key: azure-service-bus-connection-string   # Matches Terraform
```

---

## Complete Secret Mapping Reference

### Auth Vault (`flamoralprodauthkv`)
| Environment Variable | KeyVault Secret Name | ESO Reference File |
|---------------------|---------------------|-------------------|
| JWT_SECRET | jwt-secret | auth-secrets.yaml |
| JWT_ACCESS_SECRET | jwt-access-secret | auth-secrets.yaml |
| JWT_REFRESH_SECRET | jwt-refresh-secret | auth-secrets.yaml |
| SESSION_SECRET | session-secret | auth-secrets.yaml |
| SERVICE_API_KEY | service-api-key | auth-secrets.yaml |
| GOOGLE_CLIENT_SECRET | google-client-secret | auth-secrets.yaml |
| FACEBOOK_APP_SECRET | facebook-app-secret | auth-secrets.yaml |
| APPLE_PRIVATE_KEY | apple-private-key | auth-secrets.yaml |

### Payment Vault (`flamoralproddatakv`)
| Environment Variable | KeyVault Secret Name | ESO Reference File |
|---------------------|---------------------|-------------------|
| STRIPE_SECRET_KEY | stripe-secret-key | payment-secrets.yaml |
| STRIPE_PUBLISHABLE_KEY | stripe-publishable-key | payment-secrets.yaml |
| STRIPE_WEBHOOK_SECRET | stripe-webhook-secret | payment-secrets.yaml |

### Data Vault (`flamoralproddatakv`)
| Environment Variable | KeyVault Secret Name | ESO Reference File |
|---------------------|---------------------|-------------------|
| DB_HOST | db-host | database-secrets.yaml |
| DB_NAME | db-name | database-secrets.yaml |
| DB_USER | db-user | database-secrets.yaml |
| DB_PASSWORD | db-password | database-secrets.yaml |
| - | db-read-replica-1-url | database-secrets.yaml |
| - | db-read-replica-2-url | database-secrets.yaml |
| MONGODB_URI | mongodb-uri | database-secrets.yaml |
| REDIS_HOST | redis-host | database-secrets.yaml |
| REDIS_PASSWORD | redis-password | database-secrets.yaml |
| AZURE_SERVICE_BUS_CONNECTION_STRING | azure-service-bus-connection-string | database-secrets.yaml |

### External Vault (`flamoralprodexternalkv`)
| Environment Variable | KeyVault Secret Name | ESO Reference File |
|---------------------|---------------------|-------------------|
| SENDGRID_API_KEY | sendgrid-api-key | notification-secrets.yaml |
| TWILIO_ACCOUNT_SID | twilio-account-sid | notification-secrets.yaml |
| TWILIO_AUTH_TOKEN | twilio-auth-token | notification-secrets.yaml |
| FIREBASE_PRIVATE_KEY | firebase-private-key | notification-secrets.yaml |
| FCM_SERVER_KEY | fcm-server-key | notification-secrets.yaml |
| AGORA_APP_ID | agora-app-id | media-secrets.yaml |
| AGORA_APP_CERTIFICATE | agora-app-certificate | media-secrets.yaml |
| AGORA_CUSTOMER_KEY | agora-customer-key | media-secrets.yaml |
| AGORA_CUSTOMER_SECRET | agora-customer-secret | media-secrets.yaml |
| SENTRY_DSN | sentry-dsn | (monitoring) |
| OPENAI_API_KEY | openai-api-key | (ai-service) |

### Infrastructure Vault (`flamoralprodinfrakv`)
| Environment Variable | KeyVault Secret Name | ESO Reference File |
|---------------------|---------------------|-------------------|
| AZURE_STORAGE_KEY | azure-storage-key | media-secrets.yaml |
| AZURE_STORAGE_CONNECTION_STRING | azure-storage-connection-string | media-secrets.yaml |
| AZURE_FACE_API_KEY | azure-face-api-key | media-secrets.yaml |
| AZURE_CONTENT_MODERATOR_KEY | azure-content-moderator-key | media-secrets.yaml |
| AZURE_COMPUTER_VISION_KEY | azure-computer-vision-key | media-secrets.yaml |
| AZURE_SERVICE_BUS_CONNECTION_STRING | azure-service-bus-connection-string | database-secrets.yaml |
| APPLICATION_INSIGHTS_CONNECTION_STRING | application-insights-connection-string | (monitoring) |

---

## Deployment Steps

### 1. Update Terraform Infrastructure
```bash
cd infrastructure/terraform/environments/prod
terraform plan   # Review changes
terraform apply  # Apply KeyVault updates
```

### 2. Populate Missing Secrets in Azure KeyVault
Use the provided PowerShell script:
```powershell
cd scripts
.\populate-service-vaults.ps1 -Environment prod
```

Or manually add secrets via Azure CLI:
```bash
# Example for missing database secrets
az keyvault secret set --vault-name flamoralproddatakv --name db-host --value "your-db-host"
az keyvault secret set --vault-name flamoralproddatakv --name db-name --value "flamoral_prod"
az keyvault secret set --vault-name flamoralproddatakv --name db-user --value "flamoral_admin"
az keyvault secret set --vault-name flamoralproddatakv --name db-password --value "your-secure-password"

# Missing Agora secrets
az keyvault secret set --vault-name flamoralprodexternalkv --name agora-app-id --value "your-agora-app-id"
az keyvault secret set --vault-name flamoralprodexternalkv --name agora-customer-key --value "your-agora-customer-key"

# Other missing secrets
az keyvault secret set --vault-name flamoralprodinfrakv --name azure-computer-vision-key --value "your-cv-key"
az keyvault secret set --vault-name flamoralprodpaymentkv --name stripe-publishable-key --value "pk_live_..."
```

### 3. Update Kubernetes ExternalSecrets
```bash
kubectl apply -f infrastructure/kubernetes/production/external-secrets/auth-secrets.yaml
kubectl apply -f infrastructure/kubernetes/production/external-secrets/database-secrets.yaml

# Verify ESO can sync secrets
kubectl get externalsecrets -n flamoral
kubectl describe externalsecret flamoral-auth-secrets -n flamoral
kubectl describe externalsecret flamoral-database-secrets -n flamoral
```

### 4. Verify Secret Synchronization
```bash
# Check if secrets were created successfully
kubectl get secrets -n flamoral | grep flamoral

# Verify secret contents (be careful - these are sensitive!)
kubectl get secret flamoral-auth-secrets -n flamoral -o jsonpath='{.data}' | jq 'keys'

# Check ESO logs for any errors
kubectl logs -n external-secrets-system deployment/external-secrets -f
```

---

## Verification Checklist

- [ ] Terraform plan shows expected KeyVault secret additions
- [ ] Terraform apply completes successfully
- [ ] All missing secrets populated in Azure KeyVault
- [ ] ESO ExternalSecrets manifests applied to cluster
- [ ] ExternalSecret resources show `SecretSynced` status
- [ ] Kubernetes secrets created in `flamoral` namespace
- [ ] Application pods can access OAuth secrets
- [ ] OAuth authentication flows working (Google, Facebook, Apple)
- [ ] Database connections working with new credential structure
- [ ] Agora video/audio features functional

---

## Rollback Plan

If issues occur:

1. **Revert Kubernetes manifests:**
```bash
git revert <commit-hash>
kubectl apply -f infrastructure/kubernetes/production/external-secrets/
```

2. **Add legacy secret names to KeyVault** (temporary bridge):
```bash
# Create aliases with old names pointing to same values
az keyvault secret set --vault-name flamoralprodauthkv --name google-oauth-secret \
  --value "$(az keyvault secret show --vault-name flamoralprodauthkv --name google-client-secret --query value -o tsv)"
```

3. **Revert Terraform changes:**
```bash
cd infrastructure/terraform/environments/prod
git checkout HEAD~1 modules/service-vaults/main.tf
terraform apply
```

---

## Files Modified

1. **C:\Users\citad\OneDrive\Documents\Dating\Flamoral\infrastructure\kubernetes\production\external-secrets\auth-secrets.yaml**
   - Fixed OAuth secret key references (3 changes)

2. **C:\Users\citad\OneDrive\Documents\Dating\Flamoral\infrastructure\kubernetes\production\external-secrets\database-secrets.yaml**
   - Fixed Azure Service Bus connection string key reference (1 change)

3. **C:\Users\citad\OneDrive\Documents\Dating\Flamoral\infrastructure\terraform\modules\service-vaults\main.tf**
   - Added 13 missing secrets across all vaults
   - data vault: +7 secrets
   - external vault: +4 secrets
   - infra vault: +1 secret
   - payment vault: +1 secret

---

## Testing Recommendations

### 1. OAuth Flow Testing
Test each OAuth provider after deployment:
- Google OAuth login
- Facebook OAuth login
- Apple Sign-In

### 2. Database Connection Testing
Verify database connectivity:
```bash
# From a pod in the cluster
kubectl exec -it deployment/user-service -n flamoral -- sh
env | grep DB_
# Attempt database connection
```

### 3. Third-party Service Testing
- Send test email via SendGrid
- Send test SMS via Twilio
- Initiate test Agora video call
- Test push notification delivery

---

## Additional Notes

- All secret names now use **kebab-case** (hyphen-separated) for consistency
- SecretStore configuration remains unchanged (no modifications needed)
- RBAC permissions already grant ESO access to all service vaults
- This fix maintains backward compatibility with environment variable names in application code

---

## Support

For issues or questions:
1. Check ESO logs: `kubectl logs -n external-secrets-system deployment/external-secrets`
2. Verify KeyVault permissions: Ensure AKS managed identity has "Key Vault Secrets User" role
3. Review Terraform state: `terraform show | grep key_vault`

---

**Last Updated:** 2025-12-16
**Author:** Claude Code
**Version:** 1.0
