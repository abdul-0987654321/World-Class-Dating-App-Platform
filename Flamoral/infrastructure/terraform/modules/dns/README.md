# DNS Module for Azure DNS Zone

## Overview

This Terraform module creates and manages an Azure DNS Zone for flamoral.com with A records pointing to the production Kubernetes ingress IP address.

## Features

- Creates Azure DNS Zone for flamoral.com
- Creates A records for:
  - Root domain (flamoral.com)
  - www subdomain (www.flamoral.com)
  - api subdomain (api.flamoral.com)
  - admin subdomain (admin.flamoral.com)
- Configurable TTL (default 300 seconds for initial deployment)
- CAA records for Let's Encrypt SSL certificate issuance
- Optional domain verification TXT record

## Usage

```hcl
module "dns" {
  source = "./modules/dns"

  resource_group_name = azurerm_resource_group.main.name
  domain_name         = "flamoral.com"
  target_ip           = "48.200.65.15"
  ttl                 = 300

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| resource_group_name | Name of the resource group | string | n/a | yes |
| domain_name | Domain name for the DNS zone | string | "flamoral.com" | no |
| target_ip | Target IP address for A records | string | "48.200.65.15" | no |
| ttl | Time to Live for DNS records in seconds | number | 300 | no |
| verification_txt | TXT record value for domain verification | string | "" | no |
| tags | Tags to apply to all resources | map(string) | {} | no |

## Outputs

| Name | Description |
|------|-------------|
| dns_zone_id | ID of the DNS zone |
| dns_zone_name | Name of the DNS zone |
| name_servers | List of Azure DNS name servers for the zone |
| root_domain_fqdn | FQDN of the root domain A record |
| www_fqdn | FQDN of the www subdomain A record |
| api_fqdn | FQDN of the api subdomain A record |
| admin_fqdn | FQDN of the admin subdomain A record |
| target_ip | Target IP address for all A records |

## DNS Records Created

### A Records
- `flamoral.com` → 48.200.65.15
- `www.flamoral.com` → 48.200.65.15
- `api.flamoral.com` → 48.200.65.15
- `admin.flamoral.com` → 48.200.65.15

### CAA Records
- `flamoral.com` CAA 0 issue "letsencrypt.org"
- `flamoral.com` CAA 0 issuewild "letsencrypt.org"

## Post-Deployment Steps

1. **Update Domain Registrar**: After Terraform creates the DNS zone, you'll receive Azure name servers. Update your domain registrar (e.g., GoDaddy, Namecheap) with these name servers.

2. **Verify Name Server Configuration**:
   ```bash
   # Get the name servers from Terraform output
   terraform output name_servers

   # Verify DNS propagation
   nslookup flamoral.com
   dig flamoral.com NS
   ```

3. **Test DNS Resolution**:
   ```bash
   # Test all A records
   nslookup flamoral.com
   nslookup www.flamoral.com
   nslookup api.flamoral.com
   nslookup admin.flamoral.com
   ```

## TTL Recommendations

- **Initial deployment**: 300 seconds (5 minutes) - allows quick changes if needed
- **After stabilization**: 3600 seconds (1 hour) - reduces DNS query load
- **Production stable**: 86400 seconds (24 hours) - optimal for stable environments

To update TTL after stabilization:
```bash
# Update in terraform.tfvars
dns_ttl = 3600

# Apply changes
terraform plan
terraform apply
```

## Alternative: CNAME Records

The module includes commented-out CNAME record configurations. To use CNAME instead of A records for subdomains:

1. Comment out the A record resources for www, api, and admin
2. Uncomment the CNAME record resources
3. Apply the changes

**Note**: A records are generally preferred for better performance and fewer DNS lookups.

## Troubleshooting

### DNS Not Resolving

1. **Check Name Servers**: Verify that your domain registrar has the correct Azure DNS name servers
2. **Wait for Propagation**: DNS changes can take 24-48 hours to propagate globally
3. **Clear DNS Cache**: Clear local DNS cache on your machine
4. **Test from Multiple Locations**: Use online DNS checkers to verify from different regions

### CAA Record Issues

If Let's Encrypt certificate issuance fails:
1. Verify CAA records are properly configured
2. Check that no conflicting CAA records exist
3. Use `dig flamoral.com CAA` to verify CAA records

## Security Considerations

- CAA records prevent unauthorized certificate issuance
- Low TTL during initial setup allows quick fixes
- All subdomains use the same security posture
- Regular monitoring of DNS records recommended
