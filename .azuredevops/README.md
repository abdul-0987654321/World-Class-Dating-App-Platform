# Azure Boards Integration Configuration

This directory contains comprehensive Azure Boards integration configuration for the Dating Platform project. These configurations enable seamless integration between Azure DevOps, GitHub, and your CI/CD pipelines.

## Overview

The Azure Boards integration provides:
- **Work Item Templates**: Standardized templates for bugs, user stories, tasks, and features
- **Pipeline Integration**: Automated work item linking and state transitions
- **Branch Policies**: Enforcement of work item linking and quality gates
- **Queries**: Pre-configured queries for sprint management, bug tracking, and release readiness
- **Dashboards**: Real-time dashboards for sprint and release tracking
- **Automation Rules**: Intelligent work item assignment and state management
- **Notifications**: Comprehensive notification system for team communication

## Directory Structure

```
.azuredevops/
├── README.md                          # This file
├── SETUP_GUIDE.md                     # Detailed setup instructions
├── INTEGRATION_GUIDE.md               # Integration implementation guide
├── azure-boards-integration.yml       # Main integration configuration
├── branch-policies.json               # Branch policy definitions
├── pull-request-template.md          # PR template with work item linking
├── work-item-templates/              # Work item templates
│   ├── bug-template.json
│   ├── user-story-template.json
│   ├── task-template.json
│   └── feature-template.json
├── queries/                          # Azure Boards queries
│   ├── sprint-backlog.wiq
│   ├── bug-tracking.wiq
│   └── release-readiness.wiq
├── dashboards/                       # Dashboard configurations
│   ├── sprint-dashboard.json
│   └── release-dashboard.json
└── automation-rules/                 # Automation rules
    ├── auto-assign-rules.json
    ├── state-transition-rules.json
    └── notification-rules.json
```

## Quick Start

### 1. Azure DevOps Project Setup

Your Azure Boards project is configured at:
- **Organization**: citadelcloudmanagement
- **Project**: DatingPlatform
- **URL**: https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_workitems

### 2. Work Item Linking Format

Use the `AB#123` format in commits and PRs to link work items:

```bash
# In commit messages
git commit -m "feat(auth): implement OAuth2 login AB#123"

# In PR titles or descriptions
Add matching algorithm improvements AB#456
```

### 3. Branch Naming Convention

Follow these patterns for automatic work item detection:

```bash
# Feature branches
feature/AB#123-feature-name

# Bug fixes
bugfix/AB#456-bug-description

# Hotfixes
hotfix/AB#789-critical-fix

# Release branches
release/v1.2.3
```

## Core Features

### Work Item Templates

Pre-configured templates ensure consistency and completeness:

- **Bug Template**: Includes reproduction steps, environment info, severity, and acceptance criteria
- **User Story Template**: Follows user story format with acceptance criteria and technical notes
- **Task Template**: Structured for clear deliverables with definition of done
- **Feature Template**: High-level features with business value and success metrics

**Usage:**
```bash
# Create work item from template via Azure CLI
az boards work-item create \
  --type "Bug" \
  --title "[BUG] User login fails on mobile" \
  --template bug-template
```

### Pipeline Integration

Automatic work item updates based on pipeline events:

1. **Commit Linking**: Commits with `AB#123` automatically link to work items
2. **PR State Transitions**: Work items move through states as PRs progress
3. **Build Notifications**: Build status updates posted to work items
4. **Deployment Tracking**: Work items updated on staging/production deployments
5. **Release Notes**: Automatically generated from closed work items

### Branch Policies

Enforced policies ensure quality and traceability:

- ✅ Work item linking required
- ✅ Minimum 2 approvers (3 for main branch)
- ✅ Build validation (CI tests must pass)
- ✅ Security scanning required
- ✅ Comment resolution required
- ✅ Branch naming convention enforced

### Queries

Pre-built queries for common scenarios:

1. **Sprint Backlog**: Current sprint work items with progress tracking
2. **Bug Tracking**: Comprehensive bug analysis and metrics
3. **Release Readiness**: Complete release gate checklist and blockers

### Dashboards

Real-time dashboards for visibility:

1. **Sprint Dashboard**: Burndown, velocity, capacity, and team metrics
2. **Release Dashboard**: Release progress, gates, blockers, and deployment status

### Automation Rules

Intelligent automation for efficiency:

1. **Auto-Assignment**: Assigns work items based on component and severity
2. **State Transitions**: Updates work item states based on PR and deployment events
3. **Notifications**: Smart notifications to relevant team members
4. **Escalation**: Automatic escalation of overdue high-priority items

## Implementation Steps

### Phase 1: Work Item Templates (15 minutes)

1. Import work item templates to Azure DevOps
2. Customize templates for your team's needs
3. Set as default templates for the project

### Phase 2: Branch Policies (20 minutes)

1. Review branch policies configuration
2. Apply policies to protected branches (main, develop)
3. Configure build validation pipelines
4. Test policy enforcement

### Phase 3: Pipeline Integration (30 minutes)

1. Add Azure Boards service connection to pipelines
2. Update pipeline YAML files with work item linking
3. Configure state transition webhooks
4. Test commit and PR linking

### Phase 4: Queries and Dashboards (25 minutes)

1. Import queries to Azure Boards
2. Create team dashboards using provided configurations
3. Customize widgets and filters
4. Share dashboards with team

