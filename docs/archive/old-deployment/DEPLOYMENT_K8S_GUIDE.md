# Flamoral Platform - Kubernetes Deployment Guide

## Overview

This guide covers the Kubernetes deployment architecture for the Flamoral dating platform on Azure Kubernetes Service (AKS). The platform uses Helm charts for templated deployments across three environments.

---

## 1. Architecture

### 1.1 Cluster Configuration

| Environment | Cluster Name | Node Count | VM Size | Availability |
|-------------|--------------|------------|---------|--------------|
| Dev | flamoral-dev-aks | 1-3 | Standard_D2s_v3 | Single AZ |
| Test | flamoral-test-aks | 2-4 | Standard_D2s_v3 | Single AZ |
| Prod | flamoral-prod-aks | 3-20 | Standard_D4s_v3 | Zone Redundant |

### 1.2 Namespace Structure

```
├── flamoral              # Application services
├── ingress-nginx         # Ingress controller
├── cert-manager          # TLS certificates
├── monitoring            # Prometheus, Grafana
└── default               # System components
```

### 1.3 Service Architecture

```
                    ┌─────────────────────────────────────┐
                    │           Ingress Controller        │
                    │         (NGINX / 443, 80)           │
                    └─────────────────┬───────────────────┘
                                      │
                    ┌─────────────────┼───────────────────┐
                    │                 │                   │
                    ▼                 ▼                   ▼
              ┌──────────┐     ┌──────────┐       ┌──────────┐
              │  Web App │     │    API   │       │ WebSocket│
              │   :80    │     │ Gateway  │       │ Service  │
              │          │     │  :4000   │       │  :3004   │
              └──────────┘     └────┬─────┘       └──────────┘
                                    │
          ┌─────────┬───────────────┼───────────────┬─────────┐
          │         │               │               │         │
          ▼         ▼               ▼               ▼         ▼
    ┌──────────┐┌──────────┐┌──────────┐┌──────────┐┌──────────┐
    │   Auth   ││   User   ││ Matching ││Messaging ││  Media   │
    │  :3001   ││  :3002   ││  :3003   ││  :3004   ││  :3006   │
    └──────────┘└──────────┘└──────────┘└──────────┘└──────────┘
```

---

## 2. Helm Chart Structure

### 2.1 Chart Location

```
k8s/helm/flamoral/
├── Chart.yaml
├── values.yaml           # Default values
├── values-dev.yaml       # Dev overrides
├── values-test.yaml      # Test overrides
├── values-prod.yaml      # Prod overrides
└── templates/
    ├── _helpers.tpl
    ├── configmap.yaml
    ├── secrets.yaml
    ├── serviceaccount.yaml
    ├── deployment-api-gateway.yaml
    ├── deployment-services.yaml
    ├── ingress.yaml
    └── hpa.yaml
```

### 2.2 Chart.yaml

```yaml
apiVersion: v2
name: flamoral
description: Flamoral Dating Platform Helm Chart
type: application
version: 1.0.0
appVersion: "1.0.0"
maintainers:
  - name: Flamoral DevOps
    email: devops@flamoral.com
```

---

## 3. Deployment Configuration

### 3.1 Default Values (values.yaml)

```yaml
global:
  environment: "development"
  image:
    registry: "flamoraldevacr.azurecr.io"
    pullPolicy: IfNotPresent
    tag: "latest"
  imagePullSecrets:
    - name: acr-secret

serviceAccount:
  create: true
  name: flamoral-sa
  annotations:
    azure.workload.identity/client-id: ""

healthCheck:
  livenessProbe:
    httpGet:
      path: /health
      port: http
    initialDelaySeconds: 30
    periodSeconds: 10
    timeoutSeconds: 5
    failureThreshold: 3
  readinessProbe:
    httpGet:
      path: /health
      port: http
    initialDelaySeconds: 10
    periodSeconds: 5
    timeoutSeconds: 3
    failureThreshold: 3

# API Gateway
apiGateway:
  enabled: true
  replicaCount: 2
  image:
    repository: flamoral/api-gateway
  service:
    type: ClusterIP
    port: 80
    targetPort: 4000
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi
  autoscaling:
    enabled: false
    minReplicas: 2
    maxReplicas: 10
    targetCPUUtilizationPercentage: 70

# Auth Service
authService:
  enabled: true
  replicaCount: 2
  image:
    repository: flamoral/auth-service
  service:
    type: ClusterIP
    port: 80
    targetPort: 3001
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi

# Additional services follow same pattern...
```

