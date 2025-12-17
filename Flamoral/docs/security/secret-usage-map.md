# Secret Usage Map - Flamoral Platform

Last Updated: 2025-12-12

## Overview

This document maps secrets to their consumers across the Flamoral platform.

---

## Payment Secrets Flow

```
flamoral-prod-payment-kv
    │
    ├── stripe-secret-key
    │   └── Consumer: payment-service
    │       └── File: backend/services/payment-service/src/config/stripe.ts
    │       └── Env: STRIPE_SECRET_KEY
    │
    ├── stripe-webhook-secret
    │   └── Consumer: api-gateway
    │       └── File: backend/services/api-gateway/src/controllers/payment.controller.ts
    │       └── Env: STRIPE_WEBHOOK_SECRET
    │
    ├── flutterwave-secret-key
    │   └── Consumer: payment-service
    │       └── File: backend/services/payment-service/src/domain/services/flutterwave-webhook.service.ts:234
    │       └── Env: FLUTTERWAVE_SECRET_KEY
    │
    ├── flutterwave-webhook-secret
    │   └── Consumer: api-gateway
    │       └── File: backend/services/api-gateway/src/controllers/payment.controller.ts:323
    │       └── Env: FLUTTERWAVE_WEBHOOK_SECRET
    │
    ├── paystack-secret-key
    │   └── Consumer: payment-service
    │       └── File: backend/services/payment-service/src/domain/services/paystack-webhook.service.ts:223
    │       └── Env: PAYSTACK_SECRET_KEY
    │
    └── paystack-webhook-secret
        └── Consumer: api-gateway
            └── File: backend/services/api-gateway/src/controllers/payment.controller.ts:312
            └── Env: PAYSTACK_WEBHOOK_SECRET
```

---

## Authentication Secrets Flow

```
flamoral-prod-auth-kv
    │
    ├── jwt-secret
    │   └── Consumer: auth-service
    │       └── Env: JWT_SECRET
    │
    ├── jwt-access-secret
    │   └── Consumer: auth-service, api-gateway
    │       └── Env: JWT_ACCESS_SECRET
    │       └── Purpose: Sign/verify access tokens
    │
    ├── jwt-refresh-secret
    │   └── Consumer: auth-service
    │       └── Env: JWT_REFRESH_SECRET
    │       └── Purpose: Sign/verify refresh tokens
    │
    └── session-secret
        └── Consumer: api-gateway
            └── Env: SESSION_SECRET
            └── Purpose: Encrypt session cookies
```

---

## Database Secrets Flow

```
flamoral-prod-data-kv
    │
    ├── postgres-password
    │   └── Consumers: ALL backend services
    │       └── Env: DB_PASSWORD
    │       └── Connection: flamoral-prod-postgres.postgres.database.azure.com
    │
    └── redis-password
        └── Consumers: api-gateway, auth-service, matching-service
            └── Env: REDIS_PASSWORD
            └── Connection: flamoral-prod-redis.redis.cache.windows.net:6380
```

---

## External Service Secrets Flow

```
flamoral-prod-ext-kv
    │
    ├── sendgrid-api-key
    │   └── Consumer: notification-service
    │       └── Env: SENDGRID_API_KEY
    │       └── Usage: Email notifications
    │
    ├── twilio-auth-token
    │   └── Consumer: notification-service
    │       └── Env: TWILIO_AUTH_TOKEN
    │       └── Usage: SMS verification, voice calls
    │
    ├── sentry-dsn
    │   └── Consumers: ALL services
    │       └── Env: SENTRY_DSN
    │       └── Usage: Error tracking
    │
    └── openai-api-key
        └── Consumer: ai-services
            └── Env: OPENAI_API_KEY
            └── Usage: AI matching, content moderation
```

---

## Infrastructure Secrets Flow

```
flamoral-prod-infra-kv
    │
    ├── service-api-key
    │   └── Consumers: ALL services (internal communication)
    │       └── Env: INTERNAL_SERVICE_KEY
    │       └── Header: X-Internal-Service-Key
    │
    └── encryption-key
        └── Consumer: api-gateway, data-services
            └── Env: ENCRYPTION_KEY
            └── Usage: At-rest encryption for sensitive fields
```

---

## Kubernetes Secret Injection

Secrets are injected into pods via:

1. **External Secrets Operator** (Recommended)
   - File: `infrastructure/kubernetes/secrets/service-vault-providers.yaml`
   - Syncs Key Vault secrets to Kubernetes secrets

2. **CSI Secret Store Driver** (Alternative)
   - Mounts secrets directly into pod filesystem
   - No Kubernetes secret objects created

3. **Environment Variables** (Development only)
   - `.env` files for local development
   - Docker Compose environment injection

---

## Secret Verification Script

```bash
#!/bin/bash
# Verify all required secrets exist

VAULTS=("flamoral-prod-auth-kv" "flamoral-prod-payment-kv" "flamoral-prod-data-kv" "flamoral-prod-ext-kv" "flamoral-prod-infra-kv")

for vault in "${VAULTS[@]}"; do
  echo "=== $vault ==="
  az keyvault secret list --vault-name $vault --query "[].name" -o tsv
  echo ""
done
```

---

## CI/CD Secret Access

Pipelines access secrets via:

1. **Azure DevOps Variable Groups** linked to Key Vault
2. **GitHub Actions** with `AZURE_CREDENTIALS` secret
3. **Azure Service Connection** with managed identity

Never store secrets directly in pipeline YAML files.
