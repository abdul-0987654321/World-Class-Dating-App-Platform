# Environment Configuration Security Guide

## Overview

This document outlines the environment variable configuration strategy for the Flamoral Dating Platform, including security best practices, secret management, and deployment guidelines.

## Table of Contents

1. [Environment Files Structure](#environment-files-structure)
2. [Secret Management](#secret-management)
3. [Security Best Practices](#security-best-practices)
4. [Environment-Specific Configuration](#environment-specific-configuration)
5. [Kubernetes Secrets Management](#kubernetes-secrets-management)
6. [Service Configuration](#service-configuration)
7. [Development Setup](#development-setup)

## Environment Files Structure

```
Flamoral/
├── .env.example                           # Root example file
├── .env.dev.example                      # Development template
├── .env.staging.example                  # Staging template
├── .env.prod.example                     # Production template
├── infrastructure/
│   └── config/
│       ├── .env.development              # Dev infrastructure config
│       ├── .env.staging                  # Staging infrastructure config
│       └── .env.production               # Production infrastructure config
├── backend/
│   └── services/
│       ├── auth-service/
│       │   ├── .env                      # Local dev (gitignored)
│       │   └── .env.example              # Template
│       ├── user-service/
│       │   ├── .env                      # Local dev (gitignored)
│       │   └── .env.example              # Template
│       └── [other services...]
└── infrastructure/
    └── kubernetes/
        ├── secrets/
        │   ├── secrets-template.yaml     # K8s secrets template
        │   ├── dev-secrets.yaml          # Dev environment
        │   ├── staging-secrets.yaml      # Staging environment
        │   └── prod-secrets.yaml         # Production environment
        └── base/
            ├── secrets.yaml              # Base secrets
            └── configmap.yaml            # Non-sensitive config
```

## Secret Management

### Critical Principles

1. **NEVER commit actual secrets to version control**
2. **ALL production secrets MUST be stored in Azure Key Vault**
3. **Use different secrets for each environment**
4. **Rotate secrets regularly (minimum every 90 days)**
5. **Use cryptographically secure random generation**

### Secret Categories

#### High-Security Secrets (Rotate every 30 days)
- JWT secrets (access, refresh)
- Service-to-service API keys
- Database passwords
- Payment gateway keys (Stripe live keys)
- OAuth client secrets

#### Medium-Security Secrets (Rotate every 90 days)
- Email service API keys (SendGrid)
- SMS service tokens (Twilio)
- Azure Storage keys
- Firebase private keys

#### Low-Security Secrets (Rotate every 180 days)
- Analytics tokens (Mixpanel, Google Analytics)
- Monitoring service keys (Sentry)
- CDN tokens

### Generating Secure Secrets

#### JWT Secrets (64+ characters)
```bash
# Generate 64-character hex string
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate base64 encoded secret
openssl rand -base64 64
```

#### Service API Keys (32+ characters)
```bash
# Generate 32-character hex string
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### TOTP/2FA Encryption Keys
```bash
# Master key
openssl rand -base64 48

# Salt
openssl rand -base64 48
```

## Security Best Practices

### 1. Environment File Security

**DO:**
- ✅ Use `.env.example` files with placeholder values
- ✅ Keep `.env` files in `.gitignore`
- ✅ Document all required environment variables
- ✅ Use descriptive comments explaining each variable
- ✅ Set appropriate file permissions (600) on `.env` files

**DON'T:**
- ❌ Commit `.env` files to version control
- ❌ Use weak or predictable secrets
- ❌ Share secrets via email, Slack, or other channels
- ❌ Hardcode secrets in source code
- ❌ Use production secrets in development

### 2. Development Environment

**Acceptable Development Practices:**
```bash
# .env (development)
JWT_SECRET=dev-jwt-secret-change-in-production-min-64-chars
DB_PASSWORD=postgres
STRIPE_SECRET_KEY=sk_test_... # Test mode only
```

**Warning Comments:**
All development `.env` files should include warnings:
```bash
# =============================================================================
# DEVELOPMENT ENVIRONMENT - NOT FOR PRODUCTION USE
# =============================================================================
# WARNING: These are development/test credentials
# NEVER use these values in staging or production
# Production secrets MUST be stored in Azure Key Vault
# =============================================================================
```

### 3. Production Environment

**Production Secret Sources:**
- Primary: Azure Key Vault (via External Secrets Operator)
- Backup: Sealed Secrets (encrypted in Git)
- Emergency: Manual Kubernetes secrets (temporary only)

**Production Checklist:**
- [ ] All secrets stored in Azure Key Vault
- [ ] Separate Key Vault per environment (dev/staging/prod)
- [ ] RBAC configured (least privilege)
- [ ] Secret rotation policy enabled
- [ ] Audit logging enabled
- [ ] Backup and recovery tested
- [ ] No hardcoded secrets in code
- [ ] No secrets in Docker images
- [ ] No secrets in logs

## Environment-Specific Configuration

### Development Environment

**Characteristics:**
- Local services (localhost)
- Relaxed security (fast iteration)
- Test credentials acceptable
- Debug logging enabled
- All features enabled

**Required Variables:**
```bash
NODE_ENV=development
LOG_LEVEL=debug
DB_HOST=localhost
REDIS_HOST=localhost
STRIPE_SECRET_KEY=sk_test_...  # Test mode
```

### Staging Environment

**Characteristics:**
- Production-like infrastructure
- Test mode for payments
- Isolated from production data
- Monitoring enabled
- Beta features testable

**Required Variables:**
```bash
NODE_ENV=staging
LOG_LEVEL=info
DB_HOST=flamoral-staging-postgres.postgres.database.azure.com
STRIPE_SECRET_KEY=sk_test_...  # Test mode
FEATURE_BETA_FEATURES=true
```

### Production Environment

**Characteristics:**
- Maximum security
- Live payment processing
- High availability
- Comprehensive monitoring
- Strict CORS policies

**Required Variables:**
```bash
NODE_ENV=production
LOG_LEVEL=warn
DB_HOST=flamoral-prod-postgres.postgres.database.azure.com
STRIPE_SECRET_KEY=*** # STORED IN AZURE KEY VAULT
ENABLE_DEBUG_LOGGING=false
```

## Kubernetes Secrets Management

### Using External Secrets Operator

**1. Store secrets in Azure Key Vault:**
```bash
# Set JWT secret
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name jwt-access-secret \
  --value "$(openssl rand -base64 64)"
```

**2. Create ExternalSecret resource:**
```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: flamoral-auth-secrets
  namespace: flamoral-prod
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: azure-keyvault-store
    kind: SecretStore
  target:
    name: flamoral-auth-secrets
    creationPolicy: Owner
  data:
    - secretKey: JWT_ACCESS_SECRET
      remoteRef:
        key: jwt-access-secret
    - secretKey: JWT_REFRESH_SECRET
      remoteRef:
        key: jwt-refresh-secret
```

**3. Reference in Deployment:**
```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - name: auth-service
          envFrom:
            - secretRef:
                name: flamoral-auth-secrets
```

### Manual Secret Creation (Emergency Only)

```bash
# Create from literal values
kubectl create secret generic flamoral-secrets \
  --from-literal=JWT_SECRET="your-secret" \
  --namespace=flamoral-prod

# Create from file
kubectl create secret generic flamoral-secrets \
  --from-env-file=.env.production \
  --namespace=flamoral-prod
```

## Service Configuration

### Shared Configuration

All services require these base variables:

```bash
# Service Identity
SERVICE_NAME=service-name
NODE_ENV=development|staging|production
PORT=3000

# Database
DB_HOST=hostname
DB_PORT=5432
DB_NAME=database_name
DB_USER=username
DB_PASSWORD=*** # SECRET

# Redis Cache
REDIS_HOST=hostname
REDIS_PORT=6379
REDIS_PASSWORD=*** # SECRET

# Authentication
JWT_ACCESS_SECRET=*** # SECRET
JWT_REFRESH_SECRET=*** # SECRET
SERVICE_API_KEY=*** # SECRET

# Logging
LOG_LEVEL=debug|info|warn|error
```

### Service-Specific Variables

#### Auth Service
```bash
# OAuth Providers
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=*** # SECRET
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=*** # SECRET
APPLE_CLIENT_ID=...
APPLE_PRIVATE_KEY=*** # SECRET

# Email
SENDGRID_API_KEY=*** # SECRET
SMTP_HOST=smtp.sendgrid.net
EMAIL_FROM=noreply@flamoral.com
```

#### Payment Service
```bash
# Stripe
STRIPE_SECRET_KEY=*** # SECRET (sk_live_ for prod)
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=*** # SECRET
STRIPE_API_VERSION=2024-12-18.acacia

# Subscription Tiers
PREMIUM_TIER_PRICE=19.99
ELITE_TIER_PRICE=39.99
```

#### Media Service
```bash
# Azure Storage
AZURE_STORAGE_ACCOUNT=account_name
AZURE_STORAGE_KEY=*** # SECRET
AZURE_STORAGE_CONNECTION_STRING=*** # SECRET
AZURE_STORAGE_CONTAINER_PHOTOS=photos
AZURE_STORAGE_CONTAINER_VIDEOS=videos

# Upload Limits
MAX_FILE_SIZE=10485760  # 10MB
MAX_VIDEO_SIZE=52428800  # 50MB
```

## Development Setup

### Initial Setup

1. **Clone repository:**
```bash
git clone https://github.com/your-org/flamoral.git
cd flamoral
```

2. **Copy environment templates:**
```bash
# Root environment
cp .env.example .env

# Service environments
cp backend/services/auth-service/.env.example backend/services/auth-service/.env
cp backend/services/user-service/.env.example backend/services/user-service/.env
cp backend/services/payment-service/.env.example backend/services/payment-service/.env
# ... repeat for all services
```

3. **Generate development secrets:**
```bash
# JWT secrets
echo "JWT_ACCESS_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")" >> .env
echo "JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")" >> .env

# Service API key
echo "SERVICE_API_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" >> .env
```

4. **Set up local services:**
```bash
# Start Docker containers
docker-compose up -d postgres redis mongodb

# Verify services
docker ps
```

5. **Configure third-party services:**
- Sign up for Stripe (use test mode)
- Create SendGrid account (free tier)
- Set up Twilio (trial account)
- Configure Azure Storage (dev account)

### Environment Variables Validation

Create a validation script to check required variables:

```typescript
// scripts/validate-env.ts
const requiredVars = [
  'NODE_ENV',
  'DB_HOST',
  'DB_PASSWORD',
  'REDIS_HOST',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'SERVICE_API_KEY',
];

function validateEnv() {
  const missing = requiredVars.filter(v => !process.env[v]);

  if (missing.length > 0) {
    console.error('Missing required environment variables:');
    missing.forEach(v => console.error(`  - ${v}`));
    process.exit(1);
  }

  console.log('✅ All required environment variables are set');
}

validateEnv();
```

## Troubleshooting

### Common Issues

**Issue: Service can't connect to database**
```bash
# Check connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL
```

**Issue: JWT authentication fails**
```bash
# Verify JWT secrets are set
echo $JWT_ACCESS_SECRET | wc -c  # Should be 64+ characters

# Check token generation
npm run test:auth
```

**Issue: Stripe webhook validation fails**
```bash
# Use Stripe CLI for local testing
stripe listen --forward-to localhost:3005/api/webhooks/stripe

# Check webhook secret
echo $STRIPE_WEBHOOK_SECRET
```

## Security Incidents

### If a Secret is Compromised

1. **Immediate Actions:**
   - Revoke the compromised secret
   - Generate new secret
   - Update Azure Key Vault
   - Force re-deployment of affected services

2. **Investigation:**
   - Check audit logs
   - Identify scope of exposure
   - Document incident

3. **Prevention:**
   - Review access controls
   - Update security policies
   - Enhance monitoring

### Emergency Secret Rotation

```bash
# Generate new secret
NEW_SECRET=$(openssl rand -base64 64)

# Update Azure Key Vault
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name jwt-access-secret \
  --value "$NEW_SECRET"

# Trigger secret refresh (External Secrets Operator)
kubectl annotate externalsecret flamoral-auth-secrets \
  force-sync="$(date +%s)" \
  --namespace=flamoral-prod

# Rolling restart of services
kubectl rollout restart deployment/auth-service \
  --namespace=flamoral-prod
```

## Compliance

### GDPR/CCPA Requirements

- Audit logging of secret access
- Data retention policies
- Right to be forgotten (clear user data)
- Encryption at rest and in transit

### PCI DSS (Payment Card Industry)

- Stripe handles card data (PCI compliant)
- No card data stored in our database
- Secure communication (HTTPS/TLS 1.2+)
- Regular security audits

## Contacts

### Support
- **Development Team:** dev@flamoral.com
- **Security Team:** security@flamoral.com
- **DevOps Team:** devops@flamoral.com

### Emergency
- **On-call Engineer:** oncall@flamoral.com
- **PagerDuty:** https://flamoral.pagerduty.com
- **Slack:** #flamoral-incidents

## References

- [Azure Key Vault Documentation](https://docs.microsoft.com/en-us/azure/key-vault/)
- [External Secrets Operator](https://external-secrets.io/)
- [Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets)
- [OWASP Secrets Management](https://owasp.org/www-community/vulnerabilities/Secrets_Management)
- [12-Factor App Config](https://12factor.net/config)

---

**Last Updated:** 2025-12-15
**Version:** 1.0.0
**Maintainer:** DevOps Team
