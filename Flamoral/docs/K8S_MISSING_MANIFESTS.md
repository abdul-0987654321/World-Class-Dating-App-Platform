# Missing Kubernetes Manifests Analysis

## Overview

This document identifies which microservices have Kubernetes deployment manifests and which are missing.

**Generated**: 2025-12-08
**Location**: C:/Users/citad/OneDrive/Documents/Dating/DatingPlatform

---

## Current State

### Existing Helm Chart Templates

The Helm chart at `k8s/helm/flamoral/templates/` currently includes:

#### deployment-api-gateway.yaml
- api-gateway (Deployment + Service + HPA)

#### deployment-services.yaml
1. auth-service (Deployment + Service)
2. user-service (Deployment + Service)
3. matching-service (Deployment + Service)
4. messaging-service (Deployment + Service)
5. media-service (Deployment + Service)
6. notification-service (Deployment + Service)
7. realtime-service (Deployment + Service)
8. web (Frontend - Deployment + Service)

**Total in Helm**: 9 services (8 backend + 1 frontend)

---

## Missing Services

### Backend Node.js Services (Need Manifests)

The following services exist in `backend/services/` but are **NOT** in the Helm chart:

1. **payment-service** (Port 3005)
   - Purpose: Stripe payments, subscriptions
   - Dependencies: user-service, PostgreSQL
   - Priority: HIGH
   - Missing: Deployment, Service, HPA

2. **moderation-service** (Port 3009)
   - Purpose: Content moderation, user reports
   - Dependencies: user-service, PostgreSQL
   - Priority: MEDIUM
   - Missing: Deployment, Service, HPA

3. **analytics-service** (Port 3010)
   - Purpose: User analytics, platform metrics
   - Dependencies: PostgreSQL, Elasticsearch
   - Priority: MEDIUM
   - Missing: Deployment, Service, HPA

4. **advertising-service** (Port 3011)
   - Purpose: Ad campaigns, targeting
   - Dependencies: user-service, PostgreSQL, analytics-service
   - Priority: LOW
   - Missing: Deployment, Service, HPA

### AI/ML Python Services (Need Manifests)

Located in `backend/services/ai-services/`:

1. **dating-coach-service** (Port 8000)
   - Language: Python/FastAPI
   - Purpose: AI dating advice, icebreakers
   - Dependencies: user-service, OpenAI API
   - Priority: MEDIUM
   - Missing: Deployment, Service, HPA

2. **fraud-detection** (Port 8001)
   - Language: Python/FastAPI
   - Purpose: Fake profile detection, scam detection
   - Dependencies: user-service, PostgreSQL
   - Priority: HIGH
   - Missing: Deployment, Service, HPA

3. **nlp-service** (Port 8002)
   - Language: Python/FastAPI
   - Purpose: Sentiment analysis, toxicity detection
   - Dependencies: messaging-service
   - Priority: MEDIUM
   - Missing: Deployment, Service, HPA

4. **photo-analysis** (Port 8003)
   - Language: Python/FastAPI
   - Purpose: Face detection, deepfake detection
   - Dependencies: media-service, Azure Face API
   - Priority: HIGH
   - Missing: Deployment, Service, HPA

5. **recommendation-service** (Port 8004)
   - Language: Python/FastAPI
   - Purpose: ML-based profile recommendations
   - Dependencies: user-service, matching-service, analytics-service
   - Priority: MEDIUM
   - Missing: Deployment, Service, HPA

---

## Missing Manifests Summary

### Total Services: 17
- **Existing in Helm**: 9 (53%)
- **Missing from Helm**: 9 (47%)

### By Priority

**HIGH Priority (Must Deploy)**:
- payment-service
- fraud-detection
- photo-analysis

**MEDIUM Priority (Should Deploy)**:
- moderation-service
- analytics-service
- dating-coach-service
- nlp-service
- recommendation-service

**LOW Priority (Optional)**:
- advertising-service

---

## Recommended Action: Add Missing Services to Helm Chart

### Option 1: Extend deployment-services.yaml

Add missing services to `k8s/helm/flamoral/templates/deployment-services.yaml`:

```yaml
# Add after existing services:

{{/* Payment Service */}}
{{- if .Values.paymentService.enabled }}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "flamoral.fullname" . }}-payment-service
  labels:
    {{- include "flamoral.labels" . | nindent 4 }}
    app.kubernetes.io/component: payment-service
spec:
  # ... (similar to other services)
---
apiVersion: v1
kind: Service
metadata:
  name: payment-service
  # ...
{{- end }}

{{/* Moderation Service */}}
{{- if .Values.moderationService.enabled }}
# ... (similar pattern)
{{- end }}

{{/* Analytics Service */}}
{{- if .Values.analyticsService.enabled }}
# ... (similar pattern)
{{- end }}

{{/* Advertising Service */}}
{{- if .Values.advertisingService.enabled }}
# ... (similar pattern)
{{- end }}
```

### Option 2: Create Separate Template Files

More organized approach:

```
k8s/helm/flamoral/templates/
├── deployment-api-gateway.yaml
├── deployment-services.yaml (existing 7 services)
├── deployment-support-services.yaml (NEW)
│   ├── payment-service
│   ├── moderation-service
│   ├── analytics-service
│   └── advertising-service
└── deployment-ai-services.yaml (NEW)
    ├── dating-coach-service
    ├── fraud-detection
    ├── nlp-service
    ├── photo-analysis
    └── recommendation-service
```

---

## Required values.yaml Additions

Add to `k8s/helm/flamoral/values.yaml`:

```yaml
# =============================================================================
# Payment Service
# =============================================================================
paymentService:
  enabled: true
  replicaCount: 2
  image:
    repository: flamoral/payment-service
  service:
    type: ClusterIP
    port: 80
    targetPort: 3005
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 8
    targetCPUUtilizationPercentage: 70

# =============================================================================
# Moderation Service
# =============================================================================
moderationService:
  enabled: true
  replicaCount: 2
  image:
    repository: flamoral/moderation-service
  service:
    type: ClusterIP
    port: 80
    targetPort: 3009
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 6
    targetCPUUtilizationPercentage: 70

# =============================================================================
# Analytics Service
# =============================================================================
analyticsService:
  enabled: true
  replicaCount: 2
  image:
    repository: flamoral/analytics-service
  service:
    type: ClusterIP
    port: 80
    targetPort: 3010
  resources:
    requests:
      cpu: 150m
      memory: 384Mi
    limits:
      cpu: 750m
      memory: 768Mi
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 8
    targetCPUUtilizationPercentage: 70

# =============================================================================
# Advertising Service
# =============================================================================
advertisingService:
  enabled: false  # Optional - can enable later
  replicaCount: 2
  image:
    repository: flamoral/advertising-service
  service:
    type: ClusterIP
    port: 80
    targetPort: 3011
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 6
    targetCPUUtilizationPercentage: 70

# =============================================================================
# AI Services (Python/FastAPI)
# =============================================================================
datingCoachService:
  enabled: true
  replicaCount: 2
  image:
    repository: flamoral/dating-coach
  service:
    type: ClusterIP
    port: 80
    targetPort: 8000
  resources:
    requests:
      cpu: 200m
      memory: 512Mi
    limits:
      cpu: 1000m
      memory: 1Gi
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 6
    targetCPUUtilizationPercentage: 70

fraudDetectionService:
  enabled: true
  replicaCount: 2
  image:
    repository: flamoral/fraud-detection
  service:
    type: ClusterIP
    port: 80
    targetPort: 8001
  resources:
    requests:
      cpu: 200m
      memory: 512Mi
    limits:
      cpu: 1000m
      memory: 1Gi
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 6
    targetCPUUtilizationPercentage: 70

nlpService:
  enabled: true
  replicaCount: 2
  image:
    repository: flamoral/nlp-service
  service:
    type: ClusterIP
    port: 80
    targetPort: 8002
  resources:
    requests:
      cpu: 200m
      memory: 512Mi
    limits:
      cpu: 1000m
      memory: 1Gi
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 6
    targetCPUUtilizationPercentage: 70

photoAnalysisService:
  enabled: true
  replicaCount: 2
  image:
    repository: flamoral/photo-analysis
  service:
    type: ClusterIP
    port: 80
    targetPort: 8003
  resources:
    requests:
      cpu: 300m
      memory: 1Gi
    limits:
      cpu: 1500m
      memory: 2Gi
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 6
    targetCPUUtilizationPercentage: 70

recommendationService:
  enabled: true
  replicaCount: 2
  image:
    repository: flamoral/recommendation-service
  service:
    type: ClusterIP
    port: 80
    targetPort: 8004
  resources:
    requests:
      cpu: 200m
      memory: 512Mi
    limits:
      cpu: 1000m
      memory: 1Gi
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 8
    targetCPUUtilizationPercentage: 70
```

