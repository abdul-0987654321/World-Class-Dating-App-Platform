# Azure Repos Migration Guide - Complete Package

**Project:** World-Class Dating App Platform (Flamoral)
**Current Location:** GitHub (https://github.com/oks-citadel/World-Class-Dating-App-Platform)
**New Location:** Azure Repos (https://dev.azure.com/citadelcloudmanagement/_git/DatingPlatform)

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [What's Included](#whats-included)
3. [Migration Process](#migration-process)
4. [Documentation Overview](#documentation-overview)
5. [File Structure](#file-structure)
6. [Next Steps](#next-steps)
7. [Support](#support)

---

## 🚀 Quick Start

### For Migration Lead

**Step 1: Review Documentation**
```bash
# Read these files in order:
1. AZURE_MIGRATION_README.md (this file)
2. AZURE_REPOS_MIGRATION_CHECKLIST.md
3. AZURE_REPOS_FOLDER_STRUCTURE.md
4. AZURE_REPOS_BRANCH_POLICIES.md
5. GITIGNORE_GITATTRIBUTES_REVIEW.md
```

**Step 2: Execute Migration**
```bash
# On Windows:
migrate-to-azure-repos.bat

# On Linux/Mac:
chmod +x migrate-to-azure-repos.sh
./migrate-to-azure-repos.sh
```

**Step 3: Post-Migration Setup**
- Follow the checklist in AZURE_REPOS_MIGRATION_CHECKLIST.md
- Configure branch policies
- Set up Azure Pipelines
- Train team members

### For Team Members

**After migration is complete:**

```bash
# Add Azure Repos remote
git remote add azure https://dev.azure.com/citadelcloudmanagement/_git/DatingPlatform

# Fetch from Azure Repos
git fetch azure

# Set upstream to Azure Repos
git branch --set-upstream-to=azure/main main

# Optional: Make Azure Repos your default remote
git remote rename origin github
git remote rename azure origin
```

---

## 📦 What's Included

This migration package includes everything you need to successfully migrate from GitHub to Azure Repos:

### 🔧 Migration Scripts

| File | Platform | Description |
|------|----------|-------------|
| `migrate-to-azure-repos.sh` | Linux/Mac/Git Bash | Full-featured migration script with backup, verification |
| `migrate-to-azure-repos.bat` | Windows | Windows-compatible migration script |

**Features:**
- Automated repository backup
- Branch and tag migration
- Progress verification
- Error handling
- Rollback capability

### 📚 Documentation Files

| File | Purpose | Priority |
|------|---------|----------|
| `AZURE_MIGRATION_README.md` | Overview and quick start | ⭐ START HERE |
| `AZURE_REPOS_MIGRATION_CHECKLIST.md` | Complete step-by-step checklist | ⭐ HIGH |
| `AZURE_REPOS_FOLDER_STRUCTURE.md` | Repository organization guide | ⭐ HIGH |
| `AZURE_REPOS_BRANCH_POLICIES.md` | Branch strategy and policies | ⭐ HIGH |
| `GITIGNORE_GITATTRIBUTES_REVIEW.md` | Git configuration review | ⭐ MEDIUM |

### ⚙️ Configuration Files

| File | Purpose | Status |
|------|---------|--------|
| `.gitattributes` | Line ending and file handling | ✅ Created |
| `.gitignore` | File exclusion patterns | ✅ Exists (reviewed) |
| `.azuredevops/pipelines/ci-backend.yml` | Backend CI pipeline | ✅ Template created |
| `.azuredevops/pipelines/ci-frontend.yml` | Frontend CI pipeline | ✅ Template created |
| `.azuredevops/pull_request_template.md` | PR template | ✅ Created |

### 📊 Repository Analysis

**Current Repository Stats:**
- **Branches:** 2 (main, origin/main)
- **Tags:** 0
- **Primary Language:** TypeScript/JavaScript
- **Framework:** Monorepo (Yarn + Lerna)
- **Structure:** Apps + Backend + Infrastructure

**GitHub Features in Use:**
- ✅ GitHub Actions (30+ workflows)
- ✅ Issue templates (2)
- ✅ PR templates (1)
- ✅ CODEOWNERS (1)
- ✅ Dependabot configuration
- ✅ Security policy

---

## 🔄 Migration Process

### Phase 1: Preparation (1-2 days)

**Tasks:**
1. Review all documentation
2. Notify team of upcoming migration
3. Verify Azure DevOps access
4. Create Azure DevOps project and repository
5. Test migration script on a test repository (recommended)

**Deliverables:**
- [ ] Team notified
- [ ] Azure DevOps configured
- [ ] Migration date scheduled
- [ ] Rollback plan documented

### Phase 2: Migration Execution (2-4 hours)

**Tasks:**
1. Run pre-migration backup
2. Execute migration script
3. Verify all branches and commits
4. Configure initial branch policies
5. Update team on progress

**Deliverables:**
- [ ] Repository migrated
- [ ] Backup created
- [ ] Verification complete
- [ ] Team notified of new URL

### Phase 3: Azure DevOps Configuration (1-2 days)

**Tasks:**
1. Set up branch policies
2. Configure code reviewers
3. Create Azure Pipelines
4. Set up build validation
5. Configure security scanning
6. Create PR template

**Deliverables:**
- [ ] Branch policies active
- [ ] Pipelines functional
- [ ] Security scanning enabled
- [ ] Team can create PRs

### Phase 4: Team Onboarding (3-5 days)

**Tasks:**
1. Conduct training sessions
2. Update developer setup guides
3. Provide hands-on support
4. Monitor team adoption
5. Address issues quickly

**Deliverables:**
- [ ] Team trained
- [ ] Documentation updated
- [ ] Support provided
- [ ] Issues resolved

### Phase 5: Cleanup and Optimization (1-2 weeks)

**Tasks:**
1. Archive GitHub repository
2. Remove .github directory
3. Optimize pipeline performance
4. Gather feedback
5. Continuous improvement

**Deliverables:**
- [ ] GitHub archived
- [ ] Pipelines optimized
- [ ] Feedback collected
- [ ] Improvements implemented

---

## 📖 Documentation Overview

### 1. AZURE_REPOS_MIGRATION_CHECKLIST.md

**Purpose:** Step-by-step migration checklist

**Sections:**
- Pre-Migration Phase
- Migration Execution Phase
- Post-Migration Configuration
- Azure DevOps Setup
- CI/CD Migration
- Team Onboarding
- Verification and Testing
- Go-Live Phase
- Post-Go-Live Tasks

**When to use:** Throughout the entire migration process

**Key features:**
- Comprehensive task list
- Phase-by-phase breakdown
- Verification steps
- Rollback procedures
- Success criteria

### 2. AZURE_REPOS_FOLDER_STRUCTURE.md

**Purpose:** Repository structure guidance and GitHub to Azure conversion

**Sections:**
- Current Repository Structure
- Recommended Azure Repos Structure
- Files to Exclude
- GitHub-Specific Files Handling
- Azure DevOps Equivalents
- Directory Organization Best Practices

**When to use:** During planning and post-migration cleanup

**Key features:**
- Detailed structure analysis
- Conversion strategies
- GitHub Actions to Azure Pipelines mapping
- Best practices

### 3. AZURE_REPOS_BRANCH_POLICIES.md

**Purpose:** Branch strategy and policy configuration

**Sections:**
- Branch Strategy Overview
- Branch Naming Conventions
- Branch Policies Configuration
- Pull Request Policies
- Code Review Requirements
- Build Validation
- Security and Compliance

**When to use:** During Azure DevOps setup phase

**Key features:**
- Complete branch policy guide
- PR workflow
- Code review automation
- Pipeline integration
- Common workflows

### 4. GITIGNORE_GITATTRIBUTES_REVIEW.md

**Purpose:** Git configuration files review and recommendations

**Sections:**
- Current .gitignore Review
- .gitignore Recommendations
- .gitattributes Analysis
- .gitattributes Recommendations
- Implementation Guide

**When to use:** Before migration for optimal configuration

**Key features:**
- Comprehensive .gitignore analysis
- .gitattributes best practices
- Line ending configuration
- Azure-specific patterns

---

## 📁 File Structure

### Created Files

```
World-Class-Dating-App-Platform/
├── migrate-to-azure-repos.sh           # Migration script (Linux/Mac)
├── migrate-to-azure-repos.bat          # Migration script (Windows)
├── AZURE_MIGRATION_README.md           # This file
├── AZURE_REPOS_MIGRATION_CHECKLIST.md  # Complete checklist
├── AZURE_REPOS_FOLDER_STRUCTURE.md     # Structure guide
├── AZURE_REPOS_BRANCH_POLICIES.md      # Branch policies
├── GITIGNORE_GITATTRIBUTES_REVIEW.md   # Git config review
├── .gitattributes                      # Git attributes (NEW)
├── .azuredevops/                       # Azure DevOps configs (NEW)
│   ├── pipelines/
│   │   ├── ci-backend.yml              # Backend CI pipeline
│   │   ├── ci-frontend.yml             # Frontend CI pipeline
│   │   └── templates/                  # Pipeline templates
│   └── pull_request_template.md        # PR template
└── [existing files...]
```

### Existing Files (No Changes)

All existing repository files remain unchanged:
- ✅ Source code
- ✅ Configuration files
- ✅ Documentation
- ✅ .github directory (will be handled post-migration)
- ✅ .gitignore (reviewed, enhancements recommended)

---

## 📝 Next Steps

### Immediate Actions (Before Migration)

1. **Review Documentation (2-3 hours)**
   ```bash
   # Read in this order:
   - AZURE_MIGRATION_README.md (this file)
   - AZURE_REPOS_MIGRATION_CHECKLIST.md
   - AZURE_REPOS_FOLDER_STRUCTURE.md
   ```

2. **Verify Azure DevOps Access (15 minutes)**
   - Log in to https://dev.azure.com/citadelcloudmanagement
   - Verify repository exists: DatingPlatform
   - Check permissions (should have Contribute access)

3. **Test Migration Script (Optional, 1 hour)**
   ```bash
   # Create a test repository and practice
   git clone [test-repo]
   cd test-repo
   ./migrate-to-azure-repos.sh  # Dry run
   ```

4. **Schedule Migration (Planning)**
   - Choose low-traffic time window
   - Notify team 1 week in advance
   - Schedule 4-hour window
   - Plan for potential extension

### During Migration

1. **Execute Migration Script**
   ```bash
   # Windows
   migrate-to-azure-repos.bat

   # Linux/Mac
   ./migrate-to-azure-repos.sh
   ```

2. **Monitor Progress**
   - Watch console output
   - Verify each step completes
   - Note any warnings or errors
   - Check Azure DevOps for incoming commits

3. **Immediate Verification**
   - Visit Azure Repos URL
   - Verify branch count
   - Verify latest commit matches
   - Check file structure intact

### After Migration

1. **Configure Azure DevOps (Day 1)**
   - Set up branch policies (AZURE_REPOS_BRANCH_POLICIES.md)
   - Add code reviewers
   - Create initial pipelines
   - Test PR workflow

2. **Team Onboarding (Week 1)**
   - Send setup instructions to team
   - Conduct training session
   - Provide hands-on support
   - Monitor for issues

3. **Pipeline Migration (Week 1-2)**
   - Convert GitHub Actions to Azure Pipelines
   - Test each pipeline
   - Set up build validation
   - Configure environments

4. **Cleanup (Week 2-4)**
   - Archive/remove .github directory
   - Update all documentation
   - Archive GitHub repository
   - Continuous optimization

---

## 🎯 Success Criteria

The migration is successful when:

- ✅ All code migrated to Azure Repos
- ✅ All branches and tags present
- ✅ Commit history intact
- ✅ Branch policies configured and enforced
- ✅ CI/CD pipelines functional
- ✅ Team successfully using Azure Repos
- ✅ No production impact
- ✅ Documentation updated
- ✅ GitHub repository archived

---

## ⚠️ Important Notes

### Security

- **Never commit secrets** - Verify .env files are ignored
- **Review .gitignore** - Ensure sensitive files excluded
- **Use Azure Key Vault** - Store secrets securely
- **Enable secret scanning** - Configure in Azure DevOps

### Backup

- **Migration creates backup** - In `backup-[timestamp]` folder
- **Keep backup until confirmed** - Don't delete for at least 1 month
- **GitHub remains available** - Original repository unchanged (until archived)

### Team Impact

- **Minimal disruption** - Most work continues in Azure Repos
- **Training required** - New PR process, pipelines
- **Support available** - Migration lead provides assistance
- **Documentation updated** - All guides reflect Azure Repos

### Common Issues

**Issue:** Cannot push to Azure Repos
**Solution:** Check credentials, use Personal Access Token (PAT)

**Issue:** Pipelines not triggering
**Solution:** Verify path filters and branch policies

**Issue:** Line ending conflicts
**Solution:** .gitattributes file resolves this

**Issue:** Build failures
**Solution:** Convert GitHub Actions syntax to Azure Pipelines

---

## 📞 Support

### During Migration

**Migration Lead:** [Name]
**Email:** [Email]
**Teams/Slack:** [Channel]
**Phone:** [Phone] (emergencies only)

### After Migration

**Azure DevOps Support:**
- Documentation: https://docs.microsoft.com/azure/devops/
- Community: https://developercommunity.visualstudio.com/

**Internal Support:**
- DevOps Team: [Email/Channel]
- Project Wiki: [Link]
- FAQ: See AZURE_REPOS_MIGRATION_CHECKLIST.md

### Escalation Path

1. Migration Lead
2. DevOps Team Lead
3. Engineering Manager
4. CTO

---

## 📊 Key Metrics to Track

### During Migration

- Migration duration (target: 2-4 hours)
- Number of branches migrated
- Number of commits migrated
- Verification pass/fail

### Post-Migration

- Time to first PR (target: <1 day)
- Team adoption rate (target: 100% in 1 week)
- Pipeline success rate (target: >95%)
- PR cycle time (compare to GitHub baseline)
- Build time (compare to GitHub baseline)

### Long-Term

- Developer satisfaction
- CI/CD reliability
- Deployment frequency
- Mean time to recovery (MTTR)

---

## 🔗 Important Links

### Azure DevOps

- **Organization:** https://dev.azure.com/citadelcloudmanagement
- **Project:** DatingPlatform
- **Repository:** https://dev.azure.com/citadelcloudmanagement/_git/DatingPlatform
- **Pipelines:** https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_build
- **Boards:** https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_boards

### GitHub (Legacy)

- **Repository:** https://github.com/oks-citadel/World-Class-Dating-App-Platform
- **Actions:** https://github.com/oks-citadel/World-Class-Dating-App-Platform/actions
- **Issues:** https://github.com/oks-citadel/World-Class-Dating-App-Platform/issues

### Documentation

- **Azure DevOps Docs:** https://docs.microsoft.com/azure/devops/
- **Git Documentation:** https://git-scm.com/doc
- **Azure Pipelines:** https://docs.microsoft.com/azure/devops/pipelines/

---

## 🗓️ Timeline

### Week 0: Preparation
- Day 1-2: Review documentation
- Day 3-4: Setup Azure DevOps
- Day 5: Team notification
- Day 6-7: Final preparation

### Week 1: Migration and Setup
- Day 1: Execute migration (morning)
- Day 1: Initial Azure DevOps setup (afternoon)
- Day 2-3: Pipeline creation and testing
- Day 4-5: Team training and onboarding

### Week 2: Stabilization
- Day 1-5: Monitor adoption, fix issues, optimize pipelines

### Week 3-4: Optimization
- Continuous improvement
- Documentation updates
- GitHub cleanup

---

## ✅ Pre-Migration Checklist

Quick checklist before running migration:

- [ ] All documentation reviewed
- [ ] Azure DevOps access verified
- [ ] Repository created in Azure DevOps
- [ ] Team notified of migration
- [ ] Migration window scheduled
- [ ] Backup strategy confirmed
- [ ] Rollback plan ready
- [ ] Migration script tested (optional)
- [ ] Support team ready
- [ ] Communication channels set up

---

## 🎉 Post-Migration Checklist

After migration completes:

- [ ] Repository verified in Azure Repos
- [ ] All branches present
- [ ] Commit history intact
- [ ] Branch policies configured
- [ ] Code reviewers assigned
- [ ] PR template active
- [ ] First pipeline created
- [ ] Team notified of completion
- [ ] Setup instructions sent
- [ ] Support available
- [ ] Monitoring in place

---

## 📝 Notes and Comments

Use this section for migration-specific notes:

```
Date: _____________
Notes:




Issues encountered:




Resolution:




```

---

## 🏆 Best Practices

1. **Communication is Key**
   - Over-communicate with team
   - Set clear expectations
   - Provide regular updates
   - Be available for questions

2. **Test Everything**
   - Test migration script
   - Test pipelines
   - Test PR workflow
   - Test with team member

3. **Document Everything**
   - Document decisions
   - Document issues and resolutions
   - Update documentation as you go
   - Create FAQs from common questions

4. **Start Simple**
   - Begin with basic pipelines
   - Add complexity gradually
   - Optimize after stable
   - Listen to team feedback

5. **Monitor and Improve**
   - Track metrics
   - Gather feedback
   - Iterate continuously
   - Share learnings

---

## 🚀 Ready to Migrate?

### Final Checklist

✅ Documentation reviewed
✅ Azure DevOps ready
✅ Team notified
✅ Backup plan ready
✅ Support available

### Execute Migration

```bash
# Windows
migrate-to-azure-repos.bat

# Linux/Mac
./migrate-to-azure-repos.sh
```

### After Migration

1. Follow post-migration checklist
2. Configure Azure DevOps
3. Train team
4. Monitor adoption
5. Continuous improvement

---

**Document Version:** 1.0
**Last Updated:** December 2025
**Created By:** Azure Migration Team
**Status:** Ready for Use

---

**Good luck with your migration! 🚀**

For questions or issues, contact the migration lead or DevOps team.
