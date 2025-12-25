# FLAMORAL Platform - Secrets Inventory

## Overview

This document catalogs all secrets, API keys, and sensitive configuration required to run the FLAMORAL dating platform. All secrets MUST be stored in Azure Key Vault and accessed via External Secrets Operator in Kubernetes.

**CRITICAL**: Never commit actual secrets to the repository. Use `.env.example` files with placeholder values only.

---

## Secret Categories

### 1. Application Configuration

| Secret Name | Description | Required By | Rotation Policy |
|-------------|-------------|-------------|-----------------|
| `JWT_SECRET` | JWT signing key for authentication tokens | auth-service, api-gateway | 90 days |
| `SESSION_SECRET` | Express session encryption key | api-gateway | 90 days |
| `ENCRYPTION_KEY` | AES-256 key for message encryption | messaging-service | 180 days |
| `COOKIE_SECRET` | Signed cookie encryption | web-app, api-gateway | 90 days |

### 2. Authentication & OAuth Providers

| Secret Name | Description | Required By | Rotation Policy |
|-------------|-------------|-------------|-----------------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | auth-service | On compromise |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | auth-service | On compromise |
| `APPLE_CLIENT_ID` | Apple Sign-In client ID | auth-service | On compromise |
| `APPLE_TEAM_ID` | Apple Developer Team ID | auth-service | On compromise |
| `APPLE_KEY_ID` | Apple Sign-In key ID | auth-service | On compromise |
| `APPLE_PRIVATE_KEY` | Apple Sign-In private key (PEM) | auth-service | Annual |
| `FACEBOOK_APP_ID` | Facebook Login app ID | auth-service | On compromise |
| `FACEBOOK_APP_SECRET` | Facebook Login app secret | auth-service | On compromise |

### 3. Database Credentials

| Secret Name | Description | Required By | Rotation Policy |
|-------------|-------------|-------------|-----------------|
| `POSTGRES_HOST` | PostgreSQL server hostname | All backend services | Static |
| `POSTGRES_PORT` | PostgreSQL port (default: 5432) | All backend services | Static |
| `POSTGRES_USER` | PostgreSQL admin username | All backend services | Annual |
| `POSTGRES_PASSWORD` | PostgreSQL admin password | All backend services | 90 days |
| `POSTGRES_DB` | Primary database name | All backend services | Static |
| `DATABASE_URL` | Full PostgreSQL connection string | All backend services | 90 days |
| `REDIS_HOST` | Redis server hostname | api-gateway, messaging-service | Static |
| `REDIS_PORT` | Redis port (default: 6379) | api-gateway, messaging-service | Static |
| `REDIS_PASSWORD` | Redis AUTH password | api-gateway, messaging-service | 90 days |

### 4. Media Storage (Azure Blob / AWS S3)

| Secret Name | Description | Required By | Rotation Policy |
|-------------|-------------|-------------|-----------------|
| `AZURE_STORAGE_ACCOUNT` | Azure Storage account name | user-service, photo-analysis | Static |
| `AZURE_STORAGE_KEY` | Azure Storage access key | user-service, photo-analysis | 90 days |
| `AZURE_STORAGE_CONNECTION_STRING` | Full Azure Storage connection | user-service, photo-analysis | 90 days |
| `AZURE_CDN_ENDPOINT` | CDN endpoint for media delivery | web-app | Static |
| `AWS_ACCESS_KEY_ID` | AWS access key (if using S3) | user-service | 90 days |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key (if using S3) | user-service | 90 days |
| `AWS_S3_BUCKET` | S3 bucket name | user-service | Static |
| `AWS_REGION` | AWS region | user-service | Static |

### 5. Payment Processing (Stripe)

