# Azure DevOps Migration Verification Tests
**Project:** World-Class Dating App Platform
**Purpose:** Test each pipeline and verify successful migration

---

## Overview

This document provides comprehensive verification tests for each Azure DevOps pipeline. Use these tests to validate that pipelines are functioning correctly after migration from GitHub Actions.

**Test Execution:** Run after each pipeline migration and before final cutover

---

## Test Environment Setup

### Prerequisites

Before running verification tests:

| Requirement | Status | Notes |
|-------------|--------|-------|
| Azure DevOps access | ⬜ | With pipeline run permissions |
| Azure CLI installed | ⬜ | Version 2.55+ |
| kubectl installed | ⬜ | Version 1.28+ |
| Helm installed | ⬜ | Version 3.13+ |
| Test environment available | ⬜ | Dev or dedicated test environment |
| Test credentials configured | ⬜ | From test-credentials variable group |

### Test Data Preparation

```bash
# Set environment variables for tests
export AZURE_DEVOPS_ORG="https://dev.azure.com/dating-app-org"
export AZURE_DEVOPS_PROJECT="dating-app-platform"
export TEST_ENVIRONMENT="dev"

# Login to Azure DevOps
az devops configure --defaults organization=$AZURE_DEVOPS_ORG project=$AZURE_DEVOPS_PROJECT

# Login to Azure
az login

# Get AKS credentials
az aks get-credentials --resource-group dating-app-dev-rg --name dating-app-dev-aks
```

---

## Test Suite 1: CI Pipelines

### 1.1 Backend CI Pipeline

**Pipeline:** `backend-ci`
**Expected Duration:** 15-20 minutes
**Trigger:** Manual run or PR to main/develop

#### Test 1.1.1: Manual Trigger Test

**Steps:**
```bash
# Trigger pipeline manually
az pipelines run --name backend-ci --branch develop
```

**Expected Output:**
- Pipeline starts successfully
- All 9 service jobs run in parallel
- Each job completes: lint → build → test
- Security scan completes
- Pipeline succeeds

**Verification Checklist:**
- [ ] Pipeline triggered successfully
- [ ] Matrix strategy creates 9 parallel jobs
- [ ] user-service: lint, build, test pass
- [ ] matching-service: lint, build, test pass
- [ ] messaging-service: lint, build, test pass
- [ ] media-service: lint, build, test pass
- [ ] payment-service: lint, build, test pass
- [ ] notification-service: lint, build, test pass
- [ ] moderation-service: lint, build, test pass
- [ ] analytics-service: lint, build, test pass
- [ ] api-gateway: lint, build, test pass
- [ ] Security scan (Snyk) completes
- [ ] No critical vulnerabilities found
- [ ] Build artifacts published
- [ ] Total duration < 25 minutes

#### Test 1.1.2: Pull Request Trigger Test

**Steps:**
1. Create test branch: `git checkout -b test/backend-ci-trigger`
2. Make trivial change in `backend/services/user-service/README.md`
3. Commit and push
4. Create PR to develop

**Expected Output:**
- Pipeline triggered automatically
- PR shows pipeline status
- Pipeline succeeds

**Verification Checklist:**
- [ ] Pipeline auto-triggered on PR creation
- [ ] PR shows "Checks in progress" status
- [ ] Pipeline completes successfully
- [ ] PR shows "All checks passed" status
- [ ] Can merge PR after pipeline passes

#### Test 1.1.3: Failure Scenario Test

**Steps:**
1. Introduce linting error: Add `console.log("test")` without semicolon
2. Commit and push
3. Observe pipeline failure

**Expected Output:**
- Pipeline runs but fails on lint step
- Error message clearly indicates linting issue
- Other services continue (if not affected)

**Verification Checklist:**
- [ ] Pipeline detects linting error
- [ ] Clear error message in logs
- [ ] Failed job highlighted in UI
- [ ] Other services not affected
- [ ] Can re-run failed job after fix

**Troubleshooting:**
- If pipeline doesn't trigger: Check branch policies and PR triggers
- If matrix doesn't work: Verify YAML syntax and variable expansion
- If tests fail: Check test database connectivity

---

### 1.2 Frontend CI Pipeline

**Pipeline:** `frontend-ci`
**Expected Duration:** 10-15 minutes
**Trigger:** Manual run or PR to main/develop

#### Test 1.2.1: Web App Build Test

**Steps:**
```bash
# Trigger pipeline manually
az pipelines run --name frontend-ci --branch develop
```

**Expected Output:**
- Pipeline starts successfully
- web-app job completes: lint → build → test
- mobile-app job completes: lint → test

**Verification Checklist:**
- [ ] Pipeline triggered successfully
- [ ] Node.js 20 installed
- [ ] Dependencies installed via npm ci
- [ ] Web app linted successfully
- [ ] Web app built successfully
- [ ] Web app tests pass
- [ ] Mobile app linted successfully
- [ ] Mobile app tests pass
- [ ] Build artifacts published
- [ ] Total duration < 18 minutes

