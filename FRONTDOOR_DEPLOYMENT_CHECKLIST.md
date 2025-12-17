# Azure Front Door Routing - Deployment Checklist

**Project:** Flamoral Dating Platform
**Date:** 2025-12-13
**Task:** Deploy Front Door routing rules to fix 404 errors

---

## Pre-Deployment Checklist

### Environment Setup
- [ ] Azure CLI installed and updated (`az --version`)
- [ ] Logged in to Azure (`az login`)
- [ ] Correct subscription selected (`az account show`)
  - Expected: `ebd1613e-fea0-4b6d-8918-7e4de6a71c44`
- [ ] Sufficient permissions (Contributor or Front Door Contributor role)

### Verify Existing Resources
- [ ] Front Door profile exists: `flamoral-prod-afd`
  ```bash
  az afd profile show --profile-name flamoral-prod-afd --resource-group flamoral-prod-rg
  ```
- [ ] Front Door endpoint exists: `flamoral-prod`
  ```bash
  az afd endpoint show --endpoint-name flamoral-prod --profile-name flamoral-prod-afd --resource-group flamoral-prod-rg
  ```
- [ ] Origin group exists: `flamoral-origin-group`
  ```bash
  az afd origin-group show --origin-group-name flamoral-origin-group --profile-name flamoral-prod-afd --resource-group flamoral-prod-rg
  ```

---

## Deployment Options

### Option A: Azure CLI Script (Fastest - 5 minutes)

**Windows:**
```powershell
cd C:\Users\citad\OneDrive\Documents\Dating\DatingPlatform\infrastructure\azure
.\deploy-frontdoor-routes.ps1
```

**Linux/Mac:**
```bash
cd ~/Documents/Dating/DatingPlatform/infrastructure/azure
chmod +x deploy-frontdoor-routes.sh
./deploy-frontdoor-routes.sh
```

**Checklist:**
- [ ] Script runs without errors
- [ ] All 6 routes created successfully
- [ ] Verification output shows routes in table format

---

### Option B: Terraform (Recommended for Production)

**Steps:**
```bash
cd ~/Documents/Dating/DatingPlatform/infrastructure/terraform/environments/prod
terraform init
terraform plan -out=frontdoor-routes.tfplan
# Review the plan output carefully
terraform apply frontdoor-routes.tfplan
```

**Checklist:**
- [ ] Terraform init completes successfully
- [ ] Terraform plan shows 6 new resources to create
- [ ] No unexpected changes in plan
- [ ] Terraform apply completes without errors
- [ ] All routes created

---

## Post-Deployment Verification

### 1. Verify Routes Created

```bash
az afd route list \
  --endpoint-name flamoral-prod \
  --profile-name flamoral-prod-afd \
  --resource-group flamoral-prod-rg \
  --output table
```

**Expected Output:**
```
Name              PatternsToMatch                    ForwardingProtocol
----------------  ---------------------------------  -------------------
default-route     ["/*"]                             HttpsOnly
api-route         ["/api/*", "/graphql", "/v1/*"]    HttpsOnly
websocket-route   ["/ws/*", "/socket.io/*"]          HttpsOnly
static-route      ["/static/*", "/assets/*"]         HttpsOnly
media-route       ["/media/*", "/uploads/*"]         HttpsOnly
health-route      ["/health", "/healthz"]            HttpsOnly
```

**Checklist:**
- [ ] 6 routes listed
- [ ] All routes show "HttpsOnly" forwarding protocol
- [ ] Route names match expected values

---

### 2. Test Front Door Endpoint

```bash
curl -I https://flamoral-prod-andtbkagfve5h5da.z01.azurefd.net
```

**Before Routes (404 Error):**
```
HTTP/1.1 404 Not Found
X-Cache: CONFIG_NOCACHE
```

**After Routes, Before AKS (503 Error - This is Expected):**
```
HTTP/1.1 503 Service Unavailable
X-Azure-Ref: ...
```