---

## HPA Configuration Additions

Add to `k8s/base/hpa.yaml` or `k8s/helm/flamoral/templates/hpa.yaml`:

```yaml
---
# Payment Service HPA
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: payment-service-hpa
  namespace: flamoral
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: payment-service
  minReplicas: 2
  maxReplicas: 8
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70

# ... (similar for all other missing services)
```

---

## Pod Disruption Budget Additions

Add to `k8s/base/pdb.yaml`:

```yaml
---
# Payment Service PDB
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: payment-service-pdb
  namespace: flamoral
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: payment-service

# ... (similar for all other missing services)
```

---

## ConfigMap Updates

Update `k8s/base/configmaps.yaml` to include service URLs:

```yaml
data:
  # Add missing service URLs
  PAYMENT_SERVICE_URL: "http://payment-service:3005"
  MODERATION_SERVICE_URL: "http://moderation-service:3009"
  ANALYTICS_SERVICE_URL: "http://analytics-service:3010"
  ADVERTISING_SERVICE_URL: "http://advertising-service:3011"

  # AI Services
  DATING_COACH_SERVICE_URL: "http://dating-coach-service:8000"
  FRAUD_DETECTION_SERVICE_URL: "http://fraud-detection:8001"
  NLP_SERVICE_URL: "http://nlp-service:8002"
  PHOTO_ANALYSIS_SERVICE_URL: "http://photo-analysis:8003"
  RECOMMENDATION_SERVICE_URL: "http://recommendation-service:8004"
```

---

## Implementation Checklist

- [ ] Update `values.yaml` with missing services
- [ ] Add deployments to `deployment-services.yaml` OR create separate files
- [ ] Update HPA configurations
- [ ] Update PDB configurations
- [ ] Update ConfigMaps with service URLs
- [ ] Update Ingress if needed (api-gateway routes to these services)
- [ ] Build Docker images for all services
- [ ] Push images to registry (Docker Hub / ACR)
- [ ] Test deployment in staging environment
- [ ] Deploy to production

---

## Docker Images Required

Before deploying, ensure these images exist:

**Node.js Services**:
- `flamoral/payment-service:latest`
- `flamoral/moderation-service:latest`
- `flamoral/analytics-service:latest`
- `flamoral/advertising-service:latest`

**Python Services**:
- `flamoral/dating-coach:latest`
- `flamoral/fraud-detection:latest`
- `flamoral/nlp-service:latest`
- `flamoral/photo-analysis:latest`
- `flamoral/recommendation-service:latest`

**Build Command**:
```bash
# Node.js services
cd backend/services/payment-service
docker build -t flamoral/payment-service:latest .
docker push flamoral/payment-service:latest

# Python services
cd backend/services/ai-services/dating-coach-service
docker build -t flamoral/dating-coach:latest .
docker push flamoral/dating-coach:latest
```

---

## Testing Individual Services

Once manifests are created, test each service individually:

```bash
# Deploy single service
helm upgrade flamoral ./k8s/helm/flamoral \
  --namespace flamoral \
  --set paymentService.enabled=true \
  --set global.image.tag=latest

# Check deployment
kubectl get pods -n flamoral | grep payment-service

# Check logs
kubectl logs -f deployment/payment-service -n flamoral

# Port forward and test
kubectl port-forward svc/payment-service 3005:80 -n flamoral
curl http://localhost:3005/health
```

---

## Service Mesh Integration

If using Istio, add VirtualServices and DestinationRules:

```yaml
# k8s/service-mesh/virtual-services.yaml
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payment-service
  namespace: flamoral
spec:
  hosts:
  - payment-service
  http:
  - route:
    - destination:
        host: payment-service
        port:
          number: 3005
    timeout: 20s
    retries:
      attempts: 2
      perTryTimeout: 10s
```

---

## Conclusion

**Current Coverage**: 9/17 services (53%)
**Missing**: 9 services (4 Node.js + 5 Python)

**Recommendation**:
1. Add all missing services to Helm chart
2. Prioritize HIGH priority services (payment, fraud-detection, photo-analysis)
3. Test in staging before production deployment

---

**Last Updated**: 2025-12-08
**Reviewer**: DevOps Team
