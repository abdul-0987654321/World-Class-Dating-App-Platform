# Azure Boards Integration Implementation Guide

This guide provides detailed technical implementation instructions for integrating Azure Boards with your CI/CD pipelines and development workflow.

## Table of Contents

1. [GitHub Actions Integration](#github-actions-integration)
2. [Azure Pipelines Integration](#azure-pipelines-integration)
3. [Webhook Configuration](#webhook-configuration)
4. [Custom Automation Scripts](#custom-automation-scripts)
5. [API Integration Examples](#api-integration-examples)
6. [Advanced Scenarios](#advanced-scenarios)

## GitHub Actions Integration

### Complete Workflow for Azure Boards Sync

Create: `.github/workflows/azure-boards-integration.yml`

```yaml
name: Azure Boards Integration

on:
  push:
    branches: [main, develop, 'release/**', 'feature/**', 'bugfix/**', 'hotfix/**']
  pull_request:
    types: [opened, synchronize, closed, reopened]
  release:
    types: [published]

env:
  AZURE_DEVOPS_ORG: citadelcloudmanagement
  AZURE_DEVOPS_PROJECT: DatingPlatform
  AZURE_BOARDS_URL: https://dev.azure.com/citadelcloudmanagement/DatingPlatform

jobs:
  extract-work-items:
    name: Extract Work Item IDs
    runs-on: ubuntu-latest
    outputs:
      work_items: ${{ steps.extract.outputs.work_items }}
    steps:
      - name: Extract Work Items from Commits and PR
        id: extract
        run: |
          # Extract from PR title and body
          PR_TEXT="${{ github.event.pull_request.title }} ${{ github.event.pull_request.body }}"

          # Extract from commit messages
          COMMIT_TEXT=""
          if [ "${{ github.event_name }}" == "push" ]; then
            COMMIT_TEXT=$(git log --format=%B ${{ github.event.before }}..${{ github.event.after }})
          fi

          # Combine and extract work item IDs
          ALL_TEXT="$PR_TEXT $COMMIT_TEXT"
          WORK_ITEMS=$(echo "$ALL_TEXT" | grep -oP 'AB#\K[0-9]+' | sort -u | tr '\n' ',' | sed 's/,$//')

          echo "work_items=$WORK_ITEMS" >> $GITHUB_OUTPUT
          echo "Found work items: $WORK_ITEMS"

  link-commits:
    name: Link Commits to Work Items
    runs-on: ubuntu-latest
    needs: extract-work-items
    if: needs.extract-work-items.outputs.work_items != ''
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Install Azure CLI
        run: |
          curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
          az extension add --name azure-devops

      - name: Azure DevOps Login
        run: |
          echo "${{ secrets.AZURE_DEVOPS_TOKEN }}" | az devops login --organization https://dev.azure.com/${{ env.AZURE_DEVOPS_ORG }}

      - name: Link Commits to Work Items
        run: |
          IFS=',' read -ra WORK_ITEMS <<< "${{ needs.extract-work-items.outputs.work_items }}"

          for WORK_ITEM_ID in "${WORK_ITEMS[@]}"; do
            echo "Processing work item: $WORK_ITEM_ID"

            # Get commit information
            COMMIT_SHA="${{ github.sha }}"
            COMMIT_MSG="${{ github.event.head_commit.message }}"
            COMMIT_URL="${{ github.event.head_commit.url }}"
            AUTHOR="${{ github.event.head_commit.author.name }}"

            # Add comment to work item
            COMMENT="Commit linked: [$COMMIT_SHA](${COMMIT_URL})\n**Message:** ${COMMIT_MSG}\n**Author:** ${AUTHOR}\n**Branch:** ${{ github.ref_name }}"

            az boards work-item update \
              --id $WORK_ITEM_ID \
              --discussion "$COMMENT" \
              --org https://dev.azure.com/${{ env.AZURE_DEVOPS_ORG }} \
              --project ${{ env.AZURE_DEVOPS_PROJECT }}
          done

  update-pr-state:
    name: Update Work Item State (PR Events)
    runs-on: ubuntu-latest
    needs: extract-work-items
    if: github.event_name == 'pull_request' && needs.extract-work-items.outputs.work_items != ''
    steps:
      - name: Install Azure CLI
        run: |
          curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
          az extension add --name azure-devops

      - name: Azure DevOps Login
        run: |
          echo "${{ secrets.AZURE_DEVOPS_TOKEN }}" | az devops login --organization https://dev.azure.com/${{ env.AZURE_DEVOPS_ORG }}

      - name: Update State - PR Opened
        if: github.event.action == 'opened'
        run: |
          IFS=',' read -ra WORK_ITEMS <<< "${{ needs.extract-work-items.outputs.work_items }}"

          for WORK_ITEM_ID in "${WORK_ITEMS[@]}"; do
            echo "Moving work item $WORK_ITEM_ID to Active"

            # Get current state
            CURRENT_STATE=$(az boards work-item show \
              --id $WORK_ITEM_ID \
              --org https://dev.azure.com/${{ env.AZURE_DEVOPS_ORG }} \
              --query "fields.\"System.State\"" -o tsv)

            # Update state if needed
            if [ "$CURRENT_STATE" == "New" ] || [ "$CURRENT_STATE" == "Approved" ]; then
              az boards work-item update \
                --id $WORK_ITEM_ID \
                --state "Active" \
                --discussion "Pull Request opened: #${{ github.event.pull_request.number }} - ${{ github.event.pull_request.title }}\nURL: ${{ github.event.pull_request.html_url }}" \
                --org https://dev.azure.com/${{ env.AZURE_DEVOPS_ORG }} \
                --project ${{ env.AZURE_DEVOPS_PROJECT }}
            fi
          done

      - name: Update State - PR Merged
        if: github.event.action == 'closed' && github.event.pull_request.merged == true
        run: |
          IFS=',' read -ra WORK_ITEMS <<< "${{ needs.extract-work-items.outputs.work_items }}"

          TARGET_BRANCH="${{ github.event.pull_request.base.ref }}"

          for WORK_ITEM_ID in "${WORK_ITEMS[@]}"; do
            echo "Processing work item $WORK_ITEM_ID (merged to $TARGET_BRANCH)"

            # Different state based on target branch
            if [ "$TARGET_BRANCH" == "main" ] || [ "$TARGET_BRANCH" == "develop" ]; then
              NEW_STATE="Resolved"
            else
              NEW_STATE="In Review"
            fi

            az boards work-item update \
              --id $WORK_ITEM_ID \
              --state "$NEW_STATE" \
              --discussion "Pull Request merged: #${{ github.event.pull_request.number }}\nMerged to: $TARGET_BRANCH\nMerged by: ${{ github.event.pull_request.merged_by.login }}" \
              --org https://dev.azure.com/${{ env.AZURE_DEVOPS_ORG }} \
              --project ${{ env.AZURE_DEVOPS_PROJECT }}
          done

  build-status:
    name: Update Build Status
    runs-on: ubuntu-latest
    needs: [extract-work-items, link-commits]
    if: always() && needs.extract-work-items.outputs.work_items != ''
    steps:
      - name: Install Azure CLI
        run: |
          curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
          az extension add --name azure-devops

      - name: Azure DevOps Login
        run: |
          echo "${{ secrets.AZURE_DEVOPS_TOKEN }}" | az devops login --organization https://dev.azure.com/${{ env.AZURE_DEVOPS_ORG }}

      - name: Post Build Status
        run: |
          IFS=',' read -ra WORK_ITEMS <<< "${{ needs.extract-work-items.outputs.work_items }}"

          # Determine build status
          if [ "${{ job.status }}" == "success" ]; then
            STATUS_EMOJI="✅"
            STATUS_TEXT="succeeded"
          else
            STATUS_EMOJI="❌"
            STATUS_TEXT="failed"
          fi

          for WORK_ITEM_ID in "${WORK_ITEMS[@]}"; do
            COMMENT="${STATUS_EMOJI} Build ${STATUS_TEXT}: ${{ github.workflow }}\n**Run:** ${{ github.run_number }}\n**URL:** ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"

            az boards work-item update \
              --id $WORK_ITEM_ID \
              --discussion "$COMMENT" \
              --org https://dev.azure.com/${{ env.AZURE_DEVOPS_ORG }} \
              --project ${{ env.AZURE_DEVOPS_PROJECT }}
          done

  deployment-status:
    name: Update Deployment Status
    runs-on: ubuntu-latest
    needs: extract-work-items
    if: github.event_name == 'push' && (github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop')
    steps:
      - name: Install Azure CLI
        run: |
          curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
          az extension add --name azure-devops

      - name: Azure DevOps Login
        run: |
          echo "${{ secrets.AZURE_DEVOPS_TOKEN }}" | az devops login --organization https://dev.azure.com/${{ env.AZURE_DEVOPS_ORG }}

      - name: Determine Environment
        id: env
        run: |
          if [ "${{ github.ref }}" == "refs/heads/main" ]; then
            echo "environment=production" >> $GITHUB_OUTPUT
            echo "state=Closed" >> $GITHUB_OUTPUT
          else
            echo "environment=staging" >> $GITHUB_OUTPUT
            echo "state=Deployed-Staging" >> $GITHUB_OUTPUT
          fi

      - name: Update Deployment State
        run: |
          IFS=',' read -ra WORK_ITEMS <<< "${{ needs.extract-work-items.outputs.work_items }}"

          for WORK_ITEM_ID in "${WORK_ITEMS[@]}"; do
            echo "Updating work item $WORK_ITEM_ID for ${{ steps.env.outputs.environment }} deployment"

            az boards work-item update \
              --id $WORK_ITEM_ID \
              --state "${{ steps.env.outputs.state }}" \
              --discussion "🚀 Deployed to ${{ steps.env.outputs.environment }}\n**Commit:** ${{ github.sha }}\n**Timestamp:** $(date -u +'%Y-%m-%d %H:%M:%S UTC')" \
              --org https://dev.azure.com/${{ env.AZURE_DEVOPS_ORG }} \
              --project ${{ env.AZURE_DEVOPS_PROJECT }}
          done

  generate-release-notes:
    name: Generate Release Notes
    runs-on: ubuntu-latest
    if: github.event_name == 'release'
    steps:
      - uses: actions/checkout@v4

      - name: Install Azure CLI
        run: |
          curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
          az extension add --name azure-devops

      - name: Azure DevOps Login
        run: |
          echo "${{ secrets.AZURE_DEVOPS_TOKEN }}" | az devops login --organization https://dev.azure.com/${{ env.AZURE_DEVOPS_ORG }}

      - name: Query Closed Work Items
        id: query
        run: |
          # Get work items closed in last 30 days
          THIRTY_DAYS_AGO=$(date -d '30 days ago' +%Y-%m-%d)

          WORK_ITEMS=$(az boards query \
            --wiql "SELECT [System.Id], [System.Title], [System.WorkItemType], [System.Tags] FROM WorkItems WHERE [System.ClosedDate] >= '${THIRTY_DAYS_AGO}' ORDER BY [System.WorkItemType], [System.Id]" \
            --org https://dev.azure.com/${{ env.AZURE_DEVOPS_ORG }} \
            --project ${{ env.AZURE_DEVOPS_PROJECT }} \
            --output json)

          echo "$WORK_ITEMS" > work-items.json

      - name: Format Release Notes
        run: |
          cat << 'EOF' > release-notes.md
          ## Release Notes - ${{ github.event.release.tag_name }}

          **Release Date:** $(date +%Y-%m-%d)
          **Environment:** Production

          ### Features
          EOF

          # Extract features
          jq -r '.[] | select(.fields."System.WorkItemType" == "Feature") | "- [AB#\(.id)] \(.fields."System.Title")"' work-items.json >> release-notes.md

          cat << 'EOF' >> release-notes.md

          ### User Stories
          EOF

          # Extract user stories
          jq -r '.[] | select(.fields."System.WorkItemType" == "User Story") | "- [AB#\(.id)] \(.fields."System.Title")"' work-items.json >> release-notes.md

          cat << 'EOF' >> release-notes.md

          ### Bug Fixes
          EOF

          # Extract bugs
          jq -r '.[] | select(.fields."System.WorkItemType" == "Bug") | "- [AB#\(.id)] \(.fields."System.Title")"' work-items.json >> release-notes.md

      - name: Update GitHub Release
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

### Update Existing CI Workflows

Add to `.github/workflows/ci-backend.yml`:

```yaml
# At the end of the workflow
  notify-azure-boards:
    name: Notify Azure Boards
    runs-on: ubuntu-latest
    needs: [build, test, security-scan]
    if: always()
    steps:
      - uses: actions/checkout@v4

      - name: Extract Work Items
        id: extract
        run: |
          # Extract from commit messages
          WORK_ITEMS=$(git log --format=%B -n 20 | grep -oP 'AB#\K[0-9]+' | sort -u | tr '\n' ',' | sed 's/,$//')
          echo "work_items=$WORK_ITEMS" >> $GITHUB_OUTPUT

      - name: Update Work Items
        if: steps.extract.outputs.work_items != ''
        run: |
          # Install Azure CLI and update work items
          # (Similar to above example)
```

## Azure Pipelines Integration

If you decide to use Azure Pipelines instead of GitHub Actions:

### azure-pipelines.yml

```yaml
trigger:
  branches:
    include:
      - main
      - develop
      - release/*
      - feature/*
      - bugfix/*

pr:
  branches:
    include:
      - main
      - develop

variables:
  AZURE_DEVOPS_ORG: 'citadelcloudmanagement'
  AZURE_DEVOPS_PROJECT: 'DatingPlatform'

stages:
  - stage: Build
    jobs:
      - job: BuildAndTest
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '20.x'

          - script: npm ci
            displayName: 'Install dependencies'

          - script: npm run build
            displayName: 'Build'

          - script: npm test
            displayName: 'Run tests'

          - task: PublishTestResults@2
            inputs:
              testResultsFormat: 'JUnit'
              testResultsFiles: '**/test-results.xml'

  - stage: UpdateWorkItems
    dependsOn: Build
    jobs:
      - job: LinkWorkItems
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          - task: PowerShell@2
            displayName: 'Extract Work Items'
            inputs:
              targetType: 'inline'
              script: |
                # Extract work item IDs from commit messages
                $commitMessages = git log --format=%B -n 20
                $workItems = $commitMessages | Select-String -Pattern 'AB#(\d+)' -AllMatches |
                             ForEach-Object { $_.Matches } |
                             ForEach-Object { $_.Groups[1].Value } |
                             Select-Object -Unique

                Write-Host "Found work items: $($workItems -join ',')"
                Write-Host "##vso[task.setvariable variable=WorkItemIds]$($workItems -join ',')"

          - task: PowerShell@2
            displayName: 'Link Build to Work Items'
            condition: ne(variables['WorkItemIds'], '')
            inputs:
              targetType: 'inline'
              script: |
                $workItems = "$(WorkItemIds)".Split(',')
                $buildUrl = "$(System.TeamFoundationCollectionUri)$(System.TeamProject)/_build/results?buildId=$(Build.BuildId)"

                foreach ($workItemId in $workItems) {
                  Write-Host "Linking build to work item: $workItemId"

                  $uri = "$(System.TeamFoundationCollectionUri)$(System.TeamProject)/_apis/wit/workitems/$($workItemId)?api-version=6.0"
                  $body = @(
                    @{
                      op = "add"
                      path = "/relations/-"
                      value = @{
                        rel = "Hyperlink"
                        url = $buildUrl
                        attributes = @{
                          comment = "Build $(Build.BuildNumber) - $(Build.SourceBranch)"
                        }
                      }
                    }
                  ) | ConvertTo-Json -Depth 10

                  $headers = @{
                    Authorization = "Bearer $(System.AccessToken)"
                    "Content-Type" = "application/json-patch+json"
                  }

                  Invoke-RestMethod -Uri $uri -Method Patch -Headers $headers -Body $body
                }
            env:
              SYSTEM_ACCESSTOKEN: $(System.AccessToken)
```

## Webhook Configuration

### Azure Logic App for Advanced Automation

Create a Logic App to handle complex automation:

```json
{
  "definition": {
    "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
    "contentVersion": "1.0.0.0",
    "parameters": {},
    "triggers": {
      "When_a_work_item_is_created": {
        "type": "ApiConnection",
        "inputs": {
          "host": {
            "connection": {
              "name": "@parameters('$connections')['visualstudioteamservices']['connectionId']"
            }
          },
          "method": "post",
          "path": "/workitems_trigger"
        }
      }
    },
    "actions": {
      "Switch_on_Work_Item_Type": {
        "type": "Switch",
        "expression": "@triggerBody()?['workItemType']",
        "cases": {
          "Bug": {
            "case": "Bug",
            "actions": {
              "Condition_-_Is_Critical": {
                "type": "If",
                "expression": {
                  "and": [
                    {
                      "equals": [
                        "@triggerBody()?['fields']?['Microsoft.VSTS.Common.Severity']",
                        "1 - Critical"
                      ]
                    }
                  ]
                },
                "actions": {
                  "Send_notification_to_Teams": {
                    "type": "ApiConnection",
                    "inputs": {
                      "host": {
                        "connection": {
                          "name": "@parameters('$connections')['teams']['connectionId']"
                        }
                      },
                      "method": "post",
                      "path": "/flowbot/actions/adaptivecard/recipientType/channel",
                      "queries": {
                        "recipient": "DevOps Team"
                      },
                      "body": {
                        "messageBody": {
                          "type": "AdaptiveCard",
                          "body": [
                            {
                              "type": "TextBlock",
                              "text": "🚨 Critical Bug Created",
                              "weight": "Bolder",
                              "size": "Large",
                              "color": "Attention"
                            },
                            {
                              "type": "FactSet",
                              "facts": [
                                {
                                  "title": "ID:",
                                  "value": "@{triggerBody()?['id']}"
                                },
                                {
                                  "title": "Title:",
                                  "value": "@{triggerBody()?['fields']?['System.Title']}"
                                },
                                {
                                  "title": "Component:",
                                  "value": "@{triggerBody()?['fields']?['Custom.Component']}"
                                }
                              ]
                            }
                          ],
                          "actions": [
                            {
                              "type": "Action.OpenUrl",
                              "title": "View Bug",
                              "url": "@{triggerBody()?['_links']?['html']?['href']}"
                            }
                          ],
                          "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                          "version": "1.2"
                        }
                      }
                    }
                  },
                  "Assign_to_Tech_Lead": {
                    "type": "ApiConnection",
                    "inputs": {
                      "host": {
                        "connection": {
                          "name": "@parameters('$connections')['visualstudioteamservices']['connectionId']"
                        }
                      },
                      "method": "patch",
                      "path": "/workitems/@{encodeURIComponent(triggerBody()?['id'])}",
                      "body": [
                        {
                          "op": "add",
                          "path": "/fields/System.AssignedTo",
                          "value": "tech-lead@datingplatform.com"
                        },
                        {
                          "op": "add",
                          "path": "/fields/Microsoft.VSTS.Common.Priority",
                          "value": 1
                        },
                        {
                          "op": "add",
                          "path": "/fields/System.Tags",
                          "value": "critical;urgent;escalated"
                        }
                      ]
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

## Custom Automation Scripts

### Python Script for Bulk Work Item Updates

```python
#!/usr/bin/env python3
"""
Azure Boards bulk update script
Usage: python azure_boards_bulk_update.py --state Resolved --tag deployed
"""

import requests
import argparse
import os
from typing import List, Dict

AZURE_DEVOPS_ORG = "citadelcloudmanagement"
AZURE_DEVOPS_PROJECT = "DatingPlatform"
AZURE_DEVOPS_PAT = os.getenv("AZURE_DEVOPS_TOKEN")

def get_work_items_by_tag(tag: str) -> List[int]:
    """Query work items by tag"""
    url = f"https://dev.azure.com/{AZURE_DEVOPS_ORG}/{AZURE_DEVOPS_PROJECT}/_apis/wit/wiql?api-version=6.0"

    query = {
        "query": f"SELECT [System.Id] FROM WorkItems WHERE [System.Tags] CONTAINS '{tag}' AND [System.State] <> 'Closed'"
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Basic {AZURE_DEVOPS_PAT}"
    }

    response = requests.post(url, json=query, headers=headers)
    response.raise_for_status()

    return [item['id'] for item in response.json().get('workItems', [])]

def update_work_item(work_item_id: int, updates: List[Dict]):
    """Update a single work item"""
    url = f"https://dev.azure.com/{AZURE_DEVOPS_ORG}/{AZURE_DEVOPS_PROJECT}/_apis/wit/workitems/{work_item_id}?api-version=6.0"

    headers = {
        "Content-Type": "application/json-patch+json",
        "Authorization": f"Basic {AZURE_DEVOPS_PAT}"
    }

    response = requests.patch(url, json=updates, headers=headers)
    response.raise_for_status()

    return response.json()

def main():
    parser = argparse.ArgumentParser(description='Bulk update Azure Boards work items')
    parser.add_argument('--tag', required=True, help='Tag to filter work items')
    parser.add_argument('--state', help='New state for work items')
    parser.add_argument('--add-tag', help='Additional tag to add')
    parser.add_argument('--comment', help='Comment to add')

    args = parser.parse_args()

    # Get work items
    work_items = get_work_items_by_tag(args.tag)
    print(f"Found {len(work_items)} work items with tag '{args.tag}'")

    # Prepare updates
    updates = []

    if args.state:
        updates.append({
            "op": "add",
            "path": "/fields/System.State",
            "value": args.state
        })

    if args.add_tag:
        updates.append({
            "op": "add",
            "path": "/fields/System.Tags",
            "value": args.add_tag
        })

    if args.comment:
        updates.append({
            "op": "add",
            "path": "/fields/System.History",
            "value": args.comment
        })

    # Update each work item
    for work_item_id in work_items:
        try:
            result = update_work_item(work_item_id, updates)
            print(f"✅ Updated work item {work_item_id}")
        except Exception as e:
            print(f"❌ Failed to update work item {work_item_id}: {str(e)}")

if __name__ == "__main__":
    main()
```

### PowerShell Script for Release Notes Generation

```powershell
#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Generate release notes from Azure Boards work items
.EXAMPLE
    ./Generate-ReleaseNotes.ps1 -Days 30 -Output release-notes.md
#>

param(
    [Parameter(Mandatory=$false)]
    [int]$Days = 30,

    [Parameter(Mandatory=$false)]
    [string]$Output = "release-notes.md"
)

$ErrorActionPreference = "Stop"

# Configuration
$org = "citadelcloudmanagement"
$project = "DatingPlatform"
$pat = $env:AZURE_DEVOPS_TOKEN

# Calculate date range
$startDate = (Get-Date).AddDays(-$Days).ToString("yyyy-MM-dd")

# Query work items
$query = @"
SELECT [System.Id], [System.Title], [System.WorkItemType], [System.Tags], [Microsoft.VSTS.Common.Priority]
FROM WorkItems
WHERE [System.ClosedDate] >= '$startDate'
ORDER BY [System.WorkItemType], [Microsoft.VSTS.Common.Priority]
"@

$uri = "https://dev.azure.com/$org/$project/_apis/wit/wiql?api-version=6.0"
$headers = @{
    Authorization = "Basic $([Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(":$pat")))"
    "Content-Type" = "application/json"
}

$body = @{ query = $query } | ConvertTo-Json

$result = Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body $body

# Group work items by type
$workItems = @{
    Features = @()
    UserStories = @()
    Bugs = @()
    Tasks = @()
}

foreach ($item in $result.workItems) {
    # Get work item details
    $wiUri = "https://dev.azure.com/$org/$project/_apis/wit/workitems/$($item.id)?api-version=6.0"
    $wi = Invoke-RestMethod -Uri $wiUri -Headers $headers

    $type = $wi.fields.'System.WorkItemType'
    $id = $wi.id
    $title = $wi.fields.'System.Title'
    $priority = $wi.fields.'Microsoft.VSTS.Common.Priority'

    $entry = "- [AB#$id]($($wi._links.html.href)) $title"
    if ($priority) {
        $entry += " (Priority: $priority)"
    }

    switch ($type) {
        "Feature" { $workItems.Features += $entry }
        "User Story" { $workItems.UserStories += $entry }
        "Bug" { $workItems.Bugs += $entry }
        "Task" { $workItems.Tasks += $entry }
    }
}

# Generate markdown
$markdown = @"
# Release Notes - $(Get-Date -Format "yyyy-MM-dd")

**Release Period:** $startDate to $(Get-Date -Format "yyyy-MM-dd")
**Total Work Items:** $($result.workItems.Count)

## Features ($($workItems.Features.Count))

$($workItems.Features -join "`n")

## User Stories ($($workItems.UserStories.Count))

$($workItems.UserStories -join "`n")

## Bug Fixes ($($workItems.Bugs.Count))

$($workItems.Bugs -join "`n")

## Technical Tasks ($($workItems.Tasks.Count))

$($workItems.Tasks -join "`n")

---

*Generated automatically from Azure Boards*
"@

# Save to file
$markdown | Out-File -FilePath $Output -Encoding UTF8
Write-Host "✅ Release notes generated: $Output"
```

## API Integration Examples

### REST API Examples

#### Create Work Item

```bash
curl -X POST \
  https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_apis/wit/workitems/$Bug?api-version=6.0 \
  -H "Content-Type: application/json-patch+json" \
  -H "Authorization: Basic $(echo -n :$AZURE_DEVOPS_TOKEN | base64)" \
  -d '[
    {
      "op": "add",
      "path": "/fields/System.Title",
      "value": "[BUG] Sample bug title"
    },
    {
      "op": "add",
      "path": "/fields/Microsoft.VSTS.Common.Severity",
      "value": "2 - High"
    },
    {
      "op": "add",
      "path": "/fields/System.Description",
      "value": "Bug description here"
    }
  ]'
```

#### Link Work Item to PR

```bash
curl -X PATCH \
  https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_apis/wit/workitems/123?api-version=6.0 \
  -H "Content-Type: application/json-patch+json" \
  -H "Authorization: Basic $(echo -n :$AZURE_DEVOPS_TOKEN | base64)" \
  -d '[
    {
      "op": "add",
      "path": "/relations/-",
      "value": {
        "rel": "Hyperlink",
        "url": "https://github.com/org/repo/pull/456",
        "attributes": {
          "comment": "Pull Request #456"
        }
      }
    }
  ]'
```

## Advanced Scenarios

### Scenario 1: Automated Sprint Planning

```python
# Auto-assign work items to sprints based on priority and capacity
import requests
from datetime import datetime, timedelta

def assign_to_sprint(work_item_ids, iteration_path):
    for wi_id in work_item_ids:
        update = [{
            "op": "add",
            "path": "/fields/System.IterationPath",
            "value": iteration_path
        }]
        # Update work item...
```

### Scenario 2: SLA Monitoring and Escalation

```python
# Monitor work items and escalate if SLA breached
def check_sla_violations():
    critical_bugs = query_work_items("Severity = Critical AND State != Closed")

    for bug in critical_bugs:
        created_date = parse_date(bug['fields']['System.CreatedDate'])
        hours_open = (datetime.now() - created_date).total_hours

        if hours_open > 4:  # 4-hour SLA for critical bugs
            escalate_work_item(bug['id'])
            notify_management(bug)
```

### Scenario 3: Dependency Management

```python
# Automatically create dependent tasks when feature is created
def create_feature_dependencies(feature_id):
    dependencies = [
        {"type": "Task", "title": "Backend API Implementation"},
        {"type": "Task", "title": "Frontend UI Implementation"},
        {"type": "Task", "title": "Database Migration"},
        {"type": "Task", "title": "Unit Tests"},
        {"type": "Task", "title": "Integration Tests"},
        {"type": "Task", "title": "Documentation"}
    ]

    for dep in dependencies:
        task_id = create_work_item(dep['type'], dep['title'])
        link_work_items(feature_id, task_id, "Child")
```

## Testing Integration

### Integration Test Script

```bash
#!/bin/bash
# test-azure-boards-integration.sh

echo "Testing Azure Boards Integration..."

# Test 1: Create work item
echo "Test 1: Creating test work item..."
WORK_ITEM_ID=$(az boards work-item create \
  --type "Task" \
  --title "Integration Test - $(date +%s)" \
  --project DatingPlatform \
  --query id -o tsv)

echo "Created work item: $WORK_ITEM_ID"

# Test 2: Link commit
echo "Test 2: Creating test commit with work item link..."
git checkout -b test/AB#${WORK_ITEM_ID}-integration-test
echo "test" > test.txt
git add test.txt
git commit -m "test: integration test AB#${WORK_ITEM_ID}"
git push origin test/AB#${WORK_ITEM_ID}-integration-test

# Test 3: Create PR
echo "Test 3: Creating pull request..."
gh pr create \
  --title "Test PR AB#${WORK_ITEM_ID}" \
  --body "Integration test PR for AB#${WORK_ITEM_ID}"

# Test 4: Verify work item was linked
echo "Test 4: Verifying work item link..."
sleep 10  # Wait for automation
az boards work-item show --id $WORK_ITEM_ID --query "relations"

# Cleanup
echo "Cleaning up..."
gh pr close --delete-branch

echo "✅ Integration tests complete"
```

## Monitoring and Debugging

### Enable Detailed Logging

Add to GitHub Actions workflows:

```yaml
- name: Enable Debug Logging
  run: echo "::debug::Debugging Azure Boards integration"

- name: Detailed Work Item Update
  run: |
    set -x  # Enable bash debugging
    az boards work-item update \
      --id $WORK_ITEM_ID \
      --state "Active" \
      --debug
```

### Log Analysis Queries

```kusto
// Azure Monitor query for failed work item updates
AzureDevOpsActivity
| where OperationName == "WorkItemUpdate"
| where ResultType == "Failed"
| project TimeGenerated, WorkItemId, ErrorMessage, UserAgent
| order by TimeGenerated desc
```

---

**Integration Version:** 1.0 (2025-12-02)
**Last Updated:** 2025-12-02

For support, contact: devops@datingplatform.com
