# Azure Boards Quick Reference Guide

Quick reference for common Azure Boards operations and workflows.

## Work Item Linking

### Commit Messages

```bash
# Link to single work item
git commit -m "feat(auth): add OAuth2 support AB#123"

# Link to multiple work items
git commit -m "fix: resolve login issues AB#123 AB#456"

# Auto-close work items
git commit -m "Fixes AB#123: critical login bug resolved"
git commit -m "Closes AB#456: implement user profile"
```

### PR Titles and Descriptions

```markdown
# PR Title
Add matching algorithm improvements AB#789

# PR Description
This PR implements the new matching algorithm.

Fixes AB#789
Related to AB#790
```

### Branch Naming

```bash
# Feature branches
git checkout -b feature/AB#123-oauth-integration

# Bug fixes
git checkout -b bugfix/AB#456-fix-login-timeout

# Hotfixes
git checkout -b hotfix/AB#789-critical-security-patch

# Release branches
git checkout -b release/v1.2.3
```

## Common CLI Commands

### Query Work Items

```bash
# Current sprint backlog
az boards query \
  --wiql "SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.IterationPath] = @CurrentIteration" \
  --org https://dev.azure.com/citadelcloudmanagement \
  --project DatingPlatform

# My active work items
az boards work-item query \
  --wiql "SELECT [System.Id], [System.Title], [System.State] FROM WorkItems WHERE [System.AssignedTo] = @Me AND [System.State] = 'Active'" \
  --org https://dev.azure.com/citadelcloudmanagement \
  --project DatingPlatform

# Critical bugs
az boards query \
  --wiql "SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.WorkItemType] = 'Bug' AND [Microsoft.VSTS.Common.Severity] = '1 - Critical' AND [System.State] <> 'Closed'" \
  --org https://dev.azure.com/citadelcloudmanagement \
  --project DatingPlatform
```

### Create Work Items

```bash
# Create bug
az boards work-item create \
  --type Bug \
  --title "[BUG] User login fails" \
  --assigned-to "user@datingplatform.com" \
  --area "DatingPlatform\\User Service" \
  --iteration "DatingPlatform\\Sprint 1" \
  --discussion "Bug description and reproduction steps" \
  --org https://dev.azure.com/citadelcloudmanagement \
  --project DatingPlatform

# Create user story
az boards work-item create \
  --type "User Story" \
  --title "As a user, I want to upload profile photos" \
  --assigned-to "user@datingplatform.com" \
  --org https://dev.azure.com/citadelcloudmanagement \
  --project DatingPlatform

# Create task
az boards work-item create \
  --type Task \
  --title "Implement photo upload API" \
  --parent 123 \
  --org https://dev.azure.com/citadelcloudmanagement \
  --project DatingPlatform
```

### Update Work Items

```bash
# Update state
az boards work-item update \
  --id 123 \
  --state Active \
  --org https://dev.azure.com/citadelcloudmanagement \
  --project DatingPlatform

# Assign work item
az boards work-item update \
  --id 123 \
  --assigned-to "user@datingplatform.com" \
  --org https://dev.azure.com/citadelcloudmanagement \
  --project DatingPlatform

# Add comment
az boards work-item update \
  --id 123 \
  --discussion "Implementation complete, ready for review" \
  --org https://dev.azure.com/citadelcloudmanagement \
  --project DatingPlatform

# Update multiple fields
az boards work-item update \
  --id 123 \
  --state "In Review" \
  --assigned-to "reviewer@datingplatform.com" \
  --discussion "Please review PR #456" \
  --org https://dev.azure.com/citadelcloudmanagement \
  --project DatingPlatform
```

### Show Work Item Details

```bash
# Show all fields
az boards work-item show --id 123 \
  --org https://dev.azure.com/citadelcloudmanagement \
  --project DatingPlatform

# Show specific fields
az boards work-item show --id 123 \
  --query "fields.{Title:'System.Title', State:'System.State', AssignedTo:'System.AssignedTo'}" \
  --org https://dev.azure.com/citadelcloudmanagement \
  --project DatingPlatform
```

## Work Item States and Transitions

### User Story States

```
New → Active → Resolved → Closed
     ↓                ↑
     └─── Removed ───┘
```

### Bug States

```
New → Active → Resolved → Closed
     ↓                ↑
     └─── Removed ───┘
```

