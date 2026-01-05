# Deployment Policy

**Document Owner:** DevOps Team
**Last Updated:** 2026-01-05
**Version:** 1.0.0
**Classification:** Internal

---

## Purpose

This document establishes the deployment policies and procedures for the Flamoral Dating Platform. All team members involved in software delivery must adhere to these policies.

---

## Scope

This policy applies to:
- All production deployments
- Staging and development deployments
- Infrastructure changes (Terraform)
- Database migrations
- Configuration changes
- Hotfix deployments

---

## Deployment Environments

### Environment Hierarchy

| Environment | Purpose | Auto-Deploy | Approval Required |
|-------------|---------|-------------|-------------------|
| Development | Feature testing | Yes | No |
| Staging | Integration testing | Yes (after build passes) | No |
| Production | Live users | No | Yes (2 approvers) |

### Environment Isolation

Each environment operates with:
- Separate AWS accounts/credentials
- Isolated EKS clusters
- Dedicated database instances
- Environment-specific secrets

---

## Deployment Authorization

### Production Deployments

**Required Approvals:** 2 approvers from authorized teams

**Authorized Approvers:**
- DevOps Team (`@flamoral/devops-team`)
- Engineering Leads (`@flamoral/engineering-leads`)

**Approval Process:**
1. All CI checks must pass
2. Staging deployment must succeed and verify
3. Production approval environment triggered
4. Two authorized reviewers must approve in GitHub
5. Deployment proceeds automatically after approval

### Staging Deployments

**Required Approvals:** None (auto-deploy)

**Prerequisites:**
- Build and test jobs must pass
- SAST security scan must pass
- Dependency scan must pass

### Development Deployments

**Required Approvals:** None (auto-deploy)

**Prerequisites:**
- Basic build validation

---

## Change Control

### Standard Changes

Standard changes follow the normal CI/CD pipeline:

1. Create feature branch
2. Implement changes with tests
3. Create pull request
4. Pass all CI checks
5. Obtain required reviews (1 for develop, 2 for main)
6. Merge triggers deployment

### Emergency Changes (Hotfixes)

Emergency changes require expedited review:

1. Create `hotfix/*` branch from `main`
2. Implement minimal fix
3. Create PR with `[HOTFIX]` prefix
4. Obtain 1 approval from on-call engineer
5. Merge to `main` AND `develop`
6. Trigger deployment via workflow_dispatch

**Hotfix Criteria:**
- Production outage
- Security vulnerability actively exploited
- Data integrity issue
- Regulatory compliance violation

---

## Pre-Deployment Requirements

### Security Gates (Mandatory)

| Gate | Tool | Threshold |
|------|------|-----------|
| SAST | Semgrep, CodeQL | No critical findings |
| Dependency Scan | npm audit, Snyk | No critical vulnerabilities |
| Container Scan | Trivy | No critical/high vulnerabilities |
| IaC Scan | tfsec, Checkov | No high severity issues |
| Secret Detection | Gitleaks | No secrets detected |

### Quality Gates (Mandatory)

| Gate | Requirement |
|------|-------------|
| Build | Must compile successfully |
| Tests | All tests must pass |
| Linting | Must pass ESLint rules |
| Type Check | TypeScript must compile |
| Legal Pages | All legal pages must exist and route |

### Staging Verification (Mandatory for Production)

Before production deployment:
- Staging deployment must complete successfully
- All pods must reach Running state
- Rollout status must verify healthy
- Integration tests must pass

---

## Container Image Policy

### Tagging Requirements

**Allowed Tags:**
- SHA commit hash: `abc123def`
- Semantic version: `1.2.3`
- SHA256 digest: `sha256:abc123...`

**Prohibited Tags:**
- `latest` - NEVER use in production
- Mutable tags that can be overwritten

### Image Signing

All production container images must be:
1. Built in CI/CD pipeline (not locally)
2. Scanned for vulnerabilities
3. Signed with Cosign
4. Have SBOM generated

**Verification Command:**
```bash
cosign verify --certificate-identity-regexp='.*' \
  --certificate-oidc-issuer='https://token.actions.githubusercontent.com' \
  ${IMAGE_NAME}@${DIGEST}
```

---

## Infrastructure Changes

### Terraform Policy

**Development Environment:**
- Plan only, apply disabled
- Read-only AWS credentials
- Backend disabled for validation

**Staging Environment:**
- Plan and apply allowed via CI/CD
- Requires successful dev validation
- State stored in S3 with DynamoDB locking

**Production Environment:**
- Terraform apply DISABLED in CI/CD
- Changes via GitOps only
- Manual intervention requires VP approval
- Read-only credentials for drift detection

