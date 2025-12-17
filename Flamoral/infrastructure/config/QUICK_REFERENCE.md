# Environment Configuration - Quick Reference

A quick reference guide for common environment configuration tasks.

## Quick Commands

### Development Setup

```bash
# Copy template
cp infrastructure/config/.env.development .env

# Generate secrets
./scripts/generate-secrets.sh --all

# Validate
./scripts/validate-env.sh development

# Start services
docker-compose up -d
```

### Production Setup

```bash
# Setup Key Vault
./scripts/azure-keyvault-setup.sh production

# Sync secrets (if needed locally)
./scripts/azure-keyvault-sync.sh production

# Deploy to K8s
kubectl apply -f infrastructure/kubernetes/configmaps/
kubectl apply -f infrastructure/kubernetes/secrets/azure-keyvault-secretprovider.yaml

# Validate
./scripts/validate-env.sh production
```

### Secret Management

```bash
# Generate one secret
./scripts/generate-secrets.sh

# Generate multiple
./scripts/generate-secrets.sh --count 5

# Generate all
./scripts/generate-secrets.sh --all

# Rotate JWT secrets
./scripts/azure-keyvault-rotate.sh production jwt

# Rotate all rotatable secrets
./scripts/azure-keyvault-rotate.sh production all
```

## File Locations

| File | Location |
|------|----------|
| Dev Template | `infrastructure/config/.env.development` |
| Staging Template | `infrastructure/config/.env.staging` |
| Production Template | `infrastructure/config/.env.production` |
| Variable Docs | `infrastructure/config/ENVIRONMENT_VARIABLES.md` |
| Setup Guide | `infrastructure/config/README.md` |
| ConfigMaps | `infrastructure/kubernetes/configmaps/` |
| Secrets | `infrastructure/kubernetes/secrets/` |
| Scripts | `scripts/` |

## Critical Secrets

Must be stored in Azure Key Vault for staging/production:

### Authentication (64+ chars)
- `JWT_SECRET`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `SERVICE_API_KEY`

### Database
- `DB_PASSWORD`
- `DATABASE_URL`
- `MONGODB_URI`

### Cache
- `REDIS_PASSWORD`
- `REDIS_URL`

### Payments
- `STRIPE_SECRET_KEY` (sk_live_* for prod)
- `STRIPE_WEBHOOK_SECRET`

### External APIs
- `SENDGRID_API_KEY`
- `TWILIO_AUTH_TOKEN`
- `AZURE_STORAGE_KEY`
- `AZURE_STORAGE_CONNECTION_STRING`
- `OPENAI_API_KEY`

### OAuth
- `GOOGLE_CLIENT_SECRET`
- `FACEBOOK_APP_SECRET`
- `APPLE_PRIVATE_KEY`

## Secret Generation

```bash
# 64-character secret
openssl rand -base64 48 | tr -d "=+/" | cut -c1-64

# 32-character secret
openssl rand -base64 24 | tr -d "=+/" | cut -c1-32

# Hex secret
openssl rand -hex 32

# UUID
uuidgen | tr '[:upper:]' '[:lower:]'
```

## Validation Checklist

### Before Deployment

- [ ] All required variables set
- [ ] No placeholder values (your-, change-this, etc.)
- [ ] Secrets meet minimum length (JWT: 64, passwords: 12)
- [ ] URLs use HTTPS in production
- [ ] SSL/TLS enabled for databases
- [ ] Debug/verbose logging disabled in production
- [ ] Beta features disabled in production
- [ ] Correct API keys for environment (test vs live)

### Run Validation

```bash
./scripts/validate-env.sh <environment>
```

## Environment Differences

| Setting | Development | Staging | Production |
|---------|-------------|---------|------------|
| NODE_ENV | development | staging | production |
| LOG_LEVEL | debug | info | warn |
| DEBUG | true | false | false |
| Database | Local | Azure | Azure |
| Redis | Local | Azure | Azure |
| SSL | Optional | Required | Required |
| HTTPS | Optional | Required | Required |
| Secrets | Local | Key Vault | Key Vault |
| Stripe Keys | Test | Test | Live |
| Rate Limiting | Relaxed | Moderate | Strict |
| CORS | localhost | staging domain | production domain |