#### Test 1.2.2: Path Filter Test

**Steps:**
1. Make change only in `backend/` directory
2. Create PR
3. Verify frontend pipeline does NOT trigger

**Expected Output:**
- Pipeline should not run for backend-only changes

**Verification Checklist:**
- [ ] Pipeline does not trigger for backend changes
- [ ] Pipeline does trigger for frontend changes
- [ ] Path filters working correctly

**Troubleshooting:**
- If builds fail: Check Node.js version and dependencies
- If tests fail: Verify test environment configuration
- If path filters don't work: Check trigger configuration

---

### 1.3 Docker Build & Push Pipeline

**Pipeline:** `docker-build-push`
**Expected Duration:** 30-45 minutes (10 services in parallel)
**Trigger:** Push to main/staging branches

#### Test 1.3.1: Full Build Test

**Steps:**
```bash
# Trigger pipeline manually
az pipelines run --name docker-build-push --branch main
```

**Expected Output:**
- Pipeline starts successfully
- All 10 service images build in parallel
- Images pushed to Azure Container Registry
- Security scans pass

**Verification Checklist:**
- [ ] Pipeline triggered successfully
- [ ] Matrix creates 10 parallel build jobs
- [ ] Docker Buildx set up
- [ ] ACR login successful
- [ ] user-service image built and pushed
- [ ] matching-service image built and pushed
- [ ] messaging-service image built and pushed
- [ ] media-service image built and pushed
- [ ] payment-service image built and pushed
- [ ] notification-service image built and pushed
- [ ] moderation-service image built and pushed
- [ ] analytics-service image built and pushed
- [ ] api-gateway image built and pushed
- [ ] web-frontend image built and pushed
- [ ] Image tags correct (service-tag-latest, service-tag-SHA)
- [ ] Trivy security scans pass
- [ ] No critical vulnerabilities
- [ ] Total duration < 50 minutes

#### Test 1.3.2: Image Verification Test

**Steps:**
```bash
# Login to ACR
az acr login --name datingapp

# List repositories
az acr repository list --name datingapp

# Check specific image tags
az acr repository show-tags --name datingapp --repository world-class-dating-platform/user-service --orderby time_desc --top 5

# Pull and inspect image
docker pull datingapp.azurecr.io/world-class-dating-platform/user-service:user-service-latest
docker inspect datingapp.azurecr.io/world-class-dating-platform/user-service:user-service-latest
```

**Expected Output:**
- All 10 repositories exist in ACR
- Images have correct tags
- Image metadata includes build info

**Verification Checklist:**
- [ ] All 10 repositories in ACR
- [ ] Latest tags present
- [ ] SHA tags present
- [ ] Image labels include BUILD_DATE, VCS_REF, VERSION
- [ ] Images can be pulled successfully
- [ ] Image sizes reasonable (not bloated)

**Troubleshooting:**
- If ACR login fails: Check service connection
- If build fails: Check Dockerfile and build context
- If push fails: Check ACR permissions
- If security scan fails: Review vulnerabilities and update dependencies

---

## Test Suite 2: Infrastructure Pipelines

### 2.1 Terraform Plan Pipeline

**Pipeline:** `terraform-plan`
**Expected Duration:** 5-10 minutes per environment
**Trigger:** PR to main affecting infrastructure/

#### Test 2.1.1: Plan Generation Test

**Steps:**
```bash
# Create test branch
git checkout -b test/terraform-plan

# Make trivial change to Terraform
echo "# Test comment" >> infrastructure/terraform/main.tf

# Commit and create PR
git add infrastructure/terraform/main.tf
git commit -m "Test: Terraform plan trigger"
git push origin test/terraform-plan

# Create PR via GitHub
gh pr create --title "Test Terraform Plan" --body "Testing pipeline"
```

**Expected Output:**
- Pipeline triggered automatically
- Three parallel jobs: plan-dev, plan-staging, plan-prod
- Terraform plans generated for all environments
- Plans saved as artifacts
- PR comment with plan summary

**Verification Checklist:**
- [ ] Pipeline auto-triggered on PR
- [ ] Terraform 1.6.0 installed
- [ ] Azure login successful
- [ ] plan-dev job: init → fmt check → validate → plan
- [ ] plan-staging job: init → validate → plan
- [ ] plan-prod job: init → validate → plan
- [ ] Plans show "No changes" (for test comment)
- [ ] Plan artifacts published
- [ ] PR comment posted with summary
- [ ] Total duration < 15 minutes

#### Test 2.1.2: Change Detection Test

**Steps:**
1. Make actual infrastructure change (e.g., add tag to resource)
2. Create PR
3. Verify plan shows change

**Expected Output:**
- Plan detects change
- Shows what will be modified

**Verification Checklist:**
- [ ] Plan shows detected changes
- [ ] Change description accurate
- [ ] Plan output readable
- [ ] No unexpected changes

**Troubleshooting:**
- If Terraform init fails: Check backend configuration
- If Azure login fails: Verify service connection
- If plan fails: Check Terraform syntax
- If PR comment not posted: Check permissions

