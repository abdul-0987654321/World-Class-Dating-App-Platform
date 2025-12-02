# GitHub Cleanup Checklist
**Project:** World-Class Dating App Platform
**Purpose:** Post-migration cleanup after successful Azure DevOps cutover

---

## Overview

This checklist guides the cleanup process after successfully migrating from GitHub Actions to Azure DevOps. The goal is to archive deprecated CI/CD artifacts while preserving the repository for source code management.

**Timing:** Execute this checklist 30 days after successful Azure DevOps migration
**Risk Level:** Medium (can cause disruption if executed prematurely)

---

## Phase 1: Pre-Cleanup Validation (Week 1 Post-Migration)

### 1.1 Verify Migration Success

| # | Task | Owner | Status | Verification | Notes |
|---|------|-------|--------|--------------|-------|
| 1.1.1 | Confirm all Azure DevOps pipelines running successfully | DevOps Team | ⬜ | Check last 30 days of runs | Must be 100% functional |
| 1.1.2 | Verify no active GitHub Actions runs | DevOps Team | ⬜ | Check Actions tab | Should be empty |
| 1.1.3 | Confirm all deployments using Azure DevOps | DevOps Team | ⬜ | Review deployment logs | Zero GitHub deploys |
| 1.1.4 | Verify team adoption rate | DevOps Lead | ⬜ | Survey teams | ≥90% comfortable with Azure DevOps |
| 1.1.5 | Check for any GitHub Actions dependencies | DevOps Team | ⬜ | Review codebase | Document any found |
| 1.1.6 | Get sign-off from all team leads | DevOps Lead | ⬜ | Written approval | Backend, Frontend, Mobile, QA, Platform |

**Verification Command:**
```bash
# Check if any GitHub Actions workflows ran in last 30 days
gh run list --limit 100 --json workflowName,status,createdAt
```

**Proceed only if all items above are verified ✅**

---

## Phase 2: Archive Workflow Files (Day 31)

### 2.1 Create Archive Directory

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 2.1.1 | Create `.github/workflows-archived/` directory | DevOps Team | ⬜ | |
| 2.1.2 | Add README to archive explaining migration | DevOps Team | ⬜ | See template below |
| 2.1.3 | Document archive date and reason | DevOps Team | ⬜ | |

**Archive README Template:**
```markdown
# Archived GitHub Actions Workflows

These workflow files were archived on [DATE] after successful migration to Azure DevOps.

## Why Archived?
Our CI/CD pipelines have been migrated to Azure DevOps for better integration with Azure cloud services.

## Azure DevOps Location
All pipelines are now available at: https://dev.azure.com/dating-app-org/dating-app-platform/_build

## Files Archived
- All files in this directory were previously active in `.github/workflows/`
- Archive Date: [DATE]
- Last GitHub Actions Run: [DATE]

## Need to Reference?
These files are preserved for historical reference. The Azure DevOps equivalents can be found in the `azure-pipelines/` directory in the repository root.

## Questions?
Contact DevOps Team: [contact info]
```

---

### 2.2 Move Workflow Files

| # | Workflow File | New Location | Owner | Status | Notes |
|---|---------------|--------------|-------|--------|-------|
| 2.2.1 | `backend-ci.yml` | `.github/workflows-archived/` | DevOps Team | ⬜ | Legacy duplicate |
| 2.2.2 | `ci-backend.yml` | `.github/workflows-archived/` | DevOps Team | ⬜ | Primary backend CI |
| 2.2.3 | `ci-frontend.yml` | `.github/workflows-archived/` | DevOps Team | ⬜ | |
| 2.2.4 | `docker-build-push.yml` | `.github/workflows-archived/` | DevOps Team | ⬜ | |
| 2.2.5 | `terraform-plan.yml` | `.github/workflows-archived/` | DevOps Team | ⬜ | |
| 2.2.6 | `terraform-apply.yml` | `.github/workflows-archived/` | DevOps Team | ⬜ | |
| 2.2.7 | `helm-deploy.yml` | `.github/workflows-archived/` | DevOps Team | ⬜ | |
| 2.2.8 | `cd-dev.yml` | `.github/workflows-archived/` | DevOps Team | ⬜ | |
| 2.2.9 | `cd-staging.yml` | `.github/workflows-archived/` | DevOps Team | ⬜ | |
| 2.2.10 | `cd-production.yml` | `.github/workflows-archived/` | DevOps Team | ⬜ | |
| 2.2.11 | `e2e-tests.yml` | `.github/workflows-archived/` | DevOps Team | ⬜ | |
| 2.2.12 | `performance-tests.yml` | `.github/workflows-archived/` | DevOps Team | ⬜ | |
| 2.2.13 | `security-tests.yml` | `.github/workflows-archived/` | DevOps Team | ⬜ | |
| 2.2.14 | `infrastructure-tests.yml` | `.github/workflows-archived/` | DevOps Team | ⬜ | |
| 2.2.15 | `mobile-build.yml` | `.github/workflows-archived/` | DevOps Team | ⬜ | |

