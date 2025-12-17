# CI/CD Pipeline Index - Flamoral Dating Platform

Complete index of all CI/CD pipelines for production deployment.

## Table of Contents

1. [GitHub Actions Workflows](#github-actions-workflows)
2. [Azure DevOps Pipelines](#azure-devops-pipelines)
3. [Pipeline Triggers](#pipeline-triggers)
4. [Quick Start](#quick-start)
5. [Troubleshooting](#troubleshooting)

---

## GitHub Actions Workflows

### Main Pipelines

#### 1. **Main CI Pipeline**
- **File**: `.github/workflows/main-ci.yml`
- **Purpose**: Primary continuous integration pipeline
- **Triggers**: PR to main/develop, push to main/develop
- **Features**:
  - Code quality checks (ESLint, Prettier, TypeScript)
  - Unit tests with coverage (15 services)
  - Integration tests with services (PostgreSQL, Redis, RabbitMQ)
  - Security scanning (CodeQL, Semgrep, Trivy, Snyk, Gitleaks)
  - Dependency vulnerability scanning
  - Docker image building and scanning
  - SBOM generation (SPDX, CycloneDX)
  - Infrastructure validation
  - Performance testing
- **Duration**: ~25-30 minutes
- **Required Secrets**: CODECOV_TOKEN, SNYK_TOKEN, SEMGREP_APP_TOKEN

#### 2. **Unified CI Pipeline** (Legacy)
- **File**: `.github/workflows/unified-ci.yml`
- **Purpose**: Consolidated CI for backward compatibility
- **Status**: Active, will be deprecated in favor of main-ci.yml

### Deployment Pipelines

#### 3. **CD - Development**
- **File**: `.github/workflows/cd-dev.yml`
- **Purpose**: Auto-deploy to development environment
- **Triggers**: Push to develop branch
- **Features**:
  - Automatic deployment on merge
  - Build and push Docker images
  - Deploy infrastructure with Terraform
  - Deploy to AKS with Helm
  - Run database migrations
  - Execute smoke tests
  - Health checks
- **Duration**: ~15-20 minutes
- **Required Secrets**: AZURE_CREDENTIALS_DEV, DEV_API_URL, DEV_WEB_URL

#### 4. **CD - Staging**
- **File**: `.github/workflows/cd-staging.yml`
- **Purpose**: Deploy to staging with comprehensive testing
- **Triggers**: Push to staging/release branches
- **Features**:
  - Release candidate image building
  - Infrastructure deployment
  - E2E tests with Playwright
  - Performance testing with K6
  - Security testing with OWASP ZAP
  - Release candidate creation
- **Duration**: ~30-40 minutes
- **Required Secrets**: AZURE_CREDENTIALS_STAGING, STAGING_URL, STAGING_API_URL

#### 5. **CD - Production**
- **File**: `.github/workflows/unified-cd-production.yml`
- **Purpose**: Production deployment with canary/blue-green
- **Triggers**: Manual workflow_dispatch only
- **Features**:
  - Pre-deployment validation
  - Current state backup
  - Multiple deployment strategies (canary, blue-green, rolling)
  - Progressive rollout (10% → 25% → 50% → 75% → 100%)
  - Database migrations
  - Post-deployment validation
  - GitHub release creation
  - Automated rollback on failure
- **Duration**: ~45-60 minutes
- **Required Secrets**: AZURE_CREDENTIALS, PROD_URL, PROD_API_URL

### Mobile Pipelines

#### 6. **Mobile App CI/CD**
- **File**: `.github/workflows/mobile-cd.yml`
- **Purpose**: Build and deploy iOS and Android apps
- **Triggers**: Push to mobile-app/, PR, workflow_dispatch
- **Features**:
  - TypeScript and lint checks
  - Unit tests with coverage
  - iOS build with Xcode (macOS runner)
  - Android build with Gradle
  - Code signing automation
  - TestFlight deployment (iOS)
  - Play Store deployment (Android)
  - Multi-environment support (dev, staging, production)
- **Duration**: ~30-45 minutes (per platform)
- **Required Secrets**:
  - iOS: IOS_CERTIFICATE_BASE64, APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD
  - Android: ANDROID_KEYSTORE_BASE64, GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
  - EXPO_TOKEN

### Infrastructure Pipelines

#### 7. **Infrastructure Pipeline**
- **File**: `.github/workflows/infrastructure-pipeline.yml`
- **Purpose**: Terraform infrastructure automation
- **Triggers**: Push to infrastructure/, workflow_dispatch
- **Features**:
  - Terraform validation and linting
  - TFLint and Checkov security scanning
  - Cost estimation with Infracost
  - Multi-environment plan/apply (dev, staging, prod)
  - State backup before changes
  - Post-deployment validation
  - AKS, database, and network validation
- **Duration**: ~20-30 minutes
- **Required Secrets**: AZURE_CREDENTIALS_*, INFRACOST_API_KEY

### Release & Maintenance Pipelines

#### 8. **Release Pipeline**
- **File**: `.github/workflows/release-pipeline.yml`
- **Purpose**: Automated release creation
- **Triggers**: Version tags (v*.*.*), workflow_dispatch
- **Features**:
  - Semantic version validation
  - Automated changelog generation
  - Build release artifacts
  - Docker image tagging
  - Helm chart packaging
  - Release documentation generation
  - GitHub release creation
  - NPM package publishing
  - Email and Slack notifications
- **Duration**: ~25-35 minutes
- **Required Secrets**: NPM_TOKEN, EMAIL_USERNAME, EMAIL_PASSWORD

#### 9. **Rollback Pipeline**
- **File**: `.github/workflows/rollback-pipeline.yml`
- **Purpose**: Emergency rollback capability
- **Triggers**: Manual workflow_dispatch only
- **Features**:
  - Multi-environment support
  - Current state backup
  - Traffic shifting (canary rollback)
  - Application rollback with Helm
  - Database restoration
  - Post-rollback validation
  - Incident report generation
- **Duration**: ~10-15 minutes
- **Approval Required**: Yes (environment protection)

### Supporting Pipelines

#### 10. **E2E Tests**
- **File**: `.github/workflows/e2e-tests.yml`
- **Purpose**: End-to-end testing with Playwright

#### 11. **Integration Tests**
- **File**: `.github/workflows/integration-tests.yml`
- **Purpose**: Service integration testing

#### 12. **Performance Tests**
- **File**: `.github/workflows/performance-tests.yml`
- **Purpose**: Load and performance testing

#### 13. **Security Tests**
- **File**: `.github/workflows/security-tests.yml`
- **Purpose**: Dedicated security scanning

#### 14. **Secret Rotation**
- **File**: `.github/workflows/secret-rotation-drift-repair.yml`
- **Purpose**: Automated secret rotation

#### 15. **Self-Healing Agent**
- **File**: `.github/workflows/self-healing-agent.yml`
- **Purpose**: Automated issue detection and remediation

---

## Azure DevOps Pipelines

### Main Pipelines

#### 1. **Main CI Pipeline**
- **File**: `pipelines/azure-pipelines-main-ci.yml`
- **Purpose**: Enterprise CI with comprehensive testing
- **Triggers**: Push to main/develop, PRs
- **Features**:
  - Code quality and linting
  - Unit tests with matrix strategy
  - Security scanning (npm audit, Trivy, Semgrep)
  - Docker image building
  - SBOM generation
- **Duration**: ~20-25 minutes

#### 2. **Main Build Pipeline** (Original)
- **File**: `pipelines/azure-pipelines.yml`
- **Purpose**: Build, test, and container creation
- **Features**:
  - Dependency caching
  - Multi-service Docker builds
  - Security scanning
  - Artifact publishing

#### 3. **CD Pipeline**
- **File**: `pipelines/azure-pipelines-cd.yml`
- **Purpose**: Multi-environment deployment
- **Features**:
  - Environment-specific deployments
  - AKS deployment with Helm
  - Database migrations
  - Smoke tests

#### 4. **Infrastructure Pipeline**
- **File**: `pipelines/azure-pipelines-infra.yml`
- **Purpose**: Terraform infrastructure management
- **Features**:
  - Terraform validation and security scanning
  - Cost estimation with Infracost
  - Multi-environment plan/apply
  - Manual approval for staging/production
  - State backup
  - Post-deployment validation

#### 5. **Complete CD Pipeline**
- **File**: `pipelines/azure-pipelines-complete-cd.yml`
- **Purpose**: End-to-end deployment automation

---

## Pipeline Triggers

### Automatic Triggers

| Event | Pipelines Triggered |
|-------|-------------------|
| PR to `main` | Main CI, Infrastructure Validation |
| Push to `develop` | Main CI, CD-Dev |
| Push to `staging` | Main CI, CD-Staging |
| Push to `main` | Main CI, Infrastructure (plan only) |
| Version tag `v*.*.*` | Release Pipeline |
| Push to `mobile-app/` | Mobile CI/CD |
| Push to `infrastructure/` | Infrastructure Pipeline |

### Manual Triggers

| Pipeline | Use Case |
|----------|----------|
| CD-Production | Production deployments |
| Rollback | Emergency recovery |
| Release | Create new release |
| Infrastructure (apply) | Apply infrastructure changes |
| Mobile (production) | App store deployments |

---

## Quick Start

### First-Time Setup

1. **Configure Secrets**
   ```bash
   # See SECRETS_MANAGEMENT.md for complete list
   gh secret set AZURE_CREDENTIALS_DEV < azure-creds-dev.json
   gh secret set AZURE_CREDENTIALS_STAGING < azure-creds-staging.json
   gh secret set AZURE_CREDENTIALS < azure-creds-prod.json
   ```

2. **Set Up Environments**
   - Go to Repository Settings > Environments
   - Create: `development`, `staging`, `production`
   - Configure protection rules for production

3. **Test Development Pipeline**
   ```bash
   git checkout -b test-pipeline
   git push origin test-pipeline
   # Create PR to develop
   ```

### Common Operations

#### Deploy to Development
```bash
git checkout develop
git merge feature-branch
git push origin develop
# CD-Dev pipeline runs automatically
```

#### Deploy to Staging
```bash
git checkout staging
git merge develop
git push origin staging
# CD-Staging pipeline runs automatically
```

#### Deploy to Production
```bash
# 1. Ensure staging tests passed
# 2. Go to GitHub Actions
# 3. Run "CD - Production" workflow
# 4. Select deployment strategy (canary recommended)
# 5. Provide release candidate tag (e.g., rc-abc123)
# 6. Approve deployment
```

#### Create a Release
```bash
# Tag and push
git tag v1.2.3
git push origin v1.2.3

# Or use workflow dispatch
# Go to Actions > Release Pipeline > Run workflow
```

#### Rollback Production
```bash
# 1. Go to GitHub Actions
# 2. Run "Rollback Pipeline" workflow
# 3. Select environment: production
# 4. Select rollback type: application/database/full
# 5. Approve rollback
```

---

## Troubleshooting

### Common Issues

#### Pipeline Fails at Authentication
**Symptom**: "Error: Unable to authenticate to Azure"

**Solution**:
```bash
# Verify service principal
az ad sp show --id <client-id>

# Test credentials
az login --service-principal \
  -u <client-id> \
  -p <client-secret> \
  --tenant <tenant-id>

# Update secret if needed
gh secret set AZURE_CREDENTIALS < new-credentials.json
```

#### Docker Build Fails
**Symptom**: "Error: Cannot pull base image"

**Solution**:
```bash
# Check Dockerfile exists
ls backend/services/<service>/Dockerfile

# Test build locally
docker build -t test backend/services/<service>

# Check ACR access
az acr login --name flamoralprodacr
```

#### Helm Deployment Fails
**Symptom**: "Error: release failed: timed out waiting"

**Solution**:
```bash
# Check AKS connectivity
az aks get-credentials --resource-group <rg> --name <cluster>
kubectl get nodes

# Check pod status
kubectl get pods -n flamoral-prod

# View pod logs
kubectl logs <pod-name> -n flamoral-prod
```

#### Test Failures
**Symptom**: Unit/integration tests fail in CI but pass locally

**Solution**:
```bash
# Check test database
# Ensure services are running in CI (postgres, redis)

# Run tests with same config as CI
NODE_ENV=test \
DATABASE_URL=postgresql://test:test@localhost:5432/test_db \
npm test
```

### Getting Help

1. **Check Pipeline Logs**: View detailed logs in GitHub Actions
2. **Check Documentation**: See specific pipeline README files
3. **Contact DevOps Team**: devops@flamoral.com
4. **Slack Channel**: #devops-support

### Emergency Contacts

- **On-Call DevOps**: +1-555-FLAMORAL
- **Security Incidents**: security@flamoral.com
- **Production Issues**: #production-incidents (Slack)

---

## Pipeline Health Dashboard

Monitor pipeline health at:
- GitHub: Repository > Actions > Workflows
- Azure DevOps: Pipelines > Runs
- Metrics: grafana.flamoral.com/ci-cd

## Related Documentation

- [SECRETS_MANAGEMENT.md](./SECRETS_MANAGEMENT.md) - Secret configuration guide
- [DEPLOYMENT_AUTOMATION_GUIDE.md](./DEPLOYMENT_AUTOMATION_GUIDE.md) - Deployment procedures
- [QUICK_START.md](./QUICK_START.md) - Quick start guide
- [README.md](./README.md) - Pipeline overview

---

**Last Updated**: December 2024
**Maintained by**: DevOps Team
**Version**: 2.0
