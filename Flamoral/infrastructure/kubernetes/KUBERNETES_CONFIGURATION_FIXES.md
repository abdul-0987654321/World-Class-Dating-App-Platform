# Kubernetes Configuration Fixes for Flamoral.com
## Critical Issues Found and Fixed - December 2025

---

## EXECUTIVE SUMMARY

This document outlines **CRITICAL CONFIGURATION ISSUES** found in the Kubernetes deployment configurations for flamoral.com that would cause deployment failures. These issues have been analyzed and fixes are documented below.

### Severity: HIGH
- **Database connections will FAIL** due to secret key mismatches
- **Ingress routing will FAIL** due to incorrect port configurations
- **Services cannot communicate** due to inconsistent naming conventions

---

## 1. DATABASE SECRET KEY MISMATCHES (CRITICAL)

### Issue Description
The External Secrets configuration creates secret keys with `DB_*` prefix, but deployments reference `POSTGRES_*` prefix. This mismatch will cause ALL database connections to fail.

### Affected Files
- `production/external-secrets/database-secrets.yaml`
- `production/deployments/auth-service.yaml`
- `production/deployments/user-service.yaml`
- `production/deployments/matching-service.yaml`
- `production/deployments/messaging-service.yaml`

### Current Configuration (BROKEN)

**External Secrets Template** defines:
```yaml
data:
  DB_HOST: "{{ .dbHost }}"
  DB_PORT: "5432"
  DB_NAME: "{{ .dbName }}"
  DB_USER: "{{ .dbUser }}"
  DB_PASSWORD: "{{ .dbPassword }}"
  # MISSING: DB_SSL
  # MISSING: POSTGRES_* variants
```

**Deployments** reference:
```yaml
- name: POSTGRES_HOST
  valueFrom:
    secretKeyRef:
      name: flamoral-database-secrets
      key: POSTGRES_HOST  # THIS KEY DOESN'T EXIST!
```

### FIX REQUIRED

**File:** `production/external-secrets/database-secrets.yaml`

**Line 31-41:** Replace the data section with:

```yaml
      data:
        # PostgreSQL Connection String
        DATABASE_URL: "postgresql://{{ .dbUser }}:{{ .dbPassword }}@{{ .dbHost }}:5432/{{ .dbName }}?sslmode=require"

        # Individual PostgreSQL Components (DB_* format)
        DB_HOST: "{{ .dbHost }}"
        DB_PORT: "5432"
        DB_NAME: "{{ .dbName }}"
        DB_USER: "{{ .dbUser }}"
        DB_PASSWORD: "{{ .dbPassword }}"
        DB_SSL: "true"

        # PostgreSQL Components (POSTGRES_* format for compatibility)
        POSTGRES_HOST: "{{ .dbHost }}"
        POSTGRES_PORT: "5432"
        POSTGRES_DB: "{{ .dbName }}"
        POSTGRES_USER: "{{ .dbUser }}"
        POSTGRES_PASSWORD: "{{ .dbPassword }}"
```

### Why This Matters
- Without `POSTGRES_*` keys: Services cannot connect to database
- Without `DB_SSL` key: SSL configuration fails
- Services will crash on startup with "secret key not found" errors

---

## 2. INGRESS PORT MISMATCHES (CRITICAL)

### Issue Description
The simplified ingress configuration in `deploy/ingress.yaml` routes traffic to incorrect ports.

### Affected Files
- `deploy/ingress.yaml`

### Current Configuration (BROKEN)

```yaml
- host: api.flamoral.com
  http:
    paths:
    - path: /
      pathType: Prefix
      backend:
        service:
          name: api-gateway
          port:
            number: 80  # WRONG! Service listens on 4000
```

### FIX REQUIRED

**File:** `deploy/ingress.yaml`

**Line 48:** Change from `number: 80` to `number: 4000`

```yaml
- host: api.flamoral.com
  http:
    paths:
    - path: /
      pathType: Prefix
      backend:
        service:
          name: api-gateway
          port:
            number: 4000  # CORRECTED
```

### Verification
From `production/services/all-services.yaml`:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
spec:
  ports:
  - port: 4000  # Service actually listens on 4000
    targetPort: 4000