---

### 2.2 Terraform Apply Pipeline

**Pipeline:** `terraform-apply`
**Expected Duration:** 10-20 minutes
**Trigger:** Manual with approval

#### Test 2.2.1: Manual Trigger with Parameters Test

**Steps:**
```bash
# Trigger pipeline with parameters
az pipelines run --name terraform-apply \
  --parameters environment=dev auto_approve=false
```

**Expected Output:**
- Pipeline starts with specified parameters
- Approval gate triggered
- After approval: plan → apply
- Infrastructure outputs captured

**Verification Checklist:**
- [ ] Pipeline triggered with parameters
- [ ] Environment parameter respected
- [ ] Approval gate shown
- [ ] Approval required before apply
- [ ] After approval: Terraform init successful
- [ ] Terraform plan generated
- [ ] Terraform apply executes (if auto_approve=true or after manual approval)
- [ ] Outputs captured (AKS name, PostgreSQL FQDN, Redis hostname)
- [ ] Notification sent
- [ ] Total duration < 25 minutes

#### Test 2.2.2: Dry-Run Test (Dev Environment)

**Steps:**
1. Run apply pipeline for dev with auto_approve=false
2. Review plan in logs
3. Manually approve or reject

**Expected Output:**
- Plan generated without applying
- Can review before approval
- Can cancel without changes

**Verification Checklist:**
- [ ] Plan visible in logs before approval
- [ ] Approval gate works
- [ ] Can cancel without applying
- [ ] No changes applied if rejected

**Troubleshooting:**
- If manual trigger doesn't work: Check pipeline triggers configuration
- If approval doesn't work: Verify environment approval settings
- If apply fails: Review Terraform error messages
- If outputs not captured: Check output commands

---

### 2.3 Helm Deploy Pipeline

**Pipeline:** `helm-deploy`
**Expected Duration:** 10-15 minutes
**Trigger:** Manual with parameters

#### Test 2.3.1: Single Service Deployment Test

**Steps:**
```bash
# Deploy single service to dev
az pipelines run --name helm-deploy \
  --parameters environment=dev service=dating-api image_tag=dev-latest
```

**Expected Output:**
- Pipeline starts with parameters
- AKS credentials retrieved
- Helm upgrade successful
- Service deployed
- Verification checks pass

**Verification Checklist:**
- [ ] Pipeline triggered with parameters
- [ ] Azure login successful
- [ ] AKS credentials retrieved
- [ ] Helm 3.13.0 installed
- [ ] Namespace created/verified
- [ ] Helm upgrade executes
- [ ] Dating API deployed successfully
- [ ] Pods running
- [ ] Services created
- [ ] Ingress configured
- [ ] Health check passes
- [ ] Deployment notification sent
- [ ] Total duration < 18 minutes

#### Test 2.3.2: Verify Deployment in AKS

**Steps:**
```bash
# Check deployment
kubectl get pods -n datingapp
kubectl get services -n datingapp
kubectl get ingress -n datingapp

# Check Helm release
helm list -n datingapp

# Test service endpoint
INGRESS_URL=$(kubectl get ingress -n datingapp -o jsonpath='{.items[0].spec.rules[0].host}')
curl -f https://${INGRESS_URL}/health || echo "Health check failed"
```

**Expected Output:**
- All pods running
- Services created
- Ingress configured
- Health endpoint responds

**Verification Checklist:**
- [ ] Pods in "Running" state
- [ ] All replicas ready
- [ ] Services have endpoints
- [ ] Ingress has address
- [ ] Health endpoint returns 200 OK
- [ ] Application accessible

**Troubleshooting:**
- If AKS login fails: Check service connection
- If Helm fails: Check chart syntax and values
- If pods fail: Check image availability and logs
- If ingress fails: Check ingress controller

---

## Test Suite 3: Deployment Pipelines

### 3.1 CD - Development Pipeline

**Pipeline:** `cd-dev`
**Expected Duration:** 30-45 minutes
**Trigger:** Push to develop branch

#### Test 3.1.1: Full Deployment Flow Test

**Steps:**
```bash
# Make trivial change and push to develop
git checkout develop
git pull
echo "# Test deployment" >> README.md
git add README.md
git commit -m "Test: CD dev pipeline trigger"
git push origin develop
```

**Expected Output:**
- Pipeline triggered automatically
- All stages execute: Build → Deploy → Migrate → Test → Notify
- Services deployed to dev environment
- Smoke tests pass

**Verification Checklist:**

**Stage 1: Build & Push Images**
- [ ] Pipeline triggered on push to develop
- [ ] 9 services build in parallel
- [ ] Images pushed to ACR with dev-SHA tag
- [ ] Image metadata correct

**Stage 2: Build Web App**
- [ ] Web app built successfully
- [ ] Artifact published
- [ ] Environment variables injected (DEV_API_URL, etc.)

**Stage 3: Deploy Infrastructure (if changed)**
- [ ] Conditional: only if infrastructure/ changed
- [ ] Terraform apply successful (if triggered)

