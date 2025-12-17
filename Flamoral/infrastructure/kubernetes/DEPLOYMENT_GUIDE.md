# Flamoral Kubernetes Deployment Quick Reference Guide

## Prerequisites

### 1. Azure Resources
- [x] AKS Cluster provisioned
- [x] Azure Container Registry (ACR) configured
- [x] Azure Key Vault created with all required secrets
- [x] Azure PostgreSQL database provisioned
- [x] Azure Redis Cache provisioned
- [x] Azure Service Bus namespace created
- [x] DNS records configured for all domains

### 2. Local Tools
```bash
# Required tools
kubectl >= 1.28
helm >= 3.12
azure-cli >= 2.50
```

### 3. Kubernetes Add-ons
- NGINX Ingress Controller
- cert-manager
- External Secrets Operator
- Metrics Server (for HPA)

---

## Initial Cluster Setup

### Step 1: Connect to AKS Cluster
```bash
# Login to Azure
az login

# Set subscription
az account set --subscription "YOUR_SUBSCRIPTION_ID"

# Get AKS credentials
az aks get-credentials --resource-group flamoral-prod-rg --name flamoral-prod-aks

# Verify connection
kubectl cluster-info
kubectl get nodes
```

### Step 2: Install Required Add-ons

#### Install NGINX Ingress Controller
```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.annotations."service\.beta\.kubernetes\.io/azure-load-balancer-health-probe-request-path"=/healthz
```

#### Install cert-manager
```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true
```

#### Install External Secrets Operator
```bash
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

helm install external-secrets \
  external-secrets/external-secrets \
  --namespace external-secrets-system \
  --create-namespace
```

---

## Deployment Steps

### Step 1: Create Namespaces
```bash
kubectl apply -f base/namespace.yaml

# Verify
kubectl get namespaces | grep flamoral
```

Expected output:
```
flamoral-prod      Active   1m
flamoral-staging   Active   1m
flamoral-dev       Active   1m
```

### Step 2: Apply Resource Quotas
```bash
kubectl apply -f production/cost-optimization/namespace-quotas.yaml

# Verify
kubectl describe quota -n flamoral-prod
```

### Step 3: Configure Azure Key Vault Access

#### Option A: Using Managed Identity (Recommended)
```bash
# Get AKS identity
AKS_IDENTITY=$(az aks show -g flamoral-prod-rg -n flamoral-prod-aks --query identityProfile.kubeletidentity.clientId -o tsv)

# Grant access to Key Vault
az keyvault set-policy \
  --name flamoral-prod-kv \
  --object-id $AKS_IDENTITY \
  --secret-permissions get list
```

#### Option B: Using Service Principal
```bash
# Create service principal (if not exists)
az ad sp create-for-rbac --name flamoral-aks-sp

# Note the output: appId, password, tenant

# Grant access to Key Vault
az keyvault set-policy \
  --name flamoral-prod-kv \
  --spn <appId> \
  --secret-permissions get list

# Create secret in Kubernetes
kubectl create secret generic azure-secret-sp \
  --namespace external-secrets-system \
  --from-literal=client-id=<appId> \
  --from-literal=client-secret=<password>
```

### Step 4: Apply External Secrets Configuration
```bash
kubectl apply -f secrets/external-secrets-operator.yaml

# Wait for secrets to sync (may take 1-2 minutes)
sleep 60

# Verify secrets were created
kubectl get secrets -n flamoral-prod | grep flamoral
```

Expected secrets:
- flamoral-database-secrets
- flamoral-auth-secrets
- flamoral-oauth-secrets
- flamoral-payment-secrets
- flamoral-communication-secrets
- flamoral-azure-secrets
- flamoral-ai-secrets
- flamoral-monitoring-secrets

### Step 5: Apply ConfigMaps
```bash
kubectl apply -f base/configmap.yaml

# Verify
kubectl get configmaps -n flamoral-prod
```

### Step 6: Deploy Services
```bash
kubectl apply -f production/services-all.yaml

# Verify all services are created
kubectl get services -n flamoral-prod
```

