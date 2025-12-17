# Secrets Replacement Guide - Flamoral Dating Platform

**Document Version:** 1.0
**Last Updated:** 2025-12-12
**Applies To:** Production Environment (flamoral-prod-rg)

---

## Table of Contents

1. [Overview](#overview)
2. [Key Vaults Architecture](#key-vaults-architecture)
3. [Placeholder Secrets Inventory](#placeholder-secrets-inventory)
4. [Service Provider Setup Instructions](#service-provider-setup-instructions)
5. [Azure CLI Update Commands](#azure-cli-update-commands)
6. [Automated Update Script](#automated-update-script)
7. [Verification & Testing](#verification--testing)
8. [Security Best Practices](#security-best-practices)
9. [Rollback Procedures](#rollback-procedures)
10. [Troubleshooting](#troubleshooting)

---

## Overview

### Purpose

This guide provides comprehensive instructions for replacing placeholder secrets in the Flamoral Dating Platform's Azure Key Vaults with production-ready API keys and credentials.

### Current State

- **5 Key Vaults** have been provisioned and populated with initial secrets
- **Some secrets** contain placeholder values that must be replaced with real API keys
- **Security**: RBAC is enabled, all vaults use soft-delete and purge protection

### Prerequisites

Before starting, ensure you have:

- [ ] Azure CLI installed and updated (`az --version` should be 2.50.0+)
- [ ] Authenticated to Azure (`az login`)
- [ ] **Key Vault Administrator** or **Key Vault Secrets Officer** role on all vaults
- [ ] Access to obtain API keys from third-party service providers
- [ ] PowerShell 7.0+ (for automation script)

### Verify Your Permissions

```bash
# Check your current Azure account
az account show

# Verify access to Key Vaults
az keyvault list --resource-group flamoral-prod-rg --output table

# Test secret read permission (should succeed)
az keyvault secret show --vault-name flamoral-prod-payment-kv --name stripe-secret-key --query "value" -o tsv
```

---

## Key Vaults Architecture

The Flamoral platform uses a **vault-per-service-category** architecture for security isolation:

| Vault Name | Category | Purpose | Placeholder Count |
|------------|----------|---------|-------------------|
| `flamoral-prod-auth-kv` | Authentication | JWT, OAuth, Session secrets | 0 (all auto-generated) |
| `flamoral-prod-payment-kv` | Payments | Stripe, IAP credentials | **2 placeholders** |
| `flamoral-prod-data-kv` | Databases | PostgreSQL, Redis, Cosmos DB | 0 (auto-provisioned) |
| `flamoral-prod-ext-kv` | External APIs | SendGrid, Twilio, Sentry, OpenAI | **6 placeholders** |
| `flamoral-prod-infra-kv` | Infrastructure | Azure services, storage, monitoring | **1 placeholder** |

**Total Placeholders to Replace:** **9 secrets**

---

## Placeholder Secrets Inventory

### 1. Payment Vault (`flamoral-prod-payment-kv`)

| Secret Name | Current Value | Status | Priority |
|-------------|---------------|--------|----------|
| `stripe-secret-key` | `REPLACE_WITH_STRIPE_SECRET_KEY_sk_live_XXXX` | 🔴 **Required** | Critical |
| `stripe-webhook-secret` | `REPLACE_WITH_STRIPE_WEBHOOK_SECRET_whsec_XXXX` | 🔴 **Required** | Critical |

**Impact if not replaced:**
- Payment processing will fail
- Subscription management won't work
- Webhook events won't be verified

---

### 2. External Services Vault (`flamoral-prod-ext-kv`)

| Secret Name | Current Value | Status | Priority |
|-------------|---------------|--------|----------|
| `sendgrid-api-key` | `REPLACE_WITH_SENDGRID_API_KEY` | 🟠 **High** | High |
| `twilio-auth-token` | `REPLACE_WITH_TWILIO_AUTH_TOKEN` | 🟡 **Medium** | Medium |
| `sentry-dsn` | `REPLACE_WITH_SENTRY_DSN` | 🟡 **Medium** | Medium |
| `openai-api-key` | `REPLACE_WITH_OPENAI_API_KEY` | 🟡 **Medium** | Medium |
| `firebase-private-key` | `REPLACE_WITH_FIREBASE_PRIVATE_KEY` | 🟢 **Low** | Low |
| `agora-app-certificate` | `REPLACE_WITH_AGORA_APP_CERTIFICATE` | 🟢 **Low** | Low |

**Impact if not replaced:**
- **SendGrid**: Email verification, password resets won't work
- **Twilio**: SMS notifications disabled
- **Sentry**: Error tracking won't function
- **OpenAI**: AI matching features unavailable
- **Firebase**: Push notifications won't work
- **Agora**: Video chat features disabled

---

### 3. Infrastructure Vault (`flamoral-prod-infra-kv`)

| Secret Name | Current Value | Status | Priority |
|-------------|---------------|--------|----------|
| `azure-storage-connection-string` | `REPLACE_WITH_AZURE_STORAGE_CONNECTION_STRING` | 🟠 **High** | High |

**Impact if not replaced:**
- Profile photos won't upload
- Media storage disabled

**Note:** This can be auto-generated from existing Azure Storage account (see [Section 5.7](#57-azure-storage-infrastructure-vault)).

---

## Service Provider Setup Instructions

### 4.1 Stripe (Payment Vault)

#### What You Need

1. **Stripe Secret Key** (`sk_live_...`)
2. **Stripe Webhook Secret** (`whsec_...`)

#### Step-by-Step Setup

**A. Get Stripe Secret Key**

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Developers** → **API keys**
3. Click **Create secret key** (or reveal existing test key)
4. For **production**:
   - Ensure you're in **Live mode** (toggle in top-right)
   - Copy the **Secret key** (starts with `sk_live_`)
5. **Required Permissions**: Full API access (default)

**B. Get Stripe Webhook Secret**

1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Configure webhook:
   - **Endpoint URL**: `https://api.flamoral.com/payments/webhook`
   - **Events to send**:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
4. Click **Add endpoint**
5. Copy the **Signing secret** (starts with `whsec_`)

**Security Notes:**
- Never commit these keys to version control
- Use separate keys for test/production environments
- Rotate keys every 90 days

---

### 4.2 SendGrid (External Services Vault)

#### What You Need

1. **SendGrid API Key** (starts with `SG.`)

#### Step-by-Step Setup

1. Go to [SendGrid Dashboard](https://app.sendgrid.com/)
2. Navigate to **Settings** → **API Keys**
3. Click **Create API Key**
4. Configure:
   - **Name**: `flamoral-production`
   - **Permissions**: **Full Access** (or **Restricted Access** with Mail Send + Email Activity)
5. Click **Create & View**
6. **Copy the API key immediately** (shown only once!)

**Required Permissions:**
- Mail Send
- Email Activity (for tracking)

**Sender Configuration:**
1. Navigate to **Settings** → **Sender Authentication**
2. Verify domain: `flamoral.com`
3. Set up **SPF** and **DKIM** records in your DNS

**Email Templates:**
- Set up transactional templates for:
  - Welcome email
  - Email verification
  - Password reset
  - Match notifications

---

### 4.3 Twilio (External Services Vault)

#### What You Need

1. **Twilio Auth Token**

#### Step-by-Step Setup

1. Go to [Twilio Console](https://console.twilio.com/)
2. Navigate to **Account** → **API keys & tokens**
3. Under **Live credentials**, copy:
   - **Auth Token** (primary or secondary)
4. Also note (needed in app config):
   - **Account SID**
   - **Phone Number** (from Phone Numbers → Active numbers)

**Required Services:**
- Messaging service enabled
- Phone number purchased and configured

**Security Notes:**
- Use secondary Auth Token if available (allows rotation without downtime)
- Enable Two-Factor Authentication on Twilio account

---

### 4.4 Sentry (External Services Vault)

#### What You Need

1. **Sentry DSN** (Data Source Name)

#### Step-by-Step Setup

1. Go to [Sentry.io](https://sentry.io/)
2. Create organization (if not exists): `flamoral`
3. Create project:
   - **Platform**: Node.js
   - **Project name**: `flamoral-backend`
4. Navigate to **Settings** → **Projects** → **flamoral-backend** → **Client Keys (DSN)**
5. Copy the **DSN** (format: `https://<key>@<org>.ingest.sentry.io/<project-id>`)

**Recommended Configuration:**
- Set **Environment**: `production`
- Configure **Release tracking** for version monitoring
- Set up **Alerts** for critical errors

**Privacy Settings:**
- Enable **Data Scrubbing** to remove sensitive data
- Configure **IP Address** capture policy

---

### 4.5 OpenAI (External Services Vault)

#### What You Need

1. **OpenAI API Key** (starts with `sk-`)

#### Step-by-Step Setup

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Navigate to **API keys** (left sidebar)
3. Click **Create new secret key**
4. Name: `flamoral-production`
5. **Copy the key immediately** (shown only once!)

**Required Setup:**
- Add payment method (for production usage)
- Set up usage limits to prevent overcharges
- Configure rate limits per model

**Recommended Models:**
- `gpt-4` or `gpt-4-turbo` for AI matching algorithm
- `text-embedding-ada-002` for semantic search

**Cost Management:**
- Set monthly budget alerts
- Monitor usage via dashboard

---

### 4.6 Firebase (External Services Vault)

#### What You Need

1. **Firebase Private Key** (JSON service account)

#### Step-by-Step Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create one): `flamoral-prod`
3. Navigate to **Project Settings** (gear icon) → **Service accounts**
4. Click **Generate new private key**
5. Download JSON file (contains private key)
6. **Extract the private key**:
   ```json
   {
     "type": "service_account",
     "project_id": "flamoral-prod",
     "private_key_id": "...",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
     ...
   }
   ```
7. Use the entire JSON content (or just the `private_key` field)

**Required APIs:**
- Cloud Messaging API (for push notifications)
- Enable **FCM** in Firebase Console

**Security:**
- Store entire JSON, or just extract `private_key` field
- Never expose this in client-side code

---

### 4.7 Azure Storage (Infrastructure Vault)

#### What You Need

1. **Azure Storage Connection String**

#### Automatic Retrieval

The Azure Storage account `flamoralprodzcqqgc` already exists in `flamoral-prod-rg`.

**Get connection string automatically:**

```bash
az storage account show-connection-string \
  --name flamoralprodzcqqgc \
  --resource-group flamoral-prod-rg \
  --output tsv
```

**Expected format:**
```
DefaultEndpointsProtocol=https;AccountName=flamoralprodzcqqgc;AccountKey=<KEY>;EndpointSuffix=core.windows.net
```

**Verification:**
```bash
# Test connection
az storage container list \
  --connection-string "<connection-string>" \
  --output table
```

---

### 4.8 Agora.io (External Services Vault) - Optional

#### What You Need

1. **Agora App Certificate**

#### Step-by-Step Setup

1. Go to [Agora Console](https://console.agora.io/)
2. Navigate to **Project Management**
3. Select your project (or create one): `flamoral-video`
4. Copy **App Certificate** (enable if not already enabled)
5. Also note: **App ID** (needed in app config)

**Required Services:**
- Video calling enabled
- Recording service (optional)

**Cost Management:**
- Free tier: 10,000 minutes/month
- Monitor usage to avoid overages

---

## Azure CLI Update Commands

### 5.1 Stripe Keys (Payment Vault)

```bash
# Update Stripe Secret Key
az keyvault secret set \
  --vault-name flamoral-prod-payment-kv \
  --name stripe-secret-key \
  --value "sk_live_YOUR_ACTUAL_STRIPE_SECRET_KEY_HERE" \
  --description "Stripe API secret key for payment processing"

# Update Stripe Webhook Secret
az keyvault secret set \
  --vault-name flamoral-prod-payment-kv \
  --name stripe-webhook-secret \
  --value "whsec_YOUR_ACTUAL_WEBHOOK_SECRET_HERE" \
  --description "Stripe webhook signing secret"
```

**Verification:**
```bash
# Verify both secrets are updated (shows metadata only)
az keyvault secret list \
  --vault-name flamoral-prod-payment-kv \
  --output table

# Check secret version (confirm updated timestamp)
az keyvault secret show \
  --vault-name flamoral-prod-payment-kv \
  --name stripe-secret-key \
  --query "{name:name, updated:attributes.updated}" \
  --output table
```

---

### 5.2 SendGrid API Key (External Services Vault)

```bash
az keyvault secret set \
  --vault-name flamoral-prod-ext-kv \
  --name sendgrid-api-key \
  --value "SG.YOUR_ACTUAL_SENDGRID_API_KEY" \
  --description "SendGrid API key for email delivery"
```

**Verification:**
```bash
# Test email delivery (requires SendGrid CLI or curl)
# See: https://docs.sendgrid.com/api-reference/mail-send/mail-send
```

---

### 5.3 Twilio Auth Token (External Services Vault)

```bash
az keyvault secret set \
  --vault-name flamoral-prod-ext-kv \
  --name twilio-auth-token \
  --value "YOUR_ACTUAL_TWILIO_AUTH_TOKEN" \
  --description "Twilio authentication token for SMS"
```

---

### 5.4 Sentry DSN (External Services Vault)

```bash
az keyvault secret set \
  --vault-name flamoral-prod-ext-kv \
  --name sentry-dsn \
  --value "https://YOUR_KEY@YOUR_ORG.ingest.sentry.io/YOUR_PROJECT_ID" \
  --description "Sentry DSN for error tracking"
```

---

### 5.5 OpenAI API Key (External Services Vault)

```bash
az keyvault secret set \
  --vault-name flamoral-prod-ext-kv \
  --name openai-api-key \
  --value "sk-YOUR_ACTUAL_OPENAI_API_KEY" \
  --description "OpenAI API key for AI features"
```

---

### 5.6 Firebase Private Key (External Services Vault)

```bash
# Option 1: Store entire service account JSON
az keyvault secret set \
  --vault-name flamoral-prod-ext-kv \
  --name firebase-private-key \
  --file /path/to/firebase-service-account.json \
  --description "Firebase service account credentials"

# Option 2: Store only the private key field
az keyvault secret set \
  --vault-name flamoral-prod-ext-kv \
  --name firebase-private-key \
  --value "-----BEGIN PRIVATE KEY-----
YOUR_ACTUAL_FIREBASE_PRIVATE_KEY_HERE
-----END PRIVATE KEY-----" \
  --description "Firebase service account private key"
```

---

### 5.7 Azure Storage Connection String (Infrastructure Vault)

```bash
# Automatic: Retrieve and update in one command
STORAGE_CONN_STRING=$(az storage account show-connection-string \
  --name flamoralprodzcqqgc \
  --resource-group flamoral-prod-rg \
  --output tsv)

az keyvault secret set \
  --vault-name flamoral-prod-infra-kv \
  --name azure-storage-connection-string \
  --value "$STORAGE_CONN_STRING" \
  --description "Azure Storage connection string for media storage"
```

**Verification:**
```bash
# Verify storage access
az storage container list \
  --connection-string "$(az keyvault secret show \
    --vault-name flamoral-prod-infra-kv \
    --name azure-storage-connection-string \
    --query value -o tsv)" \
  --output table
```

---

### 5.8 Agora App Certificate (External Services Vault)

```bash
az keyvault secret set \
  --vault-name flamoral-prod-ext-kv \
  --name agora-app-certificate \
  --value "YOUR_ACTUAL_AGORA_APP_CERTIFICATE" \
  --description "Agora.io app certificate for video calling"
```

---

## Automated Update Script

Use the provided PowerShell script for batch updates:

**Script Location:** `DatingPlatform/scripts/update-placeholder-secrets.ps1`

**Usage:**

```powershell
# Interactive mode (prompts for each secret)
.\scripts\update-placeholder-secrets.ps1

# Batch mode (reads from environment variables)
.\scripts\update-placeholder-secrets.ps1 -UseBatchMode

# Update specific vaults only
.\scripts\update-placeholder-secrets.ps1 -Vaults payment,external

# Dry run (preview changes without applying)
.\scripts\update-placeholder-secrets.ps1 -DryRun
```

**See script documentation for details.**

---

## Verification & Testing

### 7.1 Verify Secrets Are Updated

```bash
# Check all vaults for remaining placeholders
./scripts/verify-placeholder-secrets.sh
```

**Expected output:**
```
✓ Payment Vault: All secrets updated
✓ External Services Vault: All secrets updated
✓ Infrastructure Vault: All secrets updated
✓ Total placeholders remaining: 0
```

### 7.2 Test Secret Access from Services

```bash
# Test Stripe integration
curl -X POST https://api.flamoral.com/payments/test-stripe \
  -H "Authorization: Bearer <admin-token>"

# Test SendGrid
curl -X POST https://api.flamoral.com/notifications/test-email \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"email":"test@flamoral.com"}'

# Test Storage Upload
curl -X POST https://api.flamoral.com/media/test-upload \
  -H "Authorization: Bearer <admin-token>"
```

### 7.3 Monitor Logs for Errors

```bash
# Check application logs
kubectl logs -n flamoral-prod -l app=payment-service --tail=100

# Check Sentry for errors
# https://sentry.io/organizations/flamoral/issues/

# Check Azure Application Insights
az monitor app-insights metrics show \
  --app flamoral-prod-insights \
  --resource-group flamoral-prod-rg \
  --metric requests/failed
```

---

## Security Best Practices

### 8.1 Key Rotation Schedule

| Secret Type | Rotation Frequency | Automated? |
|-------------|-------------------|------------|
| Stripe keys | 90 days | Manual |
| SendGrid API key | 90 days | Manual |
| Twilio Auth Token | 90 days | Manual |
| OpenAI API key | 90 days | Manual |
| Azure Storage keys | 180 days | Azure auto-rotation |
| JWT secrets | 180 days | Manual |

**Rotation Process:**
1. Generate new key in service provider dashboard
2. Update Key Vault secret (creates new version)
3. Restart affected services to pick up new secret
4. Verify services work with new key
5. Revoke old key in service provider dashboard

### 8.2 Access Control

**Who Can Access Secrets:**
- **Key Vault Administrator**: Can manage secrets and access policies
- **Key Vault Secrets User**: Can read secret values (used by services)
- **Key Vault Secrets Officer**: Can create/update/delete secrets (used by CI/CD)

**Current RBAC Assignments:**
```bash
# View current role assignments
az role assignment list \
  --scope /subscriptions/<sub-id>/resourceGroups/flamoral-prod-rg/providers/Microsoft.KeyVault/vaults/flamoral-prod-payment-kv \
  --output table
```

### 8.3 Audit Logging

All Key Vault operations are logged to **Log Analytics Workspace**.

**View audit logs:**
```bash
# Query Key Vault access logs
az monitor log-analytics query \
  --workspace <workspace-id> \
  --analytics-query "AzureDiagnostics | where ResourceProvider == 'MICROSOFT.KEYVAULT' | where Category == 'AuditEvent' | order by TimeGenerated desc | take 50" \
  --output table
```

**Set up alerts:**
- Alert on unauthorized access attempts (401/403 errors)
- Alert on secret deletion
- Alert on Key Vault configuration changes

### 8.4 Network Security

**Production Vaults:**
- Network ACL: **Deny by default**
- Allowed: Azure Services bypass enabled
- Private Endpoints: Enabled for AKS access

**Verify network configuration:**
```bash
az keyvault show \
  --name flamoral-prod-payment-kv \
  --query "properties.networkAcls" \
  --output json
```

### 8.5 Secret Storage Best Practices

**DO:**
- ✅ Use Key Vault for all secrets (never hardcode)
- ✅ Use separate vaults for different security boundaries
- ✅ Enable soft-delete and purge protection
- ✅ Use RBAC instead of access policies
- ✅ Rotate secrets regularly
- ✅ Monitor access logs

**DON'T:**
- ❌ Store secrets in environment variables
- ❌ Commit secrets to Git
- ❌ Share secrets via email/Slack
- ❌ Use the same secret across environments
- ❌ Disable audit logging

### 8.6 Incident Response

**If a secret is compromised:**

1. **Immediately rotate the key:**
   ```bash
   # Generate new key in service provider
   # Update Key Vault
   az keyvault secret set --vault-name <vault> --name <secret> --value <new-value>

   # Restart services
   kubectl rollout restart deployment -n flamoral-prod <service-name>
   ```

2. **Revoke old key** in service provider dashboard

3. **Check audit logs** for unauthorized access:
   ```bash
   az monitor log-analytics query \
     --workspace <workspace-id> \
     --analytics-query "AzureDiagnostics | where ResourceProvider == 'MICROSOFT.KEYVAULT' | where ResultType == 'Success' | where OperationName == 'SecretGet' | where ResultSignature == '200'"
   ```

4. **Review access policies** and remove unnecessary permissions

5. **Document incident** in security log

---

## Rollback Procedures

### 9.1 Restore Previous Secret Version

Key Vault maintains version history for all secrets.

**List secret versions:**
```bash
az keyvault secret list-versions \
  --vault-name flamoral-prod-payment-kv \
  --name stripe-secret-key \
  --output table
```

**Restore previous version:**
```bash
# Get previous version ID
PREVIOUS_VERSION=$(az keyvault secret list-versions \
  --vault-name flamoral-prod-payment-kv \
  --name stripe-secret-key \
  --query "[1].id" -o tsv | sed 's|.*/||')

# Get value from previous version
OLD_VALUE=$(az keyvault secret show \
  --vault-name flamoral-prod-payment-kv \
  --name stripe-secret-key \
  --version $PREVIOUS_VERSION \
  --query "value" -o tsv)

# Set as current version
az keyvault secret set \
  --vault-name flamoral-prod-payment-kv \
  --name stripe-secret-key \
  --value "$OLD_VALUE"
```

### 9.2 Recover Deleted Secret

If soft-delete is enabled (it is), deleted secrets can be recovered within 90 days.

**List deleted secrets:**
```bash
az keyvault secret list-deleted \
  --vault-name flamoral-prod-payment-kv \
  --output table
```

**Recover deleted secret:**
```bash
az keyvault secret recover \
  --vault-name flamoral-prod-payment-kv \
  --name stripe-secret-key
```

---

## Troubleshooting

### 10.1 Permission Denied Errors

**Error:** `Caller is not authorized to perform action on resource`

**Solution:**
```bash
# Check your current role assignments
az role assignment list --assignee $(az account show --query user.name -o tsv) --all

# Request Key Vault Secrets Officer role
# Contact Azure administrator to grant:
az role assignment create \
  --assignee <your-object-id> \
  --role "Key Vault Secrets Officer" \
  --scope /subscriptions/<sub-id>/resourceGroups/flamoral-prod-rg/providers/Microsoft.KeyVault/vaults/flamoral-prod-payment-kv
```

### 10.2 Secret Not Found

**Error:** `Secret not found: <secret-name>`

**Solution:**
```bash
# List all secrets in vault
az keyvault secret list \
  --vault-name flamoral-prod-payment-kv \
  --output table

# Check if secret was deleted
az keyvault secret list-deleted \
  --vault-name flamoral-prod-payment-kv \
  --output table

# Recover if deleted
az keyvault secret recover \
  --vault-name flamoral-prod-payment-kv \
  --name <secret-name>
```

### 10.3 Services Not Picking Up New Secrets

**Symptom:** Updated secret in Key Vault but service still uses old value

**Solution:**

```bash
# Check if secret was updated
az keyvault secret show \
  --vault-name flamoral-prod-payment-kv \
  --name stripe-secret-key \
  --query "attributes.updated" -o tsv

# Restart pods to reload secrets
kubectl rollout restart deployment -n flamoral-prod payment-service

# Check pod logs for errors
kubectl logs -n flamoral-prod -l app=payment-service --tail=50
```

### 10.4 Network Access Issues

**Error:** `Vault is in a network not accessible`

**Solution:**
```bash
# Check network ACLs
az keyvault show \
  --name flamoral-prod-payment-kv \
  --query "properties.networkAcls"

# If running locally, add your IP temporarily
az keyvault network-rule add \
  --vault-name flamoral-prod-payment-kv \
  --ip-address $(curl -s ifconfig.me)/32

# Remove after completing updates
az keyvault network-rule remove \
  --vault-name flamoral-prod-payment-kv \
  --ip-address $(curl -s ifconfig.me)/32
```

### 10.5 Azure CLI Authentication Issues

**Error:** `Please run 'az login' to setup account`

**Solution:**
```bash
# Login to Azure
az login

# Set correct subscription
az account set --subscription "Flamoral Production"

# Verify
az account show
```

---

## Quick Reference - All Commands

### Complete Update Sequence

```bash
# 1. Azure Storage (auto-generated)
STORAGE_CONN=$(az storage account show-connection-string --name flamoralprodzcqqgc --resource-group flamoral-prod-rg --output tsv)
az keyvault secret set --vault-name flamoral-prod-infra-kv --name azure-storage-connection-string --value "$STORAGE_CONN"

# 2. Stripe keys (replace with actual values)
az keyvault secret set --vault-name flamoral-prod-payment-kv --name stripe-secret-key --value "sk_live_YOUR_KEY"
az keyvault secret set --vault-name flamoral-prod-payment-kv --name stripe-webhook-secret --value "whsec_YOUR_SECRET"

# 3. External services (replace with actual values)
az keyvault secret set --vault-name flamoral-prod-ext-kv --name sendgrid-api-key --value "SG.YOUR_KEY"
az keyvault secret set --vault-name flamoral-prod-ext-kv --name twilio-auth-token --value "YOUR_TOKEN"
az keyvault secret set --vault-name flamoral-prod-ext-kv --name sentry-dsn --value "https://YOUR_DSN"
az keyvault secret set --vault-name flamoral-prod-ext-kv --name openai-api-key --value "sk-YOUR_KEY"

# 4. Verify all placeholders replaced
az keyvault secret list --vault-name flamoral-prod-payment-kv --output table
az keyvault secret list --vault-name flamoral-prod-ext-kv --output table
az keyvault secret list --vault-name flamoral-prod-infra-kv --output table

# 5. Restart services
kubectl rollout restart deployment -n flamoral-prod payment-service
kubectl rollout restart deployment -n flamoral-prod notification-service
```

---

## Support & Escalation

**Documentation:**
- Terraform module: `infrastructure/terraform/modules/service-vaults/`
- Existing scripts: `scripts/populate-prod-keyvault-secrets.ps1`
- Security audit: `docs/SECURITY-AUDIT-REPORT.md`

**Azure Resources:**
- Resource Group: `flamoral-prod-rg`
- Subscription: Check `az account show`
- Log Analytics: `flamoral-prod-logs`

**Contact:**
- DevOps Team: For Key Vault access issues
- Security Team: For key rotation policies
- Development Team: For service integration issues

---

**End of Guide**
