# Azure DNS Zone Setup Guide for flamoral.com

This guide explains how to set up and verify Azure DNS for the flamoral.com domain.

## Overview

The Flamoral platform uses Azure DNS to manage DNS records for the flamoral.com domain. This setup includes:
- Azure DNS Zone creation
- Nameserver delegation configuration
- A records for the main domain, www, and api subdomains
- DNS propagation verification

## Prerequisites

Before running the setup scripts, ensure you have:

1. **Azure CLI** installed and configured
   ```bash
   # Check if Azure CLI is installed
   az --version

   # If not installed, download from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli
   ```

2. **Azure Account** with appropriate permissions
   - Subscription with Owner or Contributor role
   - Permissions to create DNS zones and resource groups

3. **GoDaddy Account** access
   - Administrative access to flamoral.com domain settings
   - Ability to change nameservers

4. **DNS Tools** (for verification script)
   - `dig` - DNS lookup utility (usually pre-installed on Linux/Mac)
   - `nslookup` - Name server lookup (usually pre-installed)
   - `curl` - HTTP client (usually pre-installed)

   On Ubuntu/Debian:
   ```bash
   sudo apt-get install dnsutils curl
   ```

   On CentOS/RHEL:
   ```bash
   sudo yum install bind-utils curl
   ```

## Scripts

### 1. setup-azure-dns.sh

Creates Azure DNS Zone and initial A records.

**Location:** `C:\Users\citad\OneDrive\Documents\Dating\DatingPlatform\scripts\setup-azure-dns.sh`

