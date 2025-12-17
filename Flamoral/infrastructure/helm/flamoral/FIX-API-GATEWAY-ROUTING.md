# API Gateway Service Routing Fix

## Problem
Auth endpoints return 503 Service Unavailable due to circuit breaker issues. The root cause is that the API Gateway deployment is missing environment variables that specify the service URLs for inter-service communication in Kubernetes.

## Root Cause Analysis

1. **Configuration Issue**: The API Gateway's `configuration.ts` expects environment variables like `AUTH_SERVICE_URL`, but these are not set in the Helm deployment.

2. **Fallback to localhost**: Without these environment variables, the configuration falls back to `http://localhost:3001`, which doesn't work in Kubernetes where services are accessed via DNS names like `flamoral-auth-service:3001`.

3. **Circuit Breaker Opens**: The proxy service cannot reach the auth service, causing repeated failures that trigger the circuit breaker to open, resulting in 503 errors.

## Solution

### 1. Created ConfigMap Template
**File**: `C:/Users/citad/OneDrive/Documents/Dating/Flamoral/infrastructure/helm/flamoral/templates/configmap.yaml`

This ConfigMap provides all the necessary environment variables for the API Gateway:
- Service URLs using Kubernetes DNS names (e.g., `http://flamoral-auth-service:3001`)
- Circuit breaker configuration
- Proxy configuration
- Service timeouts
- CORS configuration
- Rate limiting configuration

### 2. Update Deployment to Use ConfigMap

**File to modify**: `C:/Users/citad/OneDrive/Documents/Dating/Flamoral/infrastructure/helm/flamoral/templates/deployment.yaml`

**Location**: API Gateway Deployment section (lines 47-51)

**Current code**:
```yaml
          env:
            - name: NODE_ENV
              value: {{ .Values.global.environment | quote }}
            - name: PORT
              value: {{ .Values.apiGateway.service.port | quote }}
```

**Replace with**:
```yaml
          env:
            - name: NODE_ENV
              value: {{ .Values.global.environment | quote }}
            - name: PORT
              value: {{ .Values.apiGateway.service.port | quote }}
          envFrom:
            - configMapRef:
                name: {{ $fullName }}-api-gateway-config
            - secretRef:
                name: {{ $fullName }}-secrets
                optional: true
```

### 3. Add Default Values to values.yaml

**File to modify**: `C:/Users/citad/OneDrive/Documents/Dating/Flamoral/infrastructure/helm/flamoral/values.yaml`

**Add these sections** (if not already present):

```yaml
# Circuit Breaker Configuration
circuitBreaker:
  failureThreshold: 5
  failureRateThreshold: 50
  successThreshold: 5
  timeout: 15000
  resetTimeout: 60000
  minimumRequests: 5
  slowCallThreshold: 5000
  slowCallRateThreshold: 80
  halfOpenMaxCalls: 10
  slidingWindowSize: 100

# Proxy Configuration
proxy:
  maxRetries: 1
  retryDelay: 500

# Service Timeouts
serviceTimeouts:
  default: 15000
  auth: 5000
  user: 10000
  messaging: 15000
  media: 45000
  moderation: 20000
  payment: 30000
  matching: 15000

# CORS Configuration
cors:
  origins: "https://flamoral.com,https://www.flamoral.com,https://admin.flamoral.com"
  credentials: true

# Logging
logging:
  level: info
  format: json

# Rate Limiting
rateLimit:
  user:
    points: 1000
    duration: 900
    blockDuration: 300
  ip:
    points: 500
    duration: 900
    blockDuration: 600
  auth:
    points: 5
    duration: 900
    blockDuration: 3600
```

## Deployment Steps

1. **Apply the changes**:
   ```bash
   # Navigate to the infrastructure directory
   cd C:/Users/citad/OneDrive/Documents/Dating/Flamoral/infrastructure/helm/flamoral

   # Upgrade the Helm release
   helm upgrade flamoral . -f values-prod.yaml --namespace production
   ```

2. **Verify the ConfigMap was created**:
   ```bash
   kubectl get configmap -n production | grep api-gateway-config
   kubectl describe configmap flamoral-api-gateway-config -n production
   ```

3. **Check the API Gateway pods pick up the new environment variables**:
   ```bash
   kubectl rollout restart deployment/flamoral-api-gateway -n production
   kubectl rollout status deployment/flamoral-api-gateway -n production
   ```

4. **Verify the environment variables are set**:
   ```bash
   kubectl exec -n production deployment/flamoral-api-gateway -- env | grep SERVICE_URL
   ```

5. **Test the auth endpoints**:
   ```bash
   curl -X POST https://api.flamoral.com/api/v1/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test123"}'
   ```

6. **Monitor the logs**:
   ```bash
   kubectl logs -n production deployment/flamoral-api-gateway --tail=100 -f
   ```

## Expected Results

After applying these changes:

1. The API Gateway will have the correct service URLs set via environment variables
2. The proxy service will use Kubernetes DNS names to reach the auth service
3. The circuit breaker will remain CLOSED as the service connections succeed
4. Auth endpoints will return proper responses instead of 503 errors
5. The deployment logs will show successful connections to the auth service:
   ```
   [<request-id>] Proxying POST /api/auth/login to authService
   [<request-id>] Response from authService: 200 (45ms)
   ```

## Additional Notes

### Circuit Breaker Settings
The circuit breaker configuration has been tuned for production:
- **Failure Threshold**: 5 failures before opening (faster response)
- **Failure Rate**: 50% failure rate triggers opening
- **Timeout**: 15 seconds before attempting recovery (faster)
- **Minimum Requests**: Only 5 requests needed before evaluating (faster response)

These settings ensure fast failure detection while preventing false positives.

### Service Discovery in Kubernetes
Kubernetes service DNS follows the pattern: `<service-name>.<namespace>.svc.cluster.local`

For simplicity, when services are in the same namespace, you can use the short form: `<service-name>:<port>`

Example: `flamoral-auth-service:3001`

### Troubleshooting

If auth endpoints still return 503 after deployment:

1. **Check if ConfigMap exists**:
   ```bash
   kubectl get configmap flamoral-api-gateway-config -n production -o yaml
   ```

2. **Verify environment variables in pod**:
   ```bash
   kubectl exec -n production deployment/flamoral-api-gateway -- printenv | grep -E "(SERVICE_URL|CIRCUIT_)"
   ```

3. **Check auth service is reachable**:
   ```bash
   kubectl exec -n production deployment/flamoral-api-gateway -- wget -O- http://flamoral-auth-service:3001/health
   ```

4. **View circuit breaker status**:
   Check the API Gateway health endpoint or logs for circuit breaker metrics

5. **Reset circuit breaker** (if needed):
   The circuit breaker has admin endpoints to manually reset circuits if necessary

## Verification Checklist

- [ ] ConfigMap template created at `templates/configmap.yaml`
- [ ] Deployment updated to use `envFrom` with ConfigMap reference
- [ ] Default values added to `values.yaml`
- [ ] Helm upgrade applied to production
- [ ] ConfigMap created successfully
- [ ] API Gateway pods restarted
- [ ] Environment variables verified in pods
- [ ] Auth service connectivity confirmed
- [ ] Auth endpoints tested and returning 200 OK
- [ ] Circuit breaker status shows CLOSED
- [ ] No 503 errors in logs
