# CI/CD Pipeline Fixes - Flamoral Dating Platform

## Executive Summary

This document outlines all required fixes to the CI/CD pipeline workflows to support all services including the 4 new services (policy-service, advertising-service, automation-service, workflow-engine) and AI services.

## Services Inventory

### Standard Backend Services (16 total)
Located in `backend/services/`:

1. api-gateway ✓
2. auth-service ✓
3. user-service ✓
4. matching-service ✓
5. messaging-service ✓
6. media-service ✓
7. payment-service ✓
8. notification-service ✓
9. analytics-service ✓
10. moderation-service ✓
11. realtime-service ✓
12. admin-service ✓
13. **policy-service** ⚠️ MISSING FROM WORKFLOWS
14. **advertising-service** ⚠️ MISSING FROM WORKFLOWS
15. **automation-service** ⚠️ MISSING FROM WORKFLOWS
16. **workflow-engine** ⚠️ MISSING FROM WORKFLOWS

### AI Services (6 total)
Located in `backend/services/ai-services/`:

1. content-generator
2. dating-coach-service
3. fraud-detection
4. nlp-service
5. photo-analysis
6. recommendation-service

## Files Requiring Updates

### 1. build-acr-pipeline.yml
**Location:** `.github/workflows/build-acr-pipeline.yml`

**Issues:**
- Service discovery doesn't handle AI services subdirectory
- Default fallback list missing 4 new services
- Dockerfile detection doesn't handle `ai-services/` paths

**Required Changes:**

#### Change 1: Update Service Discovery (Lines 82-100)
Replace the service discovery logic to handle ai-services subdirectory:

```yaml
# OLD (Lines 82-90):
for dir in backend/services/*; do
  if [ -d "$dir" ]; then
    SERVICE_NAME=$(basename "$dir")
    if [ -f "$dir/Dockerfile" ] || [ -f "backend/Dockerfile.$SERVICE_NAME" ]; then
      SERVICES+=("$SERVICE_NAME")
    fi
  fi
done

# NEW:
# Check for Dockerfiles in standard backend/services locations
for dir in backend/services/*; do
  if [ -d "$dir" ] && [ "$(basename "$dir")" != "ai-services" ] && [ "$(basename "$dir")" != "shared" ]; then
    SERVICE_NAME=$(basename "$dir")
    if [ -f "$dir/Dockerfile" ] || [ -f "backend/Dockerfile.$SERVICE_NAME" ]; then
      SERVICES+=("$SERVICE_NAME")
    fi
  fi
done

# Check for AI services (nested in ai-services subdirectory)
if [ -d "backend/services/ai-services" ]; then
  for dir in backend/services/ai-services/*; do
    if [ -d "$dir" ] && [ "$(basename "$dir")" != "ml-infrastructure" ]; then
      SERVICE_NAME=$(basename "$dir")
      if [ -f "$dir/Dockerfile" ]; then
        SERVICES+=("ai-services/$SERVICE_NAME")
      fi
    fi
  done
fi
```

#### Change 2: Update Default Service List (Lines 117-119)
```yaml
# OLD:
if [ ${#SERVICES[@]} -eq 0 ]; then
  SERVICES=("api-gateway" "auth-service" "user-service" "matching-service" "messaging-service" "media-service" "payment-service" "notification-service")
fi

# NEW:
if [ ${#SERVICES[@]} -eq 0 ]; then
  SERVICES=(
    "api-gateway"
    "auth-service"
    "user-service"
    "matching-service"
    "messaging-service"
    "media-service"
    "payment-service"
    "notification-service"
    "analytics-service"
    "moderation-service"
    "realtime-service"
    "admin-service"
    "policy-service"
    "advertising-service"
    "automation-service"
    "workflow-engine"
  )
fi
```

#### Change 3: Update Dockerfile Detection Logic (Lines 155-177)
```yaml
# OLD:
SERVICE="${{ matrix.service }}"

# Check various Dockerfile locations
if [ -f "backend/services/$SERVICE/Dockerfile" ]; then
  DOCKERFILE="backend/services/$SERVICE/Dockerfile"
  CONTEXT="backend/services/$SERVICE"
elif [ -f "Dockerfile.$SERVICE" ]; then
  DOCKERFILE="Dockerfile.$SERVICE"
  CONTEXT="."
...

# NEW:
SERVICE="${{ matrix.service }}"

# Check for AI services (contain slash in name)
if [[ "$SERVICE" == *"/"* ]]; then
  # AI service path: backend/services/ai-services/service-name
  if [ -f "backend/services/$SERVICE/Dockerfile" ]; then
    DOCKERFILE="backend/services/$SERVICE/Dockerfile"
    CONTEXT="backend/services/$SERVICE"
  else
    echo "No Dockerfile found for AI service $SERVICE"
    echo "dockerfile_exists=false" >> $GITHUB_OUTPUT
    exit 0
  fi
# Check various Dockerfile locations for regular services
elif [ -f "backend/services/$SERVICE/Dockerfile" ]; then
  DOCKERFILE="backend/services/$SERVICE/Dockerfile"
  CONTEXT="backend/services/$SERVICE"
elif [ -f "Dockerfile.$SERVICE" ]; then
  DOCKERFILE="Dockerfile.$SERVICE"
  CONTEXT="."
...
```