**After Routes and AKS (Success):**
```
HTTP/1.1 200 OK
Content-Type: text/html
```

**Checklist:**
- [ ] Response changes from 404 to 503 (confirms routes working)
- [ ] No 404 errors (confirms routes deployed)

---

### 3. Check Route Details

```bash
# View default route configuration
az afd route show \
  --endpoint-name flamoral-prod \
  --profile-name flamoral-prod-afd \
  --resource-group flamoral-prod-rg \
  --route-name default-route \
  --query "{name:name, patterns:patternsToMatch, https:httpsRedirect, caching:cacheConfiguration}" \
  --output json
```

**Checklist:**
- [ ] Route shows correct patterns
- [ ] HTTPS redirect enabled
- [ ] Caching configuration present

---

### 4. Verify in Azure Portal

1. Navigate to Azure Portal: https://portal.azure.com
2. Go to Resource Group: `flamoral-prod-rg`
3. Open Front Door profile: `flamoral-prod-afd`
4. Click on Endpoints → `flamoral-prod`
5. View Routes section

**Checklist:**
- [ ] 6 routes visible in portal
- [ ] All routes show "Enabled" status
- [ ] Deployment status shows "Succeeded"

---

## Expected Results

### Current State (After Routing Rules Deployed)

| Component | Status | Expected Response |
|-----------|--------|-------------------|
| Front Door Profile | ✅ Active | - |
| WAF Policy | ✅ Active | - |
| Routing Rules | ✅ **Deployed** | - |
| Front Door Endpoint | ⚠️ Responds | 503 Service Unavailable |
| Origin (AKS) | ❌ Not Deployed | Connection timeout |
| Custom Domain | ❌ Not Configured | - |

### Why 503 Instead of 200?

**503 Service Unavailable** is expected because:
- ✅ Routing rules are working correctly
- ✅ Front Door knows where to send traffic
- ❌ **AKS cluster not deployed** - origin unreachable
- ❌ Backend application not running

**This confirms routing rules are working!** The next step is deploying the AKS cluster.

---

## Troubleshooting

### Issue: Permission Denied

**Error:**
```
ERROR: (AuthorizationFailed) The client does not have authorization...
```

**Fix:**
```bash
# Verify logged in account
az account show

# Re-login if needed
az login

# Verify subscription
az account set --subscription ebd1613e-fea0-4b6d-8918-7e4de6a71c44
```

**Checklist:**
- [ ] Logged in with correct account
- [ ] Correct subscription selected
- [ ] User has Contributor role on resource group

---

### Issue: Route Already Exists

**Error:**
```
(RouteAlreadyExists) The route 'default-route' already exists.
```

**This is OK!** Routes are already deployed.

**Verify:**
```bash
az afd route list --endpoint-name flamoral-prod --profile-name flamoral-prod-afd --resource-group flamoral-prod-rg
```

**Checklist:**
- [ ] All 6 routes listed
- [ ] Routes match expected configuration

---

### Issue: Front Door Profile Not Found

**Error:**
```
(ResourceNotFound) The resource 'flamoral-prod-afd' was not found.
```

**Fix:**
```bash
# Verify resource group exists
az group show --name flamoral-prod-rg

# List all Front Door profiles
az afd profile list --resource-group flamoral-prod-rg --output table

# Check for typos in resource names
```

**Checklist:**
- [ ] Resource group exists
- [ ] Front Door profile name is correct
- [ ] Resource names match exactly (case-sensitive)

---

## Next Steps

### Immediate Next Steps (After Routes Deployed)

1. **Deploy AKS Cluster**
   ```bash
   cd infrastructure/terraform/environments/prod
   terraform init
   terraform plan
   terraform apply
   ```
   **Time:** 30-45 minutes

2. **Deploy Ingress Controller**
   ```bash
   kubectl apply -f infrastructure/kubernetes/base/ingress.yaml
   ```
   **Time:** 15-30 minutes

