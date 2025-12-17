# Azure Infrastructure Configuration

This directory contains Azure-specific configuration files and deployment scripts for the Flamoral dating platform.

---

## Files Overview

### Azure Front Door Configuration

#### Deployment Scripts

- **`deploy-frontdoor-routes.sh`** - Bash script for deploying Front Door routing rules (Linux/Mac)
- **`deploy-frontdoor-routes.ps1`** - PowerShell script for deploying Front Door routing rules (Windows)

#### Documentation

- **`FRONTDOOR_ROUTING_GUIDE.md`** - Comprehensive guide for Front Door routing configuration (~450 lines)
  - Complete routing architecture
  - Deployment instructions (Terraform & CLI)
  - Route-by-route details
  - Caching strategies
  - Custom domain setup
  - Troubleshooting

- **`FRONTDOOR_QUICK_DEPLOY.md`** - Quick reference guide (1 page)
  - 5-minute deployment instructions
  - Essential commands only
  - Quick verification steps

#### Bicep Templates

- **`waf-policy.bicep`** - Web Application Firewall policy configuration (existing)

---

## Quick Start

### Deploy Front Door Routing Rules

**Windows (PowerShell):**
```powershell
.\deploy-frontdoor-routes.ps1
```

**Linux/Mac (Bash):**
```bash
chmod +x deploy-frontdoor-routes.sh
./deploy-frontdoor-routes.sh
```

**Manual (Azure CLI):**
```bash
az afd route create \
  --endpoint-name flamoral-prod \
  --profile-name flamoral-prod-afd \
  --resource-group flamoral-prod-rg \
  --route-name default-route \
  --origin-group flamoral-origin-group \
  --supported-protocols Http Https \
  --patterns-to-match "/*" \
  --forwarding-protocol HttpsOnly \
  --https-redirect Enabled
```

---

## Prerequisites

- Azure CLI installed (`az --version`)
- Logged in to Azure (`az login`)
- Correct subscription selected
- Front Door profile deployed (`flamoral-prod-afd`)

---

## Routes Deployed

| Route | Pattern | Purpose | Caching |
|-------|---------|---------|---------|
| default-route | `/*` | Web traffic | Yes (filtered) |
| api-route | `/api/*`, `/graphql` | API calls | Yes (query string) |
| websocket-route | `/ws/*`, `/socket.io/*` | Real-time | No |
| static-route | `/static/*`, `/assets/*` | CSS, JS | Yes (aggressive) |
| media-route | `/media/*`, `/uploads/*` | Media files | Yes (no compression) |
| health-route | `/health`, `/healthz` | Health checks | No |

---

## Verification

```bash
# List all routes
az afd route list \
  --endpoint-name flamoral-prod \
  --profile-name flamoral-prod-afd \
  --resource-group flamoral-prod-rg \
  --output table

# Test Front Door endpoint
curl -I https://flamoral-prod-andtbkagfve5h5da.z01.azurefd.net
```

---

## Documentation Hierarchy

1. **Start here:** `FRONTDOOR_QUICK_DEPLOY.md` - Quick 5-minute guide
2. **Full details:** `FRONTDOOR_ROUTING_GUIDE.md` - Complete documentation
3. **Project summary:** `../../../FRONTDOOR_ROUTING_DEPLOYMENT_SUMMARY.md` - Overall deployment summary

---

## Related Resources

- **Terraform Configuration:** `../terraform/environments/prod/frontdoor-routes.tf`
- **Terraform Module:** `../terraform/modules/frontdoor/routes.tf`
- **Kubernetes Config:** `../kubernetes/`
- **Helm Charts:** `../helm/`

---

## Support

For issues or questions:
1. Check `FRONTDOOR_ROUTING_GUIDE.md` troubleshooting section
2. Review Azure Front Door documentation
3. Verify Azure RBAC permissions

---

**Last Updated:** 2025-12-13
**Status:** Ready for deployment
