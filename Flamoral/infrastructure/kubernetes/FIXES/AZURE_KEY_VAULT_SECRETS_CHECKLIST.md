# Azure Key Vault Secrets Checklist for Flamoral Production

## Overview
This document lists all secrets that MUST be configured in Azure Key Vault for Flamoral to function correctly.

**Key Vault Name:** `flamoral-prod-kv`

---

## Critical Database Secrets (MUST CONFIGURE FIRST)

### PostgreSQL Database

| Key Vault Secret Name | Example Value | Notes |
|----------------------|---------------|-------|
| `db-host` | `flamoral-prod-postgres.postgres.database.azure.com` | Azure PostgreSQL hostname |
| `db-name` | `flamoral` | Database name (NOT flamoral_prod) |
| `db-user` | `flamoraladmin` | Username WITHOUT @hostname suffix |
| `db-password` | `<generate-strong-password>` | Min 16 chars, use letters+numbers+symbols |
| `db-read-replica-1-url` | `postgresql://flamoraladmin:<password>@replica1.postgres.database.azure.com:5432/flamoral?sslmode=require` | Optional: Read replica connection string |
| `db-read-replica-2-url` | `postgresql://flamoraladmin:<password>@replica2.postgres.database.azure.com:5432/flamoral?sslmode=require` | Optional: Read replica connection string |

**CRITICAL NOTES:**
- Database user should be `flamoraladmin` (NOT `flamoral_admin@flamoral-prod-postgres`)
- Database name should be `flamoral` (NOT `flamoral_prod`)
- Azure will automatically append @hostname during connection

### MongoDB (If using CosmosDB for MongoDB)

| Key Vault Secret Name | Example Value | Notes |
|----------------------|---------------|-------|
| `mongodb-uri` | `mongodb://flamoral:<password>@flamoral-prod-cosmos.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb` | Full connection string with credentials |

---

## Critical Cache/Queue Secrets

### Redis Cache

| Key Vault Secret Name | Example Value | Notes |
|----------------------|---------------|-------|
| `redis-host` | `flamoral-prod-redis.redis.cache.windows.net` | Azure Redis hostname |
| `redis-password` | `<from-azure-redis-access-keys>` | Primary access key from Azure Portal |

**CRITICAL NOTES:**
- Port 6380 is configured in the template (SSL-enabled port)
- Connection string will be: `rediss://:<password>@<host>:6380`

### Azure Service Bus

| Key Vault Secret Name | Example Value | Notes |
|----------------------|---------------|-------|
| `azure-servicebus-connection-string` | `Endpoint=sb://flamoral-prod-sb.servicebus.windows.net/;SharedAccessKeyName=...` | Full connection string from Azure Portal |

---

## Authentication & Security Secrets

### JWT Secrets

| Key Vault Secret Name | Example Value | Notes |
|----------------------|---------------|-------|
| `jwt-secret` | `<generate-256-bit-random-string>` | Base JWT secret |
| `jwt-access-secret` | `<generate-256-bit-random-string>` | Access token signing key |
| `jwt-refresh-secret` | `<generate-256-bit-random-string>` | Refresh token signing key |
| `session-secret` | `<generate-256-bit-random-string>` | Session encryption key |
| `service-api-key` | `<generate-256-bit-random-string>` | Inter-service authentication |

**Generate Random Secrets:**
```bash
# Generate secure random secrets (run for each secret needed)
openssl rand -base64 32
```

### OAuth Provider Secrets

| Key Vault Secret Name | Example Value | Notes |
|----------------------|---------------|-------|
| `google-client-secret` | `GOCSPX-...` | From Google Cloud Console |
| `facebook-app-secret` | `<from-facebook-developers>` | From Facebook Developer Portal |
| `apple-private-key` | `-----BEGIN PRIVATE KEY-----\n...` | From Apple Developer Portal |

---

## Payment Gateway Secrets

| Key Vault Secret Name | Example Value | Notes |
|----------------------|---------------|-------|
| `stripe-secret-key` | `sk_live_...` | Stripe live secret key |
| `stripe-webhook-secret` | `whsec_...` | Stripe webhook signing secret |

**IMPORTANT:** Use test keys (`sk_test_...`) for staging environment.

---

