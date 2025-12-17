# ExternalDNS Setup Guide

## Overview

ExternalDNS automatically synchronizes Kubernetes Ingress resources with Azure DNS, eliminating the need for manual DNS record management.

## Features

- Automatic DNS record creation from Ingress resources
- Synchronization with Azure DNS
- Support for multiple domains and subdomains
- Automatic cleanup when Ingress resources are deleted
- Metrics export for monitoring

## Prerequisites

1. **Azure DNS Zone** must exist (created via Terraform or Azure CLI)
2. **AKS Cluster** with managed identity enabled
3. **Azure RBAC** permissions for the AKS managed identity

## Setup Steps

### Step 1: Grant AKS Managed Identity DNS Permissions

Get the AKS cluster's managed identity:

```bash
# Get the managed identity client ID
IDENTITY_CLIENT_ID=$(az aks show \
    --resource-group flamoral-prod-rg \
    --name flamoral-prod-aks \
    --query identityProfile.kubeletidentity.clientId \
    --output tsv)

echo "AKS Managed Identity Client ID: ${IDENTITY_CLIENT_ID}"

# Get the DNS zone resource ID
DNS_ZONE_ID=$(az network dns zone show \
    --name flamoral.com \
    --resource-group flamoral-prod-rg \
    --query id \
    --output tsv)

echo "DNS Zone Resource ID: ${DNS_ZONE_ID}"

# Grant DNS Zone Contributor role to AKS managed identity
az role assignment create \
    --assignee ${IDENTITY_CLIENT_ID} \
    --role "DNS Zone Contributor" \
    --scope ${DNS_ZONE_ID}

# Also grant Reader role to the resource group
RG_ID=$(az group show --name flamoral-prod-rg --query id --output tsv)
az role assignment create \
    --assignee ${IDENTITY_CLIENT_ID} \
    --role "Reader" \
    --scope ${RG_ID}
```

### Step 2: Update ConfigMap with Azure Details

Edit the `external-dns.yaml` file and replace the placeholders:

```bash
# Get your Azure subscription and tenant IDs
SUBSCRIPTION_ID=$(az account show --query id --output tsv)
TENANT_ID=$(az account show --query tenantId --output tsv)

# Update the ConfigMap in external-dns.yaml
# Replace ${AZURE_SUBSCRIPTION_ID} with your subscription ID
# Replace ${AZURE_TENANT_ID} with your tenant ID
```

Or use this script to create the ConfigMap:

```bash
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: external-dns-config
  namespace: kube-system
  labels:
    app: external-dns
data:
  azure.json: |
    {
      "tenantId": "$(az account show --query tenantId --output tsv)",
      "subscriptionId": "$(az account show --query id --output tsv)",
      "resourceGroup": "flamoral-prod-rg",
      "useManagedIdentityExtension": true
    }
EOF
```

### Step 3: Deploy ExternalDNS

```bash
# Deploy ExternalDNS
kubectl apply -f infrastructure/k8s/external-dns.yaml

# Verify deployment
kubectl get deployment external-dns -n kube-system

# Check logs
kubectl logs -n kube-system -l app=external-dns --tail=50 -f
```

### Step 4: Annotate Existing Ingress Resources

Add annotations to your ingress resources to enable automatic DNS management:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: flamoral-ingress
  namespace: flamoral
  annotations:
    # ExternalDNS annotations
    external-dns.alpha.kubernetes.io/hostname: flamoral.com,www.flamoral.com,api.flamoral.com,admin.flamoral.com
    external-dns.alpha.kubernetes.io/ttl: "300"  # Optional: custom TTL

    # Existing annotations
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  # ... rest of ingress spec
```

Apply the updated ingress:

```bash
kubectl apply -f infrastructure/k8s/production-ingress.yaml
```

## Verification

### Check ExternalDNS Status

```bash
# Check deployment status
kubectl get deployment external-dns -n kube-system

# View logs
kubectl logs -n kube-system -l app=external-dns --tail=100

# Check for errors
kubectl logs -n kube-system -l app=external-dns | grep -i error
```

### Verify DNS Records Created

```bash
# List all A records in Azure DNS
az network dns record-set a list \
    --zone-name flamoral.com \
    --resource-group flamoral-prod-rg \
    --output table

