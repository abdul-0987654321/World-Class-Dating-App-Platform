# Kubernetes Deployment Order - Service Dependencies

## Overview

This document defines the deployment order for all Flamoral microservices based on their dependencies. Services must be deployed in the correct order to ensure proper startup and avoid dependency failures.

---

## Deployment Strategy

### Principles

1. **Infrastructure First**: Deploy databases and message queues before application services
2. **Core Services Second**: Deploy authentication and user management
3. **Business Logic Third**: Deploy feature services that depend on core services
4. **Support Services Fourth**: Deploy analytics, moderation, and notifications
5. **AI Services Fifth**: Deploy ML/AI services that enhance features
6. **Gateway Last**: Deploy API gateway and frontend after all backend services

### Health Check Strategy

Each layer must be fully healthy before proceeding to the next:
- Wait for all pods to be in `Running` state
- Verify readiness probes pass
- Check service endpoints respond to health checks
- Validate database connections (for data services)

---

## Deployment Phases

## Phase 1: Infrastructure Layer

**Deployment Time**: 15-20 minutes
**Dependencies**: None (infrastructure is foundational)

### 1.1 Namespaces

```bash
kubectl apply -f k8s/base/namespace.yaml
```

Creates:
- `flamoral` - Production namespace
- `flamoral-staging` - Staging namespace
- `flamoral-monitoring` - Monitoring tools
- `flamoral-logging` - Logging infrastructure
- `istio-system` - Service mesh (optional)

### 1.2 Secrets & Configuration

```bash
# Apply secrets (from Azure Key Vault or Sealed Secrets)
kubectl apply -f k8s/base/secrets.yaml

# Apply ConfigMaps
kubectl apply -f k8s/base/configmaps.yaml
```

**Secrets Required**:
- Database credentials
- JWT signing keys
- API keys (Stripe, Twilio, SendGrid, Firebase)
- OAuth credentials
- Cloud storage credentials

### 1.3 PostgreSQL Database

```bash
helm install postgres bitnami/postgresql \
  --namespace flamoral \
  --set auth.database=flamoral \
  --set auth.username=flamoral \
  --set auth.password=$DB_PASSWORD \
  --set primary.persistence.size=50Gi \
  --set primary.resources.requests.memory=1Gi \
  --set primary.resources.requests.cpu=500m

# Wait for database
kubectl wait --for=condition=ready pod/postgres-postgresql-0 -n flamoral --timeout=300s
```

**Why First**: All backend services need database access

**Verification**:
```bash
kubectl exec -it postgres-postgresql-0 -n flamoral -- psql -U flamoral -d flamoral -c "SELECT version();"
```

### 1.4 Redis Cache

```bash
helm install redis bitnami/redis \
  --namespace flamoral \
  --set auth.password=$REDIS_PASSWORD \
  --set master.persistence.size=10Gi \
  --set master.resources.requests.memory=512Mi \
  --set master.resources.requests.cpu=250m

# Wait for Redis
kubectl wait --for=condition=ready pod/redis-master-0 -n flamoral --timeout=300s
```

**Why First**: Used for sessions, caching, pub/sub, rate limiting

**Verification**:
```bash
kubectl exec -it redis-master-0 -n flamoral -- redis-cli -a $REDIS_PASSWORD ping
```

### 1.5 RabbitMQ Message Queue

```bash
helm install rabbitmq bitnami/rabbitmq \
  --namespace flamoral \
  --set auth.username=admin \
  --set auth.password=$RABBITMQ_PASSWORD \
  --set persistence.size=10Gi \
  --set resources.requests.memory=512Mi

# Wait for RabbitMQ
kubectl wait --for=condition=ready pod/rabbitmq-0 -n flamoral --timeout=300s
```

**Why First**: Async job processing, event messaging

**Verification**:
```bash
kubectl exec -it rabbitmq-0 -n flamoral -- rabbitmqctl status
```

### 1.6 Elasticsearch (Optional - for search/logs)

```bash
helm install elasticsearch elastic/elasticsearch \
  --namespace flamoral-logging \
  --set replicas=3 \
  --set volumeClaimTemplate.resources.requests.storage=30Gi

# Wait for Elasticsearch
kubectl wait --for=condition=ready pod/elasticsearch-master-0 -n flamoral-logging --timeout=600s
```

**Why Optional**: Can be added later for search and logging

### Phase 1 Verification

```bash
# Check all infrastructure pods
kubectl get pods -n flamoral
kubectl get pods -n flamoral-logging

# Should see:
# postgres-postgresql-0           1/1     Running
# redis-master-0                  1/1     Running
# rabbitmq-0                      1/1     Running
```

