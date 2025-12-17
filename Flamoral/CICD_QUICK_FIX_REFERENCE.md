# CI/CD QUICK FIX REFERENCE
**Flamoral Dating Platform - Critical Issues & Immediate Actions**

---

## CRITICAL ISSUES (Fix Immediately)

### 1. MISSING DOCKERFILES - ALL BUILDS FAIL
**Status**: ❌ BLOCKS ALL DEPLOYMENTS
**Quick Fix**: Run automated script
```bash
cd /path/to/Flamoral
chmod +x scripts/fix-cicd-pipelines.sh
./scripts/fix-cicd-pipelines.sh
```

### 2. WRONG HELM PATHS - DEPLOYMENTS FAIL
**Status**: ❌ BLOCKS ALL DEPLOYMENTS
**Quick Fix**: Already fixed by script above, or manually:
```bash
# cd-dev.yml, cd-staging.yml, complete-cd-pipeline.yml
# Find: k8s/helm/flamoral
# Replace: infrastructure/helm/flamoral
```

### 3. MISSING GITHUB SECRETS - AUTH FAILS
**Status**: ❌ BLOCKS ALL DEPLOYMENTS
**Quick Fix**: Add these secrets NOW
```
Required Secrets (minimum to start):
- AZURE_CREDENTIALS_DEV
- AZURE_CREDENTIALS_STAGING
- AZURE_CREDENTIALS
- DEV_RESOURCE_GROUP=flamoral-dev-rg
- DEV_AKS_CLUSTER=flamoral-dev-aks
- STAGING_RESOURCE_GROUP=flamoral-staging-rg
- STAGING_AKS_CLUSTER=flamoral-staging-aks
- PROD_RESOURCE_GROUP=flamoral-prod-rg
- PROD_AKS_CLUSTER=flamoral-prod-aks
```

**Add via**: GitHub Repo → Settings → Secrets → Actions → New secret

---

## ONE-COMMAND FIX

```bash
# From project root, run this:
chmod +x scripts/fix-cicd-pipelines.sh && ./scripts/fix-cicd-pipelines.sh
```

This will:
- ✅ Fix all path references
- ✅ Create all missing Dockerfiles
- ✅ Create .dockerignore files
- ✅ Create Azure DevOps templates
- ✅ Validate configuration

---

## MANUAL FIX (If Script Fails)

### Fix #1: Create Dockerfile Template
Save this as `backend/services/YOUR-SERVICE/Dockerfile`:

```dockerfile
FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY src/ ./src/
RUN npm run build || npx tsc

FROM node:20-alpine AS production
RUN apk add --no-cache dumb-init
RUN addgroup -g 1000 nodejs && adduser -u 1000 -G nodejs -s /bin/sh -D nodejs
WORKDIR /app
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules
USER nodejs
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
```

**Change PORT for each service**:
- api-gateway: 3000
- auth-service: 3001
- user-service: 3002
- (etc., see full guide)

### Fix #2: Update Workflow Paths
In `.github/workflows/*.yml` files:
```yaml
# FIND ALL INSTANCES OF:
./k8s/helm/flamoral

# REPLACE WITH:
./infrastructure/helm/flamoral
```

Files to update:
- cd-dev.yml
- cd-staging.yml
- complete-cd-pipeline.yml

### Fix #3: Configure Azure Credentials
```bash
# Create service principal
az ad sp create-for-rbac \
  --name "flamoral-github-actions-dev" \
  --role contributor \
  --scopes /subscriptions/YOUR-SUB-ID/resourceGroups/flamoral-dev-rg \
  --sdk-auth

# Copy the JSON output
# Go to GitHub → Settings → Secrets → Actions
# Create secret: AZURE_CREDENTIALS_DEV
# Paste the JSON
```

Repeat for staging and production.

---

## VERIFICATION COMMANDS

```bash
# 1. Check Dockerfiles exist
ls backend/services/*/Dockerfile

# 2. Validate Helm charts
helm lint infrastructure/helm/flamoral

# 3. Test Docker build locally
cd backend/services/auth-service
docker build -t test-auth .

# 4. Verify paths in workflows
grep -r "k8s/helm" .github/workflows/
# Should return NOTHING (all should be fixed)

# 5. Check secrets configured
gh secret list  # Requires GitHub CLI
```

---

## TESTING THE FIX

### Test Locally
```bash
# Build a service Docker image
cd backend/services/api-gateway
docker build -t flamoral/api-gateway:test .
docker run -p 3000:3000 flamoral/api-gateway:test

# Visit: http://localhost:3000/health
```

### Test in CI
```bash
# Push to develop branch
git checkout develop
git add .
git commit -m "fix: CI/CD pipeline configuration"
git push origin develop

# Watch the build
# Go to: https://github.com/YOUR-ORG/flamoral/actions
```

---

## PRIORITY ORDER

1. **FIRST** - Run the automated fix script (5 minutes)
2. **SECOND** - Configure GitHub secrets (15 minutes)
3. **THIRD** - Test development deployment (30 minutes)
4. **FOURTH** - Review full guide for optimizations (1 hour)

---

## COMMON ERRORS & FIXES

### "Dockerfile not found"
```bash
# Ensure you ran the script
./scripts/fix-cicd-pipelines.sh

# Or create manually for each service
```

### "Unable to access ACR"
```bash
# Check ACR exists
az acr list --query "[].{Name:name, LoginServer:loginServer}"

# Test login
az acr login --name flamoraldevacr
```

### "Namespace not found"
```bash
# Create namespace
kubectl create namespace flamoral-dev
kubectl create namespace flamoral-staging
kubectl create namespace flamoral-prod
```

### "Helm chart not found"
```bash
# Verify path
ls infrastructure/helm/flamoral/Chart.yaml

# Should exist. If not, check your working directory
```

---

## SUCCESS INDICATORS

✅ **All fixed when you see**:
- All Dockerfile files exist in service directories
- No references to `k8s/helm/` in workflow files
- All GitHub secrets configured
- CI pipeline runs without "file not found" errors
- Docker images push to ACR successfully
- Helm deployments succeed

---

## EMERGENCY CONTACTS

**DevOps Team**: devops@flamoral.com
**Platform Team**: platform@flamoral.com
**Emergency Hotline**: +1-555-FLAMORAL

---

## FULL DOCUMENTATION

For complete details, troubleshooting, and advanced configuration:
📖 **See**: `CICD_PIPELINE_FIX_GUIDE.md`

---

**Last Updated**: 2025-12-15
**Quick Reference Version**: 1.0