3. **Deploy Backend Application**
   ```bash
   kubectl apply -f infrastructure/kubernetes/services/
   ```
   **Time:** Variable

4. **Verify Origin Health**
   ```bash
   curl https://flamoral.westus2.cloudapp.azure.com/health
   ```
   **Expected:** `{"status": "healthy"}`

5. **Test Front Door End-to-End**
   ```bash
   curl https://flamoral-prod-andtbkagfve5h5da.z01.azurefd.net
   ```
   **Expected:** HTTP 200 OK

---

## Success Criteria

### Phase 1: Routing Rules (This Checklist)

- [x] All configuration files created
- [ ] Pre-deployment checks passed
- [ ] Deployment method selected (CLI or Terraform)
- [ ] 6 routing rules deployed successfully
- [ ] Routes verified in Azure CLI
- [ ] Routes verified in Azure Portal
- [ ] Front Door returns 503 (not 404)
- [ ] Documentation reviewed

### Phase 2: AKS Deployment (Next Task)

- [ ] AKS cluster deployed
- [ ] Ingress controller configured
- [ ] Public IP associated
- [ ] Origin responds to health probe
- [ ] Front Door returns 200 OK

### Phase 3: Production Ready (Final Goal)

- [ ] Custom domain added (flamoral.com)
- [ ] DNS records updated
- [ ] HTTPS certificate provisioned
- [ ] End-to-end testing complete
- [ ] Production traffic flowing

---

## Files Reference

### Created Files (This Task)

**Deployment Scripts:**
- `DatingPlatform/infrastructure/azure/deploy-frontdoor-routes.sh` (Bash)
- `DatingPlatform/infrastructure/azure/deploy-frontdoor-routes.ps1` (PowerShell)

**Terraform Configuration:**
- `DatingPlatform/infrastructure/terraform/environments/prod/frontdoor-routes.tf`
- `DatingPlatform/infrastructure/terraform/modules/frontdoor/routes.tf`

**Documentation:**
- `DatingPlatform/infrastructure/azure/FRONTDOOR_ROUTING_GUIDE.md` (Comprehensive)
- `DatingPlatform/infrastructure/azure/FRONTDOOR_QUICK_DEPLOY.md` (Quick reference)
- `DatingPlatform/infrastructure/azure/README.md` (Directory guide)
- `FRONTDOOR_ROUTING_DEPLOYMENT_SUMMARY.md` (Project summary)
- `FRONTDOOR_DEPLOYMENT_CHECKLIST.md` (This file)

---

## Quick Command Reference

### Deploy Routes (PowerShell)
```powershell
cd C:\Users\citad\OneDrive\Documents\Dating\DatingPlatform\infrastructure\azure
.\deploy-frontdoor-routes.ps1
```

### Deploy Routes (Bash)
```bash
cd ~/Documents/Dating/DatingPlatform/infrastructure/azure
./deploy-frontdoor-routes.sh
```

### Verify Routes
```bash
az afd route list --endpoint-name flamoral-prod --profile-name flamoral-prod-afd --resource-group flamoral-prod-rg --output table
```

### Test Endpoint
```bash
curl -I https://flamoral-prod-andtbkagfve5h5da.z01.azurefd.net
```

### Check Origin
```bash
curl -I https://flamoral.westus2.cloudapp.azure.com/health --max-time 10
```

---

## Support Resources

- **Comprehensive Guide:** `DatingPlatform/infrastructure/azure/FRONTDOOR_ROUTING_GUIDE.md`
- **Quick Reference:** `DatingPlatform/infrastructure/azure/FRONTDOOR_QUICK_DEPLOY.md`
- **Azure Front Door Docs:** https://docs.microsoft.com/azure/frontdoor/
- **Azure CLI Reference:** https://docs.microsoft.com/cli/azure/afd

---

**Checklist Version:** 1.0
**Last Updated:** 2025-12-13
**Status:** Ready for deployment
**Estimated Time:** 5-10 minutes
