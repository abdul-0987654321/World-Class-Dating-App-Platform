# DNS Infrastructure for flamoral.com

## Overview

This directory contains DNS configuration files, scripts, and documentation for managing the flamoral.com domain and its subdomains.

## Contents

```
dns/
├── README.md                      # This file
├── DNS_CONFIGURATION.md           # Comprehensive DNS setup and troubleshooting guide
├── configure-dns.ps1              # PowerShell script for Azure DNS setup
└── configure-dns.sh               # Bash script for Azure DNS setup
```

## Quick Start

### Option 1: Terraform (Recommended)

```bash
cd ../terraform

# Initialize if not already done
terraform init

# Plan with DNS enabled
terraform plan -var="dns_enabled=true"

# Apply configuration
terraform apply -var="dns_enabled=true"

# Get name servers to update at your registrar
terraform output name_servers
```

### Option 2: PowerShell Script

```powershell
cd infrastructure/dns

# Run with defaults
.\configure-dns.ps1

# Or with custom parameters
.\configure-dns.ps1 `
    -ResourceGroup "flamoral-prod-rg" `
    -DomainName "flamoral.com" `
    -TargetIP "48.200.65.15" `
    -TTL 300
```

### Option 3: Bash Script

```bash
cd infrastructure/dns

# Make executable
chmod +x configure-dns.sh

# Run with defaults
./configure-dns.sh

# Or with environment variables
export RESOURCE_GROUP="flamoral-prod-rg"
export DOMAIN_NAME="flamoral.com"
export TARGET_IP="48.200.65.15"
export TTL=300
./configure-dns.sh
```

## DNS Records

All domains point to the Kubernetes ingress IP: **48.200.65.15**

| Domain | Type | Value | TTL |
|--------|------|-------|-----|
| flamoral.com | A | 48.200.65.15 | 300 |
| www.flamoral.com | A | 48.200.65.15 | 300 |
| api.flamoral.com | A | 48.200.65.15 | 300 |
| admin.flamoral.com | A | 48.200.65.15 | 300 |

### Security Records

| Domain | Type | Value |
|--------|------|-------|
| flamoral.com | CAA | 0 issue "letsencrypt.org" |
| flamoral.com | CAA | 0 issuewild "letsencrypt.org" |

## After DNS Setup

### 1. Update Domain Registrar

After creating the Azure DNS zone, you'll receive 4 Azure name servers:

```
ns1-XX.azure-dns.com
ns2-XX.azure-dns.net
ns3-XX.azure-dns.org
ns4-XX.azure-dns.info
```

Update these at your domain registrar (GoDaddy, Namecheap, etc.).

### 2. Wait for Propagation

- **5-15 minutes**: Azure DNS becomes active
- **1-2 hours**: Most resolvers update
- **24-48 hours**: Global propagation complete

### 3. Verify DNS

```bash
# Check name servers
nslookup -type=NS flamoral.com

# Verify A records
nslookup flamoral.com
nslookup www.flamoral.com
nslookup api.flamoral.com
nslookup admin.flamoral.com

# Check from multiple locations
# Visit: https://dnschecker.org/
```

### 4. Deploy Kubernetes Ingress

The ingress controller will handle routing based on hostnames:

```bash
# Apply production ingress
kubectl apply -f ../k8s/production-ingress.yaml

# Check ingress status
kubectl get ingress -n flamoral

# Verify cert-manager issued certificates
kubectl get certificate -n flamoral
```

## Kubernetes Integration

### Option A: Manual DNS (Current Setup)

DNS records are created once and managed separately from Kubernetes.

### Option B: ExternalDNS (Automatic)

Automatically sync Ingress resources with Azure DNS:

```bash
# See setup guide
cat ../k8s/EXTERNAL_DNS_SETUP.md

# Deploy ExternalDNS
kubectl apply -f ../k8s/external-dns.yaml
```

**Benefits:**
- Automatic DNS record creation from Ingress
- No manual DNS management
- Records updated when Ingress changes

## Configuration Files

### PowerShell Script (`configure-dns.ps1`)

**Features:**
- Creates Azure DNS zone
- Configures A records for all subdomains
- Sets up CAA records for Let's Encrypt
- Color-coded output
- Error handling

**Parameters:**
- `ResourceGroup` - Azure resource group name
- `DomainName` - Domain to configure
- `TargetIP` - IP address for A records
- `TTL` - Time to live for records
- `Location` - Azure region

### Bash Script (`configure-dns.sh`)

**Features:**
- Same functionality as PowerShell version
- Works on Linux/Mac/WSL
- Environment variable configuration
- Color-coded output

**Environment Variables:**
- `RESOURCE_GROUP`
- `DOMAIN_NAME`
- `TARGET_IP`
- `TTL`
- `LOCATION`

## Terraform Module

Located in `../terraform/modules/dns/`:

**Files:**
- `main.tf` - DNS zone and records
- `variables.tf` - Input variables
- `outputs.tf` - Output values
- `README.md` - Module documentation

