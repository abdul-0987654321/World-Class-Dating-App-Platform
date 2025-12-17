# Azure DNS Scripts - Sample Output Reference

This document shows example outputs from the DNS setup and verification scripts.

## Script Locations

- **Setup Script:** `C:\Users\citad\OneDrive\Documents\Dating\DatingPlatform\scripts\setup-azure-dns.sh`
- **Verification Script:** `C:\Users\citad\OneDrive\Documents\Dating\DatingPlatform\scripts\verify-dns-propagation.sh`
- **Documentation:** `C:\Users\citad\OneDrive\Documents\Dating\DatingPlatform\docs\AZURE_DNS_SETUP.md`

---

## 1. setup-azure-dns.sh - Sample Output

### First Run (Creating New Resources)

```bash
$ ./scripts/setup-azure-dns.sh

========================================
AZURE DNS ZONE SETUP FOR FLAMORAL.COM
========================================

[INFO] Checking if Azure CLI is installed...
[SUCCESS] Azure CLI is installed
[INFO] Checking Azure login status...
[SUCCESS] Logged into Azure
[INFO] Subscription: Azure Subscription 1 (12345678-1234-1234-1234-123456789012)

[INFO] Checking if resource group 'flamoral-dating-app-rg' exists...
[WARNING] Resource group 'flamoral-dating-app-rg' does not exist. Creating it...

Location    Name
----------  -------------------------
eastus      flamoral-dating-app-rg

[SUCCESS] Resource group 'flamoral-dating-app-rg' created

[INFO] Checking if DNS zone 'flamoral.com' exists...
[WARNING] DNS zone 'flamoral.com' does not exist. Creating it...

Location    Name             ResourceGroup              NumberOfRecordSets    MaxNumberOfRecordSets
----------  ---------------  -------------------------  --------------------  -----------------------
global      flamoral.com     flamoral-dating-app-rg     2                     10000

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

[INFO] Listing all DNS records for 'flamoral.com'...

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

### Second Run (Resources Already Exist)

```bash
$ ./scripts/setup-azure-dns.sh

========================================
AZURE DNS ZONE SETUP FOR FLAMORAL.COM
========================================

[INFO] Checking if Azure CLI is installed...
[SUCCESS] Azure CLI is installed
[INFO] Checking Azure login status...
[SUCCESS] Logged into Azure
[INFO] Subscription: Azure Subscription 1 (12345678-1234-1234-1234-123456789012)

[INFO] Checking if resource group 'flamoral-dating-app-rg' exists...
[SUCCESS] Resource group 'flamoral-dating-app-rg' already exists

[INFO] Checking if DNS zone 'flamoral.com' exists...
[SUCCESS] DNS zone 'flamoral.com' already exists

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

[INFO] Checking if A record 'flamoral.com' exists...
[WARNING] A record 'flamoral.com' already exists. Updating...
[SUCCESS] A record created/updated: flamoral.com -> 20.75.0.1

[INFO] Checking if A record 'www.flamoral.com' exists...
[WARNING] A record 'www.flamoral.com' already exists. Updating...
[SUCCESS] A record created/updated: www.flamoral.com -> 20.75.0.1

[INFO] Checking if A record 'api.flamoral.com' exists...
[WARNING] A record 'api.flamoral.com' already exists. Updating...
[SUCCESS] A record created/updated: api.flamoral.com -> 20.75.0.1

[SUCCESS] All DNS A records created successfully

[... rest of output similar to first run ...]
```

---

## 2. verify-dns-propagation.sh - Sample Output

### Before Nameserver Configuration (Initial State)

```bash
$ ./scripts/verify-dns-propagation.sh

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

[INFO] Retrieving records from Azure DNS Zone...

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
  - ns55.domaincontrol.com.
  - ns56.domaincontrol.com.

Expected Azure Nameservers:
  - ns1-01.azure-dns.com
  - ns2-01.azure-dns.net
  - ns3-01.azure-dns.org
  - ns4-01.azure-dns.info

[ERROR] Nameserver ns1-01.azure-dns.com is NOT configured
[ERROR] Nameserver ns2-01.azure-dns.net is NOT configured
[ERROR] Nameserver ns3-01.azure-dns.org is NOT configured
[ERROR] Nameserver ns4-01.azure-dns.info is NOT configured