**Stage 4: Deploy to AKS**
- [ ] AKS credentials retrieved
- [ ] Helm upgrades for all services
- [ ] All services deployed to dev namespace
- [ ] Pods running and ready
- [ ] Image tags match dev-SHA

**Stage 5: Run Migrations**
- [ ] Migration job created
- [ ] Migration completes successfully
- [ ] Database schema updated

**Stage 6: Smoke Tests**
- [ ] Playwright installed
- [ ] Smoke tests execute
- [ ] All critical paths tested
- [ ] Health checks pass
- [ ] API health: 200 OK
- [ ] Web health: 200 OK

**Stage 7: Notify**
- [ ] Slack notification sent
- [ ] Contains deployment status
- [ ] Includes relevant links

- [ ] Total duration < 50 minutes

#### Test 3.1.2: Rollback on Test Failure

**Steps:**
1. Intentionally break a smoke test
2. Push to develop
3. Observe pipeline failure
4. Verify automatic rollback (if configured)

**Expected Output:**
- Pipeline fails at smoke test stage
- No deployment completed
- Or rollback triggered

**Verification Checklist:**
- [ ] Pipeline detects test failure
- [ ] Deployment halted or rolled back
- [ ] Notification sent about failure
- [ ] Previous version still running

**Troubleshooting:**
- If build fails: Check Docker/ACR issues
- If deploy fails: Check AKS connectivity and Helm
- If migrations fail: Check database connectivity
- If tests fail: Check test environment configuration

---

### 3.2 CD - Staging Pipeline

**Pipeline:** `cd-staging`
**Expected Duration:** 60-90 minutes (includes full test suite)
**Trigger:** Push to main branch

#### Test 3.2.1: Full Deployment with Testing

**Steps:**
```bash
# Merge develop to main or push directly
git checkout main
git pull
git merge develop
git push origin main
```

**Expected Output:**
- Pipeline triggered automatically
- All stages execute including comprehensive testing
- RC tag created if successful

**Verification Checklist:**

**Stages 1-6:** (Same as CD-Dev plus:)
- [ ] Images tagged with staging-SHA
- [ ] Deployed to staging namespace
- [ ] Environment approval (if configured)

**Stage 7: E2E Tests**
- [ ] Playwright tests on 3 browsers (chromium, firefox, webkit)
- [ ] All browser tests pass
- [ ] Test artifacts published
- [ ] Screenshots/videos on failure

**Stage 8: Performance Tests**
- [ ] k6 installed
- [ ] Load tests execute
- [ ] Results meet thresholds:
  - [ ] p95 response time < 500ms
  - [ ] Error rate < 1%
  - [ ] Throughput > 100 rps
- [ ] Results artifact published

**Stage 9: Security Scan**
- [ ] OWASP ZAP baseline scan
- [ ] ZAP report generated
- [ ] No critical vulnerabilities
- [ ] Report artifact published

**Stage 10: Create RC Tag**
- [ ] Git tag created: rc-{SHA}
- [ ] Tag pushed to repository
- [ ] Tag references correct commit

**Stage 11: Notify**
- [ ] Slack notification sent
- [ ] Includes RC tag
- [ ] Indicates staging deployment complete

- [ ] Total duration < 100 minutes

#### Test 3.2.2: Verify RC Tag Created

**Steps:**
```bash
# Check for RC tag
git fetch --tags
git tag -l "rc-*" | tail -5

# Verify tag points to correct commit
git show rc-$(git rev-parse --short HEAD)
```

**Expected Output:**
- RC tag exists
- Points to deployed commit
- Includes annotation

**Verification Checklist:**
- [ ] RC tag created
- [ ] Tag format: rc-{SHA}
- [ ] Tag annotation includes timestamp
- [ ] Tag pushed to remote

**Troubleshooting:**
- If E2E tests fail: Check browser availability and test stability
- If performance tests fail: Check k6 installation and target environment
- If security scan fails: Review vulnerabilities
- If RC tag not created: Check git credentials and push permissions

---

### 3.3 CD - Production Pipeline

**Pipeline:** `cd-production`
**Expected Duration:** 45-90 minutes (varies by deployment type)
**Trigger:** Manual with approval (using RC tag)

#### Test 3.3.1: Canary Deployment Test

**Steps:**
```bash
# Get latest RC tag
RC_TAG=$(git tag -l "rc-*" | tail -1)

# Trigger production pipeline with canary
az pipelines run --name cd-production \
  --parameters release_tag=$RC_TAG deployment_type=canary
```

**Expected Output:**
- Pre-deployment approval required
- Backup created
- Canary deployed at 10% traffic
- Progressive rollout: 10% → 25% → 50% → 75% → 100%
- Post-deployment validation
- Release created

**Verification Checklist:**

**Stage 1: Pre-deployment Validation**
- [ ] Approval gate triggered
- [ ] Release tag validated
- [ ] Staging tests verified
- [ ] Security scans verified
- [ ] Manual approval received