**Archive Command:**
```bash
# Create archive directory
mkdir -p .github/workflows-archived

# Move workflow files
mv .github/workflows/*.yml .github/workflows-archived/

# Add archive README
cat > .github/workflows-archived/README.md << 'EOF'
[Insert Archive README Template]
EOF

# Commit changes
git add .github/workflows-archived/
git commit -m "Archive GitHub Actions workflows after Azure DevOps migration"
```

**Verification:**
- `.github/workflows/` directory is empty (except README if desired)
- All workflow files in `.github/workflows-archived/`
- Archive README present

---

## Phase 3: Disable GitHub Actions (Day 31)

### 3.1 Repository Settings

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 3.1.1 | Navigate to Repository → Settings → Actions | DevOps Team | ⬜ | |
| 3.1.2 | Select "Disable Actions for this repository" | DevOps Team | ⬜ | Or "Allow [organization] actions and reusable workflows" if using other repos |
| 3.1.3 | Save settings | DevOps Team | ⬜ | |
| 3.1.4 | Verify Actions tab shows disabled message | DevOps Team | ⬜ | |
| 3.1.5 | Document settings change | DevOps Team | ⬜ | |

**Alternative (Less Restrictive):**
If you still use GitHub Actions for other purposes (e.g., dependency updates, issue triage):
- Keep Actions enabled
- Just archive workflow files
- GitHub Actions won't run without workflow files

---

### 3.2 Remove GitHub Actions from Branch Protection

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 3.2.1 | Navigate to Settings → Branches → Branch protection rules | DevOps Team | ⬜ | |
| 3.2.2 | Edit protection rule for `main` branch | DevOps Team | ⬜ | |
| 3.2.3 | Remove all GitHub Actions status checks | DevOps Team | ⬜ | Remove: backend-ci, frontend-ci, etc. |
| 3.2.4 | (Optional) Add Azure Pipelines status checks | DevOps Team | ⬜ | If integrated |
| 3.2.5 | Save changes | DevOps Team | ⬜ | |
| 3.2.6 | Repeat for `develop` branch | DevOps Team | ⬜ | |
| 3.2.7 | Verify PRs can be merged without GitHub Actions | DevOps Team | ⬜ | Test with a dummy PR |

---

## Phase 4: Clean Up Secrets (Day 32)

### 4.1 Identify Secrets to Remove

**CI/CD Secrets (Can be removed):**
| Secret Name | Purpose | Keep/Remove | Notes |
|-------------|---------|-------------|-------|
| DOCKER_PASSWORD | Docker Hub (now using ACR) | Remove | After verifying ACR works |
| EXPO_TOKEN | Mobile builds (now in Azure) | Remove | After mobile builds work in Azure |
| SLACK_WEBHOOK_URL | Notifications (now in Azure) | Remove | After Azure notifications work |
| SLACK_SECURITY_WEBHOOK | Security notifications | Remove | After Azure notifications work |

**Azure Secrets (Keep for now):**
| Secret Name | Purpose | Keep/Remove | Notes |
|-------------|---------|-------------|-------|
| AZURE_CLIENT_ID | Azure SP (may be needed) | Keep | Used by service connections |
| AZURE_CLIENT_SECRET | Azure SP | Keep | Used by service connections |
| AZURE_SUBSCRIPTION_ID | Azure sub | Keep | Used by service connections |
| AZURE_TENANT_ID | Azure tenant | Keep | Used by service connections |
| AZURE_CREDENTIALS | Legacy Azure creds JSON | Remove | After verifying service connections work |

