# Azure Repos Branch Policies and Strategy

**Project:** World-Class Dating App Platform (Flamoral)
**Azure Repos:** https://dev.azure.com/citadelcloudmanagement/_git/DatingPlatform
**Document Version:** 1.0
**Last Updated:** December 2025

---

## Table of Contents

1. [Branch Strategy Overview](#branch-strategy-overview)
2. [Branch Naming Conventions](#branch-naming-conventions)
3. [Branch Policies Configuration](#branch-policies-configuration)
4. [Pull Request Policies](#pull-request-policies)
5. [Code Review Requirements](#code-review-requirements)
6. [Build Validation](#build-validation)
7. [Security and Compliance](#security-and-compliance)
8. [Implementation Guide](#implementation-guide)

---

## Branch Strategy Overview

### Git Flow Model (Recommended)

This project should use a modified Git Flow model optimized for continuous delivery:

```
main (production)
  ↑
  └── release/* (release candidates)
        ↑
        └── develop (integration)
              ↑
              ├── feature/* (new features)
              ├── bugfix/* (bug fixes)
              ├── hotfix/* (urgent production fixes)
              └── experimental/* (R&D)
```

### Branch Hierarchy

| Branch Type | Purpose | Protected | Lifetime | Merged To |
|-------------|---------|-----------|----------|-----------|
| `main` | Production code | ✅ Yes | Permanent | N/A |
| `develop` | Integration branch | ✅ Yes | Permanent | `main` |
| `release/*` | Release preparation | ✅ Yes | Temporary | `main` + `develop` |
| `hotfix/*` | Urgent production fixes | ⚠️ Partial | Temporary | `main` + `develop` |
| `feature/*` | New features | ❌ No | Temporary | `develop` |
| `bugfix/*` | Non-urgent bug fixes | ❌ No | Temporary | `develop` |
| `experimental/*` | Research & POCs | ❌ No | Temporary | `develop` (if successful) |

### Current Repository Branches

**Existing Branches:**
- `main` (current default branch)

**Branches to Create:**
```bash
# Create develop branch from main
git checkout -b develop main
git push azure develop

# Create initial branch structure
git checkout -b feature/example develop
git checkout -b release/1.0.0 develop
```

---

## Branch Naming Conventions

### Format Standards

All branch names should follow these conventions:

#### Feature Branches
```
feature/<ticket-id>-<short-description>
feature/AB-1234-user-authentication
feature/AB-5678-video-calling-integration
feature/no-ticket-minor-ui-improvements
```

#### Bug Fix Branches
```
bugfix/<ticket-id>-<short-description>
bugfix/AB-1234-fix-login-error
bugfix/AB-5678-correct-profile-display
```

#### Hotfix Branches
```
hotfix/<ticket-id>-<short-description>
hotfix/AB-1234-critical-payment-bug
hotfix/emergency-security-patch
```

#### Release Branches
```
release/<version>
release/1.0.0
release/1.1.0-beta
release/2.0.0-rc1
```

#### Experimental Branches
```
experimental/<description>
experimental/ai-matching-algorithm
experimental/blockchain-verification
```

### Naming Rules

1. **Use lowercase** for all branch names
2. **Use hyphens** to separate words (not underscores or spaces)
3. **Include ticket ID** when applicable (e.g., from Azure Boards)
4. **Keep it descriptive** but concise (max 50 characters)
5. **Avoid special characters** except hyphens and forward slashes
6. **No personal names** in branch names

**Good Examples:**
- `feature/AB-1234-add-payment-gateway`
- `bugfix/AB-5678-fix-notification-crash`
- `hotfix/critical-database-connection`
- `release/2.0.0`

**Bad Examples:**
- `feature/johns-new-feature` (personal name)
- `bugFix/Payment_Gateway` (mixed case, underscore)
- `add payment` (no prefix, space)
- `feature/ab-1234-add-new-really-cool-payment-gateway-with-stripe-integration` (too long)

---

## Branch Policies Configuration

### Main Branch Protection

**Branch:** `main`

**Required Policies:**

1. **Require a minimum number of reviewers**
   - Minimum reviewers: 2
   - Allow requestors to approve their own changes: ❌ No
   - Prohibit the most recent pusher from approving: ✅ Yes
   - Require review from code owners: ✅ Yes
   - Reset votes when new commits are pushed: ✅ Yes

2. **Check for linked work items**
   - Require: ✅ Yes
   - Type: Any (Bug, User Story, Task, etc.)

3. **Check for comment resolution**
   - Require: ✅ Yes
   - All comments must be resolved before merge

4. **Limit merge types**
   - Allowed types:
     - ✅ Squash merge (recommended for feature branches)
     - ✅ Merge commit (for release branches)
     - ❌ Rebase and fast-forward (disabled)
     - ❌ Rebase with merge commit (disabled)

5. **Build validation**
   - Required builds:
     - CI - Backend Tests
     - CI - Frontend Tests
     - CI - Mobile Build
     - Security Scan
     - Integration Tests
   - Build expiration: 12 hours

6. **Status checks**
   - Required status checks:
     - All CI pipelines must pass
     - Code coverage must not decrease
     - Security scan must pass
     - No critical vulnerabilities

7. **Require branches to be up to date**
   - ✅ Yes (must merge latest changes before completing PR)

8. **Automatically included reviewers**
   - Configure based on file paths (see Code Review Requirements)

**Configuration Steps:**

```bash
# Using Azure CLI (if available)
az repos policy create \
  --organization https://dev.azure.com/citadelcloudmanagement \
  --project DatingPlatform \
  --repository-id <repo-id> \
  --branch main \
  --blocking true \
  --enabled true
```

**Via Azure DevOps UI:**
1. Navigate to Project Settings → Repositories → DatingPlatform
2. Select "Policies" tab
3. Click on "main" branch
4. Configure each policy as specified above

### Develop Branch Protection

**Branch:** `develop`

**Required Policies:**

1. **Require a minimum number of reviewers**
   - Minimum reviewers: 1
   - Allow requestors to approve their own changes: ❌ No
   - Reset votes when new commits are pushed: ✅ Yes

2. **Check for linked work items**
   - Require: ⚠️ Optional (recommended)

3. **Check for comment resolution**
   - Require: ✅ Yes

4. **Build validation**
   - Required builds:
     - CI - Backend Tests
     - CI - Frontend Tests
     - Integration Tests

5. **Limit merge types**
   - Allowed types:
     - ✅ Squash merge
     - ✅ Merge commit
     - ✅ Rebase and fast-forward

### Release Branch Protection

**Branch:** `release/*`

**Required Policies:**

1. **Require a minimum number of reviewers**
   - Minimum reviewers: 2
   - Require review from code owners: ✅ Yes

2. **Check for linked work items**
   - Require: ✅ Yes

3. **Build validation**
   - All CI/CD pipelines must pass
   - E2E tests must pass
   - Performance tests must pass

4. **Limit merge types**
   - ✅ Merge commit only (preserve history)

5. **Additional checks**
   - Version number updated in package.json
   - CHANGELOG.md updated
   - Release notes prepared

---

## Pull Request Policies

### PR Creation Requirements

Before creating a pull request, developers must:

1. **Branch from correct parent**
   - Features: from `develop`
   - Hotfixes: from `main`
   - Bugfixes: from `develop`

2. **Link work items**
   - At least one work item must be linked
   - Use "Fixes #123" or "Closes #123" in description

3. **Update documentation**
   - Update relevant .md files
   - Update API documentation if applicable
   - Update CHANGELOG.md for user-facing changes

4. **Write tests**
   - Unit tests for new code
   - Integration tests for API changes
   - E2E tests for user-facing features

5. **Pass local validation**
   ```bash
   yarn lint:all
   yarn test:all
   yarn build:all
   ```

### PR Template

**Location:** `.azuredevops/pull_request_template.md`

```markdown
## Description
<!-- Provide a detailed description of the changes -->

## Type of Change
- [ ] 🐛 Bug fix (non-breaking change that fixes an issue)
- [ ] ✨ New feature (non-breaking change that adds functionality)
- [ ] 💥 Breaking change (fix or feature that breaks existing functionality)
- [ ] 📝 Documentation update
- [ ] 🔧 Configuration change
- [ ] ♻️ Refactoring (no functional changes)
- [ ] 🎨 UI/UX improvements
- [ ] ⚡ Performance improvement
- [ ] 🔒 Security update

## Related Work Items
<!-- Link related Azure Boards work items -->
Closes AB#1234
Fixes AB#5678

## Changes Made
<!-- List the specific changes made in this PR -->
- Change 1
- Change 2
- Change 3

## Testing Performed
<!-- Describe the testing you performed -->
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed
- [ ] Tested on mobile devices
- [ ] Tested on multiple browsers

### Test Results
<!-- Paste relevant test output or screenshots -->

## Performance Impact
<!-- Describe any performance implications -->
- [ ] No performance impact
- [ ] Performance improved
- [ ] Performance regression (documented and acceptable)

## Security Considerations
<!-- Describe any security implications -->
- [ ] No security impact
- [ ] Security scan passed
- [ ] Reviewed for common vulnerabilities
- [ ] Secrets properly managed

## Database Changes
<!-- If applicable, describe database changes -->
- [ ] No database changes
- [ ] Migration script included
- [ ] Migration tested locally
- [ ] Rollback plan documented

## Deployment Notes
<!-- Any special deployment considerations -->
- [ ] No special deployment steps
- [ ] Environment variables need updating
- [ ] Infrastructure changes required
- [ ] Third-party services affected

## Screenshots/Recordings
<!-- If UI changes, include screenshots or recordings -->

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Dependent changes merged
- [ ] Tests pass locally
- [ ] Linear commit history (squashed if needed)

## Reviewer Notes
<!-- Any specific areas where you want feedback -->

## Post-Merge Actions
<!-- Actions to take after merge -->
- [ ] Update related documentation
- [ ] Notify stakeholders
- [ ] Monitor error logs
- [ ] Update deployment runbook

---

**Related Work Items:** #1234, #5678
**Reviewers:** @backend-team @frontend-team
**Labels:** enhancement, backend, api
```

### PR Review Process

1. **Automated Checks** (Immediate)
   - Linting passes
   - Unit tests pass
   - Build succeeds
   - Code coverage check
   - Security scan

2. **Code Owner Review** (Required)
   - Relevant code owner(s) must approve
   - Based on file paths changed

3. **Peer Review** (Required)
   - At least one peer review required
   - Different from code owner if possible

4. **Integration Tests** (Required)
   - All integration tests must pass
   - No regressions detected

5. **Final Approval** (Required)
   - All comments resolved
   - All checks passed
   - Work items linked
   - Documentation updated

### PR Merge Options

**Squash Merge (Recommended for feature branches):**
```
feature/AB-1234-add-payment → develop (squash)
Result: Single commit on develop
```

**Merge Commit (Recommended for release branches):**
```
release/1.0.0 → main (merge commit)
Result: Preserves complete history
```

**When to use each:**
- **Squash:** Feature branches, bug fixes (keeps history clean)
- **Merge commit:** Release branches, hotfixes (preserves context)

---

## Code Review Requirements

### Automatic Reviewer Assignment

Configure automatic reviewers based on file paths:

| File Path Pattern | Required Reviewers | Number Required |
|-------------------|-------------------|-----------------|
| `/backend/**` | Backend Team | 1 |
| `/apps/web/**` | Frontend Team | 1 |
| `/apps/mobile/**` | Mobile Team | 1 |
| `/infrastructure/**` | DevOps Team | 1 |
| `/database/**` | Database Team + Backend Lead | 2 |
| `/.azuredevops/**` | DevOps Lead | 1 |
| `/security/**` | Security Team | 2 |
| `package.json` | Tech Lead | 1 |
| `*.sql` | Database Team | 1 |
| `docker-compose*.yml` | DevOps Team | 1 |

### Code Review Checklist

Reviewers should verify:

**Code Quality:**
- [ ] Code follows project style guide
- [ ] No code smells or anti-patterns
- [ ] Proper error handling
- [ ] Logging is appropriate
- [ ] No hardcoded values
- [ ] Secrets properly managed

**Testing:**
- [ ] Adequate test coverage
- [ ] Tests are meaningful
- [ ] Edge cases covered
- [ ] Tests are maintainable

**Security:**
- [ ] Input validation present
- [ ] SQL injection prevented
- [ ] XSS prevention in place
- [ ] Authentication/authorization correct
- [ ] Sensitive data encrypted

**Performance:**
- [ ] No obvious performance issues
- [ ] Database queries optimized
- [ ] Caching used appropriately
- [ ] No memory leaks

**Documentation:**
- [ ] Code is self-documenting
- [ ] Complex logic has comments
- [ ] API documentation updated
- [ ] README updated if needed

---

## Build Validation

### Required Pipelines

Configure these pipelines to run on every PR:

#### 1. Backend CI Pipeline

**File:** `.azuredevops/pipelines/ci-backend.yml`

```yaml
trigger:
  branches:
    include:
      - main
      - develop
      - release/*
  paths:
    include:
      - backend/*
      - packages/shared/*

pr:
  branches:
    include:
      - main
      - develop
  paths:
    include:
      - backend/*
      - packages/shared/*

pool:
  vmImage: 'ubuntu-latest'

variables:
  NODE_VERSION: '20.x'

stages:
  - stage: Build
    jobs:
      - job: BuildAndTest
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: $(NODE_VERSION)
            displayName: 'Install Node.js'

          - script: |
              yarn install --frozen-lockfile
            displayName: 'Install dependencies'

          - script: |
              cd backend
              yarn lint
            displayName: 'Lint backend code'

          - script: |
              cd backend
              yarn test --coverage
            displayName: 'Run backend tests'

          - task: PublishCodeCoverageResults@1
            inputs:
              codeCoverageTool: 'Cobertura'
              summaryFileLocation: '$(System.DefaultWorkingDirectory)/backend/coverage/cobertura-coverage.xml'
            displayName: 'Publish code coverage'

          - script: |
              cd backend
              yarn build
            displayName: 'Build backend'

          - task: PublishTestResults@2
            inputs:
              testResultsFormat: 'JUnit'
              testResultsFiles: '**/test-results.xml'
            displayName: 'Publish test results'
```

#### 2. Frontend CI Pipeline

**File:** `.azuredevops/pipelines/ci-frontend.yml`

```yaml
trigger:
  branches:
    include:
      - main
      - develop
      - release/*
  paths:
    include:
      - apps/web/**
      - apps/web-app/**

pr:
  branches:
    include:
      - main
      - develop
  paths:
    include:
      - apps/web/**
      - apps/web-app/**

pool:
  vmImage: 'ubuntu-latest'

stages:
  - stage: Build
    jobs:
      - job: BuildAndTest
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '20.x'
            displayName: 'Install Node.js'

          - script: |
              yarn install --frozen-lockfile
            displayName: 'Install dependencies'

          - script: |
              cd apps/web-app
              yarn lint
            displayName: 'Lint frontend code'

          - script: |
              cd apps/web-app
              yarn test
            displayName: 'Run frontend tests'

          - script: |
              cd apps/web-app
              yarn build
            displayName: 'Build frontend'
```

#### 3. Mobile Build Pipeline

**File:** `.azuredevops/pipelines/ci-mobile.yml`

```yaml
trigger:
  branches:
    include:
      - main
      - develop
  paths:
    include:
      - apps/mobile-app/**

pr:
  branches:
    include:
      - main
      - develop
  paths:
    include:
      - apps/mobile-app/**

pool:
  vmImage: 'macOS-latest'

stages:
  - stage: BuildIOS
    jobs:
      - job: BuildIOSApp
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '20.x'
            displayName: 'Install Node.js'

          - script: |
              cd apps/mobile-app
              yarn install
            displayName: 'Install dependencies'

          - script: |
              cd apps/mobile-app/ios
              pod install
            displayName: 'Install iOS pods'

          - script: |
              cd apps/mobile-app
              yarn test
            displayName: 'Run tests'
```

#### 4. Security Scan Pipeline

**File:** `.azuredevops/pipelines/security-scan.yml`

```yaml
trigger: none

pr:
  branches:
    include:
      - main
      - develop

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '20.x'
    displayName: 'Install Node.js'

  - script: |
      yarn install --frozen-lockfile
    displayName: 'Install dependencies'

  - script: |
      npm audit --audit-level=moderate
    displayName: 'NPM security audit'

  - script: |
      yarn test:security
    displayName: 'Run security tests'

  - task: whitesource@21
    inputs:
      projectName: 'DatingPlatform'
    displayName: 'WhiteSource security scan'
    continueOnError: false
```

### Branch Policy Configuration for Build Validation

**Configure in Azure DevOps:**

1. Navigate to: Project Settings → Repositories → DatingPlatform → Policies
2. Select `main` branch
3. Click "Add build policy"
4. Add each pipeline:
   - Path filter: Configure based on what the pipeline tests
   - Build expiration: 12 hours
   - Required: Yes

**Build Policy Configuration:**

```
Pipeline: ci-backend.yml
Display name: Backend CI
Path filter: /backend/*;/packages/shared/*
Build expiration: 12 hours
Required: Yes

Pipeline: ci-frontend.yml
Display name: Frontend CI
Path filter: /apps/web/*;/apps/web-app/*
Build expiration: 12 hours
Required: Yes

Pipeline: ci-mobile.yml
Display name: Mobile Build
Path filter: /apps/mobile-app/*
Build expiration: 12 hours
Required: Yes

Pipeline: security-scan.yml
Display name: Security Scan
Path filter: *
Build expiration: 24 hours
Required: Yes
```

---

## Security and Compliance

### Required Security Policies

1. **Credential Scanning**
   - Enable: Azure DevOps credential scanner
   - Block commits containing secrets
   - Alert on suspicious patterns

2. **Dependency Scanning**
   - Run npm audit on every PR
   - Block PRs with critical vulnerabilities
   - Weekly dependency update reviews

3. **Code Scanning**
   - Static analysis (ESLint, TypeScript)
   - Security-focused linting rules
   - OWASP Top 10 checks

4. **Branch Protection**
   - No direct commits to main/develop
   - Signed commits required (optional)
   - Branch deletion protection

### Compliance Requirements

1. **Audit Trail**
   - All changes traceable to work items
   - Code review evidence preserved
   - Deployment history maintained

2. **Change Control**
   - Production changes require approval
   - Emergency hotfix process documented
   - Rollback procedures tested

3. **Documentation**
   - Architecture decisions recorded (ADRs)
   - Security reviews documented
   - Compliance evidence maintained

---

## Implementation Guide

### Step-by-Step Setup

#### Step 1: Create Branch Structure

```bash
# Clone the repository
git clone https://dev.azure.com/citadelcloudmanagement/_git/DatingPlatform
cd DatingPlatform

# Create develop branch
git checkout -b develop main
git push origin develop

# Set develop as default branch (optional)
# Do this in Azure DevOps UI:
# Project Settings → Repositories → DatingPlatform → Branches → Set develop as default
```

#### Step 2: Configure Main Branch Policies

1. Go to: Azure DevOps → Project Settings → Repositories → DatingPlatform
2. Click "Policies" tab
3. Find "main" branch and click it
4. Configure policies as detailed in "Main Branch Protection" section above

**Quick Configuration Checklist:**
- [ ] Minimum 2 reviewers required
- [ ] Requestor cannot approve own changes
- [ ] Code owners required
- [ ] Linked work items required
- [ ] Comment resolution required
- [ ] Build validation configured
- [ ] Squash merge only allowed

#### Step 3: Configure Develop Branch Policies

1. Same location as Step 2
2. Find "develop" branch
3. Configure with lighter requirements (1 reviewer minimum)

#### Step 4: Configure Code Reviewers by Path

1. Go to: Project Settings → Repositories → DatingPlatform → Policies → main
2. Scroll to "Automatically included reviewers"
3. Click "Add automatic reviewers"
4. Configure for each path:

```
Path: /backend/*
Reviewers: Backend Team
Policy: Required
Minimum: 1

Path: /apps/web/*
Reviewers: Frontend Team
Policy: Required
Minimum: 1

Path: /apps/mobile-app/*
Reviewers: Mobile Team
Policy: Required
Minimum: 1

Path: /infrastructure/*
Reviewers: DevOps Team
Policy: Required
Minimum: 1
```

#### Step 5: Create Pipeline Files

Create the following pipeline files:

```bash
# Create .azuredevops directory
mkdir -p .azuredevops/pipelines/templates

# Create pipeline files
touch .azuredevops/pipelines/ci-backend.yml
touch .azuredevops/pipelines/ci-frontend.yml
touch .azuredevops/pipelines/ci-mobile.yml
touch .azuredevops/pipelines/security-scan.yml
touch .azuredevops/pipelines/cd-production.yml
```

Copy the YAML content from the "Build Validation" section above.

#### Step 6: Create and Link Pipelines

1. Go to: Pipelines → New Pipeline
2. Select "Azure Repos Git"
3. Select "DatingPlatform" repository
4. Select "Existing Azure Pipelines YAML file"
5. Choose the pipeline file (e.g., `.azuredevops/pipelines/ci-backend.yml`)
6. Save and run
7. Repeat for each pipeline

#### Step 7: Add Build Validation to Branch Policies

1. Go to: Project Settings → Repositories → DatingPlatform → Policies → main
2. Scroll to "Build validation"
3. Click "Add build policy"
4. Select each pipeline and configure:
   - Display name: Descriptive name
   - Build expiration: 12 hours
   - Path filter: Relevant paths
   - Required: Yes

#### Step 8: Create PR Template

```bash
# Create PR template
touch .azuredevops/pull_request_template.md
```

Copy the PR template content from the "PR Template" section above.

#### Step 9: Configure Service Hooks (Optional)

1. Go to: Project Settings → Service Hooks
2. Add notifications for:
   - PR created → Slack/Teams notification
   - PR approved → Slack/Teams notification
   - Build failed → Email notification
   - Security scan failed → Email + Slack

#### Step 10: Team Training

1. Document the new workflow
2. Create training materials
3. Hold team meeting to explain:
   - New branch strategy
   - PR process
   - Code review expectations
   - Pipeline usage

### Verification Checklist

After setup, verify:

- [ ] Cannot push directly to main
- [ ] Cannot push directly to develop
- [ ] PR requires minimum reviewers
- [ ] PR requires linked work items
- [ ] PR triggers required pipelines
- [ ] All pipelines pass before merge allowed
- [ ] Code owners automatically added as reviewers
- [ ] Comments must be resolved before merge
- [ ] PR template appears when creating PR
- [ ] Squash merge is default for feature branches
- [ ] Branch naming convention is understood by team

---

## Common Workflows

### Creating a Feature

```bash
# 1. Update develop branch
git checkout develop
git pull origin develop

# 2. Create feature branch
git checkout -b feature/AB-1234-add-payment-gateway

# 3. Make changes and commit
git add .
git commit -m "feat: add Stripe payment gateway integration"

# 4. Push to Azure Repos
git push origin feature/AB-1234-add-payment-gateway

# 5. Create PR in Azure DevOps
# - Go to Repos → Pull Requests → New Pull Request
# - Source: feature/AB-1234-add-payment-gateway
# - Target: develop
# - Link work item AB-1234
# - Add description using template
# - Add reviewers (or auto-assigned)

# 6. Address review comments
git commit -m "fix: address review comments"
git push origin feature/AB-1234-add-payment-gateway

# 7. After approval and pipeline success
# - Squash merge through Azure DevOps UI
# - Delete source branch (automatic)
```

### Creating a Release

```bash
# 1. Create release branch from develop
git checkout develop
git pull origin develop
git checkout -b release/1.0.0

# 2. Update version numbers
npm version 1.0.0
# Update CHANGELOG.md
# Update version in package.json

# 3. Push release branch
git push origin release/1.0.0

# 4. Create PR to main
# - Source: release/1.0.0
# - Target: main
# - Run full test suite
# - Require 2+ approvals

# 5. After approval, merge to main
# - Use merge commit (preserve history)

# 6. Merge back to develop
git checkout develop
git merge release/1.0.0
git push origin develop

# 7. Tag the release
git checkout main
git pull origin main
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# 8. Delete release branch
git branch -d release/1.0.0
git push origin --delete release/1.0.0
```

### Creating a Hotfix

```bash
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/AB-9999-critical-payment-bug

# 2. Make urgent fix
git add .
git commit -m "fix: resolve critical payment processing bug"

# 3. Push and create PR to main
git push origin hotfix/AB-9999-critical-payment-bug

# 4. After approval, merge to main
# - Expedited review process
# - Still require security scan

# 5. Merge to develop
git checkout develop
git merge hotfix/AB-9999-critical-payment-bug
git push origin develop

# 6. Tag the hotfix
git checkout main
git tag -a v1.0.1 -m "Hotfix: critical payment bug"
git push origin v1.0.1
```

---

## Troubleshooting

### Common Issues

**Issue:** Cannot push to main/develop
**Solution:** Create a PR instead. Direct pushes are blocked by policy.

**Issue:** PR cannot be completed - missing reviewers
**Solution:** Ensure all required reviewers have approved based on file paths changed.

**Issue:** Build validation failing
**Solution:** Run tests locally first with `yarn test:all`. Check pipeline logs for specific errors.

**Issue:** Work item not linking
**Solution:** Use "Fixes AB#1234" or "Closes AB#1234" in PR description or commit message.

**Issue:** Cannot squash merge
**Solution:** Ensure branch is up to date with target. Resolve any conflicts first.

---

## Conclusion

This branch strategy and policy configuration ensures:

- ✅ Code quality through mandatory reviews
- ✅ Security through automated scanning
- ✅ Stability through protected branches
- ✅ Traceability through work item links
- ✅ Compliance through documented processes

**Related Documents:**
- AZURE_REPOS_FOLDER_STRUCTURE.md
- AZURE_REPOS_MIGRATION_CHECKLIST.md
- migrate-to-azure-repos.sh

---

**Last Updated:** December 2025
**Version:** 1.0
**Owner:** DevOps Team