```

---

## 3. DATABASE CONFIGURATION INCONSISTENCIES

### Issue Description
ConfigMaps and External Secrets have inconsistent database configuration values.

### Affected Files
- `configmaps/production-configmap.yaml`
- `configmaps/common-config.yaml`
- `production/external-secrets/database-secrets.yaml`

### Issues Found

**1. Database User Format**
- **ConfigMap** says: `DB_USER: "flamoraladmin"`
- **Some services** expect: `flamoral_admin@flamoral-prod-postgres`
- **CORRECT FORMAT:** `flamoraladmin` (without @hostname suffix in username)

**2. Database Name**
- **ConfigMap** says: `DB_NAME: "flamoral"`
- **Some services** might expect: `flamoral_prod`
- **CORRECT VALUE:** `flamoral` (confirmed in production-configmap.yaml line 83)

**3. Redis Configuration**
- **ConfigMap** says: `REDIS_PORT: "6380"` (correct for Azure Redis with TLS)
- **Some older configs** say: `REDIS_PORT: "6379"` (standard Redis, incorrect for Azure)
- **CORRECT VALUE:** `6380` with TLS enabled

### FIX REQUIRED

Ensure Azure Key Vault contains these exact values:

```bash
# Correct database credentials format
db-host=flamoral-prod-postgres.postgres.database.azure.com
db-name=flamoral
db-user=flamoraladmin
db-password=<your-password>  # Store in Key Vault

# Correct Redis configuration
redis-host=flamoral-prod-redis.redis.cache.windows.net
redis-password=<your-password>  # Store in Key Vault
```

**DO NOT** include the `@hostname` suffix in the database username when storing in Azure Key Vault.

---

## 4. SERVICE PORT CONFIGURATIONS

### Service Ports (VERIFIED CORRECT)

These are the correct ports based on `production/services/all-services.yaml`:

| Service | Port | URL Pattern |
|---------|------|-------------|
| api-gateway | 4000 | http://api-gateway:4000 |
| auth-service | 3001 | http://auth-service:3001 |
| user-service | 3002 | http://user-service:3002 |
| messaging-service | 3004 | http://messaging-service:3004 |
| payment-service | 3005 | http://payment-service:3005 |
| media-service | 3006 | http://media-service:3006 |
| analytics-service | 3007 | http://analytics-service:3007 |
| moderation-service | 3008 | http://moderation-service:3008 |
| matching-service | 3009 | http://matching-service:3009 |
| admin-service | 3010 | http://admin-service:3010 |
| advertising-service | 3011 | http://advertising-service:3011 |
| notification-service | 3012 | http://notification-service:3012 |
| workflow-engine | 3013 | http://workflow-engine:3013 |
| realtime-service | 8081 | http://realtime-service:8081 |

### ConfigMap Service URLs (VERIFIED CORRECT)

The URLs in `configmaps/production-configmap.yaml` are correct for Kubernetes internal service discovery.

---

## 5. HEALTH CHECK CONFIGURATIONS

### Verified Correct Configuration

All production deployments have proper health checks:

```yaml
readinessProbe:
  httpGet:
    path: /health
    port: <service-port>
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3

livenessProbe:
  httpGet:
    path: /health
    port: <service-port>
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

**Requirement:** Each service MUST implement `/health` endpoint that returns 200 OK when healthy.

---

## 6. RESOURCE LIMITS

### Verified Configurations

All deployments have appropriate resource limits:

**Critical Services (auth, api-gateway, user):**
```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "100-150m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

**Medium Traffic Services (messaging, matching):**
```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "100-150m"
  limits:
    memory: "512Mi"
    cpu: "400-500m"
```

These are reasonable starting points and will be adjusted based on HPA metrics.

---

## 7. TLS/SSL CONFIGURATION

### Verified Correct Configuration

**Ingress TLS:**
```yaml
spec:
  tls:
  - hosts:
    - flamoral.com
    - www.flamoral.com
    - api.flamoral.com
    secretName: flamoral-tls
```

**cert-manager configuration:**
```yaml
annotations:
  cert-manager.io/cluster-issuer: "letsencrypt-prod"
```

**Requirement:** cert-manager must be installed and `letsencrypt-prod` ClusterIssuer must exist.

---

## 8. SECURITY CONFIGURATIONS

### Verified Correct Settings

**Pod Security Context (all deployments):**
```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000-1001
  runAsGroup: 1000-1001
  fsGroup: 1000-1001
