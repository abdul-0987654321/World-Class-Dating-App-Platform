# Flamoral Helm Chart - Deployment Fixes Summary

## Overview
This document summarizes all the fixes applied to the Flamoral Helm chart templates to ensure successful Kubernetes deployment.

## Fixed Issues

### 1. Deployment Templates (deployment.yaml)
**Issues Fixed:**
- Added `namespace: {{ .Release.Namespace }}` to all deployment metadata
- Added `envFrom` with secrets reference to all service containers
- Configured proper secret mounting for all 12 microservices:
  - API Gateway
  - Auth Service
  - User Service
  - Matching Service
  - Messaging Service
  - Media Service
  - Payment Service
  - Notification Service
  - Analytics Service
  - Moderation Service
  - Advertising Service
  - Realtime Service (Go)

**Changes:**
```yaml
# Before
metadata:
  name: {{ $fullName }}-service-name
  labels:
    ...

# After
metadata:
  name: {{ $fullName }}-service-name
  namespace: {{ .Release.Namespace }}
  labels:
    ...

# Added envFrom to all containers
envFrom:
  {{- if .Values.secrets.enabled }}
  - secretRef:
      name: {{ $fullName }}-secrets
  {{- end }}
```

### 2. Service Templates (service.yaml)
**Issues Fixed:**
- Added `namespace: {{ .Release.Namespace }}` to all service metadata for proper namespace isolation

**Services Fixed:**
- API Gateway, Auth, User, Matching, Messaging, Media, Payment, Notification, Analytics, Moderation, Advertising, Realtime

### 3. HPA Templates (hpa.yaml)
**Issues Fixed:**
- Added `namespace: {{ .Release.Namespace }}` to existing HPA definitions
- Added missing HPA configurations for 8 services
- Configured memory-based scaling in addition to CPU scaling

**HPAs Added:**
- User Service
- Messaging Service
- Media Service
- Payment Service
- Notification Service
- Analytics Service
- Moderation Service
- Advertising Service

**Configuration:**
```yaml
metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: {{ .Values.autoscaling.targetCPUUtilizationPercentage }}
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: {{ .Values.autoscaling.targetMemoryUtilizationPercentage }}
```

### 4. ConfigMap Template (configmap.yaml)
**Issues Fixed:**
- Added `namespace: {{ .Release.Namespace }}` to ConfigMap metadata

### 5. Ingress Template (ingress.yaml)
**Issues Fixed:**
- Added `namespace: {{ .Release.Namespace }}` to Ingress metadata

### 6. ServiceAccount Template (serviceaccount.yaml)
**Issues Fixed:**
- Added `namespace: {{ .Release.Namespace }}` to ServiceAccount metadata

### 7. Secrets Template (secrets.yaml)
**NEW FILE CREATED**

Created comprehensive secrets template supporting:
- Database credentials (PostgreSQL)
- Redis credentials
- JWT secrets
- OAuth providers (Google, Facebook, Apple)
- Cloud storage (AWS S3, Azure Blob)
- Email services (SendGrid, AWS SES)
- SMS services (Twilio)
- Payment gateways (Stripe, PayPal)
- Push notifications (FCM, APNS)
- AI/ML services (OpenAI, Azure OpenAI)
- Analytics (Segment, Mixpanel)
- Error tracking (Sentry)
- Encryption keys
- Session secrets
- Custom API keys

### 8. Values Configuration (values.yaml)
**Added:**
- Complete secrets configuration section with all supported secret types
- Documentation for external secret management
- Default values for common configurations

## Deployment Instructions

### Prerequisites
1. Kubernetes cluster (v1.19+)
2. Helm 3.x installed
3. kubectl configured to access your cluster
4. Namespace created (if not using default)

### Basic Deployment

```bash
# Create namespace
kubectl create namespace flamoral

# Deploy the chart
helm install flamoral . -n flamoral

# Or with custom values
helm install flamoral . -n flamoral -f values-prod.yaml
```

### Setting Secrets

**Option 1: Using --set flags (for testing only)**
```bash
helm install flamoral . -n flamoral \
  --set secrets.database.password=your-db-password \
  --set secrets.jwt.secret=your-jwt-secret \
  --set secrets.jwt.refreshSecret=your-refresh-secret \
  --set secrets.redis.password=your-redis-password
```

**Option 2: Using separate values file (recommended)**
```bash
# Create secrets-values.yaml (DO NOT commit to Git)
cat > secrets-values.yaml <<EOF
secrets:
  enabled: true
  database:
    password: "your-db-password"
  jwt:
    secret: "your-jwt-secret"
    refreshSecret: "your-refresh-secret"
  redis:
    password: "your-redis-password"
  # Add other secrets...
EOF

# Deploy with secrets
helm install flamoral . -n flamoral -f values.yaml -f secrets-values.yaml
```

**Option 3: Using External Secrets (RECOMMENDED for production)**

Use Azure Key Vault, AWS Secrets Manager, or HashiCorp Vault:

