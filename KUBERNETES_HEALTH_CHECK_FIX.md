# Kubernetes Health Check Path Fix for Flamoral Dating Platform

## Summary
This document provides kubectl patch commands to fix health check probe configurations across all Flamoral services in the AKS cluster.

**Issue**: Health check probes are returning 404 errors because they're configured with incorrect paths.

**Root Cause Analysis**:
- Services expose `/health` endpoint (verified in source code)
- Some deployments incorrectly probe `/health/ready` or `/ready`
- Inconsistent configuration between different deployment manifests

## Service Health Endpoint Status

Based on source code analysis:

| Service | /health | /ready | Notes |
|---------|---------|--------|-------|
| api-gateway | ✓ | ✗ | Only /health |
| auth-service | ✓ | ✗ | Only /health |
| user-service | ✓ | ✗ | Only /health |
| matching-service | ✓ | ✗ | Only /health |
| messaging-service | ✓ | ✗ | Only /health |
| media-service | ✓ | ✗ | Only /health |
| payment-service | ✓ | ✗ | Only /health |
| notification-service | ✓ | ✗ | Only /health |
| analytics-service | ✓ | ✗ | Only /health |
| moderation-service | ✓ | ✗ | Only /health |
| admin-service | ✓ | ✗ | Only /health |
| advertising-service | ✓ | ✗ | Only /health |
| automation-service | ✓ | ✗ | Only /health |
| realtime-service | ✓ | ✗ | Only /health |
| workflow-engine | ✓ | ✗ | Only /health |
| ai-recommendation-service | ✓ | ✓ | Both endpoints |
| nlp-service | ✓ | ✓ | Both endpoints |
| content-generator | ✓ | ✓ | Both endpoints |

## Fix Commands

### Prerequisites
```bash
# Ensure you're connected to the correct AKS cluster
az aks get-credentials --resource-group flamoral-prod-rg --name flamoral-prod-aks

# Verify you're in the correct context
kubectl config current-context

# Verify namespace exists
kubectl get namespace flamoral-dating
```

### Fix Option 1: Patch All Services to Use /health (Recommended)

This standardizes all services to use `/health` for both liveness and readiness probes.

```bash
# API Gateway
kubectl patch deployment api-gateway -n flamoral-dating --type='json' -p='[
  {"op": "replace", "path": "/spec/template/spec/containers/0/livenessProbe/httpGet/path", "value": "/health"},
  {"op": "replace", "path": "/spec/template/spec/containers/0/readinessProbe/httpGet/path", "value": "/health"}
]'

# User Service
kubectl patch deployment user-service -n flamoral-dating --type='json' -p='[
  {"op": "replace", "path": "/spec/template/spec/containers/0/livenessProbe/httpGet/path", "value": "/health"},
  {"op": "replace", "path": "/spec/template/spec/containers/0/readinessProbe/httpGet/path", "value": "/health"}
]'

# Auth Service (if exists in flamoral-dating namespace)
kubectl patch deployment auth-service -n flamoral-dating --type='json' -p='[
  {"op": "replace", "path": "/spec/template/spec/containers/0/livenessProbe/httpGet/path", "value": "/health"},
  {"op": "replace", "path": "/spec/template/spec/containers/0/readinessProbe/httpGet/path", "value": "/health"}
]'

# Matching Service
kubectl patch deployment matching-service -n flamoral-dating --type='json' -p='[
  {"op": "replace", "path": "/spec/template/spec/containers/0/livenessProbe/httpGet/path", "value": "/health"},
  {"op": "replace", "path": "/spec/template/spec/containers/0/readinessProbe/httpGet/path", "value": "/health"}
]'

# Messaging Service
kubectl patch deployment messaging-service -n flamoral-dating --type='json' -p='[
  {"op": "replace", "path": "/spec/template/spec/containers/0/livenessProbe/httpGet/path", "value": "/health"},
  {"op": "replace", "path": "/spec/template/spec/containers/0/readinessProbe/httpGet/path", "value": "/health"}
]'

# Media Service
kubectl patch deployment media-service -n flamoral-dating --type='json' -p='[
  {"op": "replace", "path": "/spec/template/spec/containers/0/livenessProbe/httpGet/path", "value": "/health"},
  {"op": "replace", "path": "/spec/template/spec/containers/0/readinessProbe/httpGet/path", "value": "/health"}
]'

# Payment Service
kubectl patch deployment payment-service -n flamoral-dating --type='json' -p='[
  {"op": "replace", "path": "/spec/template/spec/containers/0/livenessProbe/httpGet/path", "value": "/health"},
  {"op": "replace", "path": "/spec/template/spec/containers/0/readinessProbe/httpGet/path", "value": "/health"}
]'

# Notification Service
kubectl patch deployment notification-service -n flamoral-dating --type='json' -p='[
  {"op": "replace", "path": "/spec/template/spec/containers/0/livenessProbe/httpGet/path", "value": "/health"},
  {"op": "replace", "path": "/spec/template/spec/containers/0/readinessProbe/httpGet/path", "value": "/health"}
]'

# Analytics Service
kubectl patch deployment analytics-service -n flamoral-dating --type='json' -p='[
  {"op": "replace", "path": "/spec/template/spec/containers/0/livenessProbe/httpGet/path", "value": "/health"},
  {"op": "replace", "path": "/spec/template/spec/containers/0/readinessProbe/httpGet/path", "value": "/health"}
]'

# Moderation Service
kubectl patch deployment moderation-service -n flamoral-dating --type='json' -p='[
  {"op": "replace", "path": "/spec/template/spec/containers/0/livenessProbe/httpGet/path", "value": "/health"},
  {"op": "replace", "path": "/spec/template/spec/containers/0/readinessProbe/httpGet/path", "value": "/health"}
]'

# Admin Service
kubectl patch deployment admin-service -n flamoral-dating --type='json' -p='[
  {"op": "replace", "path": "/spec/template/spec/containers/0/livenessProbe/httpGet/path", "value": "/health"},
  {"op": "replace", "path": "/spec/template/spec/containers/0/readinessProbe/httpGet/path", "value": "/health"}
]'

# Advertising Service
kubectl patch deployment advertising-service -n flamoral-dating --type='json' -p='[
  {"op": "replace", "path": "/spec/template/spec/containers/0/livenessProbe/httpGet/path", "value": "/health"},
  {"op": "replace", "path": "/spec/template/spec/containers/0/readinessProbe/httpGet/path", "value": "/health"}
]'

# Automation Service
kubectl patch deployment automation-service -n flamoral-dating --type='json' -p='[
  {"op": "replace", "path": "/spec/template/spec/containers/0/livenessProbe/httpGet/path", "value": "/health"},
  {"op": "replace", "path": "/spec/template/spec/containers/0/readinessProbe/httpGet/path", "value": "/health"}
]'

# Realtime Service
kubectl patch deployment realtime-service -n flamoral-dating --type='json' -p='[
  {"op": "replace", "path": "/spec/template/spec/containers/0/livenessProbe/httpGet/path", "value": "/health"},
  {"op": "replace", "path": "/spec/template/spec/containers/0/readinessProbe/httpGet/path", "value": "/health"}
]'

# Workflow Engine
kubectl patch deployment workflow-engine -n flamoral-dating --type='json' -p='[
  {"op": "replace", "path": "/spec/template/spec/containers/0/livenessProbe/httpGet/path", "value": "/health"},
  {"op": "replace", "path": "/spec/template/spec/containers/0/readinessProbe/httpGet/path", "value": "/health"}
]'
```