---

## Phase 2: Core Services Layer

**Deployment Time**: 10 minutes
**Dependencies**: PostgreSQL, Redis

### 2.1 Auth Service

```bash
kubectl apply -f k8s/deployments/auth-service.yaml

# Or with Helm
helm upgrade --install flamoral ./k8s/helm/flamoral \
  --namespace flamoral \
  --set authService.enabled=true \
  --set authService.replicaCount=2

# Wait for deployment
kubectl wait --for=condition=available deployment/auth-service -n flamoral --timeout=300s
```

**Dependencies**:
- PostgreSQL (users, sessions)
- Redis (session storage, rate limiting)

**Purpose**:
- User registration
- Login/logout
- JWT token generation
- OAuth integration (Google, Facebook)
- Password reset
- 2FA authentication

**Health Check**:
```bash
kubectl port-forward svc/auth-service 3001:80 -n flamoral
curl http://localhost:3001/health
```

**Expected Response**:
```json
{
  "status": "healthy",
  "service": "auth-service",
  "dependencies": {
    "postgres": "connected",
    "redis": "connected"
  }
}
```

### 2.2 User Service

```bash
kubectl apply -f k8s/deployments/user-service.yaml

# Wait for deployment
kubectl wait --for=condition=available deployment/user-service -n flamoral --timeout=300s
```

**Dependencies**:
- auth-service (authentication)
- PostgreSQL (user profiles)
- Redis (caching)

**Purpose**:
- User profile CRUD
- Profile completion
- User preferences
- Location management
- Blocking/reporting users

**Why After Auth**: Needs auth-service for validating tokens

**Health Check**:
```bash
curl http://localhost:3002/health
```

### Phase 2 Verification

```bash
kubectl get deployments -n flamoral

# Should show:
# NAME           READY   UP-TO-DATE   AVAILABLE
# auth-service   2/2     2            2
# user-service   2/2     2            2
```

---

## Phase 3: Business Logic Services

**Deployment Time**: 10-15 minutes
**Dependencies**: Core services, infrastructure

### 3.1 Matching Service

```bash
kubectl apply -f k8s/deployments/matching-service.yaml
kubectl wait --for=condition=available deployment/matching-service -n flamoral --timeout=300s
```

**Dependencies**:
- user-service (user profiles)
- PostgreSQL (matches, swipes, likes)
- Redis (caching algorithm results)
- RabbitMQ (async matching jobs)

**Purpose**:
- Match algorithm
- Profile discovery
- Swipe left/right
- Like management
- Compatibility scoring

**Why Important**: Core dating feature - needs user data

### 3.2 Messaging Service

```bash
kubectl apply -f k8s/deployments/messaging-service.yaml
kubectl wait --for=condition=available deployment/messaging-service -n flamoral --timeout=300s
```

**Dependencies**:
- user-service (sender/receiver validation)
- PostgreSQL (message history)
- RabbitMQ (message delivery)

**Purpose**:
- Send/receive messages
- Conversation threads
- Message encryption
- Read receipts
- Typing indicators

### 3.3 Media Service

```bash
kubectl apply -f k8s/deployments/media-service.yaml
kubectl wait --for=condition=available deployment/media-service -n flamoral --timeout=300s
```

**Dependencies**:
- user-service (user ownership)
- PostgreSQL (media metadata)
- Azure Blob Storage / S3 (file storage)

**Purpose**:
- Photo upload
- Video upload
- Image optimization
- Thumbnail generation
- EXIF data removal

**Storage Requirements**:
- Persistent volume for temp files
- Cloud storage integration

### 3.4 Payment Service

```bash
kubectl apply -f k8s/deployments/payment-service.yaml
kubectl wait --for=condition=available deployment/payment-service -n flamoral --timeout=300s
```

**Dependencies**:
- user-service (user subscriptions)
- PostgreSQL (payment records)
- Stripe API (payment processing)

**Purpose**:
- Subscription management
- Payment processing
- Stripe webhooks
- Premium features
- Refund handling

**Security**: High - handles financial data

### 3.5 Realtime Service (WebSocket)

```bash
kubectl apply -f k8s/deployments/realtime-service.yaml
kubectl wait --for=condition=available deployment/realtime-service -n flamoral --timeout=300s
```

**Dependencies**:
- user-service (authentication)
- Redis (pub/sub, presence)
- RabbitMQ (message fan-out)

**Purpose**:
- WebSocket connections
- Real-time messaging
- Typing indicators
- Online presence
- Live notifications

**Scaling**: Needs sticky sessions (session affinity)

