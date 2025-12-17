# Flamoral Environment Configuration - Quick Reference

## 🚀 Quick Start

### For Developers

```bash
# Development
cp .env.example .env
# Edit .env with your local values

# Run validation
./scripts/validate-env-production.sh auth-service
```

### For DevOps

```bash
# Generate secrets
openssl rand -hex 64  # JWT secrets
openssl rand -base64 32  # Database password

# Store in Azure Key Vault
az keyvault secret set --vault-name flamoral-prod-kv \
  --name jwt-access-secret --value "$(openssl rand -hex 64)"

# Deploy to Kubernetes
kubectl apply -f infrastructure/kubernetes/base/configmap.yaml
```

---

## 📁 File Locations

| Environment | Location | Purpose |
|------------|----------|---------|
| **Development** | `.env.example` | Local development template |
| **Staging** | `.env.staging` | Staging configuration |
| **Production** | `.env.production` | Production configuration |
| **K8s Config** | `infrastructure/kubernetes/base/configmap.yaml` | Non-sensitive config |
| **K8s Secrets** | `infrastructure/kubernetes/base/secrets.yaml` | Sensitive data template |

---

## 🔧 Service Ports

| Service | Port | Type | URL (Local) |
|---------|------|------|-------------|
| **API Gateway** | 3000 | REST API | http://localhost:3000 |
| **GraphQL** | 4000 | GraphQL | http://localhost:4000/graphql |
| **WebSocket** | 5000 | WS | ws://localhost:5000 |
| **Auth** | 3001 | REST | http://localhost:3001 |
| **User** | 3002 | REST | http://localhost:3002 |
| **Messaging** | 3003 | REST | http://localhost:3003 |
| **Payment** | 3005 | REST | http://localhost:3005 |
| **Media** | 3006 | REST | http://localhost:3006 |
| **Analytics** | 3007 | REST | http://localhost:3007 |
| **Moderation** | 3008 | REST | http://localhost:3008 |
| **Matching** | 3009 | REST | http://localhost:3009 |
| **Notification** | 3012 | REST | http://localhost:3012 |
| **Admin** | 3013 | REST | http://localhost:3013 |
| **Realtime** | 8081 | WebSocket | ws://localhost:8081 |

---

## 🔑 Required Secrets (Production)

### Critical (Must Have)
- `JWT_ACCESS_SECRET` - 64+ chars
- `JWT_REFRESH_SECRET` - 64+ chars
- `SERVICE_API_KEY` - 64+ chars
- `DB_PASSWORD` - 32+ chars
- `REDIS_PASSWORD` - 16+ chars

### Payment
- `STRIPE_SECRET_KEY` - sk_live_...
- `STRIPE_WEBHOOK_SECRET` - whsec_...

### Communication
- `SENDGRID_API_KEY` - SG.*
- `TWILIO_AUTH_TOKEN`
- `FCM_SERVER_KEY`

### Azure
- `AZURE_STORAGE_KEY`
- `AZURE_FACE_API_KEY`
- `AZURE_CONTENT_MODERATOR_KEY`

---

## 🔐 Generate Secrets

```bash
# JWT Secrets (64 chars)
openssl rand -hex 64

# Service API Key (64 chars)
openssl rand -hex 64

# Database Password (32 chars, base64)
openssl rand -base64 32

# Session Secret (32 chars, base64)
openssl rand -base64 32

# Encryption Key (32 bytes, base64)
openssl rand -base64 32
```

---

## 🌐 Production URLs

| Type | URL |
|------|-----|
| **Web App** | https://flamoral.com |
| **API** | https://api.flamoral.com |
| **Admin** | https://admin.flamoral.com |
| **CDN** | https://cdn.flamoral.com |
| **Media** | https://media.flamoral.com |

---

## 🔍 Environment Variables by Category

### Database
```bash
DB_HOST=flamoral-prod-postgres.postgres.database.azure.com
DB_PORT=5432
DB_NAME=flamoral_prod
DB_USER=flamoral_admin@flamoral-prod-postgres
DB_PASSWORD=***
DATABASE_URL=***
```

### Redis
```bash
REDIS_HOST=flamoral-prod-redis.redis.cache.windows.net
REDIS_PORT=6380
REDIS_PASSWORD=***
REDIS_TLS=true
```