```yaml
# For Azure Key Vault integration
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: flamoral-secrets
  namespace: flamoral
spec:
  provider: azure
  parameters:
    keyvaultName: "your-keyvault-name"
    tenantId: "your-tenant-id"
    objects: |
      array:
        - |
          objectName: database-password
          objectType: secret
        - |
          objectName: jwt-secret
          objectType: secret
```

### Upgrading

```bash
# Upgrade with new values
helm upgrade flamoral . -n flamoral

# Upgrade with new secrets
helm upgrade flamoral . -n flamoral -f values.yaml -f secrets-values.yaml

# Force recreation of pods
helm upgrade flamoral . -n flamoral --force
```

### Verification

```bash
# Check all resources
kubectl get all -n flamoral

# Check deployments
kubectl get deployments -n flamoral

# Check services
kubectl get services -n flamoral

# Check HPAs
kubectl get hpa -n flamoral

# Check secrets (don't view contents in production!)
kubectl get secrets -n flamoral

# Check pod logs
kubectl logs -n flamoral deployment/flamoral-api-gateway
```

## Security Best Practices

1. **Never commit secrets to Git**
   - Add `secrets-values.yaml` to `.gitignore`
   - Use external secret management for production

2. **Use RBAC**
   - Limit access to secrets and sensitive resources
   - Configure ServiceAccount permissions properly

3. **Enable Pod Security Policies**
   ```yaml
   podSecurityContext:
     runAsNonRoot: true
     runAsUser: 1000
     fsGroup: 1000

   securityContext:
     capabilities:
       drop:
         - ALL
     readOnlyRootFilesystem: false
     allowPrivilegeEscalation: false
   ```

4. **Network Policies**
   - Implement network policies to restrict pod-to-pod communication
   - Only allow necessary ingress/egress traffic

5. **TLS/SSL**
   - Enable TLS for all ingress endpoints
   - Use cert-manager for automatic certificate management

## Monitoring and Debugging

### Check Deployment Status
```bash
# Watch deployment rollout
kubectl rollout status deployment/flamoral-api-gateway -n flamoral

# Get deployment details
kubectl describe deployment flamoral-api-gateway -n flamoral

# Check pod status
kubectl get pods -n flamoral -l app.kubernetes.io/component=api-gateway
```

### View Logs
```bash
# Stream logs
kubectl logs -f deployment/flamoral-api-gateway -n flamoral

# View logs for specific pod
kubectl logs flamoral-api-gateway-xxxxx -n flamoral

# View logs for all containers
kubectl logs -n flamoral -l app.kubernetes.io/name=flamoral --all-containers=true
```

### Debug Pod Issues
```bash
# Describe pod to see events
kubectl describe pod flamoral-api-gateway-xxxxx -n flamoral

# Execute shell in pod
kubectl exec -it flamoral-api-gateway-xxxxx -n flamoral -- /bin/sh

# Check environment variables
kubectl exec flamoral-api-gateway-xxxxx -n flamoral -- env
```

## Autoscaling Configuration

The HPA is configured for all services with the following defaults:
- Min replicas: 2
- Max replicas: 10
- CPU target: 70%
- Memory target: 80%

To customize per service:
```yaml
# values.yaml
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 20
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80
```

## Troubleshooting

### Issue: Pods not starting
**Check:**
1. Image pull secrets are configured
2. Images exist in registry
3. Resource limits are appropriate
4. Secrets are properly configured

```bash
kubectl describe pod <pod-name> -n flamoral
kubectl logs <pod-name> -n flamoral
```

### Issue: Services not accessible
**Check:**
1. Service selectors match pod labels
2. Port configurations are correct
3. Ingress is properly configured
4. Network policies allow traffic

```bash
kubectl get svc -n flamoral
kubectl get endpoints -n flamoral
kubectl describe ingress flamoral -n flamoral
```

### Issue: HPA not scaling
**Check:**
1. Metrics server is installed
2. Resource requests are set
3. Metrics are being collected

```bash
kubectl top nodes
kubectl top pods -n flamoral
kubectl describe hpa -n flamoral
```

## Cleanup

```bash
# Uninstall the release
helm uninstall flamoral -n flamoral

# Delete namespace (WARNING: This deletes all resources!)
kubectl delete namespace flamoral
```

## Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Helm Documentation](https://helm.sh/docs/)
- [Azure AKS Best Practices](https://docs.microsoft.com/en-us/azure/aks/best-practices)
- [Kubernetes Security Best Practices](https://kubernetes.io/docs/concepts/security/)

## Support

For issues or questions:
1. Check the logs: `kubectl logs -n flamoral <pod-name>`
2. Review pod events: `kubectl describe pod -n flamoral <pod-name>`
3. Verify configuration: `helm get values flamoral -n flamoral`
4. Contact DevOps team: devops@flamoral.com

---

**Last Updated:** 2025-12-15
**Version:** 1.0.0
**Helm Chart:** flamoral-1.0.0
