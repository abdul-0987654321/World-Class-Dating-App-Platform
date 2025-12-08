# Kubernetes Deployment Architecture - Flamoral Dating Platform

## Table of Contents
- [Overview](#overview)
- [Architecture Diagram](#architecture-diagram)
- [Microservices Inventory](#microservices-inventory)
- [Deployment Manifests](#deployment-manifests)
- [Service Definitions](#service-definitions)
- [ConfigMaps and Secrets](#configmaps-and-secrets)
- [Ingress Configuration](#ingress-configuration)
- [Horizontal Pod Autoscaling](#horizontal-pod-autoscaling)
- [Resource Limits and Requests](#resource-limits-and-requests)
- [Service Dependencies](#service-dependencies)
- [Deployment Order](#deployment-order)
- [Health Checks and Probes](#health-checks-and-probes)
- [Service Mesh (Istio)](#service-mesh-istio)
- [Monitoring and Observability](#monitoring-and-observability)

---

## Overview

The Flamoral Dating Platform is deployed on Kubernetes using a microservices architecture with 15+ services. The deployment uses:

- **Namespace**: `flamoral` (production), `flamoral-staging` (staging)
- **Ingress Controller**: NGINX Ingress
- **Service Mesh**: Istio (optional)
- **Package Manager**: Helm Charts
- **Container Registry**: Docker Hub / Azure Container Registry
- **Domain**: flamoral.com

### Key Features
- High availability with minimum 2 replicas per service
- Horizontal Pod Autoscaling (HPA) for all services
- Pod Disruption Budgets (PDB) for zero-downtime deployments
- TLS/SSL termination at ingress
- WebSocket support for real-time features
- Circuit breaking and retry policies
- Health checks and readiness probes

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Internet                                 │
│                            ↓                                     │
│                    DNS: flamoral.com                             │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    NGINX Ingress Controller                      │
│                    (TLS Termination)                             │
│                                                                   │
│  Routes:                                                         │
│  ├─ flamoral.com/           → web (frontend)                    │
│  ├─ api.flamoral.com/       → api-gateway                       │
│  └─ api.flamoral.com/ws     → realtime-service                  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ↓               ↓               ↓
    ┌─────────────┐  ┌──────────────┐  ┌──────────────┐
    │     Web     │  │ API Gateway  │  │  Realtime    │
    │  (Frontend) │  │   (3000)     │  │  Service     │
    │    (80)     │  │              │  │   (3007)     │
    └─────────────┘  └──────┬───────┘  └──────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
            ↓               ↓               ↓
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │Auth Service  │ │User Service  │ │Matching Svc  │
    │   (3001)     │ │   (3002)     │ │   (3003)     │
    └──────────────┘ └──────────────┘ └──────────────┘
            │               │               │
            ↓               ↓               ↓
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │Messaging Svc │ │Payment Svc   │ │Media Service │
    │   (3004)     │ │   (3005)     │ │   (3006)     │
    └──────────────┘ └──────────────┘ └──────────────┘
            │               │               │
            ↓               ↓               ↓
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │Notification  │ │Moderation    │ │Analytics Svc │
    │   (3008)     │ │   (3009)     │ │   (3010)     │
    └──────────────┘ └──────────────┘ └──────────────┘
            │               │               │
            ↓               ↓               ↓
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │Advertising   │ │AI Services   │ │              │
    │   (3011)     │ │ (Python)     │ │              │
    └──────────────┘ └──────┬───────┘ └──────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
            ↓               ↓               ↓
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │Dating Coach  │ │Fraud Detect  │ │NLP Service   │
    │   (8000)     │ │   (8001)     │ │   (8002)     │
    └──────────────┘ └──────────────┘ └──────────────┘
            │               │               │
            ↓               ↓               ↓
    ┌──────────────┐ ┌──────────────┐
    │Photo Analysis│ │Recommendation│
    │   (8003)     │ │   (8004)     │
    └──────────────┘ └──────────────┘
```

---

## Microservices Inventory

### Backend Services (Node.js/TypeScript)

| Service Name | Port | Replicas | Purpose | Docker Image |
|-------------|------|----------|---------|--------------|
| **api-gateway** | 3000 | 2-10 | API Gateway & routing | flamoral/api-gateway:latest |
| **auth-service** | 3001 | 2-8 | Authentication & authorization | flamoral/auth-service:latest |
| **user-service** | 3002 | 2-10 | User profile management | flamoral/user-service:latest |
| **matching-service** | 3003 | 2-15 | Match algorithm & discovery | flamoral/matching-service:latest |
| **messaging-service** | 3004 | 2-10 | Chat & messaging | flamoral/messaging-service:latest |
| **payment-service** | 3005 | 2-8 | Stripe payments & subscriptions | flamoral/payment-service:latest |
| **media-service** | 3006 | 2-8 | Photo/video upload & processing | flamoral/media-service:latest |
| **realtime-service** | 3007 | 2-15 | WebSocket connections | flamoral/realtime-service:latest |
| **notification-service** | 3008 | 2-8 | Push, email, SMS notifications | flamoral/notification-service:latest |
| **moderation-service** | 3009 | 2-6 | Content moderation | flamoral/moderation-service:latest |
| **analytics-service** | 3010 | 2-8 | User analytics & tracking | flamoral/analytics-service:latest |
| **advertising-service** | 3011 | 2-6 | Ad management & targeting | flamoral/advertising-service:latest |

### AI/ML Services (Python/FastAPI)

| Service Name | Port | Replicas | Purpose | Docker Image |
|-------------|------|----------|---------|--------------|
| **dating-coach-service** | 8000 | 2-6 | AI dating advice & coaching | flamoral/dating-coach:latest |
| **fraud-detection** | 8001 | 2-6 | Fraud & scam detection | flamoral/fraud-detection:latest |
| **nlp-service** | 8002 | 2-6 | Natural language processing | flamoral/nlp-service:latest |
| **photo-analysis** | 8003 | 2-6 | Photo verification & analysis | flamoral/photo-analysis:latest |
| **recommendation-service** | 8004 | 2-8 | ML recommendations | flamoral/recommendation-service:latest |

### Frontend

| Service Name | Port | Replicas | Purpose | Docker Image |
|-------------|------|----------|---------|--------------|
| **web** | 80 | 2-10 | React frontend (NGINX) | flamoral/web:latest |

### Infrastructure Services

| Service Name | Port | Purpose |
|-------------|------|---------|
| **postgres** | 5432 | Primary database |
| **redis-master** | 6379 | Cache & sessions |
| **rabbitmq** | 5672 | Message queue |
| **elasticsearch** | 9200 | Search & logs |

---

## Deployment Manifests

### Directory Structure

```
k8s/
├── base/
│   ├── namespace.yaml           # Namespaces definition
│   ├── configmaps.yaml          # Application configuration
│   ├── secrets.yaml             # Secrets template
│   ├── hpa.yaml                 # Horizontal Pod Autoscalers
│   ├── pdb.yaml                 # Pod Disruption Budgets
│   └── network-policies.yaml   # Network policies
├── helm/
│   └── flamoral/
│       ├── Chart.yaml
│       ├── values.yaml          # Default values
│       ├── values-dev.yaml      # Development overrides
│       ├── values-prod.yaml     # Production overrides
│       └── templates/
│           ├── deployment-api-gateway.yaml
│           ├── deployment-services.yaml
│           ├── ingress.yaml
│           ├── configmap.yaml
│           ├── secrets.yaml
│           ├── serviceaccount.yaml
│           ├── hpa.yaml
│           └── pdb.yaml
├── ingress/
│   └── nginx-ingress.yaml       # Ingress rules
└── service-mesh/
    ├── istio-installation.yaml
    └── virtual-services.yaml    # Istio routing
```

### Example Deployment: API Gateway

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: flamoral
  labels:
    app: api-gateway
    version: v1
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
        version: v1
    spec:
      serviceAccountName: flamoral-sa
      containers:
      - name: api-gateway
        image: flamoral/api-gateway:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
          name: http
          protocol: TCP
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        envFrom:
        - configMapRef:
            name: flamoral-config
        - secretRef:
            name: flamoral-secrets
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
```

---

## Service Definitions

### API Gateway Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
  namespace: flamoral
  labels:
    app: api-gateway
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
    name: http
  selector:
    app: api-gateway
```

### Service Template for All Microservices

All backend services follow this pattern:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: <service-name>
  namespace: flamoral
  labels:
    app: <service-name>
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: <service-port>
    protocol: TCP
    name: http
  selector:
    app: <service-name>
```

**Service List:**
- auth-service (targetPort: 3001)
- user-service (targetPort: 3002)
- matching-service (targetPort: 3003)
- messaging-service (targetPort: 3004)
- payment-service (targetPort: 3005)
- media-service (targetPort: 3006)
- realtime-service (targetPort: 3007)
- notification-service (targetPort: 3008)
- moderation-service (targetPort: 3009)
- analytics-service (targetPort: 3010)
- advertising-service (targetPort: 3011)

**AI Services:**
- dating-coach-service (targetPort: 8000)
- fraud-detection (targetPort: 8001)
- nlp-service (targetPort: 8002)
- photo-analysis (targetPort: 8003)
- recommendation-service (targetPort: 8004)

---

## ConfigMaps and Secrets

### Application ConfigMap

Location: `k8s/base/configmaps.yaml`

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: flamoral-config
  namespace: flamoral
data:
  # Node Environment
  NODE_ENV: "production"

  # Service URLs (internal)
  AUTH_SERVICE_URL: "http://auth-service:3001"
  USER_SERVICE_URL: "http://user-service:3002"
  MATCHING_SERVICE_URL: "http://matching-service:3003"
  MESSAGING_SERVICE_URL: "http://messaging-service:3004"
  MEDIA_SERVICE_URL: "http://media-service:3006"
  NOTIFICATION_SERVICE_URL: "http://notification-service:3008"
  REALTIME_SERVICE_URL: "http://realtime-service:3007"
  PAYMENT_SERVICE_URL: "http://payment-service:3005"
  MODERATION_SERVICE_URL: "http://moderation-service:3009"
  ANALYTICS_SERVICE_URL: "http://analytics-service:3010"
  ADVERTISING_SERVICE_URL: "http://advertising-service:3011"

  # Database Configuration
  DB_HOST: "postgres"
  DB_PORT: "5432"
  DB_NAME: "flamoral"

  # Redis Configuration
  REDIS_HOST: "redis-master"
  REDIS_PORT: "6379"

  # RabbitMQ Configuration
  RABBITMQ_HOST: "rabbitmq"
  RABBITMQ_PORT: "5672"

  # CORS Origins
  CORS_ORIGINS: "https://flamoral.com,https://www.flamoral.com,https://app.flamoral.com"

  # Feature Flags
  ENABLE_MATCHING_ALGORITHM: "true"
  ENABLE_VIDEO_CHAT: "true"
  ENABLE_VOICE_CHAT: "true"
  ENABLE_SPEED_DATING: "true"
  ENABLE_COMMUNITY_EVENTS: "true"
  ENABLE_GAMIFICATION: "true"

  # Rate Limiting
  RATE_LIMIT_WINDOW_MS: "60000"
  RATE_LIMIT_MAX_REQUESTS: "100"

  # Upload Limits
  MAX_FILE_SIZE: "10485760"
  MAX_VIDEO_SIZE: "52428800"

  # WebSocket Configuration
  WS_HEARTBEAT_INTERVAL: "30000"
  WS_CONNECTION_TIMEOUT: "60000"
```

### Secrets Reference

Location: `k8s/base/secrets.yaml`

**IMPORTANT**: This is a template. In production:
1. Use **Azure Key Vault** with External Secrets Operator
2. Use **Sealed Secrets** for GitOps
3. Never commit actual secrets to git

Required secrets:
- Database credentials (DATABASE_URL, DB_PASSWORD)
- JWT secrets (JWT_SECRET, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET)
- Redis password
- RabbitMQ credentials
- OAuth provider keys (Google, Facebook)
- SendGrid API key
- Twilio credentials
- Firebase credentials
- AWS/Azure credentials
- Stripe keys
- Sentry DSN
- Agora credentials
- Encryption keys

---

## Ingress Configuration

### Main Ingress Resource

Location: `k8s/ingress/nginx-ingress.yaml`

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: flamoral-ingress
  namespace: flamoral
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/ssl-protocols: "TLSv1.2 TLSv1.3"
    nginx.ingress.kubernetes.io/limit-rps: "100"
    nginx.ingress.kubernetes.io/limit-connections: "20"
    nginx.ingress.kubernetes.io/enable-cors: "true"
    nginx.ingress.kubernetes.io/websocket-services: "realtime-service"
    nginx.ingress.kubernetes.io/affinity: "cookie"
    nginx.ingress.kubernetes.io/session-cookie-name: "FLAMORAL_AFFINITY"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - flamoral.com
    - www.flamoral.com
    - api.flamoral.com
    secretName: flamoral-tls
  rules:
  # Main domain - Web Frontend
  - host: flamoral.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web
            port:
              number: 80

  # API subdomain
  - host: api.flamoral.com
    http:
      paths:
      # API Gateway
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-gateway
            port:
              number: 3000

      # WebSocket endpoint
      - path: /ws
        pathType: Prefix
        backend:
          service:
            name: realtime-service
            port:
              number: 3007

      # Health checks
      - path: /health
        pathType: Prefix
        backend:
          service:
            name: api-gateway
            port:
              number: 3000
```

### Ingress Routing Summary

| Domain | Path | Service | Port | Purpose |
|--------|------|---------|------|---------|
| flamoral.com | / | web | 80 | Frontend application |
| www.flamoral.com | / | web | 80 | Frontend (www redirect) |
| api.flamoral.com | / | api-gateway | 3000 | REST API |
| api.flamoral.com | /ws | realtime-service | 3007 | WebSocket |
| api.flamoral.com | /health | api-gateway | 3000 | Health check |

---

## Horizontal Pod Autoscaling

Location: `k8s/base/hpa.yaml`

### HPA Configuration by Service

| Service | Min Replicas | Max Replicas | CPU Target | Memory Target | Scale Priority |
|---------|--------------|--------------|------------|---------------|----------------|
| api-gateway | 2 | 10 | 70% | 80% | High |
| auth-service | 2 | 8 | 70% | 80% | High |
| user-service | 2 | 10 | 70% | 80% | High |
| matching-service | 2 | 15 | 60% | 75% | Critical |
| messaging-service | 2 | 10 | 70% | 80% | High |
| media-service | 2 | 8 | 60% | 75% | Medium |
| payment-service | 2 | 8 | 70% | 80% | High |
| realtime-service | 2 | 15 | 60% | 75% | Critical |
| notification-service | 2 | 8 | 70% | 80% | Medium |
| moderation-service | 2 | 6 | 70% | 80% | Low |
| analytics-service | 2 | 8 | 70% | 80% | Medium |
| advertising-service | 2 | 6 | 70% | 80% | Low |
| web | 2 | 10 | 70% | 80% | High |

### Example HPA: Matching Service

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: matching-service-hpa
  namespace: flamoral
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: matching-service
  minReplicas: 2
  maxReplicas: 15
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 75
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 15
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
      - type: Pods
        value: 2
        periodSeconds: 15
      selectPolicy: Max
```

---

## Resource Limits and Requests

### Resource Allocation by Service

| Service | CPU Request | CPU Limit | Memory Request | Memory Limit | Storage |
|---------|-------------|-----------|----------------|--------------|---------|
| **api-gateway** | 100m | 500m | 256Mi | 512Mi | - |
| **auth-service** | 100m | 500m | 256Mi | 512Mi | - |
| **user-service** | 100m | 500m | 256Mi | 512Mi | - |
| **matching-service** | 200m | 1000m | 512Mi | 1Gi | - |
| **messaging-service** | 100m | 500m | 256Mi | 512Mi | - |
| **media-service** | 200m | 1000m | 512Mi | 1Gi | 10Gi |
| **payment-service** | 100m | 500m | 256Mi | 512Mi | - |
| **realtime-service** | 200m | 1000m | 512Mi | 1Gi | - |
| **notification-service** | 100m | 500m | 256Mi | 512Mi | - |
| **moderation-service** | 100m | 500m | 256Mi | 512Mi | - |
| **analytics-service** | 150m | 750m | 384Mi | 768Mi | - |
| **advertising-service** | 100m | 500m | 256Mi | 512Mi | - |
| **web** | 50m | 200m | 128Mi | 256Mi | - |

### AI/ML Services

| Service | CPU Request | CPU Limit | Memory Request | Memory Limit |
|---------|-------------|-----------|----------------|--------------|
| **dating-coach** | 200m | 1000m | 512Mi | 1Gi |
| **fraud-detection** | 200m | 1000m | 512Mi | 1Gi |
| **nlp-service** | 200m | 1000m | 512Mi | 1Gi |
| **photo-analysis** | 300m | 1500m | 1Gi | 2Gi |
| **recommendation** | 200m | 1000m | 512Mi | 1Gi |

### Total Resource Requirements

**Production Cluster (Minimum)**:
- **CPU**: ~20 cores (with autoscaling headroom)
- **Memory**: ~40 GB RAM
- **Storage**: ~50 GB (media + logs)

**Recommended Node Pool**:
- 3-5 nodes
- 8 vCPUs per node
- 16 GB RAM per node
- SSD storage

---

## Service Dependencies

### Dependency Graph

```
Infrastructure Layer (Deploy First):
├── PostgreSQL
├── Redis
├── RabbitMQ
└── Elasticsearch

Core Services Layer (Deploy Second):
├── auth-service (depends on: postgres, redis)
└── user-service (depends on: postgres, redis, auth-service)

Business Logic Layer (Deploy Third):
├── matching-service (depends on: user-service, postgres, redis, rabbitmq)
├── messaging-service (depends on: user-service, postgres, rabbitmq)
├── payment-service (depends on: user-service, postgres)
├── media-service (depends on: user-service, postgres, S3/Azure Storage)
└── realtime-service (depends on: user-service, redis, rabbitmq)

Support Services Layer (Deploy Fourth):
├── notification-service (depends on: user-service, rabbitmq)
├── moderation-service (depends on: user-service, postgres)
├── analytics-service (depends on: postgres, elasticsearch)
└── advertising-service (depends on: user-service, postgres)

AI Services Layer (Deploy Fifth):
├── dating-coach-service (depends on: user-service)
├── fraud-detection (depends on: user-service, postgres)
├── nlp-service (depends on: messaging-service)
├── photo-analysis (depends on: media-service)
└── recommendation-service (depends on: user-service, matching-service)

Gateway & Frontend Layer (Deploy Last):
├── api-gateway (depends on: all backend services)
└── web (depends on: api-gateway)
```

### Critical Dependencies

**auth-service** requires:
- PostgreSQL (database)
- Redis (sessions, rate limiting)

**user-service** requires:
- auth-service (authentication)
- PostgreSQL (user data)
- Redis (caching)

**matching-service** requires:
- user-service (user profiles)
- PostgreSQL (matches)
- Redis (caching)
- RabbitMQ (async matching)

**realtime-service** requires:
- user-service (authentication)
- Redis (pub/sub, presence)
- RabbitMQ (message delivery)

**api-gateway** requires:
- ALL backend services (routing)

---

## Deployment Order

### Phase 1: Infrastructure (15-20 minutes)

```bash
# 1. Create namespaces
kubectl apply -f k8s/base/namespace.yaml

# 2. Deploy secrets (from Azure Key Vault or Sealed Secrets)
kubectl apply -f k8s/base/secrets.yaml

# 3. Deploy ConfigMaps
kubectl apply -f k8s/base/configmaps.yaml

# 4. Deploy PostgreSQL
helm install postgres bitnami/postgresql \
  --namespace flamoral \
  --set auth.database=flamoral \
  --set primary.persistence.size=50Gi

# 5. Deploy Redis
helm install redis bitnami/redis \
  --namespace flamoral \
  --set master.persistence.size=10Gi

# 6. Deploy RabbitMQ
helm install rabbitmq bitnami/rabbitmq \
  --namespace flamoral \
  --set auth.username=admin

# 7. Deploy Elasticsearch (optional)
helm install elasticsearch elastic/elasticsearch \
  --namespace flamoral-logging
```

### Phase 2: Core Services (10 minutes)

```bash
# Deploy using Helm
helm install flamoral ./k8s/helm/flamoral \
  --namespace flamoral \
  --set global.environment=production \
  --set authService.enabled=true \
  --set userService.enabled=true

# Or deploy individually
kubectl apply -f k8s/deployments/auth-service.yaml
kubectl apply -f k8s/deployments/user-service.yaml

# Wait for services to be ready
kubectl wait --for=condition=available --timeout=300s \
  deployment/auth-service -n flamoral
kubectl wait --for=condition=available --timeout=300s \
  deployment/user-service -n flamoral
```

### Phase 3: Business Logic Services (10 minutes)

```bash
# Enable all business services
helm upgrade flamoral ./k8s/helm/flamoral \
  --namespace flamoral \
  --set matchingService.enabled=true \
  --set messagingService.enabled=true \
  --set paymentService.enabled=true \
  --set mediaService.enabled=true \
  --set realtimeService.enabled=true

# Wait for rollout
kubectl rollout status deployment/matching-service -n flamoral
kubectl rollout status deployment/messaging-service -n flamoral
kubectl rollout status deployment/payment-service -n flamoral
kubectl rollout status deployment/media-service -n flamoral
kubectl rollout status deployment/realtime-service -n flamoral
```

### Phase 4: Support Services (5 minutes)

```bash
helm upgrade flamoral ./k8s/helm/flamoral \
  --namespace flamoral \
  --set notificationService.enabled=true \
  --set moderationService.enabled=true \
  --set analyticsService.enabled=true \
  --set advertisingService.enabled=true
```

### Phase 5: AI/ML Services (10 minutes)

```bash
# Deploy AI services (Python-based)
kubectl apply -f k8s/deployments/dating-coach-service.yaml
kubectl apply -f k8s/deployments/fraud-detection.yaml
kubectl apply -f k8s/deployments/nlp-service.yaml
kubectl apply -f k8s/deployments/photo-analysis.yaml
kubectl apply -f k8s/deployments/recommendation-service.yaml
```

### Phase 6: Gateway & Frontend (5 minutes)

```bash
# Deploy API Gateway
helm upgrade flamoral ./k8s/helm/flamoral \
  --namespace flamoral \
  --set apiGateway.enabled=true

# Deploy Web Frontend
helm upgrade flamoral ./k8s/helm/flamoral \
  --namespace flamoral \
  --set web.enabled=true

# Deploy Ingress
kubectl apply -f k8s/ingress/nginx-ingress.yaml

# Verify ingress
kubectl get ingress -n flamoral
```

### Phase 7: Autoscaling & Policies (2 minutes)

```bash
# Deploy HPA
kubectl apply -f k8s/base/hpa.yaml

# Deploy Pod Disruption Budgets
kubectl apply -f k8s/base/pdb.yaml

# Deploy Network Policies (optional)
kubectl apply -f k8s/base/network-policies.yaml
```

### Total Deployment Time: ~60 minutes

---

## Health Checks and Probes

### Liveness Probe (All Services)

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: http
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

### Readiness Probe (All Services)

```yaml
readinessProbe:
  httpGet:
    path: /health
    port: http
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
```

### Health Check Endpoints

All services expose:
- `GET /health` - Basic health check
- `GET /health/ready` - Readiness check (database connections, etc.)
- `GET /health/live` - Liveness check

Response format:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-08T12:00:00Z",
  "service": "auth-service",
  "version": "1.0.0",
  "checks": {
    "database": "healthy",
    "redis": "healthy",
    "memory": "healthy",
    "cpu": "healthy"
  }
}
```

---

## Service Mesh (Istio)

### Istio Configuration

Location: `k8s/service-mesh/`

**Features:**
- Automatic mTLS between services
- Traffic management & canary deployments
- Circuit breaking
- Retry policies
- Observability (metrics, tracing)

### Virtual Services

Example for api-gateway with canary deployment:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-gateway
  namespace: flamoral
spec:
  hosts:
  - api-gateway
  - api.flamoral.com
  gateways:
  - istio-gateway
  http:
  # Canary: 10% to v2, 90% to v1
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: api-gateway
        subset: v2
      weight: 100
  - route:
    - destination:
        host: api-gateway
        subset: v1
      weight: 90
    - destination:
        host: api-gateway
        subset: v2
      weight: 10
    timeout: 30s
    retries:
      attempts: 3
      perTryTimeout: 10s
      retryOn: 5xx,reset,connect-failure,refused-stream
```

### Circuit Breaking

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api-gateway
  namespace: flamoral
spec:
  host: api-gateway
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 1000
      http:
        http1MaxPendingRequests: 1000
        http2MaxRequests: 1000
        maxRequestsPerConnection: 10
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
      minHealthPercent: 40
    loadBalancer:
      simple: LEAST_REQUEST
```

---

## Monitoring and Observability

### Metrics Collection

**Prometheus Scrape Configuration:**

```yaml
scrape_configs:
- job_name: 'kubernetes-pods'
  kubernetes_sd_configs:
  - role: pod
    namespaces:
      names:
      - flamoral
  relabel_configs:
  - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
    action: keep
    regex: true
  - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]
    action: replace
    target_label: __address__
    regex: ([^:]+)(?::\d+)?;(\d+)
    replacement: $1:$2
```

### Key Metrics to Monitor

**Service Metrics:**
- Request rate (requests/second)
- Error rate (errors/total requests)
- Response time (p50, p95, p99)
- Active connections
- Queue depth

**Infrastructure Metrics:**
- CPU utilization
- Memory usage
- Disk I/O
- Network throughput
- Pod restart count

**Business Metrics:**
- Active users
- Matches created
- Messages sent
- Payment conversions
- API Gateway throughput

### Grafana Dashboards

Recommended dashboards:
1. **Service Overview** - All services health
2. **API Gateway** - Request routing & performance
3. **Database** - PostgreSQL & Redis metrics
4. **Message Queue** - RabbitMQ depth & consumers
5. **User Activity** - Active sessions, matches, messages
6. **Billing** - Payment transactions & revenue

---

## Quick Reference Commands

### Deployment

```bash
# Deploy entire stack
helm install flamoral ./k8s/helm/flamoral \
  --namespace flamoral \
  --values k8s/helm/flamoral/values-prod.yaml

# Upgrade deployment
helm upgrade flamoral ./k8s/helm/flamoral \
  --namespace flamoral \
  --values k8s/helm/flamoral/values-prod.yaml

# Rollback
helm rollback flamoral -n flamoral
```

### Monitoring

```bash
# Check pod status
kubectl get pods -n flamoral

# Check service status
kubectl get svc -n flamoral

# Check ingress
kubectl get ingress -n flamoral

# View logs
kubectl logs -f deployment/api-gateway -n flamoral

# Describe deployment
kubectl describe deployment api-gateway -n flamoral

# Check HPA status
kubectl get hpa -n flamoral

# Port forward for testing
kubectl port-forward svc/api-gateway 3000:80 -n flamoral
```

### Scaling

```bash
# Manual scale
kubectl scale deployment api-gateway --replicas=5 -n flamoral

# Update HPA
kubectl patch hpa api-gateway-hpa -n flamoral \
  -p '{"spec":{"maxReplicas":20}}'
```

### Troubleshooting

```bash
# Get events
kubectl get events -n flamoral --sort-by='.lastTimestamp'

# Check resource usage
kubectl top pods -n flamoral
kubectl top nodes

# Exec into pod
kubectl exec -it deployment/api-gateway -n flamoral -- /bin/sh

# Check config
kubectl get configmap flamoral-config -n flamoral -o yaml

# Check secrets (base64 encoded)
kubectl get secret flamoral-secrets -n flamoral -o yaml
```

---

## Next Steps

1. **Set up monitoring**: Deploy Prometheus + Grafana
2. **Configure alerting**: Set up Alertmanager rules
3. **Enable Istio**: For advanced traffic management
4. **Set up CI/CD**: Integrate with Azure DevOps pipelines
5. **Configure backup**: Set up database backups
6. **Performance testing**: Load test the platform
7. **Security audit**: Run security scans

---

## Additional Resources

- [Helm Chart Documentation](../k8s/helm/flamoral/README.md)
- [CI/CD Pipeline Guide](./CI_CD_PIPELINES.md)
- [Architecture Overview](./ARCHITECTURE_OVERVIEW.md)
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)
- [Azure DevOps Setup](./azure-devops-setup.md)

---

**Last Updated**: 2025-12-08
**Version**: 1.0.0
**Maintained by**: DevOps Team
