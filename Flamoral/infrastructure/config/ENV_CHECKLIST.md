# Environment Configuration Checklist

## Pre-Deployment Checklist

### Development Environment

- [ ] **Environment Files**
  - [ ] Root `.env` file created from `.env.example`
  - [ ] All service `.env` files created from respective `.env.example` files
  - [ ] Database credentials configured (local PostgreSQL)
  - [ ] Redis connection configured (local Redis)
  - [ ] MongoDB connection configured (local MongoDB)

- [ ] **Secrets Generation**
  - [ ] JWT_ACCESS_SECRET generated (64+ chars)
  - [ ] JWT_REFRESH_SECRET generated (64+ chars)
  - [ ] SERVICE_API_KEY generated (32+ chars)
  - [ ] SESSION_SECRET generated (32+ chars)

- [ ] **Third-Party Services**
  - [ ] Stripe test mode keys configured
  - [ ] SendGrid API key (or disabled in dev)
  - [ ] Twilio test credentials (or mocked)
  - [ ] Azure Storage dev account (or local storage)

- [ ] **Verification**
  - [ ] All services start without errors
  - [ ] Database migrations run successfully
  - [ ] Health check endpoints return 200
  - [ ] No secrets logged in console output

### Staging Environment

- [ ] **Azure Key Vault Setup**
  - [ ] Key Vault created: `flamoral-staging-kv`
  - [ ] Managed Identity configured
  - [ ] RBAC permissions set (least privilege)
  - [ ] Network access configured (firewall rules)
  - [ ] Soft delete enabled
  - [ ] Purge protection enabled

- [ ] **Secrets in Key Vault**
  - [ ] Database credentials stored
  - [ ] Redis credentials stored
  - [ ] JWT secrets stored (64+ chars)
  - [ ] Service API keys stored
  - [ ] Stripe test keys stored
  - [ ] SendGrid API key stored
  - [ ] Twilio credentials stored
  - [ ] OAuth secrets stored (Google, Facebook, Apple)
  - [ ] Azure Storage keys stored
  - [ ] Agora credentials stored
  - [ ] Firebase credentials stored

- [ ] **Kubernetes Configuration**
  - [ ] Namespace created: `flamoral-staging`
  - [ ] External Secrets Operator installed
  - [ ] SecretStore configured
  - [ ] ExternalSecrets created for all services
  - [ ] ConfigMaps deployed
  - [ ] Service accounts configured

- [ ] **Infrastructure**
  - [ ] Azure Database for PostgreSQL (Standard tier)
  - [ ] Azure Cache for Redis (Standard tier)
  - [ ] Azure Cosmos DB (Standard tier)
  - [ ] Azure Storage Account (Standard tier)
  - [ ] Azure Service Bus (Standard tier)
  - [ ] Azure Container Registry
  - [ ] AKS cluster provisioned

- [ ] **Verification**
  - [ ] All pods running and healthy
  - [ ] Secrets synchronized from Key Vault
  - [ ] Database connections successful
  - [ ] External API calls working
  - [ ] Load balancer configured
  - [ ] DNS records updated
  - [ ] SSL certificates valid

### Production Environment

- [ ] **Azure Key Vault Setup**
  - [ ] Key Vault created: `flamoral-prod-kv`
  - [ ] Managed Identity configured
  - [ ] RBAC permissions set (strict least privilege)
  - [ ] Network access restricted (private endpoint)
  - [ ] Soft delete enabled
  - [ ] Purge protection enabled
  - [ ] Backup configured
  - [ ] Audit logging enabled
  - [ ] Alerts configured

- [ ] **Critical Secrets (NEW, NOT FROM DEV/STAGING)**
  - [ ] NEW JWT_SECRET generated (128+ chars)
  - [ ] NEW JWT_ACCESS_SECRET generated (128+ chars)
  - [ ] NEW JWT_REFRESH_SECRET generated (128+ chars)
  - [ ] NEW SERVICE_API_KEY generated (128+ chars)
  - [ ] NEW SESSION_SECRET generated (128+ chars)
  - [ ] Database password (32+ chars, random)
  - [ ] Redis password (32+ chars, random)

