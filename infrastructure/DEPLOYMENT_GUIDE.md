# Security Hardened Deployment Guide
## Flamoral Dating Platform

This guide provides step-by-step instructions for deploying the security-hardened Flamoral Dating Platform infrastructure.

---

## Prerequisites

### Required Tools
- **Terraform** >= 1.5.0
- **kubectl** >= 1.28.0
- **Azure CLI** >= 2.50.0
- **Istio CLI (istioctl)** >= 1.20.0
- **Helm** >= 3.12.0
- **Git**

### Azure Requirements
- Active Azure Subscription
- Azure AD Tenant
- Contributor or Owner role on subscription
- Service Principal for Terraform (with appropriate permissions)

### Install Tools

```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Install Terraform
wget https://releases.hashicorp.com/terraform/1.6.6/terraform_1.6.6_linux_amd64.zip
unzip terraform_1.6.6_linux_amd64.zip
sudo mv terraform /usr/local/bin/

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Istio
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.20.0 sh -
sudo mv istio-1.20.0/bin/istioctl /usr/local/bin/

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

---

## Phase 1: Prepare Environment

### 1.1 Clone Repository

```bash
git clone https://github.com/your-org/flamoral-dating-platform.git
cd flamoral-dating-platform/DatingPlatform/infrastructure
```

### 1.2 Authenticate with Azure

```bash
# Login to Azure
az login

# Set your subscription
az account set --subscription "YOUR_SUBSCRIPTION_ID"

# Verify
az account show
```

### 1.3 Configure Backend Storage

```bash
# Create storage account for Terraform state (one time)
az group create \
  --name flamoral-tfstate-rg \
  --location westus2

az storage account create \
  --name flamoraltfstate \
  --resource-group flamoral-tfstate-rg \
  --location westus2 \
  --sku Standard_LRS \
  --encryption-services blob

az storage container create \
  --name tfstate \
  --account-name flamoraltfstate
```

### 1.4 Get Storage Account Key

```bash
STORAGE_KEY=$(az storage account keys list \
  --resource-group flamoral-tfstate-rg \
  --account-name flamoraltfstate \
  --query '[0].value' -o tsv)

echo "STORAGE_KEY=$STORAGE_KEY"
# Save this key securely
```

---

## Phase 2: Production Infrastructure Deployment

### 2.1 Configure Terraform Variables

```bash
cd terraform/environments/prod

# Copy example configuration
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
vim terraform.tfvars
```

**Important: Update these values in terraform.tfvars:**
```hcl
tenant_id = "YOUR_ACTUAL_TENANT_ID"

# SECURITY: Add your authorized IPs
authorized_ip_ranges = [
  "YOUR_OFFICE_IP/24",
  "YOUR_VPN_IP/32"
]

# SECURITY: Enable protection
enable_disk_encryption = true
enable_purge_protection = true
waf_mode = "Prevention"
```

### 2.2 Initialize Terraform

```bash
# Initialize with backend configuration
terraform init \
  -backend-config="storage_account_name=flamoraltfstate" \
  -backend-config="container_name=tfstate" \
  -backend-config="key=prod.terraform.tfstate" \
  -backend-config="access_key=$STORAGE_KEY"
```

### 2.3 Plan Infrastructure

```bash
# Generate and review execution plan
terraform plan -out=prod.tfplan

# Review the plan carefully - verify:
# - WAF security policy is created
# - No PostgreSQL/Redis public firewall rules
# - AKS API restrictions in place
# - Disk encryption enabled
# - Key Vault purge protection enabled (if production)
```

### 2.4 Apply Infrastructure

```bash
# Apply the plan
terraform apply prod.tfplan

# This will take 30-45 minutes to complete
```

### 2.5 Save Outputs

```bash
# Get important outputs
terraform output -json > outputs.json

# Get AKS credentials
az aks get-credentials \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-aks \
  --overwrite-existing

# Verify connection
kubectl get nodes
```

---

## Phase 3: Kubernetes Security Configuration

### 3.1 Apply Pod Security Standards

```bash
cd ../../../kubernetes/security

# Apply Pod Security Standards to namespaces
kubectl apply -f pod-security-standards.yaml

# Verify namespaces have security labels
kubectl get namespace dating-app-production -o yaml | grep pod-security
```

### 3.2 Verify Pod Security Enforcement

```bash
# Try to create privileged pod (should fail)
kubectl run test-privileged \
  --image=nginx \
  --privileged \
  -n dating-app-production

# Expected: Error from admission controller

# Create compliant pod (should succeed)
kubectl run test-compliant \
  --image=nginx \
  --overrides='{
    "spec": {
      "securityContext": {
        "runAsNonRoot": true,
        "runAsUser": 1000,
        "seccompProfile": {"type": "RuntimeDefault"}
      },
      "containers": [{
        "name": "nginx",
        "image": "nginx:alpine",
        "securityContext": {
          "allowPrivilegeEscalation": false,
          "readOnlyRootFilesystem": true,
          "capabilities": {"drop": ["ALL"]}
        }
      }]
    }
  }' \
  -n dating-app-production

