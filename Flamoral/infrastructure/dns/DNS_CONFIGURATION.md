# DNS Configuration Guide for flamoral.com

## Overview

This document provides comprehensive guidance for configuring DNS for the Flamoral dating platform, including setup procedures, verification steps, and troubleshooting guidelines.

## Table of Contents

- [Required DNS Records](#required-dns-records)
- [Configuration Methods](#configuration-methods)
- [TTL Recommendations](#ttl-recommendations)
- [Setup Procedures](#setup-procedures)
- [Verification Steps](#verification-steps)
- [Troubleshooting](#troubleshooting)
- [Security Considerations](#security-considerations)
- [Maintenance and Updates](#maintenance-and-updates)

---

## Required DNS Records

### A Records

All domains and subdomains point to the Kubernetes ingress IP address: **48.200.65.15**

| Record Type | Name | Value | TTL | Purpose |
|------------|------|-------|-----|---------|
| A | @ (root) | 48.200.65.15 | 300 | Main website (flamoral.com) |
| A | www | 48.200.65.15 | 300 | WWW subdomain (www.flamoral.com) |
| A | api | 48.200.65.15 | 300 | API Gateway (api.flamoral.com) |
| A | admin | 48.200.65.15 | 300 | Admin Dashboard (admin.flamoral.com) |

### CAA Records

Certificate Authority Authorization records for SSL/TLS certificate security:

| Record Type | Name | Flags | Tag | Value | Purpose |
|------------|------|-------|-----|-------|---------|
| CAA | @ | 0 | issue | letsencrypt.org | Allow Let's Encrypt to issue certificates |
| CAA | @ | 0 | issuewild | letsencrypt.org | Allow Let's Encrypt to issue wildcard certificates |

### Optional Records

| Record Type | Name | Value | TTL | Purpose |
|------------|------|-------|-----|---------|
| TXT | @ | (verification string) | 300 | Domain ownership verification |

---

## Configuration Methods

### Method 1: Terraform (Recommended for Production)

Use the Terraform DNS module for infrastructure-as-code approach:

```bash
cd infrastructure/terraform

# Initialize Terraform
terraform init

# Review the DNS configuration
terraform plan -var="dns_enabled=true"

# Apply the configuration
terraform apply -var="dns_enabled=true"

# Get the Azure DNS name servers
terraform output name_servers
```

**Advantages:**
- Infrastructure as code
- Version controlled
- Automated and repeatable
- Easy to update and maintain

### Method 2: Azure CLI Scripts

Use the provided PowerShell or Bash scripts for manual configuration:

**PowerShell (Windows):**
```powershell
cd infrastructure/dns
.\configure-dns.ps1 `
    -ResourceGroup "flamoral-prod-rg" `
    -DomainName "flamoral.com" `
    -TargetIP "48.200.65.15" `
    -TTL 300
```

**Bash (Linux/Mac):**
```bash
cd infrastructure/dns
chmod +x configure-dns.sh
./configure-dns.sh
```

**With custom values:**
```bash
export RESOURCE_GROUP="flamoral-prod-rg"
export DOMAIN_NAME="flamoral.com"
export TARGET_IP="48.200.65.15"
export TTL=300
./configure-dns.sh
```

### Method 3: Azure Portal (Manual)

For manual configuration through the Azure Portal:

1. Navigate to Azure Portal → DNS zones
2. Create a new DNS zone for `flamoral.com`
3. Add A records as specified in the table above
4. Add CAA records for Let's Encrypt
5. Note the Azure name servers provided

---

## TTL Recommendations

Time To Live (TTL) determines how long DNS records are cached by resolvers.

### Initial Deployment (0-7 days)

**Recommended TTL: 300 seconds (5 minutes)**

**Rationale:**
- Quick propagation of changes
- Easy to fix configuration errors
- Minimal impact if IP needs to change
- Faster rollback if needed

### Stabilization Period (1-4 weeks)

**Recommended TTL: 3600 seconds (1 hour)**

**Rationale:**
- Balance between flexibility and performance
- Still allows relatively quick changes
- Reduces DNS query load
- Improved caching efficiency

### Production Stable (After 1 month)

**Recommended TTL: 86400 seconds (24 hours)**

**Rationale:**
- Optimal DNS performance
- Minimal DNS query costs
- Reduced load on DNS servers
- Better user experience with cached results

### Updating TTL

To increase TTL after stabilization:

**Terraform:**
```hcl
# In terraform.tfvars or variables
dns_ttl = 3600  # or 86400 for production stable
```

**Azure CLI:**
```bash
az network dns record-set a update \
    --name "@" \
    --zone-name flamoral.com \
    --resource-group flamoral-prod-rg \
    --set ttl=3600
```

**Important:** When decreasing TTL, wait for the old TTL period to expire before making other changes.

---

## Setup Procedures

### Step 1: Create Azure DNS Zone

Choose one of the configuration methods above to create the DNS zone and records.

### Step 2: Update Domain Registrar

After creating the Azure DNS zone, you'll receive 4 Azure name servers. Update your domain registrar with these name servers.

**Azure Name Servers Format:**
```
ns1-XX.azure-dns.com
ns2-XX.azure-dns.net
ns3-XX.azure-dns.org
ns4-XX.azure-dns.info
```

**Common Registrars:**

**GoDaddy:**
1. Log in to GoDaddy account
2. Go to Domain Manager
3. Click on flamoral.com → Manage DNS
4. Under Nameservers, select "Custom"
5. Enter the 4 Azure name servers
6. Save changes

**Namecheap:**
1. Log in to Namecheap account
2. Go to Domain List
3. Click Manage next to flamoral.com
4. Under Nameservers, select "Custom DNS"
5. Enter the 4 Azure name servers
6. Save changes

**Google Domains:**
1. Log in to Google Domains
2. Select flamoral.com
3. Click DNS in the left menu
4. Scroll to Name servers
5. Select "Use custom name servers"
6. Enter the 4 Azure name servers
7. Save

### Step 3: Wait for DNS Propagation

**Timeline:**
- **5-15 minutes**: Azure DNS becomes active
- **1-2 hours**: Most DNS resolvers update
- **24-48 hours**: Global propagation complete

**Note:** Some ISPs cache DNS longer, so full propagation can take up to 72 hours in rare cases.

### Step 4: Verify Configuration

See [Verification Steps](#verification-steps) section below.

---

## Verification Steps

### 1. Check Name Server Delegation

Verify that your domain registrar has correctly updated the name servers:

```bash
# Check name servers for flamoral.com
nslookup -type=NS flamoral.com

# Or using dig
dig flamoral.com NS +short

# Expected output: Azure name servers (ns1-XX.azure-dns.com, etc.)
```

### 2. Verify A Records

Test DNS resolution for all configured domains:

```bash
# Test root domain
nslookup flamoral.com
# Expected: 48.200.65.15

# Test www subdomain
nslookup www.flamoral.com
# Expected: 48.200.65.15

# Test API subdomain
nslookup api.flamoral.com
# Expected: 48.200.65.15

# Test admin subdomain
nslookup admin.flamoral.com
# Expected: 48.200.65.15
```

**Using dig for detailed information:**
```bash
dig flamoral.com A +short
dig www.flamoral.com A +short
dig api.flamoral.com A +short
dig admin.flamoral.com A +short
```

### 3. Test from Multiple Locations

Use online DNS checkers to verify from different geographic locations:

- **DNS Checker**: https://dnschecker.org/
- **What's My DNS**: https://www.whatsmydns.net/
- **DNS Propagation Checker**: https://www.whatsmydns.net/

Enter each domain:
- flamoral.com
- www.flamoral.com
- api.flamoral.com
- admin.flamoral.com

### 4. Verify CAA Records

Check CAA records for SSL/TLS security:

```bash
dig flamoral.com CAA

# Expected output should include:
# flamoral.com. 3600 IN CAA 0 issue "letsencrypt.org"
# flamoral.com. 3600 IN CAA 0 issuewild "letsencrypt.org"
```

### 5. Test HTTP/HTTPS Connectivity

Once DNS is propagated, test actual connectivity:

```bash
# Test HTTP redirect (should redirect to HTTPS)
curl -I http://flamoral.com
curl -I http://www.flamoral.com

# Test HTTPS (after cert-manager issues certificates)
curl -I https://flamoral.com
curl -I https://www.flamoral.com
curl -I https://api.flamoral.com
curl -I https://admin.flamoral.com
```

### 6. Verify SSL Certificates

After cert-manager issues certificates:

```bash
# Check SSL certificate details
openssl s_client -connect flamoral.com:443 -servername flamoral.com < /dev/null | openssl x509 -noout -text

# Verify certificate issuer is Let's Encrypt
openssl s_client -connect flamoral.com:443 -servername flamoral.com < /dev/null 2>/dev/null | openssl x509 -noout -issuer
```

### 7. Monitor Kubernetes Ingress

Check that the ingress controller is receiving traffic:

```bash
# Get ingress status
kubectl get ingress -n flamoral

# Check ingress events
kubectl describe ingress flamoral-ingress -n flamoral

# View ingress controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx --tail=100
```

---

## Troubleshooting

### DNS Not Resolving

**Symptoms:**
- `nslookup` returns "can't find" or "NXDOMAIN"
- Website not accessible by domain name

**Solutions:**

1. **Verify Name Server Delegation**
   ```bash
   dig flamoral.com NS +trace
   ```
   - Ensure Azure name servers are returned
   - If not, check domain registrar configuration

2. **Check DNS Zone Configuration**
   ```bash
   az network dns zone show \
       --name flamoral.com \
       --resource-group flamoral-prod-rg
   ```

3. **Verify A Records Exist**
   ```bash
   az network dns record-set a list \
       --zone-name flamoral.com \
       --resource-group flamoral-prod-rg
   ```

4. **Clear Local DNS Cache**
   - **Windows**: `ipconfig /flushdns`
   - **Mac**: `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder`
   - **Linux**: `sudo systemd-resolve --flush-caches`

5. **Wait Longer**
   - DNS propagation can take 24-48 hours
   - Check again after waiting

### Wrong IP Address Returned

**Symptoms:**
- DNS resolves but to incorrect IP address
- Old IP address still being returned

**Solutions:**

1. **Check Current A Record**
   ```bash
   az network dns record-set a show \
       --name "@" \
       --zone-name flamoral.com \
       --resource-group flamoral-prod-rg
   ```

2. **Update A Record**
   ```bash
   az network dns record-set a update \
       --name "@" \
       --zone-name flamoral.com \
       --resource-group flamoral-prod-rg \
       --set aRecords[0].ipv4Address=48.200.65.15
   ```

3. **Wait for TTL to Expire**
   - Old records cached until TTL expires
   - Check TTL: `dig flamoral.com A`
   - Wait for that duration

### SSL Certificate Issues

**Symptoms:**
- "Certificate not trusted" errors
- "Unable to get certificate" errors
- cert-manager not issuing certificates

**Solutions:**

1. **Verify CAA Records**
   ```bash
   dig flamoral.com CAA
   ```
   - Should show letsencrypt.org

2. **Check cert-manager Logs**
   ```bash
   kubectl logs -n cert-manager -l app=cert-manager --tail=100
   ```

3. **Check Certificate Request**
   ```bash
   kubectl get certificaterequest -n flamoral
   kubectl describe certificaterequest -n flamoral
   ```

4. **Verify DNS is Resolving**
   - Let's Encrypt validates domain ownership via DNS
   - Ensure all domains resolve correctly

5. **Check Rate Limits**
   - Let's Encrypt has rate limits
   - Use staging environment first: `letsencrypt-staging`

### Subdomain Not Working

**Symptoms:**
- Root domain works but subdomain doesn't
- Some subdomains work, others don't

**Solutions:**

1. **Verify Subdomain A Record**
   ```bash
   az network dns record-set a show \
       --name "api" \
       --zone-name flamoral.com \
       --resource-group flamoral-prod-rg
   ```

2. **Test Subdomain Resolution**
   ```bash
   nslookup api.flamoral.com
   dig api.flamoral.com A
   ```

3. **Check Kubernetes Ingress**
   ```bash
   kubectl get ingress -n flamoral
   kubectl describe ingress flamoral-ingress -n flamoral
   ```

4. **Verify Ingress Rules**
   - Check that subdomain is listed in ingress hosts
   - Verify correct service routing

### DNS Propagation Slow

**Symptoms:**
- Some locations resolve correctly, others don't
- Inconsistent DNS responses

**Solutions:**

1. **Check from Multiple DNS Servers**
   ```bash
   # Google DNS
   nslookup flamoral.com 8.8.8.8

   # Cloudflare DNS
   nslookup flamoral.com 1.1.1.1

   # OpenDNS
   nslookup flamoral.com 208.67.222.222
   ```

2. **Use Lower TTL Initially**
   - Set TTL to 300 seconds for faster propagation
   - Increase after stabilization

3. **Check ISP DNS Cache**
   - Some ISPs ignore TTL and cache longer
   - Use alternative DNS servers (8.8.8.8, 1.1.1.1)

### Azure DNS Zone Issues

**Symptoms:**
- Unable to create DNS zone
- Permission errors
- Resource not found

**Solutions:**

1. **Verify Azure Permissions**
   ```bash
   az role assignment list --assignee $(az ad signed-in-user show --query objectId -o tsv)
   ```
   - Need "DNS Zone Contributor" or "Contributor" role

2. **Check Resource Group**
   ```bash
   az group show --name flamoral-prod-rg
   ```
   - Ensure resource group exists
   - Verify correct subscription

3. **Check DNS Zone Naming**
   - Must be valid domain name
   - Cannot use subdomains (use flamoral.com, not www.flamoral.com)

---

## Security Considerations

### CAA Records

**Purpose:**
- Prevent unauthorized SSL/TLS certificate issuance
- Specify which Certificate Authorities can issue certificates
- Protect against mis-issuance and attacks

**Configuration:**
```
flamoral.com.  3600  IN  CAA  0 issue "letsencrypt.org"
flamoral.com.  3600  IN  CAA  0 issuewild "letsencrypt.org"
```

**Best Practices:**
- Always configure CAA records for production domains
- Regularly review authorized certificate authorities
- Monitor certificate transparency logs

### DNSSEC

While Azure DNS supports DNSSEC, it's not enabled by default. Consider enabling for enhanced security:

**Benefits:**
- Cryptographic authentication of DNS data
- Protection against DNS spoofing
- Integrity verification

**Trade-offs:**
- Additional complexity
- Potential compatibility issues with some resolvers
- Requires key management

### DNS Monitoring

Implement monitoring for DNS infrastructure:

**Metrics to Monitor:**
- DNS query response time
- Query success rate
- Name server availability
- DNS zone synchronization
- Certificate expiration dates

**Tools:**
- Azure Monitor
- Prometheus with DNS exporter
- Uptime monitoring services (UptimeRobot, Pingdom)

### Access Control

**Azure DNS Zone Access:**
- Use Azure RBAC for DNS zone management
- Limit who can modify DNS records
- Enable activity logging
- Use service principals for automation

```bash
# Grant DNS Zone Contributor role
az role assignment create \
    --assignee <user-or-service-principal> \
    --role "DNS Zone Contributor" \
    --scope /subscriptions/<subscription-id>/resourceGroups/flamoral-prod-rg/providers/Microsoft.Network/dnszones/flamoral.com
```

---

## Maintenance and Updates

### Regular Tasks

**Weekly:**
- Monitor DNS query performance
- Check for failed certificate renewals
- Review DNS logs for anomalies

**Monthly:**
- Verify all DNS records are correct
- Check TTL settings are appropriate
- Review CAA records

**Quarterly:**
- Audit DNS zone access permissions
- Update DNS documentation
- Review disaster recovery procedures

### Updating IP Address

If the Kubernetes ingress IP changes:

1. **Lower TTL First** (24-48 hours before change)
   ```bash
   # Reduce TTL to 300 seconds
   az network dns record-set a update \
       --name "@" \
       --zone-name flamoral.com \
       --resource-group flamoral-prod-rg \
       --set ttl=300
   ```

2. **Update A Records**
   ```bash
   # Update to new IP
   az network dns record-set a update \
       --name "@" \
       --zone-name flamoral.com \
       --resource-group flamoral-prod-rg \
       --set aRecords[0].ipv4Address=<NEW_IP>
   ```

3. **Repeat for All Subdomains**
   ```bash
   # Update www
   az network dns record-set a update \
       --name "www" \
       --zone-name flamoral.com \
       --resource-group flamoral-prod-rg \
       --set aRecords[0].ipv4Address=<NEW_IP>

   # Update api
   az network dns record-set a update \
       --name "api" \
       --zone-name flamoral.com \
       --resource-group flamoral-prod-rg \
       --set aRecords[0].ipv4Address=<NEW_IP>

   # Update admin
   az network dns record-set a update \
       --name "admin" \
       --zone-name flamoral.com \
       --resource-group flamoral-prod-rg \
       --set aRecords[0].ipv4Address=<NEW_IP>
   ```

4. **Monitor and Verify**
   - Check DNS resolution from multiple locations
   - Monitor application traffic
   - Verify no downtime

5. **Increase TTL After Stabilization**
   ```bash
   az network dns record-set a update \
       --name "@" \
       --zone-name flamoral.com \
       --resource-group flamoral-prod-rg \
       --set ttl=3600
   ```

### Adding New Subdomains

To add a new subdomain (e.g., staging.flamoral.com):

```bash
# Create A record
az network dns record-set a create \
    --name "staging" \
    --zone-name flamoral.com \
    --resource-group flamoral-prod-rg \
    --ttl 300

az network dns record-set a add-record \
    --record-set-name "staging" \
    --zone-name flamoral.com \
    --resource-group flamoral-prod-rg \
    --ipv4-address 48.200.65.15

# Update Kubernetes ingress
kubectl edit ingress flamoral-ingress -n flamoral
# Add staging.flamoral.com to hosts and TLS configuration
```

### Backup and Disaster Recovery

**Export DNS Configuration:**
```bash
# Export all DNS records
az network dns zone export \
    --name flamoral.com \
    --resource-group flamoral-prod-rg \
    --file-name flamoral-dns-backup.txt
```

**Import DNS Configuration:**
```bash
# Import DNS records (if recreating zone)
az network dns zone import \
    --name flamoral.com \
    --resource-group flamoral-prod-rg \
    --file-name flamoral-dns-backup.txt
```

**Terraform State Backup:**
- Ensure Terraform state is backed up
- Store state in Azure Storage with versioning enabled
- Regular state backups before major changes

---

## Quick Reference Commands

### Query DNS
```bash
# Basic lookup
nslookup flamoral.com

# Detailed lookup
dig flamoral.com A +trace

# Check all record types
dig flamoral.com ANY

# Query specific DNS server
nslookup flamoral.com 8.8.8.8
```

### Azure CLI DNS
```bash
# List all A records
az network dns record-set a list \
    --zone-name flamoral.com \
    --resource-group flamoral-prod-rg

# Show specific record
az network dns record-set a show \
    --name "@" \
    --zone-name flamoral.com \
    --resource-group flamoral-prod-rg

# Update TTL
az network dns record-set a update \
    --name "@" \
    --zone-name flamoral.com \
    --resource-group flamoral-prod-rg \
    --set ttl=3600
```

### Kubernetes
```bash
# Check ingress
kubectl get ingress -n flamoral

# View ingress details
kubectl describe ingress flamoral-ingress -n flamoral

# Check certificates
kubectl get certificate -n flamoral

# View cert-manager logs
kubectl logs -n cert-manager -l app=cert-manager
```

---

## Support and Resources

### Documentation
- [Azure DNS Documentation](https://docs.microsoft.com/azure/dns/)
- [cert-manager Documentation](https://cert-manager.io/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Kubernetes Ingress Documentation](https://kubernetes.io/docs/concepts/services-networking/ingress/)

### Tools
- [DNS Checker](https://dnschecker.org/)
- [What's My DNS](https://www.whatsmydns.net/)
- [SSL Labs](https://www.ssllabs.com/ssltest/)
- [CAA Record Helper](https://sslmate.com/caa/)

### Contact
For DNS-related issues, contact:
- Platform Team: platform@flamoral.com
- Azure Support: [Azure Portal](https://portal.azure.com/) → Support

---

## Appendix: Example DNS Zone File

```zone
$TTL 300
@   IN  SOA ns1-01.azure-dns.com. azuredns-hostmaster.microsoft.com. (
        2024121301 ; Serial
        3600       ; Refresh
        300        ; Retry
        604800     ; Expire
        300 )      ; Minimum TTL

; Name Servers
@   IN  NS  ns1-01.azure-dns.com.
@   IN  NS  ns2-01.azure-dns.net.
@   IN  NS  ns3-01.azure-dns.org.
@   IN  NS  ns4-01.azure-dns.info.

; A Records
@       IN  A   48.200.65.15
www     IN  A   48.200.65.15
api     IN  A   48.200.65.15
admin   IN  A   48.200.65.15

; CAA Records
@   IN  CAA 0 issue "letsencrypt.org"
@   IN  CAA 0 issuewild "letsencrypt.org"
```

---

**Last Updated:** 2024-12-13
**Version:** 1.0
**Owner:** Platform Engineering Team
