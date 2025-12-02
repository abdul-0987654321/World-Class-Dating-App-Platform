# Azure DevOps Migration Checklist
**Project:** World-Class Dating App Platform
**Target Completion:** 8 weeks from start date

---

## Overview

This checklist provides step-by-step instructions for migrating from GitHub Actions to Azure DevOps. Each task includes verification steps and rollback procedures.

**Status Legend:**
- ⬜ Not Started
- 🔄 In Progress
- ✅ Completed
- ⚠️ Blocked
- ❌ Failed

---

## Phase 1: Pre-Migration Tasks (Week 1)

### 1.1 Azure DevOps Setup

| # | Task | Owner | Status | Due Date | Notes |
|---|------|-------|--------|----------|-------|
| 1.1.1 | Create Azure DevOps Organization (dating-app-org) | Platform Team | ⬜ | Day 1 | |
| 1.1.2 | Create Azure DevOps Project (dating-app-platform) | Platform Team | ⬜ | Day 1 | |
| 1.1.3 | Configure project settings (repo, boards, pipelines) | Platform Team | ⬜ | Day 1 | |
| 1.1.4 | Set up user access and permissions | Platform Team | ⬜ | Day 1-2 | Use AAD groups |
| 1.1.5 | Configure billing and parallel jobs (10-15 jobs) | Platform Team | ⬜ | Day 2 | |
| 1.1.6 | Enable audit logging | Security Team | ⬜ | Day 2 | |

**Verification:**
```bash
# Check organization is accessible
az devops configure --defaults organization=https://dev.azure.com/dating-app-org
az devops project list
```

---

### 1.2 Azure Key Vault Setup

| # | Task | Owner | Status | Due Date | Notes |
|---|------|-------|--------|----------|-------|
| 1.2.1 | Create Azure Key Vault (dating-app-secrets-kv) | Platform Team | ⬜ | Day 2 | |
| 1.2.2 | Configure Key Vault access policies | Security Team | ⬜ | Day 2 | |
| 1.2.3 | Enable Key Vault audit logging | Security Team | ⬜ | Day 2 | |
| 1.2.4 | Create managed identity for pipelines | Platform Team | ⬜ | Day 2 | |
| 1.2.5 | Grant managed identity access to Key Vault | Security Team | ⬜ | Day 2 | |

**Verification:**
```bash
# Verify Key Vault access
az keyvault show --name dating-app-secrets-kv
az keyvault secret list --vault-name dating-app-secrets-kv
```

---

### 1.3 Service Connections Creation

| # | Task | Owner | Status | Due Date | Notes |
|---|------|-------|--------|----------|-------|
| 1.3.1 | Create Azure RM connection - Production | Platform Team | ⬜ | Day 3 | Service Principal auth |
| 1.3.2 | Create Azure RM connection - Staging | Platform Team | ⬜ | Day 3 | Service Principal auth |
| 1.3.3 | Create Azure RM connection - Development | Platform Team | ⬜ | Day 3 | Service Principal auth |
| 1.3.4 | Create Azure RM connection - Shared Services | Platform Team | ⬜ | Day 3 | For ACR, Key Vault |
| 1.3.5 | Create ACR service connection | Platform Team | ⬜ | Day 3 | |
| 1.3.6 | Create AKS service connection - Production | Platform Team | ⬜ | Day 3 | |
| 1.3.7 | Create AKS service connection - Staging | Platform Team | ⬜ | Day 3 | |
| 1.3.8 | Create AKS service connection - Development | Platform Team | ⬜ | Day 3 | |
| 1.3.9 | Create GitHub service connection | Platform Team | ⬜ | Day 3 | For source code |
| 1.3.10 | Test all service connections | Platform Team | ⬜ | Day 3 | |

**Verification:**
```bash
# Test Azure connection
az login --service-principal -u <client-id> -p <client-secret> --tenant <tenant-id>
az account show

# Test ACR connection
az acr login --name datingapp

# Test AKS connection
az aks get-credentials --resource-group <rg> --name <aks-cluster>
kubectl cluster-info
```

---

### 1.4 Secret Migration to Key Vault

| # | Task | Owner | Status | Due Date | Notes |
|---|------|-------|--------|----------|-------|
| 1.4.1 | Export GitHub secrets inventory | DevOps Team | ⬜ | Day 4 | Document all secrets |
| 1.4.2 | **Azure Credentials** | | | | |
| 1.4.2.1 | Migrate AZURE-CLIENT-ID | Security Team | ⬜ | Day 4 | |
| 1.4.2.2 | Migrate AZURE-CLIENT-SECRET | Security Team | ⬜ | Day 4 | |
| 1.4.2.3 | Migrate AZURE-SUBSCRIPTION-ID | Security Team | ⬜ | Day 4 | |
| 1.4.2.4 | Migrate AZURE-TENANT-ID | Security Team | ⬜ | Day 4 | |
| 1.4.3 | **Third-Party Services** | | | | |
| 1.4.3.1 | Migrate SNYK-TOKEN | Security Team | ⬜ | Day 4 | |
| 1.4.3.2 | Migrate EXPO-TOKEN | Mobile Team | ⬜ | Day 4 | |
| 1.4.3.3 | Migrate SLACK-WEBHOOK-URL | DevOps Team | ⬜ | Day 4 | |
| 1.4.3.4 | Migrate SLACK-SECURITY-WEBHOOK | Security Team | ⬜ | Day 4 | |
| 1.4.4 | **Terraform Backend** | | | | |
| 1.4.4.1 | Migrate TF-STATE-RG | Platform Team | ⬜ | Day 4 | |
| 1.4.4.2 | Migrate TF-STATE-STORAGE | Platform Team | ⬜ | Day 4 | |
| 1.4.5 | **Environment URLs - Dev** | | | | |
| 1.4.5.1 | Migrate DEV-URL | DevOps Team | ⬜ | Day 4 | |
| 1.4.5.2 | Migrate DEV-API-URL | DevOps Team | ⬜ | Day 4 | |
| 1.4.5.3 | Migrate DEV-WS-URL | DevOps Team | ⬜ | Day 4 | |
| 1.4.6 | **Environment URLs - Staging** | | | | |
| 1.4.6.1 | Migrate STAGING-URL | DevOps Team | ⬜ | Day 4 | |
| 1.4.6.2 | Migrate STAGING-API-URL | DevOps Team | ⬜ | Day 4 | |
| 1.4.6.3 | Migrate STAGING-WS-URL | DevOps Team | ⬜ | Day 4 | |
| 1.4.7 | **Environment URLs - Production** | | | | |
| 1.4.7.1 | Migrate PROD-URL | DevOps Team | ⬜ | Day 4 | |
| 1.4.7.2 | Migrate PROD-API-URL | DevOps Team | ⬜ | Day 4 | |
| 1.4.7.3 | Migrate PROD-CANARY-URL | DevOps Team | ⬜ | Day 4 | |
| 1.4.8 | **Test Credentials** | | | | |
| 1.4.8.1 | Migrate TEST-USER-EMAIL | QA Team | ⬜ | Day 4 | |
| 1.4.8.2 | Migrate TEST-USER-PASSWORD | QA Team | ⬜ | Day 4 | |
| 1.4.9 | Verify all secrets accessible | Security Team | ⬜ | Day 4 | |

