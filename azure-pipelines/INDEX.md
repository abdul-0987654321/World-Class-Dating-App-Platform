# Azure DevOps CI/CD Pipelines - Complete Index

## 📋 Table of Contents

1. [Quick Access](#quick-access)
2. [File Structure](#file-structure)
3. [Pipeline Files](#pipeline-files)
4. [Documentation Files](#documentation-files)
5. [Getting Started](#getting-started)
6. [Common Use Cases](#common-use-cases)

---

## 🚀 Quick Access

### I want to...

**Setup the pipelines for the first time**
→ Read: [QUICK_START.md](./QUICK_START.md) (5-minute setup)
→ Then: [README.md](./README.md) (complete guide)

**Understand variables and configuration**
→ Read: [VARIABLES_REFERENCE.md](./VARIABLES_REFERENCE.md)

**Get a high-level overview**
→ Read: [PIPELINE_SUMMARY.md](./PIPELINE_SUMMARY.md)

**Deploy to development**
→ Use: [cd/deploy-dev.yml](./cd/deploy-dev.yml)

**Deploy to production**
→ Read: Production deployment section in [README.md](./README.md#production-deployment)
→ Use: [cd/deploy-prod.yml](./cd/deploy-prod.yml)

**Troubleshoot a failing pipeline**
→ Check: Troubleshooting section in [README.md](./README.md#troubleshooting)
→ Or: Quick fixes in [QUICK_START.md](./QUICK_START.md#troubleshooting-quick-fixes)

---

## 📁 File Structure

```
azure-pipelines/
│
├── 📂 ci/                              # Continuous Integration Pipelines
│   ├── build-all-services.yml         # Build all 16 microservices
│   ├── test-all-services.yml          # Run all tests (unit, integration, E2E)
│   └── docker-build.yml               # Build and push Docker images
│
├── 📂 cd/                              # Continuous Deployment Pipelines
│   ├── deploy-dev.yml                 # Deploy to Development (automatic)
│   ├── deploy-test.yml                # Deploy to Test/Staging (manual approval)
│   └── deploy-prod.yml                # Deploy to Production (blue-green)
│
├── 📂 templates/                       # Reusable Pipeline Templates
│   ├── node-build-template.yml        # Node.js/TypeScript build steps
│   ├── go-build-template.yml          # Go build steps
│   ├── python-build-template.yml      # Python build steps
│   ├── docker-build-template.yml      # Docker image build and push
│   └── k8s-deploy-template.yml        # Kubernetes deployment steps
│
└── 📄 Documentation/
    ├── INDEX.md                        # This file - Complete index
    ├── README.md                       # Complete documentation (900+ lines)
    ├── QUICK_START.md                  # Quick start guide (450+ lines)
    ├── VARIABLES_REFERENCE.md          # Variables documentation (550+ lines)
    └── PIPELINE_SUMMARY.md             # Overview summary (600+ lines)
```

---

## 🔧 Pipeline Files

### CI Pipelines

#### 1. Build All Services
**File**: `ci/build-all-services.yml`
**Purpose**: Build all microservices
**Triggers**: Push to main, develop, feature/*, hotfix/*
**Duration**: ~10-15 minutes
**Services**: 16 (11 Node.js, 1 Go, 4 Python)

**Key Features**:
- Parallel builds for speed
- Dependency caching
- Linting and code quality
- Artifact publishing

**When to use**:
- Automatic on every commit
- Manual trigger for rebuilds

---

#### 2. Test All Services
**File**: `ci/test-all-services.yml`
**Purpose**: Run comprehensive test suite
**Triggers**: Push to main, develop, feature/*
**Duration**: ~15-20 minutes

**Test Types**:
- Unit tests with coverage
- Integration tests with databases
- E2E tests with Playwright
- Performance tests (on main)
- Security tests (on main)

**When to use**:
- Automatic on pull requests
- Before merging to main

---

#### 3. Docker Build
**File**: `ci/docker-build.yml`
**Purpose**: Build and push Docker images
**Triggers**: Push to main, develop, release/*
**Duration**: ~20-30 minutes
**Output**: 16 Docker images in ACR

**Features**:
- Multi-stage builds
- Multi-tag support (latest, build-id, git-sha)
- Trivy security scanning
- Azure Defender integration

**When to use**:
- Automatic after successful builds
- Manual for hotfix deployments

---

### CD Pipelines

#### 4. Deploy to Development
**File**: `cd/deploy-dev.yml`
**Purpose**: Deploy to dev environment
**Trigger**: Automatic on docker-build completion (develop branch)
**Duration**: ~10-15 minutes
**Approval**: None required

**Stages**:
1. Deploy Infrastructure
2. Deploy Core Services
3. Deploy Business Services
4. Deploy Realtime Services
5. Deploy AI Services
6. Post-Deployment Tests

**When to use**:
- Automatic on merge to develop
- Testing new features

---

#### 5. Deploy to Test/Staging
**File**: `cd/deploy-test.yml`
**Purpose**: Deploy to test environment
**Trigger**: Manual or automatic (main branch)
**Duration**: ~20-30 minutes
**Approval**: DevOps team (24-hour timeout)

**Stages**:
1. Pre-Deployment Approval
2. Backup Databases
3. Deploy Infrastructure
4. Deploy All Services
5. Integration Tests
6. Performance Tests
7. Security Tests

**When to use**:
- Before production release
- QA testing cycles
- Performance validation

---

#### 6. Deploy to Production
**File**: `cd/deploy-prod.yml`
**Purpose**: Deploy to production
**Trigger**: Manual only
**Duration**: ~30-45 minutes
**Approval**: Multi-level (Manager + SRE + CTO)

**Stages**:
1. Pre-Production Checklist
2. Manager Approval
3. Backup Production Data
4. Enable Maintenance Mode
5. Blue-Green Deployment
6. Smoke Test Green Environment
7. Traffic Switch Approval
8. Gradual Traffic Switch (10% → 50% → 100%)
9. Monitor Production (15 min)
10. Cleanup Blue Environment

**When to use**:
- Scheduled production releases
- Emergency hotfixes
- Major version updates

---

## 📝 Documentation Files

### 1. INDEX.md (This File)
**Purpose**: Quick navigation and reference
**Best for**: Finding the right document quickly

### 2. README.md
**Length**: 900+ lines
**Purpose**: Complete pipeline documentation
**Sections**:
- Overview and architecture
- Setup instructions
- Service coverage
- Pipeline features
- Deployment strategies
- Monitoring and security
- Troubleshooting
- Best practices

**Best for**: Complete understanding and setup

### 3. QUICK_START.md
**Length**: 450+ lines
**Purpose**: Fast setup and common tasks
**Sections**:
- 5-minute setup
- Common workflows
- Quick commands
- Decision trees
- Troubleshooting quick fixes
- Emergency procedures

**Best for**: Getting started quickly

### 4. VARIABLES_REFERENCE.md
**Length**: 550+ lines
**Purpose**: Complete variable documentation
**Sections**:
- Variable groups
- Pipeline variables
- Service-specific variables
- Azure Key Vault secrets
- Naming conventions
- Security best practices

**Best for**: Configuration and setup

### 5. PIPELINE_SUMMARY.md
**Length**: 600+ lines
**Purpose**: High-level overview
**Sections**:
- Created files overview
- Services covered
- Pipeline architecture
- Key features
- Deployment strategies
- Setup time estimates
- Success metrics

**Best for**: Understanding scope and capabilities

---

## 🎯 Getting Started

### First-Time Setup (Recommended Order)

1. **Quick Overview** (5 minutes)
   ```
   Read: PIPELINE_SUMMARY.md
   - Understand what was created
   - Review architecture
   - See all features
   ```

2. **Quick Setup** (30 minutes)
   ```
   Read: QUICK_START.md
   - Create service connections
   - Create variable groups
   - Create environments
   - Create pipelines
   ```

3. **Detailed Configuration** (1-2 hours)
   ```
   Read: README.md (Setup section)
   Read: VARIABLES_REFERENCE.md
   - Configure all variables
   - Setup Azure Key Vault
   - Configure approvals
   ```

4. **Testing** (2-3 hours)
   ```
   - Test feature branch build
   - Test develop deployment
   - Test production deployment (dry run)
   ```

5. **Go Live** (1 hour)
   ```
   - Enable automatic triggers
   - Setup monitoring
   - Train team
   ```

**Total Time**: 8-9 hours for complete setup

---

## 💡 Common Use Cases

### Use Case 1: New Feature Development
```yaml
Scenario: Developer working on new feature
Steps:
  1. Create feature branch
  2. Make code changes
  3. Push to GitHub
  4. Build pipeline runs automatically
  5. Test pipeline runs automatically
  6. Create PR when tests pass
  7. Merge to develop
  8. Auto-deploy to Dev environment

Files Used:
  - ci/build-all-services.yml
  - ci/test-all-services.yml
  - cd/deploy-dev.yml
```

### Use Case 2: Release to Production
```yaml
Scenario: Deploying new version to production
Steps:
  1. Merge develop to main
  2. Docker build pipeline runs
  3. Manual trigger: Deploy to Test
  4. DevOps team approves
  5. Integration/Performance tests run
  6. Manual trigger: Deploy to Prod
  7. Manager/SRE/CTO approve
  8. Blue-green deployment starts
  9. Traffic gradually shifts
  10. Monitor for 15 minutes
  11. Cleanup blue environment

Files Used:
  - ci/docker-build.yml
  - cd/deploy-test.yml
  - cd/deploy-prod.yml
```

### Use Case 3: Hotfix Deployment
```yaml
Scenario: Critical bug fix needed in production
Steps:
  1. Create hotfix branch from main
  2. Make minimal fix
  3. Fast-track through environments
  4. Expedited approvals
  5. Deploy to production
  6. Monitor closely

Files Used:
  - ci/build-all-services.yml
  - ci/docker-build.yml
  - cd/deploy-prod.yml (expedited)
```

### Use Case 4: Adding New Service
```yaml
Scenario: Adding a new microservice
Steps:
  1. Create service in backend/services/
  2. Add Dockerfile
  3. Update build pipeline (add job)
  4. Update Docker build (add image)
  5. Update deploy pipelines (add deployment)
  6. Test in dev environment
  7. Deploy through normal flow

Files to Modify:
  - ci/build-all-services.yml
  - ci/docker-build.yml
  - cd/deploy-*.yml
```

### Use Case 5: Rollback Production
```yaml
Scenario: New deployment has issues
Steps:
  1. Identify issue
  2. Check blue environment status
  3. Switch traffic back to blue
  4. Or: Scale down green, scale up blue
  5. Investigate issue
  6. Fix and redeploy

Files Used:
  - cd/deploy-prod.yml (rollback steps)
  - Emergency procedures in QUICK_START.md
```

---

## 🔍 Quick Reference

### What Pipeline Should I Use?

| Goal | Pipeline | Trigger |
|------|----------|---------|
| Build code | `ci/build-all-services.yml` | Auto on push |
| Run tests | `ci/test-all-services.yml` | Auto on push |
| Build Docker images | `ci/docker-build.yml` | Auto on main/develop |
| Deploy to dev | `cd/deploy-dev.yml` | Auto after Docker build |
| Deploy to test | `cd/deploy-test.yml` | Manual |
| Deploy to prod | `cd/deploy-prod.yml` | Manual only |

### What Template Should I Use?

| Service Type | Template | Description |
|--------------|----------|-------------|
| Node.js/TypeScript | `node-build-template.yml` | Build Node.js services |
| Go | `go-build-template.yml` | Build Go services |
| Python | `python-build-template.yml` | Build Python services |
| Any (Docker) | `docker-build-template.yml` | Build Docker images |
| Any (Deploy) | `k8s-deploy-template.yml` | Deploy to Kubernetes |

### What Documentation Should I Read?

| Question | Document |
|----------|----------|
| How do I set this up? | QUICK_START.md |
| What are all the features? | README.md |
| How do I configure variables? | VARIABLES_REFERENCE.md |
| What did you create? | PIPELINE_SUMMARY.md |
| Where do I start? | INDEX.md (this file) |

---

## 📊 Statistics

### Files Created
- **CI Pipelines**: 3 files
- **CD Pipelines**: 3 files
- **Templates**: 5 files
- **Documentation**: 5 files
- **Total**: 16 files

### Lines of Code
- **YAML (Pipelines)**: ~3,170 lines
- **Documentation**: ~2,400 lines
- **Total**: ~5,570 lines

### Services Covered
- **Node.js Services**: 11
- **Go Services**: 1
- **Python Services**: 4
- **Total**: 16 microservices

### Environments
- **Development**: Auto-deploy
- **Test/Staging**: Manual approval
- **Production**: Multi-level approval

---

## 🆘 Need Help?

### By Topic

**Pipeline Not Running**
→ Check: README.md → Troubleshooting → Build Failures

**Tests Failing**
→ Check: README.md → Troubleshooting → Test failures
→ Or: QUICK_START.md → Troubleshooting Quick Fixes

**Deployment Failed**
→ Check: README.md → Troubleshooting → Deployment Failures
→ Or: QUICK_START.md → Emergency Procedures

**Variables Not Working**
→ Check: VARIABLES_REFERENCE.md → Troubleshooting Variables

**Need Quick Answer**
→ Check: QUICK_START.md → Quick Commands

### By Role

**Developer (New to pipelines)**
→ Start: QUICK_START.md
→ Reference: INDEX.md (this file)

**DevOps Engineer (Setting up)**
→ Start: README.md
→ Configure: VARIABLES_REFERENCE.md

**Manager (Understanding scope)**
→ Read: PIPELINE_SUMMARY.md

**SRE (Operations)**
→ Read: README.md → Deployment Strategies
→ Reference: QUICK_START.md → Emergency Procedures

---

## 📞 Support Contacts

| Issue Type | Team | Email |
|------------|------|-------|
| Pipeline Failures | DevOps | devops@flamoral.com |
| Deployment Issues | SRE | sre@flamoral.com |
| Configuration Help | DevOps | devops@flamoral.com |
| Approvals | Engineering Manager | engineering-manager@flamoral.com |
| Production Incidents | On-Call | oncall@flamoral.com |
| Security Concerns | Security | security@flamoral.com |

---

## 🎓 Training Resources

### Self-Paced Learning
1. Read PIPELINE_SUMMARY.md (30 min)
2. Read QUICK_START.md (1 hour)
3. Follow setup steps (2-3 hours)
4. Read README.md sections as needed

### Video Tutorials (To Be Created)
- Pipeline Overview (15 min)
- Quick Setup Guide (30 min)
- Common Workflows (45 min)
- Troubleshooting (30 min)

### Hands-On Labs (To Be Created)
- Lab 1: Build Your First Service
- Lab 2: Deploy to Development
- Lab 3: Production Deployment
- Lab 4: Rollback Scenario

---

## 📅 Version History

### Version 1.0.0 (December 2024)
- Initial release
- 16 pipeline files created
- 5 documentation files
- Complete CI/CD coverage for all services
- Blue-green deployment for production
- Multi-level approval gates
- Comprehensive testing suite

---

## 🚦 Status

**Pipeline Implementation**: ✅ Complete
**Documentation**: ✅ Complete
**Testing**: ⏳ Pending (requires Azure setup)
**Production Ready**: ⏳ After testing and validation

---

## 📌 Bookmarks

### Most Used Files
1. [QUICK_START.md](./QUICK_START.md) - Daily reference
2. [README.md](./README.md) - Complete guide
3. [deploy-dev.yml](./cd/deploy-dev.yml) - Dev deployments
4. [deploy-prod.yml](./cd/deploy-prod.yml) - Prod deployments

### Configuration Files
1. [VARIABLES_REFERENCE.md](./VARIABLES_REFERENCE.md) - All variables
2. [node-build-template.yml](./templates/node-build-template.yml) - Most used template

### Emergency Files
1. [QUICK_START.md → Emergency Procedures](./QUICK_START.md#emergency-procedures)
2. [README.md → Troubleshooting](./README.md#troubleshooting)

---

**Last Updated**: December 2024
**Maintained By**: DevOps Team
**Version**: 1.0.0