### Phase 3 Verification

```bash
kubectl get pods -n flamoral -l tier=business

# All should show 2/2 READY
```

---

## Phase 4: Support Services

**Deployment Time**: 5-10 minutes
**Dependencies**: Core + Business services

### 4.1 Notification Service

```bash
kubectl apply -f k8s/deployments/notification-service.yaml
kubectl wait --for=condition=available deployment/notification-service -n flamoral --timeout=300s
```

**Dependencies**:
- user-service (user notification preferences)
- RabbitMQ (notification queue)
- SendGrid (email)
- Twilio (SMS)
- Firebase (push notifications)

**Purpose**:
- Push notifications
- Email notifications
- SMS notifications
- In-app notifications
- Notification preferences

### 4.2 Moderation Service

```bash
kubectl apply -f k8s/deployments/moderation-service.yaml
kubectl wait --for=condition=available deployment/moderation-service -n flamoral --timeout=300s
```

**Dependencies**:
- user-service (flagged users)
- PostgreSQL (moderation reports)
- Azure Content Moderator / AWS Rekognition

**Purpose**:
- Content moderation
- User reports
- Image analysis
- Text filtering
- Ban management

### 4.3 Analytics Service

```bash
kubectl apply -f k8s/deployments/analytics-service.yaml
kubectl wait --for=condition=available deployment/analytics-service -n flamoral --timeout=300s
```

**Dependencies**:
- PostgreSQL (analytics data)
- Elasticsearch (search analytics)
- RabbitMQ (event tracking)

**Purpose**:
- User analytics
- Platform metrics
- A/B testing
- Conversion tracking
- Revenue analytics

### 4.4 Advertising Service

```bash
kubectl apply -f k8s/deployments/advertising-service.yaml
kubectl wait --for=condition=available deployment/advertising-service -n flamoral --timeout=300s
```

**Dependencies**:
- user-service (targeting)
- PostgreSQL (ad campaigns)
- analytics-service (performance tracking)

**Purpose**:
- Ad campaigns
- Targeting
- Ad creative management
- Performance optimization
- ROI tracking

---

## Phase 5: AI/ML Services

**Deployment Time**: 10-15 minutes
**Dependencies**: Core + Business services
**Language**: Python (FastAPI)

### 5.1 Dating Coach Service

```bash
kubectl apply -f k8s/deployments/dating-coach-service.yaml
kubectl wait --for=condition=available deployment/dating-coach-service -n flamoral --timeout=300s
```

**Dependencies**:
- user-service (user context)
- OpenAI/Anthropic API

**Purpose**:
- AI dating advice
- Icebreaker suggestions
- Response suggestions
- Profile analysis
- Date ideas

**Resources**: 512Mi-1Gi memory (ML models)

### 5.2 Fraud Detection Service

```bash
kubectl apply -f k8s/deployments/fraud-detection.yaml
kubectl wait --for=condition=available deployment/fraud-detection -n flamoral --timeout=300s
```

**Dependencies**:
- user-service (user behavior)
- PostgreSQL (fraud patterns)

**Purpose**:
- Fake profile detection
- Scam detection
- Bot detection
- Device fingerprinting
- Location analysis

### 5.3 NLP Service

```bash
kubectl apply -f k8s/deployments/nlp-service.yaml
kubectl wait --for=condition=available deployment/nlp-service -n flamoral --timeout=300s
```

**Dependencies**:
- messaging-service (message content)

**Purpose**:
- Sentiment analysis
- Toxicity detection
- Language detection
- Smart replies
- Scam message detection

### 5.4 Photo Analysis Service

```bash
kubectl apply -f k8s/deployments/photo-analysis.yaml
kubectl wait --for=condition=available deployment/photo-analysis -n flamoral --timeout=300s
```

**Dependencies**:
- media-service (photos)
- Azure Face API / AWS Rekognition

**Purpose**:
- Face detection
- Deepfake detection
- Age estimation
- NSFW detection
- Photo quality scoring

**Resources**: 1-2Gi memory (image processing)

### 5.5 Recommendation Service

```bash
kubectl apply -f k8s/deployments/recommendation-service.yaml
kubectl wait --for=condition=available deployment/recommendation-service -n flamoral --timeout=300s
```

**Dependencies**:
- user-service (user profiles)
- matching-service (match history)
- analytics-service (user behavior)

**Purpose**:
- Profile recommendations
- Personalized matches
- Collaborative filtering
- Content-based filtering
- Hybrid recommendations

---

## Phase 6: Gateway & Frontend

**Deployment Time**: 5 minutes
**Dependencies**: ALL backend services