### Forbidden Providers

The following providers are **FORBIDDEN** in all environments:
- `azurerm`
- `azuread`
- `azurestack`
- Any Azure-related provider

Infrastructure is AWS-ONLY.

---

## Deployment Windows

### Standard Deployments

**Recommended Windows:**
- Tuesday through Thursday
- 9:00 AM - 4:00 PM local time (excluding maintenance windows)

**Avoid:**
- Fridays (unless critical)
- Weekends
- Holiday periods
- Major events

### Scheduled Deployments

The platform has a scheduled production deployment:
- **Time:** 9:00 PM CST (3:00 AM UTC) on deployment days
- **Frequency:** As configured in workflow schedule
- **Trigger:** Automatic if changes accumulated

### Deployment Freeze Periods

No deployments allowed during:
- Designated code freeze periods
- Major marketing campaigns
- System maintenance windows
- Unless emergency hotfix approved

---

## Rollback Policy

### Automatic Rollback

Helm deployments use `--atomic` flag:
- Failed deployments automatically roll back
- No manual intervention required
- Previous release restored

### Manual Rollback

Triggered via workflow_dispatch:

```yaml
Action: rollback
Environment: production
Rollback To: [version or leave empty for previous]
```

**Rollback Authorization:**
- Any DevOps team member
- Engineering lead
- On-call engineer

### Rollback SLA

| Severity | Target Time |
|----------|-------------|
| P1 (Outage) | < 5 minutes |
| P2 (Degraded) | < 15 minutes |
| P3 (Minor) | < 1 hour |

---

## Separation of Duties

### Build vs Deploy

| Role | Build | Deploy Staging | Deploy Production |
|------|-------|----------------|-------------------|
| Developer | Yes | Via CI/CD | Via CI/CD + Approval |
| DevOps | Yes | Yes | Yes + Approval |
| Lead | Yes | Yes | Can approve |

### Infrastructure vs Application

| Role | App Deployment | Terraform Apply |
|------|---------------|-----------------|
| Developer | Via CI/CD | No |
| DevOps | Yes | Yes (dev/staging only) |
| Lead | Yes | Can approve |

---

## Audit and Logging

### Deployment Audit Trail

All deployments are logged:
- GitHub Actions run history
- Helm release history
- CloudWatch logs
- Slack notifications

### Required Logging

Each deployment must record:
- Timestamp (UTC)
- Initiator (GitHub user)
- Commit SHA
- Image digests
- Approval chain
- Outcome (success/failure)

### Retention

- GitHub Actions logs: 90 days
- Helm history: 10 revisions
- CloudWatch logs: 30 days
- Audit logs: 1 year

---

## Compliance Requirements

### SOC 2 Controls

| Control | Implementation |
|---------|---------------|
| CC6.1 | Role-based access via GitHub teams |
| CC6.6 | Deployment approval workflow |
| CC7.1 | CI/CD pipeline enforcement |
| CC8.1 | Change management via PR |

### Security Requirements

| Requirement | Implementation |
|-------------|---------------|
| Least Privilege | Environment-scoped IAM roles |
| Separation of Duties | Build/deploy separation |
| Audit Trail | GitHub Actions + Slack |
| Encryption | In-transit and at-rest |

---

## Responsibilities

### DevOps Team

- Maintain CI/CD pipelines
- Approve production deployments
- Perform emergency rollbacks
- Monitor deployment health

### Engineering Team

- Create quality PRs with tests
- Respond to CI failures
- Provide deployment context
- Participate in post-mortems

### Security Team

- Review security scan results
- Approve security-sensitive changes
- Investigate security findings
- Update security policies

### On-Call Engineer

- Authorize emergency hotfixes
- Perform off-hours rollbacks
- Escalate deployment issues
- Document incidents

---

## Policy Violations

### Consequences

| Violation | Action |
|-----------|--------|
| Bypassing CI/CD | Access review |
| Unauthorized production access | Immediate access revocation |
| Deploying unsigned images | Incident investigation |
| Ignoring security gates | Mandatory training |

### Reporting

Report policy violations to:
- DevOps Team Lead
- Security Team
- Engineering Management

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-05 | DevOps Team | Initial release |

---

## Related Documents

- [Branch Protection Policy](/.github/BRANCH_PROTECTION.md)
- [Rollback Procedures](/docs/operations/rollback-procedures.md)
- [CI/CD Governance Audit](/VERIFICATION/cicd-governance-audit.md)
- [Security Guidelines](/.github/SECURITY.md)

---

**Approval:**

- DevOps Lead: _________________
- Security Lead: _________________
- Engineering VP: _________________