## Communication Service Secrets

### Email (SendGrid)

| Key Vault Secret Name | Example Value | Notes |
|----------------------|---------------|-------|
| `sendgrid-api-key` | `SG.` | From SendGrid dashboard |

### SMS (Twilio)

| Key Vault Secret Name | Example Value | Notes |
|----------------------|---------------|-------|
| `twilio-auth-token` | `<from-twilio-console>` | Account auth token |

---

## Azure Services Secrets

### Azure Storage

| Key Vault Secret Name | Example Value | Notes |
|----------------------|---------------|-------|
| `azure-storage-key` | `<from-storage-account-access-keys>` | Primary access key |
| `azure-storage-connection-string` | `DefaultEndpointsProtocol=https;AccountName=flamoralprodst;AccountKey=...` | Full connection string |

### Azure Cognitive Services

| Key Vault Secret Name | Example Value | Notes |
|----------------------|---------------|-------|
| `azure-face-api-key` | `<from-cognitive-services>` | Face verification API key |
| `azure-content-moderator-key` | `<from-cognitive-services>` | Content moderation API key |
| `azure-computer-vision-key` | `<from-cognitive-services>` | Computer vision API key |

---

## Real-time Communication Secrets

### Agora (Video/Voice Calling)

| Key Vault Secret Name | Example Value | Notes |
|----------------------|---------------|-------|
| `agora-app-certificate` | `<from-agora-console>` | App certificate |
| `agora-customer-key` | `<from-agora-console>` | RESTful API key |
| `agora-customer-secret` | `<from-agora-console>` | RESTful API secret |

### Firebase (Push Notifications)

| Key Vault Secret Name | Example Value | Notes |
|----------------------|---------------|-------|
| `firebase-private-key` | `-----BEGIN PRIVATE KEY-----\n...` | Service account private key (JSON) |
| `fcm-server-key` | `<from-firebase-console>` | FCM server key |

---

## Monitoring & Analytics Secrets

### Error Tracking (Sentry)

| Key Vault Secret Name | Example Value | Notes |
|----------------------|---------------|-------|
| `sentry-dsn` | `https://<key>@<org>.ingest.sentry.io/<project>` | Sentry DSN from project settings |

### Application Insights

| Key Vault Secret Name | Example Value | Notes |
|----------------------|---------------|-------|
| `application-insights-connection-string` | `InstrumentationKey=...;IngestionEndpoint=...` | From Azure Portal |
| `application-insights-instrumentation-key` | `<guid>` | Legacy instrumentation key |

### Analytics Services

| Key Vault Secret Name | Example Value | Notes |
|----------------------|---------------|-------|
| `mixpanel-token` | `<from-mixpanel>` | Project token |
| `segment-write-key` | `<from-segment>` | Write key |

---

## Search & Location Services

### Elasticsearch

| Key Vault Secret Name | Example Value | Notes |
|----------------------|---------------|-------|
| `elasticsearch-password` | `<elastic-user-password>` | Password for elastic user |

### Geolocation Services

| Key Vault Secret Name | Example Value | Notes |
|----------------------|---------------|-------|
| `google-maps-api-key` | `AIza...` | Google Maps Platform API key |
| `mapbox-access-token` | `pk.` | Mapbox access token |

---

## AI/ML Services

| Key Vault Secret Name | Example Value | Notes |
|----------------------|---------------|-------|
| `openai-api-key` | `sk-...` | OpenAI API key for GPT models |
| `ai-model-api-key` | `<custom-ml-service-key>` | Custom AI service key |

---

## Support & Alerting Services

| Key Vault Secret Name | Example Value | Notes |
|----------------------|---------------|-------|
| `zendesk-api-token` | `<from-zendesk>` | API token for support integration |
| `pagerduty-integration-key` | `<from-pagerduty>` | Integration key for alerts |
| `slack-webhook-url` | `https://hooks.slack.com/services/...` | Webhook URL for notifications |

---

## Verification Commands

### List All Secrets in Key Vault

```bash
az keyvault secret list \
  --vault-name flamoral-prod-kv \
  --query "[].{Name:name, Enabled:attributes.enabled}" \
  -o table
```

### Check Specific Secret (Use Carefully)