**Migration Script:**
```bash
# Example: Migrate secret to Key Vault
SECRET_NAME="AZURE-CLIENT-ID"
SECRET_VALUE="<get-from-github>"

az keyvault secret set \
  --vault-name dating-app-secrets-kv \
  --name $SECRET_NAME \
  --value "$SECRET_VALUE"

# Verify
az keyvault secret show \
  --vault-name dating-app-secrets-kv \
  --name $SECRET_NAME \
  --query "value" -o tsv
```

---

### 1.5 Variable Groups Creation

| # | Task | Owner | Status | Due Date | Notes |
|---|------|-------|--------|----------|-------|
| 1.5.1 | Create VG: azure-service-principals | Platform Team | ⬜ | Day 5 | Link to Key Vault |
| 1.5.2 | Create VG: terraform-backend | Platform Team | ⬜ | Day 5 | Link to Key Vault |
| 1.5.3 | Create VG: environment-dev | DevOps Team | ⬜ | Day 5 | Link to Key Vault |
| 1.5.4 | Create VG: environment-staging | DevOps Team | ⬜ | Day 5 | Link to Key Vault |
| 1.5.5 | Create VG: environment-production | DevOps Team | ⬜ | Day 5 | Link to Key Vault |
| 1.5.6 | Create VG: security-tools | Security Team | ⬜ | Day 5 | Link to Key Vault |
| 1.5.7 | Create VG: notifications | DevOps Team | ⬜ | Day 5 | Link to Key Vault |
| 1.5.8 | Create VG: mobile-build | Mobile Team | ⬜ | Day 5 | Link to Key Vault |
| 1.5.9 | Create VG: test-credentials | QA Team | ⬜ | Day 5 | Link to Key Vault |
| 1.5.10 | Create VG: docker-registry | DevOps Team | ⬜ | Day 5 | Plain variables |
| 1.5.11 | Test variable group access | DevOps Team | ⬜ | Day 5 | |

**Verification:**
```bash
# List variable groups
az pipelines variable-group list --org https://dev.azure.com/dating-app-org --project dating-app-platform

# Get variable group details
az pipelines variable-group show --id <group-id> --org https://dev.azure.com/dating-app-org --project dating-app-platform
```

---

### 1.6 Environment Setup

| # | Task | Owner | Status | Due Date | Notes |
|---|------|-------|--------|----------|-------|
| 1.6.1 | Create Environment: development | DevOps Team | ⬜ | Day 5 | No approvals |
| 1.6.2 | Create Environment: staging | DevOps Team | ⬜ | Day 5 | Optional approvals |
| 1.6.3 | Create Environment: production | DevOps Team | ⬜ | Day 5 | Required approvals |
| 1.6.4 | Create Environment: production-approval | DevOps Team | ⬜ | Day 5 | Pre-deployment approval |
| 1.6.5 | Create Environment: production-rollback | DevOps Team | ⬜ | Day 5 | Rollback approval |
| 1.6.6 | Configure approval gates for production | DevOps Lead | ⬜ | Day 5 | 2 approvers required |
| 1.6.7 | Configure approval gates for staging | DevOps Lead | ⬜ | Day 5 | 1 approver required |
| 1.6.8 | Add approvers to environments | DevOps Lead | ⬜ | Day 5 | Team leads |
| 1.6.9 | Test approval workflow | DevOps Team | ⬜ | Day 5 | Dry run |

---

### 1.7 Agent Pool Setup (Optional - Self-Hosted)

| # | Task | Owner | Status | Due Date | Notes |
|---|------|-------|--------|----------|-------|
| 1.7.1 | Create Azure VM Scale Set for Linux agents | Platform Team | ⬜ | Day 6 | 3 instances |
| 1.7.2 | Install Azure Pipelines agent on VMs | Platform Team | ⬜ | Day 6 | |
| 1.7.3 | Configure agent pool: Linux-Build-Pool | Platform Team | ⬜ | Day 6 | |
| 1.7.4 | Configure agent pool: Linux-Deploy-Pool | Platform Team | ⬜ | Day 6 | |
| 1.7.5 | Configure agent pool: Linux-Test-Pool | Platform Team | ⬜ | Day 6 | |
| 1.7.6 | Set up macOS agent for iOS builds | Mobile Team | ⬜ | Day 6-7 | External or cloud |
| 1.7.7 | Test agent connectivity | DevOps Team | ⬜ | Day 7 | |
| 1.7.8 | Install required tools on agents | DevOps Team | ⬜ | Day 7 | Docker, Node, etc. |

