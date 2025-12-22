# Flamoral Dating Platform - Database Connection Reference

This document provides connection details for the Azure PostgreSQL and Redis instances used in the Flamoral production environment.

## Environment Details

| Component | Value |
|-----------|-------|
| Resource Group | `flamoral-prod-rg` |
| Location | `westus2` |
| AKS Cluster | `flamoral-prod-aks` |
| Kubernetes Namespace | `flamoral` |

---

## Azure Database for PostgreSQL Flexible Server

### Server Configuration

| Property | Value |
|----------|-------|
| Server Name | `flamoral-prod-db` |
| FQDN | `flamoral-prod-db.postgres.database.azure.com` |
| Port | `5432` |
| Admin User | `flamoraladmin` |
| PostgreSQL Version | `15` |
| SKU | `Standard_B1ms` (Burstable) |
| Storage | `32 GB` |
| SSL Mode | `require` |

### Databases

| Database Name | Purpose | Service |
|---------------|---------|---------|
| `flamoral_auth` | Authentication, sessions, tokens | auth-service |
| `flamoral_users` | User profiles, preferences, verification | user-service |
| `flamoral_matching` | Swipes, matches, discovery | matching-service |
| `flamoral_messaging` | Conversations, messages, gifts | messaging-service |

### Connection String Format

```
postgresql://<username>:<password>@flamoral-prod-db.postgres.database.azure.com:5432/<database>?sslmode=require
```

### Service-Specific Connection Strings

**Auth Service:**
```
postgresql://flamoraladmin:<password>@flamoral-prod-db.postgres.database.azure.com:5432/flamoral_auth?sslmode=require
```

**User Service:**
```
postgresql://flamoraladmin:<password>@flamoral-prod-db.postgres.database.azure.com:5432/flamoral_users?sslmode=require
```

**Matching Service:**
```
postgresql://flamoraladmin:<password>@flamoral-prod-db.postgres.database.azure.com:5432/flamoral_matching?sslmode=require
```

**Messaging Service:**
```
postgresql://flamoraladmin:<password>@flamoral-prod-db.postgres.database.azure.com:5432/flamoral_messaging?sslmode=require
```

### Environment Variables

```bash
# PostgreSQL Configuration
POSTGRES_HOST=flamoral-prod-db.postgres.database.azure.com
POSTGRES_PORT=5432
POSTGRES_USER=flamoraladmin
POSTGRES_PASSWORD=<from-keyvault>
POSTGRES_SSL_MODE=require

# Per-service database
AUTH_DATABASE_URL=postgresql://flamoraladmin:<password>@flamoral-prod-db.postgres.database.azure.com:5432/flamoral_auth?sslmode=require
USERS_DATABASE_URL=postgresql://flamoraladmin:<password>@flamoral-prod-db.postgres.database.azure.com:5432/flamoral_users?sslmode=require
MATCHING_DATABASE_URL=postgresql://flamoraladmin:<password>@flamoral-prod-db.postgres.database.azure.com:5432/flamoral_matching?sslmode=require
MESSAGING_DATABASE_URL=postgresql://flamoraladmin:<password>@flamoral-prod-db.postgres.database.azure.com:5432/flamoral_messaging?sslmode=require
```

---

## Azure Cache for Redis

### Server Configuration

| Property | Value |
|----------|-------|
| Cache Name | `flamoral-prod-redis` |
| Hostname | `flamoral-prod-redis.redis.cache.windows.net` |
| SSL Port | `6380` |
| SKU | `Basic` |
| VM Size | `C0` |
| TLS Version | `1.2` |
| Non-SSL Port | Disabled |

### Connection String Format

```
rediss://:<password>@flamoral-prod-redis.redis.cache.windows.net:6380
```

### Environment Variables

```bash
# Redis Configuration
REDIS_HOST=flamoral-prod-redis.redis.cache.windows.net
REDIS_PORT=6380
REDIS_PASSWORD=<from-keyvault>
REDIS_TLS_ENABLED=true
REDIS_URL=rediss://:<password>@flamoral-prod-redis.redis.cache.windows.net:6380
```

### Node.js Connection Example (ioredis)

```typescript
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6380'),
  password: process.env.REDIS_PASSWORD,
  tls: {
    servername: process.env.REDIS_HOST,
  },
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
});
```

### Node.js Connection Example (node-redis)

```typescript
import { createClient } from 'redis';

const client = createClient({
  url: process.env.REDIS_URL,
  socket: {
    tls: true,
    rejectUnauthorized: true,
  },
});

await client.connect();
```

---

## Kubernetes Secrets

### Accessing Secrets

Secrets are stored in the `flamoral` namespace:

```bash
# View PostgreSQL credentials (base64 encoded)
kubectl get secret postgres-credentials -n flamoral -o yaml

# Decode a specific value
kubectl get secret postgres-credentials -n flamoral -o jsonpath='{.data.password}' | base64 -d

# View Redis credentials
kubectl get secret redis-credentials -n flamoral -o yaml
```

### Secret Structure

**postgres-credentials:**
- `host` - PostgreSQL server FQDN
- `port` - PostgreSQL port (5432)
- `username` - Admin username
- `password` - Admin password
- `database` - Default database name
- `connection-string` - Full connection string
- `auth-database-url` - Auth service connection string
- `users-database-url` - User service connection string
- `matching-database-url` - Matching service connection string
- `messaging-database-url` - Messaging service connection string

**redis-credentials:**
- `host` - Redis hostname
- `port` - Redis SSL port (6380)
- `password` - Redis access key
- `connection-string` - Full connection string
- `tls-enabled` - TLS status (true)

### Using Secrets in Deployments

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
spec:
  template:
    spec:
      containers:
      - name: user-service
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: users-database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-credentials
              key: connection-string
```

---

## Azure Key Vault Integration

Secrets are also stored in Azure Key Vault for centralized management:

| Key Vault Secret | Description |
|------------------|-------------|
| `database-password` | PostgreSQL admin password |
| `database-url` | Default PostgreSQL connection string |
| `redis-password` | Redis primary access key |
| `redis-url` | Redis connection string |

### External Secrets Operator

The cluster uses External Secrets Operator to sync secrets from Key Vault:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: flamoral-database-secrets
  namespace: flamoral
spec:
  refreshInterval: 1h
  secretStoreRef:
    kind: ClusterSecretStore
    name: azure-keyvault-store
  data:
  - secretKey: DATABASE_URL
    remoteRef:
      key: database-url
```

---

## Firewall Rules

### PostgreSQL Firewall

The following firewall rules are configured:

| Rule Name | Start IP | End IP | Purpose |
|-----------|----------|--------|---------|
| AllowAzureServices | 0.0.0.0 | 0.0.0.0 | Azure internal services |
| AKS-Outbound-* | (AKS IPs) | (AKS IPs) | AKS cluster egress |

### Redis Access

Azure Cache for Redis (Basic/Standard tier) is accessible via:
- SSL endpoint only (port 6380)
- Access key authentication
- TLS 1.2 minimum

---

## Connectivity Verification

Run the verification script to test connectivity:

```bash
./infrastructure/scripts/verify-database-connectivity.sh
```

Manual PostgreSQL test:
```bash
kubectl run pg-test --rm -it --restart=Never \
  --image=postgres:15-alpine \
  --env="PGPASSWORD=<password>" \
  -- psql -h flamoral-prod-db.postgres.database.azure.com \
         -U flamoraladmin -d flamoral_users -c "SELECT 1;"
```

Manual Redis test:
```bash
kubectl run redis-test --rm -it --restart=Never \
  --image=redis:7-alpine \
  -- redis-cli -h flamoral-prod-redis.redis.cache.windows.net \
               -p 6380 --tls -a '<password>' PING
```

---

## Troubleshooting

### Common Issues

1. **Connection Timeout**
   - Check AKS outbound IPs are in PostgreSQL firewall rules
   - Verify Redis hostname is correct
   - Ensure SSL/TLS is enabled in client configuration

2. **Authentication Failed**
   - Verify password is correct in Kubernetes secret
   - Check username format (just username, not user@server)
   - Ensure Key Vault secrets are synced

3. **SSL/TLS Errors**
   - PostgreSQL: Use `sslmode=require`
   - Redis: Use `rediss://` protocol and port 6380

### Useful Commands

```bash
# Check PostgreSQL server status
az postgres flexible-server show \
  --name flamoral-prod-db \
  --resource-group flamoral-prod-rg \
  --query "state"

# Check Redis status
az redis show \
  --name flamoral-prod-redis \
  --resource-group flamoral-prod-rg \
  --query "provisioningState"

# List PostgreSQL firewall rules
az postgres flexible-server firewall-rule list \
  --name flamoral-prod-db \
  --resource-group flamoral-prod-rg

# Get Redis access keys
az redis list-keys \
  --name flamoral-prod-redis \
  --resource-group flamoral-prod-rg
```

---

## Security Notes

1. **Never commit passwords** to version control
2. **Use Azure Key Vault** for secret management
3. **Rotate credentials** regularly (see azure-keyvault-rotate.sh)
4. **Enable audit logging** on PostgreSQL for compliance
5. **Use connection pooling** for production workloads
6. **Monitor slow queries** using Azure diagnostics