### 3.2 Production Overrides (values-prod.yaml)

```yaml
global:
  environment: "production"
  image:
    tag: "prod-latest"

apiGateway:
  replicaCount: 3
  autoscaling:
    enabled: true
    minReplicas: 3
    maxReplicas: 20
    targetCPUUtilizationPercentage: 60
  resources:
    requests:
      cpu: 200m
      memory: 512Mi
    limits:
      cpu: 1000m
      memory: 1Gi

authService:
  replicaCount: 3
  autoscaling:
    enabled: true
    minReplicas: 3
    maxReplicas: 15

matchingService:
  replicaCount: 5
  autoscaling:
    enabled: true
    minReplicas: 5
    maxReplicas: 30
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 2000m
      memory: 2Gi

ingress:
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
  hosts:
    - host: flamoral.com
      paths:
        - path: /
          pathType: Prefix
          service: web
        - path: /api
          pathType: Prefix
          service: api-gateway
    - host: api.flamoral.com
      paths:
        - path: /
          pathType: Prefix
          service: api-gateway
  tls:
    - secretName: flamoral-tls
      hosts:
        - flamoral.com
        - www.flamoral.com
        - api.flamoral.com

podDisruptionBudget:
  enabled: true
  minAvailable: 2
```

---

## 4. Deployment Commands

### 4.1 Manual Deployment

```bash
# Set up kubectl context
az aks get-credentials -g flamoral-prod-rg -n flamoral-prod-aks

# Create namespace
kubectl create namespace flamoral

# Create ACR pull secret
kubectl create secret docker-registry acr-secret \
  --docker-server=flamoralprodacr.azurecr.io \
  --docker-username=<ACR_USERNAME> \
  --docker-password=<ACR_PASSWORD> \
  --namespace=flamoral

# Deploy with Helm
helm upgrade --install flamoral ./k8s/helm/flamoral \
  --namespace flamoral \
  --values ./k8s/helm/flamoral/values-prod.yaml \
  --set global.image.tag=v1.0.0 \
  --set global.image.registry=flamoralprodacr.azurecr.io \
  --wait --timeout 10m

# Verify deployment
kubectl get pods -n flamoral
kubectl get services -n flamoral
kubectl get ingress -n flamoral
```

### 4.2 Rollback

```bash
# List releases
helm list -n flamoral

# Check release history
helm history flamoral -n flamoral

# Rollback to previous version
helm rollback flamoral 1 -n flamoral

# Verify rollback
kubectl rollout status deployment/flamoral-api-gateway -n flamoral
```

---

## 5. Resource Specifications

### 5.1 Production Resource Allocation

| Service | Replicas | CPU Request | CPU Limit | Memory Request | Memory Limit |
|---------|----------|-------------|-----------|----------------|--------------|
| api-gateway | 3-20 | 200m | 1000m | 512Mi | 1Gi |
| auth-service | 3-15 | 200m | 1000m | 512Mi | 1Gi |
| user-service | 3-20 | 200m | 1000m | 512Mi | 1Gi |
| matching-service | 5-30 | 500m | 2000m | 1Gi | 2Gi |
| messaging-service | 3-20 | 200m | 1000m | 512Mi | 1Gi |
| media-service | 3-15 | 500m | 2000m | 1Gi | 2Gi |
| web-app | 3-20 | 100m | 500m | 256Mi | 512Mi |

### 5.2 Node Pool Configuration

```yaml
# Production AKS - System Node Pool
default_node_pool:
  name: system
  node_count: 3
  vm_size: Standard_D4s_v3
  os_disk_size_gb: 128
  zones: ["1", "2", "3"]
  enable_auto_scaling: true
  min_count: 3
  max_count: 5

# Production AKS - User Node Pool
user_node_pool:
  name: user
  vm_size: Standard_D4s_v3
  node_count: 3
  os_disk_size_gb: 128
  zones: ["1", "2", "3"]
  enable_auto_scaling: true
  min_count: 3
  max_count: 20
  node_labels:
    workload: user
    environment: production
```

---

## 6. Horizontal Pod Autoscaler (HPA)

### 6.1 HPA Configuration

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
  namespace: flamoral
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: flamoral-api-gateway
  minReplicas: 3
  maxReplicas: 20
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
          averageUtilization: 70
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15
        - type: Pods
          value: 4
          periodSeconds: 15
      selectPolicy: Max