Expected: 24 services

### Step 7: Deploy Applications
```bash
# Deploy all production services
kubectl apply -f production/deployments/

# Watch deployment progress
kubectl get deployments -n flamoral-prod -w
```

Wait until all deployments show READY status.

### Step 8: Apply Ingress Configuration
```bash
# Apply cert-manager issuers first
kubectl apply -f production/cert-manager.yaml

# Wait for issuer to be ready
kubectl get clusterissuer

# Apply ingress
kubectl apply -f base/ingress.yaml
kubectl apply -f ingress/ingress-nginx.yaml

# Get ingress IP
kubectl get ingress -n flamoral-prod
```

### Step 9: Configure DNS
```bash
# Get the external IP of ingress
INGRESS_IP=$(kubectl get service -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

echo "Configure these DNS A records:"
echo "flamoral.com          -> $INGRESS_IP"
echo "www.flamoral.com      -> $INGRESS_IP"
echo "api.flamoral.com      -> $INGRESS_IP"
echo "admin.flamoral.com    -> $INGRESS_IP"
echo "ws.flamoral.com       -> $INGRESS_IP"
echo "media.flamoral.com    -> $INGRESS_IP"
```

### Step 10: Verify SSL Certificates
```bash
# Wait for certificates to be issued (may take 5-10 minutes)
kubectl get certificates -n flamoral-prod

# Check certificate details
kubectl describe certificate flamoral-tls -n flamoral-prod
```

### Step 11: Apply Autoscaling (HPA)
```bash
kubectl apply -f production/autoscaling/hpa-configs.yaml

# Verify HPAs
kubectl get hpa -n flamoral-prod
```

---

## Verification Commands

### Check All Pods
```bash
kubectl get pods -n flamoral-prod
```

All pods should be in "Running" state with READY 1/1.

### Check Logs
```bash
# View logs for a specific service
kubectl logs -f deployment/auth-service -n flamoral-prod

# View logs for all replicas
kubectl logs -l app=auth-service -n flamoral-prod --tail=100
```

### Test Internal Service Communication
```bash
# Create a debug pod
kubectl run debug --image=curlimages/curl -it --rm -n flamoral-prod -- sh

# Inside the pod, test service connectivity
curl http://auth-service:3001/health
curl http://user-service:3002/health
```

### Test External Access
```bash
# Test API endpoint
curl https://api.flamoral.com/health

# Test WebSocket
curl https://ws.flamoral.com/health
```

### Check Resource Usage
```bash
# Pod resource usage
kubectl top pods -n flamoral-prod

# Node resource usage
kubectl top nodes

# Quota usage
kubectl describe quota flamoral-production-quota -n flamoral-prod
```

---

## Common Issues and Troubleshooting

### Issue: Pods in ImagePullBackOff
```bash
# Check if AKS has access to ACR
az aks check-acr --name flamoral-prod-aks --resource-group flamoral-prod-rg --acr flamoraldevacr.azurecr.io

# Grant access if needed
az aks update -n flamoral-prod-aks -g flamoral-prod-rg --attach-acr flamoraldevacr
```

### Issue: External Secrets Not Syncing
```bash
# Check External Secret status
kubectl describe externalsecret flamoral-database-external -n flamoral-prod

# Check External Secrets Operator logs
kubectl logs -n external-secrets-system deployment/external-secrets
```

### Issue: Certificate Not Issuing
```bash
# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager

# Check certificate request
kubectl describe certificaterequest -n flamoral-prod

# Check challenge status (for HTTP-01)
kubectl describe challenge -n flamoral-prod
```

### Issue: Service Returning 502/503
```bash
# Check pod health
kubectl describe pod <pod-name> -n flamoral-prod

# Check readiness probe
kubectl get events -n flamoral-prod --sort-by='.lastTimestamp'

# Check service endpoints
kubectl get endpoints -n flamoral-prod
```

---

## Rollback Procedures

