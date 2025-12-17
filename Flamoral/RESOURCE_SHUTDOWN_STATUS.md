# Flamoral Production Resources - Shutdown Status

**Shutdown Date:** December 13, 2025
**Purpose:** Cost savings during development phase

## Resources Stopped

| Resource | Type | Status | Monthly Savings |
|----------|------|--------|-----------------|
| flamoral-prod-aks | AKS Cluster | STOPPED | ~$450/month |
| flamoral-prod-postgres | PostgreSQL Flexible | STOPPING | ~$365/month |

**Estimated Monthly Savings: ~$815/month**

## Resources Still Running (Low Cost)

| Resource | Type | Reason | Est. Cost |
|----------|------|--------|-----------|
| flamoral-prod-afd | Front Door | No traffic = minimal cost | ~$25/month |
| flamoral-prod-redis | Redis Cache | Cannot stop, but idle | ~$15/month |
| flamoral-prod-signalr | SignalR | Cannot stop, but idle | ~$5/month |
| Key Vaults (6) | Key Vault | Storage only | ~$1/month |
| flamoral.com | DNS Zone | Required for domain | ~$0.50/month |

**Estimated Idle Cost: ~$47/month**

## Important Notes

1. **PostgreSQL Auto-Start Warning:** Azure will automatically restart the PostgreSQL server after 7 days of being stopped. You must manually stop it again or start the full deployment.

2. **AKS Cluster:** Can remain stopped indefinitely, but node pools may need recreation if stopped too long.

3. **DNS Zone:** Keep active to maintain domain ownership.

## Restart Procedure

When ready to go live, execute these commands in order:

```bash
# 1. Start PostgreSQL (takes 2-5 minutes)
az postgres flexible-server start \
  --name flamoral-prod-postgres \
  --resource-group flamoral-prod-rg

# 2. Start AKS Cluster (takes 5-10 minutes)
az aks start \
  --name flamoral-prod-aks \
  --resource-group flamoral-prod-rg

# 3. Verify cluster is running
az aks show --name flamoral-prod-aks --resource-group flamoral-prod-rg \
  --query "{name:name, powerState:powerState.code}" -o table

# 4. Get kubectl credentials
az aks get-credentials \
  --name flamoral-prod-aks \
  --resource-group flamoral-prod-rg \
  --overwrite-existing

# 5. Check pods are starting
kubectl get pods -n flamoral

# 6. Deploy remaining configurations
cd infrastructure/kubernetes/production
kubectl apply -f namespace.yaml
kubectl apply -f external-secrets/
kubectl apply -f flamoral-certificate.yaml
kubectl apply -f deployments/

# 7. Run verification
./verify-deployment.sh
```

## Quick Restart Script

Save this as `restart-production.sh`:

```bash
#!/bin/bash
set -e

echo "Starting PostgreSQL..."
az postgres flexible-server start --name flamoral-prod-postgres --resource-group flamoral-prod-rg

echo "Waiting for PostgreSQL to be ready..."
sleep 60

echo "Starting AKS cluster..."
az aks start --name flamoral-prod-aks --resource-group flamoral-prod-rg

echo "Waiting for AKS to be ready..."
sleep 120

echo "Getting kubectl credentials..."
az aks get-credentials --name flamoral-prod-aks --resource-group flamoral-prod-rg --overwrite-existing

echo "Checking cluster status..."
kubectl get nodes
kubectl get pods -n flamoral

echo "Production environment restarted!"
```

## Work Completed While Shutdown

Development work completed during shutdown period:

### Security Fixes (Critical)
- [x] **SSL/TLS Certificate Validation** - Fixed `rejectUnauthorized: false` in 13 database connection files
- [x] **WebSocket CORS Security** - Implemented proper origin validation in API Gateway and Realtime Service
- [x] **Frontend CSP Hardened** - Removed `unsafe-eval`, added proper security headers in nginx.conf
- [x] **Kubernetes Security Contexts** - Added pod/container security contexts to all deployments

### Configuration Fixes
- [x] **Dockerfile Port Mismatches** - Fixed 3 services:
  - matching-service: 3003 → 3009
  - notification-service: 3008 → 3012
  - workflow-engine: 3011 → 3013
- [x] **Frontend .env.production** - Expanded from 4 lines to comprehensive 144-line configuration
- [x] **Nginx Security Headers** - Added HSTS, CSP, Permissions-Policy, proper caching

### Kubernetes Improvements
- [x] **Security Patch Created** - `infrastructure/kubernetes/production/security-patch.yaml`
- [x] **Kustomization Updated** - Security contexts applied via kustomize
- [x] **Volume Mounts Added** - tmp and cache directories for readOnlyRootFilesystem

### Documentation
- [x] **GO_LIVE_CHECKLIST.md** - Created comprehensive 9-phase go-live checklist
- [x] **RESOURCE_SHUTDOWN_STATUS.md** - Updated with completed work

### Pending for Go-Live
- [ ] Populate actual API keys in Azure Key Vault
- [ ] Verify DNS configuration
- [ ] Test end-to-end after restart

## Contact

For restart assistance, refer to:
- PRODUCTION_DEPLOYMENT_GUIDE.md
- DEPLOYMENT_CHECKLIST.md
- infrastructure/INCIDENT_RESPONSE.md