# Clean up
kubectl delete pod test-compliant -n dating-app-production
```

---

## Phase 4: Istio Service Mesh Deployment

### 4.1 Install Istio Operator

```bash
# Install Istio operator
istioctl operator init

# Verify operator is running
kubectl get pods -n istio-operator
```

### 4.2 Deploy Istio with mTLS

```bash
# Apply Istio configuration
kubectl apply -f istio-mtls-config.yaml

# Wait for Istio to be ready (5-10 minutes)
kubectl wait --for=condition=available --timeout=600s \
  deployment/istiod -n istio-system

# Verify Istio installation
istioctl verify-install
```

### 4.3 Enable Sidecar Injection

```bash
# Enable automatic sidecar injection for production namespace
kubectl label namespace dating-app-production istio-injection=enabled

# Verify label
kubectl get namespace dating-app-production -o yaml | grep istio-injection
```

### 4.4 Verify mTLS Configuration

```bash
# Check PeerAuthentication policies
kubectl get peerauthentication -A

# Check DestinationRules
kubectl get destinationrules -A

# Check Authorization Policies
kubectl get authorizationpolicies -A
```

---

## Phase 5: Deploy Applications

### 5.1 Create Secrets

```bash
# Generate Elasticsearch password
ELASTIC_PASSWORD=$(openssl rand -base64 32)

kubectl create secret generic elasticsearch-credentials \
  --from-literal=username=elastic \
  --from-literal=password=$ELASTIC_PASSWORD \
  -n logging

# Store password in Key Vault
az keyvault secret set \
  --vault-name flamoral-prod-kv-XXXXXX \
  --name elasticsearch-password \
  --value $ELASTIC_PASSWORD
```

### 5.2 Deploy Application Services

```bash
cd ../../kubernetes/services

# Deploy all microservices
kubectl apply -f user-service.yaml
kubectl apply -f auth-service.yaml
kubectl apply -f matching-service.yaml
kubectl apply -f messaging-service.yaml

# Verify deployments
kubectl get pods -n dating-app-production

# Check that sidecars are injected (2/2 containers)
kubectl get pods -n dating-app-production -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[*].name}{"\n"}{end}'
```

### 5.3 Verify mTLS is Working

```bash
# Get a pod name
POD=$(kubectl get pod -n dating-app-production -l app=user-service -o jsonpath='{.items[0].metadata.name}')

# Check mTLS status
kubectl exec -it $POD -c istio-proxy -n dating-app-production -- \
  pilot-agent request GET stats | grep ssl.handshake

# Expected output should show SSL handshakes occurring
```

---

## Phase 6: Verification and Testing

### 6.1 Verify WAF Protection

```bash
# Get Front Door endpoint
FRONTDOOR_ENDPOINT=$(az network front-door show \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-afd \
  --query frontendEndpoints[0].hostName -o tsv)

# Test normal request (should succeed)
curl -I https://$FRONTDOOR_ENDPOINT/api/health

# Test malicious request (should be blocked with 403)
curl -I https://$FRONTDOOR_ENDPOINT/api/test \
  -H "User-Agent: BadBot" \
  -H "X-Scanner: sqlmap"
```

### 6.2 Verify Database Security

```bash
# PostgreSQL should NOT be accessible from public internet
POSTGRES_FQDN=$(az postgres flexible-server show \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-postgres \
  --query fullyQualifiedDomainName -o tsv)

# This should timeout (no public access)
nc -zv $POSTGRES_FQDN 5432

# From within AKS (should work)
kubectl run postgres-test -it --rm --image=postgres:15 \
  --restart=Never \
  -n dating-app-production -- \
  psql -h $POSTGRES_FQDN -U flamoraladmin -d flamoral
```

### 6.3 Verify AKS API Server Restrictions

```bash
# From unauthorized IP (should fail or timeout)
kubectl get nodes --kubeconfig=./kubeconfig-from-unauthorized-ip

# From authorized IP (should succeed)
kubectl get nodes
```

### 6.4 Verify Disk Encryption

```bash
# Check encryption status
az aks show \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-aks \
  --query "agentPoolProfiles[*].{name:name, encryption:enableEncryptionAtHost}"
```

### 6.5 Verify Key Vault Protection

```bash
# Check purge protection
az keyvault show \
  --name flamoral-prod-kv-XXXXXX \
  --query "properties.{enablePurgeProtection:enablePurgeProtection, enableSoftDelete:enableSoftDelete}"
```

---

## Phase 7: Monitoring and Observability

### 7.1 Access Istio Dashboards

```bash
# Install Kiali (Istio dashboard)
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/kiali.yaml

# Install Prometheus
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/prometheus.yaml

# Install Grafana
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/grafana.yaml

# Access Kiali dashboard
istioctl dashboard kiali

# Access Grafana
istioctl dashboard grafana
```

### 7.2 Configure Azure Monitor

```bash
# Enable Azure Monitor for containers
az aks enable-addons \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-aks \
  --addons monitoring