---

### 2. unified-ci.yml
**Location:** `.github/workflows/unified-ci.yml`

**Issues:**
- Backend test matrix missing 4 new services
- Docker build test matrix missing services

**Required Changes:**

#### Change 1: Update Backend Test Matrix (Lines 125-138)
```yaml
# OLD:
strategy:
  fail-fast: false
  matrix:
    service:
      - auth-service
      - user-service
      - messaging-service
      - matching-service
      - media-service
      - api-gateway
      - payment-service
      - notification-service
      - analytics-service
      - moderation-service
      - realtime-service
      - advertising-service

# NEW:
strategy:
  fail-fast: false
  matrix:
    service:
      - auth-service
      - user-service
      - messaging-service
      - matching-service
      - media-service
      - api-gateway
      - payment-service
      - notification-service
      - analytics-service
      - moderation-service
      - realtime-service
      - admin-service
      - policy-service
      - advertising-service
      - automation-service
      - workflow-engine
```

#### Change 2: Update Docker Build Test Matrix (Lines 401-409)
```yaml
# OLD:
strategy:
  fail-fast: false
  matrix:
    service:
      - auth-service
      - user-service
      - messaging-service
      - matching-service
      - media-service
      - api-gateway

# NEW:
strategy:
  fail-fast: false
  matrix:
    service:
      - auth-service
      - user-service
      - messaging-service
      - matching-service
      - media-service
      - api-gateway
      - payment-service
      - notification-service
      - analytics-service
      - moderation-service
      - realtime-service
      - admin-service
      - policy-service
      - advertising-service
      - automation-service
      - workflow-engine
```

---

### 3. unified-cd-dev.yml
**Location:** `.github/workflows/unified-cd-dev.yml`

**Issues:**
- Build matrix missing 4 new services (policy-service, advertising-service, automation-service, workflow-engine)
- Missing moderation-service and realtime-service

**Required Changes:**

#### Change 1: Update Service Matrix (Lines 46-65)
```yaml
# OLD:
strategy:
  fail-fast: false
  matrix:
    service:
      - name: api-gateway
        path: backend/services/api-gateway
      - name: user-service
        path: backend/services/user-service
      - name: auth-service
        path: backend/services/auth-service
      - name: matching-service
        path: backend/services/matching-service
      - name: messaging-service
        path: backend/services/messaging-service
      - name: media-service
        path: backend/services/media-service
      - name: notification-service
        path: backend/services/notification-service
      - name: payment-service
        path: backend/services/payment-service
      - name: analytics-service
        path: backend/services/analytics-service

# NEW:
strategy:
  fail-fast: false
  matrix:
    service:
      - name: api-gateway
        path: backend/services/api-gateway
      - name: user-service
        path: backend/services/user-service
      - name: auth-service
        path: backend/services/auth-service
      - name: matching-service
        path: backend/services/matching-service
      - name: messaging-service
        path: backend/services/messaging-service
      - name: media-service
        path: backend/services/media-service
      - name: notification-service
        path: backend/services/notification-service
      - name: payment-service
        path: backend/services/payment-service
      - name: analytics-service
        path: backend/services/analytics-service
      - name: moderation-service
        path: backend/services/moderation-service
      - name: realtime-service
        path: backend/services/realtime-service
      - name: admin-service
        path: backend/services/admin-service
      - name: policy-service
        path: backend/services/policy-service
      - name: advertising-service
        path: backend/services/advertising-service
      - name: automation-service
        path: backend/services/automation-service
      - name: workflow-engine
        path: backend/services/workflow-engine
```

---

### 4. unified-cd-staging.yml
**Location:** `.github/workflows/unified-cd-staging.yml`

**Issues:**
- Same as unified-cd-dev.yml - missing services in matrix

**Required Changes:**

#### Change 1: Update Service Matrix (Lines 69-92)
```yaml
# Apply the same changes as unified-cd-dev.yml Change 1
# Add all 16 services to the matrix
```

---

### 5. unified-cd-production.yml
**Location:** `.github/workflows/unified-cd-production.yml`

**Issues:**
- Same as unified-cd-dev.yml and unified-cd-staging.yml - missing services in matrix

**Required Changes:**

