# Flamoral Platform - DNS and Domain Setup Guide

## Overview

This document details the complete DNS and domain configuration for **flamoral.com** on Azure. The setup enables public access to the production environment while keeping dev and test environments private.

---

## 1. Domain Architecture

```
flamoral.com (Production - Public)
├── flamoral.com            → Web App (React SPA)
├── www.flamoral.com        → Web App (redirects to root)
├── api.flamoral.com        → API Gateway (AKS Ingress)
├── cdn.flamoral.com        → Azure CDN (Media Storage)
├── ws.flamoral.com         → WebSocket Service (Real-time)
└── admin.flamoral.com      → Admin Dashboard

Internal Only (Dev/Test):
├── dev.flamoral.internal   → Development AKS
├── test.flamoral.internal  → Test/Staging AKS
└── *.privatelink.*.azure.com → Private endpoints
```

---

## 2. Azure DNS Zone Configuration

### 2.1 Prerequisites

1. Domain registered with GoDaddy (or any registrar)
2. Azure DNS Zone created in production resource group
3. AKS cluster deployed with public ingress IP

### 2.2 Update Nameservers at GoDaddy

After creating the Azure DNS Zone, update the nameservers at GoDaddy to point to Azure:

```bash
# Get Azure DNS Zone nameservers
az network dns zone show \
  --resource-group flamoral-prod-rg \
  --name flamoral.com \
  --query nameServers -o tsv
```

Expected nameservers (example):
```
ns1-05.azure-dns.com
ns2-05.azure-dns.net
ns3-05.azure-dns.org
ns4-05.azure-dns.info
```

**GoDaddy Configuration:**
1. Log in to GoDaddy → Domain Settings
2. Scroll to "Nameservers" section
3. Select "Change" → "Custom nameservers"
4. Enter all four Azure nameservers
5. Save changes (propagation takes 24-48 hours)

### 2.3 DNS Records (Terraform Managed)

The following records are automatically created by Terraform:

```hcl
# A Record - Root domain
resource "azurerm_dns_a_record" "root" {
  name                = "@"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = azurerm_resource_group.prod.name
  ttl                 = 300
  records             = [azurerm_public_ip.ingress.ip_address]
}

# A Record - www subdomain
resource "azurerm_dns_a_record" "www" {
  name                = "www"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = azurerm_resource_group.prod.name
  ttl                 = 300
  records             = [azurerm_public_ip.ingress.ip_address]
}

# A Record - API subdomain
resource "azurerm_dns_a_record" "api" {
  name                = "api"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = azurerm_resource_group.prod.name
  ttl                 = 300
  records             = [azurerm_public_ip.ingress.ip_address]
}

# CNAME Record - CDN
resource "azurerm_dns_cname_record" "cdn" {
  name                = "cdn"
  zone_name           = azurerm_dns_zone.main.name
  resource_group_name = azurerm_resource_group.prod.name
  ttl                 = 300
  record              = azurerm_cdn_endpoint.media.fqdn
}
```

---

## 3. Azure Front Door Configuration

### 3.1 Front Door Profile

Production uses Azure Front Door Premium for:
- Global load balancing
- WAF protection
- SSL/TLS termination
- CDN caching

```hcl
resource "azurerm_cdn_frontdoor_profile" "main" {
  name                = "flamoral-prod-afd"
  resource_group_name = azurerm_resource_group.prod.name
  sku_name            = "Premium_AzureFrontDoor"
}
```

### 3.2 Custom Domain Setup

```bash
# Add custom domain to Front Door
az afd custom-domain create \
  --resource-group flamoral-prod-rg \
  --profile-name flamoral-prod-afd \
  --custom-domain-name flamoral-com \
  --host-name flamoral.com \
  --certificate-type ManagedCertificate
```

### 3.3 DNS Validation

Azure Front Door requires CNAME validation:

