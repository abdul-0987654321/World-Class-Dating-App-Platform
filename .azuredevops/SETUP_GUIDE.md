# Azure Boards Integration Setup Guide

This guide provides step-by-step instructions for setting up Azure Boards integration with your Dating Platform project.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Azure DevOps Configuration](#azure-devops-configuration)
3. [GitHub Integration](#github-integration)
4. [Work Item Templates](#work-item-templates)
5. [Branch Policies](#branch-policies)
6. [Pipeline Integration](#pipeline-integration)
7. [Queries and Dashboards](#queries-and-dashboards)
8. [Automation Rules](#automation-rules)
9. [Testing and Validation](#testing-and-validation)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

Before starting, ensure you have:

- [ ] Azure DevOps organization and project created
- [ ] Project URL: https://dev.azure.com/citadelcloudmanagement/DatingPlatform
- [ ] Azure DevOps Administrator access
- [ ] GitHub repository access (admin or write permissions)
- [ ] Azure CLI installed (`az` command)
- [ ] GitHub CLI installed (`gh` command)

### Install Required Tools

```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Install Azure DevOps extension
az extension add --name azure-devops

# Install GitHub CLI
winget install GitHub.cli

# Login to Azure DevOps
az login
az devops login

# Login to GitHub
gh auth login
```

## Azure DevOps Configuration

### Step 1: Configure Project Settings

```bash
# Set default organization and project
az devops configure --defaults organization=https://dev.azure.com/citadelcloudmanagement project=DatingPlatform

# Verify configuration
az devops project show --project DatingPlatform
```

### Step 2: Create Area Paths

```bash
# Create area paths for different components
az boards area project create --name "API Gateway" --project DatingPlatform
az boards area project create --name "User Service" --project DatingPlatform
az boards area project create --name "Matching Service" --project DatingPlatform
az boards area project create --name "Messaging Service" --project DatingPlatform
az boards area project create --name "Media Service" --project DatingPlatform
az boards area project create --name "Frontend" --project DatingPlatform
az boards area project create --name "Mobile" --project DatingPlatform
az boards area project create --name "Infrastructure" --project DatingPlatform
```

### Step 3: Create Iteration Paths (Sprints)

```bash
# Create sprint structure (2-week sprints)
az boards iteration project create --name "Sprint 1" --start-date 2025-12-02 --finish-date 2025-12-15
az boards iteration project create --name "Sprint 2" --start-date 2025-12-16 --finish-date 2025-12-29
az boards iteration project create --name "Sprint 3" --start-date 2025-12-30 --finish-date 2026-01-12
# Continue for additional sprints...
```

### Step 4: Create Teams

```bash
# Create specialized teams
az devops team create --name "Backend Team" --project DatingPlatform
az devops team create --name "Frontend Team" --project DatingPlatform
az devops team create --name "Mobile Team" --project DatingPlatform
az devops team create --name "DevOps Team" --project DatingPlatform
az devops team create --name "QA Team" --project DatingPlatform
```

## GitHub Integration

### Step 1: Install Azure Boards App

1. Go to GitHub Marketplace: https://github.com/marketplace/azure-boards
2. Click "Install it for free"
3. Select your repository: `World-Class-Dating-App-Platform`
4. Authorize the app

### Step 2: Connect Azure Boards to GitHub

```bash
# Using Azure DevOps UI:
# 1. Go to Project Settings > GitHub connections
# 2. Add connection
# 3. Authorize GitHub
# 4. Select repository: World-Class-Dating-App-Platform
```

Or via Azure CLI:

```bash
# Create service connection
az devops service-endpoint github create \
  --github-url https://github.com/citadelcloudmanagement/World-Class-Dating-App-Platform \
  --name "GitHub-Dating-Platform" \
  --project DatingPlatform
```

### Step 3: Configure Work Item Linking

In Azure DevOps:
1. Go to **Project Settings** → **GitHub connections**
2. Select your repository
3. Enable **"Link GitHub commits and pull requests to work items"**
4. Set pattern: `AB#{number}`

## Work Item Templates

### Step 1: Import Bug Template

```bash
# Navigate to .azuredevops directory
cd .azuredevops/work-item-templates

# Import bug template (manual via UI required)
# Go to: Boards > Work Items > Templates > New Template
# Import: bug-template.json
```

**Manual Steps:**
1. Open Azure Boards
2. Go to **Boards** → **Work Items**
3. Click **Templates** (gear icon)
4. Click **New Template**
5. Select **Bug** work item type
6. Copy content from `bug-template.json`
7. Configure fields and rules
8. Save as "Bug Template - Dating Platform"

### Step 2: Import User Story Template

Repeat the process for:
- `user-story-template.json` → User Story Template
- `task-template.json` → Task Template
- `feature-template.json` → Feature Template

### Step 3: Set Default Templates

1. Go to **Project Settings** → **Work** → **Templates**
2. For each work item type, set the imported template as default
3. Save changes

## Branch Policies

### Step 1: Configure Main Branch Policies

```bash
# Set branch policies via Azure CLI
az repos policy create \
  --branch main \
  --enabled true \
  --blocking true \
  --repository-id <REPO_ID> \
  --project DatingPlatform
```

**Manual Configuration (Recommended):**

1. Go to **Repos** → **Branches**
2. Find `main` branch, click **•••** → **Branch policies**

**Configure the following:**

#### A. Require Work Item Linking
- ✅ Check "Require work items"
- ✅ Check "Required"

#### B. Require Minimum Number of Reviewers
- Minimum reviewers: **3**
- ✅ Allow requestors to approve their own changes: **No**
- ✅ Prohibit the most recent pusher from approving: **Yes**
- ✅ Reset votes when changes pushed: **Yes**

#### C. Build Validation
Add the following build pipelines:
- **CI-Backend** (required)
- **CI-Frontend** (required)
- **Security-Tests** (required)
- **E2E-Tests** (optional)

Settings for each:
- Policy requirement: **Required**
- Build expiration: **12 hours**
- Display name: [Pipeline name]

#### D. Status Checks
Add required status checks:
- `code-quality/eslint`
- `code-quality/prettier`
- `security/dependency-check`
- `security/sonarqube`
- `tests/unit-tests`
- `tests/integration-tests`

#### E. Comment Requirements
- ✅ Check "Check for comment resolution"
- ✅ Required

### Step 2: Configure Develop Branch Policies

Repeat for `develop` branch with these differences:
- Minimum reviewers: **2**
- Build validation: Same as main
- Less strict on status checks

### Step 3: Configure Release Branch Pattern Policies

1. Go to **Branch policies**
2. Click **Add branch pattern**
3. Pattern: `release/*`
4. Apply similar policies as main branch

### Step 4: Enforce Branch Naming

Since Azure DevOps doesn't support branch naming enforcement natively, add this to GitHub Actions:

```yaml
# .github/workflows/branch-name-check.yml
name: Branch Name Check
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - name: Check branch name
        run: |
          BRANCH="${GITHUB_HEAD_REF}"
          if [[ ! $BRANCH =~ ^(feature|bugfix|hotfix)/AB#[0-9]+-[a-z0-9-]+$ ]] && \
             [[ ! $BRANCH =~ ^release/v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            echo "Invalid branch name: $BRANCH"
            exit 1
          fi
```

## Pipeline Integration

### Step 1: Add Azure Boards Extension to Pipelines

Update your pipeline YAML files to include work item linking:

**Backend CI Pipeline (.github/workflows/ci-backend.yml):**

```yaml
name: Backend CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Link to Azure Boards
        uses: danhellem/github-actions-issue-to-work-item@master
        env:
          ado_token: "${{ secrets.AZURE_DEVOPS_TOKEN }}"
          github_token: "${{ secrets.GITHUB_TOKEN }}"
          ado_organization: "citadelcloudmanagement"
          ado_project: "DatingPlatform"
          ado_area_path: "DatingPlatform\\API Gateway"
          ado_wit: "Issue"

      # ... rest of pipeline
```

### Step 2: Configure Work Item State Transitions

Add this workflow for state transitions:

```yaml
# .github/workflows/azure-boards-sync.yml
name: Azure Boards Sync

on:
  pull_request:
    types: [opened, closed, reopened]
  push:
    branches: [main, develop]

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Update Work Item State
        uses: danhellem/github-actions-issue-to-work-item@master
        env:
          ado_token: "${{ secrets.AZURE_DEVOPS_TOKEN }}"
          github_token: "${{ secrets.GITHUB_TOKEN }}"
          ado_organization: "citadelcloudmanagement"
          ado_project: "DatingPlatform"

      - name: PR Opened - Move to Active
        if: github.event.action == 'opened'
        run: |
          # Extract work item IDs from PR
          WORK_ITEMS=$(echo "${{ github.event.pull_request.body }}" | grep -oP 'AB#\K[0-9]+')
          for ITEM in $WORK_ITEMS; do
            az boards work-item update --id $ITEM --state "Active"
          done

      - name: PR Merged - Move to Resolved
        if: github.event.pull_request.merged == true
        run: |
          WORK_ITEMS=$(echo "${{ github.event.pull_request.body }}" | grep -oP 'AB#\K[0-9]+')
          for ITEM in $WORK_ITEMS; do
            az boards work-item update --id $ITEM --state "Resolved"
          done
```

### Step 3: Add Release Notes Generation

Create workflow for release notes:

```yaml
# .github/workflows/release-notes.yml
name: Generate Release Notes

on:
  release:
    types: [published]

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Generate Release Notes from Azure Boards
        run: |
          # Query closed work items since last release
          az boards work-item query \
            --wiql "SELECT [System.Id], [System.Title], [System.WorkItemType] FROM WorkItems WHERE [System.State] = 'Closed' AND [System.ClosedDate] >= '$(date -d '30 days ago' +%Y-%m-%d)'" \
            --output table > release-notes.md

      - name: Update Release
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const notes = fs.readFileSync('release-notes.md', 'utf8');
            await github.rest.repos.updateRelease({
              owner: context.repo.owner,
              repo: context.repo.repo,
              release_id: context.payload.release.id,
              body: notes
            });
```

### Step 4: Configure Secrets

Add required secrets to GitHub:

```bash
# Generate Azure DevOps PAT
# Go to: https://dev.azure.com/citadelcloudmanagement/_usersSettings/tokens
# Create token with: Work Items (Read & Write), Code (Read), Build (Read)

# Add to GitHub secrets
gh secret set AZURE_DEVOPS_TOKEN --body "YOUR_PAT_TOKEN"
gh secret set AZURE_DEVOPS_ORG --body "citadelcloudmanagement"
gh secret set AZURE_DEVOPS_PROJECT --body "DatingPlatform"
```

## Queries and Dashboards

### Step 1: Import Queries

**Manual Import (Azure DevOps UI):**

1. Go to **Boards** → **Queries**
2. Click **New** → **New query**
3. Open `queries/sprint-backlog.wiq`
4. Copy the WIQL query
5. Paste into query editor
6. Save as "Sprint Backlog"
7. Repeat for other queries

**Or use Azure CLI:**

```bash
# Create Sprint Backlog query
az boards query create \
  --name "Sprint Backlog" \
  --wiql @queries/sprint-backlog.wiq \
  --project DatingPlatform

# Create Bug Tracking query
az boards query create \
  --name "Bug Tracking" \
  --wiql @queries/bug-tracking.wiq \
  --project DatingPlatform

# Create Release Readiness query
az boards query create \
  --name "Release Readiness" \
  --wiql @queries/release-readiness.wiq \
  --project DatingPlatform
```

### Step 2: Create Sprint Dashboard

1. Go to **Overview** → **Dashboards**
2. Click **New Dashboard**
3. Name: "Sprint Overview"
4. Add widgets based on `dashboards/sprint-dashboard.json`:

**Add These Widgets:**
- Sprint Burndown
- Sprint Capacity
- Velocity Chart
- Work Items by State (donut chart)
- Query Results (Sprint Backlog query)
- Cumulative Flow Diagram
- Team Members
- Build History
- Pull Requests

5. Configure each widget:
   - Select appropriate queries
   - Set team and iteration
   - Configure display options

### Step 3: Create Release Dashboard

1. Create new dashboard: "Release Status"
2. Add widgets based on `dashboards/release-dashboard.json`:

**Add These Widgets:**
- Release Progress (progress bar)
- Release Gates (checklist - requires extension)
- Deployment Status
- Release Blockers (query results)
- Critical Bugs (counter)
- Test Results
- Build History
- Release Notes Preview

## Automation Rules

### Step 1: Configure Auto-Assignment Rules

Azure DevOps doesn't support file-based automation rules, so we'll use Azure DevOps Service Hooks and Azure Logic Apps.

**Setup Service Hook:**

1. Go to **Project Settings** → **Service Hooks**
2. Click **Create subscription**
3. Select **Web Hooks**
4. Configure for "Work item created" event
5. Set webhook URL (Logic App endpoint)

**Create Logic App for Auto-Assignment:**

```json
{
  "definition": {
    "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
    "triggers": {
      "manual": {
        "type": "Request",
        "kind": "Http"
      }
    },
    "actions": {
      "Parse_JSON": {
        "type": "ParseJson",
        "inputs": {
          "content": "@triggerBody()",
          "schema": {}
        }
      },
      "Condition_Critical_Bug": {
        "type": "If",
        "expression": {
          "and": [
            {
              "equals": [
                "@body('Parse_JSON')?['resource']?['fields']?['Microsoft.VSTS.Common.Severity']",
                "1 - Critical"
              ]
            }
          ]
        },
        "actions": {
          "Assign_To_Tech_Lead": {
            "type": "Http",
            "inputs": {
              "method": "PATCH",
              "uri": "https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_apis/wit/workitems/@{body('Parse_JSON')?['resource']?['id']}?api-version=6.0",
              "headers": {
                "Content-Type": "application/json-patch+json",
                "Authorization": "Bearer @{parameters('AzureDevOpsPAT')}"
              },
              "body": [
                {
                  "op": "add",
                  "path": "/fields/System.AssignedTo",
                  "value": "tech-lead@datingplatform.com"
                }
              ]
            }
          }
        }
      }
    }
  }
}
```

### Step 2: Configure State Transition Webhooks

Already handled by GitHub Actions workflow created in Pipeline Integration step.

### Step 3: Configure Notifications

1. Go to **Project Settings** → **Notifications**
2. Create team-level notifications:

**For Critical Bugs:**
- Event: Work item created
- Work item type: Bug
- Field: Severity equals Critical
- Recipients: Tech Leads team
- Channels: Email + Teams

**For Deployments:**
- Event: Release deployment completed
- Environment: Production
- Recipients: All teams
- Channels: Email + Slack

## Testing and Validation

### Test 1: Work Item Linking

```bash
# Create a test work item
WORK_ITEM_ID=$(az boards work-item create \
  --type "User Story" \
  --title "Test work item linking" \
  --project DatingPlatform \
  --query id -o tsv)

# Create test branch
git checkout -b feature/AB#${WORK_ITEM_ID}-test-linking

# Make a commit with AB# reference
echo "test" > test.txt
git add test.txt
git commit -m "test: validate work item linking AB#${WORK_ITEM_ID}"
git push origin feature/AB#${WORK_ITEM_ID}-test-linking

# Verify link in Azure Boards
az boards work-item show --id ${WORK_ITEM_ID}
```

### Test 2: PR Template and Branch Policies

```bash
# Create PR using GitHub CLI
gh pr create \
  --title "Test PR with work item AB#${WORK_ITEM_ID}" \
  --body "Testing work item linking and branch policies. AB#${WORK_ITEM_ID}"

# Verify:
# - PR template loaded correctly
# - Work item link detected
# - Branch policies enforced
# - Build validation triggered
```

### Test 3: State Transitions

```bash
# Monitor work item state as PR progresses
watch -n 5 "az boards work-item show --id ${WORK_ITEM_ID} --query 'fields.\"System.State\"'"

# Expected states:
# PR opened → Active
# PR merged → Resolved
# Deployed to production → Closed
```

### Test 4: Notifications

1. Create critical bug
2. Verify notifications sent to:
   - Tech leads (email)
   - DevOps team (Teams/Slack)
   - On-call engineer (PagerDuty)

### Test 5: Dashboard Widgets

1. Open Sprint Dashboard
2. Verify all widgets load correctly
3. Check data accuracy
4. Test filter and refresh functionality

## Troubleshooting

### Issue: Work Items Not Linking

**Symptoms:** Commits reference AB#123 but work item doesn't show link

**Solutions:**
1. Verify GitHub app is installed and authorized
2. Check Azure Boards connection in Project Settings
3. Ensure work item ID is correct and accessible
4. Review service hook logs for errors
5. Verify PAT token has correct permissions

### Issue: Branch Policies Not Enforcing

**Symptoms:** PRs can be merged without meeting requirements

**Solutions:**
1. Check branch policy configuration in Azure DevOps
2. Verify policies are set to "Required" not "Optional"
3. Ensure target branch matches policy pattern
4. Check user doesn't have policy override permissions

### Issue: State Transitions Not Working

**Symptoms:** Work item state doesn't change on PR merge

**Solutions:**
1. Check GitHub Actions workflow logs
2. Verify Azure DevOps PAT token in secrets
3. Ensure work item is in valid transition state
4. Check automation rules are enabled

### Issue: Queries Returning No Results

**Symptoms:** Saved queries show no data

**Solutions:**
1. Verify query WIQL syntax
2. Check iteration path matches current sprint
3. Ensure work items exist with matching criteria
4. Verify user has permissions to view work items

### Issue: Dashboard Widgets Not Loading

**Symptoms:** Widgets show "Unable to load data"

**Solutions:**
1. Check query permissions
2. Verify team and iteration settings
3. Refresh browser and clear cache
4. Check Azure DevOps service status

## Next Steps

After completing setup:

1. **Team Training**
   - Conduct training session on Azure Boards usage
   - Review work item linking requirements
   - Demonstrate PR process and policies

2. **Process Documentation**
   - Document team-specific workflows
   - Create quick reference guides
   - Update onboarding documentation

3. **Continuous Improvement**
   - Gather team feedback
   - Iterate on queries and dashboards
   - Refine automation rules
   - Optimize notification settings

4. **Integration with Other Tools**
   - Set up Slack/Teams webhooks
   - Configure PagerDuty integration
   - Connect monitoring tools (Azure Monitor, App Insights)

## Support Resources

- **Azure DevOps Documentation**: https://docs.microsoft.com/en-us/azure/devops/
- **Azure Boards REST API**: https://docs.microsoft.com/en-us/rest/api/azure/devops/wit/
- **GitHub Actions for Azure**: https://github.com/Azure/actions
- **Team Contact**: devops@datingplatform.com

---

**Setup Completion Checklist:**

- [ ] Azure DevOps project configured
- [ ] GitHub integration connected
- [ ] Work item templates imported
- [ ] Branch policies configured
- [ ] Pipeline integration complete
- [ ] Queries and dashboards created
- [ ] Automation rules configured
- [ ] Testing and validation passed
- [ ] Team training scheduled
- [ ] Documentation updated

**Estimated Setup Time:** 2-3 hours

**Configuration Version:** 1.0 (2025-12-02)
