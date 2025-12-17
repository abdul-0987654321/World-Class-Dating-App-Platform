# Azure Front Door Configuration Analysis for flamoral.com

**Analysis Date:** 2025-12-13
**Resource Group:** flamoral-prod-rg
**Front Door Profile:** flamoral-prod-afd (Premium SKU)

---

## Executive Summary

The Azure Front Door is properly configured but **NOT FUNCTIONAL** due to the origin (AKS cluster) not being deployed. The Front Door returns a 404 error because there are no routing rules configured, and even if routes existed, the origin backend is unreachable.

**Key Issues:**
1. **CRITICAL:** No routing rules configured - Front Door has no routes defined
2. **CRITICAL:** Origin backend (AKS) is not deployed - nothing responding at flamoral.westus2.cloudapp.azure.com
3. **WARNING:** Deployment status shows "NotStarted" for endpoint and origin group
4. **INFO:** No custom domain (flamoral.com) configured yet

---

## 1. Front Door Profile Status

**Profile Details:**
- Name: `flamoral-prod-afd`
- SKU: `Premium_AzureFrontDoor`
- Location: Global
- Provisioning State: `Succeeded`
- Resource State: `Active`
- Front Door ID: `4b0288b6-00f4-447f-858c-39ad8e91dfa3`
- Origin Response Timeout: 120 seconds

**Status:** HEALTHY - Profile is active and provisioned

---

## 2. Endpoint Configuration

**Endpoint Details:**
- Name: `flamoral-prod`
- Hostname: `flamoral-prod-andtbkagfve5h5da.z01.azurefd.net`
- Enabled State: `Enabled`
- Provisioning State: `Succeeded`
- Deployment Status: `NotStarted` ⚠️

**Status:** CONFIGURED BUT NOT DEPLOYED

**Test Results:**
```
$ curl -I https://flamoral-prod-andtbkagfve5h5da.z01.azurefd.net
HTTP/1.1 404 Not Found
X-Cache: CONFIG_NOCACHE
```

The endpoint responds but returns 404 because:
1. No routing rules are configured
2. No default route to origin group

---

## 3. Origin Group Configuration

**Origin Group Details:**
- Name: `flamoral-origin-group`
- Provisioning State: `Succeeded`
- Deployment Status: `NotStarted` ⚠️
- Session Affinity: `Enabled`
- Traffic Restoration Time: 10 minutes

**Health Probe Settings:**
- Probe Path: `/health`
- Probe Protocol: `HTTPS`
- Probe Request Type: `HEAD`
- Probe Interval: 30 seconds

**Load Balancing Settings:**
- Additional Latency: 50ms
- Sample Size: 4
- Successful Samples Required: 3

**Status:** CONFIGURED BUT ORIGIN UNREACHABLE

---

## 4. Origin Configuration

**Origin Details:**
- Name: `flamoral-aks-origin`
- Hostname: `flamoral.westus2.cloudapp.azure.com`
- IP Address: `4.155.106.208`
- HTTP Port: 80
- HTTPS Port: 443
- Enabled State: `Enabled`
- Priority: 1
- Weight: 1000
- Origin Host Header: `flamoral.com`
- Enforce Certificate Name Check: `true`
- Deployment Status: `NotStarted` ⚠️

**Public IP Details:**
- Name: `flamoral-prod-ingress-pip`
- IP Address: `4.155.106.208`
- FQDN: `flamoral.westus2.cloudapp.azure.com`
- Allocation: Static
- SKU: Standard

**Origin Connectivity Test:**
```bash
# HTTPS Health Check
$ curl -I https://flamoral.westus2.cloudapp.azure.com/health --max-time 10
curl: (28) Connection timed out after 10011 milliseconds

# HTTP Test
$ curl -I http://flamoral.westus2.cloudapp.azure.com --max-time 10
curl: (28) Connection timed out after 10016 milliseconds
```

**Status:** CRITICAL - ORIGIN UNREACHABLE

**Root Cause:** The public IP exists and resolves correctly, but nothing is listening on ports 80 or 443 because:
- AKS cluster is not deployed
- No ingress controller running
- No backend services available

---

## 5. Routing Rules

**Route Configuration:**
```json
[]
```

**Status:** CRITICAL - NO ROUTES CONFIGURED

**Issue:** Front Door has no routing rules defined. Even if the origin was healthy, there would be no routes to forward traffic.