### Phase 5: Automation Rules (30 minutes)

1. Configure automation rules in Azure DevOps
2. Set up notification channels (email, Slack, Teams)
3. Test auto-assignment rules
4. Validate state transitions

## Configuration Files

### azure-boards-integration.yml

Main configuration file defining:
- Work item linking patterns
- State transition rules
- Release notes generation
- Dashboard widgets
- Notification rules

### branch-policies.json

Branch protection and quality gates:
- Work item linking requirements
- PR review requirements
- Build validation settings
- Merge strategy enforcement

### pull-request-template.md

Comprehensive PR template including:
- Work item linking
- Change description
- Testing checklist
- Security considerations
- Deployment notes

## Automation Examples

### Auto-assign bugs to component owners

```json
{
  "trigger": "work_item_created",
  "workItemType": "Bug",
  "condition": "Component is set",
  "action": "Assign to component owner"
}
```

### Move to Active on PR creation

```json
{
  "trigger": "pull_request_opened",
  "condition": "Work item state is New",
  "action": "Transition to Active"
}
```

### Close on production deployment

```json
{
  "trigger": "deployment_completed",
  "environment": "production",
  "condition": "Work item state is Resolved",
  "action": "Transition to Closed"
}
```

## Queries Usage

### Sprint Backlog Query

View all work items for current sprint:

```sql
SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo]
FROM WorkItems
WHERE [System.IterationPath] = @CurrentIteration
  AND [System.State] <> 'Removed'
ORDER BY [Microsoft.VSTS.Common.Priority]
```

### Bug Tracking Query

Track active bugs by severity:

```sql
SELECT [System.Id], [System.Title], [Microsoft.VSTS.Common.Severity]
FROM WorkItems
WHERE [System.WorkItemType] = 'Bug'
  AND [System.State] NOT IN ('Closed', 'Resolved')
ORDER BY [Microsoft.VSTS.Common.Severity]
```

## Dashboard Widgets

### Sprint Dashboard Includes:
- Sprint burndown chart
- Team velocity
- Work items by state
- Active work items list
- Blocked items alert
- Build status
- PR status

### Release Dashboard Includes:
- Release progress bar
- Release gates checklist
- Release blockers
- Critical bugs counter
- Deployment status
- Test results
- Quality metrics

## Notification Rules

Configured notifications for:
- Critical bug creation → Tech leads + DevOps
- Production bugs → On-call engineer
- Work item assignment → Assignee
- PR review requests → Reviewers
- Build failures → Author + team
- Deployment completion → Stakeholders
- Overdue items → Assignee + manager

## Best Practices

### Commit Messages

```bash
# Good
feat(matching): improve algorithm performance AB#123
fix(auth): resolve session timeout issue AB#456
docs: update API documentation AB#789

# Bad (no work item link)
fixed bug
update code
```

### PR Descriptions

Always include:
- Work item link (`AB#123`)
- Clear description of changes
- Testing performed
- Deployment considerations
- Breaking changes (if any)

### Work Item Management

- Link all commits and PRs to work items
- Keep work items up to date
- Use appropriate work item types
- Set priority and severity correctly
- Add relevant tags for filtering

## Troubleshooting

### Work Items Not Linking

**Issue**: Commits/PRs not linking to work items
**Solution**:
1. Verify `AB#123` format is correct
2. Check Azure Boards service connection
3. Ensure work item exists and is accessible
4. Review pipeline logs for errors

### State Transitions Not Working

**Issue**: Work item states not updating automatically
**Solution**:
1. Verify webhook configuration
2. Check automation rule conditions
3. Review work item current state
4. Ensure user has permissions

### Dashboard Not Loading

**Issue**: Dashboard widgets showing errors
**Solution**:
1. Check query permissions
2. Verify data source connections
3. Review widget configuration
4. Clear browser cache

## Security Considerations

- Work item templates include security review checklist
- Security vulnerabilities trigger critical notifications
- Security tags trigger automatic security team assignment
- Security scans integrated into branch policies

## Compliance

- All work items linked to code changes for traceability
- Audit trail maintained in Azure DevOps
- Release notes automatically generated
- Deployment approvals enforced through gates

## Support

For issues or questions:
- **Azure DevOps**: https://dev.azure.com/citadelcloudmanagement/DatingPlatform
- **Documentation**: See SETUP_GUIDE.md and INTEGRATION_GUIDE.md
- **Team Contact**: devops@datingplatform.com

## Additional Resources

- [Azure Boards Documentation](https://docs.microsoft.com/en-us/azure/devops/boards/)
- [Work Item Linking](https://docs.microsoft.com/en-us/azure/devops/boards/backlogs/add-link)
- [Branch Policies](https://docs.microsoft.com/en-us/azure/devops/repos/git/branch-policies)
- [Queries](https://docs.microsoft.com/en-us/azure/devops/boards/queries/)
- [Dashboards](https://docs.microsoft.com/en-us/azure/devops/report/dashboards/)

## Version History

- **v1.0** (2025-12-02): Initial configuration
  - Work item templates
  - Branch policies
  - Pipeline integration
  - Queries and dashboards
  - Automation rules

---

**Note**: This configuration is tailored for the Dating Platform project. Adjust settings, queries, and rules based on your team's specific needs and workflows.