**Stage 2: Backup**
- [ ] Database backup created
- [ ] Current deployment state saved
- [ ] Backup artifacts published

**Stage 3: Infrastructure**
- [ ] Terraform plan generated
- [ ] No unexpected changes
- [ ] Apply executed (if changes)

**Stage 4: Canary Deployment (10%)**
- [ ] Canary pods deployed
- [ ] Traffic weighted 10% to canary
- [ ] Canary stabilizes (5 min wait)

**Stage 5: Canary Validation**
- [ ] Error rate < 1%
- [ ] Latency within threshold
- [ ] Smoke tests pass against canary

**Stage 6: Progressive Rollout**
- [ ] Traffic updated to 25%, validated
- [ ] Traffic updated to 50%, validated
- [ ] Traffic updated to 75%, validated
- [ ] Traffic updated to 100%, validated
- [ ] Metrics checked at each stage
- [ ] 3 min wait between stages

**Stage 7: Migrations**
- [ ] Migration job completed
- [ ] Database schema updated

**Stage 8: Post-deployment Validation**
- [ ] Production smoke tests pass
- [ ] All services healthy
- [ ] API endpoints respond 200 OK

**Stage 9: Create Release**
- [ ] GitHub release created
- [ ] Changelog generated
- [ ] Release tagged: v{build_number}

**Stage 10: Notify**
- [ ] Success notification sent
- [ ] Includes release info

- [ ] Total duration < 100 minutes

#### Test 3.3.2: Blue-Green Deployment Test

**Steps:**
```bash
# Trigger with blue-green strategy
az pipelines run --name cd-production \
  --parameters release_tag=$RC_TAG deployment_type=blue-green
```

**Expected Output:**
- Green environment deployed
- Traffic switched after validation
- Blue environment kept for rollback

**Verification Checklist:**
- [ ] Green environment created
- [ ] All services deployed to production-green namespace
- [ ] Green environment validated
- [ ] Traffic switched from blue to green
- [ ] Blue environment retained
- [ ] Can switch back if needed

#### Test 3.3.3: Rolling Deployment Test

**Steps:**
```bash
# Trigger with rolling strategy
az pipelines run --name cd-production \
  --parameters release_tag=$RC_TAG deployment_type=rolling
```

**Expected Output:**
- Pods updated one by one
- Zero downtime
- Gradual rollout

**Verification Checklist:**
- [ ] Rolling update strategy configured
- [ ] Max unavailable: 0
- [ ] Max surge: 1
- [ ] Pods updated gradually
- [ ] No service interruption
- [ ] All pods eventually updated

#### Test 3.3.4: Rollback Test

**Steps:**
1. Deploy a version
2. Trigger pipeline failure (or manual rollback)
3. Observe rollback procedure

**Expected Output:**
- Rollback triggered
- Previous deployment restored
- Services recover

**Verification Checklist:**
- [ ] Rollback approval gate (if configured)
- [ ] Backup deployment manifest applied
- [ ] Pods revert to previous version
- [ ] Services stabilize
- [ ] Rollback notification sent

**Troubleshooting:**
- If canary fails: Review metrics and logs
- If blue-green fails: Check namespace configuration
- If rollback fails: Manual intervention may be needed
- If approvals don't work: Verify environment settings

---

## Test Suite 4: Testing Pipelines

### 4.1 E2E Tests Pipeline

**Pipeline:** `e2e-tests`
**Expected Duration:** 45-60 minutes
**Trigger:** Manual, scheduled, or deployment status

#### Test 4.1.1: Manual Run Test

**Steps:**
```bash
# Trigger E2E tests manually
az pipelines run --name e2e-tests \
  --parameters environment=staging
```

**Expected Output:**
- All test jobs execute
- Test reports published
- Results summary generated

**Verification Checklist:**

**Job 1: Web E2E Tests**
- [ ] Matrix: 3 browsers × 3 shards = 9 parallel jobs
- [ ] Playwright installed for each browser
- [ ] Tests distributed across shards
- [ ] All critical user flows tested:
  - [ ] User registration
  - [ ] Login
  - [ ] Profile creation
  - [ ] Browse matches
  - [ ] Send message
  - [ ] Logout
- [ ] Test results published (pass/fail/skip)
- [ ] Artifacts: HTML reports, screenshots, videos

**Job 2: Visual Regression**
- [ ] Chromium browser
- [ ] Screenshots captured
- [ ] Compared against baseline
- [ ] No unexpected visual changes
- [ ] Diff images for failures

**Job 3: Accessibility Tests**
- [ ] axe-core integration
- [ ] WCAG 2.1 AA compliance checked
- [ ] No critical accessibility issues
- [ ] Report published

**Job 4: Mobile E2E - iOS**
- [ ] macOS agent available
- [ ] Detox tests execute
- [ ] iOS simulator used
- [ ] Mobile flows tested
- [ ] Test artifacts published