### 6.1 API Gateway

```bash
kubectl apply -f k8s/deployments/api-gateway.yaml
kubectl wait --for=condition=available deployment/api-gateway -n flamoral --timeout=300s
```

**Dependencies**:
- ALL backend services (routes to all)

**Purpose**:
- Request routing
- Rate limiting
- Authentication middleware
- Request/response transformation
- Circuit breaking
- Health aggregation

**Critical**: Must be deployed LAST (depends on everything)

**Routes**:
```
/api/v1/auth/*           → auth-service
/api/v1/users/*          → user-service
/api/v1/matches/*        → matching-service
/api/v1/messages/*       → messaging-service
/api/v1/media/*          → media-service
/api/v1/payments/*       → payment-service
/api/v1/notifications/*  → notification-service
/api/v1/analytics/*      → analytics-service
```

### 6.2 Web Frontend

```bash
kubectl apply -f k8s/deployments/web.yaml
kubectl wait --for=condition=available deployment/web -n flamoral --timeout=300s
```

**Dependencies**:
- api-gateway (API access)

**Purpose**:
- React SPA
- Static file serving (NGINX)
- Client-side routing

---

## Phase 7: Ingress & Networking

**Deployment Time**: 5 minutes

### 7.1 Ingress Controller

```bash
# Install NGINX Ingress Controller
helm install nginx-ingress ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.replicaCount=2 \
  --set controller.metrics.enabled=true

kubectl wait --for=condition=available deployment/nginx-ingress-ingress-nginx-controller \
  -n ingress-nginx --timeout=300s
```

### 7.2 Ingress Resources

```bash
kubectl apply -f k8s/ingress/nginx-ingress.yaml

# Verify ingress
kubectl get ingress -n flamoral
```

**Ingress Routes**:
- `flamoral.com/` → web service
- `api.flamoral.com/` → api-gateway
- `api.flamoral.com/ws` → realtime-service

### 7.3 TLS Certificates

```bash
# Install cert-manager (if not installed)
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer for Let's Encrypt
kubectl apply -f k8s/ingress/cert-issuer.yaml

# Certificates will be auto-provisioned
```

---

## Phase 8: Autoscaling & Policies

**Deployment Time**: 2-5 minutes

### 8.1 Horizontal Pod Autoscalers

```bash
kubectl apply -f k8s/base/hpa.yaml

# Verify HPA
kubectl get hpa -n flamoral
```

**HPA Deployed For**:
- All backend services
- All AI services
- Frontend

### 8.2 Pod Disruption Budgets

```bash
kubectl apply -f k8s/base/pdb.yaml

# Verify PDB
kubectl get pdb -n flamoral
```

**Purpose**: Ensure minimum availability during:
- Node maintenance
- Cluster upgrades
- Rollouts

### 8.3 Network Policies (Optional)

```bash
kubectl apply -f k8s/base/network-policies.yaml
```

**Purpose**: Restrict pod-to-pod communication

---

## Complete Deployment Script