# Check TXT records (used by ExternalDNS for ownership)
az network dns record-set txt list \
    --zone-name flamoral.com \
    --resource-group flamoral-prod-rg \
    --output table
```

### Test DNS Resolution

```bash
# Test each domain
nslookup flamoral.com
nslookup www.flamoral.com
nslookup api.flamoral.com
nslookup admin.flamoral.com
```

## Configuration Options

### Policy Modes

**sync** (Recommended for Production):
- Creates, updates, and deletes DNS records
- Removes records when Ingress is deleted
- Full synchronization

```yaml
args:
- --policy=sync
```

**upsert-only** (Conservative):
- Only creates and updates records
- Never deletes records
- Safer for manual DNS management

```yaml
args:
- --policy=upsert-only
```

### TTL Configuration

Default TTL for all records:

```yaml
args:
- --txt-cache-interval=1h
```

Per-ingress TTL override:

```yaml
annotations:
  external-dns.alpha.kubernetes.io/ttl: "300"
```

### Domain Filtering

Restrict to specific domains:

```yaml
args:
- --domain-filter=flamoral.com
- --domain-filter=another-domain.com
```

Exclude specific domains:

```yaml
args:
- --exclude-domains=test.flamoral.com
```

### Registry Types

**txt** (Recommended):
- Creates TXT records for ownership tracking
- Safer, prevents conflicts
- Allows multiple ExternalDNS instances

```yaml
args:
- --registry=txt
- --txt-owner-id=flamoral-k8s
```

**noop**:
- No ownership tracking
- Simpler but less safe

```yaml
args:
- --registry=noop
```

## Ingress Annotations Reference

### Basic Annotations

```yaml
annotations:
  # Hostname(s) to create DNS records for
  external-dns.alpha.kubernetes.io/hostname: flamoral.com,www.flamoral.com

  # Custom TTL for this ingress
  external-dns.alpha.kubernetes.io/ttl: "300"

  # Target (overrides ingress IP)
  external-dns.alpha.kubernetes.io/target: 48.200.65.15
```

### Advanced Annotations

```yaml
annotations:
  # Disable external-dns for this ingress
  external-dns.alpha.kubernetes.io/exclude: "true"

  # Use CNAME instead of A record
  external-dns.alpha.kubernetes.io/alias: "true"

  # Set record type explicitly
  external-dns.alpha.kubernetes.io/recordType: A
```

## Monitoring

### Prometheus Metrics

ExternalDNS exposes metrics on port 7979:

```bash
# Port-forward to access metrics
kubectl port-forward -n kube-system deployment/external-dns 7979:7979

# Access metrics
curl http://localhost:7979/metrics
```

**Key Metrics:**
- `external_dns_source_endpoints_total` - Total number of endpoints
- `external_dns_registry_endpoints_total` - Total registry endpoints
- `external_dns_registry_errors_total` - Registry errors
- `external_dns_source_errors_total` - Source errors

### Grafana Dashboard

Import the ExternalDNS Grafana dashboard:
- Dashboard ID: 15038
- https://grafana.com/grafana/dashboards/15038

### Alerts

Example Prometheus alerts:

```yaml
groups:
- name: external-dns
  rules:
  - alert: ExternalDNSDown
    expr: up{job="external-dns"} == 0
    for: 5m
    annotations:
      summary: "ExternalDNS is down"

  - alert: ExternalDNSErrors
    expr: rate(external_dns_registry_errors_total[5m]) > 0
    for: 10m
    annotations:
      summary: "ExternalDNS is experiencing errors"
```

## Troubleshooting

### DNS Records Not Created

**Check ExternalDNS logs:**
```bash
kubectl logs -n kube-system -l app=external-dns --tail=100
```

**Common issues:**

1. **Missing RBAC permissions**
   ```bash
   # Verify role assignments
   az role assignment list --assignee ${IDENTITY_CLIENT_ID}
   ```

2. **Ingress not annotated**
   ```bash
   # Check ingress annotations
   kubectl get ingress -n flamoral -o yaml | grep external-dns
   ```

3. **Domain filter mismatch**
   - Verify `--domain-filter` includes your domain
   - Check ingress hostname matches filter

### DNS Records Not Updated

**Force synchronization:**
```bash
# Delete ExternalDNS pod to force resync
kubectl delete pod -n kube-system -l app=external-dns

