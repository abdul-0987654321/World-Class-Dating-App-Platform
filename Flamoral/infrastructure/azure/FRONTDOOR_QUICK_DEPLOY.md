# Azure Front Door - Quick Deployment Guide

**IMMEDIATE FIX FOR 404 ERRORS**

---

## Problem

Azure Front Door returns 404 errors because **NO routing rules are configured**.

---

## Quick Fix (5 minutes)

### Option 1: PowerShell (Windows)

```powershell
cd C:\Users\citad\OneDrive\Documents\Dating\DatingPlatform\infrastructure\azure
.\deploy-frontdoor-routes.ps1
```

### Option 2: Bash (Linux/Mac)

```bash
cd infrastructure/azure
chmod +x deploy-frontdoor-routes.sh
./deploy-frontdoor-routes.sh
```

### Option 3: Manual Azure CLI

```bash
# Set variables
RESOURCE_GROUP="flamoral-prod-rg"
PROFILE_NAME="flamoral-prod-afd"
ENDPOINT_NAME="flamoral-prod"
ORIGIN_GROUP="flamoral-origin-group"

# Create default route (most important!)
az afd route create \
  --endpoint-name $ENDPOINT_NAME \
  --profile-name $PROFILE_NAME \
  --resource-group $RESOURCE_GROUP \
  --route-name default-route \
  --origin-group $ORIGIN_GROUP \
  --supported-protocols Http Https \
  --patterns-to-match "/*" \
  --forwarding-protocol HttpsOnly \
  --https-redirect Enabled \
  --enable-caching true
```

---

## Verify Deployment

```bash
az afd route list \
  --endpoint-name flamoral-prod \
  --profile-name flamoral-prod-afd \
  --resource-group flamoral-prod-rg \
  --output table
```

**Expected Output:**
```
Name              PatternsToMatch    ForwardingProtocol
----------------  -----------------  -------------------
default-route     ["/*"]             HttpsOnly
api-route         ["/api/*"]         HttpsOnly
websocket-route   ["/ws/*"]          HttpsOnly
static-route      ["/static/*"]      HttpsOnly
media-route       ["/media/*"]       HttpsOnly
health-route      ["/health"]        HttpsOnly
```

---

## Test Front Door

```bash
curl -I https://flamoral-prod-andtbkagfve5h5da.z01.azurefd.net
```

**Before routing rules:**
```
HTTP/1.1 404 Not Found
X-Cache: CONFIG_NOCACHE
```

**After routing rules (but before AKS deployment):**
```
HTTP/1.1 503 Service Unavailable
X-Azure-Ref: ...
```

**After AKS deployment:**
```
HTTP/1.1 200 OK
```

---

## Next Steps

1. ✅ **Deploy routing rules** (this guide)
2. ⏳ **Deploy AKS cluster** (infrastructure/terraform/environments/prod)
3. ⏳ **Deploy backend application** (kubectl apply)
4. ⏳ **Add custom domain** (flamoral.com)
5. ⏳ **Update DNS records**

---

## Routes Created

| Route | Pattern | Purpose | Caching |
|-------|---------|---------|---------|
| **default-route** | `/*` | All web traffic | Yes (filtered) |
| **api-route** | `/api/*`, `/graphql` | API calls | Yes (query string) |
| **websocket-route** | `/ws/*`, `/socket.io/*` | Real-time | No |
| **static-route** | `/static/*`, `/assets/*` | CSS, JS | Yes (aggressive) |
| **media-route** | `/media/*`, `/uploads/*` | Images, videos | Yes (no compress) |
| **health-route** | `/health`, `/healthz` | Health checks | No |

---

## Important Notes

⚠️ **Routes alone won't fix 404 errors if:**
- AKS cluster is not deployed
- Ingress controller is not running
- Backend application is not responding

✅ **Routes will be ready when:**
- AKS cluster is deployed
- Origin responds to health probe
- Backend services are running

---

## Files

- **Deployment Scripts:**
  - `infrastructure/azure/deploy-frontdoor-routes.sh` (Linux/Mac)
  - `infrastructure/azure/deploy-frontdoor-routes.ps1` (Windows)

- **Terraform Configuration:**
  - `infrastructure/terraform/environments/prod/frontdoor-routes.tf`

- **Documentation:**
  - `infrastructure/azure/FRONTDOOR_ROUTING_GUIDE.md` (comprehensive)
  - `infrastructure/azure/FRONTDOOR_QUICK_DEPLOY.md` (this file)

---

## Troubleshooting

### Routes don't appear after deployment

**Check:**
```bash
# Verify Front Door exists
az afd profile show --profile-name flamoral-prod-afd --resource-group flamoral-prod-rg

# Verify endpoint exists
az afd endpoint show --endpoint-name flamoral-prod --profile-name flamoral-prod-afd --resource-group flamoral-prod-rg
```

### Permission denied

**Fix:**
```bash
# Login again
az login

# Set correct subscription
az account set --subscription ebd1613e-fea0-4b6d-8918-7e4de6a71c44
```

### Route already exists

**This is OK!** Routes are already deployed. Verify with:
```bash
az afd route list --endpoint-name flamoral-prod --profile-name flamoral-prod-afd --resource-group flamoral-prod-rg
```

---

## Need Help?

See full documentation: `infrastructure/azure/FRONTDOOR_ROUTING_GUIDE.md`

---

**Status:** Ready to deploy
**Time to deploy:** 5-10 minutes
**Prerequisites:** Azure CLI, logged in, correct subscription
