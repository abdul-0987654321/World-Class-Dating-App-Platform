# Azure Repos Migration - Quick Reference Guide

**Project:** World-Class Dating App Platform (Flamoral)
**Azure Repos:** https://dev.azure.com/citadelcloudmanagement/_git/DatingPlatform

---

## 🚀 Quick Commands

### Migration

```bash
# Windows
migrate-to-azure-repos.bat

# Linux/Mac/Git Bash
chmod +x migrate-to-azure-repos.sh
./migrate-to-azure-repos.sh
```

### Setup Azure Remote

```bash
# Add Azure Repos remote
git remote add azure https://dev.azure.com/citadelcloudmanagement/_git/DatingPlatform

# Fetch from Azure
git fetch azure

# Set upstream
git branch --set-upstream-to=azure/main main

# Verify remotes
git remote -v
```

### Switch to Azure as Primary

```bash
# Rename remotes
git remote rename origin github
git remote rename azure origin

# Verify
git remote -v

# Push to new origin (Azure)
git push origin main
```

---

## 📋 Essential Documentation

| Document | When to Use | Time to Read |
|----------|-------------|--------------|
| AZURE_MIGRATION_README.md | Start here | 10 min |
| AZURE_REPOS_MIGRATION_CHECKLIST.md | During migration | 30 min |
| AZURE_REPOS_BRANCH_POLICIES.md | Setting up policies | 20 min |
| AZURE_REPOS_FOLDER_STRUCTURE.md | Understanding structure | 15 min |
| GITIGNORE_GITATTRIBUTES_REVIEW.md | Before migration | 10 min |

---

## ⚡ Common Operations

### Create Feature Branch

```bash
# Update develop
git checkout develop
git pull azure develop

# Create feature branch
git checkout -b feature/AB-1234-feature-name

# Work and commit
git add .
git commit -m "feat: implement feature"

# Push to Azure
git push azure feature/AB-1234-feature-name
```

### Create Pull Request