### Fix Option 2: Use /health for Liveness, /ready for Readiness (AI Services)

For AI services that support both endpoints:

```bash
# AI Recommendation Service (if deployed)
kubectl patch deployment ai-recommendation-service -n flamoral-dating --type='json' -p='[
  {"op": "replace", "path": "/spec/template/spec/containers/0/livenessProbe/httpGet/path", "value": "/health"},
  {"op": "replace", "path": "/spec/template/spec/containers/0/readinessProbe/httpGet/path", "value": "/ready"}
]'

# NLP Service (if deployed)
kubectl patch deployment nlp-service -n flamoral-dating --type='json' -p='[
  {"op": "replace", "path": "/spec/template/spec/containers/0/livenessProbe/httpGet/path", "value": "/health"},
  {"op": "replace", "path": "/spec/template/spec/containers/0/readinessProbe/httpGet/path", "value": "/ready"}
]'

# Content Generator Service (if deployed)
kubectl patch deployment content-generator -n flamoral-dating --type='json' -p='[
  {"op": "replace", "path": "/spec/template/spec/containers/0/livenessProbe/httpGet/path", "value": "/health"},
  {"op": "replace", "path": "/spec/template/spec/containers/0/readinessProbe/httpGet/path", "value": "/ready"}
]'
```

### Bulk Fix Script

Create a script to patch all services at once:

```bash
#!/bin/bash
# save as: fix-health-checks.sh

NAMESPACE="flamoral-dating"

# List of services that use only /health
SERVICES=(
  "api-gateway"
  "user-service"
  "auth-service"
  "matching-service"
  "messaging-service"
  "media-service"
  "payment-service"
  "notification-service"
  "analytics-service"
  "moderation-service"
  "admin-service"
  "advertising-service"
  "automation-service"
  "realtime-service"
  "workflow-engine"
)

echo "Fixing health check paths for Flamoral services..."
echo "Namespace: $NAMESPACE"
echo ""

for SERVICE in "${SERVICES[@]}"; do
  echo "Patching $SERVICE..."

  # Check if deployment exists
  if kubectl get deployment "$SERVICE" -n "$NAMESPACE" &> /dev/null; then
    kubectl patch deployment "$SERVICE" -n "$NAMESPACE" --type='json' -p='[
      {"op": "replace", "path": "/spec/template/spec/containers/0/livenessProbe/httpGet/path", "value": "/health"},
      {"op": "replace", "path": "/spec/template/spec/containers/0/readinessProbe/httpGet/path", "value": "/health"}
    ]' && echo "✓ $SERVICE patched successfully" || echo "✗ Failed to patch $SERVICE"
  else
    echo "⊘ $SERVICE deployment not found, skipping..."
  fi
  echo ""
done

echo "Health check fixes complete!"
```