**Usage in main.tf:**
```hcl
module "dns" {
  source = "./modules/dns"

  resource_group_name = azurerm_resource_group.main.name
  domain_name         = "flamoral.com"
  target_ip           = "48.200.65.15"
  ttl                 = 300

  tags = var.tags
}
```

## Verification Commands

### Check DNS Zone

```bash
# List all DNS zones
az network dns zone list \
    --resource-group flamoral-prod-rg \
    --output table

# Show specific zone
az network dns zone show \
    --name flamoral.com \
    --resource-group flamoral-prod-rg
```

### Check DNS Records

```bash
# List all A records
az network dns record-set a list \
    --zone-name flamoral.com \
    --resource-group flamoral-prod-rg \
    --output table

# List CAA records
az network dns record-set caa list \
    --zone-name flamoral.com \
    --resource-group flamoral-prod-rg \
    --output table
```

### Test DNS Resolution

```bash
# Using nslookup
nslookup flamoral.com
nslookup www.flamoral.com
nslookup api.flamoral.com
nslookup admin.flamoral.com

# Using dig (more detailed)
dig flamoral.com A
dig flamoral.com NS
dig flamoral.com CAA

# Test from specific DNS server
dig @8.8.8.8 flamoral.com
```

## Updating DNS Records

### Change IP Address

```bash
# Update root domain
az network dns record-set a update \
    --name "@" \
    --zone-name flamoral.com \
    --resource-group flamoral-prod-rg \
    --set aRecords[0].ipv4Address=<NEW_IP>

# Update www subdomain
az network dns record-set a update \
    --name "www" \
    --zone-name flamoral.com \
    --resource-group flamoral-prod-rg \
    --set aRecords[0].ipv4Address=<NEW_IP>

# Repeat for api and admin
```

### Change TTL

```bash
# Update TTL for root domain
az network dns record-set a update \
    --name "@" \
    --zone-name flamoral.com \
    --resource-group flamoral-prod-rg \
    --set ttl=3600
```

## TTL Strategy

### Initial Deployment
- **TTL: 300 seconds (5 minutes)**
- Allows quick changes if needed
- Easy to fix mistakes

### After Stabilization (1-2 weeks)
- **TTL: 3600 seconds (1 hour)**
- Reduced DNS query load
- Still flexible for changes

### Production Stable (1+ month)
- **TTL: 86400 seconds (24 hours)**
- Optimal performance
- Lower DNS costs
- Better caching

## Troubleshooting

See `DNS_CONFIGURATION.md` for detailed troubleshooting guide.

### Common Issues

**DNS not resolving:**
1. Check name server delegation at registrar
2. Wait for DNS propagation (24-48 hours)
3. Clear local DNS cache
4. Verify records exist in Azure

**SSL certificate not issuing:**
1. Check CAA records allow Let's Encrypt
2. Verify DNS is resolving
3. Check cert-manager logs
4. Review Let's Encrypt rate limits

**Wrong IP returned:**
1. Verify A record has correct IP
2. Wait for TTL to expire
3. Clear DNS cache
4. Check from multiple locations

## Security Best Practices

1. **CAA Records**: Always configure to prevent unauthorized certificates
2. **Low TTL Initially**: Use 300s for new deployments
3. **Monitor Changes**: Enable Azure activity logging
4. **Access Control**: Use RBAC to limit DNS modifications
5. **Backup Configuration**: Export DNS zone regularly
6. **DNSSEC**: Consider enabling for production

## Monitoring

### Azure Monitor

```bash
# View DNS query metrics
az monitor metrics list \
    --resource /subscriptions/<SUB>/resourceGroups/flamoral-prod-rg/providers/Microsoft.Network/dnszones/flamoral.com \
    --metric QueryVolume

# Set up alerts for DNS failures
az monitor metrics alert create \
    --name dns-query-failure \
    --resource-group flamoral-prod-rg \
    --scopes <dns-zone-resource-id> \
    --condition "avg QueryVolume < 1" \
    --window-size 5m
```

### Health Checks

Use external monitoring to verify DNS resolution:
- UptimeRobot
- Pingdom
- StatusCake
- Azure Application Insights

## Backup and Recovery

### Export DNS Zone

```bash
# Export to zone file
az network dns zone export \
    --name flamoral.com \
    --resource-group flamoral-prod-rg \
    --file-name flamoral-backup-$(date +%Y%m%d).txt
```

### Import DNS Zone

```bash
# Import from zone file
az network dns zone import \
    --name flamoral.com \
    --resource-group flamoral-prod-rg \
    --file-name flamoral-backup.txt
```

### Terraform State

If using Terraform, ensure state is backed up:
- Remote backend in Azure Storage
- State versioning enabled
- Regular state backups

## Documentation

- **DNS_CONFIGURATION.md** - Comprehensive setup guide
- **../terraform/modules/dns/README.md** - Terraform module docs
- **../k8s/EXTERNAL_DNS_SETUP.md** - ExternalDNS automation guide

## Support

For DNS-related issues:
- Check `DNS_CONFIGURATION.md` troubleshooting section
- Review Azure DNS documentation
- Contact platform team

---

**Last Updated:** 2024-12-13
**Version:** 1.0
**Maintained by:** Platform Engineering Team
