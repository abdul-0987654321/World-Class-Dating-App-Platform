# Azure Repos Migration Checklist

**Project:** World-Class Dating App Platform (Flamoral)
**From:** GitHub (https://github.com/oks-citadel/World-Class-Dating-App-Platform)
**To:** Azure Repos (https://dev.azure.com/citadelcloudmanagement/_git/DatingPlatform)
**Document Version:** 1.0
**Last Updated:** December 2025

---

## Table of Contents

1. [Pre-Migration Phase](#pre-migration-phase)
2. [Migration Execution Phase](#migration-execution-phase)
3. [Post-Migration Configuration](#post-migration-configuration)
4. [Azure DevOps Setup](#azure-devops-setup)
5. [CI/CD Migration](#cicd-migration)
6. [Team Onboarding](#team-onboarding)
7. [Verification and Testing](#verification-and-testing)
8. [Go-Live Phase](#go-live-phase)
9. [Post-Go-Live Tasks](#post-go-live-tasks)

---

## Pre-Migration Phase

### Planning and Preparation

#### Repository Analysis
- [x] **Document current repository structure**
  - Total branches: 2 (main, origin/main)
  - Total tags: 0
  - Total commits: ~10 recent commits identified
  - Repository size: TBD
  - Current remote: https://github.com/oks-citadel/World-Class-Dating-App-Platform.git

- [ ] **Identify GitHub-specific features in use**
  - [x] GitHub Actions workflows (30+ workflow files)
  - [x] GitHub Issues templates (2 templates)
  - [x] GitHub Pull Request templates (1 template)
  - [x] GitHub Projects (check if in use)
  - [x] GitHub Packages (check if in use)
  - [x] GitHub Pages (check if in use)
  - [x] GitHub Dependabot (configured)
  - [x] CODEOWNERS file (exists)

- [ ] **Document external integrations**
  - [ ] CI/CD tools: GitHub Actions
  - [ ] Monitoring/logging: TBD
  - [ ] Deployment tools: Docker, Kubernetes
  - [ ] Third-party services: Stripe, Twilio, SendGrid, Agora
  - [ ] Webhooks: Check GitHub settings
  - [ ] Status checks: Document all

#### Team Preparation
- [ ] **Notify team of upcoming migration**
  - [ ] Send initial announcement (1 week before)
  - [ ] Schedule migration window
  - [ ] Identify migration owner/lead
  - [ ] Create communication channel (Slack/Teams)
  - [ ] Document expected downtime (if any)

- [ ] **Prepare team access**
  - [ ] List all team members
  - [ ] Verify Azure DevOps organization access
  - [ ] Assign appropriate roles/permissions
  - [ ] Plan for Azure DevOps training

#### Azure DevOps Setup
- [ ] **Verify Azure DevOps organization**
  - Organization: citadelcloudmanagement
  - URL: https://dev.azure.com/citadelcloudmanagement

- [ ] **Create project (if not exists)**
  - [ ] Project name: DatingPlatform
  - [ ] Visibility: Private
  - [ ] Version control: Git
  - [ ] Work item process: Agile (or Scrum)

- [ ] **Create repository**
  - [ ] Repository name: DatingPlatform
  - [ ] Initialize empty (migration will push content)
  - [ ] Set default branch: main

- [ ] **Configure project settings**
  - [ ] Set project description
  - [ ] Configure security groups
  - [ ] Set up area paths
  - [ ] Set up iteration paths

#### Backup and Risk Mitigation
- [ ] **Create backup of current repository**
  - [ ] Clone full repository locally
  - [ ] Export all issues (if needed)
  - [ ] Export all PRs (if needed)
  - [ ] Export all wikis (if any)
  - [ ] Document all webhooks and integrations
  - [ ] Screenshot important configurations

- [ ] **Prepare rollback plan**
  - [ ] Document rollback steps
  - [ ] Identify rollback owner
  - [ ] Set rollback decision point
  - [ ] Test rollback procedure (if possible)

#### Documentation Review
- [ ] **Review and update documentation**
  - [ ] README.md (update repository URLs)
  - [ ] package.json (update repository field)
  - [ ] ARCHITECTURE.md (update any GitHub references)
  - [ ] CONTRIBUTING.md (if exists)
  - [ ] All deployment guides
  - [ ] All developer guides

---

## Migration Execution Phase

### Pre-Migration Tasks
- [ ] **Final preparation**
  - [ ] Confirm migration window
  - [ ] Notify all stakeholders (final notice)
  - [ ] Freeze GitHub repository (optional)
    - [ ] Set GitHub repo to read-only (or communicate freeze)
  - [ ] Document latest commit hash on GitHub

### Execute Migration Script
- [ ] **Run migration script**
  - [ ] Navigate to repository directory
  - [ ] Make script executable (Linux/Mac): `chmod +x migrate-to-azure-repos.sh`
  - [ ] Run migration script:
    - Windows: `migrate-to-azure-repos.bat`
    - Linux/Mac: `./migrate-to-azure-repos.sh`

- [ ] **Migration script steps (automatic)**
  - [x] Check prerequisites
  - [x] Display repository information
  - [x] Create backup
  - [x] Fetch all branches and tags
  - [x] Add Azure Repos remote
  - [x] Push all branches to Azure Repos
  - [x] Push all tags to Azure Repos
  - [x] Verify migration

### Verification During Migration
- [ ] **Monitor migration progress**
  - [ ] Watch console output for errors
  - [ ] Note any warnings or issues
  - [ ] Verify network connectivity
  - [ ] Check Azure DevOps for incoming commits

- [ ] **Handle authentication**
  - [ ] Provide Azure DevOps credentials when prompted
  - [ ] Use Personal Access Token (PAT) if needed
  - [ ] Save credentials securely

---

## Post-Migration Configuration

### Immediate Verification
- [ ] **Verify repository contents**
  - [ ] Navigate to Azure Repos URL: https://dev.azure.com/citadelcloudmanagement/_git/DatingPlatform
  - [ ] Verify all branches present
  - [ ] Verify commit count matches
  - [ ] Verify latest commit matches GitHub
  - [ ] Check all tags migrated (if any)
  - [ ] Verify file structure intact

- [ ] **Verify repository settings**
  - [ ] Check default branch (should be main)
  - [ ] Verify repository size
  - [ ] Check Git LFS files (if any)
  - [ ] Verify .gitignore is working

### Branch Configuration
- [ ] **Set up branch structure**
  - [ ] Verify main branch exists
  - [ ] Create develop branch from main
    ```bash
    git checkout -b develop main
    git push azure develop
    ```
  - [ ] Set develop as default branch (optional)
  - [ ] Create branch policies (see next section)

- [ ] **Configure branch policies**
  - [ ] Main branch protection
    - [ ] Require minimum 2 reviewers
    - [ ] Prohibit self-approval
    - [ ] Require code owner review
    - [ ] Check for linked work items
    - [ ] Require comment resolution
    - [ ] Limit merge types to squash/merge commit
    - [ ] Require branch up to date

  - [ ] Develop branch protection
    - [ ] Require minimum 1 reviewer
    - [ ] Check for comment resolution
    - [ ] Build validation

  - [ ] Release branch protection (pattern: release/*)
    - [ ] Require minimum 2 reviewers
    - [ ] Require code owner review
    - [ ] Check for linked work items
    - [ ] Full test suite required

### Code Review Configuration
- [ ] **Set up automatic code reviewers**
  - [ ] `/backend/*` → Backend Team (required, min 1)
  - [ ] `/apps/web/*` → Frontend Team (required, min 1)
  - [ ] `/apps/web-app/*` → Frontend Team (required, min 1)
  - [ ] `/apps/mobile-app/*` → Mobile Team (required, min 1)
  - [ ] `/infrastructure/*` → DevOps Team (required, min 1)
  - [ ] `/database/*` → Database Team + Backend Lead (required, min 2)
  - [ ] `/security/*` → Security Team (required, min 2)
  - [ ] `/.azuredevops/*` → DevOps Lead (required, min 1)
  - [ ] `package.json` → Tech Lead (required, min 1)

- [ ] **Create PR template**
  - [ ] Create `.azuredevops/pull_request_template.md`
  - [ ] Copy content from AZURE_REPOS_BRANCH_POLICIES.md
  - [ ] Commit and push template
  - [ ] Verify template appears on PR creation

### Repository Settings
- [ ] **Configure repository policies**
  - [ ] Enable "Commit author email validation"
  - [ ] Enable "Block pushes with secrets"
  - [ ] Configure "Maximum file size" limit
  - [ ] Set "Max path length"

- [ ] **Configure security scanning**
  - [ ] Enable Azure Advanced Security (if available)
  - [ ] Enable dependency scanning
  - [ ] Configure secret scanning
  - [ ] Set up security alert notifications

---

## Azure DevOps Setup

### Azure Boards Configuration
- [ ] **Set up work item tracking**
  - [ ] Choose process template (Agile/Scrum/Basic)
  - [ ] Create custom work item types (if needed)
  - [ ] Configure work item fields
  - [ ] Set up area paths for teams
  - [ ] Set up iteration paths for sprints

- [ ] **Migrate GitHub Issues (if needed)**
  - [ ] Export GitHub issues
  - [ ] Create Azure Boards work items
  - [ ] Link related items
  - [ ] Update documentation

- [ ] **Create initial backlog**
  - [ ] Create epic for migration cleanup
  - [ ] Create stories for post-migration tasks
  - [ ] Assign to team members

### Azure Pipelines Setup
- [ ] **Create pipeline directory structure**
  ```bash
  mkdir -p .azuredevops/pipelines/templates
  touch .azuredevops/pipelines/ci-backend.yml
  touch .azuredevops/pipelines/ci-frontend.yml
  touch .azuredevops/pipelines/ci-mobile.yml
  touch .azuredevops/pipelines/security-scan.yml
  touch .azuredevops/pipelines/cd-dev.yml
  touch .azuredevops/pipelines/cd-staging.yml
  touch .azuredevops/pipelines/cd-production.yml
  ```

- [ ] **Create variable groups**
  - [ ] Create "dev-environment" variable group
  - [ ] Create "staging-environment" variable group
  - [ ] Create "production-environment" variable group
  - [ ] Add environment-specific variables
  - [ ] Link to Azure Key Vault (recommended)

- [ ] **Set up service connections**
  - [ ] Docker Hub connection (if using Docker Hub)
  - [ ] Azure subscription connection
  - [ ] Kubernetes connection
  - [ ] NPM registry connection (if needed)
  - [ ] Third-party service connections (Stripe, Twilio, etc.)

### Azure Artifacts (Optional)
- [ ] **Set up artifact feeds**
  - [ ] Create npm feed (if using private packages)
  - [ ] Configure feed permissions
  - [ ] Update package.json registry settings
  - [ ] Configure authentication

---

## CI/CD Migration

### GitHub Actions to Azure Pipelines Conversion

#### Backend CI Pipeline
- [ ] **Convert backend-ci.yml**
  - [ ] Create `.azuredevops/pipelines/ci-backend.yml`
  - [ ] Configure triggers (branches and paths)
  - [ ] Configure PR validation
  - [ ] Set up build steps
  - [ ] Add test execution
  - [ ] Add code coverage
  - [ ] Add artifact publishing
  - [ ] Test pipeline locally (if possible)
  - [ ] Run pipeline in Azure DevOps
  - [ ] Verify all steps succeed

#### Frontend CI Pipeline
- [ ] **Convert frontend-ci.yml and ci-frontend.yml**
  - [ ] Create `.azuredevops/pipelines/ci-frontend.yml`
  - [ ] Configure triggers
  - [ ] Set up build steps
  - [ ] Add test execution
  - [ ] Add Playwright/E2E tests
  - [ ] Add build artifact
  - [ ] Test and verify

#### Mobile Build Pipeline
- [ ] **Convert mobile-build.yml**
  - [ ] Create `.azuredevops/pipelines/ci-mobile.yml`
  - [ ] Configure iOS build (macOS agent)
  - [ ] Configure Android build
  - [ ] Add signing configuration
  - [ ] Add test execution
  - [ ] Test and verify

#### Security Scan Pipeline
- [ ] **Convert security-tests.yml**
  - [ ] Create `.azuredevops/pipelines/security-scan.yml`
  - [ ] Add npm audit
  - [ ] Add OWASP dependency check
  - [ ] Add WhiteSource/Snyk integration
  - [ ] Configure vulnerability thresholds
  - [ ] Test and verify

#### Deployment Pipelines
- [ ] **Convert deployment workflows**
  - [ ] Create `.azuredevops/pipelines/cd-dev.yml`
  - [ ] Create `.azuredevops/pipelines/cd-staging.yml`
  - [ ] Create `.azuredevops/pipelines/cd-production.yml`
  - [ ] Configure environment approval gates
  - [ ] Set up deployment variables
  - [ ] Configure Kubernetes deployment
  - [ ] Add health checks
  - [ ] Add rollback capability
  - [ ] Test in dev environment first

#### Docker Build Pipeline
- [ ] **Convert docker-build-push.yml**
  - [ ] Create Docker build pipeline
  - [ ] Configure multi-stage builds
  - [ ] Set up image tagging strategy
  - [ ] Configure registry push
  - [ ] Add image scanning
  - [ ] Test and verify

#### Infrastructure Pipelines
- [ ] **Convert terraform workflows**
  - [ ] Create Terraform plan pipeline
  - [ ] Create Terraform apply pipeline
  - [ ] Set up state file storage (Azure Storage)
  - [ ] Configure approval gates
  - [ ] Test in non-production first

#### E2E and Performance Tests
- [ ] **Convert test workflows**
  - [ ] Create E2E test pipeline
  - [ ] Create performance test pipeline
  - [ ] Configure test environments
  - [ ] Set up test data
  - [ ] Add test reporting
  - [ ] Test and verify

### Pipeline Integration
- [ ] **Link pipelines to branch policies**
  - [ ] Add ci-backend.yml to main/develop policies
  - [ ] Add ci-frontend.yml to main/develop policies
  - [ ] Add ci-mobile.yml to main/develop policies
  - [ ] Add security-scan.yml to main/develop policies
  - [ ] Configure build expiration (12-24 hours)

- [ ] **Set up pipeline triggers**
  - [ ] Configure CI triggers (on push)
  - [ ] Configure PR triggers
  - [ ] Configure scheduled triggers (nightly builds)
  - [ ] Configure manual triggers for deployments

---

## Team Onboarding

### Access and Permissions
- [ ] **Grant team access**
  - [ ] Add all team members to Azure DevOps organization
  - [ ] Assign to appropriate security groups
  - [ ] Configure repository permissions
  - [ ] Set up notification preferences

- [ ] **Team roles and permissions**
  - [ ] Project Administrators: [List names]
  - [ ] Contributors: [List names]
  - [ ] Readers: [List names]
  - [ ] Build Administrators: [List names]
  - [ ] Release Administrators: [List names]

### Team Training
- [ ] **Prepare training materials**
  - [ ] Create Azure Repos quick start guide
  - [ ] Create PR workflow guide
  - [ ] Create pipeline usage guide
  - [ ] Record demo videos (optional)
  - [ ] Prepare FAQ document

- [ ] **Conduct training sessions**
  - [ ] Schedule team training meeting
  - [ ] Demo new workflow
  - [ ] Walk through PR creation
  - [ ] Explain branch policies
  - [ ] Show pipeline monitoring
  - [ ] Q&A session
  - [ ] Share training materials

### Developer Setup
- [ ] **Provide setup instructions**
  - [ ] Update remote URLs:
    ```bash
    # Add Azure Repos remote
    git remote add azure https://dev.azure.com/citadelcloudmanagement/_git/DatingPlatform

    # Or rename existing remote
    git remote rename origin github
    git remote rename azure origin

    # Fetch from Azure Repos
    git fetch azure

    # Set upstream
    git branch --set-upstream-to=azure/main main
    ```

  - [ ] Configure Git credentials
    - [ ] Install Git Credential Manager
    - [ ] Configure Azure DevOps authentication
    - [ ] Test push/pull operations

  - [ ] Update local configurations
    - [ ] Update package.json repository URL
    - [ ] Update any scripts with repository URLs
    - [ ] Update documentation

### Communication
- [ ] **Team communication**
  - [ ] Announce migration completion
  - [ ] Share new repository URL
  - [ ] Share documentation links
  - [ ] Provide support contact information
  - [ ] Set up support channel (Slack/Teams)

---

## Verification and Testing

### Repository Verification
- [ ] **Compare repositories**
  - [ ] Compare branch count (GitHub vs Azure Repos)
  - [ ] Compare commit count
  - [ ] Compare file count
  - [ ] Verify latest commit hash matches
  - [ ] Check file permissions
  - [ ] Verify .gitignore working correctly

- [ ] **Test repository operations**
  - [ ] Clone repository from Azure Repos
  - [ ] Create test branch
  - [ ] Make test commit
  - [ ] Push test branch
  - [ ] Create test PR
  - [ ] Delete test branch
  - [ ] Verify all operations work

### Branch Policy Testing
- [ ] **Test branch protections**
  - [ ] Attempt direct push to main (should fail)
  - [ ] Attempt direct push to develop (should fail)
  - [ ] Create PR without work item link (should warn/block)
  - [ ] Create PR with failing build (should block merge)
  - [ ] Create PR with unresolved comments (should block merge)
  - [ ] Test reviewer approval flow
  - [ ] Test squash merge
  - [ ] Test merge commit

### Pipeline Testing
- [ ] **Test CI pipelines**
  - [ ] Trigger backend CI (create branch touching backend/)
  - [ ] Verify build passes
  - [ ] Verify tests run
  - [ ] Verify code coverage published
  - [ ] Trigger frontend CI
  - [ ] Verify mobile CI
  - [ ] Verify security scan

- [ ] **Test CD pipelines (dev environment first)**
  - [ ] Trigger dev deployment
  - [ ] Verify deployment succeeds
  - [ ] Verify application health
  - [ ] Test rollback procedure
  - [ ] Verify monitoring and logs

### End-to-End Testing
- [ ] **Full workflow test**
  - [ ] Developer creates feature branch
  - [ ] Makes changes and commits
  - [ ] Pushes to Azure Repos
  - [ ] Creates PR
  - [ ] Reviews are assigned automatically
  - [ ] Pipelines run automatically
  - [ ] Reviewer approves
  - [ ] PR is merged
  - [ ] Branch is deleted
  - [ ] Changes are deployed to dev
  - [ ] Verify entire flow works smoothly

---

## Go-Live Phase

### Final Preparation
- [ ] **Pre-go-live checklist**
  - [ ] All pipelines tested and working
  - [ ] All team members trained
  - [ ] All documentation updated
  - [ ] Rollback plan ready
  - [ ] Support team ready
  - [ ] Monitoring and alerts configured

### GitHub Repository Handling
- [ ] **Prepare GitHub repository**
  - [ ] Update README.md with migration notice
  - [ ] Add banner: "This repository has moved to Azure DevOps"
  - [ ] Add link to new Azure Repos location
  - [ ] Set repository to read-only (optional)
  - [ ] Archive repository (optional, after grace period)

- [ ] **Update GitHub webhooks**
  - [ ] Disable GitHub Actions
  - [ ] Remove/update webhooks
  - [ ] Redirect to Azure DevOps if needed

### Go-Live Announcement
- [ ] **Announce go-live**
  - [ ] Send team-wide announcement
  - [ ] Include new repository URL
  - [ ] Include setup instructions
  - [ ] Include support contact
  - [ ] Set effective date/time

### Cutover
- [ ] **Execute cutover**
  - [ ] Disable GitHub repository (make read-only)
  - [ ] Enable Azure Repos as primary
  - [ ] Update CI/CD to use Azure Repos
  - [ ] Update external integrations
  - [ ] Update documentation links
  - [ ] Monitor for issues

---

## Post-Go-Live Tasks

### Week 1: Immediate Tasks
- [ ] **Monitor and support**
  - [ ] Monitor team adoption
  - [ ] Respond to questions quickly
  - [ ] Document common issues
  - [ ] Update FAQ as needed
  - [ ] Daily check-ins with team

- [ ] **Address issues**
  - [ ] Fix any configuration issues
  - [ ] Adjust policies if needed
  - [ ] Optimize pipelines
  - [ ] Improve documentation

### Week 2-4: Optimization
- [ ] **Optimize workflows**
  - [ ] Review pipeline performance
  - [ ] Optimize build times
  - [ ] Review branch policies effectiveness
  - [ ] Adjust code review requirements
  - [ ] Gather team feedback

- [ ] **Complete migration**
  - [ ] Convert remaining GitHub workflows
  - [ ] Migrate GitHub Issues to Azure Boards (if not done)
  - [ ] Set up Azure Boards fully
  - [ ] Configure dashboards and reports

### Month 2: Cleanup
- [ ] **Clean up legacy items**
  - [ ] Remove .github directory (or move to .archive/)
  - [ ] Update all documentation URLs
  - [ ] Remove GitHub-specific references
  - [ ] Archive GitHub repository (if not done)
  - [ ] Cancel GitHub services (if applicable)

- [ ] **Documentation update**
  - [ ] Update all developer guides
  - [ ] Update all deployment guides
  - [ ] Update architecture diagrams
  - [ ] Update onboarding documentation
  - [ ] Create video tutorials (optional)

### Month 3: Review and Improve
- [ ] **Post-migration review**
  - [ ] Survey team satisfaction
  - [ ] Review metrics:
    - [ ] PR cycle time
    - [ ] Build times
    - [ ] Deployment frequency
    - [ ] Failure rates
  - [ ] Identify improvement areas
  - [ ] Create action items

- [ ] **Continuous improvement**
  - [ ] Implement improvements
  - [ ] Update processes
  - [ ] Share learnings with team
  - [ ] Document best practices

---

## Rollback Procedure

### If Migration Needs to be Rolled Back

- [ ] **Immediate actions**
  - [ ] Stop migration process
  - [ ] Assess impact and issues
  - [ ] Notify stakeholders
  - [ ] Decide on rollback or fix-forward

- [ ] **Rollback steps**
  - [ ] Re-enable GitHub repository (if disabled)
  - [ ] Restore GitHub webhooks
  - [ ] Re-enable GitHub Actions
  - [ ] Notify team of rollback
  - [ ] Document issues for retry

- [ ] **Post-rollback**
  - [ ] Analyze what went wrong
  - [ ] Fix issues
  - [ ] Update migration plan
  - [ ] Schedule new migration date

---

## Success Criteria

Migration is considered successful when:

- [ ] All code migrated to Azure Repos
- [ ] All branches and tags present
- [ ] Branch policies configured and working
- [ ] All CI/CD pipelines functional
- [ ] Team successfully using Azure Repos
- [ ] No critical issues reported
- [ ] Documentation updated
- [ ] GitHub repository archived/read-only
- [ ] Zero production impact

---

## Key Contacts

| Role | Name | Contact |
|------|------|---------|
| Migration Lead | [Name] | [Email] |
| DevOps Lead | [Name] | [Email] |
| Backend Lead | [Name] | [Email] |
| Frontend Lead | [Name] | [Email] |
| Mobile Lead | [Name] | [Email] |
| Project Manager | [Name] | [Email] |

---

## Important Links

- **Azure Repos:** https://dev.azure.com/citadelcloudmanagement/_git/DatingPlatform
- **Azure Pipelines:** https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_build
- **Azure Boards:** https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_boards
- **GitHub (Legacy):** https://github.com/oks-citadel/World-Class-Dating-App-Platform
- **Documentation:** [Link to docs]
- **Support Channel:** [Slack/Teams link]

---

## Related Documents

- **AZURE_REPOS_FOLDER_STRUCTURE.md** - Repository structure guidance
- **AZURE_REPOS_BRANCH_POLICIES.md** - Branch strategy and policies
- **migrate-to-azure-repos.sh** - Migration script (Linux/Mac)
- **migrate-to-azure-repos.bat** - Migration script (Windows)

---

**Document Status:** Living Document
**Last Updated:** December 2025
**Next Review:** After migration completion

---

## Notes Section

Use this section to track migration-specific notes, issues, and decisions:

```
[Date] [Note]
------------------



```
