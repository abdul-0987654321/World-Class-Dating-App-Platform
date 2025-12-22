# CI/CD Pipelines Documentation - Flamoral Dating Platform

> **Organization:** citadelcloudmanagement
> **Project:** DatingPlatform
> **Azure DevOps URL:** https://dev.azure.com/citadelcloudmanagement/DatingPlatform

---

## Table of Contents

- [Overview](#overview)
- [Pipeline Architecture](#pipeline-architecture)
- [Pipeline Files](#pipeline-files)
- [CI Pipeline](#ci-pipeline)
- [CD Pipeline](#cd-pipeline)
- [Infrastructure Pipeline](#infrastructure-pipeline)
- [Security Pipeline](#security-pipeline)
- [Deployment Strategies](#deployment-strategies)
- [Variable Groups](#variable-groups)
- [Service Connections](#service-connections)
- [Environments](#environments)
- [Approval Gates](#approval-gates)
- [Deployment Flow](#deployment-flow)

---

## Overview

The Flamoral Dating Platform implements a comprehensive CI/CD pipeline system using Azure DevOps, featuring:

- **Continuous Integration (CI)**: Automated build, test, and security scanning
- **Continuous Deployment (CD)**: Multi-environment deployment with approval gates
- **Infrastructure as Code**: Terraform-based infrastructure provisioning
- **Security Scanning**: Comprehensive vulnerability and secret detection
- **Multiple Deployment Strategies**: Blue-Green and Canary deployments

### Key Features

- Self-hosted agent pool for custom build requirements
- Multi-stage pipelines with parallel execution
- Docker image building and scanning
- Kubernetes/AKS deployment via Helm
- Database migration automation
- Health check validation
- Automated rollback capabilities

---

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CODE COMMIT                              │
│                     (main/develop/feature)                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CI PIPELINE                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Code Quality │  │Build Backend │  │ Build Frontend│          │
│  │   & Security │  │   Services   │  │  Applications │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│           │                │                  │                  │
│           └────────────────┴──────────────────┘                  │
│                           │                                      │
│                           ▼                                      │
│           ┌───────────────────────────────┐                     │
│           │  Build & Push Docker Images   │                     │
│           │     (ACR: flamoralacr.io)     │                     │
│           └───────────────────────────────┘                     │
│                           │                                      │
│                           ▼                                      │
│           ┌───────────────────────────────┐                     │
│           │    Integration Tests          │                     │
│           └───────────────────────────────┘                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY PIPELINE                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Dependencies │  │   Secrets    │  │  Container   │          │
│  │   Scanning   │  │  Detection   │  │   Scanning   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CD PIPELINE                                  │
│                                                                  │
│  ┌──────────────────────────────────────────────────┐          │
│  │              DEVELOPMENT                          │          │
│  │  • Auto-deploy to dev.flamoral.app               │          │
│  │  • Run database migrations                        │          │
│  │  • Health checks                                  │          │
│  └──────────────────────────────────────────────────┘          │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────┐          │
│  │          MANUAL APPROVAL GATE                     │          │
│  └──────────────────────────────────────────────────┘          │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────┐          │
│  │                TEST                               │          │
│  │  • Deploy to test.flamoral.app                   │          │
│  │  • E2E tests                                      │          │
│  │  • Performance testing                            │          │
│  └──────────────────────────────────────────────────┘          │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────┐          │
│  │          MANUAL APPROVAL GATE                     │          │
│  │        (Release Managers + CTO)                   │          │
│  └──────────────────────────────────────────────────┘          │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────┐          │
│  │            PRODUCTION                             │          │
│  │  • Blue-Green deployment to flamoral.app         │          │
│  │  • Health validation                              │          │
│  │  • Traffic switch approval                        │          │
│  │  • Automated rollback on failure                  │          │
│  └──────────────────────────────────────────────────┘          │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────┐          │
│  │        POST-DEPLOYMENT MONITORING                 │          │
│  │  • 10-minute health monitoring                    │          │
│  │  • Success notifications                          │          │
│  └──────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Pipeline Files

### Main Pipelines

| Pipeline | File | Purpose | Trigger |
|----------|------|---------|---------|
| **CI Pipeline** | `pipelines/ci-pipeline.yml` | Build, test, and create Docker images | Push to main/develop/feature/release/hotfix |
| **CD Pipeline** | `pipelines/cd-pipeline.yml` | Deploy to Dev/Test/Prod with Blue-Green | CI pipeline completion (main branch) |
| **CD Canary** | `pipelines/cd-pipeline-canary.yml` | Progressive canary deployments | CI pipeline completion (alternative) |
| **Infrastructure** | `pipelines/infrastructure-pipeline.yml` | Terraform infrastructure management | Changes to infrastructure/terraform/** |
| **Security** | `pipelines/security-pipeline.yml` | Comprehensive security scanning | Push to main/develop, Weekly schedule |
| **Infra Bootstrap** | `pipelines/azure-pipelines-infra.yml` | Infrastructure deployment (Dev/Test/Prod) | Changes to terraform/** |

### Template Files

Located in `pipelines/templates/`:

| Template | Purpose |
|----------|---------|
| `docker-build-push.yml` | Build and push Docker images to ACR |
| `helm-deploy.yml` | Deploy services to Kubernetes via Helm |
| `terraform-init.yml` | Initialize Terraform with Azure backend |
| `terraform-plan.yml` | Create and publish Terraform execution plans |
| `terraform-apply.yml` | Apply Terraform changes |
| `canary-deployment.yml` | Progressive canary deployment with traffic splitting |
| `database-migration.yml` | Run database migrations |
| `health-check.yml` | Post-deployment health validation |
| `rollback-deployment.yml` | Automated rollback procedures |
| `integration-tests.yml` | Integration test execution |
| `node-build.yml` | Build Node.js microservices |
| `variables-common.yml` | Common variables across all pipelines |
| `variables-dev.yml` | Development environment variables |
| `variables-test.yml` | Test environment variables |
| `variables-prod.yml` | Production environment variables |

---

## CI Pipeline

**File:** `pipelines/ci-pipeline.yml`
**Name:** `CI-$(Date:yyyyMMdd)$(Rev:.r)`

### Trigger Conditions

```yaml
Branches:
  - main
  - develop
  - release/*
  - hotfix/*
  - feature/*

Excluded Paths:
  - docs/**
  - **/*.md
  - LICENSE
  - .gitignore
```

### Pull Request Triggers

```yaml
Target Branches:
  - main
  - develop
```

### Stages Overview

#### Stage 1: Code Quality & Security

**Jobs:**
1. **Linting**
   - ESLint across all workspaces
   - TypeScript type checking
   - Uses npm cache for performance

2. **Security Scan**
   - NPM audit (moderate severity threshold)
   - Trivy filesystem scan (HIGH/CRITICAL)
   - Publishes security reports as artifacts

3. **Secrets Detection**
   - detect-secrets scan
   - Excludes node_modules, .git, dist, build

#### Stage 2: Build Backend Services

**Jobs:**
1. **Build Node.js Microservices** (Parallel Matrix)
   - api-gateway
   - auth-service
   - user-service
   - matching-service
   - messaging-service
   - media-service
   - payment-service
   - notification-service
   - analytics-service
   - moderation-service
   - advertising-service

   Each service:
   - Uses `node-build.yml` template
   - Runs unit tests
   - Publishes code coverage

2. **Build AI Services (Python)**
   - Installs Python dependencies
   - Runs flake8 linting
   - Executes pytest with coverage
   - Publishes test results

3. **Build Go Services (Realtime)**
   - Installs Go 1.21.5
   - Builds realtime-service
   - Runs Go tests

#### Stage 3: Build Frontend Applications

**Jobs:**
1. **Build Web App**
   - Builds Next.js/React web application
   - Publishes build artifacts

2. **Build Mobile App**
   - Builds React Native mobile app
   - Runs mobile tests

#### Stage 4: Build & Push Docker Images

**Condition:** Successful build + NOT a Pull Request

**Jobs:**
- **Build Images** (Parallel Matrix for all 12 services)
  - Uses `docker-build-push.yml` template
  - Builds Docker images
  - Scans with Trivy (HIGH/CRITICAL vulnerabilities)
  - Pushes to ACR: `flamoralacr8eq5eg.azurecr.io`
  - Tags: `$(Build.BuildId)` and `latest`

#### Stage 5: Integration Tests

**Condition:** Successful Docker build + NOT a Pull Request

**Jobs:**
- Start test infrastructure (PostgreSQL, Redis, MongoDB)
- Run integration tests
- Cleanup test environment
- Publish test results

#### Stage 6: Publish Artifacts

**Condition:** Main branch only

**Jobs:**
- Publish Kubernetes manifests
- Publish Helm charts
- Generate and publish build info

### Docker Image Build Process

Template: `pipelines/templates/docker-build-push.yml`

**Process:**
1. Login to ACR using service connection
2. Build Docker image with:
   - Build arguments: NODE_ENV=production
   - Labels: source, revision
   - Tags: Build ID and latest
3. Security scan with Trivy
4. Push to ACR if enabled

**Example:**
```yaml
Image: flamoralacr8eq5eg.azurecr.io/flamoral/auth-service:12345
Tags: 12345, latest
```

---

## CD Pipeline

**File:** `pipelines/cd-pipeline.yml`
**Name:** `CD-$(Date:yyyyMMdd)$(Rev:.r)`

### Trigger Conditions

```yaml
Manual Trigger: No direct trigger
Resource Trigger: CI pipeline completion (main branch)
```

### Variable Groups

- `flamoral-shared-vars`
- `flamoral-cd-vars`

### Stages Overview

#### Stage 1: Deploy to Development

**Environment:** `flamoral-dev`
**Variables:** `templates/variables-dev.yml`
**Namespace:** `flamoral-dev`
**Domain:** `dev.flamoral.app`

**Deployment Strategy:** RunOnce

**Steps:**
1. Checkout code
2. Use `helm-deploy.yml` template
3. Run database migrations
4. Deploy via Helm
5. Run health checks

**Configuration:**
- Replica count: 1
- Autoscaling: Disabled
- Ingress: Enabled

#### Stage 2: Deploy to Test

**Environment:** `flamoral-test`
**Variables:** `templates/variables-test.yml`
**Namespace:** `flamoral-test`
**Domain:** `test.flamoral.app`

**Approval Gate:**
- Manual validation required
- Notifies: qa-team@flamoral.com, devops@flamoral.com
- Timeout: 4 hours
- On timeout: Reject

**Jobs:**
1. **Test Approval**
   - Manual validation task
   - Displays build info and approval instructions

2. **Deploy to Test AKS**
   - Helm deployment
   - Database migrations
   - Health checks

3. **Integration Tests**
   - E2E tests against test environment
   - Publishes test results

4. **Performance Test**
   - k6 load testing
   - Performance baseline validation

**Configuration:**
- Replica count: 2
- Autoscaling: Enabled (min: 2, max: 5)
- Ingress: Enabled

#### Stage 3: Deploy to Production

**Environment:** `flamoral-production`
**Variables:** `templates/variables-prod.yml`
**Namespace:** `flamoral-prod`
**Domain:** `flamoral.app`

**Condition:** Main branch only

**Approval Gate:**
- Manual validation required
- Notifies: release-managers@flamoral.com, cto@flamoral.com, devops@flamoral.com
- Timeout: 24 hours
- Includes pre-deployment checklist

**Jobs:**

1. **Production Approval**
   - Manual validation with checklist
   - Pre-deployment verification

2. **Deploy to Production AKS** (Blue-Green Strategy)

   **Pre-Deploy:**
   - Log deployment start

   **Deploy:**
   - Install Helm and kubectl
   - Get AKS credentials
   - Determine deployment slot (blue/green)
   - Create namespace if needed
   - Create ACR pull secret
   - Deploy to new slot
   - Wait for deployment readiness

   **Post-Deploy:**
   - Validate deployment status

3. **Production Validation**
   - Wait 60 seconds for stabilization
   - Health check API endpoint
   - Verify 200 response

4. **Traffic Switch Approval**
   - Manual approval to switch traffic
   - Timeout: 60 minutes

5. **Switch Production Traffic**
   - Patch service to route to new slot
   - Display deployment summary

6. **Rollback on Failure** (Conditional)
   - Triggers if deployment or validation fails
   - Uses `rollback-deployment.yml` template
   - Restores previous slot

**Configuration:**
- Replica count: 5
- Autoscaling: Enabled (min: 5, max: 50)
- Target CPU: 70%
- Resource requests: 1Gi memory, 1000m CPU
- Resource limits: 2Gi memory, 2000m CPU
- Ingress: Enabled with TLS

#### Stage 4: Post-Deployment Monitoring

**Jobs:**
1. **Monitor Deployment**
   - 10-minute health monitoring
   - Health checks every minute
   - Alerts on failures

2. **Notify Success**
   - Send success notifications
   - Integration points for Slack/Teams/Email

### Blue-Green Deployment Process

1. **Determine Current Slot:**
   ```bash
   CURRENT_SLOT=$(kubectl get service flamoral-api-gateway -n namespace -o jsonpath='{.spec.selector.slot}')
   NEW_SLOT = (blue -> green) or (green -> blue)
   ```

2. **Deploy to New Slot:**
   - Deploy all services with `slot=NEW_SLOT` label
   - Wait for readiness

3. **Validate New Slot:**
   - Health checks
   - Smoke tests

4. **Switch Traffic:**
   ```bash
   kubectl patch service flamoral-api-gateway -n namespace \
     -p '{"spec":{"selector":{"slot":"NEW_SLOT"}}}'
   ```

5. **Monitor:**
   - Watch metrics
   - Keep old slot available for rollback

---

## Infrastructure Pipeline

**File:** `pipelines/infrastructure-pipeline.yml`
**Name:** `Infrastructure-$(Date:yyyyMMdd)$(Rev:.r)`

### Trigger Conditions

```yaml
Branches:
  - main
  - develop

Paths:
  - infrastructure/terraform/**
  - infrastructure/helm/**
  - infrastructure/kubernetes/**
```

### Parameters

| Parameter | Values | Default | Description |
|-----------|--------|---------|-------------|
| environment | dev, test, prod | dev | Target environment |
| terraformAction | plan, apply, destroy | plan | Action to perform |
| autoApprove | true, false | false | Auto-approve (non-prod only) |

### Variable Groups

- `datingplatform-terraform-common`

### Terraform State Backend

| Setting | Value |
|---------|-------|
| Resource Group | flamoral-terraform-state-rg |
| Storage Account | flamoraltfstate |
| Container | tfstate |
| State Key | flamoral-{environment}.tfstate |

### Stages Overview

#### Stage 1: Terraform Validation

**Jobs:**
1. **Validate Terraform**
   - Install Terraform 1.6.0
   - Format check: `terraform fmt -check -recursive`
   - Initialize: `terraform init -backend=false`
   - Validate: `terraform validate`
   - TFLint analysis
   - Checkov security scan

**Outputs:**
- Checkov test results (JUnit format)

#### Stage 2: Terraform Plan

**Jobs:**
1. **Generate Terraform Plan**
   - Install Terraform
   - Initialize with backend config
   - Create plan: `terraform plan -out=tfplan-{environment}`
   - Show plan summary
   - Generate JSON output

**Artifacts:**
- `terraform-plan-{environment}`: Binary plan file
- `terraform-plan-json-{environment}`: JSON format
- Plan includes detailed exit codes:
  - 0: No changes
  - 2: Changes detected
  - Other: Failure

#### Stage 3: Terraform Apply - Dev

**Condition:** environment=dev AND action=apply

**Jobs:**
1. **Apply Infrastructure to Dev**
   - Download plan artifact
   - Apply: `terraform apply -auto-approve tfplan-dev`
   - Capture outputs
   - Publish outputs artifact

#### Stage 4: Terraform Apply - Test

**Condition:** environment=test AND action=apply

**Jobs:**
1. **Apply Infrastructure to Test**
   - Download plan artifact
   - Apply: `terraform apply -auto-approve tfplan-test`
   - Capture outputs
   - Publish outputs artifact

#### Stage 5: Terraform Apply - Production

**Condition:** environment=prod AND action=apply AND main branch

**Approval Gate:**
- Manual validation required
- Reviews Terraform plan
- Warns about production changes
- Timeout: 24 hours

**Jobs:**
1. **Wait for Approval**
   - Manual validation task

2. **Apply Infrastructure to Production**
   - Download plan artifact
   - Apply: `terraform apply -auto-approve tfplan-prod`
   - Capture outputs
   - Publish outputs artifact

#### Stage 6: Terraform Destroy

**Condition:** action=destroy AND NOT production

**Approval Gate:**
- Manual validation required
- Confirms destruction
- Timeout: 60 minutes

**Jobs:**
1. **Confirm Destruction**
   - Manual validation

2. **Destroy Infrastructure**
   - `terraform destroy -auto-approve`

#### Stage 7: Infrastructure Verification

**Jobs:**
1. **Verify Azure Resources**
   - Login to Azure
   - Check resource group
   - Check AKS cluster status
   - Verify deployment

### Terraform Template Details

#### terraform-init.yml

**Process:**
1. Cache Terraform plugins
2. Ensure Terraform version 1.6.0
3. Use Azure CLI task for authentication
4. Export ARM credentials from service principal
5. Initialize with retry logic (3 attempts)

**Backend Configuration:**
```bash
terraform init \
  -backend-config="resource_group_name=$TF_STATE_RG" \
  -backend-config="storage_account_name=$TF_STATE_SA" \
  -backend-config="container_name=$TF_STATE_CONTAINER" \
  -backend-config="key={environment}.terraform.tfstate" \
  -reconfigure -upgrade
```

#### terraform-plan.yml

**Process:**
1. Use Azure CLI task for credentials
2. Build plan command with optional var file
3. Execute with retry logic (3 attempts)
4. Set pipeline variable for changes detected
5. Generate JSON and text formats
6. Publish all formats as artifacts
7. Optional: Post plan to PR

**Exit Code Handling:**
- 0: No changes → Continue
- 2: Changes detected → Set variable
- 1: Error → Retry or fail

#### terraform-apply.yml

**Process:**
1. Download plan artifact
2. Verify plan file exists
3. Apply with retry logic (2 attempts)
4. Capture outputs in JSON format
5. List state resources
6. Set pipeline variables from outputs
7. Publish outputs and state artifacts

**Outputs:**
- `terraform-outputs.json`
- `state-resources.txt`

---

## Security Pipeline

**File:** `pipelines/security-pipeline.yml`
**Name:** `Security-$(Date:yyyyMMdd)$(Rev:.r)`

### Trigger Conditions

```yaml
Branches:
  - main
  - develop

Schedule:
  - Weekly on Sunday at 2 AM UTC
```

### Variable Groups

- `flamoral-security-vars`

### Stages Overview

#### Stage 1: Dependency Vulnerability Scanning

**Jobs:**

1. **NPM Security Audit**
   - `npm audit --audit-level=moderate`
   - JSON and CLI output
   - Publishes audit report

2. **Snyk Vulnerability Scan** (if token available)
   - `snyk test --severity-threshold=high`
   - `snyk monitor` for continuous monitoring
   - Publishes Snyk results

3. **Trivy Filesystem Scan**
   - Installs Trivy from official repo
   - Scans for HIGH/CRITICAL vulnerabilities
   - `trivy fs --severity HIGH,CRITICAL --ignore-unfixed`
   - Publishes scan results

#### Stage 2: Secret Detection

**Jobs:**

1. **Detect Secrets**
   - detect-secrets scan with baseline
   - TruffleHog3 scan
   - Excludes: node_modules, .git, dist, build
   - Publishes baseline and reports

2. **GitLeaks Check**
   - Full git history scan
   - Installs GitLeaks 8.18.0
   - `gitleaks detect --source .`
   - JSON report output

#### Stage 3: Container Image Scanning

**Condition:** Not a Pull Request

**Jobs:**

1. **Scan Container Images**
   - Login to ACR
   - Install Trivy
   - Scan each service image:
     ```bash
     trivy image --severity HIGH,CRITICAL \
       flamoralacr8eq5eg.azurecr.io/flamoral/{service}:latest
     ```
   - Publishes scan results per service

**Services Scanned:**
- api-gateway
- auth-service
- user-service
- matching-service
- messaging-service
- payment-service

#### Stage 4: Infrastructure Security Scanning

**Jobs:**

1. **Terraform Security Scan**
   - **tfsec**: Terraform security scanner
     ```bash
     tfsec infrastructure/terraform --format json
     ```
   - **Checkov**: IaC security scanner
     ```bash
     checkov -d infrastructure/terraform
     ```
   - Publishes both results

2. **Kubernetes Security Scan**
   - **Kubesec**: K8s security analysis
     ```bash
     kubesec scan {manifest}.yaml
     ```
   - **kube-score**: Best practices analysis
     ```bash
     kube-score score {manifest}.yaml
     ```
   - Publishes security results

#### Stage 5: Security Report Generation

**Condition:** Always runs

**Jobs:**

1. **Generate Security Report**
   - Downloads all scan artifacts
   - Generates summary report in Markdown
   - Lists all scans performed
   - Provides next steps guidance
   - Publishes consolidated report

**Report Includes:**
- Build information
- Scan status matrix
- Artifact references
- Remediation guidance

---

## Deployment Strategies

### Blue-Green Deployment (Default)

**Used by:** `cd-pipeline.yml`

**Benefits:**
- Zero-downtime deployments
- Instant rollback capability
- Full production validation before traffic switch

**Process:**
1. Deploy to inactive slot (blue or green)
2. Validate new deployment
3. Manual approval to switch traffic
4. Switch load balancer to new slot
5. Keep old slot for quick rollback

**Implementation:**
```yaml
Slots:
  - blue: Current production
  - green: New deployment

Service Selector:
  slot: blue (or green)

Traffic Switch:
  kubectl patch service -p '{"spec":{"selector":{"slot":"new"}}}'
```

### Canary Deployment (Alternative)

**Used by:** `cd-pipeline-canary.yml`

**Benefits:**
- Progressive rollout
- Risk mitigation
- Real user validation

**Process:**
1. Deploy canary at 10% traffic
2. Monitor metrics (5 minutes)
3. Manual approval
4. Increase to 50% traffic
5. Monitor metrics
6. Manual approval
7. Full rollout to 100%
8. Cleanup canary resources

**Implementation:**
```yaml
Stages:
  1. Canary at 10%
  2. Promote to 50%
  3. Promote to 100%

Traffic Control:
  NGINX Ingress annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "10"
```

**Monitoring:**
- Pod health checks every 30 seconds
- Restart count monitoring
- CrashLoopBackOff detection
- Automatic failure detection

---

## Variable Groups

### Common Variables (`flamoral-shared-vars`)

Located in: `pipelines/templates/variables-common.yml`

| Variable | Value | Description |
|----------|-------|-------------|
| nodeVersion | 20.x | Node.js version |
| goVersion | 1.21 | Go version |
| pythonVersion | 3.x | Python version |
| terraformVersion | 1.6.0 | Terraform version |
| helmVersion | 3.12.0 | Helm version |
| acrName | flamoralacr8eq5eg | ACR name |
| acrLoginServer | flamoralacr8eq5eg.azurecr.io | ACR login server |
| imagePrefix | flamoral | Image prefix |
| aksClusterName | datingapp-dev-aks | AKS cluster |
| resourceGroup | datingapp-dev-rg | Resource group |
| tfStateResourceGroup | flamoral-terraform-state-rg | Terraform state RG |
| tfStateStorageAccount | flamoraltfstate | Terraform state storage |
| tfStateContainer | tfstate | State container |

### Development Variables (`variables-dev.yml`)

| Variable | Value |
|----------|-------|
| environment | dev |
| namespace | flamoral-dev |
| ingressHost | dev.flamoral.app |
| apiHost | api.dev.flamoral.app |
| replicaCount | 1 |
| autoscalingEnabled | false |
| keyVaultName | flamoral-dev-kv |

### Test Variables (`variables-test.yml`)

| Variable | Value |
|----------|-------|
| environment | test |
| namespace | flamoral-test |
| ingressHost | test.flamoral.app |
| apiHost | api.test.flamoral.app |
| replicaCount | 2 |
| autoscalingEnabled | true |
| autoscalingMinReplicas | 2 |
| autoscalingMaxReplicas | 5 |
| keyVaultName | flamoral-test-kv |

### Production Variables (`variables-prod.yml`)

| Variable | Value |
|----------|-------|
| environment | production |
| namespace | flamoral-prod |
| ingressHost | flamoral.app |
| apiHost | api.flamoral.app |
| replicaCount | 5 |
| autoscalingEnabled | true |
| autoscalingMinReplicas | 5 |
| autoscalingMaxReplicas | 50 |
| targetCPUUtilization | 70 |
| keyVaultName | flamoral-prod-kv |
| resourceRequestMemory | 1Gi |
| resourceRequestCpu | 1000m |
| resourceLimitMemory | 2Gi |
| resourceLimitCpu | 2000m |

### Additional Variable Groups

**Required in Azure DevOps:**

1. **flamoral-cd-vars**
   - ACR_USERNAME: ACR service principal username
   - ACR_PASSWORD: ACR service principal password

2. **datingplatform-terraform-common**
   - ARM_CLIENT_ID: Azure service principal ID
   - ARM_CLIENT_SECRET: Azure service principal secret
   - ARM_SUBSCRIPTION_ID: Azure subscription ID
   - ARM_TENANT_ID: Azure tenant ID
   - TF_STATE_RESOURCE_GROUP: Terraform state resource group
   - TF_STATE_STORAGE_ACCOUNT: Terraform state storage account
   - TF_STATE_CONTAINER: Terraform state container

3. **flamoral-security-vars**
   - SNYK_TOKEN: Snyk API token (optional)

---

## Service Connections

### Azure Service Connections

| Name | Type | Purpose |
|------|------|---------|
| azure-terraform-sp-connection | Azure Resource Manager | Terraform deployments, AKS access |
| aks-flamoral-connection | Kubernetes | Direct AKS deployments |

### Container Registry Connections

| Name | Type | Purpose |
|------|------|---------|
| acr-datingapp-connection | Docker Registry | ACR authentication |

**Connection Details:**
- ACR: flamoralacr8eq5eg.azurecr.io
- Authentication: Service Principal
- Scope: Full ACR access

---

## Environments

Environments are configured in Azure DevOps with approval gates and permissions.

### flamoral-dev

**Purpose:** Development testing
**Domain:** dev.flamoral.app
**Approval:** None (auto-deploy)
**Resources:**
- Namespace: flamoral-dev
- Replicas: 1
- Autoscaling: Disabled

### flamoral-test

**Purpose:** QA and integration testing
**Domain:** test.flamoral.app
**Approval:** Required
**Approvers:** qa-team@flamoral.com, devops@flamoral.com
**Timeout:** 4 hours
**Resources:**
- Namespace: flamoral-test
- Replicas: 2
- Autoscaling: 2-5 replicas

### flamoral-production

**Purpose:** Production workloads
**Domain:** flamoral.app
**Approval:** Required (Multiple gates)
**Approvers:** release-managers@flamoral.com, cto@flamoral.com
**Timeout:** 24 hours
**Resources:**
- Namespace: flamoral-prod
- Replicas: 5
- Autoscaling: 5-50 replicas
- Resource limits enforced

### datingplatform-dev

**Purpose:** Infrastructure - Development
**Approval:** None

### datingplatform-test

**Purpose:** Infrastructure - Test
**Approval:** Optional

### datingplatform-prod

**Purpose:** Infrastructure - Production
**Approval:** Required

---

## Approval Gates

### Test Environment Approval

**Trigger:** After Dev deployment
**Type:** Manual Validation
**Notifies:** qa-team@flamoral.com, devops@flamoral.com
**Timeout:** 4 hours
**On Timeout:** Reject

**Instructions:**
```
TEST ENVIRONMENT DEPLOYMENT APPROVAL
=====================================
Build Number: {build}
Image Tag: {tag}

Dev environment deployment completed successfully.
Please approve to proceed with Test environment deployment.
```

### Production Deployment Approval

**Trigger:** After Test deployment
**Type:** Manual Validation
**Notifies:** release-managers@flamoral.com, cto@flamoral.com, devops@flamoral.com
**Timeout:** 24 hours
**On Timeout:** Reject

**Pre-deployment Checklist:**
- [ ] All tests passed in Test environment
- [ ] Performance metrics are acceptable
- [ ] Database migrations reviewed (if any)
- [ ] Rollback plan is ready
- [ ] Monitoring dashboards are accessible

### Production Traffic Switch Approval

**Trigger:** After new slot validation
**Type:** Manual Validation
**Notifies:** release-managers@flamoral.com
**Timeout:** 60 minutes
**On Timeout:** Reject

**Instructions:**
```
Production deployment is ready.
Please approve to switch traffic to the new deployment.

New slot has been validated and is healthy.
```

### Infrastructure Production Approval

**Trigger:** Before Terraform apply to production
**Type:** Manual Validation
**Timeout:** 24 hours
**On Timeout:** Reject

**Warning:**
```
PRODUCTION INFRASTRUCTURE CHANGE
=================================
Environment: Production
Build: {build}
Branch: {branch}

Please review the Terraform plan artifact and approve
this production infrastructure change.

WARNING: This will modify production infrastructure!
```

---

## Deployment Flow

### Complete Deployment Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     1. CODE COMMIT                                   │
│                                                                       │
│  Developer pushes to: main / develop / feature / hotfix / release   │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  2. CI PIPELINE TRIGGERED                            │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ Stage 1: Code Quality & Security (Parallel)                 │    │
│  │  ├─ ESLint + TypeScript                                     │    │
│  │  ├─ NPM Audit + Trivy                                       │    │
│  │  └─ Secrets Detection                                       │    │
│  └────────────────────────────────────────────────────────────┘    │
│                          │                                           │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ Stage 2: Build Backend Services (Parallel Matrix)           │    │
│  │  ├─ 11 Node.js Microservices                               │    │
│  │  ├─ Python AI Services                                      │    │
│  │  └─ Go Realtime Service                                     │    │
│  └────────────────────────────────────────────────────────────┘    │
│                          │                                           │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ Stage 3: Build Frontend (Parallel)                          │    │
│  │  ├─ Web Application (Next.js)                               │    │
│  │  └─ Mobile Application (React Native)                       │    │
│  └────────────────────────────────────────────────────────────┘    │
│                          │                                           │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ Stage 4: Docker Build & Push (Parallel Matrix)              │    │
│  │                                                              │    │
│  │  For each of 12 services:                                   │    │
│  │   1. Build Docker image                                     │    │
│  │   2. Scan with Trivy (HIGH/CRITICAL)                        │    │
│  │   3. Push to ACR: flamoralacr8eq5eg.azurecr.io             │    │
│  │      Tags: $(Build.BuildId), latest                         │    │
│  └────────────────────────────────────────────────────────────┘    │
│                          │                                           │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ Stage 5: Integration Tests                                  │    │
│  │  ├─ Start test infrastructure (Docker Compose)              │    │
│  │  ├─ Run integration test suite                              │    │
│  │  └─ Cleanup                                                  │    │
│  └────────────────────────────────────────────────────────────┘    │
│                          │                                           │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ Stage 6: Publish Artifacts (main branch only)               │    │
│  │  ├─ Kubernetes manifests                                    │    │
│  │  ├─ Helm charts                                             │    │
│  │  └─ Build metadata                                          │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│              3. SECURITY PIPELINE (Parallel)                         │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ Dependencies: NPM Audit, Snyk, Trivy FS                     │    │
│  ├────────────────────────────────────────────────────────────┤    │
│  │ Secrets: detect-secrets, GitLeaks, TruffleHog               │    │
│  ├────────────────────────────────────────────────────────────┤    │
│  │ Containers: Trivy image scans                               │    │
│  ├────────────────────────────────────────────────────────────┤    │
│  │ Infrastructure: tfsec, Checkov, Kubesec, kube-score         │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Generates consolidated security report                             │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│               4. CD PIPELINE TRIGGERED (main branch)                 │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ Stage 1: DEVELOPMENT                                        │    │
│  │  Domain: dev.flamoral.app                                   │    │
│  │  ┌──────────────────────────────────────────────────────┐  │    │
│  │  │ 1. Helm Deploy Template                               │  │    │
│  │  │    ├─ Database migrations                             │  │    │
│  │  │    ├─ Create namespace: flamoral-dev                  │  │    │
│  │  │    ├─ Create ACR pull secret                          │  │    │
│  │  │    ├─ Helm upgrade --install                          │  │    │
│  │  │    │   Chart: infrastructure/helm/flamoral            │  │    │
│  │  │    │   Image: {service}:$(Build.BuildId)              │  │    │
│  │  │    │   Replicas: 1                                    │  │    │
│  │  │    └─ Wait for deployments ready                      │  │    │
│  │  │                                                        │  │    │
│  │  │ 2. Health Checks                                      │  │    │
│  │  │    └─ Validate endpoints                              │  │    │
│  │  └──────────────────────────────────────────────────────┘  │    │
│  │                                                              │    │
│  │  ✓ Auto-deploy (no approval)                                │    │
│  └────────────────────────────────────────────────────────────┘    │
│                          │                                           │
│                          ▼                                           │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ APPROVAL GATE: Test Environment                             │    │
│  │  Notifies: qa-team@flamoral.com, devops@flamoral.com       │    │
│  │  Timeout: 4 hours                                           │    │
│  └────────────────────────────────────────────────────────────┘    │
│                          │                                           │
│                          ▼                                           │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ Stage 2: TEST                                               │    │
│  │  Domain: test.flamoral.app                                  │    │
│  │  ┌──────────────────────────────────────────────────────┐  │    │
│  │  │ 1. Helm Deploy Template                               │  │    │
│  │  │    ├─ Database migrations                             │  │    │
│  │  │    ├─ Create namespace: flamoral-test                 │  │    │
│  │  │    ├─ Helm upgrade --install                          │  │    │
│  │  │    │   Replicas: 2                                    │  │    │
│  │  │    │   Autoscaling: 2-5                               │  │    │
│  │  │    └─ Health checks                                   │  │    │
│  │  │                                                        │  │    │
│  │  │ 2. Integration Tests                                  │  │    │
│  │  │    └─ E2E test suite                                  │  │    │
│  │  │                                                        │  │    │
│  │  │ 3. Performance Tests                                  │  │    │
│  │  │    └─ k6 load testing                                 │  │    │
│  │  └──────────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────────┘    │
│                          │                                           │
│                          ▼                                           │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ APPROVAL GATE: Production Deployment                        │    │
│  │  Notifies: release-managers@flamoral.com, cto@flamoral.com │    │
│  │  Includes: Pre-deployment checklist                         │    │
│  │  Timeout: 24 hours                                          │    │
│  └────────────────────────────────────────────────────────────┘    │
│                          │                                           │
│                          ▼                                           │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ Stage 3: PRODUCTION (Blue-Green Deployment)                 │    │
│  │  Domain: flamoral.app                                       │    │
│  │  ┌──────────────────────────────────────────────────────┐  │    │
│  │  │ Pre-Deploy                                            │  │    │
│  │  │  └─ Log deployment start                             │  │    │
│  │  │                                                        │  │    │
│  │  │ Deploy                                                 │  │    │
│  │  │  1. Get AKS credentials                               │  │    │
│  │  │  2. Determine deployment slot                         │  │    │
│  │  │     Current: kubectl get service selector.slot        │  │    │
│  │  │     New: blue ↔ green                                 │  │    │
│  │  │  3. Create namespace: flamoral-prod                   │  │    │
│  │  │  4. Create ACR pull secret                            │  │    │
│  │  │  5. Helm deploy to NEW slot                           │  │    │
│  │  │     Release: flamoral-$(newSlot)                      │  │    │
│  │  │     Replicas: 5, Autoscaling: 5-50                    │  │    │
│  │  │     Resources: 1Gi/1CPU request, 2Gi/2CPU limit       │  │    │
│  │  │  6. Wait for deployment ready (10min timeout)         │  │    │
│  │  │                                                        │  │    │
│  │  │ Post-Deploy                                            │  │    │
│  │  │  └─ Verify deployment status                          │  │    │
│  │  └──────────────────────────────────────────────────────┘  │    │
│  │                                                              │    │
│  │  ┌──────────────────────────────────────────────────────┐  │    │
│  │  │ Production Validation                                 │  │    │
│  │  │  ├─ Wait 60s for stabilization                        │  │    │
│  │  │  ├─ Health check: https://api.flamoral.app/health     │  │    │
│  │  │  └─ Verify 200 response                               │  │    │
│  │  └──────────────────────────────────────────────────────┘  │    │
│  │                                                              │    │
│  │  ┌──────────────────────────────────────────────────────┐  │    │
│  │  │ APPROVAL GATE: Traffic Switch                         │  │    │
│  │  │  Notifies: release-managers@flamoral.com             │  │    │
│  │  │  Timeout: 60 minutes                                  │  │    │
│  │  └──────────────────────────────────────────────────────┘  │    │
│  │                                                              │    │
│  │  ┌──────────────────────────────────────────────────────┐  │    │
│  │  │ Switch Production Traffic                             │  │    │
│  │  │  kubectl patch service flamoral-api-gateway           │  │    │
│  │  │    -p '{"spec":{"selector":{"slot":"NEW"}}}'          │  │    │
│  │  │                                                        │  │    │
│  │  │  Traffic now routes to NEW slot                       │  │    │
│  │  │  OLD slot kept for rollback                           │  │    │
│  │  └──────────────────────────────────────────────────────┘  │    │
│  │                                                              │    │
│  │  ┌──────────────────────────────────────────────────────┐  │    │
│  │  │ Rollback on Failure (Conditional)                     │  │    │
│  │  │  Triggers if: Deploy OR Validation fails              │  │    │
│  │  │  ├─ Restore previous slot                             │  │    │
│  │  │  ├─ Switch traffic back                               │  │    │
│  │  │  └─ Alert operations team                             │  │    │
│  │  └──────────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────────┘    │
│                          │                                           │
│                          ▼                                           │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ Stage 4: POST-DEPLOYMENT MONITORING                         │    │
│  │  ┌──────────────────────────────────────────────────────┐  │    │
│  │  │ Monitor for 10 minutes                                │  │    │
│  │  │  Every 1 minute:                                      │  │    │
│  │  │    └─ Health check: https://api.flamoral.app/health  │  │    │
│  │  │                                                        │  │    │
│  │  │ Send Success Notification                             │  │    │
│  │  │  └─ Slack/Teams/Email integration                     │  │    │
│  │  └──────────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘

DEPLOYMENT COMPLETE ✓
```

### Infrastructure Deployment Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                 INFRASTRUCTURE DEPLOYMENT FLOW                       │
│                                                                       │
│  1. Code commit to infrastructure/terraform/**                       │
│                          │                                            │
│                          ▼                                            │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ Stage 1: Terraform Validation                               │    │
│  │  ├─ terraform fmt -check                                    │    │
│  │  ├─ terraform validate                                      │    │
│  │  ├─ tflint                                                  │    │
│  │  └─ checkov (security scan)                                 │    │
│  └────────────────────────────────────────────────────────────┘    │
│                          │                                            │
│                          ▼                                            │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ Stage 2: Terraform Plan                                     │    │
│  │  ├─ terraform init (Azure backend)                          │    │
│  │  ├─ terraform plan -out=tfplan                              │    │
│  │  ├─ Generate JSON and text outputs                          │    │
│  │  └─ Publish plan artifacts                                  │    │
│  └────────────────────────────────────────────────────────────┘    │
│                          │                                            │
│                          ├─────────────┬──────────────┐              │
│                          │             │              │              │
│                          ▼             ▼              ▼              │
│  ┌───────────────┐  ┌──────────┐  ┌────────────────────────┐       │
│  │ Stage 3: DEV  │  │Stage 4:  │  │ Stage 5: PRODUCTION    │       │
│  │               │  │  TEST    │  │                        │       │
│  │ Auto-apply    │  │          │  │ ┌──────────────────┐  │       │
│  │ tfplan-dev    │  │Auto-apply│  │ │ Manual Approval  │  │       │
│  │               │  │tfplan-test│ │ │ 24-hour timeout  │  │       │
│  │ Capture       │  │          │  │ └─────────┬────────┘  │       │
│  │ outputs       │  │Capture   │  │           │           │       │
│  │               │  │outputs   │  │           ▼           │       │
│  └───────────────┘  └──────────┘  │ Apply tfplan-prod     │       │
│                                    │ Capture outputs       │       │
│                                    └────────────────────────┘      │
│                          │                                            │
│                          ▼                                            │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ Stage 7: Infrastructure Verification                        │    │
│  │  ├─ Verify resource group exists                            │    │
│  │  ├─ Verify AKS cluster status                               │    │
│  │  └─ Generate deployment summary                             │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## How Docker Images are Built and Pushed to ACR

### Process Flow

1. **Trigger:** CI pipeline Stage 4 (after successful builds)

2. **Template:** `pipelines/templates/docker-build-push.yml`

3. **For Each Service (Parallel Matrix):**

   **Step 1: Login to ACR**
   ```yaml
   task: Docker@2
     command: login
     containerRegistry: acr-datingapp-connection
   ```

   **Step 2: Build Docker Image**
   ```yaml
   task: Docker@2
     command: build
     repository: flamoral/{serviceName}
     dockerfile: backend/services/{service}/Dockerfile
     buildContext: backend/services/{service}
     tags:
       - $(Build.BuildId)
       - latest
     arguments:
       - --build-arg NODE_ENV=production
       - --build-arg BUILD_DATE=$(Build.BuildNumber)
       - --build-arg VCS_REF=$(Build.SourceVersion)
       - --label org.opencontainers.image.source=$(Build.Repository.Uri)
       - --label org.opencontainers.image.revision=$(Build.SourceVersion)
   ```

   **Step 3: Security Scan**
   ```bash
   trivy image --severity HIGH,CRITICAL \
     flamoral/{serviceName}:$(Build.BuildId)
   ```

   **Step 4: Push to ACR**
   ```yaml
   task: Docker@2
     command: push
     repository: flamoral/{serviceName}
     containerRegistry: acr-datingapp-connection
     tags:
       - $(Build.BuildId)
       - latest
   ```

### Example Output

```
Service: auth-service
Registry: flamoralacr8eq5eg.azurecr.io
Repository: flamoral/auth-service
Tags:
  - 12345 (Build ID)
  - latest

Full Image Path:
  flamoralacr8eq5eg.azurecr.io/flamoral/auth-service:12345
  flamoralacr8eq5eg.azurecr.io/flamoral/auth-service:latest
```

### Services Built

All 12 microservices are built in parallel:
- api-gateway
- auth-service
- user-service
- matching-service
- messaging-service
- media-service
- payment-service
- notification-service
- analytics-service
- moderation-service
- advertising-service
- realtime-service

---

## How Kubernetes Deployments are Updated

### Process Flow

1. **Trigger:** CD pipeline after successful CI build

2. **Template:** `pipelines/templates/helm-deploy.yml`

3. **Per Environment Deployment:**

   **Step 1: Pre-Deployment - Database Migrations**
   ```yaml
   template: database-migration.yml
     parameters:
       environment: {env}
       namespace: flamoral-{env}
       imageTag: $(Build.BuildId)
   ```

   **Step 2: Install Tools**
   - Helm 3.12.0
   - kubectl (latest)

   **Step 3: Get AKS Credentials**
   ```bash
   az aks get-credentials \
     --resource-group {resourceGroup} \
     --name {aksClusterName} \
     --overwrite-existing
   ```

   **Step 4: Prepare Namespace**
   ```bash
   kubectl create namespace flamoral-{env} --dry-run=client -o yaml | kubectl apply -f -
   ```

   **Step 5: Create ACR Pull Secret**
   ```bash
   kubectl create secret docker-registry acr-secret \
     --docker-server=flamoralacr8eq5eg.azurecr.io \
     --docker-username=$(ACR_USERNAME) \
     --docker-password=$(ACR_PASSWORD) \
     --namespace=flamoral-{env}
   ```

   **Step 6: Helm Upgrade/Install**
   ```bash
   helm upgrade {releaseName} infrastructure/helm/flamoral \
     --install \
     --create-namespace \
     --namespace flamoral-{env} \
     --wait \
     --timeout 10m \
     --set global.environment={env} \
     --set global.imageTag=$(Build.BuildId) \
     --set global.imageRegistry=flamoralacr8eq5eg.azurecr.io \
     --set global.imagePullSecrets[0].name=acr-secret \
     --set replicaCount={count} \
     --set autoscaling.enabled={true/false}
   ```

   **Step 7: Wait for Readiness**
   ```bash
   kubectl wait --for=condition=available --timeout=300s \
     deployment --all -n flamoral-{env}
   ```

   **Step 8: Verify Deployment**
   ```bash
   kubectl get all -n flamoral-{env}
   kubectl get ingress -n flamoral-{env}
   kubectl get pods -n flamoral-{env} -o wide
   ```

   **Step 9: Post-Deployment - Health Checks**
   ```yaml
   template: health-check.yml
     parameters:
       apiHost: api.{env}.flamoral.app
       maxRetries: 10
       retryDelay: 30
   ```

### Deployment Updates

**Each service deployment includes:**
- Image: `flamoralacr8eq5eg.azurecr.io/flamoral/{service}:$(Build.BuildId)`
- Environment variables from ConfigMaps/Secrets
- Resource requests and limits
- Liveness and readiness probes
- Service discovery labels
- Ingress routing rules

**Helm automatically:**
- Creates new ReplicaSets
- Performs rolling updates
- Maintains desired replica count
- Manages ConfigMaps and Secrets
- Configures Services and Ingress

---

## How Terraform Infrastructure is Applied

### Process Flow

1. **Trigger:** Changes to `infrastructure/terraform/**`

2. **Pipeline:** `infrastructure-pipeline.yml` or `azure-pipelines-infra.yml`

3. **Template-Based Approach:**

   **Step 1: Terraform Init** (`terraform-init.yml`)
   ```bash
   # Cache Terraform plugins

   # Set Azure credentials from service principal
   export ARM_CLIENT_ID=$servicePrincipalId
   export ARM_CLIENT_SECRET=$servicePrincipalKey
   export ARM_TENANT_ID=$tenantId
   export ARM_SUBSCRIPTION_ID=$(az account show --query id -o tsv)

   # Initialize with Azure backend
   terraform init \
     -backend-config="resource_group_name=flamoral-terraform-state-rg" \
     -backend-config="storage_account_name=flamoraltfstate" \
     -backend-config="container_name=tfstate" \
     -backend-config="key={environment}.terraform.tfstate" \
     -reconfigure \
     -upgrade
   ```

   **Step 2: Terraform Plan** (`terraform-plan.yml`)
   ```bash
   # Create execution plan
   terraform plan \
     -out=tfplan \
     -input=false \
     -detailed-exitcode

   # Exit codes:
   # 0 = No changes
   # 2 = Changes detected
   # 1 = Error

   # Generate outputs
   terraform show tfplan > tfplan.txt
   terraform show -json tfplan > tfplan.json

   # Publish artifacts
   # - tfplan (binary)
   # - tfplan.json
   # - tfplan.txt
   ```

   **Step 3: Terraform Apply** (`terraform-apply.yml`)
   ```bash
   # Download plan artifact

   # Verify plan exists

   # Apply with retry logic (2 attempts)
   terraform apply -input=false -auto-approve tfplan

   # Capture outputs
   terraform output -json > terraform-outputs.json
   terraform output  # Display in logs

   # List resources
   terraform state list > state-resources.txt

   # Set pipeline variables from outputs
   for key in $(terraform output -json | jq -r 'keys[]'); do
     value=$(terraform output -raw $key)
     echo "##vso[task.setvariable variable=TF_OUTPUT_$key]$value"
   done

   # Publish artifacts
   # - terraform-outputs.json
   # - state-resources.txt
   ```

### Environment-Specific Deployment

**Development:**
- Auto-apply after plan
- No manual approval
- Working directory: `terraform/environments/dev`
- State key: `dev.terraform.tfstate`

**Test:**
- Auto-apply after plan
- Optional approval
- Working directory: `terraform/environments/test`
- State key: `test.terraform.tfstate`

**Production:**
- Manual approval required (24-hour timeout)
- Multiple approvers
- Working directory: `terraform/environments/prod`
- State key: `prod.terraform.tfstate`

### State Management

**Backend Configuration:**
```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "flamoral-terraform-state-rg"
    storage_account_name = "flamoraltfstate"
    container_name       = "tfstate"
    key                  = "{environment}.terraform.tfstate"
  }
}
```

**State Locking:**
- Automatic with Azure Storage
- Prevents concurrent modifications
- Lease-based locking mechanism

---

## Security Scanning Integration

### Security Pipeline Integration Points

1. **CI Pipeline Integration**
   - Runs in parallel with builds
   - Stage 1 of CI: Code Quality & Security
   - NPM Audit, Trivy FS, Secrets Detection

2. **Dedicated Security Pipeline**
   - Comprehensive weekly scans
   - Manual trigger available
   - Runs on code commits to main/develop

3. **Container Scanning**
   - Integrated into Docker build process
   - Trivy scan before push to ACR
   - Dedicated container scanning stage

### Security Tools and Their Integration

#### 1. Dependency Scanning

**NPM Audit**
```yaml
Integration: CI Pipeline Stage 1
Frequency: Every commit
Command: npm audit --audit-level=moderate
Output: npm-audit.json
Action: Continue on vulnerabilities (logged)
```

**Snyk** (Optional)
```yaml
Integration: Security Pipeline
Frequency: Weekly + manual
Command: snyk test --severity-threshold=high
Output: snyk-results.json
Features:
  - Continuous monitoring
  - Fix suggestions
  - License compliance
```

**Trivy Filesystem**
```yaml
Integration: CI + Security Pipelines
Frequency: Every commit + weekly
Command: trivy fs --severity HIGH,CRITICAL .
Output: trivy-fs-results.json
Scope: All dependencies, OS packages
```

#### 2. Secret Detection

**detect-secrets**
```yaml
Integration: CI + Security Pipelines
Frequency: Every commit
Command: detect-secrets scan --all-files
Output: .secrets.baseline
Excludes: node_modules, .git, dist, build
```

**GitLeaks**
```yaml
Integration: Security Pipeline
Frequency: Weekly + manual
Command: gitleaks detect --source .
Output: gitleaks-results.json
Scope: Full git history
```

**TruffleHog**
```yaml
Integration: Security Pipeline
Frequency: Weekly
Command: trufflehog3 --no-history .
Output: trufflehog-results.txt
```

#### 3. Container Scanning

**Trivy Image Scanning**
```yaml
Integration: CI Docker Build + Security Pipeline
Frequency: Every image build + weekly
Command: trivy image --severity HIGH,CRITICAL {image}
Services Scanned:
  - All 12 microservices
  - Latest and tagged versions
Output: container-scan-results/{service}-scan.json
```

#### 4. Infrastructure Security

**tfsec**
```yaml
Integration: Infrastructure Pipeline
Frequency: Infrastructure changes
Command: tfsec infrastructure/terraform
Output: tfsec-results.json
Checks: 300+ Terraform security checks
```

**Checkov**
```yaml
Integration: Infrastructure Pipeline + Security Pipeline
Frequency: Infrastructure changes + weekly
Command: checkov -d infrastructure/terraform
Output: checkov-results.json
Features:
  - 1000+ policies
  - Multi-cloud support
  - Compliance frameworks
```

**Kubesec**
```yaml
Integration: Security Pipeline
Frequency: Weekly
Command: kubesec scan {manifest}.yaml
Output: k8s-security-results/kubesec-results.json
Scope: All Kubernetes manifests
```

**kube-score**
```yaml
Integration: Security Pipeline
Frequency: Weekly
Command: kube-score score {manifest}.yaml
Scope: Best practices analysis
```

### Security Report Generation

**Consolidated Report:**
```yaml
Stage: Security Report
Frequency: After all scans
Inputs:
  - npm-audit.json
  - snyk-results.json
  - trivy-fs-results.json
  - .secrets.baseline
  - gitleaks-results.json
  - container-scan-results/*
  - tfsec-results.json
  - checkov-results.json
  - k8s-security-results/*

Output: security-report.md
Includes:
  - Build information
  - Scan status matrix
  - Vulnerability summary
  - Remediation guidance
  - Next steps
```

### Security Gates and Actions

**Critical Findings:**
- Logged in pipeline output
- Artifacts published for review
- Does NOT block deployment (by design)
- Manual review required for production

**Continuous Improvement:**
- Weekly automated scans
- Trend analysis capability
- Integration with Azure DevOps work items (planned)

---

## Best Practices and Recommendations

### Pipeline Management

1. **Use Self-Hosted Agents:**
   - Already configured: Pool 'Default'
   - Benefits: Custom tools, caching, persistence

2. **Leverage Caching:**
   - npm dependencies cached
   - Terraform plugins cached
   - Docker layer caching via ACR

3. **Parallel Execution:**
   - Service builds run in parallel
   - Security scans run in parallel
   - Reduces total pipeline time

4. **Artifact Management:**
   - Publish all build artifacts
   - Keep security scan results
   - Retain Terraform plans

### Deployment Best Practices

1. **Use Helm for Deployments:**
   - Version-controlled configurations
   - Reusable templates
   - Easy rollbacks

2. **Database Migrations:**
   - Run before deployments
   - Test in lower environments first
   - Include rollback scripts

3. **Health Checks:**
   - Always validate after deployment
   - Multiple retry attempts
   - Comprehensive endpoint testing

4. **Blue-Green Deployments:**
   - Zero-downtime updates
   - Easy rollback capability
   - Production-validated approach

### Security Best Practices

1. **Multiple Scanning Tools:**
   - Defense in depth
   - Different tools catch different issues
   - Comprehensive coverage

2. **Scan at Multiple Stages:**
   - Code commit (CI)
   - Image build
   - Weekly comprehensive scan

3. **Secret Management:**
   - Use Azure Key Vault
   - Never commit secrets
   - Rotate credentials regularly

4. **Container Security:**
   - Scan images before push
   - Use minimal base images
   - Keep images updated

### Monitoring and Alerting

1. **Pipeline Notifications:**
   - Configure email notifications
   - Integrate with Slack/Teams
   - Alert on failures

2. **Deployment Monitoring:**
   - Post-deployment health checks
   - Monitor for 10 minutes
   - Alert on anomalies

3. **Security Alerts:**
   - Review weekly scan reports
   - Prioritize HIGH/CRITICAL
   - Track remediation progress

---

## Troubleshooting Guide

### Common Issues and Solutions

#### CI Pipeline Failures

**Issue: NPM Install Failures**
```
Solution:
1. Check package-lock.json is committed
2. Verify npm cache is working
3. Try: npm ci --ignore-scripts
```

**Issue: Docker Build Failures**
```
Solution:
1. Check Dockerfile syntax
2. Verify build context path
3. Review Docker build logs
4. Check ACR authentication
```

**Issue: Test Failures**
```
Solution:
1. Review test logs in artifacts
2. Check test environment setup
3. Verify database connections
4. Review integration test configuration
```

#### CD Pipeline Failures

**Issue: Helm Deployment Failures**
```
Solution:
1. Check Helm chart syntax: helm lint
2. Verify values.yaml configuration
3. Check image pull secrets
4. Review AKS cluster status
5. Verify namespace exists
```

**Issue: Health Check Failures**
```
Solution:
1. Check pod logs: kubectl logs {pod}
2. Verify ingress configuration
3. Check service endpoints
4. Review DNS resolution
5. Validate certificates (for HTTPS)
```

**Issue: Blue-Green Traffic Switch Fails**
```
Solution:
1. Verify service selector is correct
2. Check pod labels match
3. Ensure new slot is fully ready
4. Review service manifest
```

#### Infrastructure Pipeline Failures

**Issue: Terraform Init Failures**
```
Solution:
1. Verify Azure credentials
2. Check state storage access
3. Verify backend configuration
4. Review provider version constraints
```

**Issue: Terraform Plan Failures**
```
Solution:
1. Check syntax: terraform validate
2. Review variable values
3. Verify resource dependencies
4. Check Azure quotas
```

**Issue: Terraform Apply Failures**
```
Solution:
1. Review plan output
2. Check resource conflicts
3. Verify Azure permissions
4. Review provider API limits
```

#### Security Pipeline Issues

**Issue: False Positives**
```
Solution:
1. Review scan configuration
2. Update tool versions
3. Configure suppressions
4. Whitelist known issues
```

**Issue: Scan Timeouts**
```
Solution:
1. Increase timeout values
2. Optimize scan scope
3. Use incremental scans
4. Parallelize where possible
```

---

## Maintenance and Updates

### Regular Maintenance Tasks

**Weekly:**
- Review security scan reports
- Check pipeline success rates
- Monitor deployment times
- Review resource usage

**Monthly:**
- Update tool versions
- Review and update secrets
- Audit user permissions
- Optimize pipeline performance

**Quarterly:**
- Review and update documentation
- Conduct pipeline performance analysis
- Update deployment strategies
- Review security policies

### Version Updates

**Updating Tool Versions:**

1. **Node.js:**
   ```yaml
   File: pipelines/templates/variables-common.yml
   Variable: nodeVersion
   Current: '20.x'
   Update: Change version, test in dev first
   ```

2. **Terraform:**
   ```yaml
   File: pipelines/templates/variables-common.yml
   Variable: terraformVersion
   Current: '1.6.0'
   Update: Review changelog, test in dev
   ```

3. **Helm:**
   ```yaml
   File: pipelines/templates/variables-common.yml
   Variable: helmVersion
   Current: '3.12.0'
   Update: Review compatibility with charts
   ```

---

## Summary

The Flamoral Dating Platform's CI/CD pipelines provide a comprehensive, automated approach to software delivery:

### Key Achievements

- **Automated CI:** Build, test, and containerize 12+ microservices
- **Multi-Environment CD:** Automated deployment through Dev → Test → Prod
- **Security Integration:** Comprehensive scanning at multiple stages
- **Infrastructure as Code:** Terraform-managed Azure resources
- **Zero-Downtime Deployments:** Blue-Green and Canary strategies
- **Approval Gates:** Manual validation for critical environments
- **Automated Rollback:** Failure detection and recovery
- **Monitoring:** Post-deployment health validation

### Pipeline Statistics

- **Total Pipelines:** 6 main pipelines
- **Templates:** 16+ reusable templates
- **Environments:** 3 (Dev, Test, Production)
- **Services Built:** 12 microservices
- **Security Scans:** 9+ different tools
- **Deployment Strategies:** 2 (Blue-Green, Canary)
- **Approval Gates:** 4 manual validation points

### Next Steps

1. Configure notifications (Slack/Teams/Email)
2. Set up monitoring dashboards
3. Create runbooks for common scenarios
4. Train team on pipeline usage
5. Establish on-call rotation for production deployments

---

## Additional Resources

- **Azure DevOps Project:** https://dev.azure.com/citadelcloudmanagement/DatingPlatform
- **Pipeline Documentation:** `pipelines/README.md`
- **Terraform Documentation:** `infrastructure/terraform/README.md`
- **Helm Charts:** `infrastructure/helm/README.md`
- **Security Policy:** `SECURITY.md`

---

**Document Version:** 1.0
**Last Updated:** 2025-12-08
**Maintained By:** DevOps Team
**Contact:** devops@flamoral.com
