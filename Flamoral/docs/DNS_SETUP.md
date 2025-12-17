# Flamoral.com DNS Setup Guide

This document describes the DNS configuration for the Flamoral dating platform.

## Domain Overview

| Domain | Purpose | Target |
|--------|---------|--------|
| flamoral.com | Main website | AKS Ingress Load Balancer |
| www.flamoral.com | WWW redirect | AKS Ingress Load Balancer |
| api.flamoral.com | API Gateway | AKS Ingress Load Balancer |
| dev.flamoral.com | Development environment | Dev AKS Cluster |
| test.flamoral.com | Test environment | Test AKS Cluster |
| staging.flamoral.com | Staging environment | Staging App Service |

## Architecture

```
                    ┌─────────────────────────────────────────┐
                    │           Azure DNS Zone                │
                    │           flamoral.com                  │
                    └─────────────────┬───────────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
          ▼                           ▼                           ▼
   ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
   │  A Record    │          │  A Record    │          │  A Record    │
   │  @ (root)    │          │  www         │          │  api         │
   └──────┬───────┘          └──────┬───────┘          └──────┬───────┘
          │                         │                         │
          └─────────────────────────┼─────────────────────────┘
                                    │
                                    ▼
                    ┌─────────────────────────────────────────┐
                    │    AKS Ingress Controller (NGINX)       │
                    │    Public IP: <AKS_PUBLIC_IP>           │
                    └─────────────────┬───────────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
          ▼                           ▼                           ▼
   ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
   │  Web App     │          │  API Gateway │          │  WebSocket   │
   │  (Frontend)  │          │  /api/*      │          │  /ws, /rt    │
   └──────────────┘          └──────────────┘          └──────────────┘
```

## DNS Records Configuration

### Production (flamoral.com)

```
Type    Name    Value                       TTL     Notes
----    ----    -----                       ---     -----
A       @       <AKS_PUBLIC_IP>             300     Root domain
A       www     <AKS_PUBLIC_IP>             300     WWW subdomain
A       api     <AKS_PUBLIC_IP>             300     API subdomain
TXT     @       <verification_code>         3600    Domain verification
CAA     @       0 issue "letsencrypt.org"   3600    SSL certificate issuer
```

### Environment Subdomains

```
Type    Name        Value                               TTL
----    ----        -----                               ---
CNAME   dev         flamoral-dev.azurewebsites.net      300
CNAME   test        flamoral-test.azurewebsites.net     300
CNAME   staging     flamoral-staging.azurewebsites.net  300
```

## Terraform Configuration

The DNS zone is managed via Terraform using the `dns-zone` module:

```hcl
module "dns" {
  source = "../../modules/dns-zone"

  domain_name         = "flamoral.com"
  resource_group_name = azurerm_resource_group.main.name
  aks_public_ip       = module.aks.ingress_public_ip

  create_environment_records = true
  dev_cname_target          = "flamoral-dev.azurewebsites.net"
  test_cname_target         = "flamoral-test.azurewebsites.net"
  staging_cname_target      = "flamoral-staging.azurewebsites.net"

  enable_email_records = true

  tags = local.common_tags
}
```

## Registrar Configuration

After the Azure DNS Zone is created, update your domain registrar (where flamoral.com was purchased) with the Azure name servers:

1. Go to your domain registrar's control panel
2. Find the nameserver settings for flamoral.com
3. Replace existing nameservers with Azure DNS nameservers:
   - `ns1-XX.azure-dns.com`
   - `ns2-XX.azure-dns.net`
   - `ns3-XX.azure-dns.org`
   - `ns4-XX.azure-dns.info`

**Note:** The exact nameserver addresses will be output by Terraform after applying.

## SSL/TLS Certificates

SSL certificates are automatically provisioned using:
- **cert-manager** in Kubernetes cluster
- **Let's Encrypt** as the Certificate Authority

The ingress is configured with:
```yaml
annotations:
  cert-manager.io/cluster-issuer: "letsencrypt-prod"
```

## Ingress Configuration

The Kubernetes ingress routes traffic based on hostname:

| Host | Path | Service | Port |
|------|------|---------|------|
| flamoral.com | / | web | 80 |
| flamoral.com | /api | api-gateway | 80 |
| flamoral.com | /ws | realtime-service | 80 |
| www.flamoral.com | / | web | 80 |
| api.flamoral.com | / | api-gateway | 80 |

## Verification Commands

```bash
# Check DNS propagation
dig flamoral.com
dig www.flamoral.com
dig api.flamoral.com

# Verify SSL certificate
openssl s_client -connect flamoral.com:443 -servername flamoral.com

# Test API endpoint
curl -I https://api.flamoral.com/health

# Test WebSocket
wscat -c wss://flamoral.com/ws
```

## Troubleshooting

### DNS Not Resolving
1. Check nameservers are correctly set at registrar
2. Wait for DNS propagation (up to 48 hours)
3. Use `dig @ns1-XX.azure-dns.com flamoral.com` to query Azure DNS directly

### SSL Certificate Issues
1. Check cert-manager logs: `kubectl logs -n cert-manager deploy/cert-manager`
2. Check certificate status: `kubectl get certificates -n flamoral`
3. Check certificate request: `kubectl describe certificaterequest -n flamoral`

### Ingress Not Routing
1. Check ingress controller: `kubectl get pods -n ingress-nginx`
2. Check ingress resource: `kubectl describe ingress -n flamoral`
3. Check service endpoints: `kubectl get endpoints -n flamoral`