```bash
# Get secret value (DO NOT run in production without proper access controls)
az keyvault secret show \
  --vault-name flamoral-prod-kv \
  --name db-host \
  --query "value" \
  -o tsv
```

### Set/Update Secret

```bash
# Set a secret value
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name <secret-name> \
  --value "<secret-value>"
```

### Verify Secret Access from AKS

```bash
# Verify Managed Identity has access
az keyvault set-policy \
  --name flamoral-prod-kv \
  --object-id <managed-identity-object-id> \
  --secret-permissions get list
```

---

## Priority Order for Configuration

### Phase 1: Critical Infrastructure (Configure These First)
1. Database secrets (db-host, db-name, db-user, db-password)
2. Redis secrets (redis-host, redis-password)
3. JWT secrets (jwt-secret, jwt-access-secret, jwt-refresh-secret)
4. Session secret

### Phase 2: Core Services
5. Azure Service Bus connection string
6. Azure Storage (key and connection string)
7. SendGrid API key
8. OAuth secrets (Google, Facebook, Apple)

### Phase 3: Payment & Compliance
9. Stripe secrets (secret-key, webhook-secret)
10. Twilio auth token

### Phase 4: Enhanced Features
11. Agora secrets (for video/voice)
12. Firebase secrets (for push notifications)
13. Azure Cognitive Services keys
14. OpenAI API key

### Phase 5: Monitoring & Analytics
15. Sentry DSN
16. Application Insights connection string
17. Analytics service tokens
18. Alerting service keys

---

## Security Best Practices

### Secret Rotation Schedule

| Secret Type | Rotation Frequency | Priority |
|-------------|-------------------|----------|
| Database passwords | 90 days | HIGH |
| JWT secrets | 180 days | HIGH |
| API keys (payment) | 180 days | HIGH |
| OAuth secrets | As needed | MEDIUM |
| Service API keys | 90 days | MEDIUM |
| Monitoring tokens | 365 days | LOW |

### Access Control

```bash
# Grant Managed Identity access to Key Vault
az keyvault set-policy \
  --name flamoral-prod-kv \
  --object-id <aks-managed-identity-object-id> \
  --secret-permissions get list

# Revoke access when needed
az keyvault delete-policy \
  --name flamoral-prod-kv \
  --object-id <object-id>
```

### Secret Naming Convention

- Use lowercase with hyphens: `db-password` (NOT `DB_PASSWORD` or `db_password`)
- Match External Secrets `remoteRef.key` exactly
- Document purpose and rotation schedule in Key Vault tags

---

## Validation Checklist

Before deploying to production, verify:

- [ ] All Phase 1 secrets configured
- [ ] All Phase 2 secrets configured
- [ ] Secret values do NOT contain placeholder text
- [ ] Database user is `flamoraladmin` (no @hostname)
- [ ] Database name is `flamoral` (not flamoral_prod)
- [ ] Redis password is from Azure Redis access keys
- [ ] JWT secrets are 256-bit random strings
- [ ] Stripe uses live keys (sk_live_...)
- [ ] All OAuth secrets are from production apps
- [ ] Managed Identity has Key Vault access
- [ ] External Secrets Operator is installed
- [ ] SecretStore configured correctly

---

## Troubleshooting

### Issue: "Secret not found in Key Vault"

```bash
# List all secrets to find the correct name
az keyvault secret list --vault-name flamoral-prod-kv --query "[].name" -o table

# Check if secret exists
az keyvault secret show --vault-name flamoral-prod-kv --name <secret-name>
```

### Issue: "Access denied to Key Vault"

```bash
# Check access policies
az keyvault show --name flamoral-prod-kv --query "properties.accessPolicies" -o table

# Grant access to Managed Identity
az keyvault set-policy --name flamoral-prod-kv \
  --object-id <managed-identity-object-id> \
  --secret-permissions get list
```

### Issue: "ExternalSecret sync failed"

```bash
# Check External Secret status
kubectl describe externalsecret flamoral-database-secrets -n flamoral

# Check if SecretStore is healthy
kubectl get secretstore azure-keyvault-store -n flamoral

# Verify the secret name matches exactly (case-sensitive)
```

---

**Last Updated:** 2025-12-15
**Version:** 1.0
**Maintained By:** DevOps Team
