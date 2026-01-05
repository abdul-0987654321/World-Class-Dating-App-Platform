# Branch Protection and Release Governance

## Overview

This document outlines the branch protection rules and release governance policies for the Flamoral Dating Platform. These policies ensure code quality, security, and controlled deployments.

---

## Branch Protection Rules

### Main Branch (`main`)

The `main` branch is the production-ready branch. All code must pass strict quality gates before merging.

| Rule | Setting |
|------|---------|
| **Require pull request before merging** | Yes |
| **Required approving reviews** | 2 |
| **Dismiss stale pull request approvals when new commits are pushed** | Yes |
| **Require review from Code Owners** | Yes |
| **Require status checks to pass before merging** | Yes |
| **Require branches to be up to date before merging** | Yes |
| **Required status checks** | See below |
| **Require conversation resolution before merging** | Yes |
| **Do not allow bypassing the above settings** | Yes (applies to admins too) |
| **Restrict who can push to matching branches** | DevOps team only |
| **Allow force pushes** | No |
| **Allow deletions** | No |

#### Required Status Checks for `main`
- `SAST Security Scan`
- `Dependency Security Scan`
- `Build & Test`
- `Legal Pages Availability`
- `Security Check`
- `Terraform Provider Guard`
- `IaC Security Scan`

### Develop Branch (`develop`)

The `develop` branch is the integration branch for features.

| Rule | Setting |
|------|---------|
| **Require pull request before merging** | Yes |
| **Required approving reviews** | 1 |
| **Dismiss stale pull request approvals when new commits are pushed** | Yes |
| **Require status checks to pass before merging** | Yes |
| **Required status checks** | Build & Test, UI Component Verification |
| **Allow force pushes** | No |
| **Allow deletions** | No |

### Feature Branches (`feature/*`)

Feature branches have minimal restrictions to allow developer flexibility.

| Rule | Setting |
|------|---------|
| **Allow force pushes** | Yes (by branch owner only) |
| **Allow deletions** | Yes |

---

## GitHub Environments

### Production (`production`)

| Setting | Value |
|---------|-------|
| **Required reviewers** | 2 members of @flamoral/devops-team |
| **Wait timer** | 0 minutes |
| **Deployment branches** | `main` only |
| **Environment secrets** | AWS production credentials |

### Production Approval (`production-approval`)

| Setting | Value |
|---------|-------|
| **Required reviewers** | 2 members of @flamoral/engineering-leads |
| **Wait timer** | 0 minutes |
| **Purpose** | Manual gate before production deployment |

### Staging (`staging`)

| Setting | Value |
|---------|-------|
| **Required reviewers** | None (auto-deploy) |
| **Deployment branches** | `main`, `develop` |
| **Environment secrets** | AWS staging credentials |

### Development (`development`)

| Setting | Value |
|---------|-------|
| **Required reviewers** | None (auto-deploy) |
| **Deployment branches** | All branches |
| **Environment secrets** | AWS development credentials |

---

## Code Owners

The CODEOWNERS file defines required reviewers for specific paths:

```
# Global owners
* @flamoral/engineering-team

# Backend services
/backend/ @flamoral/backend-team
/backend/services/user-service/ @flamoral/auth-team
/backend/services/matching-service/ @flamoral/ml-team
/backend/services/payment-service/ @flamoral/payment-team

# Frontend
/frontend/ @flamoral/frontend-team
/apps/web-app/ @flamoral/web-team
/apps/mobile-app/ @flamoral/mobile-team

# Infrastructure (requires DevOps approval)
/infrastructure/ @flamoral/devops-team
/.github/ @flamoral/devops-team

# Security-sensitive files (requires security team)
**/auth*/ @flamoral/security-team
**/payment*/ @flamoral/security-team @flamoral/payment-team
```

---

## Release Governance

### Versioning

We follow Semantic Versioning (SemVer): `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

### Release Process

1. **Feature Development**
   - Create feature branch from `develop`
   - Implement changes with tests
   - Create PR to `develop`
   - Require 1 approval

2. **Integration**
   - Merge to `develop`
   - Automatic staging deployment
   - Integration testing

3. **Release Candidate**
   - Create PR from `develop` to `main`
   - Require 2 approvals
   - All CI checks must pass

4. **Production Deployment**
   - Merge to `main` triggers pipeline
   - Staging deployment + verification
   - Manual approval gate
   - Production deployment

### Release Checklist

- [ ] All tests passing
- [ ] Security scans completed (no critical/high vulnerabilities)
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Performance benchmarks acceptable
- [ ] Rollback plan documented
- [ ] Stakeholder notification sent

---

## Pipeline Gates

### Gate 1: Code Quality
```
PR Quality Gate Workflow
├── Legal Pages Guard (REQUIRED)
├── API Route Verification
├── UI Component Verification
├── Security Check (REQUIRED)
└── Performance Check
```

### Gate 2: Security
```
SAST Security Scan
├── Semgrep (OWASP, secrets, TypeScript)
├── CodeQL Analysis
├── Trivy Filesystem Scan
├── Gitleaks Secret Detection
└── Hardcoded Secret Check

Dependency Scan
├── npm audit (critical level)
└── Snyk (high severity threshold)
```

### Gate 3: Infrastructure
```
Terraform Guard
├── Azure Provider Block (FORBIDDEN)
├── IaC Security Scan
│   ├── tfsec
│   ├── Checkov
│   └── Trivy IaC
└── Terraform Validate + TFLint
```

### Gate 4: Build
```
Build & Test
├── Dependencies Install
├── Build All Packages
├── Linting
├── Security Abuse Tests
└── Layout Regression Check
```

### Gate 5: Container Security
```
Docker Build
├── Image Build with Labels
├── Trivy Container Scan
├── Push to ECR (SHA digest only)
├── Cosign Image Signing
└── SBOM Generation
```

### Gate 6: Deployment
```
Deploy Pipeline
├── Staging Deployment (REQUIRED)
│   ├── Helm Deploy
│   ├── Rollout Verification
│   └── Integration Tests
├── Production Approval (MANUAL)
│   └── 2 Approvers Required
└── Production Deployment
    ├── Pre-deployment Backup
    ├── Helm Deploy
    ├── Smoke Tests
    └── Health Checks
```

---

## Immutable Deployments

### Docker Image Policy

1. **No `latest` tags in production**
   - All images tagged with SHA digest
   - Format: `image@sha256:abc123...`

2. **Image Signing**
   - All images signed with Cosign
   - Keyless signing via Sigstore

3. **SBOM Generation**
   - SPDX format
   - Uploaded as build artifacts

### Deployment Immutability

- Helm charts use `--atomic` flag
- Failed deployments auto-rollback
- No manual kubectl apply allowed

---

## Emergency Procedures

### Hotfix Process

1. Create branch from `main`: `hotfix/issue-description`
2. Implement fix with tests
3. Fast-track PR (1 approval from on-call)
4. Merge to `main` AND `develop`
5. Deploy via manual workflow dispatch

### Rollback Process

1. Trigger rollback via workflow dispatch
2. Select environment and version
3. Automatic Helm rollback
4. Verification checks run
5. Notify stakeholders

---

## Audit and Compliance

### Audit Trail

- All deployments logged in GitHub Actions
- Helm release history maintained
- Slack notifications for all deployments
- Git commit history preserved

### Compliance Checks

- Weekly identity audit (Cognito groups)
- Daily drift detection (Terraform)
- Continuous security scanning
- Quarterly access review

---

## Contact

- **DevOps Team**: @flamoral/devops-team
- **Security Team**: @flamoral/security-team
- **On-Call**: #oncall-engineering (Slack)