### Task States

```
To Do → In Progress → Done
```

### Common Transitions

| From State | Event | To State |
|------------|-------|----------|
| New | PR Opened | Active |
| Active | PR Merged to develop | Resolved |
| Resolved | Deployed to Staging | Deployed-Staging |
| Deployed-Staging | Deployed to Production | Closed |
| Any | Deployment Rollback | Active |

## Quick Actions

### Start Working on a Work Item

```bash
# 1. Assign to yourself
az boards work-item update --id 123 --assigned-to "@Me"

# 2. Move to Active
az boards work-item update --id 123 --state Active

# 3. Create feature branch
git checkout -b feature/AB#123-description

# 4. Add comment
az boards work-item update --id 123 --discussion "Started implementation"
```

### Submit Work for Review

```bash
# 1. Push branch
git push origin feature/AB#123-description

# 2. Create PR
gh pr create --title "Implementation AB#123" --body "Implements feature AB#123"

# 3. Update work item
az boards work-item update --id 123 --state "In Review"
```

### Complete Work Item

```bash
# 1. Merge PR
gh pr merge --squash

# 2. Update work item
az boards work-item update --id 123 --state Resolved

# 3. Add completion comment
az boards work-item update --id 123 --discussion "Implementation complete and merged"
```

## Dashboard URLs

### Sprint Dashboard
```
https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_dashboards/dashboard/sprint-overview
```

### Release Dashboard
```
https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_dashboards/dashboard/release-status
```

### Work Items
```
https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_workitems
```

### Queries
```
https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_queries
```

### Boards
```
https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_boards
```

## Common Queries (Copy-Paste)

### My Work Items

```sql
SELECT [System.Id], [System.Title], [System.State]
FROM WorkItems
WHERE [System.AssignedTo] = @Me
  AND [System.State] <> 'Closed'
ORDER BY [Microsoft.VSTS.Common.Priority]
```

### Sprint Backlog

```sql
SELECT [System.Id], [System.WorkItemType], [System.Title], [System.State]
FROM WorkItems
WHERE [System.IterationPath] = @CurrentIteration
  AND [System.State] <> 'Removed'
ORDER BY [Microsoft.VSTS.Common.Priority]
```

### Bugs by Severity

```sql
SELECT [System.Id], [System.Title], [Microsoft.VSTS.Common.Severity], [System.State]
FROM WorkItems
WHERE [System.WorkItemType] = 'Bug'
  AND [System.State] <> 'Closed'
ORDER BY [Microsoft.VSTS.Common.Severity]
```

### Overdue Items

```sql
SELECT [System.Id], [System.Title], [Microsoft.VSTS.Scheduling.TargetDate]
FROM WorkItems
WHERE [Microsoft.VSTS.Scheduling.TargetDate] < @Today
  AND [System.State] NOT IN ('Closed', 'Resolved')
ORDER BY [Microsoft.VSTS.Scheduling.TargetDate]
```

### Recently Closed Items

```sql
SELECT [System.Id], [System.Title], [System.ClosedDate]
FROM WorkItems
WHERE [System.ClosedDate] >= @Today - 7
ORDER BY [System.ClosedDate] DESC
```

## Tags Reference

### Standard Tags

- `bug` - Bug work items
- `user-story` - User story work items
- `task` - Task work items
- `feature` - Feature work items
- `critical` - Critical priority
- `urgent` - Urgent attention needed
- `blocked` - Work item is blocked
- `production` - Production environment
- `staging` - Staging environment
- `security` - Security-related
- `performance` - Performance-related
- `technical-debt` - Technical debt items
- `needs-documentation` - Documentation needed
- `needs-tests` - Tests needed
- `release-blocker` - Blocks release

### Component Tags

- `api-gateway`
- `user-service`
- `matching-service`
- `messaging-service`
- `media-service`
- `notification-service`
- `payment-service`
- `moderation-service`
- `analytics-service`
- `frontend-web`
- `mobile-ios`
- `mobile-android`

## Severity Levels (Bugs)

| Level | Description | Response Time |
|-------|-------------|---------------|
| 1 - Critical | System down, data loss | Immediate (< 1 hour) |
| 2 - High | Major functionality broken | < 4 hours |
| 3 - Medium | Feature not working correctly | < 24 hours |
| 4 - Low | Minor issues, cosmetic | Next sprint |