[ERROR] Nameserver delegation is incomplete or incorrect
[WARNING] Please update nameservers at GoDaddy to match Azure nameservers

========================================
A RECORD RESOLUTION CHECK
========================================

[INFO] Checking A record for: flamoral.com
[ERROR] No A record found for flamoral.com
[INFO] Checking A record for: www.flamoral.com
[ERROR] No A record found for www.flamoral.com
[INFO] Checking A record for: api.flamoral.com
[ERROR] No A record found for api.flamoral.com

[WARNING] Some A records are not resolving yet
[INFO] This is normal if DNS was recently configured
[INFO] DNS propagation can take 24-48 hours

========================================
GLOBAL DNS PROPAGATION CHECK
========================================

[INFO] Checking DNS resolution from multiple public DNS servers...

[INFO] Querying Google (8.8.8.8)...
[WARNING]   Not yet propagated
[INFO] Querying Cloudflare (1.1.1.1)...
[WARNING]   Not yet propagated
[INFO] Querying Quad9 (9.9.9.9)...
[WARNING]   Not yet propagated
[INFO] Querying OpenDNS (208.67.222.222)...
[WARNING]   Not yet propagated

Propagation Status: 0/4 servers
[ERROR] DNS has not propagated yet
[INFO] If you just configured nameservers, wait 24-48 hours

[... additional checks ...]

========================================
VERIFICATION SUMMARY
========================================

Domain: flamoral.com
Resource Group: flamoral-dating-app-rg

✗ Nameserver delegation needs attention
! A records are not fully resolved
! DNS propagation is in progress

Recommended actions:
  - Update nameservers at GoDaddy
  - Wait for DNS propagation (24-48 hours)
  - Run this script again to verify

[SUCCESS] Verification completed!
```

### After Nameserver Configuration (Partial Propagation - 2 Hours Later)

```bash
$ ./scripts/verify-dns-propagation.sh

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

[INFO] Retrieving records from Azure DNS Zone...

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
[WARNING]   Not yet propagated
[INFO] Querying OpenDNS (208.67.222.222)...
[WARNING]   Not yet propagated

Propagation Status: 2/4 servers
[WARNING] DNS is partially propagated (this is normal)
[INFO] Wait a few more hours for full global propagation

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
! DNS propagation is in progress

Recommended actions:
  - Wait for DNS propagation (24-48 hours)
  - Run this script again to verify

[SUCCESS] Verification completed!
```

### After Full Propagation (24-48 Hours Later)

```bash
$ ./scripts/verify-dns-propagation.sh

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

[INFO] Retrieving records from Azure DNS Zone...

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

### After Deployment with Real IPs

```bash
$ ./scripts/verify-dns-propagation.sh

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

[INFO] Retrieving records from Azure DNS Zone...

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
[SUCCESS] flamoral.com -> 52.168.45.123
[INFO] Checking A record for: www.flamoral.com
[SUCCESS] www.flamoral.com -> 52.168.45.123
[INFO] Checking A record for: api.flamoral.com
[SUCCESS] api.flamoral.com -> 52.168.45.123

[SUCCESS] All A records are resolving correctly!

========================================
GLOBAL DNS PROPAGATION CHECK
========================================

[INFO] Checking DNS resolution from multiple public DNS servers...

[INFO] Querying Google (8.8.8.8)...
[SUCCESS]   Resolved: 52.168.45.123
[INFO] Querying Cloudflare (1.1.1.1)...
[SUCCESS]   Resolved: 52.168.45.123
[INFO] Querying Quad9 (9.9.9.9)...
[SUCCESS]   Resolved: 52.168.45.123
[INFO] Querying OpenDNS (208.67.222.222)...
[SUCCESS]   Resolved: 52.168.45.123

Propagation Status: 4/4 servers
[SUCCESS] DNS is fully propagated globally!

========================================
REVERSE DNS CHECK
========================================

[INFO] Performing reverse DNS lookups...

[INFO] Reverse lookup for 52.168.45.123:
  52-168-45-123.eastus.cloudapp.azure.com.

========================================
WEB CONNECTIVITY CHECK
========================================

[INFO] Testing HTTP/HTTPS connectivity...

[INFO] Testing: http://flamoral.com
[SUCCESS]   HTTP 301
[INFO] Testing: https://flamoral.com
[SUCCESS]   HTTP 200
[INFO] Testing: http://www.flamoral.com
[SUCCESS]   HTTP 301
[INFO] Testing: https://www.flamoral.com
[SUCCESS]   HTTP 200
[INFO] Testing: https://api.flamoral.com
[SUCCESS]   HTTP 200

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

---

## Quick Reference Commands

### Run Setup Script
```bash
cd /c/Users/citad/OneDrive/Documents/Dating/DatingPlatform
./scripts/setup-azure-dns.sh
```

### Run Verification Script
```bash
cd /c/Users/citad/OneDrive/Documents/Dating/DatingPlatform
./scripts/verify-dns-propagation.sh
```

### Manual DNS Checks
```bash
# Check nameservers
dig NS flamoral.com