#### Change 1: Update Service Matrix (Lines 175-198)
```yaml
# Apply the same changes as unified-cd-dev.yml Change 1
# Add all 16 services to the matrix
```

---

## Environment Variables and Secrets Checklist

Ensure these are configured in GitHub repository settings:

### Azure Credentials
- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_CLIENT_SECRET` (for environments requiring it)
- `AZURE_CREDENTIALS` (for production)
- `AZURE_CREDENTIALS_DEV` (for development)
- `AZURE_CREDENTIALS_STAGING` (for staging)

### API URLs
- `DEV_API_URL`
- `DEV_URL`
- `STAGING_API_URL`
- `STAGING_URL`
- `PROD_API_URL`
- `PROD_URL`

### Other Secrets
- `SLACK_WEBHOOK_URL` (for notifications)
- `CODECOV_TOKEN` (for code coverage)
- `TEST_USER_EMAIL` (for integration tests)
- `TEST_USER_PASSWORD` (for integration tests)

### Repository Variables
- `PROD_DEPLOY_ENABLED` (set to `true` to unlock production deployments)

---

## Testing Plan

After applying fixes:

1. **Test Service Discovery:**
   ```bash
   # Manually trigger build-acr-pipeline.yml with input "all"
   # Verify all 16 services + 6 AI services are discovered
   ```

2. **Test Individual Service Build:**
   ```bash
   # Test new services individually:
   # - policy-service
   # - advertising-service
   # - automation-service
   # - workflow-engine
   ```

3. **Test CI Pipeline:**
   ```bash
   # Create test PR to verify unified-ci.yml runs for all services
   ```

4. **Test CD Pipeline (Dev):**
   ```bash
   # Push to develop branch
   # Verify all services deploy to dev environment
   ```

---

## Path Filter Updates

### Current Path Filters
The workflows currently trigger on these paths:
```yaml
paths:
  - 'backend/**'
  - 'Dockerfile*'
  - 'docker-compose*.yml'
```

### Recommended: Service-Specific Path Filters
For better efficiency, consider adding service-specific triggers:

```yaml
# Example for policy-service
on:
  push:
    paths:
      - 'backend/services/policy-service/**'
      - 'backend/shared/**'
      - '.github/workflows/build-acr-pipeline.yml'
```

---

## Summary of Changes

| File | Changes | Services Added | Impact |
|------|---------|----------------|---------|
| build-acr-pipeline.yml | Service discovery logic, AI services support, default list | +4 new, +6 AI | HIGH - Core build pipeline |
| unified-ci.yml | Test matrix updates | +4 new | MEDIUM - Testing coverage |
| unified-cd-dev.yml | Deployment matrix | +4 new, +2 missing | HIGH - Dev deployments |
| unified-cd-staging.yml | Deployment matrix | +4 new, +2 missing | HIGH - Staging deployments |
| unified-cd-production.yml | Deployment matrix | +4 new, +2 missing | CRITICAL - Prod deployments |

---

## Implementation Order

1. ✅ **Phase 1:** Update `build-acr-pipeline.yml` (service discovery)
2. ✅ **Phase 2:** Update `unified-ci.yml` (testing)
3. ✅ **Phase 3:** Update `unified-cd-dev.yml` (safe dev environment)
4. ⚠️ **Phase 4:** Update `unified-cd-staging.yml` (test before prod)
5. ⚠️ **Phase 5:** Update `unified-cd-production.yml` (after thorough testing)

---

## Additional Recommendations

### 1. Service Health Checks
Add health check endpoints for new services:
- `policy-service/health`
- `advertising-service/health`
- `automation-service/health`
- `workflow-engine/health`

### 2. Helm Chart Updates
Ensure Helm charts include all services:
```bash
# Check: infrastructure/helm/flamoral/values-*.yaml
# Verify all 16 services are defined
```

### 3. Terraform Updates
Verify service definitions in Terraform:
```bash
# Check: infrastructure/terraform/modules/aks/main.tf
# Ensure all services have resource definitions
```

### 4. Database Migrations
For services requiring databases:
- policy-service: May need policy schema
- advertising-service: May need ad campaigns schema
- automation-service: May need workflow/task schema
- workflow-engine: May need workflow definitions schema

---

## Rollback Plan

If issues occur after deployment:

1. **Immediate:** Use `unified-cd-*.yml` rollback jobs
2. **Service-Level:** Remove problematic service from matrix temporarily
3. **Full Rollback:** Revert workflow files to backup versions

---

## Contact & Support

For issues with specific services:
- Backend Services: Check `backend/services/*/README.md`
- Workflow Issues: Review GitHub Actions logs
- Infrastructure: Check Terraform state and AKS pod status

---

**Document Version:** 1.0
**Last Updated:** 2025-12-16
**Author:** Claude (AI Assistant)