### Rollback a Deployment
```bash
# View rollout history
kubectl rollout history deployment/auth-service -n flamoral-prod

# Rollback to previous version
kubectl rollout undo deployment/auth-service -n flamoral-prod

# Rollback to specific revision
kubectl rollout undo deployment/auth-service --to-revision=2 -n flamoral-prod
```

### Emergency Shutdown
```bash
# Scale down all deployments
kubectl scale deployment --all --replicas=0 -n flamoral-prod

# Scale back up
kubectl scale deployment --all --replicas=1 -n flamoral-prod
```

---

## Monitoring and Alerts

### View Cluster Events
```bash
kubectl get events -n flamoral-prod --sort-by='.lastTimestamp' | tail -20
```

### Check HPA Metrics
```bash
kubectl get hpa -n flamoral-prod --watch
```

### View Application Insights
```bash
# Connection string is in secrets
kubectl get secret flamoral-monitoring-secrets -n flamoral-prod -o jsonpath='{.data.APPLICATION_INSIGHTS_CONNECTION_STRING}' | base64 -d
```

---

## Maintenance Tasks

### Update ConfigMap
```bash
# Edit ConfigMap
kubectl edit configmap flamoral-config -n flamoral-prod

# Restart deployments to pick up changes
kubectl rollout restart deployment -n flamoral-prod
```

### Update Secrets
Update in Azure Key Vault - External Secrets Operator will sync automatically (default: 1 hour).

To force immediate sync:
```bash
kubectl annotate externalsecret flamoral-database-external -n flamoral-prod force-sync=$(date +%s)
```

### Scale Services
```bash
# Manual scaling
kubectl scale deployment auth-service --replicas=5 -n flamoral-prod

# Check current replicas
kubectl get deployment auth-service -n flamoral-prod
```

---

## Backup and Disaster Recovery

### Backup Current State
```bash
# Export all resources
kubectl get all -n flamoral-prod -o yaml > backup-flamoral-prod-$(date +%Y%m%d).yaml

# Export secrets (encrypted)
kubectl get secrets -n flamoral-prod -o yaml > backup-secrets-$(date +%Y%m%d).yaml
```

### Database Backup
```bash
# PostgreSQL backup via Azure
az postgres server backup create \
  --resource-group flamoral-prod-rg \
  --server-name flamoral-prod-postgres \
  --name manual-backup-$(date +%Y%m%d)
```

---

## Post-Deployment Checklist

- [ ] All pods running (24/24)
- [ ] All services accessible internally
- [ ] Ingress external IP assigned
- [ ] DNS records configured
- [ ] SSL certificates issued
- [ ] Health checks passing
- [ ] HPA configured and working
- [ ] External Secrets syncing
- [ ] Application Insights connected
- [ ] Logs flowing to monitoring
- [ ] Backup procedures tested
- [ ] Rollback procedure documented

---

## Support and Documentation

- **Kubernetes Docs**: https://kubernetes.io/docs/
- **Azure AKS Docs**: https://docs.microsoft.com/en-us/azure/aks/
- **cert-manager Docs**: https://cert-manager.io/docs/
- **External Secrets Docs**: https://external-secrets.io/

---

## Quick Commands Reference

```bash
# View all resources in namespace
kubectl get all -n flamoral-prod

# Describe a resource
kubectl describe pod/<pod-name> -n flamoral-prod

# Execute command in pod
kubectl exec -it <pod-name> -n flamoral-prod -- /bin/sh

# Port forward to local
kubectl port-forward svc/auth-service 3001:3001 -n flamoral-prod

# View resource usage
kubectl top pods -n flamoral-prod
kubectl top nodes

# Get pod logs
kubectl logs -f <pod-name> -n flamoral-prod

# Delete a resource
kubectl delete pod <pod-name> -n flamoral-prod

# Apply changes
kubectl apply -f <file.yaml>

# Force restart
kubectl rollout restart deployment/<name> -n flamoral-prod
```

---

**Last Updated**: 2025-12-16
**Version**: 1.0