### JWT
```bash
JWT_ACCESS_SECRET=***
JWT_REFRESH_SECRET=***
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

### CORS
```bash
CORS_ORIGINS=https://flamoral.com,https://www.flamoral.com,https://admin.flamoral.com
CORS_CREDENTIALS=true
```

---

## ✅ Validation Checklist

### Before Deployment
- [ ] No `***` placeholders remain
- [ ] No `STORED_IN_AZURE_KEY_VAULT` placeholders
- [ ] All secrets are 32+ characters
- [ ] JWT secrets are 64+ characters
- [ ] URLs use HTTPS (not HTTP)
- [ ] CORS doesn't include localhost
- [ ] Stripe uses LIVE keys (sk_live_)
- [ ] Run `./scripts/validate-env-production.sh`

### After Deployment
- [ ] All services healthy
- [ ] Health checks responding
- [ ] Monitoring working
- [ ] Logs flowing
- [ ] No error spikes

---

## 🛠️ Common Commands

### Azure Key Vault
```bash
# Create Key Vault
az keyvault create --name flamoral-prod-kv \
  --resource-group flamoral-prod-rg --location eastus

# Store secret
az keyvault secret set --vault-name flamoral-prod-kv \
  --name db-password --value "your-password"

# Get secret
az keyvault secret show --vault-name flamoral-prod-kv \
  --name db-password --query value -o tsv
```

### Kubernetes
```bash
# Apply ConfigMap
kubectl apply -f infrastructure/kubernetes/base/configmap.yaml

# Apply Secrets
kubectl apply -f infrastructure/kubernetes/base/secrets.yaml

# Verify
kubectl get configmap flamoral-config -n flamoral-prod
kubectl get secret flamoral-secrets -n flamoral-prod

# Check pod environment
kubectl exec -it <pod-name> -n flamoral-prod -- env | grep JWT
```

### Service Testing
```bash
# Health check
curl https://api.flamoral.com/health

# Test service
curl -H "Authorization: Bearer $TOKEN" \
  https://api.flamoral.com/api/v1/users/me
```

---

## 🐛 Troubleshooting

### Service won't start
1. Check environment variables are set
2. Verify database connectivity
3. Check Redis connection
4. Review logs: `kubectl logs <pod-name>`

### Can't connect to database
1. Check DB_HOST and DB_PORT
2. Verify DB_PASSWORD is correct
3. Ensure SSL is configured
4. Check network security groups

### JWT errors
1. Verify JWT_ACCESS_SECRET is set
2. Check JWT_REFRESH_SECRET
3. Ensure secrets are 64+ characters
4. Verify token hasn't expired

### CORS errors
1. Check CORS_ORIGINS includes your domain
2. Verify CORS_CREDENTIALS=true
3. Ensure API URL is correct in frontend

---

## 📚 Documentation

- **Setup Guide**: `ENVIRONMENT-SETUP.md`
- **Checklist**: `ENVIRONMENT-CHECKLIST.md`
- **Summary**: `ENVIRONMENT-CONFIG-SUMMARY.md`
- **This Card**: `ENVIRONMENT-QUICK-REF.md`

---

## 🆘 Support

- **DevOps**: devops@flamoral.com
- **Security**: security@flamoral.com
- **Documentation**: https://docs.flamoral.com

---

## 📋 Service-Specific Variables

### Auth Service
```bash
GOOGLE_CLIENT_ID=***
GOOGLE_CLIENT_SECRET=***
FACEBOOK_APP_ID=***
FACEBOOK_APP_SECRET=***
APPLE_CLIENT_ID=com.flamoral.com
APPLE_PRIVATE_KEY=***
```

### Payment Service
```bash
STRIPE_SECRET_KEY=sk_live_***
STRIPE_PUBLISHABLE_KEY=pk_live_***
STRIPE_WEBHOOK_SECRET=whsec_***
```

### Media Service
```bash
AZURE_STORAGE_ACCOUNT=flamoralprodst
AZURE_STORAGE_KEY=***
AZURE_STORAGE_CONNECTION_STRING=***
CDN_URL=https://cdn.flamoral.com
```

### Notification Service
```bash
SENDGRID_API_KEY=SG.***
TWILIO_ACCOUNT_SID=AC***
TWILIO_AUTH_TOKEN=***
FIREBASE_PROJECT_ID=flamoral-production
FCM_SERVER_KEY=***
```

---

**Version**: 1.0.0
**Last Updated**: December 15, 2024
