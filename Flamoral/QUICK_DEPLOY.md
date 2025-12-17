# Flamoral Platform - Quick Deployment Guide

**For experienced Kubernetes operators**

This is a condensed deployment guide with essential commands only. For complete details, see [PRODUCTION_DEPLOYMENT_GUIDE.md](PRODUCTION_DEPLOYMENT_GUIDE.md).

---

## Prerequisites

```bash
# Verify access
az login
az account set --subscription ebd1613e-fea0-4b6d-8918-7e4de6a71c44
az aks get-credentials --resource-group flamoral-prod-rg --name flamoral-prod-aks
kubectl cluster-info

# Verify Key Vault secrets (17 total across 5 vaults)
az keyvault secret list --vault-name flamoralprodauthkv --output table
az keyvault secret list --vault-name flamoralprodpaymentkv --output table
az keyvault secret list --vault-name flamoralproddatakv --output table
az keyvault secret list --vault-name flamoralprodexternalkv --output table
az keyvault secret list --vault-name flamoralprodinfrakv --output table
```

---

## 1. DNS Setup (5 min)

```bash
cd infrastructure/dns
./configure-dns.sh

# Note the 4 nameservers, update at domain registrar
# Update TTL to 300 for initial deployment
```

---

## 2. Namespace (1 min)

```bash
kubectl create namespace flamoral
kubectl label namespace flamoral environment=production app=flamoral-platform
kubectl config set-context --current --namespace=flamoral
```

---

## 3. External Secrets (5 min)

```bash
# Install External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm repo update
helm install external-secrets external-secrets/external-secrets \
  -n external-secrets-system --create-namespace --set installCRDs=true

# Deploy secret stores and external secrets
kubectl apply -f infrastructure/kubernetes/production/external-secrets/

# Verify
kubectl get externalsecrets -n flamoral
kubectl get secrets -n flamoral
```

---

## 4. TLS Certificates (5 min)

```bash
# Install cert-manager
kubectl apply -f infrastructure/kubernetes/production/cert-manager.yaml

# Wait for ready
kubectl wait --for=condition=Available --timeout=300s deployment/cert-manager -n cert-manager

# Create Let's Encrypt issuer
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@flamoral.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF

# Deploy certificate
kubectl apply -f infrastructure/kubernetes/production/flamoral-certificate.yaml

# Monitor (takes 2-5 min)
kubectl get certificate flamoral-tls -n flamoral -w
```

---

## 5. Front Door Routes (5 min)

```bash
cd infrastructure/azure
./deploy-frontdoor-routes.sh

# Verify
az afd route list --endpoint-name flamoral-prod --profile-name flamoral-prod-afd \
  --resource-group flamoral-prod-rg --output table
```

---

## 6. Deploy Services (15 min)

```bash
# Infrastructure services
kubectl apply -f infrastructure/kubernetes/production/pgbouncer-optimized.yaml
kubectl apply -f infrastructure/kubernetes/production/redis-config.yaml

# Application services
kubectl apply -f infrastructure/kubernetes/production/deployments/

# Web application
kubectl apply -f infrastructure/kubernetes/deploy/flamoral-web-deploy.yaml

# Ingress
kubectl apply -f infrastructure/kubernetes/deploy/ingress.yaml

# Autoscaling
kubectl apply -f infrastructure/kubernetes/production/autoscaling/hpa-configs.yaml

# High availability
kubectl apply -f infrastructure/kubernetes/production/pod-disruption-budgets.yaml

# Security
kubectl apply -f infrastructure/kubernetes/production/network-policies.yaml

# Wait for rollout
kubectl rollout status deployment/api-gateway -n flamoral
kubectl rollout status deployment/web-app -n flamoral
```

---

## 7. Verify (5 min)