**Required Routes:**
- Default route (`/*`) to `flamoral-origin-group`
- HTTPS redirect rule (optional)
- Custom routes for specific paths (optional)

---

## 6. WAF Policy Status

**WAF Policy Details:**
- Name: `flamoralprodwaf`
- SKU: `Premium_AzureFrontDoor`
- Location: Global
- Provisioning State: `Succeeded`
- Resource State: `Enabled`
- Mode: `Prevention`

**Policy Settings:**
- Enabled State: `Enabled`
- Mode: `Prevention` (actively blocking threats)
- Custom Block Response: 403 (Access Denied)
- Redirect URL: `https://flamoral.com/blocked`
- Request Body Check: `Enabled`

**Managed Rule Sets:**
1. **DefaultRuleSet v1.0** - Action: Block
2. **Microsoft_BotManagerRuleSet v1.0** - Action: Block

**Custom Rules:** None configured

**Security Policy Association:**
- Policy Name: `flamoral-security-policy`
- Associated Endpoint: `flamoral-prod`
- Patterns to Match: `/*`
- Status: Active

**Status:** HEALTHY - WAF is properly configured and active

---

## 7. Custom Domain Configuration

**Custom Domains:**
```json
[]
```

**Status:** NOT CONFIGURED

**Required Steps:**
1. Add custom domain `flamoral.com` to Front Door
2. Add custom domain `www.flamoral.com` to Front Door
3. Validate domain ownership (DNS TXT record)
4. Enable HTTPS with AFD-managed certificate
5. Update DNS CNAME records to point to Front Door endpoint

---

## 8. Current Issues and Impact

### Critical Issues

1. **No Routing Rules Configured**
   - Impact: Front Door returns 404 for all requests
   - Fix Required: Create route for `/*` pattern to `flamoral-origin-group`

2. **Origin Backend Unreachable**
   - Impact: Even with routes, requests would fail
   - Root Cause: AKS cluster not deployed, no ingress controller
   - Fix Required: Deploy AKS cluster with working ingress

3. **Deployment Status "NotStarted"**
   - Impact: Configuration changes may not be fully propagated
   - Components Affected: Endpoint, origin group, origins, security policy
   - Note: This may auto-resolve when routes are added

### Warnings

4. **No Custom Domain**
   - Impact: Site only accessible via azurefd.net URL
   - Fix Required: Add flamoral.com custom domain

### Configuration Gaps

5. **No Rule Sets**
   - Missing URL rewrite rules
   - Missing redirect rules (HTTP to HTTPS)
   - Missing cache configuration overrides

---

## 9. Recommended Fix Strategy

### Option 1: Deploy AKS First (Recommended)

This is the correct architectural approach:

1. **Deploy AKS Cluster**
   - Deploy production AKS cluster
   - Configure node pools and networking
   - Verify cluster health

2. **Deploy Ingress Controller**
   - Install NGINX ingress controller
   - Associate with public IP `flamoral-prod-ingress-pip` (4.155.106.208)
   - Configure SSL/TLS termination

3. **Deploy Backend Services**
   - Deploy application pods
   - Create ingress resources
   - Implement `/health` endpoint

4. **Verify Origin Health**
   - Test: `curl https://flamoral.westus2.cloudapp.azure.com/health`
   - Should return 200 OK

5. **Configure Front Door Routes**
   ```bash
   az afd route create \
     --endpoint-name flamoral-prod \
     --profile-name flamoral-prod-afd \
     --resource-group flamoral-prod-rg \
     --route-name default-route \
     --origin-group flamoral-origin-group \
     --supported-protocols Https \
     --patterns-to-match "/*" \
     --forwarding-protocol HttpsOnly \
     --https-redirect Enabled
   ```

6. **Add Custom Domain**
   - Add flamoral.com and www.flamoral.com
   - Validate domain ownership
   - Enable AFD-managed certificates

7. **Update DNS**
   - Point CNAME to Front Door endpoint
   - Test end-to-end connectivity

### Option 2: Temporary Maintenance Page (Not Recommended)

Front Door cannot serve static content directly. To show a maintenance page, you would need:

1. **Deploy minimal backend** (Azure App Service or static web app)
2. **Configure as temporary origin**
3. **Add routing rules** to the maintenance page
4. **Switch origin** when AKS is ready

**Drawback:** Requires additional resources and configuration changes

---

## 10. Configuration Commands Reference