```bash
# Create validation CNAME record
az network dns record-set cname create \
  --resource-group flamoral-prod-rg \
  --zone-name flamoral.com \
  --name _dnsauth.flamoral.com \
  --ttl 3600

az network dns record-set cname set-record \
  --resource-group flamoral-prod-rg \
  --zone-name flamoral.com \
  --record-set-name _dnsauth.flamoral.com \
  --cname [AFD-verification-ID].azurefd.net
```

---

## 4. SSL/TLS Certificate Management

### 4.1 Option A: Azure-Managed Certificates (Recommended)

Azure Front Door automatically provisions and renews certificates:

```hcl
resource "azurerm_cdn_frontdoor_custom_domain" "main" {
  name                     = "flamoral-custom-domain"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.main.id
  host_name                = "flamoral.com"

  tls {
    certificate_type    = "ManagedCertificate"
    minimum_tls_version = "TLS12"
  }
}
```

### 4.2 Option B: cert-manager with Let's Encrypt (AKS Ingress)

For direct AKS ingress without Front Door:

```yaml
# ClusterIssuer for Let's Encrypt Production
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: devops@flamoral.com
    privateKeySecretRef:
      name: letsencrypt-prod-account-key
    solvers:
      - http01:
          ingress:
            class: nginx

---
# Certificate for flamoral.com
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: flamoral-tls
  namespace: flamoral
spec:
  secretName: flamoral-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - flamoral.com
    - www.flamoral.com
    - api.flamoral.com
```

---

## 5. Kubernetes Ingress Configuration

### 5.1 NGINX Ingress Controller

```yaml
# NGINX Ingress Controller with Static IP
apiVersion: v1
kind: Service
metadata:
  name: ingress-nginx-controller
  namespace: ingress-nginx
  annotations:
    service.beta.kubernetes.io/azure-load-balancer-resource-group: flamoral-prod-rg
spec:
  type: LoadBalancer
  loadBalancerIP: "<PUBLIC_IP_ADDRESS>"  # From azurerm_public_ip.ingress
  ports:
    - name: http
      port: 80
      targetPort: 80
    - name: https
      port: 443
      targetPort: 443
```

### 5.2 Production Ingress Rules

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: flamoral-ingress
  namespace: flamoral
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "100m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "300"
    nginx.ingress.kubernetes.io/websocket-services: "messaging-service"
spec:
  tls:
    - hosts:
        - flamoral.com
        - www.flamoral.com
        - api.flamoral.com
      secretName: flamoral-tls
  rules:
    - host: flamoral.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: api-gateway
                port:
                  number: 4000
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-app
                port:
                  number: 80
    - host: www.flamoral.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-app
                port:
                  number: 80
    - host: api.flamoral.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-gateway
                port:
                  number: 4000
```

---

## 6. WAF (Web Application Firewall) Configuration

### 6.1 Azure Front Door WAF Policy

```hcl
resource "azurerm_cdn_frontdoor_firewall_policy" "main" {
  name                = "flamoralprodwaf"
  resource_group_name = azurerm_resource_group.prod.name
  sku_name            = "Premium_AzureFrontDoor"
  enabled             = true
  mode                = "Prevention"

  # OWASP Managed Rules
  managed_rule {
    type    = "DefaultRuleSet"
    version = "1.0"
    action  = "Block"
  }

  # Bot Protection
  managed_rule {
    type    = "Microsoft_BotManagerRuleSet"
    version = "1.0"
    action  = "Block"
  }

  # Rate Limiting
  custom_rule {
    name                           = "RateLimitAPI"
    enabled                        = true
    priority                       = 100
    rate_limit_duration_in_minutes = 1
    rate_limit_threshold           = 100
    type                           = "RateLimitRule"
    action                         = "Block"

    match_condition {
      match_variable     = "RequestUri"
      operator           = "Contains"
      match_values       = ["/api/"]
    }
  }
}
```

### 6.2 WAF Rules Summary

| Rule Set | Version | Action | Purpose |
|----------|---------|--------|---------|
| DefaultRuleSet | 1.0 | Block | OWASP Top 10 protection |
| BotManagerRuleSet | 1.0 | Block | Bot traffic blocking |
| Rate Limit (API) | Custom | Block | 100 req/min per IP |
| Geo Blocking | Custom | Block | High-risk countries |

---

## 7. Health Checks and Monitoring

### 7.1 Front Door Health Probes

```hcl
health_probe {
  path                = "/health"
  request_type        = "HEAD"
  protocol            = "Https"
  interval_in_seconds = 30
}
```

### 7.2 Health Endpoint Implementation

Every service must expose `/health`:

```typescript
// API Gateway health endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'api-gateway',
    version: process.env.VERSION
  });
});
```

---

## 8. DNS Verification Commands

### 8.1 Verify DNS Propagation

```bash
# Check A records
dig flamoral.com +short
dig www.flamoral.com +short
dig api.flamoral.com +short

