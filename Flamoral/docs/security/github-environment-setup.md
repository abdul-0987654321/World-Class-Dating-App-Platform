# GitHub Environment Protection Rules Setup - Flamoral

**Document Version:** 1.0
**Last Updated:** 2025-12-12
**Owner:** DevOps Team
**Status:** Active

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [GitHub Environments Setup](#github-environments-setup)
4. [Environment Protection Rules](#environment-protection-rules)
5. [Repository Variables Configuration](#repository-variables-configuration)
6. [Branch Protection Rules](#branch-protection-rules)
7. [Required Secrets Configuration](#required-secrets-configuration)
8. [Verification Steps](#verification-steps)
9. [Troubleshooting](#troubleshooting)

---

## Overview

This document provides step-by-step instructions for configuring GitHub Environment protection rules for the Flamoral dating platform. These protections ensure safe, controlled deployments across different environments while maintaining the ability to respond to emergencies.

### Security Levels

- **Development**: No protection - rapid iteration
- **Staging**: Branch protection - controlled testing
- **Production**: Full protection - maximum safety
- **Production-Approval**: Approval gate - human verification
- **Production-Rollback**: Emergency access - quick recovery

---

## Prerequisites

Before proceeding, ensure you have:

- [ ] Repository admin access to Flamoral GitHub repository
- [ ] Organization owner or admin permissions (for some settings)
- [ ] List of authorized reviewers for production deployments
- [ ] Azure credentials ready for secrets configuration
- [ ] Slack webhook URL for deployment notifications

---

## GitHub Environments Setup

### Step 1: Access Environment Settings

1. Navigate to your Flamoral repository on GitHub
2. Click **Settings** (top navigation bar)
3. In the left sidebar, scroll to **Code and automation** section
4. Click **Environments**

**Navigation Path:** `Repository → Settings → Environments`

```
[Screenshot Placeholder: GitHub Settings - Environments Tab]
```

---

### Step 2: Create Development Environment

#### 2.1 Create Environment

1. On the Environments page, click **New environment**
2. Enter environment name: `development`
3. Click **Configure environment**

#### 2.2 Configure Development Settings

**Protection Rules:** None (leave all checkboxes unchecked)

**Purpose:** Allow rapid development and testing without approval gates.

**Settings:**
- Required reviewers: None
- Wait timer: None
- Deployment branches: All branches
- Environment secrets: Development-specific credentials only

4. Click **Save protection rules**

```
[Screenshot Placeholder: Development Environment Configuration]
```

---

### Step 3: Create Staging Environment

#### 3.1 Create Environment

1. Click **New environment**
2. Enter environment name: `staging`
3. Click **Configure environment**

#### 3.2 Configure Staging Protection Rules

Enable the following protections:

**Deployment branches:**
- Select **Selected branches**
- Click **Add deployment branch rule**
- Add pattern: `develop`
- Add pattern: `feature/*`
- Add pattern: `bugfix/*`

**Purpose:** Ensure staging deployments only from approved development branches.

**Optional Settings:**
- Required reviewers: 1 reviewer (recommended but not required)
- Wait timer: None

4. Click **Save protection rules**

```
[Screenshot Placeholder: Staging Environment Configuration]
```

---

### Step 4: Create Production Environment

#### 4.1 Create Environment

1. Click **New environment**
2. Enter environment name: `production`
3. Click **Configure environment**

#### 4.2 Configure Production Protection Rules

Enable **ALL** of the following protections:

##### Required Reviewers

1. Check **Required reviewers**
2. Click **Add up to 6 reviewers**
3. Add at least **2 reviewers** from your team
4. Select reviewers who:
   - Understand the production infrastructure
   - Are available across different time zones (if applicable)
   - Have authority to approve production changes

**Recommended:** Add 3-4 reviewers to ensure availability

##### Wait Timer

1. Check **Wait timer**
2. Enter: `5` minutes
3. **Purpose:** Provides a brief window to cancel accidental deployments

##### Deployment Branches

1. Select **Selected branches**
2. Click **Add deployment branch rule**
3. Add pattern: `main`
4. Add pattern: `release/*`

**Critical:** Only allow deployments from stable, tested branches

##### Prevent Self-Review

5. Check **Prevent self-review** (if available)
   - Ensures deployment approver is not the same person who triggered it

6. Click **Save protection rules**

```
[Screenshot Placeholder: Production Environment Full Configuration]
```

---

### Step 5: Create Production-Approval Environment

#### 5.1 Create Environment

1. Click **New environment**
2. Enter environment name: `production-approval`
3. Click **Configure environment**

#### 5.2 Configure Approval Gate Settings

**Purpose:** Additional approval layer for critical production changes.

##### Required Reviewers

1. Check **Required reviewers**
2. Add **minimum 2 reviewers**, ideally:
   - Technical Lead
   - Product Owner/Manager
   - DevOps Lead

##### Wait Timer

1. Check **Wait timer**
2. Enter: `10` minutes
3. **Purpose:** Extended window for thorough review of critical changes

##### Deployment Branches

1. Select **Selected branches**
2. Add pattern: `main` only

##### Additional Settings

3. Check **Prevent self-review**

4. Click **Save protection rules**

```
[Screenshot Placeholder: Production-Approval Environment Configuration]
```

---

### Step 6: Create Production-Rollback Environment

#### 6.1 Create Environment

1. Click **New environment**
2. Enter environment name: `production-rollback`
3. Click **Configure environment**

#### 6.2 Configure Emergency Access Settings

**Purpose:** Enable rapid rollback during production incidents while maintaining minimal oversight.

##### Required Reviewers

1. Check **Required reviewers**
2. Add **1 reviewer** only (senior engineer or on-call person)

##### Wait Timer

1. **Do NOT enable** wait timer
2. **Purpose:** Allow immediate rollback during emergencies

##### Deployment Branches

1. Select **Selected branches**
2. Add patterns:
   - `main`
   - `hotfix/*`
   - `rollback/*`

##### Emergency Access Note

3. Add environment description:
   ```
   EMERGENCY USE ONLY - For production rollbacks and critical hotfixes
   ```

4. Click **Save protection rules**

```
[Screenshot Placeholder: Production-Rollback Environment Configuration]
```

---

## Environment Protection Rules

### Production Environment - Detailed Rules

#### Minimum Required Reviewers: 2

**Reviewer Selection Criteria:**

1. **Technical Expertise**
   - Senior developers familiar with production architecture
   - DevOps engineers with deployment experience

2. **Availability**
   - Ensure reviewers across time zones
   - Maintain on-call rotation for urgent approvals

3. **Authority**
   - Team leads or technical managers
   - Individuals with production change authorization

#### Wait Timer Configuration

**Recommended Settings:**

| Environment | Wait Timer | Purpose |
|-------------|-----------|---------|
| development | 0 minutes | No delay needed |
| staging | 0 minutes | Fast feedback loop |
| production | 5 minutes | Cancel window |
| production-approval | 10 minutes | Extended review |
| production-rollback | 0 minutes | Emergency response |

#### Branch Restrictions

**Production Deployment Sources:**

```yaml
Allowed Branches:
  - main              # Primary production branch
  - release/*         # Release candidate branches

Blocked Branches:
  - develop           # Development branch
  - feature/*         # Feature branches
  - bugfix/*          # Bug fix branches
  - Any other branches
```

**Enforcement:**
- Deployments from non-approved branches will be automatically rejected
- GitHub Actions will fail at the environment gate

#### Environment Secrets Best Practices

**Secret Organization:**

1. **Development Secrets**
   - Use test/sandbox credentials
   - Non-production API keys
   - Debug tokens

2. **Staging Secrets**
   - Pre-production credentials
   - Staging database connections
   - Test payment gateways

3. **Production Secrets**
   - Production credentials only
   - Encrypted with highest security
   - Rotated regularly (quarterly minimum)

---

## Repository Variables Configuration

### Step 1: Access Repository Variables

1. Navigate to **Repository Settings**
2. Click **Secrets and variables** in left sidebar
3. Click **Actions**
4. Select **Variables** tab

**Navigation Path:** `Repository → Settings → Secrets and variables → Actions → Variables`

```
[Screenshot Placeholder: Repository Variables Tab]
```

---

### Step 2: Create Production Deploy Control Variable

#### 2.1 Add PROD_DEPLOY_ENABLED Variable

1. Click **New repository variable**
2. Enter the following:

   **Name:**
   ```
   PROD_DEPLOY_ENABLED
   ```

   **Value:**
   ```
   false
   ```

   **Description:**
   ```
   Production deployment freeze control. Set to 'true' to enable prod deployments. Default: frozen for safety.
   ```

3. Click **Add variable**

```
[Screenshot Placeholder: PROD_DEPLOY_ENABLED Variable Creation]
```

#### 2.2 Purpose and Usage

**Default State:** `false` (Deployments frozen)

**Use Cases for Setting to `true`:**
- Scheduled production deployment window
- Emergency hotfix deployment
- Approved release cycle

**Usage in GitHub Actions:**

```yaml
jobs:
  deploy-production:
    runs-on: ubuntu-latest
    environment: production
    if: vars.PROD_DEPLOY_ENABLED == 'true'
    steps:
      - name: Check deployment gate
        run: |
          if [ "${{ vars.PROD_DEPLOY_ENABLED }}" != "true" ]; then
            echo "Production deployments are currently frozen"
            exit 1
          fi
```

---

### Step 3: Instructions for Unlocking Production Deployments

#### Unlock Process

1. Navigate to **Repository Settings → Secrets and variables → Actions → Variables**
2. Find `PROD_DEPLOY_ENABLED` variable
3. Click **Edit** (pencil icon)
4. Change value from `false` to `true`
5. Click **Update variable**
6. **Document the change:**
   - Create issue tracking who unlocked and why
   - Set calendar reminder to re-lock after deployment window

#### Lock Process (Re-freeze)

1. After deployment completes, immediately return to variables
2. Edit `PROD_DEPLOY_ENABLED`
3. Change value back to `false`
4. Click **Update variable**
5. Verify in next workflow run that production is frozen

#### Audit Trail

**Maintain deployment log:**
- Who unlocked: [Name]
- When: [Timestamp]
- Why: [Deployment reason]
- Who locked: [Name]
- When: [Timestamp]

```
[Screenshot Placeholder: Variable Edit Interface]
```

---

### Step 4: Additional Repository Variables

Create these optional but recommended variables:

#### DEPLOYMENT_WINDOW

```
Name: DEPLOYMENT_WINDOW
Value: "Tuesday,Thursday 14:00-16:00 UTC"
Description: Approved production deployment time windows
```

#### MAX_DEPLOYMENT_DURATION

```
Name: MAX_DEPLOYMENT_DURATION
Value: "30"
Description: Maximum deployment duration in minutes before auto-rollback consideration
```

#### SLACK_NOTIFICATION_ENABLED

```
Name: SLACK_NOTIFICATION_ENABLED
Value: "true"
Description: Enable/disable Slack notifications for deployments
```

---

## Branch Protection Rules

### Step 1: Access Branch Protection Settings

1. Navigate to **Repository Settings**
2. Click **Branches** in left sidebar (under "Code and automation")
3. Locate **Branch protection rules** section
4. Click **Add branch protection rule**

**Navigation Path:** `Repository → Settings → Branches → Add branch protection rule`

```
[Screenshot Placeholder: Branch Protection Rules Page]
```

---

### Step 2: Protect Main Branch

#### 2.1 Basic Configuration

**Branch name pattern:**
```
main
```

#### 2.2 Enable Required Protections

Check the following options:

##### Require a Pull Request Before Merging

1. ✅ Check **Require a pull request before merging**

2. **Require approvals**
   - Set to: `2` approvals minimum

3. ✅ Check **Dismiss stale pull request approvals when new commits are pushed**
   - Ensures re-review after changes

4. ✅ Check **Require review from Code Owners** (if CODEOWNERS file exists)

5. ✅ Check **Require approval of the most recent reviewable push**

##### Require Status Checks to Pass

6. ✅ Check **Require status checks to pass before merging**

7. ✅ Check **Require branches to be up to date before merging**

8. **Add required status checks:**
   - Search and add: `build`
   - Search and add: `test`
   - Search and add: `lint`
   - Search and add: `security-scan`
   - Any other CI checks from your workflows

```
[Screenshot Placeholder: Status Checks Selection]
```

##### Require Conversation Resolution

9. ✅ Check **Require conversation resolution before merging**
   - All PR comments must be resolved

##### Require Signed Commits (Optional but Recommended)

10. ✅ Check **Require signed commits**
    - Enhances security and authenticity

##### Require Linear History

11. ✅ Check **Require linear history**
    - Prevents merge commits, enforces rebase or squash

##### Additional Protections

12. ✅ Check **Do not allow bypassing the above settings**
    - Even admins must follow rules

13. ✅ Check **Restrict who can push to matching branches**
    - Click **Add** and select:
      - Release managers
      - CI/CD service accounts only
    - Leave empty to prevent all direct pushes

##### Force Push Protection

14. ✅ Check **Do not allow force pushes**
    - Prevents history rewriting

15. ✅ Check **Do not allow deletions**
    - Prevents accidental branch deletion

#### 2.3 Save Configuration

16. Scroll to bottom and click **Create** or **Save changes**

```
[Screenshot Placeholder: Complete Main Branch Protection Configuration]
```

---

### Step 3: Protect Release Branches

#### 3.1 Create Release Branch Protection Rule

1. Click **Add branch protection rule**

2. **Branch name pattern:**
   ```
   release/*
   ```

#### 3.2 Configure Release Branch Protections

Apply similar protections as main branch:

- ✅ Require pull request with 1 approval minimum
- ✅ Require status checks to pass
- ✅ Require conversation resolution
- ✅ Do not allow force pushes
- ✅ Do not allow deletions

**Less Strict Than Main:**
- Allow 1 approval instead of 2 (faster release iteration)
- Allow release managers to bypass in emergencies

3. Click **Create**

---

### Step 4: Protect Develop Branch (Optional)

#### 4.1 Create Develop Branch Protection Rule

1. Click **Add branch protection rule**

2. **Branch name pattern:**
   ```
   develop
   ```

#### 4.2 Configure Develop Branch Protections

Lighter protections for faster development:

- ✅ Require pull request with 1 approval
- ✅ Require status checks to pass (build, test)
- ✅ Do not allow force pushes (without admin override)

**More Flexible:**
- Allow dismissal of stale approvals
- Allow admins to bypass
- Allow force pushes with lease

3. Click **Create**

---

### Step 5: Summary of Branch Protections

| Branch Pattern | Required Approvals | Status Checks | Force Push | Deletions |
|---------------|-------------------|---------------|------------|-----------|
| `main` | 2 | Required | Blocked | Blocked |
| `release/*` | 1 | Required | Blocked | Blocked |
| `develop` | 1 | Required | Admin only | Admin only |
| Other branches | None | Optional | Allowed | Allowed |

```
[Screenshot Placeholder: Branch Protection Rules Summary View]
```

---

## Required Secrets Configuration

### Step 1: Access Secrets Settings

1. Navigate to **Repository Settings**
2. Click **Secrets and variables** in left sidebar
3. Click **Actions**
4. Ensure you're on the **Secrets** tab

**Navigation Path:** `Repository → Settings → Secrets and variables → Actions → Secrets`

```
[Screenshot Placeholder: Repository Secrets Page]
```

---

### Step 2: Configure Azure Credentials

#### 2.1 AZURE_CREDENTIALS (Service Principal JSON)

1. Click **New repository secret**

2. **Name:**
   ```
   AZURE_CREDENTIALS
   ```

3. **Secret value:** (JSON format)
   ```json
   {
     "clientId": "YOUR_CLIENT_ID",
     "clientSecret": "YOUR_CLIENT_SECRET",
     "subscriptionId": "YOUR_SUBSCRIPTION_ID",
     "tenantId": "YOUR_TENANT_ID",
     "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
     "resourceManagerEndpointUrl": "https://management.azure.com/",
     "activeDirectoryGraphResourceId": "https://graph.windows.net/",
     "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",
     "galleryEndpointUrl": "https://gallery.azure.com/",
     "managementEndpointUrl": "https://management.core.windows.net/"
   }
   ```

4. Click **Add secret**

**Usage:** Azure login in GitHub Actions
```yaml
- uses: azure/login@v1
  with:
    creds: ${{ secrets.AZURE_CREDENTIALS }}
```

```
[Screenshot Placeholder: AZURE_CREDENTIALS Secret Creation]
```

---

#### 2.2 AZURE_CLIENT_ID

1. Click **New repository secret**
2. **Name:** `AZURE_CLIENT_ID`
3. **Secret value:** Your Azure AD application (client) ID
4. Click **Add secret**

**Example format:** `12345678-1234-1234-1234-123456789abc`

---

#### 2.3 AZURE_CLIENT_SECRET

1. Click **New repository secret**
2. **Name:** `AZURE_CLIENT_SECRET`
3. **Secret value:** Your Azure AD application client secret
4. Click **Add secret**

**Security:** Rotate this secret every 90 days

---

#### 2.4 AZURE_TENANT_ID

1. Click **New repository secret**
2. **Name:** `AZURE_TENANT_ID`
3. **Secret value:** Your Azure AD tenant ID
4. Click **Add secret**

**Example format:** `12345678-1234-1234-1234-123456789abc`

---

#### 2.5 AZURE_SUBSCRIPTION_ID

1. Click **New repository secret**
2. **Name:** `AZURE_SUBSCRIPTION_ID`
3. **Secret value:** Your Azure subscription ID
4. Click **Add secret**

**Example format:** `12345678-1234-1234-1234-123456789abc`

---

### Step 3: Configure Production URLs

#### 3.1 PROD_URL

1. Click **New repository secret**
2. **Name:** `PROD_URL`
3. **Secret value:**
   ```
   https://flamoral.com
   ```
4. Click **Add secret**

**Usage:** Frontend production URL for deployments and health checks

---

#### 3.2 PROD_API_URL

1. Click **New repository secret**
2. **Name:** `PROD_API_URL`
3. **Secret value:**
   ```
   https://api.flamoral.com
   ```
4. Click **Add secret**

**Usage:** Backend API production URL for deployments and health checks

---

### Step 4: Configure Slack Notifications

#### 4.1 SLACK_WEBHOOK_URL

1. **First, create Slack Incoming Webhook:**
   - Go to your Slack workspace
   - Navigate to **Apps → Incoming Webhooks**
   - Click **Add to Slack**
   - Choose channel (e.g., `#deployments`)
   - Copy the webhook URL

2. **Add to GitHub:**
   - Click **New repository secret**
   - **Name:** `SLACK_WEBHOOK_URL`
   - **Secret value:** (paste your webhook URL)
     ```
     https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
     ```
   - Click **Add secret**

**Usage in workflow:**
```yaml
- name: Notify Slack
  run: |
    curl -X POST ${{ secrets.SLACK_WEBHOOK_URL }} \
      -H 'Content-Type: application/json' \
      -d '{"text":"Production deployment started"}'
```

```
[Screenshot Placeholder: SLACK_WEBHOOK_URL Secret Creation]
```

---

### Step 5: Environment-Specific Secrets

For each environment, add secrets with environment scope:

#### Configure Environment Secrets

1. Go to **Settings → Environments**
2. Click on an environment (e.g., `production`)
3. Scroll to **Environment secrets** section
4. Click **Add secret**

#### Production Environment Secrets

Add the following to `production` environment:

**DATABASE_CONNECTION_STRING**
```
Name: DATABASE_CONNECTION_STRING
Value: [Your production database connection string]
```

**API_KEY**
```
Name: API_KEY
Value: [Your production API key]
```

**JWT_SECRET**
```
Name: JWT_SECRET
Value: [Your production JWT signing secret]
```

**STORAGE_ACCOUNT_KEY**
```
Name: STORAGE_ACCOUNT_KEY
Value: [Your Azure Storage account key]
```

#### Staging Environment Secrets

Repeat the process for `staging` environment with staging credentials.

#### Development Environment Secrets

Repeat the process for `development` environment with development credentials.

```
[Screenshot Placeholder: Environment-Specific Secrets Configuration]
```

---

### Step 6: Secrets Summary Checklist

#### Repository-Level Secrets

- [ ] AZURE_CREDENTIALS
- [ ] AZURE_CLIENT_ID
- [ ] AZURE_CLIENT_SECRET
- [ ] AZURE_TENANT_ID
- [ ] AZURE_SUBSCRIPTION_ID
- [ ] PROD_URL
- [ ] PROD_API_URL
- [ ] SLACK_WEBHOOK_URL

#### Environment-Level Secrets (per environment)

**Production:**
- [ ] DATABASE_CONNECTION_STRING
- [ ] API_KEY
- [ ] JWT_SECRET
- [ ] STORAGE_ACCOUNT_KEY

**Staging:**
- [ ] DATABASE_CONNECTION_STRING
- [ ] API_KEY
- [ ] JWT_SECRET
- [ ] STORAGE_ACCOUNT_KEY

**Development:**
- [ ] DATABASE_CONNECTION_STRING
- [ ] API_KEY
- [ ] JWT_SECRET
- [ ] STORAGE_ACCOUNT_KEY

---

## Verification Steps

### Step 1: Verify Environment Configuration

#### Test Each Environment

1. Navigate to **Settings → Environments**
2. For each environment, verify:

**Development:**
- [ ] No protection rules enabled
- [ ] Secrets configured

**Staging:**
- [ ] Deployment branches: `develop`, `feature/*`, `bugfix/*`
- [ ] Secrets configured

**Production:**
- [ ] Required reviewers: Minimum 2
- [ ] Wait timer: 5 minutes
- [ ] Deployment branches: `main`, `release/*`
- [ ] Prevent self-review enabled
- [ ] Secrets configured

**Production-Approval:**
- [ ] Required reviewers: Minimum 2
- [ ] Wait timer: 10 minutes
- [ ] Deployment branches: `main` only
- [ ] Prevent self-review enabled

**Production-Rollback:**
- [ ] Required reviewers: 1
- [ ] No wait timer
- [ ] Deployment branches: `main`, `hotfix/*`, `rollback/*`

```
[Screenshot Placeholder: Environment Verification Checklist]
```

---

### Step 2: Verify Branch Protection

#### Test Branch Protection Rules

1. Navigate to **Settings → Branches**
2. Verify protection rules exist for:
   - [ ] `main` branch
   - [ ] `release/*` pattern
   - [ ] `develop` branch (if applicable)

#### Test Main Branch Protection

3. Attempt to push directly to main:
   ```bash
   git checkout main
   git commit --allow-empty -m "Test direct push"
   git push origin main
   ```

   **Expected Result:** Push should be rejected

4. Attempt to create PR without required checks:
   - Create a PR to main
   - Try to merge before CI completes

   **Expected Result:** Merge button should be disabled

```
[Screenshot Placeholder: Branch Protection Active - Blocked Push]
```

---

### Step 3: Verify Repository Variables

1. Navigate to **Settings → Secrets and variables → Actions → Variables**
2. Verify:
   - [ ] `PROD_DEPLOY_ENABLED` exists
   - [ ] Value is set to `false`
   - [ ] Description is clear

3. Test in workflow:
   ```yaml
   - name: Check prod deploy gate
     run: |
       echo "PROD_DEPLOY_ENABLED: ${{ vars.PROD_DEPLOY_ENABLED }}"
       if [ "${{ vars.PROD_DEPLOY_ENABLED }}" != "true" ]; then
         echo "Production deployments frozen"
       fi
   ```

---

### Step 4: Verify Secrets Configuration

#### Test Secret Access

1. Create a test workflow:
   ```yaml
   name: Test Secrets
   on: workflow_dispatch

   jobs:
     test-secrets:
       runs-on: ubuntu-latest
       steps:
         - name: Check Azure secrets
           run: |
             if [ -z "${{ secrets.AZURE_CLIENT_ID }}" ]; then
               echo "AZURE_CLIENT_ID not set"
               exit 1
             fi
             echo "AZURE_CLIENT_ID configured ✓"
   ```

2. Run workflow manually
3. Check all required secrets are accessible

#### Verify Environment Secrets

1. Modify test workflow to use production environment:
   ```yaml
   jobs:
     test-prod-secrets:
       runs-on: ubuntu-latest
       environment: production
       steps:
         - name: Check production secrets
           run: |
             echo "Testing production environment secrets"
   ```

2. Run workflow
3. Verify approval required
4. Approve and verify secret access

```
[Screenshot Placeholder: Workflow Secrets Verification]
```

---

### Step 5: End-to-End Deployment Test

#### Staging Deployment Test

1. Create a test branch from `develop`
2. Make a small change
3. Push and create PR
4. Merge to `develop`
5. Trigger staging deployment
6. Verify:
   - [ ] Deployment succeeds
   - [ ] No approval required
   - [ ] Slack notification sent (if configured)

#### Production Deployment Test

1. Create PR from `develop` to `main`
2. Get required approvals
3. Merge to `main`
4. Attempt production deployment with `PROD_DEPLOY_ENABLED=false`
5. Verify:
   - [ ] Deployment blocked by freeze variable
6. Set `PROD_DEPLOY_ENABLED=true`
7. Retry deployment
8. Verify:
   - [ ] Approval required (2 reviewers)
   - [ ] Wait timer active (5 minutes)
   - [ ] Deployment proceeds after approval
   - [ ] Slack notification sent
9. Re-freeze: Set `PROD_DEPLOY_ENABLED=false`

```
[Screenshot Placeholder: Production Deployment Approval Flow]
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: Cannot Create Environments

**Symptom:** "Environments" option not visible in Settings

**Solutions:**
- Ensure you have admin access to the repository
- Environments are only available for public repos or private repos in GitHub Pro/Team/Enterprise
- Check organization settings don't restrict environment usage

---

#### Issue 2: Reviewers Not Receiving Approval Requests

**Symptom:** Reviewers not notified when approval needed

**Solutions:**
1. Verify reviewer has proper notification settings:
   - GitHub Profile → Settings → Notifications
   - Enable "Participating" notifications
2. Check reviewer has access to the repository
3. Verify reviewer hasn't muted the repository
4. Check email spam folder

---

#### Issue 3: Branch Protection Not Enforcing

**Symptom:** Can push directly to main despite protection rules

**Solutions:**
1. Verify you're not an admin with bypass permissions
2. Check "Do not allow bypassing" is enabled
3. Ensure protection rule pattern exactly matches branch name
4. Wait a few minutes for rule propagation

---

#### Issue 4: Status Checks Not Required

**Symptom:** Can merge PR without CI passing

**Solutions:**
1. Verify status check names exactly match workflow job names
2. Check "Require status checks to pass" is enabled
3. Ensure at least one check run has completed (GitHub needs to see it first)
4. Re-save branch protection rule

---

#### Issue 5: Environment Secrets Not Accessible

**Symptom:** Workflow can't access environment secrets

**Solutions:**
1. Verify workflow explicitly declares environment:
   ```yaml
   jobs:
     deploy:
       environment: production  # Must specify
   ```
2. Check secret name spelling
3. Verify secret is added to correct environment, not repository level
4. Ensure workflow has passed environment protection rules

---

#### Issue 6: Wait Timer Not Working

**Symptom:** Deployment proceeds immediately despite wait timer

**Solutions:**
1. Verify wait timer is saved in environment settings
2. Check you're not using `workflow_dispatch` which may bypass
3. Ensure environment is correctly specified in workflow
4. Review GitHub Actions logs for timer start

---

#### Issue 7: PROD_DEPLOY_ENABLED Variable Not Working

**Symptom:** Production deploys even when variable is false

**Solutions:**
1. Verify variable name spelling: `PROD_DEPLOY_ENABLED`
2. Check workflow uses correct syntax:
   ```yaml
   if: vars.PROD_DEPLOY_ENABLED == 'true'
   ```
   Not: `${{ vars.PROD_DEPLOY_ENABLED }}`
3. Ensure variable is repository-level, not environment-level
4. Check for override logic in workflow

---

#### Issue 8: Slack Notifications Not Sending

**Symptom:** No Slack messages on deployments

**Solutions:**
1. Verify webhook URL is correct and active in Slack
2. Test webhook manually:
   ```bash
   curl -X POST YOUR_WEBHOOK_URL \
     -H 'Content-Type: application/json' \
     -d '{"text":"Test message"}'
   ```
3. Check secret name is exact: `SLACK_WEBHOOK_URL`
4. Verify workflow step has proper error handling
5. Review workflow logs for curl errors

---

#### Issue 9: Azure Login Fails

**Symptom:** `azure/login` action fails in workflow

**Solutions:**
1. Verify service principal credentials are correct
2. Check service principal has necessary Azure permissions
3. Ensure JSON format in `AZURE_CREDENTIALS` is valid
4. Verify subscription ID is correct and accessible
5. Check if service principal secret has expired (rotate if needed)
6. Test credentials locally with Azure CLI:
   ```bash
   az login --service-principal \
     -u CLIENT_ID \
     -p CLIENT_SECRET \
     --tenant TENANT_ID
   ```

---

### Getting Help

If issues persist:

1. **Check GitHub Status:** https://www.githubstatus.com/
2. **Review Audit Log:** Settings → Audit log
3. **Contact GitHub Support:** For enterprise accounts
4. **Internal Support:** Contact DevOps team at devops@flamoral.com

---

## Appendix

### A. Complete Environment Configuration YAML

For reference, here's how environments should be configured:

```yaml
# development environment
name: development
protection_rules: []
deployment_branch_policy:
  protected_branches: false
  custom_branch_policies: false

# staging environment
name: staging
protection_rules: []
deployment_branch_policy:
  protected_branches: false
  custom_branch_policies: true
  custom_branches:
    - develop
    - feature/*
    - bugfix/*

# production environment
name: production
protection_rules:
  - type: required_reviewers
    reviewers: 2
    prevent_self_review: true
  - type: wait_timer
    wait_timer: 5
deployment_branch_policy:
  protected_branches: false
  custom_branch_policies: true
  custom_branches:
    - main
    - release/*

# production-approval environment
name: production-approval
protection_rules:
  - type: required_reviewers
    reviewers: 2
    prevent_self_review: true
  - type: wait_timer
    wait_timer: 10
deployment_branch_policy:
  protected_branches: false
  custom_branch_policies: true
  custom_branches:
    - main

# production-rollback environment
name: production-rollback
protection_rules:
  - type: required_reviewers
    reviewers: 1
deployment_branch_policy:
  protected_branches: false
  custom_branch_policies: true
  custom_branches:
    - main
    - hotfix/*
    - rollback/*
```

---

### B. Branch Protection Rule Template

```yaml
# main branch protection
branch: main
required_pull_request_reviews:
  required_approving_review_count: 2
  dismiss_stale_reviews: true
  require_code_owner_reviews: true
  require_last_push_approval: true
required_status_checks:
  strict: true
  checks:
    - build
    - test
    - lint
    - security-scan
required_conversation_resolution: true
required_signatures: true
required_linear_history: true
enforce_admins: true
restrictions:
  users: []
  teams: []
  apps: []
allow_force_pushes: false
allow_deletions: false
```

---

### C. Example GitHub Actions Workflow

```yaml
name: Production Deployment

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  deploy-production:
    runs-on: ubuntu-latest
    environment: production
    # Only run if production deployments are enabled
    if: vars.PROD_DEPLOY_ENABLED == 'true'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Azure Login
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Notify deployment start
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK_URL }} \
            -H 'Content-Type: application/json' \
            -d '{
              "text": "🚀 Production deployment started",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Production Deployment Started*\n*Commit:* ${{ github.sha }}\n*Actor:* ${{ github.actor }}"
                  }
                }
              ]
            }'

      - name: Deploy to Azure
        run: |
          echo "Deploying to production..."
          # Your deployment commands here

      - name: Health check
        run: |
          echo "Checking production health..."
          curl -f ${{ secrets.PROD_API_URL }}/health || exit 1

      - name: Notify deployment success
        if: success()
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK_URL }} \
            -H 'Content-Type: application/json' \
            -d '{
              "text": "✅ Production deployment successful",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Production Deployment Successful*\n*URL:* ${{ secrets.PROD_URL }}"
                  }
                }
              ]
            }'

      - name: Notify deployment failure
        if: failure()
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK_URL }} \
            -H 'Content-Type: application/json' \
            -d '{
              "text": "❌ Production deployment failed",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Production Deployment Failed*\n*Check logs:* https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }}"
                  }
                }
              ]
            }'
```

---

### D. Security Best Practices

1. **Secret Rotation Schedule**
   - Azure credentials: Every 90 days
   - API keys: Every 60 days
   - JWT secrets: Every 180 days
   - Database passwords: Every 90 days

2. **Access Review**
   - Quarterly review of who has approval rights
   - Annual review of all repository admins
   - Remove access for departed team members immediately

3. **Audit Logging**
   - Enable and monitor GitHub audit log
   - Track all production approvals
   - Alert on unexpected configuration changes

4. **Least Privilege**
   - Grant minimum necessary permissions
   - Use environment-specific secrets
   - Separate dev/staging/prod credentials completely

5. **Compliance**
   - Document all production changes
   - Maintain deployment logs
   - Track who approved what and when

---

### E. Contact Information

**Document Owner:** DevOps Team
**Email:** devops@flamoral.com
**Slack Channel:** #devops
**On-Call:** See PagerDuty rotation

**Reviewers:**
- Technical Lead: [Name]
- Security Lead: [Name]
- Infrastructure Lead: [Name]

**Last Review Date:** 2025-12-12
**Next Review Date:** 2026-03-12

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-12 | DevOps Team | Initial documentation |

---

**End of Document**
