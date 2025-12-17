# Azure Key Vault Inventory - Flamoral Production

Last Updated: 2025-12-12

## Production Key Vaults

| Vault Name | Resource Group | Location | Purpose |
|------------|----------------|----------|---------|
| `flamoral-prod-auth-kv` | flamoral-prod-rg | westus2 | Authentication & JWT secrets |
| `flamoral-prod-payment-kv` | flamoral-prod-rg | westus2 | Payment provider API keys |
| `flamoral-prod-data-kv` | flamoral-prod-rg | westus2 | Database credentials |
| `flamoral-prod-ext-kv` | flamoral-prod-rg | westus2 | External service API keys |
| `flamoral-prod-infra-kv` | flamoral-prod-rg | westus2 | Infrastructure & encryption keys |

## Security Configuration (All Vaults)

| Setting | Status |
|---------|--------|
| Soft Delete | Enabled |
| Purge Protection | Enabled |
| RBAC Authorization | Enabled |

---

## Secrets by Vault

### flamoral-prod-auth-kv

| Secret Name | Purpose | Rotation |
|-------------|---------|----------|
| `jwt-secret` | JWT signing key | 90 days |
| `jwt-access-secret` | Access token signing | 90 days |
| `jwt-refresh-secret` | Refresh token signing | 90 days |
| `session-secret` | Session encryption | 90 days |

### flamoral-prod-payment-kv

| Secret Name | Purpose | Status | Rotation |
|-------------|---------|--------|----------|
| `stripe-secret-key` | Stripe API key (sk_live_*) | Active | 180 days |
| `stripe-webhook-secret` | Stripe webhook verification | Active | 180 days |
| `flutterwave-secret-key` | Flutterwave API key | **PENDING OWNER INJECTION** | 180 days |
| `flutterwave-webhook-secret` | Flutterwave webhook verification | **PENDING OWNER INJECTION** | 180 days |
| `paystack-secret-key` | Paystack API key (sk_live_*) | **PENDING OWNER INJECTION** | 180 days |
| `paystack-webhook-secret` | Paystack webhook verification | **PENDING OWNER INJECTION** | 180 days |

### flamoral-prod-data-kv

| Secret Name | Purpose | Rotation |
|-------------|---------|----------|
| `postgres-password` | PostgreSQL database password | 90 days |
| `redis-password` | Redis cache password | 90 days |

### flamoral-prod-ext-kv

| Secret Name | Purpose | Status | Rotation |
|-------------|---------|--------|----------|
| `sendgrid-api-key` | SendGrid email API | PLACEHOLDER | 180 days |
| `twilio-auth-token` | Twilio SMS/voice API | PLACEHOLDER | 180 days |
| `sentry-dsn` | Sentry error tracking | PLACEHOLDER | N/A |
| `openai-api-key` | OpenAI API | PLACEHOLDER | 180 days |

### flamoral-prod-infra-kv

| Secret Name | Purpose | Rotation |
|-------------|---------|----------|
| `service-api-key` | Internal service authentication | 90 days |
| `encryption-key` | Data encryption key | 180 days |

---

## Owner Action Required

The following secrets require manual injection by the platform owner:

### Payment Secrets (flamoral-prod-payment-kv)

1. **Flutterwave**
   - Dashboard: https://dashboard.flutterwave.com
   - Navigate: Settings > API Keys
   - Copy: Secret Key and Webhook Secret
   - Inject via Azure Portal or CLI (never via chat)

2. **Paystack**
   - Dashboard: https://dashboard.paystack.com
   - Navigate: Settings > API Keys & Webhooks
   - Copy: Secret Key and Webhook Secret
   - Inject via Azure Portal or CLI (never via chat)

### External Service Secrets (flamoral-prod-ext-kv)

All secrets in this vault contain placeholder values and need real API keys:
- SendGrid: https://app.sendgrid.com/settings/api_keys
- Twilio: https://console.twilio.com
- Sentry: https://sentry.io/settings/projects/
- OpenAI: https://platform.openai.com/api-keys

---

## CLI Commands for Secret Injection

```bash
# NEVER run these with actual values visible in history
# Use secure input methods

# Option 1: Interactive (recommended)
az keyvault secret set --vault-name flamoral-prod-payment-kv --name "flutterwave-secret-key"

# Option 2: From file
az keyvault secret set --vault-name flamoral-prod-payment-kv --name "flutterwave-secret-key" --file /path/to/secret.txt

# Option 3: Azure Portal
# Navigate to: portal.azure.com > Key Vaults > flamoral-prod-payment-kv > Secrets
```

---

## Verification Commands

```bash
# List all secrets in a vault (names only)
az keyvault secret list --vault-name flamoral-prod-payment-kv --query "[].name" -o tsv

# Check if a secret exists
az keyvault secret show --vault-name flamoral-prod-payment-kv --name "stripe-secret-key" --query "name" -o tsv

# Verify secret is not placeholder (returns first 10 chars)
az keyvault secret show --vault-name flamoral-prod-payment-kv --name "stripe-secret-key" --query "value" -o tsv | cut -c1-10
```