### Check Front Door Status
```bash
# Profile status
az afd profile show \
  --profile-name flamoral-prod-afd \
  --resource-group flamoral-prod-rg

# List endpoints
az afd endpoint list \
  --profile-name flamoral-prod-afd \
  --resource-group flamoral-prod-rg

# List origin groups
az afd origin-group list \
  --profile-name flamoral-prod-afd \
  --resource-group flamoral-prod-rg

# List origins
az afd origin list \
  --profile-name flamoral-prod-afd \
  --origin-group-name flamoral-origin-group \
  --resource-group flamoral-prod-rg

# List routes (currently empty)
az afd route list \
  --profile-name flamoral-prod-afd \
  --endpoint-name flamoral-prod \
  --resource-group flamoral-prod-rg

# List security policies
az afd security-policy list \
  --profile-name flamoral-prod-afd \
  --resource-group flamoral-prod-rg
```

### Create Default Route (After AKS is deployed)
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
  --https-redirect Enabled \
  --enable-caching true \
  --query-string-caching-behavior IgnoreQueryString
```

### Add Custom Domain
```bash
# Add domain
az afd custom-domain create \
  --profile-name flamoral-prod-afd \
  --resource-group flamoral-prod-rg \
  --custom-domain-name flamoral-com \
  --host-name flamoral.com \
  --minimum-tls-version TLS12 \
  --certificate-type ManagedCertificate

# Associate domain with endpoint
az afd route update \
  --endpoint-name flamoral-prod \
  --profile-name flamoral-prod-afd \
  --resource-group flamoral-prod-rg \
  --route-name default-route \
  --custom-domains flamoral-com
```

---

## 11. Health Check Requirements

For Front Door to mark the origin as healthy, the backend must:

1. **Respond to:** `HEAD https://flamoral.westus2.cloudapp.azure.com/health`
2. **Return:** HTTP 200 OK
3. **Response Time:** < 30 seconds
4. **Host Header:** `flamoral.com` (as configured in originHostHeader)
5. **SSL Certificate:** Valid certificate (name check enforced)

---

## 12. Next Steps

**Immediate Actions Required:**

1. Deploy AKS cluster infrastructure
2. Deploy and configure NGINX ingress controller
3. Deploy backend application with `/health` endpoint
4. Verify origin health and connectivity
5. Create Front Door routing rules
6. Add custom domain configuration
7. Update DNS records

**Estimated Timeline:**
- AKS deployment: 30-45 minutes
- Ingress configuration: 15-30 minutes
- Application deployment: Variable
- Front Door route creation: 5-10 minutes
- DNS propagation: 5-60 minutes
- Total: 1-3 hours

---

## 13. Current Architecture Diagram

```
Internet
   |
   v
Azure Front Door (Premium)
   |
   +-- Endpoint: flamoral-prod-andtbkagfve5h5da.z01.azurefd.net
   |   Status: Responding with 404
   |   Issue: No routes configured
   |
   +-- WAF Policy: flamoralprodwaf
   |   Status: Active (Prevention mode)
   |
   +-- Origin Group: flamoral-origin-group
   |   |
   |   +-- Health Probe: HTTPS HEAD /health every 30s
   |   |   Status: Failing (origin unreachable)
   |   |
   |   +-- Origin: flamoral-aks-origin
   |       Hostname: flamoral.westus2.cloudapp.azure.com
   |       IP: 4.155.106.208
   |       Status: UNREACHABLE
   |       Issue: AKS not deployed
   |
   v
[AKS CLUSTER NOT DEPLOYED]
   |
   +-- Public IP: flamoral-prod-ingress-pip (4.155.106.208)
   |   Status: Allocated but not in use
   |
   +-- Ingress Controller: NOT DEPLOYED
   |
   +-- Backend Services: NOT DEPLOYED
```

---

## 14. Conclusion

The Azure Front Door configuration is structurally sound with proper WAF protection, but it cannot function without:

1. **Routing rules** to define traffic flow
2. **Working origin backend** (AKS with ingress controller)

The deployment must proceed in this order:
1. Deploy AKS infrastructure
2. Configure and verify origin health
3. Create Front Door routes
4. Add custom domain
5. Update DNS

Until the AKS cluster is deployed and responding, Front Door will continue to return 404 errors. There is no way to serve content from Front Door without a functional backend origin.

**Status:** Configuration complete but non-functional - awaiting AKS deployment