**Third-Party Secrets (Evaluate individually):**
| Secret Name | Purpose | Keep/Remove | Notes |
|-------------|---------|-------------|-------|
| SNYK_TOKEN | Security scanning | Keep | May be used elsewhere |
| GITHUB_TOKEN | Automatic, can't remove | Keep | Built-in |

---

### 4.2 Remove Obsolete Secrets

| # | Task | Owner | Status | Verification | Notes |
|---|------|-------|--------|--------------|-------|
| 4.2.1 | Verify all Azure DevOps pipelines use Key Vault | DevOps Team | ⬜ | Check last 7 days | No secret fetch from GitHub |
| 4.2.2 | Document which secrets to remove | DevOps Team | ⬜ | Create list | Conservative approach |
| 4.2.3 | Remove DOCKER_PASSWORD | DevOps Team | ⬜ | ACR is working | |
| 4.2.4 | Remove AZURE_CREDENTIALS (legacy) | DevOps Team | ⬜ | Service connections work | |
| 4.2.5 | Remove EXPO_TOKEN | Mobile Team | ⬜ | Mobile builds work in Azure | |
| 4.2.6 | Remove SLACK_WEBHOOK_URL | DevOps Team | ⬜ | Azure notifications work | |
| 4.2.7 | Remove SLACK_SECURITY_WEBHOOK | DevOps Team | ⬜ | Azure notifications work | |
| 4.2.8 | Keep Azure SP secrets for now | DevOps Team | ⬜ | May be needed for other tools | Re-evaluate in 90 days |
| 4.2.9 | Document retained secrets | Security Team | ⬜ | Update secrets inventory | |

**Warning:** Be conservative with secret removal. Verify Azure DevOps doesn't use them before deleting.

**Removal Process:**
1. Navigate to Repository → Settings → Secrets and variables → Actions
2. Click "Remove" next to each secret
3. Confirm removal
4. Document removal date

---

## Phase 5: Update Documentation (Day 32-33)

### 5.1 Update README

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 5.1.1 | Remove GitHub Actions badges | DevOps Team | ⬜ | |
| 5.1.2 | Add Azure DevOps badges | DevOps Team | ⬜ | See template below |
| 5.1.3 | Update CI/CD section to reference Azure DevOps | DevOps Team | ⬜ | |
| 5.1.4 | Add link to Azure DevOps pipelines | DevOps Team | ⬜ | |
| 5.1.5 | Update deployment instructions | DevOps Team | ⬜ | |
| 5.1.6 | Remove references to GitHub Actions commands | DevOps Team | ⬜ | |

**Azure DevOps Badge Template:**
```markdown
## CI/CD Status

[![Build Status](https://dev.azure.com/dating-app-org/dating-app-platform/_apis/build/status/backend-ci?branchName=main)](https://dev.azure.com/dating-app-org/dating-app-platform/_build/latest?definitionId=<ID>&branchName=main)

[![Deployment Status](https://vsrm.dev.azure.com/dating-app-org/_apis/public/Release/badge/dating-app-platform/<releaseDefinitionId>/<environmentId>)](https://dev.azure.com/dating-app-org/dating-app-platform/_release)

### Pipelines
- [Backend CI](https://dev.azure.com/dating-app-org/dating-app-platform/_build?definitionId=<ID>)
- [Frontend CI](https://dev.azure.com/dating-app-org/dating-app-platform/_build?definitionId=<ID>)
- [Docker Build](https://dev.azure.com/dating-app-org/dating-app-platform/_build?definitionId=<ID>)
- [Deployments](https://dev.azure.com/dating-app-org/dating-app-platform/_release)
```

---

### 5.2 Update Contributing Guidelines

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 5.2.1 | Update CONTRIBUTING.md with Azure DevOps instructions | DevOps Team | ⬜ | |
| 5.2.2 | Remove GitHub Actions workflow contribution guides | DevOps Team | ⬜ | |
| 5.2.3 | Add Azure Pipelines YAML contribution guides | DevOps Team | ⬜ | |
| 5.2.4 | Update PR checklist | DevOps Team | ⬜ | |

---

### 5.3 Update Other Documentation