```bash
#!/bin/bash
set -e

echo "=== Phase 1: Infrastructure ==="
kubectl apply -f k8s/base/namespace.yaml
kubectl apply -f k8s/base/secrets.yaml
kubectl apply -f k8s/base/configmaps.yaml

# Deploy databases
helm install postgres bitnami/postgresql --namespace flamoral --wait
helm install redis bitnami/redis --namespace flamoral --wait
helm install rabbitmq bitnami/rabbitmq --namespace flamoral --wait

echo "=== Phase 2: Core Services ==="
kubectl apply -f k8s/deployments/auth-service.yaml
kubectl wait --for=condition=available deployment/auth-service -n flamoral --timeout=300s

kubectl apply -f k8s/deployments/user-service.yaml
kubectl wait --for=condition=available deployment/user-service -n flamoral --timeout=300s

echo "=== Phase 3: Business Services ==="
kubectl apply -f k8s/deployments/matching-service.yaml
kubectl apply -f k8s/deployments/messaging-service.yaml
kubectl apply -f k8s/deployments/media-service.yaml
kubectl apply -f k8s/deployments/payment-service.yaml
kubectl apply -f k8s/deployments/realtime-service.yaml
kubectl wait --for=condition=available deployment/matching-service -n flamoral --timeout=300s
kubectl wait --for=condition=available deployment/messaging-service -n flamoral --timeout=300s
kubectl wait --for=condition=available deployment/media-service -n flamoral --timeout=300s
kubectl wait --for=condition=available deployment/payment-service -n flamoral --timeout=300s
kubectl wait --for=condition=available deployment/realtime-service -n flamoral --timeout=300s

echo "=== Phase 4: Support Services ==="
kubectl apply -f k8s/deployments/notification-service.yaml
kubectl apply -f k8s/deployments/moderation-service.yaml
kubectl apply -f k8s/deployments/analytics-service.yaml
kubectl apply -f k8s/deployments/advertising-service.yaml
kubectl wait --for=condition=available deployment/notification-service -n flamoral --timeout=300s
kubectl wait --for=condition=available deployment/moderation-service -n flamoral --timeout=300s
kubectl wait --for=condition=available deployment/analytics-service -n flamoral --timeout=300s
kubectl wait --for=condition=available deployment/advertising-service -n flamoral --timeout=300s

echo "=== Phase 5: AI Services ==="
kubectl apply -f k8s/deployments/dating-coach-service.yaml
kubectl apply -f k8s/deployments/fraud-detection.yaml
kubectl apply -f k8s/deployments/nlp-service.yaml
kubectl apply -f k8s/deployments/photo-analysis.yaml
kubectl apply -f k8s/deployments/recommendation-service.yaml

echo "=== Phase 6: Gateway & Frontend ==="
kubectl apply -f k8s/deployments/api-gateway.yaml
kubectl wait --for=condition=available deployment/api-gateway -n flamoral --timeout=300s

kubectl apply -f k8s/deployments/web.yaml
kubectl wait --for=condition=available deployment/web -n flamoral --timeout=300s

echo "=== Phase 7: Ingress ==="
kubectl apply -f k8s/ingress/nginx-ingress.yaml

echo "=== Phase 8: Autoscaling ==="
kubectl apply -f k8s/base/hpa.yaml
kubectl apply -f k8s/base/pdb.yaml

echo "=== Deployment Complete ==="
kubectl get pods -n flamoral
kubectl get svc -n flamoral
kubectl get ingress -n flamoral
```

---

## Service Dependency Matrix

| Service | Depends On | Why |
|---------|-----------|-----|
| **postgres** | - | Database foundation |
| **redis** | - | Cache foundation |
| **rabbitmq** | - | Message queue foundation |
| **auth-service** | postgres, redis | User auth data, session storage |
| **user-service** | auth-service, postgres, redis | Token validation, user data |
| **matching-service** | user-service, postgres, redis, rabbitmq | User profiles, match data, async jobs |
| **messaging-service** | user-service, postgres, rabbitmq | Message validation, storage, delivery |
| **media-service** | user-service, postgres | Media ownership, metadata |
| **payment-service** | user-service, postgres | User subscriptions, payment records |
| **realtime-service** | user-service, redis, rabbitmq | Auth, pub/sub, message delivery |
| **notification-service** | user-service, rabbitmq | User preferences, notification queue |
| **moderation-service** | user-service, postgres | Flagged content, reports |
| **analytics-service** | postgres, elasticsearch | Data storage, search |
| **advertising-service** | user-service, postgres, analytics-service | Targeting, campaigns, tracking |
| **dating-coach** | user-service | User context |
| **fraud-detection** | user-service, postgres | User behavior, patterns |
| **nlp-service** | messaging-service | Message content |
| **photo-analysis** | media-service | Photo processing |
| **recommendation** | user-service, matching-service, analytics-service | Profiles, history, behavior |
| **api-gateway** | ALL backend services | Routes to everything |
| **web** | api-gateway | API access |

---

## Troubleshooting Deployment Issues

### Service Won't Start

```bash
# Check pod status
kubectl describe pod <pod-name> -n flamoral

# Check logs
kubectl logs <pod-name> -n flamoral

# Common issues:
# - Missing secrets
# - Database not ready
# - Config errors
```

### Database Connection Failures

```bash
# Test database connectivity
kubectl exec -it <service-pod> -n flamoral -- sh
nc -zv postgres 5432

# Check credentials
kubectl get secret flamoral-secrets -n flamoral -o yaml
```

### Service Dependency Timeout

```bash
# Check if dependency is running
kubectl get pods -n flamoral | grep <dependency>

# Check service endpoint
kubectl get endpoints <dependency> -n flamoral

# Port forward and test
kubectl port-forward svc/<dependency> 8080:80 -n flamoral
curl http://localhost:8080/health
```

---

## Rollback Procedure

If deployment fails at any phase:

```bash
# Rollback specific service
kubectl rollout undo deployment/<service-name> -n flamoral

# Rollback entire stack (Helm)
helm rollback flamoral -n flamoral

# Check rollback status
kubectl rollout status deployment/<service-name> -n flamoral
```

---

**Last Updated**: 2025-12-08
**Version**: 1.0.0