```

---

## Phase 8: Post-Deployment Checklist

### Security Verification Checklist

- [ ] WAF policy is active and blocking malicious requests
- [ ] PostgreSQL has no public firewall rules (0.0.0.0)
- [ ] Redis has no public firewall rules (0.0.0.0)
- [ ] Elasticsearch has secure password (not hardcoded)
- [ ] AKS API server restricted to authorized IPs only
- [ ] Key Vault has purge protection enabled (production)
- [ ] NSG rules allow HTTPS only (no HTTP)
- [ ] AKS nodes have disk encryption enabled
- [ ] Pod Security Standards enforced (restricted mode)
- [ ] Istio mTLS is active between all services
- [ ] All secrets stored in Azure Key Vault
- [ ] Monitoring and alerting configured
- [ ] Backup policies configured
- [ ] Disaster recovery tested

### Application Verification Checklist

- [ ] All pods running in production namespace
- [ ] All pods have Istio sidecar injected (2/2 containers)
- [ ] Services can communicate via mTLS
- [ ] External services accessible via ServiceEntry
- [ ] Health checks passing
- [ ] Logs flowing to Log Analytics
- [ ] Metrics visible in Prometheus/Grafana
- [ ] Traces visible in distributed tracing
- [ ] Alerts configured for critical metrics
- [ ] Load testing completed

---

## Troubleshooting

### Issue: Terraform fails with permission errors

```bash
# Verify service principal has correct permissions
az ad sp show --id YOUR_SP_CLIENT_ID

# Grant Contributor role if needed
az role assignment create \
  --assignee YOUR_SP_CLIENT_ID \
  --role Contributor \
  --scope /subscriptions/YOUR_SUBSCRIPTION_ID
```

### Issue: Pods fail security admission

```bash
# Check pod security violations
kubectl describe pod POD_NAME -n dating-app-production

# Review namespace security labels
kubectl get namespace dating-app-production -o yaml

# Temporarily switch to warn mode for debugging
kubectl label namespace dating-app-production \
  pod-security.kubernetes.io/enforce=baseline \
  --overwrite
```

### Issue: mTLS not working between services

```bash
# Verify PeerAuthentication is STRICT
kubectl get peerauthentication -A

# Check if sidecar is injected
kubectl get pod POD_NAME -n dating-app-production -o yaml | grep istio-proxy

# Verify Istio config
istioctl analyze -n dating-app-production

# Check sidecar logs
kubectl logs POD_NAME -c istio-proxy -n dating-app-production
```

### Issue: WAF blocking legitimate traffic

```bash
# Check WAF logs
az monitor activity-log list \
  --resource-group flamoral-prod-rg \
  --query "[?contains(operationName.value, 'frontdoor')]"

# Temporarily switch to Detection mode
az network front-door waf-policy update \
  --resource-group flamoral-prod-rg \
  --name flamoralprodwaf \
  --mode Detection

# Review logs, then switch back to Prevention mode
```

---

## Rollback Procedures

### Rollback Terraform Changes

```bash
# If infrastructure deployment fails
terraform destroy -target=RESOURCE_NAME

# Or restore from previous state
terraform state pull > current-state.tfstate.backup
terraform state push previous-state.tfstate
```

### Rollback Kubernetes Changes

```bash
# Remove Pod Security Standards
kubectl label namespace dating-app-production \
  pod-security.kubernetes.io/enforce- \
  pod-security.kubernetes.io/audit- \
  pod-security.kubernetes.io/warn-

# Remove Istio
istioctl uninstall --purge -y
kubectl delete namespace istio-system
```

---

## Maintenance

### Regular Security Tasks

**Daily:**
- Review WAF logs for blocked attacks
- Check security alerts in Azure Security Center
- Monitor failed authentication attempts

**Weekly:**
- Review AKS API server access logs
- Check for pod security violations
- Review certificate expiration dates
- Test backup restore procedures

**Monthly:**
- Rotate secrets and passwords
- Update Kubernetes version
- Review and update authorization policies
- Conduct security audit
- Test disaster recovery procedures

**Quarterly:**
- Review and update authorized IP ranges
- Penetration testing
- Compliance audit
- Update documentation

---

## Support and Resources

### Documentation
- [Security Hardening Guide](./kubernetes/security/SECURITY_HARDENING.md)
- [Security Fixes Summary](./SECURITY_FIXES_SUMMARY.md)

### External Resources
- [Azure AKS Security Best Practices](https://docs.microsoft.com/en-us/azure/aks/security-best-practices)
- [Kubernetes Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [Istio Security](https://istio.io/latest/docs/concepts/security/)
- [Azure WAF Best Practices](https://docs.microsoft.com/en-us/azure/web-application-firewall/afds/waf-front-door-best-practices)

### Contact
- **Security Team:** security@flamoral.com
- **DevOps Team:** devops@flamoral.com
- **Emergency:** incidents@flamoral.com

---

**Last Updated:** 2025-12-11
**Version:** 1.0
**Maintained by:** Flamoral DevOps Team
