# Production Infrastructure Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Infrastructure Overview](#infrastructure-overview)
3. [Deployment Steps](#deployment-steps)
4. [Post-Deployment Verification](#post-deployment-verification)
5. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Tools
- Azure CLI (latest version)
- Terraform >= 1.5.0
- kubectl >= 1.28
- Helm >= 3.0
- Docker
- jq (JSON processor)

### Azure Permissions
- Owner role on subscription
- Ability to create service principals
- Ability to assign RBAC roles

### Environment Variables
Create a `.env` file:
```bash
export ARM_SUBSCRIPTION_ID="your-subscription-id"
export ARM_TENANT_ID="your-tenant-id"
export ARM_CLIENT_ID="your-client-id"
export ARM_CLIENT_SECRET="your-client-secret"

# Application Secrets
export POSTGRES_ADMIN_PASSWORD="your-secure-password-32-chars-min"
export JWT_SECRET="your-jwt-secret-32-chars-min"
export ENCRYPTION_KEY="your-encryption-key-32-chars-min"
export SLACK_WEBHOOK_URL="https://hooks.slack.com/..."
export PAGERDUTY_WEBHOOK_URL="https://events.pagerduty.com/..."
```

## Infrastructure Overview

### Architecture Components

#### 1. Network Layer
- **Primary VNet**: 10.0.0.0/16 (East US)
- **Secondary VNet**: 10.1.0.0/16 (West US 2)
- **Subnets**:
  - AKS: 10.0.1.0/24
  - Database: 10.0.2.0/24
  - Redis: 10.0.3.0/24
  - Private Endpoints: 10.0.4.0/24
  - Firewall: 10.0.5.0/24

#### 2. Compute Layer
- **AKS Cluster**:
  - System Pool: 3-5 nodes (Standard_D4s_v3)
  - User Pool: 3-15 nodes (Standard_D8s_v3)
  - Kubernetes Version: 1.28.3

#### 3. Data Layer
- **PostgreSQL Flexible Server**: GP_Standard_D8s_v3
  - High Availability: Zone-Redundant
  - Read Replica: West US 2
  - Backup: 35 days retention
- **Redis Premium**: P3 (26GB)
  - Persistence: RDB enabled
  - Geo-replication: Enabled

#### 4. CDN & WAF
- **Azure Front Door Premium**:
  - WAF with managed rules
  - Rate limiting: 100 req/min
  - Geo-blocking: High-risk countries
- **Traffic Manager**: Performance routing

#### 5. Security
- **DDoS Protection**: Standard
- **Azure Firewall**: Premium tier
- **Key Vault**: Premium SKU
- **Microsoft Defender**: All services enabled

## Deployment Steps

### Phase 1: Terraform State Backend (5 minutes)

```bash
# 1. Login to Azure
az login
az account set --subscription "YOUR_SUBSCRIPTION_ID"

# 2. Create resource group for Terraform state
az group create --name dating-app-terraform-state --location "East US"

# 3. Create storage account for state
az storage account create \
  --name datingappterraformstate \
  --resource-group dating-app-terraform-state \
  --location "East US" \
  --sku Standard_LRS \
  --encryption-services blob

# 4. Create blob container
az storage container create \
  --name tfstate \
  --account-name datingappterraformstate
```

### Phase 2: Network Infrastructure (15 minutes)

```bash
cd infrastructure/terraform/environments/production

# 1. Initialize Terraform
terraform init

# 2. Create workspace
terraform workspace new production || terraform workspace select production

# 3. Plan network deployment
terraform plan -target=module.vnet -out=vnet.tfplan

# 4. Apply network configuration
terraform apply vnet.tfplan

# 5. Verify VNet creation
az network vnet list -g production-dating-app-rg -o table
```

### Phase 3: Security Infrastructure (20 minutes)

```bash
# 1. Deploy Key Vault and security resources
terraform plan \
  -target=azurerm_key_vault.main \
  -target=azurerm_network_ddos_protection_plan.main \
  -target=azurerm_firewall.main \
  -out=security.tfplan

terraform apply security.tfplan

# 2. Store secrets in Key Vault
az keyvault secret set \
  --vault-name production-dating-kv \
  --name postgres-admin-password \
  --value "${POSTGRES_ADMIN_PASSWORD}"

# Repeat for all secrets...

# 3. Enable Microsoft Defender
terraform apply -target=azurerm_security_center_subscription_pricing
```

### Phase 4: Database Infrastructure (30 minutes)

```bash
# 1. Deploy PostgreSQL primary
terraform plan \
  -target=azurerm_postgresql_flexible_server.main \
  -out=database.tfplan

terraform apply database.tfplan

# 2. Wait for database provisioning (15-20 minutes)
az postgres flexible-server show \
  -g production-dating-app-rg \
  -n production-dating-app-postgres \
  --query "state" -o tsv

# 3. Deploy read replica
terraform apply -target=azurerm_postgresql_flexible_server.replica

# 4. Deploy Redis
terraform apply -target=azurerm_redis_cache.main
```

### Phase 5: AKS Cluster (45 minutes)

```bash
# 1. Deploy AKS cluster
terraform plan -target=module.aks -out=aks.tfplan
terraform apply aks.tfplan

# 2. Get credentials
az aks get-credentials \
  --resource-group production-dating-app-rg \
  --name production-dating-app-aks \
  --admin

# 3. Verify cluster
kubectl get nodes
kubectl cluster-info

# 4. Apply production configurations
kubectl apply -f ../../kubernetes/production/namespace.yaml
kubectl apply -f ../../kubernetes/production/network-policies.yaml
kubectl apply -f ../../kubernetes/production/resource-quotas.yaml
kubectl apply -f ../../kubernetes/production/pod-disruption-budgets.yaml
```

### Phase 6: Storage & CDN (20 minutes)

```bash
# 1. Deploy storage accounts
terraform apply \
  -target=azurerm_storage_account.media \
  -target=azurerm_storage_account.backup

# 2. Deploy Azure Front Door
terraform apply \
  -target=azurerm_cdn_frontdoor_profile.main \
  -target=azurerm_cdn_frontdoor_firewall_policy.main

# 3. Configure Traffic Manager
terraform apply -target=azurerm_traffic_manager_profile.main
```

### Phase 7: Kubernetes Add-ons (30 minutes)

```bash
# 1. Install cert-manager
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true \
  --version v1.13.0

# 2. Install External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets-system \
  --create-namespace \
  --set installCRDs=true

# 3. Install NGINX Ingress Controller
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.annotations."service\.beta\.kubernetes\.io/azure-load-balancer-health-probe-request-path"=/healthz

# 4. Install Prometheus & Grafana
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --values ../../monitoring/prometheus/values-production.yaml

# 5. Apply certificates
kubectl apply -f ../../kubernetes/production/cert-manager.yaml

# 6. Apply External Secrets
kubectl apply -f ../../kubernetes/production/external-secrets.yaml

# 7. Deploy PgBouncer
kubectl apply -f ../../kubernetes/production/pgbouncer.yaml
```

### Phase 8: Monitoring & Alerts (20 minutes)

```bash
# 1. Apply SLO/SLI definitions
kubectl apply -f ../../monitoring/slo-sli-definitions.yaml

# 2. Import Grafana dashboards
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80 &

# Login to Grafana (admin/prom-operator)
# Import dashboards from infrastructure/monitoring/grafana/dashboards/

# 3. Configure Azure Monitor
terraform apply \
  -target=azurerm_monitor_autoscale_setting.aks_user_pool \
  -target=azurerm_monitor_action_group.critical

# 4. Apply alert rules
terraform apply \
  -target=azurerm_monitor_metric_alert.aks_cpu_high \
  -target=azurerm_monitor_metric_alert.postgres_cpu_high
```

### Phase 9: Application Deployment (25 minutes)

```bash
# 1. Build and push container images
az acr login --name productiondatingappacr

docker build -t productiondatingappacr.azurecr.io/dating-api:v1.0.0 ../../backend
docker push productiondatingappacr.azurecr.io/dating-api:v1.0.0

docker build -t productiondatingappacr.azurecr.io/dating-app:v1.0.0 ../../frontend
docker push productiondatingappacr.azurecr.io/dating-app:v1.0.0

# 2. Deploy applications using Helm
helm install dating-api ../../helm/dating-api \
  --namespace dating-app-production \
  --values ../../helm/dating-api/values-prod.yaml \
  --set image.tag=v1.0.0

helm install dating-app ../../helm/dating-app \
  --namespace dating-app-production \
  --values ../../helm/dating-app/values-prod.yaml \
  --set image.tag=v1.0.0

# 3. Verify deployments
kubectl get pods -n dating-app-production
kubectl get svc -n dating-app-production
kubectl get ingress -n dating-app-production
```

### Phase 10: DNS & Traffic Configuration (15 minutes)

```bash
# 1. Get ingress IP
INGRESS_IP=$(kubectl get svc -n ingress-nginx ingress-nginx-controller \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

echo "Ingress IP: ${INGRESS_IP}"

# 2. Update DNS records
az network dns record-set a update \
  --resource-group production-dating-app-rg \
  --zone-name datingapp.com \
  --name api \
  --set aRecords[0].ipv4Address="${INGRESS_IP}"

# 3. Verify DNS propagation
nslookup api.datingapp.com
nslookup www.datingapp.com

# 4. Test HTTPS
curl -I https://api.datingapp.com/health
```

## Post-Deployment Verification

### Health Checks

```bash
# 1. Verify all pods are running
kubectl get pods -n dating-app-production

# 2. Check service endpoints
kubectl get endpoints -n dating-app-production

# 3. Test database connectivity
kubectl run -it --rm debug --image=postgres:15 --restart=Never -- \
  psql -h pgbouncer.dating-app-production.svc.cluster.local \
  -U datingappadmin -d dating_app_production -c "SELECT 1;"

# 4. Test Redis connectivity
kubectl run -it --rm debug --image=redis:7 --restart=Never -- \
  redis-cli -h production-dating-app-redis.redis.cache.windows.net \
  -p 6380 -a "${REDIS_PASSWORD}" --tls PING

# 5. Verify certificates
kubectl get certificates -n dating-app-production

# 6. Check external secrets
kubectl get externalsecrets -n dating-app-production
```

### Security Validation

```bash
# 1. Run security audit
chmod +x ../../security/security-audit.sh
../../security/security-audit.sh

# 2. Verify network policies
kubectl describe networkpolicies -n dating-app-production

# 3. Check pod security
kubectl auth can-i --list --namespace=dating-app-production

# 4. Verify Microsoft Defender
az security pricing list
```

### Performance Testing

```bash
# 1. Load test API
kubectl run -it load-test --image=williamyeh/hey:latest --rm --restart=Never -- \
  /hey -z 30s -c 50 https://api.datingapp.com/health

# 2. Monitor metrics
kubectl port-forward -n monitoring svc/prometheus-server 9090:80
# Open http://localhost:9090

# 3. Check autoscaling
kubectl get hpa -n dating-app-production
```

## Troubleshooting

### Common Issues

#### Issue: Pods stuck in Pending state
```bash
# Check events
kubectl describe pod <pod-name> -n dating-app-production

# Check node resources
kubectl top nodes

# Check PVC status
kubectl get pvc -n dating-app-production
```

#### Issue: Certificate not ready
```bash
# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager

# Describe certificate
kubectl describe certificate <cert-name> -n dating-app-production

# Manual certificate creation
kubectl apply -f ../../kubernetes/production/cert-manager.yaml
```

#### Issue: Database connection failures
```bash
# Check PgBouncer logs
kubectl logs -n dating-app-production deployment/pgbouncer

# Verify secrets
kubectl get secret database-credentials -n dating-app-production -o yaml

# Test connectivity
kubectl run -it --rm debug --image=postgres:15 --restart=Never -- \
  psql -h production-dating-app-postgres.postgres.database.azure.com \
  -U datingappadmin -d dating_app_production
```

### Rollback Procedures

```bash
# Rollback application deployment
helm rollback dating-api -n dating-app-production

# Rollback Terraform changes
terraform plan -destroy -target=<resource>
terraform apply -destroy -target=<resource>

# Restore database from backup
az postgres flexible-server restore \
  --resource-group production-dating-app-rg \
  --name production-dating-app-postgres-restored \
  --source-server production-dating-app-postgres \
  --restore-time "2024-01-01T00:00:00Z"
```

## Maintenance

### Regular Tasks

#### Daily
- Review monitoring dashboards
- Check error rates and latency
- Verify backup completion

#### Weekly
- Review security alerts
- Update container images
- Review resource utilization

#### Monthly
- DR drill
- Security audit
- Cost optimization review
- Certificate expiration check

### Backup Verification

```bash
# Run backup automation
chmod +x ../../disaster-recovery/backup-automation.sh
../../disaster-recovery/backup-automation.sh

# Verify backups in Azure Storage
az storage blob list \
  --account-name productiondatingappbackup \
  --container-name automated-backups \
  --output table
```

## Support Contacts

- **Infrastructure Team**: infrastructure@datingapp.com
- **On-Call**: +1-555-0001
- **Azure Support**: https://portal.azure.com
- **Emergency**: See disaster-recovery/failover-playbook.md

## Additional Resources

- [Disaster Recovery Playbook](disaster-recovery/failover-playbook.md)
- [Security Documentation](security/README.md)
- [Monitoring Runbooks](monitoring/runbooks/)
- [Azure Documentation](https://docs.microsoft.com/azure)
