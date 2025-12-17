# Flamoral Platform - Production Services Deployment

Complete Kubernetes deployment manifests for all Flamoral backend services.

## Overview

This directory contains production-ready Kubernetes deployment configurations for all 14 backend services of the Flamoral dating platform.

### Services Included

#### High-Traffic Tier
- **api-gateway** (Port 4000) - Main API gateway and router
- **user-service** (Port 3002) - User profile management

#### Critical Tier
- **auth-service** (Port 3001) - Authentication and authorization
- **payment-service** (Port 3005) - Payment processing (PCI-DSS compliant)

#### Medium-Traffic Tier
- **matching-service** (Port 3009) - Matching algorithm and swipes
- **messaging-service** (Port 3004) - Chat and conversations
- **media-service** (Port 3006) - Image/video processing and storage
- **notification-service** (Port 3012) - Push notifications, email, SMS
- **realtime-service** (Port 8081) - WebSocket connections

#### Low-Traffic Tier
- **analytics-service** (Port 3007) - Analytics and metrics
- **moderation-service** (Port 3008) - Content moderation
- **admin-service** (Port 3010) - Admin dashboard
- **advertising-service** (Port 3011) - Ad management
- **workflow-engine** (Port 3013) - Workflow automation

## Resource Optimization

All services are configured with cost-optimized resource requests and limits based on traffic patterns:

### Resource Allocation

| Service | CPU Request | Memory Request | CPU Limit | Memory Limit | Spot Eligible |
|---------|-------------|----------------|-----------|--------------|---------------|
| api-gateway | 150m | 256Mi | 500m | 512Mi | No |
| auth-service | 100m | 256Mi | 500m | 512Mi | No |
| user-service | 150m | 256Mi | 500m | 512Mi | No |
| payment-service | 150m | 256Mi | 500m | 512Mi | No |
| matching-service | 150m | 256Mi | 500m | 512Mi | Yes |
| messaging-service | 100m | 256Mi | 400m | 512Mi | Yes |
| media-service | 200m | 512Mi | 1000m | 1Gi | Yes |
| notification-service | 100m | 192Mi | 300m | 384Mi | Yes |
| realtime-service | 100m | 256Mi | 400m | 512Mi | Yes |
| analytics-service | 50m | 128Mi | 200m | 256Mi | Yes |
| moderation-service | 100m | 256Mi | 400m | 512Mi | Yes |
| admin-service | 50m | 128Mi | 200m | 256Mi | Yes |
| advertising-service | 50m | 128Mi | 200m | 256Mi | Yes |
| workflow-engine | 75m | 192Mi | 300m | 384Mi | Yes |

### High Availability

- **Critical services** (auth, payment) run on on-demand nodes with pod anti-affinity
- **High-traffic services** (api-gateway, user-service) have minimum 2 replicas
- All services include health checks (liveness and readiness probes)
- Pod Disruption Budgets ensure zero-downtime deployments

## Deployment Methods

### Method 1: Automated Deployment Script (Recommended)

Use the deployment script for ordered, validated deployment:

```bash
# Deploy all services
./deploy-services.sh deploy

# Check deployment status
./deploy-services.sh status

# Validate all services are healthy
./deploy-services.sh validate

# Rollback if needed
./deploy-services.sh rollback
```

The script automatically:
- Deploys services in dependency order
- Waits for each deployment to be ready
- Validates health endpoints
- Provides detailed status and error logs

### Method 2: Kustomize Deployment

Deploy all services at once using Kustomize:

```bash
# From the deployments directory
kubectl apply -k .

# Or from root
kubectl apply -k infrastructure/kubernetes/production/deployments/
```

### Method 3: Individual Service Deployment

Deploy services individually:

```bash
# Deploy a single service
kubectl apply -f deployments/auth-service.yaml -n flamoral

# Deploy corresponding service
kubectl apply -f services/all-services.yaml -n flamoral
```

## Prerequisites

Before deploying, ensure:

1. **Kubernetes Cluster**: AKS cluster is provisioned and accessible
2. **Namespace**: `flamoral` namespace exists
3. **External Secrets**: All secrets are configured in Azure Key Vault
4. **Container Registry**: Images are pushed to `flamoraldevacr.azurecr.io`
5. **Dependencies**: PostgreSQL, Redis, and PGBouncer are running

### Setup External Secrets

```bash
# Deploy External Secrets Operator
kubectl apply -k ../external-secrets/

# Verify secrets are synced
kubectl get externalsecrets -n flamoral
kubectl get secrets -n flamoral
```

## Deployment Order

The recommended deployment order (handled automatically by deploy-services.sh):

1. **Phase 1: Infrastructure**
   - auth-service

2. **Phase 2: High-Traffic**
   - user-service
   - api-gateway

3. **Phase 3: Medium-Traffic**
   - matching-service
   - messaging-service
   - payment-service
   - media-service
   - notification-service
   - realtime-service

4. **Phase 4: Low-Traffic**
   - analytics-service
   - moderation-service
   - admin-service
   - advertising-service
   - workflow-engine

## Health Checks

All services include:

### Readiness Probe
```yaml
readinessProbe:
  httpGet:
    path: /health
    port: <SERVICE_PORT>
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
```