1. Push branch to Azure Repos
2. Go to Azure DevOps → Repos → Pull Requests
3. Click "New Pull Request"
4. Select source and target branches
5. Fill in PR template
6. Link work item (AB#1234)
7. Add reviewers (or auto-assigned)
8. Create PR

### Update Branch Policies

```bash
# Navigate to Azure DevOps
https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_settings/repositories

# Select repository → Policies
# Choose branch (main/develop)
# Configure policies
```

---

## 🔧 Branch Naming Convention

```
feature/AB-1234-short-description
bugfix/AB-1234-short-description
hotfix/AB-1234-short-description
release/1.0.0
experimental/description
```

**Rules:**
- Lowercase only
- Use hyphens (not underscores)
- Include work item ID (AB#)
- Keep under 50 characters
- Be descriptive

---

## 🏗️ Branch Strategy

```
main (production)
  ↑
  └── develop (integration)
        ↑
        ├── feature/* (new features)
        ├── bugfix/* (bug fixes)
        └── hotfix/* (urgent fixes)
```

**Merge Flow:**
- Features → develop → main
- Hotfixes → main → develop
- Releases → main + develop

---

## 🛡️ Branch Protection Rules

### Main Branch

- ✅ Minimum 2 reviewers required
- ✅ Code owner approval required
- ✅ All comments must be resolved
- ✅ Build must pass
- ✅ Work item must be linked
- ✅ Branch must be up to date

### Develop Branch

- ✅ Minimum 1 reviewer required
- ✅ All comments must be resolved
- ✅ Build must pass

---

## 🔐 Authentication

### Using Personal Access Token (PAT)

1. Go to Azure DevOps → User Settings → Personal Access Tokens
2. Click "New Token"
3. Set scope: Code (Read, Write, Status)
4. Set expiration
5. Generate and copy token

**Use PAT for Git:**

```bash
# Clone with PAT
git clone https://[PAT]@dev.azure.com/citadelcloudmanagement/_git/DatingPlatform

# Or configure credential helper
git config --global credential.helper manager
# Then enter PAT when prompted
```

---

## 🚦 CI/CD Pipelines

### Backend CI

- **File:** `.azuredevops/pipelines/ci-backend.yml`
- **Triggers:** Changes to backend/, packages/shared/
- **Runs:** Lint, tests, build
- **Required:** For PR to main/develop

### Frontend CI

- **File:** `.azuredevops/pipelines/ci-frontend.yml`
- **Triggers:** Changes to apps/web/, apps/web-app/
- **Runs:** Lint, tests, build, E2E
- **Required:** For PR to main/develop

### Security Scan

- **Runs:** On every PR
- **Checks:** npm audit, dependency scanning
- **Required:** Must pass to merge

---

## 📝 PR Template Checklist

Quick checklist for PR authors:

- [ ] Description complete
- [ ] Work item linked (AB#1234)
- [ ] Tests added/updated
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] No console.log or debug code
- [ ] Self-review completed

---

## 🐛 Troubleshooting

### Cannot Push to Azure Repos

```bash
# Check remote URL
git remote -v

# Update remote URL if needed
git remote set-url azure https://dev.azure.com/citadelcloudmanagement/_git/DatingPlatform

# Use Personal Access Token
git remote set-url azure https://[PAT]@dev.azure.com/citadelcloudmanagement/_git/DatingPlatform
```

### PR Cannot Be Completed

**Check:**
- [ ] All reviewers approved?
- [ ] All builds passed?
- [ ] All comments resolved?
- [ ] Work item linked?
- [ ] Branch up to date?

### Pipeline Failing

```bash
# Run tests locally first
yarn test:all

# Check specific service
cd backend
yarn test

cd apps/web-app
yarn test

# View pipeline logs in Azure DevOps
# Pipelines → Runs → [Failed Run] → View Logs
```

### Line Ending Issues

```bash
# Configure Git
git config core.autocrlf input  # Mac/Linux
git config core.autocrlf true   # Windows

# Re-normalize repository
git add --renormalize .
git commit -m "chore: normalize line endings"
```

---

## 🔍 Verification Commands

### Verify Migration

```bash
# Check remotes
git remote -v

# List branches
git branch -a

# Verify commits
git log --oneline -10

# Compare with GitHub
git diff origin/main azure/main
```

### Verify Git Configuration

```bash
# Check .gitignore
git check-ignore -v node_modules/

# Check .gitattributes
git check-attr -a package.json

# Check line endings
git ls-files --eol
```

---

## 📊 Useful Azure CLI Commands

### Install Azure CLI

```bash
# Windows (PowerShell)
Invoke-WebRequest -Uri https://aka.ms/installazurecliwindows -OutFile .\AzureCLI.msi; Start-Process msiexec.exe -Wait -ArgumentList '/I AzureCLI.msi /quiet'

# Mac
brew install azure-cli

# Linux
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

### Login

```bash
az login
az devops configure --defaults organization=https://dev.azure.com/citadelcloudmanagement project=DatingPlatform
```

### Repository Operations

```bash
# List repositories
az repos list

# Show repository details
az repos show --repository DatingPlatform

# List branches
az repos ref list --repository DatingPlatform

# List policies
az repos policy list --repository-id [REPO-ID]
```

---

## 🎯 Key URLs

### Azure DevOps

- **Organization:** https://dev.azure.com/citadelcloudmanagement
- **Project:** https://dev.azure.com/citadelcloudmanagement/DatingPlatform
- **Repository:** https://dev.azure.com/citadelcloudmanagement/_git/DatingPlatform
- **Pipelines:** https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_build
- **Pull Requests:** https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_git/DatingPlatform/pullrequests
- **Boards:** https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_boards

### Settings

- **Repository Settings:** https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_settings/repositories
- **Branch Policies:** https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_settings/repositories?_a=policiesMid&repo=[REPO-ID]
- **Project Settings:** https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_settings/

---

## 📞 Quick Contacts

| Role | Contact | Use For |
|------|---------|---------|
| Migration Lead | [Name/Email] | Migration issues |
| DevOps Team | [Email/Channel] | Pipeline issues |
| Backend Lead | [Name/Email] | Backend code reviews |
| Frontend Lead | [Name/Email] | Frontend code reviews |
| Support Channel | [Slack/Teams] | General questions |

---

## 🚨 Emergency Procedures

### Rollback Migration

```bash
# If migration needs to be rolled back:
1. Re-enable GitHub repository
2. Notify team immediately
3. Restore from backup-[timestamp] folder
4. Document issues
5. Plan retry
```

### Critical Production Issue

```bash
# Hotfix process
1. Create hotfix branch from main
   git checkout -b hotfix/AB-XXXX-critical-fix main

2. Make fix and test thoroughly

3. Create expedited PR to main
   - Mark as urgent
   - Require minimum reviewers
   - Fast-track approval

4. Merge to main
5. Deploy immediately
6. Merge back to develop
7. Document in post-mortem
```

---

## 📈 Performance Tips

### Faster Clones

```bash
# Shallow clone (faster)
git clone --depth 1 https://dev.azure.com/citadelcloudmanagement/_git/DatingPlatform

# Single branch
git clone --single-branch --branch main https://dev.azure.com/citadelcloudmanagement/_git/DatingPlatform
```

### Faster Builds

```yaml
# In Azure Pipelines
- task: Cache@2
  inputs:
    key: 'yarn | "$(Agent.OS)" | yarn.lock'
    path: $(YARN_CACHE_FOLDER)
  displayName: 'Cache dependencies'
```

### Efficient Git Operations

```bash
# Fetch only specific branch
git fetch azure main

# Prune deleted branches
git fetch --prune

# Clean up local branches
git branch --merged | grep -v "\*" | xargs -n 1 git branch -d
```

---

## 🎓 Learning Resources

### Azure DevOps

- **Documentation:** https://docs.microsoft.com/azure/devops/
- **Learn Path:** https://docs.microsoft.com/learn/azure-devops/
- **YouTube:** https://www.youtube.com/c/AzureDevOps

### Git

- **Git Documentation:** https://git-scm.com/doc
- **Pro Git Book:** https://git-scm.com/book/en/v2
- **Git Cheat Sheet:** https://training.github.com/downloads/github-git-cheat-sheet/

### Pipelines

- **YAML Reference:** https://docs.microsoft.com/azure/devops/pipelines/yaml-schema
- **Tasks Reference:** https://docs.microsoft.com/azure/devops/pipelines/tasks/
- **Examples:** https://github.com/microsoft/azure-pipelines-yaml

---

## ✅ Daily Operations Checklist

### Morning Routine

```bash
# Update your local repository
git checkout develop
git pull azure develop

# Check for new PRs to review
# Visit: https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_git/DatingPlatform/pullrequests

# Check pipeline status
# Visit: https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_build
```

### Before Starting Work

```bash
# Create feature branch
git checkout develop
git pull azure develop
git checkout -b feature/AB-XXXX-feature-name

# Verify you're on correct branch
git branch --show-current
```

### Before Submitting PR

```bash
# Run tests locally
yarn lint:all
yarn test:all

# Commit all changes
git add .
git commit -m "feat: descriptive message"

# Update from develop
git fetch azure develop
git rebase azure/develop

# Push to Azure
git push azure feature/AB-XXXX-feature-name

# Create PR in Azure DevOps
```

### End of Day

```bash
# Commit work in progress
git add .
git commit -m "WIP: progress on feature"
git push azure feature/AB-XXXX-feature-name

# Or stash uncommitted changes
git stash save "WIP: description"
```

---

## 🎯 Success Metrics

Track these after migration:

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Team Adoption | 100% in 1 week | All team using Azure Repos |
| PR Cycle Time | <24 hours | From creation to merge |
| Pipeline Success Rate | >95% | Failed builds / total builds |
| First-time PR Success | >80% | PRs passing without fixes |
| Developer Satisfaction | >4/5 | Survey score |

---

## 💡 Pro Tips

1. **Use Git Aliases**
   ```bash
   git config --global alias.co checkout
   git config --global alias.br branch
   git config --global alias.st status
   git config --global alias.last 'log -1 HEAD'
   ```

2. **Enable Auto-fetch**
   ```bash
   git config --global fetch.prune true
   git config --global fetch.pruneTags true
   ```

3. **Better Git Log**
   ```bash
   git log --graph --oneline --all --decorate
   ```

4. **Quick Stash**
   ```bash
   git stash save "descriptive message"
   git stash list
   git stash pop
   ```

5. **Interactive Rebase**
   ```bash
   git rebase -i HEAD~3  # Edit last 3 commits
   ```

---

## 📱 Mobile Access

### Azure DevOps Mobile App

- **iOS:** https://apps.apple.com/app/azure-devops/id1366449592
- **Android:** https://play.google.com/store/apps/details?id=com.microsoft.vstsandroid

**Features:**
- View/approve PRs
- Monitor pipelines
- View work items
- Receive notifications

---

## 🔔 Notification Setup

### Configure Email Notifications

1. Go to Azure DevOps → User Settings → Notifications
2. Configure notifications for:
   - PR created/updated
   - PR approved/rejected
   - Build completed/failed
   - Work item assigned

### Configure Slack/Teams Integration

1. Add Azure DevOps app to Slack/Teams
2. Subscribe to repository events
3. Get notifications in channel

---

## 🎉 Quick Wins

After migration, achieve these quick wins:

- [ ] First successful PR in Azure Repos
- [ ] All team members have access
- [ ] First pipeline passing
- [ ] Branch policies working
- [ ] Code reviews functional
- [ ] Deployments successful
- [ ] Team trained and comfortable

---

**Document Version:** 1.0
**Last Updated:** December 2025
**Print this for easy reference!**

---

For detailed information, see the full documentation:
- AZURE_MIGRATION_README.md
- AZURE_REPOS_MIGRATION_CHECKLIST.md
- AZURE_REPOS_BRANCH_POLICIES.md