| Secret Name | Description | Required By | Rotation Policy |
|-------------|-------------|-------------|-----------------|
| `STRIPE_PUBLISHABLE_KEY` | Stripe public key (client-safe) | web-app | On compromise |
| `STRIPE_SECRET_KEY` | Stripe secret API key | payment-service | On compromise |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature secret | payment-service | On rotation |
| `STRIPE_PRICE_ID_BASIC_MONTHLY` | Basic tier monthly price ID | payment-service | Static |
| `STRIPE_PRICE_ID_BASIC_YEARLY` | Basic tier yearly price ID | payment-service | Static |
| `STRIPE_PRICE_ID_PLUS_MONTHLY` | Plus tier monthly price ID | payment-service | Static |
| `STRIPE_PRICE_ID_PLUS_YEARLY` | Plus tier yearly price ID | payment-service | Static |
| `STRIPE_PRICE_ID_PREMIUM_MONTHLY` | Premium tier monthly price ID | payment-service | Static |
| `STRIPE_PRICE_ID_PREMIUM_YEARLY` | Premium tier yearly price ID | payment-service | Static |
| `STRIPE_PRICE_ID_PREMIUM_PLUS_MONTHLY` | Premium+ tier monthly price ID | payment-service | Static |
| `STRIPE_PRICE_ID_PREMIUM_PLUS_YEARLY` | Premium+ tier yearly price ID | payment-service | Static |
| `STRIPE_PRICE_ID_ELITE_MONTHLY` | Elite tier monthly price ID | payment-service | Static |
| `STRIPE_PRICE_ID_ELITE_YEARLY` | Elite tier yearly price ID | payment-service | Static |

### 6. AI Service Providers

| Secret Name | Description | Required By | Rotation Policy |
|-------------|-------------|-------------|-----------------|
| `OPENAI_API_KEY` | OpenAI GPT API key | content-generator, dating-coach, nlp-service | 90 days |
| `OPENAI_ORG_ID` | OpenAI organization ID | AI services | Static |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key | dating-coach-service | 90 days |
| `HUGGINGFACE_API_KEY` | HuggingFace inference API | nlp-service, photo-analysis | 90 days |
| `AZURE_COGNITIVE_KEY` | Azure Cognitive Services key | photo-analysis, fraud-detection | 90 days |
| `AZURE_COGNITIVE_ENDPOINT` | Azure Cognitive Services endpoint | photo-analysis, fraud-detection | Static |
| `GOOGLE_CLOUD_VISION_KEY` | Google Cloud Vision API | photo-analysis | 90 days |

### 7. Video/Communication Providers

| Secret Name | Description | Required By | Rotation Policy |
|-------------|-------------|-------------|-----------------|
| `TWILIO_ACCOUNT_SID` | Twilio account SID | video-service, sms-service | Static |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | video-service, sms-service | 90 days |
| `TWILIO_API_KEY` | Twilio API key | video-service | 90 days |
| `TWILIO_API_SECRET` | Twilio API secret | video-service | 90 days |
| `AGORA_APP_ID` | Agora.io app ID | video-service | Static |
| `AGORA_APP_CERTIFICATE` | Agora.io certificate | video-service | Annual |
| `SENDGRID_API_KEY` | SendGrid email API key | notification-service | 90 days |
| `SENDGRID_FROM_EMAIL` | SendGrid verified sender | notification-service | Static |

### 8. Observability & Monitoring

| Secret Name | Description | Required By | Rotation Policy |
|-------------|-------------|-------------|-----------------|
| `DATADOG_API_KEY` | Datadog API key | All services | Annual |
| `DATADOG_APP_KEY` | Datadog application key | All services | Annual |
| `SENTRY_DSN` | Sentry error tracking DSN | All services | Static |
| `PROMETHEUS_REMOTE_WRITE_URL` | Prometheus remote write endpoint | metrics-collector | Static |
| `GRAFANA_API_KEY` | Grafana API key | dashboard-service | Annual |
| `PAGERDUTY_INTEGRATION_KEY` | PagerDuty routing key | alerting-service | Static |
| `SLACK_WEBHOOK_URL` | Slack notifications webhook | alerting-service | On compromise |

