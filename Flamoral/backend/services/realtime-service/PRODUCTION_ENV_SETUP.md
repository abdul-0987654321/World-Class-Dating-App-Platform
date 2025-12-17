# Realtime Service Production Environment Setup

## Required Environment Variables for Production

Copy this configuration to your production environment or Azure Key Vault.

### .env.production

```bash
#================================================================
# REALTIME SERVICE - PRODUCTION CONFIGURATION
#================================================================

#----------------------------------------------------------------
# Server Configuration
#----------------------------------------------------------------
PORT=8081
ENVIRONMENT=production
LOG_LEVEL=warn

#----------------------------------------------------------------
# CORS Origins - Production Only
#----------------------------------------------------------------
# IMPORTANT: Only include production domains, no localhost
ALLOWED_ORIGINS=https://flamoral.com,https://www.flamoral.com,https://admin.flamoral.com,https://app.flamoral.com

#----------------------------------------------------------------
# Service Authentication - CRITICAL
# Generate: openssl rand -hex 32
# STORE IN AZURE KEY VAULT
#----------------------------------------------------------------
SERVICE_TOKEN=***

#----------------------------------------------------------------
# Redis Configuration - Azure Cache for Redis Premium
#----------------------------------------------------------------
REDIS_HOST=flamoral-prod-redis.redis.cache.windows.net
REDIS_PORT=6380
REDIS_PASSWORD=***
REDIS_DB=0
REDIS_TLS=true

#----------------------------------------------------------------
# JWT Configuration - CRITICAL
# MUST match auth-service configuration
# STORE IN AZURE KEY VAULT
#----------------------------------------------------------------
JWT_SECRET=***
JWT_ISSUER=flamoral-auth-service
JWT_EXPIRATION=15m

#----------------------------------------------------------------
# WebSocket Configuration - Production Optimized
#----------------------------------------------------------------
WS_READ_BUFFER_SIZE=4096
WS_WRITE_BUFFER_SIZE=4096
WS_MAX_MESSAGE_SIZE=524288
WS_PONG_WAIT=60s
WS_PING_PERIOD=54s
WS_WRITE_WAIT=10s
WS_HANDSHAKE_TIMEOUT=10s

#----------------------------------------------------------------
# Rate Limiting - Stricter for Production
#----------------------------------------------------------------
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=1m

#----------------------------------------------------------------
# Presence Configuration
#----------------------------------------------------------------
PRESENCE_TTL=5m
PRESENCE_HEARTBEAT=30s

#----------------------------------------------------------------
# Typing Configuration
#----------------------------------------------------------------
TYPING_TIMEOUT=5s

#----------------------------------------------------------------
# Connection Pool Optimization
#----------------------------------------------------------------
WS_MAX_CONNECTIONS=10000
WS_IDLE_TIMEOUT=5m
WS_HEARTBEAT_INTERVAL=30s
WS_HEARTBEAT_TIMEOUT=60s
WS_CONNECTION_DRAIN_TIME=30s

#----------------------------------------------------------------
# Message Compression - Reduce Bandwidth Costs
#----------------------------------------------------------------
WS_COMPRESSION_ENABLED=true
WS_COMPRESSION_THRESHOLD=1024
WS_COMPRESSION_LEVEL=6

#----------------------------------------------------------------
# Message Batching - Reduce Message Overhead
#----------------------------------------------------------------
WS_BATCHING_ENABLED=true
WS_BATCH_SIZE=10
WS_BATCH_INTERVAL=100ms
WS_MAX_BATCH_WAIT=500ms

#----------------------------------------------------------------
# Presence Optimization
#----------------------------------------------------------------
WS_PRESENCE_THROTTLE=30s
WS_PRESENCE_BATCH=true
WS_PRESENCE_BATCH_INTERVAL=5s

#----------------------------------------------------------------
# Rate Limiting per Connection
#----------------------------------------------------------------
WS_MESSAGE_RATE_LIMIT=60
WS_RATE_LIMIT_WINDOW=1m

#----------------------------------------------------------------
# Memory Optimization
#----------------------------------------------------------------
WS_MESSAGE_BUFFER_SIZE=256
WS_READ_BUFFER_SIZE=4096
WS_WRITE_BUFFER_SIZE=4096
WS_MAX_MESSAGE_QUEUE=100
WS_MESSAGE_POOLING=true

#----------------------------------------------------------------
# Auto-Scaling Triggers
#----------------------------------------------------------------
WS_CPU_SCALE_THRESHOLD=75.0
WS_MEMORY_SCALE_THRESHOLD=80.0
WS_CONNECTIONS_PER_INSTANCE=5000

#----------------------------------------------------------------
# Circuit Breaker for External Services
#----------------------------------------------------------------
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_SUCCESS_THRESHOLD=2
CIRCUIT_BREAKER_TIMEOUT=30s
CIRCUIT_BREAKER_RESET_TIMEOUT=60s
```