## Port Assignments

| Service | Port |
|---------|------|
| API Gateway | 3000 |
| User Service | 3001 |
| Matching Service | 3002 |
| Messaging Service | 3003 |
| Moderation Service | 3004 |
| Payment Service | 3005 |
| Media Service | 3006 |
| Analytics Service | 3007 |
| Notification Service | 3008 |
| AI Service | 3009 |
| Advertising Service | 3010 |
| Auth Service | 3011 |
| Realtime Service | 3012 |
| Admin Service | 3013 |
| Automation Service | 3014 |
| Workflow Engine | 3015 |

## Kubernetes Commands

```bash
# Apply ConfigMaps
kubectl apply -f infrastructure/kubernetes/configmaps/

# Apply Secrets
kubectl apply -f infrastructure/kubernetes/secrets/

# View ConfigMap
kubectl get configmap flamoral-common-config -n flamoral-prod -o yaml

# View Secret (decoded)
kubectl get secret flamoral-database-secrets -n flamoral-prod -o jsonpath='{.data.DB_PASSWORD}' | base64 -d

# Restart service (to pick up new secrets)
kubectl rollout restart deployment/user-service -n flamoral-prod

# Check pod environment
kubectl exec -it <pod-name> -n flamoral-prod -- env | grep DB_
```

## Azure Key Vault Commands

```bash
# List all secrets
az keyvault secret list --vault-name flamoral-prod-kv

# Get secret value
az keyvault secret show --vault-name flamoral-prod-kv --name jwt-secret --query value -o tsv

# Set secret
az keyvault secret set --vault-name flamoral-prod-kv --name jwt-secret --value "new-value"

# Delete secret
az keyvault secret delete --vault-name flamoral-prod-kv --name jwt-secret

# List access policies
az keyvault show --name flamoral-prod-kv --query properties.accessPolicies
```

## Troubleshooting Quick Fixes

### Cannot connect to database
```bash
# Check connectivity
pg_isready -h <host> -p 5432

# Verify credentials
psql "postgresql://<user>:<password>@<host>:5432/<database>?sslmode=require"
```

### Redis connection failed
```bash
# Test connection
redis-cli -h <host> -p 6379 ping

# With password
redis-cli -h <host> -p 6379 -a <password> ping
```

### Secrets not syncing to K8s
```bash
# Check SecretProviderClass
kubectl describe secretproviderclass flamoral-azure-keyvault -n flamoral-prod

# Check pod events
kubectl describe pod <pod-name> -n flamoral-prod

# Check CSI driver
kubectl get pods -n kube-system | grep csi
```

### Validation errors
```bash
# Run with verbose output
./scripts/validate-env.sh <environment>

# Check specific variable
grep "VARIABLE_NAME" .env
```

## Common .env Patterns

### Local Development
```bash
DB_HOST=localhost
REDIS_HOST=localhost
NODE_ENV=development
DEBUG=true
LOG_LEVEL=debug
```

### Docker Compose
```bash
DB_HOST=postgres
REDIS_HOST=redis
NODE_ENV=development
```

### Kubernetes
```bash
DB_HOST=flamoral-prod-postgres.postgres.database.azure.com
REDIS_HOST=flamoral-prod-redis.redis.cache.windows.net
NODE_ENV=production
```

## Security Reminders

1. **Never commit secrets to Git**
2. **Use Azure Key Vault for staging/production**
3. **Rotate secrets every 90 days**
4. **Use different secrets per environment**
5. **Validate before deployment**
6. **Use strong secrets (64+ chars for JWT)**
7. **Enable SSL/TLS in production**
8. **Use test API keys in non-production**

## Support

- **Full Documentation:** `infrastructure/config/ENVIRONMENT_VARIABLES.md`
- **Setup Guide:** `infrastructure/config/README.md`
- **Complete Summary:** `ENVIRONMENT_SETUP_COMPLETE.md`

---

**Last Updated:** 2025-12-11