**Alternative:** Use Microsoft-hosted agents initially

---

## Phase 2: CI Pipelines Migration (Week 2)

### 2.1 Backend CI Pipeline

| # | Task | Owner | Status | Due Date | Notes |
|---|------|-------|--------|----------|-------|
| 2.1.1 | Create pipeline file: azure-pipelines/ci/backend-ci.yml | DevOps Team | ⬜ | Day 8 | |
| 2.1.2 | Convert matrix strategy for 9 services | DevOps Team | ⬜ | Day 8 | |
| 2.1.3 | Configure trigger: main, develop branches | DevOps Team | ⬜ | Day 8 | |
| 2.1.4 | Configure path filters: backend/** | DevOps Team | ⬜ | Day 8 | |
| 2.1.5 | Add lint, build, test tasks | DevOps Team | ⬜ | Day 8 | |
| 2.1.6 | Add security scan (Snyk) | Security Team | ⬜ | Day 8 | |
| 2.1.7 | Create pipeline in Azure DevOps | DevOps Team | ⬜ | Day 8 | |
| 2.1.8 | Run test build | DevOps Team | ⬜ | Day 9 | |
| 2.1.9 | Fix any errors | DevOps Team | ⬜ | Day 9 | |
| 2.1.10 | Validate with backend team | Backend Team | ⬜ | Day 9 | |

**Verification:**
- All 9 services build successfully
- Tests pass for all services
- Security scan completes
- Build time comparable to GitHub Actions

---

### 2.2 Frontend CI Pipeline

| # | Task | Owner | Status | Due Date | Notes |
|---|------|-------|--------|----------|-------|
| 2.2.1 | Create pipeline file: azure-pipelines/ci/frontend-ci.yml | DevOps Team | ⬜ | Day 9 | |
| 2.2.2 | Configure jobs: web-app, mobile-app | DevOps Team | ⬜ | Day 9 | |
| 2.2.3 | Configure trigger: main, develop branches | DevOps Team | ⬜ | Day 9 | |
| 2.2.4 | Configure path filters: frontend/** | DevOps Team | ⬜ | Day 9 | |
| 2.2.5 | Add Node.js setup, lint, build, test | DevOps Team | ⬜ | Day 9 | |
| 2.2.6 | Create pipeline in Azure DevOps | DevOps Team | ⬜ | Day 9 | |
| 2.2.7 | Run test build | DevOps Team | ⬜ | Day 10 | |
| 2.2.8 | Fix any errors | DevOps Team | ⬜ | Day 10 | |
| 2.2.9 | Validate with frontend team | Frontend Team | ⬜ | Day 10 | |

**Verification:**
- Web app builds successfully
- Mobile app compiles
- Tests pass
- Artifacts published

---

### 2.3 Docker Build & Push Pipeline

| # | Task | Owner | Status | Due Date | Notes |
|---|------|-------|--------|----------|-------|
| 2.3.1 | Create pipeline file: azure-pipelines/build/docker-build-push.yml | DevOps Team | ⬜ | Day 10 | |
| 2.3.2 | Convert matrix strategy for 10 services | DevOps Team | ⬜ | Day 10 | |
| 2.3.3 | Configure ACR service connection | DevOps Team | ⬜ | Day 10 | |
| 2.3.4 | Add Docker build and push tasks | DevOps Team | ⬜ | Day 10 | |
| 2.3.5 | Add Trivy security scan | Security Team | ⬜ | Day 10 | |
| 2.3.6 | Configure image tagging strategy | DevOps Team | ⬜ | Day 10 | |
| 2.3.7 | Create pipeline in Azure DevOps | DevOps Team | ⬜ | Day 10 | |
| 2.3.8 | Run test build for one service | DevOps Team | ⬜ | Day 11 | |
| 2.3.9 | Run full build for all services | DevOps Team | ⬜ | Day 11 | |
| 2.3.10 | Verify images in ACR | DevOps Team | ⬜ | Day 11 | |
| 2.3.11 | Validate with dev team | Dev Team | ⬜ | Day 11 | |

**Verification:**
```bash
# Verify images in ACR
az acr repository list --name datingapp
az acr repository show-tags --name datingapp --repository world-class-dating-platform/user-service
```

---

### 2.4 Branch Policies

| # | Task | Owner | Status | Due Date | Notes |
|---|------|-------|--------|----------|-------|
| 2.4.1 | Enable branch policy for main | DevOps Lead | ⬜ | Day 12 | |
| 2.4.2 | Enable branch policy for develop | DevOps Lead | ⬜ | Day 12 | |
| 2.4.3 | Require backend-ci to pass | DevOps Lead | ⬜ | Day 12 | |
| 2.4.4 | Require frontend-ci to pass | DevOps Lead | ⬜ | Day 12 | |
| 2.4.5 | Require 1 reviewer for PRs | DevOps Lead | ⬜ | Day 12 | |
| 2.4.6 | Test PR validation | Dev Team | ⬜ | Day 12 | |

---

## Phase 3: Infrastructure Pipelines (Week 3)

### 3.1 Terraform Plan Pipeline

| # | Task | Owner | Status | Due Date | Notes |
|---|------|-------|--------|----------|-------|
| 3.1.1 | Create pipeline file: azure-pipelines/infrastructure/terraform-plan.yml | Platform Team | ⬜ | Day 15 | |
| 3.1.2 | Configure jobs: plan-dev, plan-staging, plan-prod | Platform Team | ⬜ | Day 15 | |
| 3.1.3 | Add Terraform install task | Platform Team | ⬜ | Day 15 | |
| 3.1.4 | Add Azure service connection | Platform Team | ⬜ | Day 15 | |
| 3.1.5 | Configure Terraform backend | Platform Team | ⬜ | Day 15 | |
| 3.1.6 | Add terraform init, fmt, validate, plan tasks | Platform Team | ⬜ | Day 15 | |
| 3.1.7 | Add artifact publishing for plans | Platform Team | ⬜ | Day 15 | |
| 3.1.8 | Add PR comment with plan summary | Platform Team | ⬜ | Day 15 | |
| 3.1.9 | Create pipeline in Azure DevOps | Platform Team | ⬜ | Day 16 | |
| 3.1.10 | Test with dev environment | Platform Team | ⬜ | Day 16 | |
| 3.1.11 | Test with staging environment | Platform Team | ⬜ | Day 16 | |
| 3.1.12 | Test with prod environment (plan only) | Platform Team | ⬜ | Day 16 | |

**Verification:**
- Plans generated for all environments
- No changes detected (if no infrastructure changes)
- Artifacts saved
- PR comments posted

---

### 3.2 Terraform Apply Pipeline

| # | Task | Owner | Status | Due Date | Notes |
|---|------|-------|--------|----------|-------|
| 3.2.1 | Create pipeline file: azure-pipelines/infrastructure/terraform-apply.yml | Platform Team | ⬜ | Day 17 | |
| 3.2.2 | Configure manual trigger (no auto-trigger) | Platform Team | ⬜ | Day 17 | |
| 3.2.3 | Add runtime parameters: environment, auto_approve | Platform Team | ⬜ | Day 17 | |
| 3.2.4 | Add environment approval gates | Platform Team | ⬜ | Day 17 | |
| 3.2.5 | Add terraform init, plan, apply tasks | Platform Team | ⬜ | Day 17 | |
| 3.2.6 | Add output capture | Platform Team | ⬜ | Day 17 | |
| 3.2.7 | Add notification task | Platform Team | ⬜ | Day 17 | |
| 3.2.8 | Create pipeline in Azure DevOps | Platform Team | ⬜ | Day 18 | |
| 3.2.9 | Test manual run (dev, dry-run) | Platform Team | ⬜ | Day 18 | |
| 3.2.10 | Validate approval workflow | Platform Team | ⬜ | Day 18 | |

**Verification:**
- Manual trigger works
- Approval required for production
- Apply executes successfully
- Outputs captured

---

### 3.3 Helm Deploy Pipeline

| # | Task | Owner | Status | Due Date | Notes |
|---|------|-------|--------|----------|-------|
| 3.3.1 | Create pipeline file: azure-pipelines/infrastructure/helm-deploy.yml | DevOps Team | ⬜ | Day 18 | |
| 3.3.2 | Configure manual trigger with parameters | DevOps Team | ⬜ | Day 18 | |
| 3.3.3 | Add AKS service connection | DevOps Team | ⬜ | Day 18 | |
| 3.3.4 | Add Helm install task | DevOps Team | ⬜ | Day 18 | |
| 3.3.5 | Add kubectl credential setup | DevOps Team | ⬜ | Day 18 | |
| 3.3.6 | Add deployment tasks for each service | DevOps Team | ⬜ | Day 18 | |
| 3.3.7 | Add verification tasks | DevOps Team | ⬜ | Day 18 | |
| 3.3.8 | Create pipeline in Azure DevOps | DevOps Team | ⬜ | Day 19 | |
| 3.3.9 | Test deploy to dev | DevOps Team | ⬜ | Day 19 | |
| 3.3.10 | Validate deployment | DevOps Team | ⬜ | Day 19 | |

**Verification:**
```bash
# Verify Helm releases
helm list -n datingapp

# Verify pods
kubectl get pods -n datingapp
```

---

## Phase 4: CD Pipelines (Week 4-5)

### 4.1 CD - Development Pipeline

| # | Task | Owner | Status | Due Date | Notes |
|---|------|-------|--------|----------|-------|
| 4.1.1 | Create pipeline file: azure-pipelines/deploy/cd-dev.yml | DevOps Team | ⬜ | Day 22 | |
| 4.1.2 | Configure trigger: develop branch | DevOps Team | ⬜ | Day 22 | |
| 4.1.3 | **Stage 1: Build & Push** | | | | |
| 4.1.3.1 | Add matrix job for 9 services | DevOps Team | ⬜ | Day 22 | |
| 4.1.3.2 | Add Docker build and push to ACR | DevOps Team | ⬜ | Day 22 | |
| 4.1.4 | **Stage 2: Build Web** | | | | |
| 4.1.4.1 | Add web app build job | DevOps Team | ⬜ | Day 22 | |
| 4.1.4.2 | Add artifact publishing | DevOps Team | ⬜ | Day 22 | |
| 4.1.5 | **Stage 3: Deploy Infrastructure** | | | | |
| 4.1.5.1 | Add conditional terraform apply | DevOps Team | ⬜ | Day 22 | |
| 4.1.6 | **Stage 4: Deploy to AKS** | | | | |
| 4.1.6.1 | Add Helm upgrade tasks | DevOps Team | ⬜ | Day 23 | |
| 4.1.6.2 | Add deployment verification | DevOps Team | ⬜ | Day 23 | |
| 4.1.7 | **Stage 5: Run Migrations** | | | | |
| 4.1.7.1 | Add migration job task | DevOps Team | ⬜ | Day 23 | |
| 4.1.8 | **Stage 6: Smoke Tests** | | | | |
| 4.1.8.1 | Add Playwright smoke tests | QA Team | ⬜ | Day 23 | |
| 4.1.8.2 | Add health check tests | QA Team | ⬜ | Day 23 | |
| 4.1.9 | **Stage 7: Notify** | | | | |
| 4.1.9.1 | Add Slack notification | DevOps Team | ⬜ | Day 23 | |
| 4.1.10 | Create pipeline in Azure DevOps | DevOps Team | ⬜ | Day 24 | |
| 4.1.11 | Run test deployment | DevOps Team | ⬜ | Day 24 | |
| 4.1.12 | Fix errors and iterate | DevOps Team | ⬜ | Day 24-25 | |
| 4.1.13 | Full validation with team | All Teams | ⬜ | Day 25 | |

**Verification:**
- All services deployed to dev
- Migrations run successfully
- Smoke tests pass
- Notifications received

---

### 4.2 CD - Staging Pipeline

| # | Task | Owner | Status | Due Date | Notes |
|---|------|-------|--------|----------|-------|
| 4.2.1 | Create pipeline file: azure-pipelines/deploy/cd-staging.yml | DevOps Team | ⬜ | Day 26 | |
| 4.2.2 | Configure trigger: main branch | DevOps Team | ⬜ | Day 26 | |
| 4.2.3 | **Stage 1-4:** Copy from cd-dev with staging configs | DevOps Team | ⬜ | Day 26 | |
| 4.2.4 | **Stage 5: E2E Tests** | | | | |
| 4.2.4.1 | Add Playwright tests (3 browsers matrix) | QA Team | ⬜ | Day 26 | |
| 4.2.4.2 | Add test artifact publishing | QA Team | ⬜ | Day 26 | |
| 4.2.5 | **Stage 6: Performance Tests** | | | | |
| 4.2.5.1 | Add k6 load tests | QA Team | ⬜ | Day 27 | |
| 4.2.5.2 | Add results publishing | QA Team | ⬜ | Day 27 | |
| 4.2.6 | **Stage 7: Security Scan** | | | | |
| 4.2.6.1 | Add OWASP ZAP scan | Security Team | ⬜ | Day 27 | |
| 4.2.7 | **Stage 8: Create RC Tag** | | | | |
| 4.2.7.1 | Add git tagging task | DevOps Team | ⬜ | Day 27 | |
| 4.2.8 | **Stage 9: Notify** | DevOps Team | ⬜ | Day 27 | |
| 4.2.9 | Add environment approval (optional) | DevOps Team | ⬜ | Day 27 | |
| 4.2.10 | Create pipeline in Azure DevOps | DevOps Team | ⬜ | Day 28 | |
| 4.2.11 | Run test deployment | DevOps Team | ⬜ | Day 28-29 | |
| 4.2.12 | Full validation with all teams | All Teams | ⬜ | Day 29-30 | |

**Verification:**
- All services deployed to staging
- E2E tests pass on all browsers
- Performance tests meet thresholds
- Security scan passes
- RC tag created

---

### 4.3 CD - Production Pipeline

| # | Task | Owner | Status | Due Date | Notes |
|---|------|-------|--------|----------|-------|
| 4.3.1 | Create pipeline file: azure-pipelines/deploy/cd-production.yml | DevOps Team | ⬜ | Day 31 | Most complex |
| 4.3.2 | Configure manual trigger only | DevOps Team | ⬜ | Day 31 | |
| 4.3.3 | Add runtime parameters: release_tag, deployment_type | DevOps Team | ⬜ | Day 31 | |
| 4.3.4 | **Stage 1: Pre-deployment Validation** | | | | |
| 4.3.4.1 | Add release tag validation | DevOps Team | ⬜ | Day 31 | |
| 4.3.4.2 | Add staging test verification | DevOps Team | ⬜ | Day 31 | |
| 4.3.4.3 | Add approval gate | DevOps Lead | ⬜ | Day 31 | |
| 4.3.5 | **Stage 2: Backup** | | | | |
| 4.3.5.1 | Add database backup task | Platform Team | ⬜ | Day 31 | |
| 4.3.5.2 | Add deployment state backup | Platform Team | ⬜ | Day 31 | |
| 4.3.6 | **Stage 3: Infrastructure** | Platform Team | ⬜ | Day 31 | |
| 4.3.7 | **Stage 4: Canary Deployment** | | | | |
| 4.3.7.1 | Add canary deployment job (10% traffic) | DevOps Team | ⬜ | Day 32 | |
| 4.3.7.2 | Add canary validation | DevOps Team | ⬜ | Day 32 | |
| 4.3.7.3 | Add progressive rollout (25, 50, 75, 100%) | DevOps Team | ⬜ | Day 32 | |
| 4.3.7.4 | Add metric checks at each stage | DevOps Team | ⬜ | Day 32 | |
| 4.3.8 | **Stage 5: Blue-Green Deployment** | | | | |
| 4.3.8.1 | Add green environment deployment | DevOps Team | ⬜ | Day 32 | |
| 4.3.8.2 | Add traffic switch logic | DevOps Team | ⬜ | Day 32 | |
| 4.3.9 | **Stage 6: Rolling Deployment** | | | | |
| 4.3.9.1 | Add rolling update job | DevOps Team | ⬜ | Day 32 | |
| 4.3.10 | **Stage 7: Migrations** | DevOps Team | ⬜ | Day 32 | |
| 4.3.11 | **Stage 8: Post-deployment Validation** | | | | |
| 4.3.11.1 | Add production smoke tests | QA Team | ⬜ | Day 33 | |
| 4.3.11.2 | Add health checks | QA Team | ⬜ | Day 33 | |
| 4.3.12 | **Stage 9: Create Release** | | | | |
| 4.3.12.1 | Add GitHub release creation | DevOps Team | ⬜ | Day 33 | |
| 4.3.12.2 | Add changelog generation | DevOps Team | ⬜ | Day 33 | |
| 4.3.13 | **Stage 10: Rollback (on failure)** | | | | |
| 4.3.13.1 | Add conditional rollback job | DevOps Team | ⬜ | Day 33 | |
| 4.3.13.2 | Add deployment restoration | DevOps Team | ⬜ | Day 33 | |
| 4.3.13.3 | Add rollback approval gate | DevOps Lead | ⬜ | Day 33 | |
| 4.3.14 | **Stage 11: Notify** | DevOps Team | ⬜ | Day 33 | |
| 4.3.15 | Create pipeline in Azure DevOps | DevOps Team | ⬜ | Day 34 | |
| 4.3.16 | Test in isolation (without deployment) | DevOps Team | ⬜ | Day 34-35 | |
| 4.3.17 | Dry-run test deployment | DevOps Team | ⬜ | Day 35 | |
| 4.3.18 | Document production deployment procedure | DevOps Team | ⬜ | Day 35 | |

**Verification:**
- Manual trigger works
- All approval gates function
- Canary deployment works (if selected)
- Blue-green deployment works (if selected)
- Rolling deployment works (if selected)
- Rollback procedure tested
- Notifications sent

---

## Phase 5: Testing Pipelines (Week 6)

### 5.1 E2E Tests Pipeline

| # | Task | Owner | Status | Due Date | Notes |
|---|------|-------|--------|----------|-------|
| 5.1.1 | Create pipeline file: azure-pipelines/testing/e2e-tests.yml | QA Team | ⬜ | Day 36 | |
| 5.1.2 | Configure triggers: manual, scheduled, deployment_status | QA Team | ⬜ | Day 36 | |
| 5.1.3 | **Job 1: Web E2E Tests** | | | | |
| 5.1.3.1 | Add matrix: 3 browsers x 3 shards | QA Team | ⬜ | Day 36 | |
| 5.1.3.2 | Add Playwright install and test | QA Team | ⬜ | Day 36 | |
| 5.1.3.3 | Add artifact publishing | QA Team | ⬜ | Day 36 | |
| 5.1.4 | **Job 2: Visual Regression** | QA Team | ⬜ | Day 37 | |
| 5.1.5 | **Job 3: Accessibility Tests** | QA Team | ⬜ | Day 37 | |
| 5.1.6 | **Job 4: Mobile E2E - iOS** | Mobile Team | ⬜ | Day 37 | Requires macOS agent |
| 5.1.7 | **Job 5: Mobile E2E - Android** | Mobile Team | ⬜ | Day 37 | |
| 5.1.8 | **Job 6: Contract Tests** | DevOps Team | ⬜ | Day 37 | |
| 5.1.9 | **Job 7: E2E Summary** | QA Team | ⬜ | Day 37 | |
| 5.1.10 | Create pipeline in Azure DevOps | QA Team | ⬜ | Day 38 | |
| 5.1.11 | Test manual run | QA Team | ⬜ | Day 38 | |
| 5.1.12 | Test scheduled run | QA Team | ⬜ | Day 38 | |

**Verification:**
- All browser tests pass
- Visual regression detects changes
- Accessibility checks pass
- Mobile tests run (iOS and Android)
- Contract tests verify APIs

---

### 5.2 Performance Tests Pipeline

| # | Task | Owner | Status | Due Date | Notes |
|---|------|-------|--------|----------|-------|
| 5.2.1 | Create pipeline file: azure-pipelines/testing/performance-tests.yml | QA Team | ⬜ | Day 39 | |
| 5.2.2 | Configure triggers: manual, weekly schedule | QA Team | ⬜ | Day 39 | |
| 5.2.3 | **Job 1: Load Tests (k6)** | | | | |
| 5.2.3.1 | Add k6 install task | QA Team | ⬜ | Day 39 | |
| 5.2.3.2 | Add load test execution | QA Team | ⬜ | Day 39 | |
| 5.2.3.3 | Add stress test execution | QA Team | ⬜ | Day 39 | |
| 5.2.3.4 | Add threshold checks | QA Team | ⬜ | Day 39 | |
| 5.2.4 | **Job 2: Spike Tests** | QA Team | ⬜ | Day 39 | |
| 5.2.5 | **Job 3: Lighthouse** | | | | |
| 5.2.5.1 | Add Lighthouse CI task | QA Team | ⬜ | Day 39 | |
| 5.2.5.2 | Add budget checks | QA Team | ⬜ | Day 39 | |
| 5.2.6 | **Job 4: Database Performance** | QA Team | ⬜ | Day 40 | |
| 5.2.7 | **Job 5: Profiling** | QA Team | ⬜ | Day 40 | |
| 5.2.8 | **Job 6: Performance Report** | QA Team | ⬜ | Day 40 | |
| 5.2.9 | Create pipeline in Azure DevOps | QA Team | ⬜ | Day 40 | |
| 5.2.10 | Test manual run | QA Team | ⬜ | Day 40 | |

**Verification:**
- Load tests complete
- Thresholds validated
- Lighthouse scores meet budgets
- Reports generated

---

### 5.3 Security Tests Pipeline

| # | Task | Owner | Status | Due Date | Notes |
|---|------|-------|--------|----------|-------|
| 5.3.1 | Create pipeline file: azure-pipelines/testing/security-tests.yml | Security Team | ⬜ | Day 40 | |
| 5.3.2 | Configure triggers: PR, push, daily schedule | Security Team | ⬜ | Day 40 | |
| 5.3.3 | **Job 1: Dependency Check** | | | | |
| 5.3.3.1 | Add npm audit | Security Team | ⬜ | Day 40 | |
| 5.3.3.2 | Add Trivy filesystem scan | Security Team | ⬜ | Day 40 | |
| 5.3.3.3 | Add Snyk scan | Security Team | ⬜ | Day 40 | |
| 5.3.4 | **Job 2: Container Scan** | Security Team | ⬜ | Day 41 | |
| 5.3.5 | **Job 3: OWASP ZAP DAST** | Security Team | ⬜ | Day 41 | |
| 5.3.6 | **Job 4: SAST (CodeQL, Semgrep)** | Security Team | ⬜ | Day 41 | |
| 5.3.7 | **Job 5: Secret Scanning** | Security Team | ⬜ | Day 41 | |
| 5.3.8 | **Job 6: IaC Security** | Security Team | ⬜ | Day 41 | |
| 5.3.9 | **Job 7: API Security** | Security Team | ⬜ | Day 41 | |
| 5.3.10 | **Job 8: Security Report** | Security Team | ⬜ | Day 41 | |
| 5.3.11 | Create pipeline in Azure DevOps | Security Team | ⬜ | Day 41 | |
| 5.3.12 | Test and validate | Security Team | ⬜ | Day 41-42 | |

**Verification:**
- All security scans complete
- No critical vulnerabilities
- SARIF files uploaded
- Security report generated

---

## Phase 6: Mobile Pipelines (Week 7)

### 6.1 Mobile Build Pipeline

| # | Task | Owner | Status | Due Date | Notes |
|---|------|-------|--------|----------|-------|
| 6.1.1 | Create pipeline file: azure-pipelines/mobile/mobile-build.yml | Mobile Team | ⬜ | Day 43 | |
| 6.1.2 | Configure triggers: main branch, manual | Mobile Team | ⬜ | Day 43 | |
| 6.1.3 | **Job 1: Android Build** | | | | |
| 6.1.3.1 | Add pnpm, Node.js setup | Mobile Team | ⬜ | Day 43 | |
| 6.1.3.2 | Add Java, Android SDK setup | Mobile Team | ⬜ | Day 43 | |
| 6.1.3.3 | Add EAS build task | Mobile Team | ⬜ | Day 43 | |
| 6.1.3.4 | Add artifact publishing | Mobile Team | ⬜ | Day 43 | |
| 6.1.4 | **Job 2: iOS Build** | | | | |
| 6.1.4.1 | Set up macOS agent | Mobile Team | ⬜ | Day 44 | Major blocker |
| 6.1.4.2 | Add pnpm, Node.js setup | Mobile Team | ⬜ | Day 44 | |
| 6.1.4.3 | Add CocoaPods install | Mobile Team | ⬜ | Day 44 | |
| 6.1.4.4 | Add EAS build task | Mobile Team | ⬜ | Day 44 | |
| 6.1.4.5 | Add TestFlight upload (production) | Mobile Team | ⬜ | Day 44 | |
| 6.1.5 | **Job 3: Notify** | Mobile Team | ⬜ | Day 44 | |
| 6.1.6 | Create pipeline in Azure DevOps | Mobile Team | ⬜ | Day 45 | |
| 6.1.7 | Test Android build | Mobile Team | ⬜ | Day 45 | |
| 6.1.8 | Test iOS build | Mobile Team | ⬜ | Day 45-46 | |
| 6.1.9 | Validate builds with mobile team | Mobile Team | ⬜ | Day 46 | |

**Verification:**
- Android APK builds successfully
- iOS IPA builds successfully
- TestFlight upload works
- Artifacts published

**Note:** iOS builds require macOS agent - consider Azure DevOps hosted macOS agents or external CI service integration

---

## Phase 7: Validation & Cutover (Week 8)

### 7.1 Integration Testing

| # | Task | Owner | Status | Due Date | Notes |
|---|------|-------|--------|----------|-------|
| 7.1.1 | Test full CI/CD flow for backend changes | DevOps Team | ⬜ | Day 47 | |
| 7.1.2 | Test full CI/CD flow for frontend changes | DevOps Team | ⬜ | Day 47 | |
| 7.1.3 | Test full CI/CD flow for infrastructure changes | Platform Team | ⬜ | Day 48 | |
| 7.1.4 | Test PR workflow with branch policies | Dev Team | ⬜ | Day 48 | |
| 7.1.5 | Test deployment to dev environment | DevOps Team | ⬜ | Day 48 | |
| 7.1.6 | Test deployment to staging environment | DevOps Team | ⬜ | Day 49 | |
| 7.1.7 | Test production deployment (dry-run) | DevOps Team | ⬜ | Day 49 | |
| 7.1.8 | Test rollback procedure | DevOps Team | ⬜ | Day 49 | |
| 7.1.9 | Test all approval gates | DevOps Lead | ⬜ | Day 49 | |
| 7.1.10 | Verify all notifications working | DevOps Team | ⬜ | Day 49 | |

**Verification:**
- End-to-end pipeline runs successfully
- All approval gates function
- Rollback works as expected
- Notifications received

---

### 7.2 Parallel Execution

| # | Task | Owner | Status | Due Date | Notes |
|---|------|-------|--------|----------|-------|
| 7.2.1 | Enable Azure DevOps pipelines | DevOps Team | ⬜ | Day 50 | |
| 7.2.2 | Keep GitHub Actions running | DevOps Team | ⬜ | Day 50 | |
| 7.2.3 | Run both systems in parallel for 1 week | DevOps Team | ⬜ | Day 50-54 | Monitor closely |
| 7.2.4 | Compare build times | DevOps Team | ⬜ | Day 50-54 | |
| 7.2.5 | Compare success rates | DevOps Team | ⬜ | Day 50-54 | |
| 7.2.6 | Document any discrepancies | DevOps Team | ⬜ | Day 50-54 | |
| 7.2.7 | Address issues found | DevOps Team | ⬜ | Day 50-54 | |

**Verification:**
- Both systems produce same results
- Build times comparable
- No functionality gaps

---

### 7.3 Documentation & Training

| # | Task | Owner | Status | Due Date | Notes |
|---|------|-------|--------|----------|-------|
| 7.3.1 | Update README with Azure DevOps info | DevOps Team | ⬜ | Day 51 | |
| 7.3.2 | Replace GitHub Actions badges with Azure DevOps | DevOps Team | ⬜ | Day 51 | |
| 7.3.3 | Document pipeline architecture | DevOps Team | ⬜ | Day 51 | |
| 7.3.4 | Document deployment procedures | DevOps Team | ⬜ | Day 51 | |
| 7.3.5 | Create troubleshooting guide | DevOps Team | ⬜ | Day 51 | |
| 7.3.6 | Create runbook for common operations | DevOps Team | ⬜ | Day 52 | |
| 7.3.7 | Conduct team training: Backend | DevOps Lead | ⬜ | Day 52 | |
| 7.3.8 | Conduct team training: Frontend | DevOps Lead | ⬜ | Day 52 | |
| 7.3.9 | Conduct team training: Mobile | DevOps Lead | ⬜ | Day 52 | |
| 7.3.10 | Conduct team training: Platform | DevOps Lead | ⬜ | Day 53 | |
| 7.3.11 | Conduct team training: QA | DevOps Lead | ⬜ | Day 53 | |
| 7.3.12 | Record training sessions | DevOps Team | ⬜ | Day 52-53 | |

---

### 7.4 Final Cutover

| # | Task | Owner | Status | Due Date | Notes |
|---|------|-------|--------|----------|-------|
| 7.4.1 | Final validation of all pipelines | DevOps Team | ⬜ | Day 54 | |
| 7.4.2 | Get sign-off from all teams | DevOps Lead | ⬜ | Day 54 | Backend, Frontend, Mobile, QA, Platform |
| 7.4.3 | Announce cutover date to company | DevOps Lead | ⬜ | Day 54 | |
| 7.4.4 | Disable GitHub Actions (see GitHub Cleanup Checklist) | DevOps Team | ⬜ | Day 55 | |
| 7.4.5 | Archive GitHub workflow files | DevOps Team | ⬜ | Day 55 | |
| 7.4.6 | Update repository links | DevOps Team | ⬜ | Day 55 | |
| 7.4.7 | Monitor Azure DevOps pipelines (48 hours) | DevOps Team | ⬜ | Day 55-56 | On-call |
| 7.4.8 | Address any immediate issues | DevOps Team | ⬜ | Day 55-56 | |

**Verification:**
- All teams signed off
- GitHub Actions disabled
- Azure DevOps is primary CI/CD
- No production issues

---

## Phase 8: Post-Migration (Week 9+)

### 8.1 Monitoring & Optimization

| # | Task | Owner | Status | Due Date | Notes |
|---|------|-------|--------|----------|-------|
| 8.1.1 | Set up Azure Monitor dashboard | DevOps Team | ⬜ | Week 9 | |
| 8.1.2 | Configure pipeline analytics | DevOps Team | ⬜ | Week 9 | |
| 8.1.3 | Analyze pipeline performance | DevOps Team | ⬜ | Week 9-10 | |
| 8.1.4 | Optimize slow pipelines | DevOps Team | ⬜ | Week 10 | |
| 8.1.5 | Implement caching improvements | DevOps Team | ⬜ | Week 10 | |
| 8.1.6 | Review and optimize agent pool usage | Platform Team | ⬜ | Week 10 | |
| 8.1.7 | Review and optimize costs | Platform Team | ⬜ | Week 10 | |

---

### 8.2 Continuous Improvement

| # | Task | Owner | Status | Due Date | Notes |
|---|------|-------|--------|----------|-------|
| 8.2.1 | Gather feedback from teams | DevOps Lead | ⬜ | Week 9 | |
| 8.2.2 | Identify pain points | DevOps Lead | ⬜ | Week 9 | |
| 8.2.3 | Create improvement backlog | DevOps Lead | ⬜ | Week 9 | |
| 8.2.4 | Implement pipeline templates | DevOps Team | ⬜ | Week 10-11 | |
| 8.2.5 | Create shared task groups | DevOps Team | ⬜ | Week 10-11 | |
| 8.2.6 | Enhance monitoring and alerting | DevOps Team | ⬜ | Week 11 | |
| 8.2.7 | Conduct retrospective | All Teams | ⬜ | Week 12 | |

---

## Rollback Plan

If critical issues are discovered during migration:

### Emergency Rollback Procedure

| # | Task | Owner | Estimated Time |
|---|------|-------|----------------|
| 1 | Stop all Azure DevOps pipeline runs | DevOps Lead | 5 minutes |
| 2 | Re-enable GitHub Actions | DevOps Team | 10 minutes |
| 3 | Restore GitHub workflow files | DevOps Team | 10 minutes |
| 4 | Notify all teams | DevOps Lead | 5 minutes |
| 5 | Investigate and document issues | DevOps Team | Varies |
| 6 | Fix issues in Azure DevOps | DevOps Team | Varies |
| 7 | Re-test affected pipelines | DevOps Team | Varies |
| 8 | Retry migration when ready | DevOps Team | Varies |

**Total Emergency Rollback Time:** ~30 minutes to restore service

---

## Success Criteria Checklist

| Category | Criteria | Status |
|----------|----------|--------|
| **Technical** | | |
| | All 14 pipelines migrated and functioning | ⬜ |
| | All secrets in Azure Key Vault | ⬜ |
| | All service connections working | ⬜ |
| | Build success rate ≥ 95% | ⬜ |
| | Build times within 10% of GitHub Actions | ⬜ |
| | Zero production outages | ⬜ |
| **Process** | | |
| | Branch policies enforced | ⬜ |
| | Approval gates working | ⬜ |
| | Notifications functioning | ⬜ |
| | Documentation complete | ⬜ |
| **Team** | | |
| | All teams trained | ⬜ |
| | Developer satisfaction ≥ 80% | ⬜ |
| | Support channels established | ⬜ |

---

## Notes & Lessons Learned

Use this section to document issues encountered and solutions:

### Week 1:
-

### Week 2:
-

### Week 3:
-

### Week 4:
-

### Week 5:
-

### Week 6:
-

### Week 7:
-

### Week 8:
-

---

## Contacts & Escalation

| Role | Name | Contact | Escalation Level |
|------|------|---------|------------------|
| DevOps Lead | | | Primary |
| Platform Lead | | | Primary |
| Security Lead | | | Primary |
| Engineering Manager | | | Secondary |
| CTO | | | Final |

---

## Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-12-02 | 1.0 | Initial checklist created | Migration Team |

---

**Ready to begin migration? Start with Phase 1, Task 1.1.1**

**Estimated Total Duration:** 8 weeks (56 days)
**Estimated Total Effort:** 100-130 hours
**Team Size Required:** 7-10 people (part-time)
