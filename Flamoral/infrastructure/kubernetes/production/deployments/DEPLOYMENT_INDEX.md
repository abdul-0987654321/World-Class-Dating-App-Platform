# Flamoral Services Deployment Index

## All Service Deployments

### High-Traffic Tier (On-Demand Nodes)

1. **api-gateway.yaml**
   - Port: 4000
   - Replicas: 2 min
   - Resources: 150m CPU / 256Mi RAM → 500m CPU / 512Mi RAM
   - Health: /health on :4000

2. **user-service.yaml**
   - Port: 3002
   - Replicas: 2 min
   - Resources: 150m CPU / 256Mi RAM → 500m CPU / 512Mi RAM
   - Health: /health on :3002

### Critical Tier (On-Demand Nodes, No Spot)

3. **auth-service.yaml**
   - Port: 3001
   - Replicas: 2 min (always)
   - Resources: 100m CPU / 256Mi RAM → 500m CPU / 512Mi RAM
   - Secrets: JWT, OAuth (Google, Facebook, Apple)
   - Health: /health on :3001

4. **payment-service.yaml**
   - Port: 3005
   - Replicas: 2 min (always)
   - Resources: 150m CPU / 256Mi RAM → 500m CPU / 512Mi RAM
   - Compliance: PCI-DSS
   - Secrets: Stripe API keys
   - Health: /health on :3005

### Medium-Traffic Tier (Spot Instance Eligible)

5. **matching-service.yaml**
   - Port: 3009
   - Replicas: 1 min
   - Resources: 150m CPU / 256Mi RAM → 500m CPU / 512Mi RAM
   - Health: /health on :3009

6. **messaging-service.yaml**
   - Port: 3004
   - Replicas: 1 min
   - Resources: 100m CPU / 256Mi RAM → 400m CPU / 512Mi RAM
   - Health: /health on :3004

7. **media-service.yaml**
   - Port: 3006
   - Replicas: 1 min
   - Resources: 200m CPU / 512Mi RAM → 1000m CPU / 1Gi RAM
   - Secrets: Azure Storage
   - Health: /health on :3006

8. **notification-service.yaml**
   - Port: 3012
   - Replicas: 1 min
   - Resources: 100m CPU / 192Mi RAM → 300m CPU / 384Mi RAM
   - Secrets: SendGrid, Twilio, Firebase
   - Health: /health on :3012

9. **realtime-service.yaml**
   - Port: 8081 (HTTP), 8082 (WebSocket)
   - Replicas: 1 min
   - Resources: 100m CPU / 256Mi RAM → 400m CPU / 512Mi RAM
   - Session Affinity: ClientIP
   - Health: /health on :8081

### Low-Traffic Tier (Spot Instance Eligible)

10. **analytics-service.yaml**
    - Port: 3007
    - Replicas: 1 min
    - Resources: 50m CPU / 128Mi RAM → 200m CPU / 256Mi RAM
    - Health: /health on :3007

11. **moderation-service.yaml**
    - Port: 3008
    - Replicas: 1 min
    - Resources: 100m CPU / 256Mi RAM → 400m CPU / 512Mi RAM
    - Secrets: Azure AI (optional)
    - Health: /health on :3008

12. **admin-service.yaml**
    - Port: 3010
    - Replicas: 1 min
    - Resources: 50m CPU / 128Mi RAM → 200m CPU / 256Mi RAM
    - Health: /health on :3010

13. **advertising-service.yaml**
    - Port: 3011
    - Replicas: 1 min
    - Resources: 50m CPU / 128Mi RAM → 200m CPU / 256Mi RAM
    - Health: /health on :3011

14. **workflow-engine.yaml**
    - Port: 3013
    - Replicas: 1 min
    - Resources: 75m CPU / 192Mi RAM → 300m CPU / 384Mi RAM
    - Health: /health on :3013

## Supporting Files

- **kustomization.yaml** - Orchestrates all deployments
- **README.md** - Comprehensive deployment guide
- **DEPLOYMENT_INDEX.md** - This file

## Services File

- **../services/all-services.yaml** - All 14 Kubernetes Service definitions

## Shared Configuration

### Common Environment Variables
All services include:
- `PORT` - Service port number
- `NODE_ENV=production`
- `SERVICE_NAME` - Service identifier
- `DATABASE_URL` - PostgreSQL connection (from secrets)
- `REDIS_URL` - Redis connection (from secrets)
- `JWT_SECRET` - JWT validation (from secrets)

### Common Secrets Referenced
- `flamoral-database-secrets` - PostgreSQL, Redis
- `flamoral-auth-secrets` - JWT, OAuth
- `flamoral-payment-secrets` - Stripe (payment-service only)
- `flamoral-media-secrets` - Azure Storage (media-service only)
- `flamoral-notification-secrets` - SendGrid, Twilio, Firebase (notification-service only)

### Common Labels
All deployments include:
```yaml
labels:
  app: <service-name>
  tier: <high-traffic|critical|medium-traffic|low-traffic>
  cost-optimization: enabled
  app.kubernetes.io/name: flamoral
  app.kubernetes.io/part-of: flamoral-dating-platform
  environment: production
```

### Common Probes
All services include:
- **Readiness**: HTTP GET /health, 10s initial, 5s period
- **Liveness**: HTTP GET /health, 30s initial, 10s period

## Resource Summary

| Tier | Services | Total Min Replicas | Spot Eligible |
|------|----------|-------------------|---------------|
| High-Traffic | 2 | 4 | No |
| Critical | 2 | 4 | No |
| Medium-Traffic | 5 | 5 | Yes |
| Low-Traffic | 5 | 5 | Yes |
| **TOTAL** | **14** | **18** | **10/14 (71%)** |

## Deployment Checklist

Before deploying:
- [ ] All 14 deployment YAML files present
- [ ] Services YAML file created
- [ ] Kustomization.yaml configured
- [ ] External Secrets synced
- [ ] Container images pushed to ACR
- [ ] Namespace `flamoral` exists

After deploying:
- [ ] All 14 deployments created
- [ ] All 14 services created
- [ ] All pods running (18 minimum)
- [ ] All health checks passing
- [ ] Ingress configured
- [ ] TLS certificates issued

## Quick Commands

```bash
# Deploy all services
kubectl apply -k .

# Or use the deployment script
cd .. && ./deploy-services.sh deploy

# Verify all deployments
kubectl get deployments -n flamoral

# Should show 14 deployments:
# - api-gateway
# - auth-service
# - user-service
# - matching-service
# - messaging-service
# - payment-service
# - media-service
# - analytics-service
# - moderation-service
# - admin-service
# - advertising-service
# - notification-service
# - workflow-engine
# - realtime-service
```

## File Structure

```
deployments/
├── api-gateway.yaml              # High-traffic
├── user-service.yaml             # High-traffic
├── auth-service.yaml             # Critical
├── payment-service.yaml          # Critical
├── matching-service.yaml         # Medium-traffic
├── messaging-service.yaml        # Medium-traffic
├── media-service.yaml            # Medium-traffic
├── notification-service.yaml     # Medium-traffic
├── realtime-service.yaml         # Medium-traffic
├── analytics-service.yaml        # Low-traffic
├── moderation-service.yaml       # Low-traffic
├── admin-service.yaml            # Low-traffic
├── advertising-service.yaml      # Low-traffic
├── workflow-engine.yaml          # Low-traffic
├── kustomization.yaml            # Orchestration
├── README.md                     # Documentation
└── DEPLOYMENT_INDEX.md           # This file
```