| # | Document | Task | Owner | Status |
|---|----------|------|-------|--------|
| 5.3.1 | Architecture Diagrams | Update CI/CD section | DevOps Team | ⬜ |
| 5.3.2 | Developer Onboarding | Replace GitHub Actions with Azure DevOps | DevOps Team | ⬜ |
| 5.3.3 | Deployment Runbooks | Update all references | DevOps Team | ⬜ |
| 5.3.4 | Troubleshooting Guides | Replace GitHub Actions troubleshooting | DevOps Team | ⬜ |
| 5.3.5 | Team Wiki | Update all CI/CD pages | DevOps Team | ⬜ |

---

## Phase 6: Communication (Day 33)

### 6.1 Announce Cleanup

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 6.1.1 | Send email to engineering team | DevOps Lead | ⬜ | See template below |
| 6.1.2 | Post announcement in Slack channels | DevOps Team | ⬜ | #engineering, #devops, #general |
| 6.1.3 | Update company wiki/handbook | DevOps Team | ⬜ | |
| 6.1.4 | Hold Q&A session (optional) | DevOps Lead | ⬜ | If requested |

**Email Template:**
```
Subject: GitHub Actions Cleanup Complete - Azure DevOps Migration Finalized

Hi Team,

Following our successful migration to Azure DevOps 30 days ago, we have completed the GitHub Actions cleanup:

✅ What Changed:
- GitHub Actions workflows archived to .github/workflows-archived/
- GitHub Actions disabled in repository settings
- CI/CD secrets migrated to Azure Key Vault
- README and documentation updated

✅ What Stays the Same:
- GitHub repository remains active for source code
- Pull request workflow unchanged
- Issue tracking unchanged
- Code review process unchanged

✅ New CI/CD Location:
All pipelines now run in Azure DevOps: https://dev.azure.com/dating-app-org/dating-app-platform

📚 Updated Documentation:
- README: [link]
- Pipeline Documentation: [link]
- Troubleshooting Guide: [link]

❓ Questions?
Contact #devops-support or email devops-team@company.com

Thank you for your support during this migration!

DevOps Team
```

---

## Phase 7: What to Keep (Permanent)

### 7.1 Keep for Source Code Management

| Feature | Keep/Remove | Reason |
|---------|-------------|--------|
| **GitHub Repository** | ✅ Keep | Primary source code repository |
| **Git Branches** | ✅ Keep | Version control |
| **Pull Requests** | ✅ Keep | Code review process |
| **Issues** | ✅ Keep | Issue tracking (unless using Azure Boards) |
| **Discussions** | ✅ Keep | Team discussions |
| **Wiki** | ✅ Keep | Documentation (unless migrating to Azure Wiki) |
| **Projects** | Evaluate | Consider Azure Boards migration |
| **GitHub Packages** | Evaluate | Consider Azure Artifacts migration |

---

### 7.2 Keep for Collaboration

| Feature | Keep/Remove | Reason | Notes |
|---------|-------------|--------|-------|
| **Branch Protection Rules** | ✅ Keep (update) | Protect main/develop | Remove GitHub Actions checks, keep review requirements |
| **CODEOWNERS** | ✅ Keep | Code ownership | Still relevant |
| **Pull Request Templates** | ✅ Keep | PR standards | Update if CI/CD references exist |
| **Issue Templates** | ✅ Keep | Issue management | Still relevant |
| **Security Advisories** | ✅ Keep | Vulnerability management | Important for security |
| **Dependabot** | ✅ Keep | Dependency updates | Still useful |

---

### 7.3 Optional: Keep Some GitHub Actions

Consider keeping GitHub Actions for non-CI/CD tasks:

| Workflow | Purpose | Keep? | Notes |
|----------|---------|-------|-------|
| Dependabot auto-merge | Automated dependency updates | ✅ | Can keep |
| Stale issue closer | Issue management | ✅ | Can keep |
| Label automation | PR/Issue labeling | ✅ | Can keep |
| CLA bot | Contributor License Agreement | ✅ | Can keep |
| Welcome bot | New contributor greeting | ✅ | Can keep |

**If keeping some Actions:**
- Re-enable GitHub Actions in settings
- Create separate `.github/workflows/` directory for non-CI/CD workflows
- Clearly document which workflows are active

---