**Job 5: Mobile E2E - Android**
- [ ] Android emulator setup
- [ ] Detox tests execute
- [ ] Android flows tested
- [ ] Test artifacts published

**Job 6: Contract Tests**
- [ ] Pact broker running
- [ ] Consumer tests pass
- [ ] Provider verification passes
- [ ] Contracts published

**Job 7: E2E Summary**
- [ ] All test results aggregated
- [ ] Summary report generated
- [ ] Slack notification sent

- [ ] Total duration < 70 minutes

#### Test 4.1.2: Scheduled Run Test

**Steps:**
1. Wait for scheduled run (daily at 6 AM UTC)
2. Or modify schedule for immediate test
3. Verify automatic execution

**Expected Output:**
- Pipeline runs automatically at scheduled time
- No manual intervention needed

**Verification Checklist:**
- [ ] Schedule triggers pipeline
- [ ] Runs against configured environment
- [ ] Results emailed/notified
- [ ] Failures create issues (if configured)

**Troubleshooting:**
- If browsers fail: Check Playwright installation
- If mobile tests fail: Check simulator/emulator availability
- If tests flaky: Review test stability and waits
- If artifacts missing: Check publish configuration

---

### 4.2 Performance Tests Pipeline

**Pipeline:** `performance-tests`
**Expected Duration:** 30-45 minutes
**Trigger:** Manual or weekly schedule

#### Test 4.2.1: Load Tests

**Steps:**
```bash
# Trigger performance tests
az pipelines run --name performance-tests \
  --parameters environment=staging
```

**Expected Output:**
- k6 load tests execute
- Thresholds validated
- Reports generated

**Verification Checklist:**

**Job 1: Load Tests (k6)**
- [ ] k6 installed
- [ ] Load test script executed
- [ ] Virtual users: 50
- [ ] Duration: 5 minutes
- [ ] API endpoints tested
- [ ] Thresholds met:
  - [ ] p95 response time < 500ms
  - [ ] p99 response time < 1000ms
  - [ ] Error rate < 1%
  - [ ] Throughput > 100 rps
- [ ] Results JSON published

**Job 2: Stress Tests**
- [ ] Stress test executed
- [ ] Gradual load increase
- [ ] System breaking point identified
- [ ] Recovery tested
- [ ] Results published

**Job 3: Spike Tests**
- [ ] Sudden load spike tested
- [ ] System handles spike
- [ ] Auto-scaling triggered (if configured)
- [ ] Results published

**Job 4: Lighthouse**
- [ ] Lighthouse CI runs
- [ ] Multiple pages tested
- [ ] Performance budgets checked:
  - [ ] Performance score ≥ 90
  - [ ] Accessibility score ≥ 95
  - [ ] Best Practices score ≥ 90
  - [ ] SEO score ≥ 90
- [ ] Reports published

**Job 5: Database Performance**
- [ ] Query performance tested
- [ ] Slow queries identified
- [ ] Query plans analyzed
- [ ] Recommendations generated

**Job 6: Memory & CPU Profiling**
- [ ] Memory profiling executed
- [ ] No memory leaks detected
- [ ] CPU profiling executed
- [ ] Hot paths identified

**Job 7: Performance Report**
- [ ] Consolidated report generated
- [ ] Trends analyzed
- [ ] Regressions highlighted
- [ ] Slack notification sent

- [ ] Total duration < 50 minutes

**Troubleshooting:**
- If k6 fails: Check k6 installation and scripts
- If thresholds fail: Review application performance
- If Lighthouse fails: Check network and target URL
- If database tests fail: Check database connectivity

---

### 4.3 Security Tests Pipeline

**Pipeline:** `security-tests`
**Expected Duration:** 30-60 minutes
**Trigger:** PR, push, daily schedule

#### Test 4.3.1: Comprehensive Security Scan

**Steps:**
```bash
# Trigger security tests
az pipelines run --name security-tests --branch main
```

**Expected Output:**
- All security scans execute
- No critical vulnerabilities
- Reports published

**Verification Checklist:**

**Job 1: Dependency Check**
- [ ] npm audit runs
- [ ] Trivy filesystem scan
- [ ] Snyk scan executes
- [ ] Vulnerabilities reported
- [ ] No critical/high severity issues
- [ ] SARIF uploaded

**Job 2: Container Scan**
- [ ] Docker images scanned (4 services in matrix)
- [ ] Trivy image scans
- [ ] No critical vulnerabilities in images
- [ ] Results uploaded

**Job 3: OWASP ZAP DAST**
- [ ] ZAP baseline scan
- [ ] ZAP full scan (scheduled only)
- [ ] Target: staging URL
- [ ] No high-risk vulnerabilities
- [ ] ZAP report published

**Job 4: SAST**
- [ ] CodeQL initialized
- [ ] CodeQL analysis complete
- [ ] Semgrep rules executed
- [ ] No critical code issues
- [ ] Results uploaded

**Job 5: Secret Scanning**
- [ ] TruffleHog scan
- [ ] Gitleaks scan
- [ ] No secrets detected in code
- [ ] No leaked credentials

