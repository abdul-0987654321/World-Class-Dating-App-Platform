# Environment Configuration Guide

This directory contains environment configuration templates and documentation for the Flamoral Dating Platform.

## Table of Contents

1. [Overview](#overview)
2. [Directory Structure](#directory-structure)
3. [Quick Start](#quick-start)
4. [Environment Files](#environment-files)
5. [Security Best Practices](#security-best-practices)
6. [Azure Key Vault Integration](#azure-key-vault-integration)
7. [Kubernetes Deployment](#kubernetes-deployment)
8. [Validation](#validation)
9. [Troubleshooting](#troubleshooting)

## Overview

The Flamoral Dating Platform uses environment-specific configuration files to manage settings across different deployment environments (development, staging, production). This approach ensures:

- **Security**: Sensitive credentials are never committed to version control
- **Flexibility**: Easy configuration changes without code modifications
- **Consistency**: Standardized configuration across all services
- **Scalability**: Environment-specific optimizations

## Directory Structure

```
infrastructure/config/
├── README.md                           # This file
├── ENVIRONMENT_VARIABLES.md            # Comprehensive variable documentation
├── .env.development                    # Development environment template
├── .env.staging                        # Staging environment template
├── .env.production                     # Production environment template
└── .gitignore                          # Ensures secrets aren't committed

infrastructure/kubernetes/
├── configmaps/
│   ├── common-config.yaml             # Common ConfigMap for all services
│   └── service-config-template.yaml   # Service-specific ConfigMap templates
└── secrets/
    ├── secrets-template.yaml          # Kubernetes Secrets template
    └── azure-keyvault-secretprovider.yaml  # Azure Key Vault integration

scripts/
├── azure-keyvault-setup.sh            # Setup Azure Key Vault
├── azure-keyvault-sync.sh             # Sync secrets from Key Vault
├── azure-keyvault-rotate.sh           # Rotate secrets
├── generate-secrets.sh                # Generate secure secrets
└── validate-env.sh                    # Validate configuration
```

## Quick Start

### For Development

1. **Copy the development template:**
   ```bash
   cp infrastructure/config/.env.development .env
   ```

2. **Generate secure secrets:**
   ```bash
   ./scripts/generate-secrets.sh --all
   ```

3. **Update the .env file with generated secrets and your local configuration**

4. **Validate your configuration:**
   ```bash
   ./scripts/validate-env.sh development
   ```

5. **Start the services:**
   ```bash
   docker-compose up -d
   ```

### For Staging/Production

1. **Setup Azure Key Vault:**
   ```bash
   ./scripts/azure-keyvault-setup.sh staging
   ```

2. **Sync secrets to local file (if needed):**
   ```bash
   ./scripts/azure-keyvault-sync.sh staging
   ```

3. **Deploy to Kubernetes:**
   ```bash
   kubectl apply -f infrastructure/kubernetes/configmaps/
   kubectl apply -f infrastructure/kubernetes/secrets/azure-keyvault-secretprovider.yaml
   ```

4. **Validate configuration:**
   ```bash
   ./scripts/validate-env.sh staging
   ```

## Environment Files

### .env.development

Development environment configuration with:
- Relaxed security settings for easier debugging
- Local service URLs (localhost)
- Test/sandbox API keys
- Verbose logging enabled
- All feature flags enabled

**Use for:** Local development, testing, debugging

### .env.staging

Staging environment configuration that mirrors production:
- Production-like security settings
- Azure-hosted services
- Test API keys for external services
- Moderate logging
- Beta features enabled for testing

**Use for:** Pre-production testing, QA, integration tests

### .env.production

Production environment configuration with:
- Maximum security settings
- Production Azure services
- Live API keys (stored in Azure Key Vault)
- Minimal logging (warn level)
- Beta features disabled
- Performance optimizations enabled

**Use for:** Live production deployment

## Security Best Practices

### 1. Never Commit Secrets

```bash
# .gitignore should include:
.env
.env.local
.env.*.local
!.env.example
!.env.*.example
```

### 2. Use Azure Key Vault

For staging and production, **ALL** secrets must be stored in Azure Key Vault:

```bash
# Setup Key Vault
./scripts/azure-keyvault-setup.sh production

# Secrets are automatically synced to Kubernetes
```

### 3. Generate Strong Secrets

```bash
# Generate a 64-character secret
openssl rand -base64 48 | tr -d "=+/" | cut -c1-64

# Or use the provided script
./scripts/generate-secrets.sh --all
```

### 4. Use Different Secrets Per Environment

Never reuse secrets between environments. Generate unique secrets for:
- Development
- Staging
- Production

### 5. Rotate Secrets Regularly

```bash
# Rotate all JWT and service secrets
./scripts/azure-keyvault-rotate.sh production jwt

# Rotate all secrets
./scripts/azure-keyvault-rotate.sh production all
```

**Recommended rotation schedule:**
- JWT secrets: Every 90 days
- Service API keys: Every 90 days
- Database passwords: Every 180 days
- External API keys: As required by provider

### 6. Principle of Least Privilege

- Services should only have access to secrets they need
- Use separate Key Vault instances for different environments
- Implement role-based access control (RBAC)

## Azure Key Vault Integration

### Setup Process

1. **Create Key Vault and store secrets:**
   ```bash
   ./scripts/azure-keyvault-setup.sh production
   ```

2. **Configure AKS to access Key Vault:**
   ```bash
   # Enable Azure Key Vault Provider for Secrets Store CSI Driver
   az aks enable-addons \
     --addons azure-keyvault-secrets-provider \
     --name flamoral-prod-aks \
     --resource-group flamoral-prod-rg
   ```

3. **Deploy SecretProviderClass:**
   ```bash
   # Update variables in azure-keyvault-secretprovider.yaml
   kubectl apply -f infrastructure/kubernetes/secrets/azure-keyvault-secretprovider.yaml
   ```

4. **Mount secrets in pods:**
   ```yaml
   # In your deployment.yaml
   volumes:
   - name: secrets-store
     csi:
       driver: secrets-store.csi.k8s.io
       readOnly: true
       volumeAttributes:
         secretProviderClass: "flamoral-azure-keyvault"
   ```

### Syncing Secrets

Secrets can be synced from Key Vault to Kubernetes secrets:

```bash
# Sync all secrets
./scripts/azure-keyvault-sync.sh production

# Sync for specific service
./scripts/azure-keyvault-sync.sh production user-service
```

### Accessing Secrets in Code

```typescript
// Secrets are available as environment variables
const dbPassword = process.env.DB_PASSWORD;
const jwtSecret = process.env.JWT_SECRET;
```

## Kubernetes Deployment

### ConfigMaps

ConfigMaps store non-sensitive configuration:

```bash
# Apply common configuration
kubectl apply -f infrastructure/kubernetes/configmaps/common-config.yaml

# Apply service-specific configuration
kubectl apply -f infrastructure/kubernetes/configmaps/service-config-template.yaml
```

**ConfigMaps include:**
- Service URLs
- Port numbers
- Feature flags
- Timeouts and limits
- Public API keys

### Secrets

Secrets store sensitive data:

```bash
# Option 1: Use Azure Key Vault (Recommended)
kubectl apply -f infrastructure/kubernetes/secrets/azure-keyvault-secretprovider.yaml

# Option 2: Manual secrets (Development only)
kubectl apply -f infrastructure/kubernetes/secrets/secrets-template.yaml
```

**Secrets include:**
- Database passwords
- API keys
- JWT secrets
- OAuth credentials
- Encryption keys

### Environment Variables in Pods

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
spec:
  template:
    spec:
      containers:
      - name: user-service
        envFrom:
        # Load non-sensitive config
        - configMapRef:
            name: flamoral-common-config
        - configMapRef:
            name: user-service-config
        env:
        # Load sensitive secrets
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: flamoral-database-secrets
              key: DB_PASSWORD
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: flamoral-auth-secrets
              key: JWT_SECRET
```

## Validation

### Validate Configuration

```bash
# Validate development environment
./scripts/validate-env.sh development

# Validate production with connectivity checks
CHECK_CONNECTIVITY=true ./scripts/validate-env.sh production

# Validate specific service
./scripts/validate-env.sh staging user-service
```

### What Gets Validated

The validation script checks:

1. **Required variables are set**
2. **No placeholder values** (e.g., "your-secret-here")
3. **Secret length requirements** (JWT: 64 chars, passwords: 12+ chars)
4. **URL format validation**
5. **Email format validation**
6. **Port number validation**
7. **Environment-specific checks** (HTTPS in production, etc.)
8. **Security settings** (SSL enabled, HSTS configured, etc.)
9. **Feature flags** (Debug disabled in production, etc.)
10. **Service connectivity** (optional)

### Example Output

```bash
$ ./scripts/validate-env.sh production

=====================================================================
Environment Configuration Validation for Flamoral Dating Platform
Environment: production
Service: all
=====================================================================

[1/10] Validating Core Settings...
✓ NODE_ENV is set
✓ ENVIRONMENT is set

[2/10] Validating Database Configuration...
✓ DB_HOST is set
✓ DB_PORT is valid
✓ DB_PASSWORD meets length requirements
✓ SSL is enabled

...

=====================================================================
Validation Summary
=====================================================================
✓ All validations passed!
  Configuration is valid for production environment
```

## Troubleshooting

### Common Issues

#### 1. Missing Environment Variables

**Error:** `Required variable JWT_SECRET is not set`

**Solution:**
```bash
# Generate a new secret
./scripts/generate-secrets.sh --count 1

# Add to .env file
echo "JWT_SECRET=<generated-secret>" >> .env
```

#### 2. Placeholder Values in Production

**Error:** `JWT_SECRET contains placeholder value: your-`

**Solution:**
```bash
# Never use placeholder values in production
# Generate proper secrets:
./scripts/azure-keyvault-setup.sh production
```

#### 3. Cannot Connect to Database

**Error:** `Cannot connect to database at localhost:5432`

**Solution:**
```bash
# Check if database is running
docker ps | grep postgres

# Or start with docker-compose
docker-compose up -d postgres
```

#### 4. Secrets Not Syncing to Kubernetes

**Error:** Pods can't access secrets from Key Vault

**Solution:**
```bash
# Check SecretProviderClass
kubectl get secretproviderclass -n flamoral-prod

# Check pod events
kubectl describe pod <pod-name> -n flamoral-prod

# Verify managed identity has Key Vault access
az keyvault show --name flamoral-prod-kv --query properties.accessPolicies
```

#### 5. CORS Errors in Development

**Error:** CORS policy blocking requests

**Solution:**
```bash
# Update CORS_ORIGIN in .env
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# Restart the service
docker-compose restart api-gateway
```

### Getting Help

1. **Check the documentation:**
   - [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) - Detailed variable documentation
   - [Main README](/README.md) - Project overview

2. **Run validation:**
   ```bash
   ./scripts/validate-env.sh <environment>
   ```

3. **Check logs:**
   ```bash
   # Docker Compose
   docker-compose logs -f <service-name>

   # Kubernetes
   kubectl logs -f <pod-name> -n flamoral-<environment>
   ```

4. **Verify connectivity:**
   ```bash
   # Database
   pg_isready -h <db-host> -p 5432

   # Redis
   redis-cli -h <redis-host> -p 6379 ping
   ```

## Additional Resources

- [Azure Key Vault Documentation](https://docs.microsoft.com/en-us/azure/key-vault/)
- [Kubernetes Secrets Management](https://kubernetes.io/docs/concepts/configuration/secret/)
- [12-Factor App Config](https://12factor.net/config)
- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

## Maintenance

### Regular Tasks

1. **Secret Rotation** (Every 90 days)
   ```bash
   ./scripts/azure-keyvault-rotate.sh production jwt
   ```

2. **Configuration Review** (Monthly)
   ```bash
   ./scripts/validate-env.sh production
   ```

3. **Backup Verification** (Weekly)
   ```bash
   az keyvault secret list --vault-name flamoral-prod-kv
   ```

4. **Access Audit** (Monthly)
   ```bash
   az keyvault show --name flamoral-prod-kv --query properties.accessPolicies
   ```

---

**Last Updated:** 2025-12-11
**Version:** 1.0.0
**Maintained by:** DevOps Team