# Check A record
dig A flamoral.com

# Check with specific DNS server
dig @8.8.8.8 flamoral.com

# Check all subdomains
dig flamoral.com www.flamoral.com api.flamoral.com
```

### Update A Records (After Deployment)
```bash
# Get Application Gateway Public IP
az network public-ip show \
  --resource-group flamoral-dating-app-rg \
  --name flamoral-appgw-pip \
  --query ipAddress \
  --output tsv

# Update root domain
az network dns record-set a add-record \
  --resource-group flamoral-dating-app-rg \
  --zone-name flamoral.com \
  --record-set-name @ \
  --ipv4-address 52.168.45.123

# Update www subdomain
az network dns record-set a add-record \
  --resource-group flamoral-dating-app-rg \
  --zone-name flamoral.com \
  --record-set-name www \
  --ipv4-address 52.168.45.123

# Update api subdomain
az network dns record-set a add-record \
  --resource-group flamoral-dating-app-rg \
  --zone-name flamoral.com \
  --record-set-name api \
  --ipv4-address 52.168.45.123
```

---

## Troubleshooting Common Outputs

### Error: Azure CLI Not Installed
```
[ERROR] Azure CLI is not installed. Please install it from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli
```
**Solution:** Install Azure CLI from the provided link

### Error: Not Logged Into Azure
```
[ERROR] Not logged into Azure. Please run 'az login' first
```
**Solution:** Run `az login` and authenticate

### Error: Missing DNS Tools
```
[ERROR] Missing required tools:
  - dig (install bind-utils or dnsutils)
  - nslookup (install bind-utils or dnsutils)
```
**Solution:** Install DNS utilities:
- Ubuntu/Debian: `sudo apt-get install dnsutils`
- CentOS/RHEL: `sudo yum install bind-utils`

### Warning: Nameservers Not Matching
```
[ERROR] Nameserver delegation is incomplete or incorrect
[WARNING] Please update nameservers at GoDaddy to match Azure nameservers
```
**Solution:** Login to GoDaddy and update nameservers to Azure nameservers shown in output

### Warning: Partial Propagation
```
Propagation Status: 2/4 servers
[WARNING] DNS is partially propagated (this is normal)
[INFO] Wait a few more hours for full global propagation
```
**Solution:** This is normal. Wait a few more hours and run verification again

---

## Timeline Expectations

| Time After NS Change | Expected Status |
|---------------------|-----------------|
| 0-15 minutes | No propagation, old nameservers still active |
| 15-60 minutes | Some DNS servers may start resolving new records |
| 1-4 hours | Partial propagation, most major DNS servers updated |
| 4-24 hours | Wide propagation, most global DNS servers updated |
| 24-48 hours | Full propagation complete worldwide |

---

## Status Indicators

The scripts use color-coded status indicators:

- **[INFO]** (Blue) - Informational message
- **[SUCCESS]** (Green) - Operation completed successfully
- **[WARNING]** (Yellow) - Non-critical issue or waiting state
- **[ERROR]** (Red) - Critical issue requiring attention

Summary symbols:
- **✓** (Green) - Check passed
- **!** (Yellow) - Partial or in-progress
- **✗** (Red) - Check failed
