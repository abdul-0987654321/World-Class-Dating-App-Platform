# Azure Front Door Routing Configuration Guide

**Date:** 2025-12-13
**Project:** Flamoral Dating Platform
**Resource Group:** flamoral-prod-rg
**Front Door Profile:** flamoral-prod-afd

---

## Executive Summary

This document provides comprehensive guidance for configuring Azure Front Door routing rules for flamoral.com. The Front Door instance is currently deployed but returns 404 errors due to missing routing rules. This guide provides both Terraform and Azure CLI methods to deploy the routing configuration.

### Current Status

- **Front Door Profile:** ✅ Deployed (Premium SKU)
- **WAF Policy:** ✅ Active (Prevention mode)
- **Origin Group:** ✅ Configured (flamoral-origin-group)
- **Origin:** ✅ Configured (AKS at flamoral.westus2.cloudapp.azure.com)
- **Routing Rules:** ❌ **MISSING** (causing 404 errors)
- **AKS Backend:** ❌ Not deployed (origin unreachable)

---

## Table of Contents

1. [Overview](#overview)
2. [Routing Rules Architecture](#routing-rules-architecture)
3. [Deployment Methods](#deployment-methods)
4. [Terraform Configuration](#terraform-configuration)
5. [Azure CLI Deployment](#azure-cli-deployment)
6. [Route Details](#route-details)
7. [Testing and Verification](#testing-and-verification)
8. [Custom Domain Setup](#custom-domain-setup)
9. [Troubleshooting](#troubleshooting)
10. [Next Steps](#next-steps)

---

## Overview

### What Are Routing Rules?

Azure Front Door routing rules define how incoming requests are forwarded to backend origins. Without routing rules, Front Door doesn't know where to send traffic, resulting in 404 errors.

### Why Multiple Routes?

Different types of content require different caching and compression strategies:

- **Web pages:** Cache with compression, ignore tracking parameters
- **API calls:** Minimal caching, respect query strings
- **WebSocket:** No caching, preserve real-time connections
- **Static assets:** Aggressive caching with compression
- **Media files:** Aggressive caching without compression
- **Health checks:** No caching for accurate monitoring

---

## Routing Rules Architecture

### Route Priority and Matching

Routes are evaluated in order of specificity (most specific first):

1. **Health Check Route** (`/health`, `/healthz`, `/ready`, `/live`)
2. **WebSocket Route** (`/ws/*`, `/socket.io/*`, `/signalr/*`)
3. **API Route** (`/api/*`, `/graphql`, `/v1/*`)
4. **Static Assets Route** (`/static/*`, `/assets/*`, `/_next/static/*`)
5. **Media Route** (`/media/*`, `/uploads/*`, `/images/*`, `/videos/*`)
6. **Default Route** (`/*` - catches everything else)

### Traffic Flow Diagram

```
Internet → Azure Front Door → WAF Policy → Route Matching → Origin Group → AKS Origin
                                              ↓
                          ┌──────────────────┴──────────────────┐
                          │                                     │
                    Specific Routes                      Default Route
                    (API, WS, Static)                      (/* all)
                          │                                     │
                          └──────────────→ AKS ←───────────────┘
                                    (flamoral.westus2.cloudapp.azure.com)
```

---

## Deployment Methods

### Option 1: Azure CLI (Immediate Deployment)

**Best for:** Quick deployment, testing, immediate results

**Advantages:**
- Deploy in minutes
- No Terraform state required
- Easy to test and rollback individual routes

**Files:**
- `infrastructure/azure/deploy-frontdoor-routes.sh` (Linux/Mac)
- `infrastructure/azure/deploy-frontdoor-routes.ps1` (Windows)

### Option 2: Terraform (Infrastructure as Code)

**Best for:** Production deployments, version control, team collaboration

**Advantages:**
- Infrastructure as code
- Version controlled
- Reproducible deployments
- Easy to manage in CI/CD

**Files:**
- `infrastructure/terraform/environments/prod/frontdoor-routes.tf`
- `infrastructure/terraform/modules/frontdoor/routes.tf`

---

## Terraform Configuration

### Location 1: Production Environment

File: `infrastructure/terraform/environments/prod/frontdoor-routes.tf`

This file contains production-specific routing configuration that directly references the main Front Door resources.

### Location 2: Front Door Module

File: `infrastructure/terraform/modules/frontdoor/routes.tf`

This file extends the reusable Front Door module with additional route definitions.

### Deployment Steps

1. **Navigate to production environment:**
   ```bash
   cd infrastructure/terraform/environments/prod
   ```

2. **Initialize Terraform (if not already done):**
   ```bash
   terraform init
   ```

3. **Review planned changes:**
   ```bash
   terraform plan -out=frontdoor-routes.tfplan
   ```

4. **Apply routing configuration:**
   ```bash
   terraform apply frontdoor-routes.tfplan
   ```

5. **Verify routes were created:**
   ```bash
   az afd route list \
     --endpoint-name flamoral-prod \
     --profile-name flamoral-prod-afd \
     --resource-group flamoral-prod-rg \
     --output table
   ```

### Expected Output

```
Name              PatternsToMatch              ForwardingProtocol    Caching
----------------  ---------------------------  -------------------   ---------
default-route     ["/*"]                       HttpsOnly             Yes
api-route         ["/api/*", "/graphql"]       HttpsOnly             Yes
websocket-route   ["/ws/*", "/socket.io/*"]    HttpsOnly             No
static-route      ["/static/*", "/assets/*"]   HttpsOnly             Yes
media-route       ["/media/*", "/uploads/*"]   HttpsOnly             Yes
health-route      ["/health", "/healthz"]      HttpsOnly             No
```

---

## Azure CLI Deployment

### Prerequisites

1. **Azure CLI installed**
   ```bash
   az --version
   ```

2. **Logged in to Azure**
   ```bash
   az login
   ```

3. **Correct subscription selected**
   ```bash
   az account show
   az account set --subscription "ebd1613e-fea0-4b6d-8918-7e4de6a71c44"
   ```

### Linux/Mac Deployment

```bash
cd infrastructure/azure
chmod +x deploy-frontdoor-routes.sh
./deploy-frontdoor-routes.sh
```

### Windows PowerShell Deployment

```powershell
cd infrastructure\azure
.\deploy-frontdoor-routes.ps1
```

### Script Features

- ✅ Pre-flight checks (Azure CLI, authentication, Front Door exists)
- ✅ Creates all 6 routing rules
- ✅ Handles errors gracefully
- ✅ Verifies deployment at the end
- ✅ Provides clear status messages

### Expected Output

```
[INFO] Starting Azure Front Door routing rules deployment...
[INFO] Resource Group: flamoral-prod-rg
[INFO] Front Door Profile: flamoral-prod-afd
[INFO] Endpoint: flamoral-prod

[INFO] Checking Azure CLI authentication...
[INFO] Authentication confirmed.

[INFO] Verifying Front Door profile exists...
[INFO] Front Door profile verified.

[INFO] Creating default route for all web traffic (/*) ...
[INFO] Default route created successfully.

[INFO] Creating API route for /api/* and /graphql ...
[INFO] API route created successfully.

...

[INFO] Deployment complete! Verifying routes...
[INFO] ====================================================================
[INFO] Azure Front Door routing rules deployed successfully!
[INFO] ====================================================================
```

---

## Route Details

### 1. Default Route (`/*`)

**Purpose:** Catch-all route for web application traffic

**Configuration:**
- **Patterns:** `/*`
- **Protocols:** HTTP, HTTPS (HTTP redirects to HTTPS)
- **Caching:** Enabled with query string filtering
- **Compression:** Enabled for text-based content
- **Ignored Parameters:** `utm_source`, `utm_medium`, `utm_campaign`, `fbclid`, `gclid`

**Use Cases:**
- Main web application pages
- React/Next.js application routes
- All traffic not matching specific routes

### 2. API Route (`/api/*`, `/graphql`, `/v1/*`)

**Purpose:** Backend API traffic with dynamic content

**Configuration:**
- **Patterns:** `/api/*`, `/graphql`, `/v1/*`
- **Protocols:** HTTP, HTTPS (HTTP redirects to HTTPS)
- **Caching:** Enabled with query string consideration
- **Compression:** Enabled for JSON/XML
- **Query Strings:** Included in cache key

**Use Cases:**
- REST API endpoints
- GraphQL queries
- API versioned endpoints

### 3. WebSocket Route (`/ws/*`, `/socket.io/*`, `/signalr/*`)

**Purpose:** Real-time bidirectional communication

**Configuration:**
- **Patterns:** `/ws/*`, `/socket.io/*`, `/signalr/*`, `/realtime/*`
- **Protocols:** HTTP, HTTPS (HTTP redirects to HTTPS)
- **Caching:** Disabled (real-time connections)
- **Compression:** N/A

**Use Cases:**
- WebSocket connections
- Socket.IO real-time messaging
- SignalR notifications
- Live chat features

### 4. Static Assets Route (`/static/*`, `/assets/*`, `/_next/static/*`)

**Purpose:** CSS, JavaScript, fonts with aggressive caching

**Configuration:**
- **Patterns:** `/static/*`, `/assets/*`, `/_next/static/*`, `/fonts/*`
- **Protocols:** HTTP, HTTPS (HTTP redirects to HTTPS)
- **Caching:** Aggressive (ignore all query strings)
- **Compression:** Enabled for CSS/JS/fonts

**Use Cases:**
- CSS stylesheets
- JavaScript bundles
- Web fonts
- Next.js static assets

### 5. Media Route (`/media/*`, `/uploads/*`, `/images/*`, `/videos/*`)

**Purpose:** Large files (images, videos) without compression

**Configuration:**
- **Patterns:** `/media/*`, `/uploads/*`, `/images/*`, `/videos/*`
- **Protocols:** HTTP, HTTPS (HTTP redirects to HTTPS)
- **Caching:** Aggressive (ignore all query strings)
- **Compression:** Disabled (media already compressed)

**Use Cases:**
- User profile images
- Uploaded photos
- Video content
- Media streaming

### 6. Health Check Route (`/health`, `/healthz`, `/ready`, `/live`)

**Purpose:** Monitoring endpoints for health probes

**Configuration:**
- **Patterns:** `/health`, `/health/*`, `/healthz`, `/ready`, `/live`
- **Protocols:** HTTP, HTTPS (HTTP redirects to HTTPS)
- **Caching:** Disabled (real-time health status)
- **Compression:** N/A

**Use Cases:**
- Azure Front Door health probes
- Kubernetes liveness/readiness probes
- External monitoring services

---

## Testing and Verification

### 1. List All Routes

```bash
az afd route list \
  --endpoint-name flamoral-prod \
  --profile-name flamoral-prod-afd \
  --resource-group flamoral-prod-rg \
  --output table
```

### 2. Test Front Door Endpoint

**Note:** These tests will fail until AKS backend is deployed

```bash
# Test default route
curl -I https://flamoral-prod-andtbkagfve5h5da.z01.azurefd.net

# Test API route
curl -I https://flamoral-prod-andtbkagfve5h5da.z01.azurefd.net/api/health

# Test health check
curl -I https://flamoral-prod-andtbkagfve5h5da.z01.azurefd.net/health
```

**Expected Response (before AKS deployment):**
```
HTTP/1.1 503 Service Unavailable
X-Azure-Ref: ...
X-Cache: CONFIG_NOCACHE
```

**Expected Response (after AKS deployment):**
```
HTTP/1.1 200 OK
X-Azure-Ref: ...
X-Cache: TCP_MISS
```

### 3. Verify Route Configuration

```bash
# Get detailed route information
az afd route show \
  --endpoint-name flamoral-prod \
  --profile-name flamoral-prod-afd \
  --resource-group flamoral-prod-rg \
  --route-name default-route \
  --output json
```

### 4. Check Origin Health

```bash
# This will timeout until AKS is deployed
curl -I https://flamoral.westus2.cloudapp.azure.com/health --max-time 10
```

---

## Custom Domain Setup

Once routing rules are deployed and the AKS backend is healthy, add custom domain:

### 1. Add Custom Domain to Front Door

```bash
# Add flamoral.com
az afd custom-domain create \
  --profile-name flamoral-prod-afd \
  --resource-group flamoral-prod-rg \
  --custom-domain-name flamoral-com \
  --host-name flamoral.com \
  --minimum-tls-version TLS12 \
  --certificate-type ManagedCertificate

# Add www.flamoral.com
az afd custom-domain create \
  --profile-name flamoral-prod-afd \
  --resource-group flamoral-prod-rg \
  --custom-domain-name www-flamoral-com \
  --host-name www.flamoral.com \
  --minimum-tls-version TLS12 \
  --certificate-type ManagedCertificate
```

### 2. Get Validation Token

```bash
az afd custom-domain show \
  --profile-name flamoral-prod-afd \
  --resource-group flamoral-prod-rg \
  --custom-domain-name flamoral-com \
  --query "validationProperties.validationToken" \
  --output tsv
```

### 3. Add DNS TXT Record

Add a TXT record at your domain registrar:

- **Name:** `_dnsauth.flamoral.com`
- **Value:** `[validation-token-from-step-2]`
- **TTL:** 3600

### 4. Associate Domain with Routes

```bash
az afd route update \
  --endpoint-name flamoral-prod \
  --profile-name flamoral-prod-afd \
  --resource-group flamoral-prod-rg \
  --route-name default-route \
  --custom-domains flamoral-com www-flamoral-com
```

### 5. Update DNS CNAME Records

Point your domain to Front Door:

- **Name:** `flamoral.com` → **Type:** A → **Value:** Front Door IP (or use CNAME to endpoint)
- **Name:** `www.flamoral.com` → **Type:** CNAME → **Value:** `flamoral-prod-andtbkagfve5h5da.z01.azurefd.net`

---

## Troubleshooting

### Issue: 404 Not Found

**Symptoms:**
```
HTTP/1.1 404 Not Found
X-Cache: CONFIG_NOCACHE
```

**Causes:**
1. No routing rules configured
2. Routes not yet propagated

**Solution:**
1. Deploy routing rules using this guide
2. Wait 5-10 minutes for propagation
3. Verify routes exist: `az afd route list ...`

### Issue: 503 Service Unavailable

**Symptoms:**
```
HTTP/1.1 503 Service Unavailable
X-Azure-Ref: ...
```

**Causes:**
1. Origin (AKS) not deployed
2. Origin unhealthy
3. Health probe failing

**Solution:**
1. Deploy AKS cluster
2. Verify origin responds: `curl https://flamoral.westus2.cloudapp.azure.com/health`
3. Check origin health in Azure Portal

### Issue: Routes Not Created

**Symptoms:**
- Script runs but routes don't appear
- `az afd route list` returns empty array

**Causes:**
1. Incorrect resource names
2. Insufficient permissions
3. Front Door in wrong state

**Solution:**
1. Verify resource group name: `flamoral-prod-rg`
2. Verify Front Door name: `flamoral-prod-afd`
3. Verify endpoint name: `flamoral-prod`
4. Check Azure RBAC permissions: `Contributor` or `Front Door Contributor`

### Issue: Route Already Exists

**Symptoms:**
```
(RouteAlreadyExists) The route 'default-route' already exists.
```

**Solution:**
This is expected if re-running the script. Routes are already deployed. Verify:
```bash
az afd route list --endpoint-name flamoral-prod --profile-name flamoral-prod-afd --resource-group flamoral-prod-rg
```

---

## Next Steps

### 1. Deploy AKS Cluster (CRITICAL)

The AKS cluster must be deployed for Front Door to function:

```bash
cd infrastructure/terraform/environments/prod
terraform apply
```

### 2. Deploy Ingress Controller

Install NGINX ingress controller in AKS:

```bash
kubectl apply -f infrastructure/kubernetes/base/ingress.yaml
```

### 3. Verify Origin Health

Test the origin endpoint:

```bash
curl https://flamoral.westus2.cloudapp.azure.com/health
```

Expected response:
```json
{"status": "healthy", "timestamp": "2025-12-13T..."}
```

### 4. Deploy Backend Application

Deploy application services to AKS:

```bash
kubectl apply -f infrastructure/kubernetes/services/
```

### 5. Test Front Door End-to-End

```bash
# Test via Front Door
curl https://flamoral-prod-andtbkagfve5h5da.z01.azurefd.net

# Should return 200 OK with application content
```

### 6. Add Custom Domain

Follow the [Custom Domain Setup](#custom-domain-setup) section to configure flamoral.com.

### 7. Update DNS Records

Point flamoral.com to Front Door endpoint.

### 8. Monitor and Optimize

- Review Front Door analytics in Azure Portal
- Check cache hit ratios
- Optimize caching rules based on usage patterns
- Monitor WAF blocked requests

---

## Architecture Overview

### Complete Traffic Flow

```
User Browser
    ↓
DNS Resolution (flamoral.com)
    ↓
Azure Front Door (Global)
    ├── WAF Policy (Prevention Mode)
    │   ├── OWASP Rules
    │   ├── Bot Protection
    │   └── Custom Rules
    ↓
Route Matching
    ├── /health       → Health Route (no cache)
    ├── /ws/*         → WebSocket Route (no cache)
    ├── /api/*        → API Route (query string cache)
    ├── /static/*     → Static Route (aggressive cache)
    ├── /media/*      → Media Route (aggressive cache, no compression)
    └── /*            → Default Route (filtered cache)
    ↓
Origin Group (flamoral-origin-group)
    ├── Health Probe: HTTPS HEAD /health every 30s
    ├── Load Balancing: 4 samples, 3 required
    └── Session Affinity: Enabled
    ↓
AKS Origin (flamoral.westus2.cloudapp.azure.com)
    ├── Public IP: 48.200.65.15 (reserved)
    ├── FQDN: flamoral.westus2.cloudapp.azure.com
    ├── SSL: Yes (certificate name check enabled)
    └── Host Header: flamoral.com
    ↓
NGINX Ingress Controller
    ↓
Kubernetes Services
    ├── Web Application (React/Next.js)
    ├── API Backend (Node.js)
    ├── WebSocket Server (Socket.IO)
    └── Health Endpoint
```

---

## Resource References

### Azure Resources

- **Resource Group:** `flamoral-prod-rg`
- **Front Door Profile:** `flamoral-prod-afd`
- **Front Door Endpoint:** `flamoral-prod`
- **Origin Group:** `flamoral-origin-group`
- **Origin:** `flamoral-aks-origin`
- **WAF Policy:** `flamoralprodwaf`
- **Public IP:** `flamoral-prod-ingress-pip` (48.200.65.15)

### Endpoints

- **Front Door:** https://flamoral-prod-andtbkagfve5h5da.z01.azurefd.net
- **Origin:** https://flamoral.westus2.cloudapp.azure.com
- **Custom Domain:** https://flamoral.com (pending setup)

### Files Created

1. **Terraform Configuration:**
   - `infrastructure/terraform/environments/prod/frontdoor-routes.tf`
   - `infrastructure/terraform/modules/frontdoor/routes.tf`

2. **Deployment Scripts:**
   - `infrastructure/azure/deploy-frontdoor-routes.sh` (Bash)
   - `infrastructure/azure/deploy-frontdoor-routes.ps1` (PowerShell)

3. **Documentation:**
   - `infrastructure/azure/FRONTDOOR_ROUTING_GUIDE.md` (this file)

---

## Support and Resources

### Azure Documentation

- [Azure Front Door Overview](https://docs.microsoft.com/azure/frontdoor/)
- [Front Door Routing Architecture](https://docs.microsoft.com/azure/frontdoor/front-door-routing-architecture)
- [Configure Routing Rules](https://docs.microsoft.com/azure/frontdoor/front-door-route-matching)
- [Caching with Front Door](https://docs.microsoft.com/azure/frontdoor/front-door-caching)

### Azure CLI Reference

- [az afd route](https://docs.microsoft.com/cli/azure/afd/route)
- [az afd custom-domain](https://docs.microsoft.com/cli/azure/afd/custom-domain)

### Terraform Provider

- [azurerm_cdn_frontdoor_route](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cdn_frontdoor_route)

---

**Document Version:** 1.0
**Last Updated:** 2025-12-13
**Author:** Infrastructure Team
**Status:** Ready for Deployment
