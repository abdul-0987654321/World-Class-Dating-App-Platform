## 🚢 Production Deployment

### Deployment Overview

The Flamoral platform is deployed on **Azure Kubernetes Service (AKS)** with the following infrastructure:

- **Platform**: Azure Cloud
- **Orchestration**: Kubernetes (AKS)
- **CDN**: Azure Front Door Premium
- **Domains**: flamoral.com, api.flamoral.com, admin.flamoral.com
- **Databases**: PostgreSQL 15, MongoDB, Redis
- **Secrets**: Azure Key Vault (5 vaults, 17 secrets)
- **SSL/TLS**: Let's Encrypt (cert-manager)
- **Monitoring**: Prometheus, Grafana, Application Insights

### Quick Deploy (For Experienced Operators)

```bash
# 1. DNS Setup (5 min)
cd infrastructure/dns && ./configure-dns.sh

# 2. Kubernetes Setup (2 min)
kubectl create namespace flamoral
kubectl config set-context --current --namespace=flamoral

# 3. External Secrets (5 min)
helm install external-secrets external-secrets/external-secrets -n external-secrets-system --create-namespace
kubectl apply -f infrastructure/kubernetes/production/external-secrets/

# 4. TLS Certificates (5 min)
kubectl apply -f infrastructure/kubernetes/production/cert-manager.yaml
kubectl apply -f infrastructure/kubernetes/production/flamoral-certificate.yaml

# 5. Front Door Routes (5 min)
cd infrastructure/azure && ./deploy-frontdoor-routes.sh

# 6. Deploy Services (15 min)
kubectl apply -f infrastructure/kubernetes/production/deployments/
kubectl apply -f infrastructure/kubernetes/deploy/flamoral-web-deploy.yaml
kubectl apply -f infrastructure/kubernetes/deploy/ingress.yaml

# 7. Verify (5 min)
kubectl get pods -n flamoral
curl -I https://flamoral.com
```

**Total Time:** ~45-60 minutes

### Deployment Guides

Choose the guide that matches your experience level:

| Guide | Audience | Content |
|-------|----------|---------|
| **[PRODUCTION_DEPLOYMENT_GUIDE.md](PRODUCTION_DEPLOYMENT_GUIDE.md)** | All users | Complete step-by-step guide with architecture, verification, troubleshooting |
| **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** | Operations teams | Checkbox-format tracking for deployment phases |
| **[QUICK_DEPLOY.md](QUICK_DEPLOY.md)** | Experienced operators | Essential commands only, minimal explanation |

### Key Deployment Resources

- **Subscription**: ebd1613e-fea0-4b6d-8918-7e4de6a71c44
- **Resource Group**: flamoral-prod-rg
- **AKS Cluster**: flamoral-prod-aks
- **Ingress IP**: 48.200.65.15
- **Container Registry**: flamoralacr.azurecr.io
- **Front Door**: flamoral-prod-andtbkagfve5h5da.z01.azurefd.net

### Production URLs

- **Website**: https://flamoral.com
- **API**: https://api.flamoral.com
- **Admin**: https://admin.flamoral.com

**[Complete deployment documentation →](PRODUCTION_DEPLOYMENT_GUIDE.md)**