### 9. Infrastructure & Deployment

| Secret Name | Description | Required By | Rotation Policy |
|-------------|-------------|-------------|-----------------|
| `AZURE_CLIENT_ID` | Azure service principal client ID | CI/CD, External Secrets | Static |
| `AZURE_CLIENT_SECRET` | Azure service principal secret | CI/CD, External Secrets | 90 days |
| `AZURE_TENANT_ID` | Azure AD tenant ID | CI/CD, External Secrets | Static |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID | CI/CD | Static |
| `ACR_USERNAME` | Azure Container Registry username | CI/CD | Static |
| `ACR_PASSWORD` | Azure Container Registry password | CI/CD | 90 days |
| `KUBECONFIG` | Kubernetes cluster config | CI/CD | On rotation |

---

## Azure Key Vault Configuration

### Key Vault Name
- **Production**: `flamoral-prod-kv`
- **Staging**: `flamoral-staging-kv`
- **Development**: `flamoral-dev-kv`

### Access Policies

```yaml
# External Secrets Operator service principal
- objectId: <external-secrets-sp-object-id>
  permissions:
    secrets: [get, list]

# CI/CD pipeline service principal
- objectId: <cicd-sp-object-id>
  permissions:
    secrets: [get, list, set, delete]

# Developer access (read-only staging/dev)
- objectId: <developer-group-object-id>
  permissions:
    secrets: [get, list]
```

### External Secrets Operator Configuration

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: azure-key-vault
spec:
  provider:
    azurekv:
      authType: ManagedIdentity
      vaultUrl: "https://flamoral-prod-kv.vault.azure.net"
---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: flamoral-secrets
  namespace: flamoral-prod
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: azure-key-vault
    kind: ClusterSecretStore
  target:
    name: flamoral-app-secrets
  data:
    - secretKey: JWT_SECRET
      remoteRef:
        key: jwt-secret
    - secretKey: DATABASE_URL
      remoteRef:
        key: database-url
    # ... additional mappings
```

---

## Secret Rotation Procedures

### Automated Rotation (Recommended)
1. Use Azure Key Vault's automatic rotation for supported secret types
2. Configure rotation policy in Key Vault
3. External Secrets Operator will pick up new values within refresh interval

### Manual Rotation
1. Generate new secret value
2. Update Azure Key Vault secret (creates new version)
3. Trigger External Secrets sync: `kubectl annotate es flamoral-secrets force-sync=$(date +%s) --overwrite`
4. Perform rolling restart of affected services
5. Verify application health
6. Disable old secret version in Key Vault

---

## Environment-Specific Notes

### Production
- All secrets MUST be in Azure Key Vault
- No `.env` files in production containers
- Secrets injected via External Secrets Operator
- Audit logging enabled for all secret access

### Staging
- Mirror production secret structure
- Use separate Key Vault instance
- Test secret rotation here first

### Development
- Local `.env` files allowed (gitignored)
- Use `.env.example` as template
- Never use production secrets locally

---

## Compliance Requirements

### GDPR
- Encryption keys must be rotated every 180 days
- Access logs retained for 2 years
- Data subject access requests require key access audit

### PCI-DSS (Stripe Integration)
- Stripe keys isolated to payment-service only
- No card data stored in our systems
- Quarterly access review required

### SOC 2
- Secret access logged and monitored
- Rotation policies enforced via automation
- Separation of duties for secret management

---

## Emergency Procedures

### Suspected Secret Compromise
1. Immediately rotate affected secret in Key Vault
2. Trigger emergency sync to Kubernetes
3. Force rolling restart of affected services
4. Review access logs for unauthorized use
5. File security incident report
6. Notify affected users if required

### Contact
- Security Team: security@flamoral.com
- On-Call: PagerDuty escalation policy
- Key Vault Admin: platform-team@flamoral.com