### Liveness Probe
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: <SERVICE_PORT>
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

## Monitoring and Validation

### Check Deployment Status

```bash
# All deployments
kubectl get deployments -n flamoral

# All pods
kubectl get pods -n flamoral -o wide

# All services
kubectl get services -n flamoral

# Detailed pod status
kubectl describe pod <pod-name> -n flamoral
```

### View Logs

```bash
# Recent logs
kubectl logs -n flamoral deployment/<service-name> --tail=100

# Follow logs
kubectl logs -n flamoral deployment/<service-name> -f

# Logs from all pods of a service
kubectl logs -n flamoral -l app=<service-name> --all-containers=true
```

### Check Resource Usage

```bash
# CPU and memory usage
kubectl top pods -n flamoral

# Node resource allocation
kubectl top nodes
```

## Autoscaling

All services are configured with Horizontal Pod Autoscaling (HPA). See `../autoscaling/hpa-configs.yaml` for details.

```bash
# Check HPA status
kubectl get hpa -n flamoral

# Describe HPA for a service
kubectl describe hpa <service-name> -n flamoral
```

## Troubleshooting

### Pod Not Starting

```bash
# Check pod events
kubectl describe pod <pod-name> -n flamoral

# Check pod logs
kubectl logs <pod-name> -n flamoral

# Check if secrets are available
kubectl get secrets -n flamoral
kubectl describe externalsecret <secret-name> -n flamoral
```

### Service Not Accessible

```bash
# Check service endpoints
kubectl get endpoints <service-name> -n flamoral

# Test service connectivity from a pod
kubectl run -it --rm debug --image=busybox --restart=Never -n flamoral -- sh
wget -O- http://<service-name>:<port>/health
```

### High CPU/Memory Usage

```bash
# Check current usage
kubectl top pods -n flamoral

# Check VPA recommendations
kubectl get vpa -n flamoral
kubectl describe vpa <service-name>-vpa -n flamoral
```

### Failed Deployment

```bash
# Check rollout status
kubectl rollout status deployment/<service-name> -n flamoral

# View rollout history
kubectl rollout history deployment/<service-name> -n flamoral

# Rollback to previous version
kubectl rollout undo deployment/<service-name> -n flamoral
```

## Ingress Configuration

Service routing is configured in `../ingress.yaml`:

- **api.flamoral.com** - Main API (routes to all services via paths)
- **ws.flamoral.com** - WebSocket (routes to realtime-service)
- **media.flamoral.com** - Media CDN (routes to media-service)
- **admin.flamoral.com** - Admin dashboard (routes to admin-service)

```bash
# Deploy ingress
kubectl apply -f ../ingress.yaml -n flamoral

# Check ingress status
kubectl get ingress -n flamoral

# Describe ingress
kubectl describe ingress flamoral-main-ingress -n flamoral
```

## Security

### Service Accounts

All services use the `flamoral-sa` service account with appropriate RBAC permissions.

### Network Policies

Network policies restrict traffic between services. See `../network-policies.yaml`.

### Secrets Management

All sensitive data is stored in Azure Key Vault and synced via External Secrets Operator:

- **flamoral-database-secrets** - Database credentials
- **flamoral-auth-secrets** - JWT and OAuth secrets
- **flamoral-payment-secrets** - Payment provider secrets
- **flamoral-media-secrets** - Azure Storage credentials
- **flamoral-notification-secrets** - Notification provider secrets

## Updating Services

### Update Image Tag

```bash
# Update via kubectl
kubectl set image deployment/<service-name> <service-name>=flamoraldevacr.azurecr.io/<service-name>:v1.2.3 -n flamoral

# Or edit kustomization.yaml images section and reapply
kubectl apply -k .
```

### Update Environment Variables

```bash
# Edit deployment manifest
kubectl edit deployment <service-name> -n flamoral

# Or update the YAML file and reapply
kubectl apply -f deployments/<service-name>.yaml -n flamoral
```

### Update Resources

```bash
# Edit resource requests/limits in deployment YAML
# Then apply changes
kubectl apply -f deployments/<service-name>.yaml -n flamoral
```

## Cost Optimization

Estimated monthly cost: **$67-186** (with all optimizations)

Cost-saving features:
- Spot instances for non-critical services (70% savings)
- VPA for right-sizing (20-40% savings)
- HPA for scale-to-zero during off-hours (30-50% savings)
- Resource quotas to prevent over-provisioning

See `../cost-optimization/resource-recommendations.yaml` for detailed breakdown.

## Related Documentation

- [External Secrets Setup](../external-secrets/DEPLOYMENT-GUIDE.md)
- [Cost Optimization Guide](../COST_OPTIMIZATION_DEPLOYMENT_GUIDE.md)
- [TLS Certificate Setup](../TLS_CERTIFICATE_SETUP.md)
- [Quick Start Checklist](../QUICK_START_CHECKLIST.md)

## Support

For deployment issues:
1. Check pod logs: `kubectl logs -n flamoral <pod-name>`
2. Check events: `kubectl get events -n flamoral --sort-by='.lastTimestamp'`
3. Validate secrets: `kubectl get externalsecrets -n flamoral`
4. Review resource usage: `kubectl top pods -n flamoral`