---

## Azure Key Vault Setup

### Store These Secrets in Azure Key Vault:

```bash
# Generate SERVICE_TOKEN
openssl rand -hex 32

# Azure Key Vault Secrets to Create:
az keyvault secret set --vault-name flamoral-prod-kv --name realtime-service-token --value "YOUR_GENERATED_TOKEN"
az keyvault secret set --vault-name flamoral-prod-kv --name jwt-secret --value "YOUR_JWT_SECRET"
az keyvault secret set --vault-name flamoral-prod-kv --name redis-password --value "YOUR_REDIS_PASSWORD"
```

### Kubernetes Secret Configuration:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: realtime-service-secrets
  namespace: flamoral-prod
type: Opaque
stringData:
  SERVICE_TOKEN: "<from-key-vault>"
  JWT_SECRET: "<from-key-vault>"
  REDIS_PASSWORD: "<from-key-vault>"
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] Generate strong SERVICE_TOKEN (64+ characters)
- [ ] Store all secrets in Azure Key Vault
- [ ] Update CORS origins (remove development URLs)
- [ ] Verify REDIS_TLS=true
- [ ] Verify JWT_ISSUER matches auth-service
- [ ] Test configuration in staging environment

### Deployment

- [ ] Apply Kubernetes secrets
- [ ] Deploy realtime-service with new config
- [ ] Verify health endpoint responds
- [ ] Check Redis connection
- [ ] Monitor logs for errors
- [ ] Verify WebSocket connections work

### Post-Deployment

- [ ] Test WebSocket from web app
- [ ] Test WebSocket from mobile app
- [ ] Verify real-time message delivery
- [ ] Check typing indicators
- [ ] Verify presence updates
- [ ] Monitor connection metrics
- [ ] Set up alerts for connection failures

---

## Verification Commands

```bash
# Check service health
curl https://api.flamoral.com/realtime/health

# Check ready status
curl https://api.flamoral.com/realtime/ready

# Test WebSocket connection (requires valid JWT)
wscat -c "wss://api.flamoral.com/ws" -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Check metrics
curl https://api.flamoral.com/realtime/metrics
```

---

## Monitoring

### Key Metrics to Monitor

- Active WebSocket connections
- Connection establishment rate
- Message delivery latency
- Reconnection rate
- Redis pub/sub message rate
- Error rate by type
- CPU and memory usage

### Azure Application Insights Queries

```kusto
// WebSocket connection errors
traces
| where message contains "WebSocket" and severityLevel >= 3
| project timestamp, message, severityLevel
| order by timestamp desc

// Redis connection issues
traces
| where message contains "Redis" and message contains "failed"
| project timestamp, message
| order by timestamp desc

// Authentication failures
traces
| where message contains "token" or message contains "auth"
| where severityLevel >= 3
| project timestamp, message
| order by timestamp desc
```

---

## Troubleshooting

### Issue: Service won't start

Check:
1. JWT_SECRET is set
2. SERVICE_TOKEN is set
3. Redis credentials are correct
4. REDIS_TLS matches your Redis configuration

### Issue: WebSocket connections fail

Check:
1. CORS origins include client domain
2. Load balancer supports WebSocket upgrade
3. Firewall allows WebSocket protocol
4. JWT token is valid

### Issue: Redis connection fails

Check:
1. REDIS_TLS=true for Azure Redis
2. Port is 6380 (not 6379) for TLS
3. Redis password is correct
4. Firewall rules allow connection

---

**Last Updated:** 2025-12-15
**Environment:** Production
**Service:** realtime-service