```bash
# Check all pods running
kubectl get pods -n flamoral

# Check ingress IP
kubectl get ingress -n flamoral

# Check certificate
kubectl get certificate flamoral-tls -n flamoral

# Test internal connectivity
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -n flamoral -- \
  curl http://api-gateway:3000/health

# Test external access
curl -I https://flamoral-prod-andtbkagfve5h5da.z01.azurefd.net
curl -I https://api.flamoral.com/health  # if DNS propagated
```

---

## Post-Deployment

```bash
# Setup monitoring
kubectl apply -f monitoring/prometheus/
kubectl apply -f monitoring/grafana/

# Verify metrics
kubectl port-forward -n monitoring svc/prometheus-server 9090:80 &
kubectl port-forward -n monitoring svc/grafana 3000:80 &

# Configure alerts
kubectl apply -f monitoring/alerting-rules.yaml
```

---

## Quick Reference Commands

```bash
# Status check
kubectl get all -n flamoral

# Logs
kubectl logs -f deployment/api-gateway -n flamoral --tail=100

# Scale
kubectl scale deployment/api-gateway -n flamoral --replicas=5

# Rollback
kubectl rollout undo deployment/api-gateway -n flamoral

# Resource usage
kubectl top nodes
kubectl top pods -n flamoral

# Restart deployment
kubectl rollout restart deployment/api-gateway -n flamoral

# Update image
kubectl set image deployment/api-gateway \
  api-gateway=flamoralacr.azurecr.io/api-gateway:v2.0.1 -n flamoral
```

---

## Rollback (Emergency)

```bash
# Application only
kubectl rollout undo deployment/api-gateway -n flamoral
kubectl rollout undo deployment/auth-service -n flamoral
kubectl rollout undo deployment/messaging-service -n flamoral
kubectl rollout undo deployment/web-app -n flamoral

# Stop traffic (if needed)
kubectl scale deployment ingress-nginx-controller -n ingress-nginx --replicas=0

# Database restore
az postgres flexible-server restore \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-postgres-restored \
  --source-server flamoral-prod-postgres \
  --restore-time "YYYY-MM-DDTHH:MM:SSZ"
```

---

## Troubleshooting Quick Fixes

```bash
# Pods not starting
kubectl describe pod <pod-name> -n flamoral
kubectl logs <pod-name> -n flamoral --previous

# DNS not resolving
nslookup flamoral.com
dig flamoral.com A

# Certificate issues
kubectl describe certificate flamoral-tls -n flamoral
kubectl logs -n cert-manager deployment/cert-manager

# Front Door 503
curl -I https://flamoral.westus2.cloudapp.azure.com/health
az afd origin show --origin-name flamoral-aks-origin \
  --origin-group-name flamoral-origin-group \
  --profile-name flamoral-prod-afd \
  --resource-group flamoral-prod-rg

# Database connection
kubectl exec -it deployment/api-gateway -n flamoral -- \
  node -e "console.log('Testing DB...')"
```

---

## Key Resources

| Resource | Value |
|----------|-------|
| Subscription | ebd1613e-fea0-4b6d-8918-7e4de6a71c44 |
| Resource Group | flamoral-prod-rg |
| AKS Cluster | flamoral-prod-aks |
| Namespace | flamoral |
| Registry | flamoralacr.azurecr.io |
| Ingress IP | 48.200.65.15 |
| Front Door | flamoral-prod-andtbkagfve5h5da.z01.azurefd.net |

---

## Deployment Checklist

- [ ] DNS configured and propagating
- [ ] Namespace created
- [ ] External Secrets synced (17 secrets)
- [ ] TLS certificate issued
- [ ] Front Door routes deployed (6 routes)
- [ ] All pods running
- [ ] Ingress accessible
- [ ] Front Door responding
- [ ] Monitoring configured
- [ ] Alerts configured
- [ ] Team notified

---

**Estimated Total Time:** 45-60 minutes

**For detailed instructions:** See [PRODUCTION_DEPLOYMENT_GUIDE.md](PRODUCTION_DEPLOYMENT_GUIDE.md)

**For tracking:** See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