# Wait for new pod to start
kubectl wait --for=condition=ready pod -n kube-system -l app=external-dns

# Check logs
kubectl logs -n kube-system -l app=external-dns --tail=50 -f
```

### Permission Denied Errors

```bash
# Verify managed identity has correct role
DNS_ZONE_ID=$(az network dns zone show \
    --name flamoral.com \
    --resource-group flamoral-prod-rg \
    --query id \
    --output tsv)

IDENTITY_CLIENT_ID=$(az aks show \
    --resource-group flamoral-prod-rg \
    --name flamoral-prod-aks \
    --query identityProfile.kubeletidentity.clientId \
    --output tsv)

az role assignment create \
    --assignee ${IDENTITY_CLIENT_ID} \
    --role "DNS Zone Contributor" \
    --scope ${DNS_ZONE_ID} \
    --subscription $(az account show --query id --output tsv)
```

### Duplicate Records

If you have manually created records and ExternalDNS:

**Option 1: Let ExternalDNS manage all records**
```bash
# Delete manual records
az network dns record-set a delete \
    --name "@" \
    --zone-name flamoral.com \
    --resource-group flamoral-prod-rg \
    --yes

# ExternalDNS will recreate from Ingress
```

**Option 2: Use upsert-only policy**
```yaml
args:
- --policy=upsert-only  # Won't delete manual records
```

## Migration from Manual DNS

If you have existing manual DNS records:

### Step 1: Document Current Records

```bash
# Export current DNS zone
az network dns zone export \
    --name flamoral.com \
    --resource-group flamoral-prod-rg \
    --file-name dns-backup-$(date +%Y%m%d).txt
```

### Step 2: Deploy ExternalDNS in Dry-Run Mode

```yaml
args:
- --dry-run=true  # Add this flag
```

```bash
kubectl apply -f infrastructure/k8s/external-dns.yaml
kubectl logs -n kube-system -l app=external-dns --tail=50 -f
```

Review what changes ExternalDNS would make.

### Step 3: Enable ExternalDNS

Remove `--dry-run=true` and redeploy:

```bash
kubectl apply -f infrastructure/k8s/external-dns.yaml
```

### Step 4: Verify Records

```bash
# Check all records
az network dns record-set a list \
    --zone-name flamoral.com \
    --resource-group flamoral-prod-rg

# Verify resolution
nslookup flamoral.com
```

## Best Practices

1. **Start with upsert-only policy**, then switch to sync
2. **Use txt registry** for ownership tracking
3. **Set appropriate domain filters** to prevent accidental changes
4. **Monitor ExternalDNS logs** regularly
5. **Backup DNS zone** before enabling ExternalDNS
6. **Use lower TTL initially** (300s), increase after stabilization
7. **Test in staging environment** first
8. **Document all custom DNS records** that ExternalDNS doesn't manage

## Cleanup

To remove ExternalDNS:

```bash
# Delete deployment
kubectl delete -f infrastructure/k8s/external-dns.yaml

# Clean up DNS records (optional)
# Note: This will delete all A records managed by ExternalDNS
az network dns record-set a delete \
    --name "@" \
    --zone-name flamoral.com \
    --resource-group flamoral-prod-rg \
    --yes
```

## Additional Resources

- [ExternalDNS GitHub](https://github.com/kubernetes-sigs/external-dns)
- [Azure DNS Provider](https://github.com/kubernetes-sigs/external-dns/blob/master/docs/tutorials/azure.md)
- [Ingress Source](https://github.com/kubernetes-sigs/external-dns/blob/master/docs/sources/ingress.md)
- [Azure Managed Identity](https://docs.microsoft.com/azure/active-directory/managed-identities-azure-resources/)

---

**Last Updated:** 2024-12-13
**Version:** 1.0