# Check CNAME records
dig cdn.flamoral.com CNAME +short

# Check nameservers
dig flamoral.com NS +short

# Verify SSL certificate
openssl s_client -connect flamoral.com:443 -servername flamoral.com < /dev/null 2>/dev/null | openssl x509 -noout -dates -subject
```

### 8.2 Expected Results

```
$ dig flamoral.com +short
<AKS_INGRESS_PUBLIC_IP>

$ dig cdn.flamoral.com CNAME +short
flamoral-prod-media.azureedge.net

$ dig flamoral.com NS +short
ns1-05.azure-dns.com.
ns2-05.azure-dns.net.
ns3-05.azure-dns.org.
ns4-05.azure-dns.info.
```

---

## 9. Environment-Specific Access

### 9.1 Production (Public)

| Endpoint | URL | Access |
|----------|-----|--------|
| Web App | https://flamoral.com | Public |
| API | https://api.flamoral.com | Public |
| CDN | https://cdn.flamoral.com | Public |

### 9.2 Test (Private)

| Endpoint | Access Method |
|----------|---------------|
| AKS Cluster | kubectl port-forward or VPN |
| Internal API | Azure Bastion / Jump Host |
| Storage | Private Endpoints |

### 9.3 Development (Private)

| Endpoint | Access Method |
|----------|---------------|
| AKS Cluster | kubectl port-forward |
| Local Services | localhost:3000-4000 |
| Storage | Public blob access (dev only) |

---

## 10. Troubleshooting

### 10.1 Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| DNS not resolving | Nameserver propagation | Wait 24-48 hours |
| SSL certificate error | CNAME validation pending | Check Front Door validation status |
| 502 Bad Gateway | Backend unhealthy | Check AKS pods and health probes |
| Connection timeout | NSG blocking traffic | Verify NSG allows ports 80/443 |

### 10.2 Debug Commands

```bash
# Check Azure DNS zone
az network dns zone show -g flamoral-prod-rg -n flamoral.com

# Check Front Door endpoint status
az afd endpoint show -g flamoral-prod-rg --profile-name flamoral-prod-afd -n flamoral-prod

# Check AKS ingress controller
kubectl get pods -n ingress-nginx
kubectl logs -n ingress-nginx -l app.kubernetes.io/component=controller

# Test connectivity
curl -I https://flamoral.com
curl -I https://api.flamoral.com/health
```

---

## 11. Maintenance Procedures

### 11.1 Certificate Renewal

- **Azure Managed**: Automatic (no action needed)
- **Let's Encrypt**: cert-manager handles renewal automatically

### 11.2 DNS Record Updates

```bash
# Update A record (if IP changes)
az network dns record-set a update \
  --resource-group flamoral-prod-rg \
  --zone-name flamoral.com \
  --name @ \
  --set "ARecords[0].ipv4Address=NEW_IP"
```

---

## Document Information

| Field | Value |
|-------|-------|
| Last Updated | December 2024 |
| Version | 1.0 |
| Author | Flamoral DevOps Team |
| Status | Production Ready |