- [ ] **Payment Secrets (LIVE KEYS)**
  - [ ] Stripe LIVE secret key (sk_live_...)
  - [ ] Stripe LIVE publishable key (pk_live_...)
  - [ ] Stripe LIVE webhook secret
  - [ ] PCI compliance verified
  - [ ] Webhook endpoints verified

- [ ] **OAuth Secrets (PRODUCTION APPS)**
  - [ ] Google OAuth (production app)
  - [ ] Facebook OAuth (production app)
  - [ ] Apple OAuth (production app)
  - [ ] Callback URLs verified (https://api.flamoral.com/...)

- [ ] **Communication Secrets**
  - [ ] SendGrid API key (production tier)
  - [ ] Twilio credentials (production account)
  - [ ] Firebase Cloud Messaging credentials
  - [ ] Agora credentials (production)

- [ ] **Infrastructure Secrets**
  - [ ] Azure Storage keys (production account)
  - [ ] Azure Service Bus connection strings
  - [ ] Azure Cognitive Services keys
  - [ ] OpenAI API key
  - [ ] Sentry DSN

- [ ] **Monitoring & Analytics**
  - [ ] Application Insights connection string
  - [ ] Mixpanel production token
  - [ ] Google Analytics production ID
  - [ ] PagerDuty integration key
  - [ ] Slack webhook URLs

- [ ] **Kubernetes Configuration**
  - [ ] Namespace created: `flamoral-prod`
  - [ ] External Secrets Operator installed
  - [ ] SecretStore configured with production Key Vault
  - [ ] ExternalSecrets created for all services
  - [ ] Secret refresh interval: 1 hour
  - [ ] ConfigMaps deployed
  - [ ] Resource quotas set
  - [ ] Network policies applied
  - [ ] Pod security policies enforced

- [ ] **Infrastructure (PREMIUM TIER)**
  - [ ] Azure Database for PostgreSQL (Premium tier)
  - [ ] Read replicas configured (2+)
  - [ ] Azure Cache for Redis (Premium tier, clustered)
  - [ ] Azure Cosmos DB (Production tier)
  - [ ] Azure Storage (Premium performance)
  - [ ] Azure Service Bus (Premium tier)
  - [ ] AKS cluster (Production tier, multi-zone)
  - [ ] Auto-scaling configured

- [ ] **Security Hardening**
  - [ ] No debug logging enabled
  - [ ] API documentation disabled
  - [ ] GraphQL playground disabled
  - [ ] Error details redacted
  - [ ] HSTS headers enabled
  - [ ] CSP headers configured
  - [ ] Rate limiting strict
  - [ ] DDoS protection enabled
  - [ ] WAF rules configured
  - [ ] IP whitelisting (if applicable)

- [ ] **High Availability**
  - [ ] Minimum 3 replicas per service
  - [ ] Pod disruption budgets configured
  - [ ] Health checks configured (liveness, readiness)
  - [ ] Resource limits set
  - [ ] Auto-scaling enabled (HPA)
  - [ ] Load balancer redundancy
  - [ ] Database backups automated
  - [ ] Disaster recovery plan documented

- [ ] **Monitoring & Alerting**
  - [ ] Prometheus metrics enabled
  - [ ] Grafana dashboards configured
  - [ ] Azure Monitor alerts set
  - [ ] PagerDuty escalation policies
  - [ ] Error tracking (Sentry)
  - [ ] APM configured
  - [ ] Log aggregation (Azure Log Analytics)
  - [ ] Uptime monitoring (external)

- [ ] **Compliance**
  - [ ] GDPR compliance verified
  - [ ] CCPA compliance verified
  - [ ] Data retention policies configured
  - [ ] Audit logging enabled
  - [ ] Encryption at rest enabled
  - [ ] Encryption in transit enforced (TLS 1.2+)
  - [ ] PCI DSS compliance (Stripe)

- [ ] **Final Verification**
  - [ ] All pods running and healthy
  - [ ] Zero secret sync failures
  - [ ] All health checks passing
  - [ ] External API connectivity verified
  - [ ] Payment processing tested (test transaction)
  - [ ] Email delivery verified
  - [ ] SMS delivery verified
  - [ ] Push notifications verified
  - [ ] OAuth flows tested (all providers)
  - [ ] Load testing completed
  - [ ] Security scan passed
  - [ ] SSL certificates valid (90+ days)
  - [ ] DNS records propagated
  - [ ] CDN configured
  - [ ] Backup restoration tested

## Environment Variable Documentation

### Required for ALL Services

| Variable | Description | Example | Secret? |
|----------|-------------|---------|---------|
| `NODE_ENV` | Environment name | `production` | No |
| `PORT` | Service port | `3000` | No |
| `LOG_LEVEL` | Logging level | `warn` | No |
| `DB_HOST` | Database hostname | `flamoral-prod-postgres...` | No |
| `DB_PORT` | Database port | `5432` | No |
| `DB_NAME` | Database name | `flamoral_prod` | No |
| `DB_USER` | Database username | `flamoral_admin` | No |
| `DB_PASSWORD` | Database password | `***` | **YES** |
| `REDIS_HOST` | Redis hostname | `flamoral-prod-redis...` | No |
| `REDIS_PORT` | Redis port | `6380` | No |
| `REDIS_PASSWORD` | Redis password | `***` | **YES** |
| `JWT_ACCESS_SECRET` | JWT access token secret | `***` | **YES** |
| `JWT_REFRESH_SECRET` | JWT refresh token secret | `***` | **YES** |
| `SERVICE_API_KEY` | Service-to-service auth | `***` | **YES** |

### Service-Specific Requirements

#### Auth Service
- `GOOGLE_CLIENT_SECRET` - OAuth secret
- `FACEBOOK_APP_SECRET` - OAuth secret
- `APPLE_PRIVATE_KEY` - OAuth secret
- `SENDGRID_API_KEY` - Email sending
- `TWILIO_AUTH_TOKEN` - SMS sending

#### Payment Service
- `STRIPE_SECRET_KEY` - Payment processing (sk_live_ for prod)
- `STRIPE_WEBHOOK_SECRET` - Webhook validation

#### Media Service
- `AZURE_STORAGE_KEY` - Blob storage access
- `AZURE_FACE_API_KEY` - Face verification
- `AZURE_CONTENT_MODERATOR_KEY` - Content moderation

#### AI Services
- `OPENAI_API_KEY` - GPT access
- `AI_MODEL_API_KEY` - Custom models

## Secret Rotation Schedule

### Monthly (High-Risk)
- JWT secrets
- Service API keys
- Payment gateway keys

### Quarterly (Medium-Risk)
- Database passwords
- Redis passwords
- Email/SMS API keys

### Bi-Annually (Low-Risk)
- Analytics tokens
- Monitoring keys

## Emergency Procedures

### If Secret is Compromised

1. **Immediate Response (< 5 minutes)**
   ```bash
   # Revoke compromised secret immediately
   az keyvault secret set-attributes \
     --vault-name flamoral-prod-kv \
     --name compromised-secret \
     --enabled false
   ```

2. **Generate New Secret (< 10 minutes)**
   ```bash
   # Generate new secret
   NEW_SECRET=$(openssl rand -base64 64)

   # Store in Key Vault
   az keyvault secret set \
     --vault-name flamoral-prod-kv \
     --name jwt-access-secret \
     --value "$NEW_SECRET"
   ```

3. **Force Refresh (< 15 minutes)**
   ```bash
   # Annotate ExternalSecret to force sync
   kubectl annotate externalsecret flamoral-auth-secrets \
     force-sync="$(date +%s)" \
     --namespace=flamoral-prod

   # Rolling restart
   kubectl rollout restart deployment/auth-service \
     --namespace=flamoral-prod
   ```

4. **Verify (< 30 minutes)**
   ```bash
   # Check secret sync status
   kubectl get externalsecret -n flamoral-prod

   # Verify pods are healthy
   kubectl get pods -n flamoral-prod

   # Check logs for errors
   kubectl logs -n flamoral-prod -l app=auth-service --tail=100
   ```

5. **Post-Incident**
   - Document incident
   - Review access logs
   - Update security procedures
   - Notify stakeholders

## Contacts

- **DevOps Lead:** devops@flamoral.com
- **Security Team:** security@flamoral.com
- **On-Call Engineer:** oncall@flamoral.com
- **Emergency:** PagerDuty incident

---

**Last Updated:** 2025-12-15
**Version:** 1.0.0