## Phase 8: Redirect/Deprecation Notices (Day 33)

### 8.1 Add Deprecation Notice to Archived Workflows

| # | Task | Owner | Status |
|---|------|-------|--------|
| 8.1.1 | Add deprecation banner to each archived workflow | DevOps Team | ⬜ |
| 8.1.2 | Include link to Azure DevOps equivalent | DevOps Team | ⬜ |
| 8.1.3 | Document migration date | DevOps Team | ⬜ |

**Deprecation Banner Template:**
Add to top of each archived workflow:
```yaml
# ========================================
# ⚠️  DEPRECATED - DO NOT USE
# ========================================
# This workflow has been migrated to Azure DevOps
# Migration Date: [DATE]
# Azure Pipeline: https://dev.azure.com/dating-app-org/dating-app-platform/_build?definitionId=[ID]
#
# This file is kept for historical reference only.
# ========================================
```

---

### 8.2 Create Redirect in Repository

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 8.2.1 | Create `.github/workflows/README.md` | DevOps Team | ⬜ | Redirect notice |
| 8.2.2 | Add link to Azure DevOps | DevOps Team | ⬜ | |
| 8.2.3 | Explain migration | DevOps Team | ⬜ | |

**Redirect README Template:**
```markdown
# CI/CD Pipelines Migrated to Azure DevOps

This project's CI/CD pipelines have been migrated to Azure DevOps.

## Where to Find Pipelines

All pipelines are now located at:
**https://dev.azure.com/dating-app-org/dating-app-platform/_build**

## Pipeline Mapping

| Old GitHub Workflow | New Azure Pipeline |
|--------------------|-------------------|
| Backend CI | [backend-ci](https://dev.azure.com/...) |
| Frontend CI | [frontend-ci](https://dev.azure.com/...) |
| Docker Build & Push | [docker-build-push](https://dev.azure.com/...) |
| CD - Development | [cd-dev](https://dev.azure.com/...) |
| CD - Staging | [cd-staging](https://dev.azure.com/...) |
| CD - Production | [cd-production](https://dev.azure.com/...) |
| E2E Tests | [e2e-tests](https://dev.azure.com/...) |
| Performance Tests | [performance-tests](https://dev.azure.com/...) |
| Security Tests | [security-tests](https://dev.azure.com/...) |
| Mobile Build | [mobile-build](https://dev.azure.com/...) |

## Archived Workflows

Original GitHub Actions workflows are archived in `.github/workflows-archived/` for reference.

## Questions?

Contact the DevOps team: #devops-support or devops-team@company.com
```

---

## Phase 9: Final Verification (Day 34)

### 9.1 Post-Cleanup Checklist

| # | Verification Item | Status | Notes |
|---|-------------------|--------|-------|
| 9.1.1 | `.github/workflows/` is empty (or contains only README/non-CI/CD workflows) | ⬜ | |
| 9.1.2 | All CI/CD workflows archived in `.github/workflows-archived/` | ⬜ | |
| 9.1.3 | GitHub Actions disabled (or enabled only for non-CI/CD) | ⬜ | |
| 9.1.4 | Branch protection updated (GitHub Actions checks removed) | ⬜ | |
| 9.1.5 | Obsolete secrets removed | ⬜ | |
| 9.1.6 | README updated with Azure DevOps badges | ⬜ | |
| 9.1.7 | Documentation updated | ⬜ | |
| 9.1.8 | Team notified | ⬜ | |
| 9.1.9 | No active GitHub Actions runs | ⬜ | |
| 9.1.10 | Azure DevOps pipelines functioning normally | ⬜ | |

---

### 9.2 Test Pull Request Flow

| # | Test | Expected Result | Status | Notes |
|---|------|-----------------|--------|-------|
| 9.2.1 | Create test branch | Branch created successfully | ⬜ | |
| 9.2.2 | Make trivial change | Change committed | ⬜ | |
| 9.2.3 | Create pull request | PR created without GitHub Actions checks | ⬜ | |
| 9.2.4 | Verify Azure Pipelines triggered (if integrated) | Azure build runs | ⬜ | Optional |
| 9.2.5 | Merge PR | PR merges without errors | ⬜ | |
| 9.2.6 | Verify no GitHub Actions attempted | No workflow runs in Actions tab | ⬜ | |

