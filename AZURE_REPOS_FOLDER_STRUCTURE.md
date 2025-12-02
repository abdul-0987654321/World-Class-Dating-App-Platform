# Azure Repos Folder Structure Documentation

**Project:** World-Class Dating App Platform (Flamoral)
**Migration From:** GitHub (https://github.com/oks-citadel/World-Class-Dating-App-Platform)
**Migration To:** Azure Repos (https://dev.azure.com/citadelcloudmanagement/_git/DatingPlatform)

---

## Table of Contents

1. [Current Repository Structure](#current-repository-structure)
2. [Recommended Azure Repos Structure](#recommended-azure-repos-structure)
3. [Files to Exclude](#files-to-exclude)
4. [GitHub-Specific Files Handling](#github-specific-files-handling)
5. [Azure DevOps Equivalents](#azure-devops-equivalents)
6. [Directory Organization Best Practices](#directory-organization-best-practices)

---

## Current Repository Structure

### Root Level Structure

```
World-Class-Dating-App-Platform/
├── .github/                      # GitHub-specific configurations
│   ├── workflows/                # GitHub Actions workflows (30 files)
│   ├── ISSUE_TEMPLATE/           # GitHub issue templates
│   ├── PULL_REQUEST_TEMPLATE/    # GitHub PR templates
│   ├── CODEOWNERS                # Code ownership definitions
│   ├── dependabot.yml            # Dependabot configuration
│   └── SECURITY.md               # Security policy
├── .husky/                       # Git hooks configuration
├── apps/                         # Frontend applications
│   ├── branding/                 # Branding assets
│   ├── mobile-app/               # React Native mobile app
│   ├── web/                      # React web application
│   └── web-app/                  # Additional web app
├── backend/                      # Backend services
│   ├── .claude/                  # Claude AI configurations
│   ├── services/                 # Microservices
│   ├── shared/                   # Shared backend code
│   └── tests/                    # Backend tests
├── database/                     # Database schemas and migrations
│   └── migrations/               # SQL migration files
├── docs/                         # Project documentation
│   ├── adr/                      # Architecture Decision Records
│   ├── advertising-tracking/     # Advertising documentation
│   ├── api/                      # API documentation
│   ├── architecture/             # Architecture diagrams
│   ├── deployment/               # Deployment guides
│   ├── guides/                   # Development guides
│   └── user-guides/              # End-user documentation
├── fixtures/                     # Test fixtures and seed data
├── infrastructure/               # Infrastructure as Code
│   ├── ansible/                  # Ansible playbooks
│   ├── database/                 # Database configurations
│   ├── docker/                   # Docker configurations
│   ├── helm/                     # Helm charts for Kubernetes
│   └── kubernetes/               # Kubernetes manifests
├── k8s/                          # Kubernetes deployment files
├── node_modules/                 # Dependencies (excluded from Git)
├── packages/                     # Shared packages
├── proto/                        # Protocol Buffer definitions
├── scripts/                      # Utility scripts
├── security/                     # Security configurations
├── tests/                        # Root-level tests
├── .dockerignore                 # Docker ignore patterns
├── .editorconfig                 # Editor configuration
├── .env.example                  # Environment variables template
├── .env.staging.example          # Staging environment template
├── .eslintrc.js                  # ESLint configuration
├── .gitignore                    # Git ignore patterns
├── .lintstagedrc.json            # Lint-staged configuration
├── .prettierignore               # Prettier ignore patterns
├── .prettierrc                   # Prettier configuration
├── docker-compose.*.yml          # Docker Compose configurations
├── lerna.json                    # Lerna monorepo configuration
├── package.json                  # Root package configuration
├── tsconfig.base.json            # TypeScript base configuration
└── [Multiple .md documentation files]
```

### Repository Statistics

- **Total Branches:** 2 (main, origin/main)
- **Total Tags:** 0
- **Main Branch:** main
- **Repository Type:** Monorepo with workspaces
- **Package Manager:** Yarn with Lerna
- **Primary Language:** TypeScript/JavaScript
- **Frameworks:** React, React Native, Node.js

---

## Recommended Azure Repos Structure

### Option 1: Direct Migration (Recommended)

**Description:** Migrate the entire repository as-is to Azure Repos, with minimal structural changes.

```
DatingPlatform/                   # Azure Repos root
├── .azuredevops/                 # Azure DevOps specific files (NEW)
│   ├── pipelines/                # Azure Pipelines YAML files
│   │   ├── ci-backend.yml
│   │   ├── ci-frontend.yml
│   │   ├── ci-mobile.yml
│   │   ├── cd-dev.yml
│   │   ├── cd-staging.yml
│   │   ├── cd-production.yml
│   │   └── templates/            # Pipeline templates
│   ├── pull_request_template.md  # PR template
│   └── CODE_REVIEW_GUIDELINES.md
├── .husky/                       # Kept as-is
├── apps/                         # Kept as-is
├── backend/                      # Kept as-is
├── database/                     # Kept as-is
├── docs/                         # Kept as-is
├── fixtures/                     # Kept as-is
├── infrastructure/               # Kept as-is
├── k8s/                          # Kept as-is
├── packages/                     # Kept as-is
├── proto/                        # Kept as-is
├── scripts/                      # Kept as-is
├── security/                     # Kept as-is
├── tests/                        # Kept as-is
├── [All configuration files]     # Kept as-is
└── [All documentation files]     # Kept as-is
```

**Advantages:**
- Minimal migration effort
- Preserves existing structure
- Easy for team to adapt
- No code changes required

**Disadvantages:**
- Still contains .github references in documentation
- May need cleanup of GitHub-specific references

### Option 2: Azure-Optimized Structure

**Description:** Reorganize to align with Azure DevOps best practices.

```
DatingPlatform/
├── .azuredevops/                 # Azure DevOps configurations
│   ├── pipelines/
│   ├── boards/                   # Work item templates
│   └── wiki/                     # Wiki content
├── src/                          # Source code (NEW organization)
│   ├── apps/
│   ├── backend/
│   ├── packages/
│   └── shared/
├── infrastructure/               # All infrastructure code
│   ├── azure/                    # Azure-specific (NEW)
│   ├── docker/
│   ├── kubernetes/
│   └── terraform/
├── docs/                         # Comprehensive documentation
├── tests/                        # All tests
└── scripts/                      # Build and deployment scripts
```

**Advantages:**
- Clean Azure DevOps integration
- Better organization
- Follows Azure best practices

**Disadvantages:**
- Requires significant restructuring
- Potential breaking changes
- Team retraining needed

### Recommendation

**Use Option 1 (Direct Migration)** for the following reasons:

1. Minimal disruption to development workflow
2. Faster migration process
3. Preserves commit history and blame information
4. No risk of breaking existing scripts or CI/CD
5. Can optimize structure gradually after migration

---

## Files to Exclude

### GitHub-Specific Files to Handle

#### Option A: Remove Completely

These files are GitHub-specific and have no value in Azure Repos:

```
.github/workflows/              # GitHub Actions (convert to Azure Pipelines)
.github/dependabot.yml          # Dependabot config (use Azure Repos equivalent)
.github/ISSUE_TEMPLATE/         # GitHub issues (convert to Azure Boards)
.github/PULL_REQUEST_TEMPLATE/  # GitHub PRs (convert to Azure Repos PR template)
```

**How to exclude:**

Create a `.gitattributes` file with:
```
.github/ export-ignore
```

Or manually delete before migration:
```bash
rm -rf .github/workflows
rm -rf .github/ISSUE_TEMPLATE
rm -rf .github/PULL_REQUEST_TEMPLATE
rm .github/dependabot.yml
```

#### Option B: Keep for Reference

Keep GitHub files for reference but move to a separate directory:

```bash
mkdir -p .archive/github-legacy
mv .github/* .archive/github-legacy/
```

**Benefits:**
- Preserves CI/CD configuration for reference
- Helps with Azure Pipelines conversion
- Documents previous workflow

#### Recommended Approach

**Keep the following from .github:**
- `CODEOWNERS` → Convert to Azure Repos Code Reviewers
- `SECURITY.md` → Move to root or docs/
- `pull_request_template.md` → Convert to Azure PR template

**Archive for reference:**
- All workflow files → Convert to Azure Pipelines
- Issue templates → Convert to Azure Boards templates

**Delete entirely:**
- `dependabot.yml` → Use Azure Repos dependency scanning

---

## GitHub-Specific Files Handling

### Detailed Conversion Guide

#### 1. GitHub Actions → Azure Pipelines

**Current GitHub Workflows (30 files):**
- backend-ci.yml
- cd-dev.yml, cd-production.yml, cd-staging.yml
- ci-backend.yml, ci-frontend.yml, ci.yml
- deploy-*.yml (multiple)
- docker-build-push.yml
- e2e-tests.yml, performance-tests.yml, security-tests.yml
- mobile-build.yml
- terraform-*.yml
- And more...

**Conversion Strategy:**

1. **Create Azure Pipeline equivalents:**

```yaml
# .azuredevops/pipelines/ci-backend.yml
trigger:
  branches:
    include:
      - main
      - develop
  paths:
    include:
      - backend/*

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '20.x'
    displayName: 'Install Node.js'

  - script: |
      cd backend
      yarn install
      yarn test
    displayName: 'Run Backend Tests'
```

2. **Use Azure Pipeline Templates for reusability**

3. **Set up multi-stage pipelines:**
   - Build stage
   - Test stage
   - Deploy stage (dev/staging/prod)

#### 2. CODEOWNERS → Azure Code Reviewers

**Current CODEOWNERS file structure:**
```
# Global owners
* @team-leads @senior-devs

# Backend owners
/backend/ @backend-team @lead-backend

# Frontend owners
/apps/web/ @frontend-team @lead-frontend
/apps/mobile/ @mobile-team @lead-mobile

# Infrastructure
/infrastructure/ @devops-team @lead-devops
```

**Azure Repos equivalent:**

Configure in Azure DevOps:
1. Navigate to Project Settings → Repositories → [Repository] → Policies
2. Add branch policies for `main` branch
3. Configure "Automatically include code reviewers"
4. Set up required reviewers by path:
   - `/backend/*` → Backend team (required)
   - `/apps/web/*` → Frontend team (required)
   - `/infrastructure/*` → DevOps team (required)

#### 3. Issue Templates → Azure Boards Templates

Convert GitHub issue templates to Azure Boards work item templates.

**GitHub Issue Template Example:**
```markdown
---
name: Bug report
about: Create a report to help us improve
---

**Describe the bug**
A clear description...

**To Reproduce**
Steps to reproduce...
```

**Azure Boards Equivalent:**
1. Create custom work item type in Azure Boards
2. Add custom fields matching GitHub template structure
3. Configure work item templates for each type

#### 4. Pull Request Template → Azure PR Template

**GitHub PR Template location:**
`.github/pull_request_template.md`

**Azure Repos PR Template location:**
`.azuredevops/pull_request_template.md`

**Content should remain similar but add Azure-specific sections:**

```markdown
## Description
[Description of changes]

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Work Items
Closes #[work_item_id]

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Azure DevOps Checklist
- [ ] Pipeline passes
- [ ] Code coverage maintained/improved
- [ ] Security scan passed
- [ ] All reviewers approved
```

#### 5. Dependabot → Azure Repos Dependency Scanning

**GitHub Dependabot configuration:**
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
```

**Azure Repos equivalent:**

1. **Enable Advanced Security:**
   - Navigate to Project Settings → Repositories
   - Enable "Advanced Security"

2. **Configure dependency scanning in Azure Pipelines:**

```yaml
# .azuredevops/pipelines/security-scan.yml
steps:
  - task: WhiteSource@21
    inputs:
      cwd: '$(System.DefaultWorkingDirectory)'
      projectName: 'DatingPlatform'
```

3. **Alternative: Use npm audit in pipeline:**

```yaml
- script: |
    npm audit --audit-level=moderate
    npm outdated
  displayName: 'Check for vulnerabilities and outdated packages'
```

---

## Azure DevOps Equivalents

### Complete Feature Mapping

| GitHub Feature | Azure DevOps Equivalent | Configuration Location |
|----------------|-------------------------|------------------------|
| GitHub Actions | Azure Pipelines | `.azuredevops/pipelines/` |
| Issues | Azure Boards Work Items | Project → Boards |
| Pull Requests | Pull Requests | Same concept, same UI |
| Projects | Azure Boards | Project → Boards |
| CODEOWNERS | Required Reviewers | Repo → Branch Policies |
| Dependabot | Advanced Security / WhiteSource | Pipeline task |
| GitHub Pages | Azure Static Web Apps | Separate Azure service |
| Releases | Artifacts / Releases | Pipelines → Releases |
| Branch Protection | Branch Policies | Repo Settings |
| Webhooks | Service Hooks | Project Settings |
| Wiki | Azure Wiki | Project → Wiki |

### Key Configuration Files

#### Create .azuredevops Directory

```bash
mkdir -p .azuredevops/pipelines/templates
```

#### Essential Azure DevOps Files

1. **azure-pipelines.yml** (root level, optional)
   - Main pipeline entry point
   - Can reference other pipeline files

2. **.azuredevops/pipelines/ci-backend.yml**
   - Backend continuous integration

3. **.azuredevops/pipelines/ci-frontend.yml**
   - Frontend continuous integration

4. **.azuredevops/pipelines/cd-production.yml**
   - Production deployment pipeline

5. **.azuredevops/pull_request_template.md**
   - PR template for Azure Repos

---

## Directory Organization Best Practices

### 1. Monorepo Structure (Current - Recommended)

**Advantages:**
- Single source of truth
- Shared dependencies
- Atomic commits across projects
- Easier refactoring
- Single CI/CD pipeline

**Best Practices:**
- Use clear directory naming
- Separate concerns (apps, backend, packages)
- Use workspaces (Yarn/npm)
- Configure path-based pipeline triggers

**Azure Repos Configuration:**
```yaml
# Pipeline trigger for specific paths
trigger:
  branches:
    include:
      - main
  paths:
    include:
      - backend/*
    exclude:
      - docs/*
```

### 2. Documentation Organization

**Current structure is good:**
```
docs/
├── adr/                    # Architecture Decision Records
├── api/                    # API documentation
├── architecture/           # Architecture diagrams
├── deployment/             # Deployment guides
├── guides/                 # Development guides
└── user-guides/            # End-user documentation
```

**Enhancement: Add Azure-specific docs:**
```
docs/
├── azure/                  # NEW: Azure DevOps specific
│   ├── pipelines.md
│   ├── boards-setup.md
│   └── security-scanning.md
├── adr/
├── api/
└── [existing directories]
```

### 3. Infrastructure as Code Organization

**Current structure:**
```
infrastructure/
├── ansible/
├── database/
├── docker/
├── helm/
└── kubernetes/
```

**Recommended enhancement:**
```
infrastructure/
├── azure/                  # NEW: Azure-specific
│   ├── arm-templates/      # Azure Resource Manager
│   ├── bicep/              # Azure Bicep files
│   └── terraform/          # Azure provider configs
├── ansible/
├── docker/
├── helm/
├── kubernetes/
└── terraform/              # Multi-cloud terraform
```

### 4. Testing Organization

**Current structure:**
```
tests/
├── [various test files]
backend/tests/
apps/web-app/tests/
```

**Best practice:** Keep tests close to source code
- Unit tests: Same directory as source
- Integration tests: `backend/tests/integration/`
- E2E tests: `tests/e2e/`
- Performance tests: `tests/performance/`
- Security tests: `tests/security/`

### 5. Scripts Organization

**Current:** Mixed scripts at root level

**Recommended organization:**
```
scripts/
├── build/                  # Build scripts
│   ├── build-backend.sh
│   ├── build-frontend.sh
│   └── build-mobile.sh
├── deploy/                 # Deployment scripts
│   ├── deploy-dev.sh
│   ├── deploy-staging.sh
│   └── deploy-prod.sh
├── database/               # Database scripts
│   ├── migrate.sh
│   └── seed.sh
├── dev/                    # Development scripts
│   ├── setup-dev.sh
│   └── generate-certs.sh
└── ci/                     # CI/CD helper scripts
    ├── run-tests.sh
    └── check-coverage.sh
```

---

## Migration Checklist

### Pre-Migration

- [ ] Review and understand current structure
- [ ] Identify GitHub-specific files
- [ ] Plan Azure DevOps equivalents
- [ ] Create backup of repository
- [ ] Document custom workflows

### During Migration

- [ ] Migrate code using migration script
- [ ] Verify all branches transferred
- [ ] Verify all tags transferred
- [ ] Check commit history integrity

### Post-Migration

- [ ] Remove/archive .github directory
- [ ] Create .azuredevops directory
- [ ] Convert GitHub Actions to Azure Pipelines
- [ ] Set up branch policies
- [ ] Configure required reviewers
- [ ] Create PR template
- [ ] Update documentation references
- [ ] Test CI/CD pipelines
- [ ] Train team on new structure

---

## Conclusion

The recommended approach is to:

1. **Migrate the repository as-is** (Option 1)
2. **Archive .github folder** for reference
3. **Create .azuredevops folder** with Azure-specific configurations
4. **Gradually optimize** structure based on team needs

This approach minimizes risk while allowing for continuous improvement.

---

**Last Updated:** December 2025
**Migration Script:** migrate-to-azure-repos.sh
**Related Documents:**
- AZURE_REPOS_BRANCH_POLICIES.md
- AZURE_REPOS_MIGRATION_CHECKLIST.md