**Job 6: IaC Security**
- [ ] Checkov scans Terraform
- [ ] tfsec scans Terraform
- [ ] Trivy scans Terraform
- [ ] No critical IaC issues
- [ ] Results uploaded

**Job 7: API Security**
- [ ] API security tests execute
- [ ] SQL injection tests
- [ ] XSS tests
- [ ] Authentication tests
- [ ] No security flaws found

**Job 8: Security Report**
- [ ] Consolidated report generated
- [ ] All scan results included
- [ ] Notification sent to security team
- [ ] Critical issues create alerts

- [ ] Total duration < 70 minutes

**Troubleshooting:**
- If scans fail: Check tool installations
- If false positives: Update scan configurations
- If secrets detected: Review and remove
- If vulnerabilities found: Create remediation plan

---

## Test Suite 5: Mobile Pipeline

### 5.1 Mobile Build Pipeline

**Pipeline:** `mobile-build`
**Expected Duration:** 30-60 minutes
**Trigger:** Push to main (mobile paths) or manual

#### Test 5.1.1: Android Build Test

**Steps:**
```bash
# Trigger with Android only
az pipelines run --name mobile-build \
  --parameters platform=android build_type=development
```

**Expected Output:**
- Android APK built successfully
- Artifact published

**Verification Checklist:**
- [ ] Pipeline triggered
- [ ] pnpm installed
- [ ] Node.js 20 installed
- [ ] Java 17 installed
- [ ] Android SDK installed
- [ ] Dependencies installed
- [ ] Gradle cache used
- [ ] EAS build executes
- [ ] APK generated
- [ ] APK artifact published
- [ ] Build duration < 40 minutes

#### Test 5.1.2: iOS Build Test

**Steps:**
```bash
# Trigger with iOS only (requires macOS agent)
az pipelines run --name mobile-build \
  --parameters platform=ios build_type=development
```

**Expected Output:**
- iOS IPA built successfully
- Artifact published

**Verification Checklist:**
- [ ] macOS agent available
- [ ] pnpm installed
- [ ] Node.js 20 installed
- [ ] CocoaPods installed
- [ ] Dependencies installed
- [ ] CocoaPods cache used
- [ ] EAS build executes
- [ ] IPA generated
- [ ] IPA artifact published
- [ ] Build duration < 50 minutes

#### Test 5.1.3: Production Build Test

**Steps:**
```bash
# Trigger production build
az pipelines run --name mobile-build \
  --parameters platform=ios build_type=production
```

**Expected Output:**
- Production IPA built
- Uploaded to TestFlight

**Verification Checklist:**
- [ ] Production profile used
- [ ] Code signing successful
- [ ] IPA generated
- [ ] TestFlight upload succeeds
- [ ] Notification sent

**Troubleshooting:**
- If Android fails: Check SDK and Java versions
- If iOS fails: Check macOS agent availability and certificates
- If EAS fails: Check Expo token
- If TestFlight fails: Check App Store Connect credentials

---

## Test Execution Schedule

### Phase 1: Initial Testing (During Migration)

| Test Suite | Frequency | Owner |
|------------|-----------|-------|
| Backend CI | Every migration | DevOps Team |
| Frontend CI | Every migration | DevOps Team |
| Docker Build | Daily during migration | DevOps Team |
| Terraform Plan | On infrastructure changes | Platform Team |
| CD Dev | After CI pipelines ready | DevOps Team |
| CD Staging | After CD Dev ready | DevOps Team |
| CD Production | Before final cutover | DevOps Team |
| E2E Tests | After CD pipelines ready | QA Team |
| Performance Tests | Weekly during migration | QA Team |
| Security Tests | Daily during migration | Security Team |
| Mobile Build | After other pipelines stable | Mobile Team |

### Phase 2: Post-Migration (Ongoing)

| Test Suite | Frequency | Owner |
|------------|-----------|-------|
| Backend CI | On every PR/push | Automated |
| Frontend CI | On every PR/push | Automated |
| Docker Build | On main/staging push | Automated |
| Terraform Plan | On infrastructure PR | Automated |
| CD Dev | On develop push | Automated |
| CD Staging | On main push | Automated |
| CD Production | Manual (weekly releases) | DevOps Lead |
| E2E Tests | Daily + on deployment | Automated |
| Performance Tests | Weekly | Automated |
| Security Tests | Daily | Automated |
| Mobile Build | On main push (mobile) | Automated |

---

## Expected Outputs Summary

### Build Artifacts

| Pipeline | Artifacts | Retention |
|----------|-----------|-----------|
| Backend CI | None (tests only) | N/A |
| Frontend CI | None (tests only) | N/A |
| Docker Build | Container images in ACR | 30 days (untagged) |
| CD Dev | None | N/A |
| CD Staging | RC tag | Permanent |
| CD Production | GitHub release | Permanent |
| E2E Tests | HTML reports, screenshots, videos | 30 days |
| Performance Tests | JSON results, Lighthouse reports | 90 days |
| Security Tests | SARIF files, scan reports | 90 days |
| Mobile Build | APK/IPA files | 14 days |