---

## Phase 10: Long-Term Maintenance (Ongoing)

### 10.1 90-Day Review

| # | Task | Owner | Due Date | Notes |
|---|------|-------|----------|-------|
| 10.1.1 | Review archived workflows | DevOps Team | Day 120 | Consider permanent deletion |
| 10.1.2 | Review retained secrets | Security Team | Day 120 | Remove unused Azure secrets |
| 10.1.3 | Verify no GitHub Actions dependencies | DevOps Team | Day 120 | Final check |
| 10.1.4 | Consider moving to Azure Repos (optional) | Platform Team | Day 120 | Full Azure migration |

---

### 10.2 Permanent Deletion (Optional - After 6 months)

**Only if absolutely certain:**

| # | Task | Owner | Due Date | Risk Level |
|---|------|-------|----------|------------|
| 10.2.1 | Delete `.github/workflows-archived/` directory | DevOps Team | Day 180 | LOW |
| 10.2.2 | Remove all remaining GitHub Actions secrets | Security Team | Day 180 | MEDIUM |
| 10.2.3 | Document deletion | DevOps Team | Day 180 | LOW |

**Warning:** Only delete if:
- No plans to return to GitHub Actions
- All workflows successfully running in Azure DevOps for 6+ months
- No historical reference needed
- Team consensus on deletion

---

## Rollback Procedure

If you need to restore GitHub Actions:

| # | Task | Estimated Time |
|---|------|----------------|
| 1 | Re-enable GitHub Actions in settings | 2 minutes |
| 2 | Copy workflows from `.github/workflows-archived/` back to `.github/workflows/` | 5 minutes |
| 3 | Restore secrets from backup | 10 minutes |
| 4 | Update branch protection rules | 5 minutes |
| 5 | Test a workflow run | 10 minutes |

**Total Rollback Time:** ~30 minutes

---

## Appendix A: Cleanup Command Reference

### Archive Workflows
```bash
# One-liner to archive all workflows
mkdir -p .github/workflows-archived && \
  mv .github/workflows/*.yml .github/workflows-archived/ && \
  echo "Workflows archived on $(date)" > .github/workflows-archived/README.md
```

### List GitHub Secrets
```bash
# Using GitHub CLI
gh secret list
```

### Remove GitHub Secret
```bash
# Using GitHub CLI
gh secret remove SECRET_NAME
```

### Verify GitHub Actions Disabled
```bash
# Check repository settings
gh api repos/:owner/:repo | jq '.has_issues, .has_projects, .has_wiki, .has_pages, .has_downloads'
```

---

## Appendix B: What If Questions

### Q: What if we need to go back to GitHub Actions?
**A:** Follow the rollback procedure. Workflows are preserved in archive. Estimated time: 30 minutes.

### Q: Can we keep both GitHub Actions and Azure DevOps?
**A:** Yes, but not recommended. It creates confusion and doubles maintenance. If needed, clearly document which system owns which workflows.

### Q: What if a team still wants to use GitHub Actions?
**A:** Discuss with team. If valid use case, can enable GitHub Actions for specific workflows (non-CI/CD) while keeping CI/CD in Azure DevOps.

### Q: Should we delete the GitHub repository?
**A:** No, keep GitHub for source code unless fully migrating to Azure Repos.

### Q: What about GitHub Packages?
**A:** Evaluate separately. If using for artifacts, consider migrating to Azure Artifacts.

### Q: What about Dependabot?
**A:** Keep Dependabot. It's useful for security updates and works independently of GitHub Actions CI/CD.

---

## Success Criteria

Cleanup is successful when:

- ✅ No active GitHub Actions CI/CD workflows
- ✅ All workflows archived with clear documentation
- ✅ Team understands where to find pipelines (Azure DevOps)
- ✅ Documentation updated
- ✅ No confusion about which system to use
- ✅ Pull request flow works smoothly
- ✅ Zero production impact

---

## Support

**Questions or Issues?**
- DevOps Team: #devops-support
- Email: devops-team@company.com
- Documentation: [link]

**Emergency Rollback:**
Contact DevOps Lead immediately if critical issues arise.

---

**Document Version:** 1.0
**Last Updated:** December 2, 2025
**Owner:** DevOps Team
