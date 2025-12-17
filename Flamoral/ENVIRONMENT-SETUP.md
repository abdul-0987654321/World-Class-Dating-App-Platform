# Flamoral Platform - Environment Configuration Guide

## Overview

This document provides comprehensive guidance for setting up environment configurations for the Flamoral dating platform across all environments (development, staging, production).

## Table of Contents

1. [Environment Files Structure](#environment-files-structure)
2. [Required Environment Variables](#required-environment-variables)
3. [Service-Specific Configuration](#service-specific-configuration)
4. [Kubernetes Configuration](#kubernetes-configuration)
5. [Azure Key Vault Integration](#azure-key-vault-integration)
6. [Validation & Testing](#validation--testing)
7. [Security Best Practices](#security-best-practices)

---

## Environment Files Structure

### Root Level
- `.env.example` - Template for all environments
- `.env.dev.example` - Development environment template
- `.env.staging.example` - Staging environment template
- `.env.prod.example` - Production environment template

### Backend Services
Each service in `backend/services/` has:
- `.env.example` - Development template
- `.env.production` - Production configuration
- `.env.test` - Test environment configuration

### Web Application
Located in `apps/web-app/`:
- `.env.example` - Development template
- `.env.production` - Production configuration
- `.env.production.example` - Production template with documentation
- `.env.staging` - Staging configuration
- `.env.development` - Local development configuration

### Infrastructure
Located in `infrastructure/config/`:
- `.env.development.template` - Development infrastructure
- `.env.staging.template` - Staging infrastructure
- `.env.production.template` - Production infrastructure (comprehensive)

---

## Required Environment Variables

### 1. Core Service Configuration

All services require:

```bash
# Service Identity
SERVICE_NAME=service-name
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Logging
LOG_LEVEL=warn
LOG_FORMAT=json
```

### 2. Database Configuration

#### PostgreSQL (Azure Database for PostgreSQL)
```bash
DB_HOST=flamoral-prod-postgres.postgres.database.azure.com
DB_PORT=5432
DB_NAME=flamoral_prod
DB_USER=flamoral_admin@flamoral-prod-postgres
DB_PASSWORD=*** # From Azure Key Vault
DB_SSL=true
DB_POOL_MIN=10
DB_POOL_MAX=50
DATABASE_URL=*** # From Azure Key Vault
```

#### MongoDB/Cosmos DB
```bash
MONGODB_URI=*** # From Azure Key Vault
MONGODB_DB=flamoral_prod
MONGODB_SSL=true
```

#### Redis (Azure Cache for Redis)
```bash
REDIS_HOST=flamoral-prod-redis.redis.cache.windows.net
REDIS_PORT=6380
REDIS_PASSWORD=*** # From Azure Key Vault
REDIS_DB=0
REDIS_TLS=true
```

### 3. Authentication & Security

#### JWT Configuration
```bash
JWT_ACCESS_SECRET=*** # From Azure Key Vault (Min 64 chars)
JWT_REFRESH_SECRET=*** # From Azure Key Vault (Min 64 chars)
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
JWT_ISSUER=flamoral-production
JWT_AUDIENCE=flamoral-app
```

#### Service-to-Service Authentication
```bash
SERVICE_API_KEY=*** # From Azure Key Vault (Min 64 chars)
```

#### Session Configuration
```bash
SESSION_SECRET=*** # From Azure Key Vault (Min 32 chars)
SESSION_MAX_AGE=86400000
SESSION_SECURE=true
SESSION_HTTP_ONLY=true
```

### 4. External Services

#### Stripe (Payment Processing)
```bash
STRIPE_SECRET_KEY=*** # sk_live_... (From Azure Key Vault)
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=*** # whsec_... (From Azure Key Vault)
STRIPE_API_VERSION=2024-12-18.acacia
```

#### SendGrid (Email)
```bash
SENDGRID_API_KEY=*** # From Azure Key Vault
SENDGRID_FROM_EMAIL=noreply@flamoral.com
SENDGRID_FROM_NAME=Flamoral
```

#### Twilio (SMS)
```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=*** # From Azure Key Vault
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### Azure Storage
```bash
AZURE_STORAGE_ACCOUNT=flamoralprodst
AZURE_STORAGE_KEY=*** # From Azure Key Vault
AZURE_STORAGE_CONNECTION_STRING=*** # From Azure Key Vault
```

#### Azure Cognitive Services
```bash
AZURE_FACE_API_KEY=*** # From Azure Key Vault
AZURE_FACE_API_ENDPOINT=https://eastus.api.cognitive.microsoft.com
AZURE_CONTENT_MODERATOR_KEY=*** # From Azure Key Vault
AZURE_CONTENT_MODERATOR_ENDPOINT=https://eastus.api.cognitive.microsoft.com
```

#### Firebase (Push Notifications)
```bash
FIREBASE_PROJECT_ID=flamoral-production
FIREBASE_PRIVATE_KEY=*** # From Azure Key Vault (JSON)
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@flamoral-production.iam.gserviceaccount.com
FCM_SERVER_KEY=*** # From Azure Key Vault
```

### 5. Monitoring & Observability

```bash
# Sentry
SENTRY_DSN=*** # From Azure Key Vault
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1

# Application Insights
APPLICATION_INSIGHTS_ENABLED=true
APPLICATION_INSIGHTS_CONNECTION_STRING=*** # From Azure Key Vault
APPLICATION_INSIGHTS_INSTRUMENTATION_KEY=*** # From Azure Key Vault

# Prometheus
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9090

# Jaeger
JAEGER_ENABLED=true
JAEGER_AGENT_HOST=jaeger-agent.flamoral-prod.svc.cluster.local
JAEGER_AGENT_PORT=6831
```

---

## Service-Specific Configuration

### API Gateway (`api-gateway`)
- Port: 3000
- Requires: All service URLs, JWT secrets, CORS configuration
- Special: WebSocket configuration, rate limiting, circuit breaker

### Auth Service (`auth-service`)
- Port: 3001
- Requires: JWT secrets, OAuth providers, email/SMS services
- Special: Password policies, MFA configuration, session management

### User Service (`user-service`)
- Port: 3002
- Requires: Database, Azure Storage, Face API
- Special: Photo verification, TOTP encryption

### Matching Service (`matching-service`)
- Port: 3009
- Requires: Database, Redis, AI/ML services
- Special: ML model configuration, matching algorithms

### Messaging Service (`messaging-service`)
- Port: 3003
- Requires: MongoDB/Cosmos DB, Redis, Azure Storage
- Special: Message encryption, WebSocket events

### Payment Service (`payment-service`)
- Port: 3005
- Requires: Database, Stripe (LIVE keys)
- Special: PCI compliance, audit logging

### Media Service (`media-service`)
- Port: 3006
- Requires: Database, Azure Storage, Cognitive Services
- Special: Image processing, content moderation

### Notification Service (`notification-service`)
- Port: 3012
- Requires: Database, SendGrid, Twilio, Firebase
- Special: Notification batching, rate limiting

### Moderation Service (`moderation-service`)
- Port: 3008
- Requires: Database, Azure Cognitive Services, AI services
- Special: PhotoDNA, content thresholds

### Analytics Service (`analytics-service`)
- Port: 3007
- Requires: Database, MongoDB, third-party analytics
- Special: Event tracking, data retention

### Realtime Service (`realtime-service`)
- Port: 8081
- Requires: Redis, WebSocket configuration
- Special: Presence tracking, typing indicators

---

## Kubernetes Configuration

### ConfigMaps

Location: `infrastructure/kubernetes/base/configmap.yaml`

Contains non-sensitive configuration:
- Service URLs (Kubernetes service discovery)
- Feature flags
- Public endpoints
- Azure service endpoints
- Queue/topic names
- Health check paths

### Secrets

Location: `infrastructure/kubernetes/base/secrets.yaml`

Contains sensitive data (injected from Azure Key Vault):
- Database credentials
- API keys
- JWT secrets
- Service-to-service authentication tokens
- Third-party service credentials

### External Secrets Operator

For production, use External Secrets Operator to automatically sync secrets from Azure Key Vault:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: flamoral-secrets
  namespace: flamoral-prod
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: azure-backend
    kind: SecretStore
  target:
    name: flamoral-secrets
  data:
    - secretKey: DB_PASSWORD
      remoteRef:
        key: db-password
    - secretKey: JWT_ACCESS_SECRET
      remoteRef:
        key: jwt-access-secret
    # ... more secrets
```

---

## Azure Key Vault Integration

### Setup

1. **Create Azure Key Vault**:
   ```bash
   az keyvault create \
     --name flamoral-prod-kv \
     --resource-group flamoral-prod-rg \
     --location eastus
   ```

2. **Store Secrets**:
   ```bash
   # Database password
   az keyvault secret set \
     --vault-name flamoral-prod-kv \
     --name db-password \
     --value "your-secure-password"

   # JWT secrets
   az keyvault secret set \
     --vault-name flamoral-prod-kv \
     --name jwt-access-secret \
     --value "$(openssl rand -hex 64)"

   # Service API key
   az keyvault secret set \
     --vault-name flamoral-prod-kv \
     --name service-api-key \
     --value "$(openssl rand -hex 64)"
   ```

3. **Configure Managed Identity**:
   ```bash
   # Enable managed identity for AKS
   az aks update \
     --resource-group flamoral-prod-rg \
     --name flamoral-prod-aks \
     --enable-managed-identity

   # Grant access to Key Vault
   az keyvault set-policy \
     --name flamoral-prod-kv \
     --object-id <managed-identity-id> \
     --secret-permissions get list
   ```

### Environment Variable Configuration

```bash
# In production .env files
KEY_VAULT_ENABLED=true
KEY_VAULT_NAME=flamoral-prod-kv
AZURE_KEY_VAULT_URL=https://flamoral-prod-kv.vault.azure.net/
KEY_VAULT_MANAGED_IDENTITY_ENABLED=true
```

---

## Validation & Testing

### Environment Validation Script

Run the validation script before deployment:

```bash
# Validate all services
./scripts/validate-env-production.sh

# Validate specific service
./scripts/validate-env-production.sh auth-service
```

### Manual Validation Checklist

- [ ] All `***` placeholders replaced with actual values
- [ ] No `STORED_IN_AZURE_KEY_VAULT` placeholders in actual .env files
- [ ] JWT secrets are 64+ characters
- [ ] Database passwords are 32+ characters
- [ ] Service API key is 64+ characters
- [ ] All URLs use HTTPS (no HTTP except localhost)
- [ ] CORS origins don't include localhost in production
- [ ] Stripe uses LIVE keys (sk_live_..., not sk_test_...)
- [ ] Email templates IDs are correct
- [ ] Firebase project matches production
- [ ] Sentry DSN points to production project
- [ ] All required services have .env.production files

### Testing in Staging

Before production deployment:

1. Deploy to staging environment
2. Run integration tests
3. Verify all external services work
4. Check monitoring/logging
5. Test WebSocket connections
6. Verify payment processing
7. Test email/SMS delivery
8. Validate push notifications

---

## Security Best Practices

### 1. Secret Management

- **NEVER** commit secrets to version control
- Use Azure Key Vault for all sensitive data
- Rotate secrets regularly (every 90 days)
- Use different secrets for each environment
- Implement secret versioning

### 2. Access Control

- Use managed identities where possible
- Implement least privilege principle
- Audit secret access regularly
- Use separate service principals per environment

### 3. Environment Separation

- Completely separate staging and production
- No shared databases or services
- Different Azure subscriptions/resource groups
- Separate monitoring instances

### 4. Encryption

- Enable encryption at rest (databases, storage)
- Use TLS 1.2+ for all connections
- Encrypt sensitive data in application layer
- Use secure random generators for secrets

### 5. Monitoring

- Monitor secret access patterns
- Alert on unauthorized access attempts
- Log all configuration changes
- Implement automated secret expiration warnings

### 6. Compliance

- GDPR: Data retention policies configured
- PCI DSS: Payment data isolation
- SOC 2: Audit logging enabled
- HIPAA: If applicable, additional encryption

---

## Quick Reference

### Generate Secrets

```bash
# JWT secrets (64 chars)
openssl rand -hex 64

# Service API key (64 chars)
openssl rand -hex 64

# Database password (32 chars)
openssl rand -base64 32

# Session secret (32 chars)
openssl rand -base64 32

# Encryption key (32 bytes)
openssl rand -base64 32
```

### File Locations

```
flamoral/
├── .env.example                              # Root template
├── apps/
│   └── web-app/
│       ├── .env.example                      # Web app dev template
│       ├── .env.production                   # Web app production config
│       └── .env.production.example           # Web app production template
├── backend/
│   └── services/
│       ├── .env.example                      # Shared services template
│       ├── auth-service/.env.production
│       ├── user-service/.env.production
│       ├── matching-service/.env.production
│       ├── messaging-service/.env.production
│       ├── payment-service/.env.production
│       ├── media-service/.env.production
│       ├── notification-service/.env.production
│       ├── moderation-service/.env.production
│       ├── analytics-service/.env.production
│       ├── realtime-service/.env.production
│       └── api-gateway/.env.production
├── infrastructure/
│   ├── config/
│   │   ├── .env.production.template          # Infrastructure production template
│   │   ├── .env.staging.template
│   │   └── .env.development.template
│   └── kubernetes/
│       └── base/
│           ├── configmap.yaml                # Kubernetes ConfigMap
│           └── secrets.yaml                  # Kubernetes Secrets template
└── scripts/
    └── validate-env-production.sh            # Validation script
```

### Support

For questions or issues with environment configuration:
- Technical Lead: devops@flamoral.com
- Security: security@flamoral.com
- Documentation: https://docs.flamoral.com/environment-setup

---

**Last Updated**: December 15, 2024
**Version**: 1.0.0
**Maintained by**: Flamoral DevOps Team