**What it does:**
- Creates resource group `flamoral-dating-app-rg` (if it doesn't exist)
- Creates Azure DNS Zone for `flamoral.com`
- Retrieves and displays Azure nameservers
- Creates placeholder A records:
  - `flamoral.com` -> 20.75.0.1
  - `www.flamoral.com` -> 20.75.0.1
  - `api.flamoral.com` -> 20.75.0.1
- Provides step-by-step instructions for next steps

**Usage:**
```bash
# Navigate to project directory
cd /c/Users/citad/OneDrive/Documents/Dating/DatingPlatform

# Run the setup script
./scripts/setup-azure-dns.sh
```

**Expected Output:**
```
========================================
AZURE DNS ZONE SETUP FOR FLAMORAL.COM
========================================

[INFO] Checking if Azure CLI is installed...
[SUCCESS] Azure CLI is installed
[INFO] Checking Azure login status...
[SUCCESS] Logged into Azure
[INFO] Subscription: Your Subscription Name (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)

[INFO] Checking if resource group 'flamoral-dating-app-rg' exists...
[SUCCESS] Resource group 'flamoral-dating-app-rg' already exists

[INFO] Checking if DNS zone 'flamoral.com' exists...
[WARNING] DNS zone 'flamoral.com' does not exist. Creating it...
[SUCCESS] DNS zone 'flamoral.com' created

========================================
DNS NAMESERVERS
========================================

[INFO] Retrieving nameservers for 'flamoral.com'...
[SUCCESS] Nameservers retrieved successfully

========================================
CONFIGURE THESE NAMESERVERS AT GODADDY
========================================

  Nameserver 1: ns1-01.azure-dns.com
  Nameserver 2: ns2-01.azure-dns.net
  Nameserver 3: ns3-01.azure-dns.org
  Nameserver 4: ns4-01.azure-dns.info

INSTRUCTIONS:
1. Go to GoDaddy DNS Management for flamoral.com
2. Change nameservers to 'Custom'
3. Enter the nameservers listed above
4. Save changes
5. Wait 24-48 hours for full DNS propagation

========================================
CREATING DNS A RECORDS
========================================

[WARNING] Creating placeholder A records with IP: 20.75.0.1
[WARNING] You will need to update these with your actual Azure resource IPs after deployment

[SUCCESS] A record created/updated: flamoral.com -> 20.75.0.1
[SUCCESS] A record created/updated: www.flamoral.com -> 20.75.0.1
[SUCCESS] A record created/updated: api.flamoral.com -> 20.75.0.1

[SUCCESS] All DNS A records created successfully

========================================
CURRENT DNS RECORDS
========================================

Name    ResourceGroup              Ttl    Type    AutoRegisteredRecords
------  -------------------------  -----  ------  -----------------------
@       flamoral-dating-app-rg     3600   A
api     flamoral-dating-app-rg     3600   A
www     flamoral-dating-app-rg     3600   A

========================================
NEXT STEPS
========================================

1. Configure Nameservers at GoDaddy
   - Update nameservers as shown above
   - Wait for DNS propagation (24-48 hours)

2. Deploy Azure Resources
   - Deploy your AKS cluster and Application Gateway
   - Get the public IP addresses of your resources

3. Update DNS A Records
   - Replace placeholder IPs with actual resource IPs
   - Use this command to update:
     az network dns record-set a add-record \
       --resource-group flamoral-dating-app-rg \
       --zone-name flamoral.com \
       --record-set-name <record-name> \
       --ipv4-address <actual-ip>

4. Verify DNS Propagation
   - Run: ./scripts/verify-dns-propagation.sh
   - This will check nameserver delegation and A record resolution

5. Configure SSL/TLS Certificates
   - Set up Let's Encrypt with cert-manager in Kubernetes
   - Configure HTTPS redirects in Application Gateway

[SUCCESS] DNS zone setup completed successfully!
```

### 2. verify-dns-propagation.sh

Verifies DNS configuration and propagation status.

**Location:** `C:\Users\citad\OneDrive\Documents\Dating\DatingPlatform\scripts\verify-dns-propagation.sh`

**What it does:**
- Checks if Azure CLI is installed and logged in
- Retrieves Azure nameservers from DNS Zone
- Verifies nameserver delegation at the domain registrar
- Tests A record resolution for all configured domains
- Checks global DNS propagation across multiple public DNS servers
- Performs reverse DNS lookups
- Tests HTTP/HTTPS connectivity
- Generates a comprehensive verification summary

**Usage:**
```bash
# Navigate to project directory
cd /c/Users/citad/OneDrive/Documents/Dating/DatingPlatform

# Run the verification script
./scripts/verify-dns-propagation.sh
```

**Expected Output:**
```
========================================
DNS PROPAGATION VERIFICATION FOR FLAMORAL.COM
========================================

[INFO] Checking required tools...
[SUCCESS] All required tools are installed
[INFO] Checking Azure login status...
[SUCCESS] Logged into Azure

[INFO] Retrieving nameservers from Azure DNS Zone...
[SUCCESS] Azure nameservers retrieved

========================================
AZURE DNS ZONE RECORDS
========================================

Name    ResourceGroup              Ttl    Type    AutoRegisteredRecords
------  -------------------------  -----  ------  -----------------------
@       flamoral-dating-app-rg     3600   A
api     flamoral-dating-app-rg     3600   A
www     flamoral-dating-app-rg     3600   A

========================================
NAMESERVER DELEGATION CHECK
========================================

[INFO] Checking nameservers configured at domain registrar...

Current Nameservers (from DNS):
  - ns1-01.azure-dns.com.
  - ns2-01.azure-dns.net.
  - ns3-01.azure-dns.org.
  - ns4-01.azure-dns.info.

Expected Azure Nameservers:
  - ns1-01.azure-dns.com
  - ns2-01.azure-dns.net
  - ns3-01.azure-dns.org
  - ns4-01.azure-dns.info

[SUCCESS] Nameserver ns1-01.azure-dns.com is correctly configured
[SUCCESS] Nameserver ns2-01.azure-dns.net is correctly configured
[SUCCESS] Nameserver ns3-01.azure-dns.org is correctly configured
[SUCCESS] Nameserver ns4-01.azure-dns.info is correctly configured

[SUCCESS] All Azure nameservers are correctly delegated!

========================================
A RECORD RESOLUTION CHECK
========================================

[INFO] Checking A record for: flamoral.com
[SUCCESS] flamoral.com -> 20.75.0.1
[INFO] Checking A record for: www.flamoral.com
[SUCCESS] www.flamoral.com -> 20.75.0.1
[INFO] Checking A record for: api.flamoral.com
[SUCCESS] api.flamoral.com -> 20.75.0.1

[SUCCESS] All A records are resolving correctly!

========================================
GLOBAL DNS PROPAGATION CHECK
========================================

[INFO] Checking DNS resolution from multiple public DNS servers...

[INFO] Querying Google (8.8.8.8)...
[SUCCESS]   Resolved: 20.75.0.1
[INFO] Querying Cloudflare (1.1.1.1)...
[SUCCESS]   Resolved: 20.75.0.1
[INFO] Querying Quad9 (9.9.9.9)...
[SUCCESS]   Resolved: 20.75.0.1
[INFO] Querying OpenDNS (208.67.222.222)...
[SUCCESS]   Resolved: 20.75.0.1

Propagation Status: 4/4 servers
[SUCCESS] DNS is fully propagated globally!

========================================
REVERSE DNS CHECK
========================================

[INFO] Performing reverse DNS lookups...

[INFO] Reverse lookup for 20.75.0.1:
[WARNING]   No PTR record found (this is usually OK for web hosting)

========================================
WEB CONNECTIVITY CHECK
========================================

[INFO] Testing HTTP/HTTPS connectivity...

[INFO] Testing: http://flamoral.com
[WARNING]   Connection failed (this is normal if servers aren't deployed yet)
[INFO] Testing: https://flamoral.com
[WARNING]   Connection failed (this is normal if servers aren't deployed yet)
[INFO] Testing: http://www.flamoral.com
[WARNING]   Connection failed (this is normal if servers aren't deployed yet)
[INFO] Testing: https://www.flamoral.com
[WARNING]   Connection failed (this is normal if servers aren't deployed yet)
[INFO] Testing: https://api.flamoral.com
[WARNING]   Connection failed (this is normal if servers aren't deployed yet)

[INFO] If connections are failing, ensure your Azure resources are deployed and running

========================================
VERIFICATION SUMMARY
========================================

Domain: flamoral.com
Resource Group: flamoral-dating-app-rg

✓ Nameserver delegation is correct
✓ A records are resolving
✓ DNS is propagated globally

Next steps:
  - Deploy your application to Azure
  - Configure SSL/TLS certificates
  - Update A records with actual resource IPs

[SUCCESS] Verification completed!
```

## Step-by-Step Setup Process

### Phase 1: Azure DNS Zone Setup

1. **Login to Azure**
   ```bash
   az login
   ```

2. **Run the setup script**
   ```bash
   ./scripts/setup-azure-dns.sh
   ```

3. **Note the nameservers** displayed in the output

### Phase 2: GoDaddy Configuration

1. **Login to GoDaddy**
   - Go to https://godaddy.com
   - Navigate to "My Products" > "Domains"

2. **Select flamoral.com domain**
   - Click on the domain name

3. **Manage DNS Settings**
   - Scroll down to "Additional Settings"
   - Click "Manage DNS"

4. **Change Nameservers**
   - Click "Change" next to Nameservers
   - Select "Enter my own nameservers (advanced)"
   - Enter the 4 Azure nameservers from the script output:
     - ns1-01.azure-dns.com
     - ns2-01.azure-dns.net
     - ns3-01.azure-dns.org
     - ns4-01.azure-dns.info
   - Click "Save"

5. **Wait for propagation**
   - DNS changes can take 24-48 hours to fully propagate
   - Initial propagation usually happens within 1-2 hours

### Phase 3: Verify DNS Configuration

1. **Wait for initial propagation** (1-2 hours after changing nameservers)

2. **Run verification script**
   ```bash
   ./scripts/verify-dns-propagation.sh
   ```

3. **Check the results**
   - Nameserver delegation should show "correctly configured"
   - A records should be resolving
   - Global propagation may take longer

4. **Rerun verification periodically**
   ```bash
   # Check again after a few hours
   ./scripts/verify-dns-propagation.sh
   ```

### Phase 4: Deploy Azure Resources

1. **Deploy AKS Cluster and Application Gateway**
   ```bash
   # Navigate to Terraform directory
   cd infrastructure/terraform/environments/production

   # Initialize and apply
   terraform init
   terraform plan
   terraform apply
   ```

2. **Get Public IP Addresses**
   ```bash
   # Get Application Gateway public IP
   az network public-ip show \
     --resource-group flamoral-dating-app-rg \
     --name flamoral-appgw-pip \
     --query ipAddress \
     --output tsv
   ```

### Phase 5: Update DNS A Records

1. **Update root domain**
   ```bash
   az network dns record-set a add-record \
     --resource-group flamoral-dating-app-rg \
     --zone-name flamoral.com \
     --record-set-name @ \
     --ipv4-address <your-actual-ip>
   ```

2. **Update www subdomain**
   ```bash
   az network dns record-set a add-record \
     --resource-group flamoral-dating-app-rg \
     --zone-name flamoral.com \
     --record-set-name www \
     --ipv4-address <your-actual-ip>
   ```

3. **Update api subdomain**
   ```bash
   az network dns record-set a add-record \
     --resource-group flamoral-dating-app-rg \
     --zone-name flamoral.com \
     --record-set-name api \
     --ipv4-address <your-actual-ip>
   ```

4. **Verify updated records**
   ```bash
   ./scripts/verify-dns-propagation.sh
   ```

## Troubleshooting

### Nameservers not propagating

**Issue:** Verification script shows nameservers don't match Azure

**Solution:**
1. Double-check nameserver configuration at GoDaddy
2. Ensure you saved the changes
3. Wait longer (propagation can take up to 48 hours)
4. Clear local DNS cache:
   ```bash
   # Windows
   ipconfig /flushdns

   # Linux
   sudo systemd-resolve --flush-caches

   # Mac
   sudo dscacheutil -flushcache
   ```

### A records not resolving

**Issue:** A records return no results or wrong IP

**Solution:**
1. Check Azure DNS Zone records:
   ```bash
   az network dns record-set a list \
     --resource-group flamoral-dating-app-rg \
     --zone-name flamoral.com \
     --output table
   ```
2. Verify nameservers are correctly delegated first
3. Wait for DNS propagation
4. Test with specific DNS server:
   ```bash
   dig @ns1-01.azure-dns.com flamoral.com
   ```

### Partial global propagation

**Issue:** Some DNS servers resolve, others don't

**Solution:**
- This is normal during propagation
- Wait a few more hours
- Rerun verification script periodically
- Different DNS servers cache at different rates

### Azure CLI authentication errors

**Issue:** "Please run 'az login'" error

**Solution:**
1. Login to Azure:
   ```bash
   az login
   ```
2. Set correct subscription:
   ```bash
   az account set --subscription <subscription-id>
   ```
3. Verify login:
   ```bash
   az account show
   ```

## DNS Configuration Reference

### Current DNS Records

| Record Type | Name | Value | TTL |
|-------------|------|-------|-----|
| A | @ | 20.75.0.1 (placeholder) | 3600 |
| A | www | 20.75.0.1 (placeholder) | 3600 |
| A | api | 20.75.0.1 (placeholder) | 3600 |

### Azure DNS Zone Details

- **Domain:** flamoral.com
- **Resource Group:** flamoral-dating-app-rg
- **Location:** East US
- **Nameserver Count:** 4
- **Record Sets:** 3 (A records)

## Next Steps After DNS Setup

1. **SSL/TLS Certificates**
   - Install cert-manager in AKS
   - Configure Let's Encrypt ClusterIssuer
   - Create Certificate resources for each domain

2. **Application Gateway Configuration**
   - Configure HTTP to HTTPS redirect
   - Set up SSL termination
   - Configure backend pools for services

3. **Monitoring**
   - Set up DNS health checks
   - Configure Azure Monitor alerts
   - Track DNS query metrics

4. **Additional DNS Records**
   - MX records for email (if needed)
   - TXT records for domain verification
   - CNAME for additional subdomains

## Security Considerations

1. **DNSSEC** - Consider enabling DNSSEC for additional security
2. **TTL Values** - Use appropriate TTL values (3600s = 1 hour is standard)
3. **Access Control** - Limit who can modify DNS records
4. **Monitoring** - Set up alerts for DNS changes
5. **Backup** - Keep a backup of DNS configuration

## Useful Commands

```bash
# List all DNS zones
az network dns zone list --output table

# Show specific zone details
az network dns zone show \
  --resource-group flamoral-dating-app-rg \
  --name flamoral.com

# List all A records
az network dns record-set a list \
  --resource-group flamoral-dating-app-rg \
  --zone-name flamoral.com \
  --output table

# Delete an A record
az network dns record-set a remove-record \
  --resource-group flamoral-dating-app-rg \
  --zone-name flamoral.com \
  --record-set-name www \
  --ipv4-address 20.75.0.1

# Update TTL for a record
az network dns record-set a update \
  --resource-group flamoral-dating-app-rg \
  --zone-name flamoral.com \
  --name www \
  --set ttl=300

# Test DNS resolution
dig flamoral.com
nslookup flamoral.com
host flamoral.com

# Test with specific DNS server
dig @8.8.8.8 flamoral.com
nslookup flamoral.com 8.8.8.8
```

## Additional Resources

- [Azure DNS Documentation](https://docs.microsoft.com/en-us/azure/dns/)
- [Azure DNS Zones](https://docs.microsoft.com/en-us/azure/dns/dns-zones-records)
- [Domain Delegation to Azure DNS](https://docs.microsoft.com/en-us/azure/dns/dns-domain-delegation)
- [GoDaddy Nameserver Change Guide](https://www.godaddy.com/help/change-nameservers-for-my-domains-664)
- [DNS Propagation Checker](https://www.whatsmydns.net/)

## Support

For issues or questions:
- Check the troubleshooting section above
- Review Azure DNS documentation
- Contact the DevOps team
- Open an issue in the project repository
