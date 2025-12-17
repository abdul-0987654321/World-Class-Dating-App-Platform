# DNS Quick Start Guide

## TL;DR - Get DNS Working in 5 Minutes

### Step 1: Create DNS Zone (Choose One Method)

**Method A: PowerShell**
```powershell
cd infrastructure/dns
.\configure-dns.ps1
```

**Method B: Bash**
```bash
cd infrastructure/dns
chmod +x configure-dns.sh
./configure-dns.sh
```

**Method C: Terraform**
```bash
cd infrastructure/terraform
terraform init
terraform apply -var="dns_enabled=true"
```

### Step 2: Get Name Servers

**From Script Output:**
The script will display Azure name servers. Copy them.

**Or Query Azure:**
```bash
az network dns zone show \
    --name flamoral.com \
    --resource-group flamoral-prod-rg \
    --query nameServers \
    --output table
```

You'll get something like:
```
ns1-01.azure-dns.com
ns2-01.azure-dns.net
ns3-01.azure-dns.org
ns4-01.azure-dns.info
```

### Step 3: Update Domain Registrar

Go to your domain registrar and update name servers with the Azure values above.

**Common Registrars:**

**GoDaddy:**
Domain Manager → flamoral.com → Manage DNS → Nameservers → Custom → Paste Azure name servers

**Namecheap:**
Domain List → Manage → Custom DNS → Paste Azure name servers

**Google Domains:**
DNS → Name servers → Custom → Paste Azure name servers

### Step 4: Wait and Verify

**Wait:** 1-2 hours for most DNS resolvers (up to 48 hours for complete global propagation)

**Verify:**
```bash
# Quick check
nslookup flamoral.com

# Should return: 48.200.65.15
```

**Check all domains:**
```bash
nslookup flamoral.com      # Should return 48.200.65.15
nslookup www.flamoral.com  # Should return 48.200.65.15
nslookup api.flamoral.com  # Should return 48.200.65.15
nslookup admin.flamoral.com # Should return 48.200.65.15
```

### Step 5: Deploy Kubernetes Ingress

```bash
# Apply the production ingress
kubectl apply -f infrastructure/k8s/production-ingress.yaml

# Check status
kubectl get ingress -n flamoral

# Wait for SSL certificates
kubectl get certificate -n flamoral
```

## That's It!

Your DNS is now configured. The domains will resolve to your Kubernetes cluster.

## What Was Created?

### DNS Records
```
flamoral.com        → 48.200.65.15 (A record, TTL 300s)
www.flamoral.com    → 48.200.65.15 (A record, TTL 300s)
api.flamoral.com    → 48.200.65.15 (A record, TTL 300s)
admin.flamoral.com  → 48.200.65.15 (A record, TTL 300s)
```

### Security Records
```
flamoral.com CAA 0 issue "letsencrypt.org"
flamoral.com CAA 0 issuewild "letsencrypt.org"
```

## Quick Commands Reference

### Check DNS Status
```bash
# All A records
az network dns record-set a list \
    --zone-name flamoral.com \
    --resource-group flamoral-prod-rg \
    --output table

# From different DNS servers
nslookup flamoral.com 8.8.8.8        # Google DNS
nslookup flamoral.com 1.1.1.1        # Cloudflare DNS
```

### Check Global Propagation
Visit: https://dnschecker.org/
Enter: flamoral.com

### Update IP Address
```bash
# If Kubernetes ingress IP changes
az network dns record-set a update \
    --name "@" \
    --zone-name flamoral.com \
    --resource-group flamoral-prod-rg \
    --set aRecords[0].ipv4Address=NEW_IP_HERE
```

### Increase TTL (After Stabilization)
```bash
# Change from 300s to 3600s (1 hour)
az network dns record-set a update \
    --name "@" \
    --zone-name flamoral.com \
    --resource-group flamoral-prod-rg \
    --set ttl=3600
```

## Troubleshooting

### DNS Not Resolving?

1. **Check name servers at registrar** - Make sure they match Azure name servers
2. **Wait longer** - Can take up to 48 hours
3. **Clear DNS cache:**
   - Windows: `ipconfig /flushdns`
   - Mac: `sudo dscacheutil -flushcache`
   - Linux: `sudo systemd-resolve --flush-caches`

### Wrong IP Returned?

1. **Verify A record:**
   ```bash
   az network dns record-set a show \
       --name "@" \
       --zone-name flamoral.com \
       --resource-group flamoral-prod-rg
   ```
2. **Wait for old TTL to expire**
3. **Check from different location** (use 8.8.8.8 DNS)

### SSL Certificate Not Working?

1. **Verify DNS resolves correctly first**
2. **Check cert-manager logs:**
   ```bash
   kubectl logs -n cert-manager -l app=cert-manager --tail=50
   ```
3. **Verify CAA records:**
   ```bash
   dig flamoral.com CAA
   ```

## Next Steps

1. **Monitor DNS performance** - Set up alerts
2. **Enable ExternalDNS** (optional) - Automate DNS from Kubernetes
3. **Increase TTL** - After 1-2 weeks of stability
4. **Backup DNS config** - Export zone file
5. **Document changes** - Keep DNS change log

## Need More Help?

- Full guide: `DNS_CONFIGURATION.md`
- Terraform docs: `../terraform/modules/dns/README.md`
- ExternalDNS: `../k8s/EXTERNAL_DNS_SETUP.md`

---

**Questions?** Check the full documentation or contact the platform team.