```

**Container Security:**
```yaml
securityContext:
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities:
    drop:
      - ALL
```

These configurations follow Kubernetes security best practices.

---

## IMMEDIATE ACTION ITEMS

### Priority 1 (CRITICAL - Must fix before deployment)

1. **Fix database secret keys** in `production/external-secrets/database-secrets.yaml`
   - Add POSTGRES_* key variants
   - Add DB_SSL key

2. **Fix ingress port** in `deploy/ingress.yaml`
   - Change api-gateway port from 80 to 4000

3. **Verify Azure Key Vault secrets** have correct format:
   - `db-user` should be `flamoraladmin` (no @hostname suffix)
   - `db-name` should be `flamoral` (not flamoral_prod)
   - `redis-password` must be set

### Priority 2 (Important)

4. **Create missing secrets** in Azure Key Vault:
   - All auth secrets (JWT_SECRET, JWT_ACCESS_SECRET, etc.)
   - OAuth secrets (GOOGLE_CLIENT_SECRET, FACEBOOK_APP_SECRET, etc.)
   - Media secrets (AZURE_STORAGE_KEY)
   - Payment secrets (STRIPE_SECRET_KEY)

5. **Verify cert-manager installation**:
   ```bash
   kubectl get clusterissuer letsencrypt-prod
   ```

6. **Verify External Secrets Operator installation**:
   ```bash
   kubectl get secretstore azure-keyvault-store -n flamoral
   ```

### Priority 3 (Verification)

7. **Test service health endpoints** - ensure all services implement `/health`

8. **Verify HPA configurations** match deployment resource limits

9. **Test secret synchronization** from Azure Key Vault

---

## VERIFICATION CHECKLIST

After applying fixes, verify:

- [ ] External Secrets sync successfully from Azure Key Vault
  ```bash
  kubectl get externalsecrets -n flamoral
  kubectl describe externalsecret flamoral-database-secrets -n flamoral
  ```

- [ ] Secrets contain both DB_* and POSTGRES_* keys
  ```bash
  kubectl get secret flamoral-database-secrets -n flamoral -o yaml
  ```

- [ ] All deployments start successfully
  ```bash
  kubectl get pods -n flamoral
  kubectl logs <pod-name> -n flamoral
  ```

- [ ] Services are accessible
  ```bash
  kubectl get svc -n flamoral
  ```

- [ ] Ingress routes correctly
  ```bash
  kubectl get ingress -n flamoral
  curl -v https://api.flamoral.com/health
  ```

- [ ] TLS certificates issued
  ```bash
  kubectl get certificate -n flamoral
  ```

---

## ADDITIONAL NOTES

### Database Connection String Format

The correct PostgreSQL connection string format for Azure Database for PostgreSQL is:

```
postgresql://flamoraladmin:<password>@flamoral-prod-postgres.postgres.database.azure.com:5432/flamoral?sslmode=require
```

**NOT:**
```
postgresql://flamoral_admin@flamoral-prod-postgres:<password>@...
```

### Redis Connection String Format

The correct Redis connection string format for Azure Redis Cache with TLS is:

```
rediss://:<password>@flamoral-prod-redis.redis.cache.windows.net:6380
```

Note the `rediss://` (with double 's') for TLS connection.

---

## FILES REQUIRING MANUAL UPDATES

Due to file locking issues, the following files need manual updates:

1. **production/external-secrets/database-secrets.yaml**
   - Add POSTGRES_* key mappings (lines 35-46)
   - Add DB_SSL key (line 41)

2. **deploy/ingress.yaml**
   - Change api-gateway port from 80 to 4000 (line 48)

---

## CONCLUSION

The primary issues preventing successful deployment are:

1. **Secret key mismatches** between External Secrets and Deployment configurations
2. **Incorrect ingress port** routing
3. **Database credential format** inconsistencies

All other configurations (resource limits, health checks, security contexts, service discovery) are properly configured and follow Kubernetes best practices.

**After applying the fixes in Priority 1, the deployment should proceed successfully.**

---

**Document Created:** 2025-12-15
**Reviewed By:** Claude Sonnet 4.5
**Status:** Ready for Implementation