Make executable and run:
```bash
chmod +x fix-health-checks.sh
./fix-health-checks.sh
```

## Verification Commands

After applying the patches, verify the changes:

```bash
# Check all deployments in the namespace
kubectl get deployments -n flamoral-dating

# Get detailed probe configuration for a specific service
kubectl get deployment api-gateway -n flamoral-dating -o jsonpath='{.spec.template.spec.containers[0].livenessProbe}' | jq
kubectl get deployment api-gateway -n flamoral-dating -o jsonpath='{.spec.template.spec.containers[0].readinessProbe}' | jq

# Check pod status after patches
kubectl get pods -n flamoral-dating -w

# Check pod events for health check failures
kubectl get events -n flamoral-dating --sort-by='.lastTimestamp' | grep -i health

# Test health endpoint directly from a pod
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -n flamoral-dating -- curl http://api-gateway:3000/health

# View logs for a specific service to check health checks
kubectl logs -n flamoral-dating -l app=api-gateway --tail=100 | grep health
```

## Rollout Status Monitoring

Monitor the rollout after patching:

```bash
# Watch all deployments
kubectl get deployments -n flamoral-dating -w

# Check specific deployment rollout
kubectl rollout status deployment/api-gateway -n flamoral-dating

# View rollout history
kubectl rollout history deployment/api-gateway -n flamoral-dating

# If needed, rollback
kubectl rollout undo deployment/api-gateway -n flamoral-dating
```

## Expected Behavior After Fix

1. **Liveness Probe**: Checks `/health` endpoint
   - Returns 200 OK when service is alive
   - Kubernetes restarts pod if probe fails

2. **Readiness Probe**: Checks `/health` endpoint (or `/ready` for AI services)
   - Returns 200 OK when service is ready to accept traffic
   - Kubernetes removes pod from service load balancer if probe fails

3. **No More 404 Errors**: All health check requests should return 200 OK

## Troubleshooting

### If patches fail:

1. **Check if deployment has probes defined**:
   ```bash
   kubectl get deployment <service-name> -n flamoral-dating -o yaml | grep -A 10 "livenessProbe\|readinessProbe"
   ```

2. **If probes don't exist**, add them instead of patching:
   ```bash
   kubectl patch deployment <service-name> -n flamoral-dating --type='strategic' -p='
   {
     "spec": {
       "template": {
         "spec": {
           "containers": [{
             "name": "<container-name>",
             "livenessProbe": {
               "httpGet": {
                 "path": "/health",
                 "port": <port>
               },
               "initialDelaySeconds": 30,
               "periodSeconds": 10
             },
             "readinessProbe": {
               "httpGet": {
                 "path": "/health",
                 "port": <port>
               },
               "initialDelaySeconds": 15,
               "periodSeconds": 5
             }
           }]
         }
       }
     }
   }'
   ```

### If pods keep restarting after fix:

1. Check if the `/health` endpoint is actually working:
   ```bash
   kubectl port-forward -n flamoral-dating svc/<service-name> 8080:<service-port>
   curl http://localhost:8080/health
   ```

2. Check application logs:
   ```bash
   kubectl logs -n flamoral-dating -l app=<service-name> --tail=200
   ```

3. Verify port numbers match between probe and container:
   ```bash
   kubectl get deployment <service-name> -n flamoral-dating -o jsonpath='{.spec.template.spec.containers[0].ports[*].containerPort}'
   ```

## Next Steps

1. Apply the fixes using one of the methods above
2. Monitor pod health and restart behavior
3. Update local YAML manifests to match the corrected configuration
4. Consider implementing `/ready` endpoint in services for better readiness detection
5. Add monitoring alerts for health check failures

## Related Files

Local manifests that should be updated to match:
- `C:\Users\citad\OneDrive\Documents\Dating\infrastructure\kubernetes\services\all-services-manifests.yaml`
- `C:\Users\citad\OneDrive\Documents\Dating\infrastructure\kubernetes\services\user-service.yaml`
- `C:\Users\citad\OneDrive\Documents\Dating\infrastructure\kubernetes\services\matching-service.yaml`
- `C:\Users\citad\OneDrive\Documents\Dating\infrastructure\kubernetes\deploy\api-gateway-deploy.yaml`
- `C:\Users\citad\OneDrive\Documents\Dating\infrastructure\kubernetes\deploy\auth-service-deploy.yaml`
- `C:\Users\citad\OneDrive\Documents\Dating\infrastructure\kubernetes\deploy\messaging-service-deploy.yaml`

## Contact

For issues or questions, check:
- AKS cluster: flamoral-prod-aks
- Resource group: flamoral-prod-rg
- Namespace: flamoral-dating