```

---

## 7. Pod Disruption Budget (PDB)

### 7.1 PDB Configuration

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-gateway-pdb
  namespace: flamoral
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app.kubernetes.io/name: flamoral
      app.kubernetes.io/component: api-gateway
```

---

## 8. Network Policies

### 8.1 Default Deny Policy

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: flamoral
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```

### 8.2 Allow Internal Traffic

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-internal
  namespace: flamoral
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: flamoral
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
```

### 8.3 Allow Database Access

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-database-egress
  namespace: flamoral
spec:
  podSelector:
    matchLabels:
      database-access: "true"
  policyTypes:
    - Egress
  egress:
    - to:
        - ipBlock:
            cidr: 10.2.2.0/24  # Database subnet
      ports:
        - port: 5432
          protocol: TCP
```

---

## 9. Secrets Management

### 9.1 Azure Key Vault Integration

```yaml
# SecretProviderClass for Azure Key Vault
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: flamoral-keyvault
  namespace: flamoral
spec:
  provider: azure
  parameters:
    usePodIdentity: "false"
    useVMManagedIdentity: "true"
    userAssignedIdentityID: "<MANAGED_IDENTITY_CLIENT_ID>"
    keyvaultName: "flamoral-prod-kv-xxxxx"
    objects: |
      array:
        - |
          objectName: postgres-password
          objectType: secret
        - |
          objectName: redis-connection-string
          objectType: secret
        - |
          objectName: storage-connection-string
          objectType: secret
    tenantId: "<TENANT_ID>"
  secretObjects:
    - secretName: flamoral-secrets
      type: Opaque
      data:
        - objectName: postgres-password
          key: POSTGRES_PASSWORD
        - objectName: redis-connection-string
          key: REDIS_CONNECTION_STRING
        - objectName: storage-connection-string
          key: STORAGE_CONNECTION_STRING
```

### 9.2 Mount Secrets in Deployment

```yaml
volumes:
  - name: secrets-store
    csi:
      driver: secrets-store.csi.k8s.io
      readOnly: true
      volumeAttributes:
        secretProviderClass: flamoral-keyvault
containers:
  - name: api-gateway
    volumeMounts:
      - name: secrets-store
        mountPath: /mnt/secrets
        readOnly: true
    envFrom:
      - secretRef:
          name: flamoral-secrets
```

---

## 10. Ingress Configuration

### 10.1 Install NGINX Ingress Controller

```bash
# Add Helm repo
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Install with static IP
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.loadBalancerIP=<PUBLIC_IP> \
  --set controller.service.annotations."service\.beta\.kubernetes\.io/azure-load-balancer-resource-group"=flamoral-prod-rg \
  --set controller.replicaCount=3 \
  --set controller.nodeSelector."kubernetes\.io/os"=linux
```

### 10.2 Install cert-manager

```bash
# Add Helm repo
helm repo add jetstack https://charts.jetstack.io
helm repo update

# Install cert-manager
helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true

# Create ClusterIssuer
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: devops@flamoral.com
    privateKeySecretRef:
      name: letsencrypt-prod-account-key
    solvers:
      - http01:
          ingress:
            class: nginx
EOF
```

---

## 11. Monitoring

### 11.1 Prometheus ServiceMonitor

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: flamoral-services
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: flamoral
  namespaceSelector:
    matchNames:
      - flamoral
  endpoints:
    - port: http
      path: /metrics
      interval: 30s
```

### 11.2 Grafana Dashboard

Dashboards are available at:
- Kubernetes cluster metrics
- Flamoral service metrics
- Database connections
- API response times

---

## 12. Troubleshooting

### 12.1 Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| ImagePullBackOff | ACR auth failed | Check ACR secret |
| CrashLoopBackOff | App crash | Check logs |
| Pending pods | Insufficient resources | Scale node pool |
| Service unreachable | Network policy | Check NetworkPolicy |

### 12.2 Debug Commands

```bash
# Pod logs
kubectl logs -n flamoral deployment/flamoral-api-gateway --tail=100

# Pod events
kubectl describe pod -n flamoral <POD_NAME>

# Get all events
kubectl get events -n flamoral --sort-by='.lastTimestamp'

# Check HPA status
kubectl get hpa -n flamoral

# Check ingress
kubectl describe ingress -n flamoral

# Test service connectivity
kubectl run -it --rm debug --image=busybox --restart=Never -- wget -qO- http://api-gateway/health
```

---

## Document Information

| Field | Value |
|-------|-------|
| Last Updated | December 2024 |
| Version | 1.0 |
| Author | Flamoral DevOps Team |
| Status | Production Ready |
