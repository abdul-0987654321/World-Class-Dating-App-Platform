# Flamoral Helm Chart Configuration - Complete Documentation

## Overview
This document provides a comprehensive overview of all Helm chart configurations for the Flamoral dating platform, including all 19+ microservices, AI services, and infrastructure components.

## Table of Contents
1. [Chart Structure](#chart-structure)
2. [Services Configuration](#services-configuration)
3. [Port Assignments](#port-assignments)
4. [Environment-Specific Values](#environment-specific-values)
5. [Deployment Instructions](#deployment-instructions)
6. [Health Check Endpoints](#health-check-endpoints)
7. [Ingress Configuration](#ingress-configuration)

---

## Chart Structure

The Helm charts are organized as follows:

```
infrastructure/helm/
├── flamoral/                    # Main platform chart with all services
│   ├── Chart.yaml
│   ├── values.yaml              # Default values (dev environment)
│   ├── values-dev.yaml          # Development overrides
│   ├── values-staging.yaml      # Staging overrides
│   ├── values-prod.yaml         # Production overrides
│   └── templates/
│       ├── deployment.yaml      # All service deployments
│       ├── service.yaml         # All service definitions
│       ├── hpa.yaml             # Horizontal Pod Autoscalers
│       ├── ingress.yaml         # Ingress rules
│       ├── configmap.yaml       # Configuration maps
│       ├── secrets.yaml         # Secret definitions
│       └── serviceaccount.yaml  # Service accounts
├── flamoral-platform/           # Umbrella chart for full platform
│   ├── Chart.yaml
│   ├── values.yaml
│   ├── values-dev.yaml
│   ├── values-staging.yaml
│   └── values-prod.yaml
├── dating-api/                  # Standalone API Gateway chart
├── chat-worker/                 # Chat worker service chart
├── media-processor/             # Media processing service chart
└── dating-app/                  # Frontend application chart
```

---

## Services Configuration

### Core Backend Services

#### 1. API Gateway
- **Port:** 4000
- **Image:** `flamoralacr.azurecr.io/api-gateway`
- **Replicas:**
  - Dev: 2
  - Staging: 3
  - Prod: 5
- **Resources:**
  - Requests: 512Mi RAM, 500m CPU
  - Limits: 1Gi RAM, 1000m CPU
- **Health Checks:**
  - Liveness: `/health/live`
  - Readiness: `/health/ready`

#### 2. Auth Service
- **Port:** 3001
- **Image:** `flamoralacr.azurecr.io/auth-service`
- **Replicas:**
  - Dev: 2
  - Staging: 3
  - Prod: 5
- **Resources:**
  - Requests: 512Mi RAM, 500m CPU
  - Limits: 1Gi RAM, 1000m CPU

#### 3. User Service
- **Port:** 3002
- **Image:** `flamoralacr.azurecr.io/user-service`
- **Replicas:**
  - Dev: 2
  - Staging: 2
  - Prod: 3

#### 4. Messaging Service
- **Port:** 3004
- **Image:** `flamoralacr.azurecr.io/messaging-service`
- **Replicas:**
  - Dev: 2
  - Staging: 3
  - Prod: 5

#### 5. Payment Service
- **Port:** 3005
- **Image:** `flamoralacr.azurecr.io/payment-service`
- **Replicas:**
  - Dev: 2
  - Staging: 2
  - Prod: 3
- **Special Configuration:**
  - Pod Disruption Budget enabled in production
  - Minimum 2 pods available at all times

#### 6. Media Service
- **Port:** 3006
- **Image:** `flamoralacr.azurecr.io/media-service`
- **Replicas:**
  - Dev: 2
  - Staging: 2
  - Prod: 4
- **Resources:**
  - Requests: 1Gi RAM, 1000m CPU
  - Limits: 2Gi RAM, 2000m CPU

#### 7. Analytics Service
- **Port:** 3007
- **Image:** `flamoralacr.azurecr.io/analytics-service`
- **Replicas:**
  - Dev: 1
  - Staging: 2
  - Prod: 2

#### 8. Moderation Service
- **Port:** 3008
- **Image:** `flamoralacr.azurecr.io/moderation-service`
- **Replicas:**
  - Dev: 1
  - Staging: 2
  - Prod: 3

#### 9. Matching Service
- **Port:** 3009
- **Image:** `flamoralacr.azurecr.io/matching-service`
- **Replicas:**
  - Dev: 2
  - Staging: 2
  - Prod: 4
- **Resources:**
  - Requests: 1Gi RAM, 1000m CPU
  - Limits: 2Gi RAM, 2000m CPU

#### 10. Admin Service
- **Port:** 3010
- **Image:** `flamoralacr.azurecr.io/admin-service`
- **Replicas:**
  - Dev: 1
  - Staging: 2
  - Prod: 2
- **Resources:**
  - Requests: 256Mi RAM, 250m CPU
  - Limits: 512Mi RAM, 500m CPU

#### 11. Advertising Service
- **Port:** 3011
- **Image:** `flamoralacr.azurecr.io/advertising-service`
- **Replicas:**
  - Dev: 1
  - Staging: 1
  - Prod: 2

#### 12. Notification Service
- **Port:** 3012
- **Image:** `flamoralacr.azurecr.io/notification-service`
- **Replicas:**
  - Dev: 2
  - Staging: 2
  - Prod: 3

#### 13. Policy Service
- **Port:** 3013
- **Image:** `flamoralacr.azurecr.io/policy-service`
- **Replicas:**
  - Dev: 1
  - Staging: 1
  - Prod: 1

#### 14. Automation Service
- **Port:** 3014
- **Image:** `flamoralacr.azurecr.io/automation-service`
- **Replicas:**
  - Dev: 1
  - Staging: 2
  - Prod: 2
- **Resources:**
  - Requests: 512Mi RAM, 500m CPU
  - Limits: 1Gi RAM, 1000m CPU

#### 15. Workflow Engine
- **Port:** 3015
- **Image:** `flamoralacr.azurecr.io/workflow-engine`
- **Replicas:**
  - Dev: 1
  - Staging: 2
  - Prod: 3
- **Resources:**
  - Requests: 512Mi RAM, 500m CPU
  - Limits: 1Gi RAM, 1000m CPU

#### 16. Realtime Service (Go)
- **Port:** 8081
- **Image:** `flamoralacr.azurecr.io/realtime-service`
- **Replicas:**
  - Dev: 2
  - Staging: 3
  - Prod: 4
- **Resources:**
  - Requests: 256Mi RAM, 250m CPU
  - Limits: 512Mi RAM, 500m CPU
- **Health Checks:**
  - Liveness: `/health`
  - Readiness: `/ready`

---

### AI/ML Services

#### 17. Recommendation Service (Python)
- **Port:** 5000
- **Image:** `flamoralacr.azurecr.io/ai-recommendation-service`
- **Replicas:**
  - Dev: 1-2
  - Staging: 2
  - Prod: 3
- **Resources:**
  - Requests: 2Gi RAM, 1000m CPU
  - Limits: 4Gi RAM, 2000m CPU
- **Health Check:** `/health`

#### 18. NLP Service (Python)
- **Port:** 5001
- **Image:** `flamoralacr.azurecr.io/nlp-service`
- **Replicas:** 1
- **Resources:**
  - Requests: 1Gi RAM, 500m CPU
  - Limits: 2Gi RAM, 1000m CPU

#### 19. Photo Analysis Service (Python)
- **Port:** 5002
- **Image:** `flamoralacr.azurecr.io/photo-analysis-service`
- **Replicas:** 1
- **Resources:**
  - Requests: 1Gi RAM, 500m CPU
  - Limits: 2Gi RAM, 1000m CPU

#### 20. Fraud Detection Service (Python)
- **Port:** 5003
- **Image:** `flamoralacr.azurecr.io/fraud-detection-service`
- **Replicas:** 1
- **Resources:**
  - Requests: 1Gi RAM, 500m CPU
  - Limits: 2Gi RAM, 1000m CPU

#### 21. Dating Coach Service (Python)
- **Port:** 5004
- **Image:** `flamoralacr.azurecr.io/dating-coach-service`
- **Replicas:**
  - Dev: 1
  - Staging: 2
  - Prod: 3
- **Resources:**
  - Requests: 1Gi RAM, 500m CPU
  - Limits: 2Gi RAM, 1000m CPU

#### 22. Content Generator Service (Python)
- **Port:** 5005
- **Image:** `flamoralacr.azurecr.io/content-generator-service`
- **Replicas:** 1
- **Resources:**
  - Requests: 1Gi RAM, 500m CPU
  - Limits: 2Gi RAM, 1000m CPU

---

## Port Assignments

### Complete Port Mapping

| Service | Port | Protocol | Type |
|---------|------|----------|------|
| API Gateway | 4000 | HTTP | Node.js |
| Auth Service | 3001 | HTTP | Node.js |
| User Service | 3002 | HTTP | Node.js |
| Messaging Service | 3004 | HTTP | Node.js |
| Payment Service | 3005 | HTTP | Node.js |
| Media Service | 3006 | HTTP | Node.js |
| Analytics Service | 3007 | HTTP | Node.js |
| Moderation Service | 3008 | HTTP | Node.js |
| Matching Service | 3009 | HTTP | Node.js |
| Admin Service | 3010 | HTTP | Node.js |
| Advertising Service | 3011 | HTTP | Node.js |
| Notification Service | 3012 | HTTP | Node.js |
| Policy Service | 3013 | HTTP | Node.js |
| Automation Service | 3014 | HTTP | Node.js |
| Workflow Engine | 3015 | HTTP | Node.js |
| Realtime Service | 8081 | WebSocket/HTTP | Go |
| Recommendation Service | 5000 | HTTP | Python |
| NLP Service | 5001 | HTTP | Python |
| Photo Analysis | 5002 | HTTP | Python |
| Fraud Detection | 5003 | HTTP | Python |
| Dating Coach | 5004 | HTTP | Python |
| Content Generator | 5005 | HTTP | Python |

---

## Environment-Specific Values

### Development (values-dev.yaml)
- **Purpose:** Local development and testing
- **Replicas:** Minimum (1-2 per service)
- **Resources:** Limited (256Mi-1Gi RAM)
- **GPU:** Disabled for AI services
- **Database:**
  - PostgreSQL: 20Gi storage, 0 read replicas
  - Redis: 1 replica, 5Gi storage
  - MongoDB: 1 replica, 10Gi storage
- **Monitoring:** Basic (7d retention)

### Staging (values-staging.yaml)
- **Purpose:** Pre-production testing
- **Replicas:** Medium (2-3 per service)
- **Resources:** Moderate
- **Database:**
  - PostgreSQL: 50Gi storage, 1 read replica
  - Redis: 2 replicas, 10Gi storage
  - MongoDB: 2 replicas, 30Gi storage
- **Monitoring:** Extended (15d retention)

### Production (values-prod.yaml)
- **Purpose:** Live production environment
- **Replicas:** High (2-5 per service)
- **Autoscaling:** Enabled (up to 50 pods for API Gateway)
- **Resources:** Maximum
- **Database:**
  - PostgreSQL: 200Gi storage, 3 read replicas
  - Redis: 3 replicas, 50Gi storage
  - MongoDB: 3 replicas, 100Gi storage
- **Monitoring:** Full (30d retention)
- **Backups:** Daily at 2 AM, 30-day retention
- **Security:** Network policies and pod security policies enabled

---

## Deployment Instructions

### Prerequisites
```bash
# Install Helm 3.x
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Add necessary Helm repositories
helm repo add stable https://charts.helm.sh/stable
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Configure kubectl for your cluster
kubectl config use-context <your-cluster-context>
```

### Deploy to Development
```bash
cd infrastructure/helm

# Create namespace
kubectl create namespace flamoral-dev

# Create Docker registry secret
kubectl create secret docker-registry acr-secret \
  --docker-server=flamoralacr.azurecr.io \
  --docker-username=<ACR_USERNAME> \
  --docker-password=<ACR_PASSWORD> \
  --namespace=flamoral-dev

# Install/upgrade the chart
helm upgrade --install flamoral ./flamoral \
  --namespace flamoral-dev \
  --values ./flamoral/values.yaml \
  --values ./flamoral/values-dev.yaml \
  --set secrets.database.password=<DB_PASSWORD> \
  --set secrets.jwt.secret=<JWT_SECRET> \
  --set secrets.jwt.refreshSecret=<JWT_REFRESH_SECRET>
```

### Deploy to Staging
```bash
cd infrastructure/helm

# Create namespace
kubectl create namespace flamoral-staging

# Create Docker registry secret
kubectl create secret docker-registry acr-secret \
  --docker-server=flamoralacr.azurecr.io \
  --docker-username=<ACR_USERNAME> \
  --docker-password=<ACR_PASSWORD> \
  --namespace=flamoral-staging

# Install/upgrade the chart
helm upgrade --install flamoral ./flamoral \
  --namespace flamoral-staging \
  --values ./flamoral/values.yaml \
  --values ./flamoral/values-staging.yaml \
  --set global.environment=staging \
  --set secrets.database.password=<DB_PASSWORD> \
  --set secrets.jwt.secret=<JWT_SECRET> \
  --set secrets.jwt.refreshSecret=<JWT_REFRESH_SECRET>
```

### Deploy to Production
```bash
cd infrastructure/helm

# Create namespace
kubectl create namespace flamoral-prod

# Create Docker registry secret
kubectl create secret docker-registry acr-secret \
  --docker-server=flamoralacr.azurecr.io \
  --docker-username=<ACR_USERNAME> \
  --docker-password=<ACR_PASSWORD> \
  --namespace=flamoral-prod

# Install/upgrade the chart (DRY RUN first!)
helm upgrade --install flamoral ./flamoral \
  --namespace flamoral-prod \
  --values ./flamoral/values.yaml \
  --values ./flamoral/values-prod.yaml \
  --set global.environment=production \
  --set secrets.database.password=<DB_PASSWORD> \
  --set secrets.jwt.secret=<JWT_SECRET> \
  --set secrets.jwt.refreshSecret=<JWT_REFRESH_SECRET> \
  --dry-run --debug

# If dry-run looks good, deploy for real
helm upgrade --install flamoral ./flamoral \
  --namespace flamoral-prod \
  --values ./flamoral/values.yaml \
  --values ./flamoral/values-prod.yaml \
  --set global.environment=production \
  --set secrets.database.password=<DB_PASSWORD> \
  --set secrets.jwt.secret=<JWT_SECRET> \
  --set secrets.jwt.refreshSecret=<JWT_REFRESH_SECRET>
```

### Verify Deployment
```bash
# Check all pods
kubectl get pods -n flamoral-prod

# Check services
kubectl get svc -n flamoral-prod

# Check ingress
kubectl get ingress -n flamoral-prod

# View logs for a specific service
kubectl logs -f deployment/flamoral-api-gateway -n flamoral-prod

# Check pod health
kubectl describe pod <pod-name> -n flamoral-prod
```

---

## Health Check Endpoints

### Node.js Services
All Node.js services (ports 3001-3015, 4000) expose:
- **Liveness:** `GET /health/live` - Returns 200 if service is running
- **Readiness:** `GET /health/ready` - Returns 200 if service is ready to accept traffic

### Go Services
Realtime service (port 8081) exposes:
- **Liveness:** `GET /health` - Returns 200 if service is running
- **Readiness:** `GET /ready` - Returns 200 if service is ready

### Python Services
All Python/AI services (ports 5000-5005) expose:
- **Health:** `GET /health` - Returns 200 if service is healthy

### Example Health Check Responses

**Node.js Services:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-16T10:30:00.000Z",
  "uptime": 86400,
  "service": "auth-service",
  "version": "1.0.0"
}
```

**Python Services:**
```json
{
  "status": "healthy",
  "service": "recommendation-service",
  "version": "1.0.0",
  "model_loaded": true
}
```

---

## Ingress Configuration

### Domains and Routing

#### Production
- **Main API:** `api.flamoral.com` → API Gateway (port 4000)
- **Main Web:** `flamoral.com`, `www.flamoral.com` → API Gateway
- **WebSocket:** `ws.flamoral.com` → Realtime Service (port 8081)
- **Admin:** `admin.flamoral.com` → Admin Service (port 3010)

#### Staging
- **Main API:** `api-staging.flamoral.com` → API Gateway
- **Main Web:** `staging.flamoral.com` → API Gateway
- **Admin:** `admin-staging.flamoral.com` → Admin Service

#### Development
- **Main API:** `api-dev.flamoral.com` → API Gateway
- **Main Web:** `dev.flamoral.com` → API Gateway

### TLS/SSL Configuration
All ingresses use cert-manager with Let's Encrypt for automatic SSL certificate provisioning:

```yaml
annotations:
  cert-manager.io/cluster-issuer: letsencrypt-prod
  nginx.ingress.kubernetes.io/ssl-redirect: "true"
  nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
```

### Rate Limiting
API Gateway has rate limiting configured:
```yaml
annotations:
  nginx.ingress.kubernetes.io/rate-limit: "100"
```

### WebSocket Support
Realtime service has WebSocket support enabled:
```yaml
annotations:
  nginx.ingress.kubernetes.io/websocket-services: "realtime-service"
```

---

## Autoscaling Configuration

### Horizontal Pod Autoscaler (HPA)

All services have HPA configured based on:
- **CPU Utilization:** 70% target
- **Memory Utilization:** 80% target

**Example for API Gateway (Production):**
- Min Replicas: 5
- Max Replicas: 50
- Scale up when CPU > 70% or Memory > 80%
- Scale down when below threshold for 5 minutes

### Autoscaling by Service

| Service | Dev Min/Max | Staging Min/Max | Prod Min/Max |
|---------|-------------|-----------------|--------------|
| API Gateway | 2/5 | 3/20 | 5/50 |
| Auth Service | 2/5 | 3/15 | 5/30 |
| User Service | 1/3 | 2/10 | 3/20 |
| Messaging | 2/5 | 3/20 | 5/40 |
| Matching | 1/3 | 2/12 | 4/25 |
| Realtime | 2/5 | 3/15 | 4/30 |
| Payment | 1/3 | 2/8 | 3/15 |

---

## Secrets Management

### Required Secrets

The following secrets must be configured:

#### Database
- `secrets.database.password` - PostgreSQL password
- `secrets.database.url` - Full connection string (optional)
- `secrets.redis.password` - Redis password (if auth enabled)

#### Authentication
- `secrets.jwt.secret` - JWT signing key (min 32 chars)
- `secrets.jwt.refreshSecret` - JWT refresh token key (min 32 chars)
- `secrets.session.secret` - Session encryption key

#### OAuth Providers
- `secrets.oauth.google.clientId`
- `secrets.oauth.google.clientSecret`
- `secrets.oauth.facebook.appId`
- `secrets.oauth.facebook.appSecret`
- `secrets.oauth.apple.*`

#### Cloud Storage
- `secrets.storage.aws.accessKeyId`
- `secrets.storage.aws.secretAccessKey`
- `secrets.storage.azure.*`

#### Email/SMS
- `secrets.email.sendgrid.apiKey`
- `secrets.sms.twilio.*`

#### Payment Gateways
- `secrets.payment.stripe.*`
- `secrets.payment.paypal.*`

#### AI Services
- `secrets.ai.openai.apiKey`
- `secrets.ai.azure.*`

### Using External Secret Management

For production, integrate with external secret managers:

**Azure Key Vault:**
```yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: flamoral-secrets
spec:
  provider: azure
  parameters:
    keyvaultName: flamoral-prod-kv
    objects: |
      array:
        - objectName: database-password
          objectType: secret
```

**AWS Secrets Manager:**
```yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: flamoral-secrets
spec:
  provider: aws
  parameters:
    objects: |
      - objectName: "flamoral/prod/database"
        objectType: "secretsmanager"
```

---

## Resource Requirements Summary

### Total Resource Requirements

#### Development Environment
- **Total CPU Requests:** ~8 cores
- **Total RAM Requests:** ~16Gi
- **Total CPU Limits:** ~16 cores
- **Total RAM Limits:** ~32Gi
- **Storage:** ~50Gi

#### Staging Environment
- **Total CPU Requests:** ~16 cores
- **Total RAM Requests:** ~32Gi
- **Total CPU Limits:** ~32 cores
- **Total RAM Limits:** ~64Gi
- **Storage:** ~150Gi

#### Production Environment
- **Total CPU Requests:** ~40 cores
- **Total RAM Requests:** ~80Gi
- **Total CPU Limits:** ~80 cores
- **Total RAM Limits:** ~160Gi
- **Storage:** ~500Gi

### Recommended Cluster Sizes

**Development:**
- 3 nodes @ 4 CPU, 16Gi RAM each
- Example: Azure Standard_D4s_v3 or AWS t3.xlarge

**Staging:**
- 4 nodes @ 8 CPU, 32Gi RAM each
- Example: Azure Standard_D8s_v3 or AWS m5.2xlarge

**Production:**
- 6-10 nodes @ 16 CPU, 64Gi RAM each
- Example: Azure Standard_D16s_v3 or AWS m5.4xlarge
- Plus 2-3 GPU nodes for AI services (if enabled)

---

## Troubleshooting

### Common Issues

#### Pods Not Starting
```bash
# Check pod status
kubectl get pods -n flamoral-prod

# Describe problematic pod
kubectl describe pod <pod-name> -n flamoral-prod

# Check logs
kubectl logs <pod-name> -n flamoral-prod

# Common causes:
# - Image pull errors (check acr-secret)
# - Resource constraints (check node capacity)
# - Failed health checks (check application logs)
```

#### Services Not Accessible
```bash
# Check service endpoints
kubectl get endpoints -n flamoral-prod

# Check ingress
kubectl describe ingress flamoral -n flamoral-prod

# Test service internally
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl http://flamoral-api-gateway:4000/health/live
```

#### Database Connection Issues
```bash
# Check secrets
kubectl get secrets -n flamoral-prod
kubectl describe secret flamoral-secrets -n flamoral-prod

# Test database connectivity
kubectl run -it --rm debug --image=postgres --restart=Never -- \
  psql -h <db-host> -U <db-user> -d <db-name>
```

---

## Monitoring and Observability

### Metrics
- **Prometheus:** Scrapes metrics from all services
- **Grafana:** Visualizes metrics and provides dashboards
- **Retention:** 7d (dev), 15d (staging), 30d (production)

### Logging
- **Loki:** Centralized log aggregation
- **Promtail:** Log collection from all pods
- **Format:** JSON for structured logging

### Tracing
- **Jaeger:** Distributed tracing across services
- **Sampling:** 10% (adjustable)

### Dashboards
Pre-configured Grafana dashboards available:
- Service health overview
- Request rates and latency
- Error rates
- Resource utilization
- Database performance

---

## Maintenance and Updates

### Rolling Updates
```bash
# Update image tag
helm upgrade flamoral ./flamoral \
  --namespace flamoral-prod \
  --values ./flamoral/values-prod.yaml \
  --set global.imageTag=v1.2.3 \
  --reuse-values
```

### Rollback
```bash
# List releases
helm list -n flamoral-prod

# Rollback to previous version
helm rollback flamoral -n flamoral-prod

# Rollback to specific revision
helm rollback flamoral 5 -n flamoral-prod
```

### Scaling Individual Services
```bash
# Scale API Gateway to 10 replicas
kubectl scale deployment flamoral-api-gateway --replicas=10 -n flamoral-prod

# Or via Helm
helm upgrade flamoral ./flamoral \
  --namespace flamoral-prod \
  --set apiGateway.replicaCount=10 \
  --reuse-values
```

---

## Security Considerations

### Pod Security
- All pods run as non-root user (UID 1000)
- Read-only root filesystem where possible
- No privilege escalation allowed
- Capabilities dropped (ALL)

### Network Security
- Network policies enabled in production
- Pod-to-pod communication restricted
- Ingress from approved sources only

### Secrets
- Never commit secrets to git
- Use external secret management in production
- Rotate secrets regularly
- Use strong random values (min 32 characters)

---

## Support and Documentation

For additional support:
1. Check service-specific README files in `backend/services/<service-name>/`
2. Review Docker configurations in each service directory
3. Consult the main `ARCHITECTURE.md` for system design
4. Review `DEPLOYMENT_GUIDE.md` for CI/CD pipelines

---

**Last Updated:** 2025-12-16
**Version:** 1.0.0
**Maintained By:** Flamoral DevOps Team