## Priority Levels

| Priority | Description | Timeline |
|----------|-------------|----------|
| 1 | Critical, must fix immediately | Current sprint |
| 2 | Important, should fix soon | Current/next sprint |
| 3 | Normal priority | Backlog |
| 4 | Low priority, nice to have | Future consideration |

## Keyboard Shortcuts (Azure DevOps Web)

| Action | Shortcut |
|--------|----------|
| New Work Item | `C` |
| Save Work Item | `Ctrl+S` |
| Refresh | `F5` |
| Search | `/` |
| Toggle Full Screen | `Shift+F` |
| Go to Board | `B` |
| Go to Backlog | `K` |
| Go to Queries | `Q` |

## Environment Variables

Required environment variables for automation:

```bash
# Azure DevOps
export AZURE_DEVOPS_TOKEN="your-pat-token"
export AZURE_DEVOPS_ORG="citadelcloudmanagement"
export AZURE_DEVOPS_PROJECT="DatingPlatform"

# GitHub
export GITHUB_TOKEN="your-github-token"

# Notifications (optional)
export SLACK_WEBHOOK_URL="your-slack-webhook"
export TEAMS_WEBHOOK_URL="your-teams-webhook"
export PAGERDUTY_API_KEY="your-pagerduty-key"
```

## Useful Azure CLI Aliases

Add to your shell profile:

```bash
# Azure Boards aliases
alias abq='az boards query --org https://dev.azure.com/citadelcloudmanagement --project DatingPlatform'
alias abwi='az boards work-item --org https://dev.azure.com/citadelcloudmanagement --project DatingPlatform'
alias abshow='az boards work-item show --org https://dev.azure.com/citadelcloudmanagement --project DatingPlatform'
alias abupdate='az boards work-item update --org https://dev.azure.com/citadelcloudmanagement --project DatingPlatform'
alias abcreate='az boards work-item create --org https://dev.azure.com/citadelcloudmanagement --project DatingPlatform'

# Common queries
alias mywork='abq --wiql "SELECT [System.Id], [System.Title], [System.State] FROM WorkItems WHERE [System.AssignedTo] = @Me AND [System.State] <> '\''Closed'\''"'
alias mybug='abq --wiql "SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.AssignedTo] = @Me AND [System.WorkItemType] = '\''Bug'\'' AND [System.State] <> '\''Closed'\''"'
```

## REST API Quick Reference

### Base URL
```
https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_apis
```

### Authentication
```bash
Authorization: Basic $(echo -n :$AZURE_DEVOPS_TOKEN | base64)
```

### Common Endpoints

```bash
# Get work item
GET /wit/workitems/{id}?api-version=6.0

# Update work item
PATCH /wit/workitems/{id}?api-version=6.0

# Query work items
POST /wit/wiql?api-version=6.0

# Create work item
POST /wit/workitems/${type}?api-version=6.0

# Get work item history
GET /wit/workitems/{id}/updates?api-version=6.0
```

## Troubleshooting

### Work Item Not Linking

1. Check format: `AB#123` (capital letters, hash, numbers)
2. Verify work item exists and is accessible
3. Check GitHub-Azure DevOps connection
4. Review webhook logs

### Can't Update Work Item

1. Verify PAT token has "Work Items (Read & Write)" permission
2. Check work item is not locked
3. Verify state transition is valid
4. Ensure you have project access

### Dashboard Not Loading

1. Refresh browser cache (Ctrl+Shift+R)
2. Check query permissions
3. Verify data source connections
4. Try incognito mode

## Support Contacts

- **Azure DevOps Issues**: devops@datingplatform.com
- **Integration Issues**: tech-lead@datingplatform.com
- **General Questions**: team-channel on Slack

## Additional Resources

- [Azure Boards Documentation](https://docs.microsoft.com/en-us/azure/devops/boards/)
- [Work Item Query Language (WIQL)](https://docs.microsoft.com/en-us/azure/devops/boards/queries/wiql-syntax)
- [Azure DevOps CLI Reference](https://docs.microsoft.com/en-us/cli/azure/boards)
- [REST API Documentation](https://docs.microsoft.com/en-us/rest/api/azure/devops/wit/)

---

**Quick Reference Version:** 1.0 (2025-12-02)