### Notifications

| Event | Channel | Recipients |
|-------|---------|------------|
| Build failure | Slack #builds | DevOps Team |
| Security issue | Slack #security-alerts | Security Team |
| Deployment success | Slack #deployments | All Teams |
| Deployment failure | Slack #deployments + Email | DevOps Team + On-Call |
| E2E test failure | Slack #e2e-test-results | QA Team |
| Performance regression | Slack #performance-alerts | QA + DevOps |
| Production deployment | Slack #production-deployments | All Teams + Leadership |

---

## Troubleshooting Guide

### Common Issues and Solutions

#### Issue: Pipeline Doesn't Trigger

**Symptoms:**
- No pipeline run after code push
- PR doesn't show pipeline status

**Diagnosis:**
```bash
# Check pipeline triggers
az pipelines show --name <pipeline-name> --query "triggers"

# Check recent runs
az pipelines runs list --pipeline-name <pipeline-name> --top 5
```

**Solutions:**
1. Verify trigger configuration (branch, path filters)
2. Check branch policies
3. Ensure pipeline is enabled
4. Verify service connection permissions

#### Issue: Service Connection Fails

**Symptoms:**
- Azure login fails
- Cannot connect to AKS
- ACR push fails

**Diagnosis:**
```bash
# Test Azure login
az login --service-principal -u <client-id> -p <client-secret> --tenant <tenant-id>

# Test AKS connection
az aks get-credentials --resource-group <rg> --name <cluster>

# Test ACR login
az acr login --name <acr-name>
```

**Solutions:**
1. Verify service principal credentials
2. Check service connection configuration
3. Ensure permissions granted (Contributor, AKS Cluster User, etc.)
4. Rotate credentials if expired

#### Issue: Tests Fail Intermittently

**Symptoms:**
- Tests pass sometimes, fail other times
- Flaky test results

**Diagnosis:**
- Review test logs for timing issues
- Check for race conditions
- Verify test environment stability

**Solutions:**
1. Increase test timeouts
2. Add explicit waits
3. Improve test isolation
4. Use retry logic for network operations
5. Run tests sequentially if parallel causes issues

#### Issue: Deployment Fails

**Symptoms:**
- Helm upgrade fails
- Pods don't start
- Services unavailable

**Diagnosis:**
```bash
# Check Helm release
helm list -n <namespace>
helm status <release-name> -n <namespace>

# Check pods
kubectl get pods -n <namespace>
kubectl describe pod <pod-name> -n <namespace>
kubectl logs <pod-name> -n <namespace>

# Check events
kubectl get events -n <namespace> --sort-by='.lastTimestamp'
```

**Solutions:**
1. Check Helm chart values
2. Verify image availability
3. Check resource limits
4. Review pod logs for errors
5. Verify secrets/configmaps exist
6. Check networking (services, ingress)

#### Issue: Performance Degradation

**Symptoms:**
- Pipelines slower than GitHub Actions
- Build times increased

**Diagnosis:**
- Review pipeline logs for slow steps
- Check agent pool utilization
- Compare with GitHub Actions times

**Solutions:**
1. Use self-hosted agents for better performance
2. Implement caching (Docker layers, npm, etc.)
3. Optimize build parallelization
4. Use faster agent pool SKUs
5. Reduce test scope or parallelize better

---

## Success Criteria

Mark each pipeline as VALIDATED when:

| Pipeline | Criteria | Status |
|----------|----------|--------|
| Backend CI | 5 consecutive successful runs | ⬜ |
| Frontend CI | 5 consecutive successful runs | ⬜ |
| Docker Build | All 10 services build successfully | ⬜ |
| Terraform Plan | Plans generated for all envs | ⬜ |
| Terraform Apply | Successful apply to dev | ⬜ |
| Helm Deploy | Successful deploy to dev | ⬜ |
| CD Dev | End-to-end deployment successful | ⬜ |
| CD Staging | Deployment + full tests successful | ⬜ |
| CD Production | Canary/blue-green/rolling all tested | ⬜ |
| E2E Tests | All test jobs pass | ⬜ |
| Performance Tests | All thresholds met | ⬜ |
| Security Tests | No critical vulnerabilities | ⬜ |
| Mobile Build | Android and iOS builds successful | ⬜ |

---

## Final Validation Checklist

Before declaring migration complete:

- [ ] All 14 pipelines pass verification tests
- [ ] All pipelines run at comparable or better speed than GitHub Actions
- [ ] All team members trained and comfortable
- [ ] Documentation complete and accessible
- [ ] Monitoring and alerting configured
- [ ] Rollback procedures tested
- [ ] 30-day parallel run successful (GitHub + Azure DevOps)
- [ ] Zero production incidents related to CI/CD
- [ ] Team satisfaction ≥ 80%
- [ ] All success criteria met

---

**Document Version:** 1.0
**Last Updated:** December 2, 2025
**Owner:** DevOps Team
