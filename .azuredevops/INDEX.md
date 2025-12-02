# Azure DevOps Pipeline Architecture - Index

Complete index of all Azure DevOps pipeline files and documentation for the Flamoral Dating Platform.

## Quick Navigation

- [Pipeline Architecture Overview](#pipeline-architecture-overview)
- [Setup & Configuration](#setup--configuration)
- [Pipeline Files](#pipeline-files)
- [Templates](#templates)
- [Documentation](#documentation)
- [Scripts](#scripts)

## Pipeline Architecture Overview

**Main Documentation**: [`PIPELINE_ARCHITECTURE.md`](./PIPELINE_ARCHITECTURE.md)

The Flamoral Dating Platform uses a comprehensive CI/CD pipeline architecture with:
- Continuous Integration (CI)
- Continuous Deployment (CD) with multi-stage environments
- Infrastructure as Code (Terraform)
- Kubernetes and Helm management

### Azure DevOps Details

| Item | Value |
|------|-------|
| Organization | citadelcloudmanagement |
| Project | DatingPlatform |
| Repos URL | https://dev.azure.com/citadelcloudmanagement/_git/DatingPlatform |
| Pipelines URL | https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_build |
| Boards URL | https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_workitems |
| Subscription ID | d8afbfb0-0c60-4d11-a1c7-a614235f5eb6 |
| Service Principal | terraform-datingapp-sp |
| SP Client ID | a85e4029-4e37-4399-9390-6e18922b38e7 |

## Setup & Configuration

### Prerequisites

- Azure CLI 2.50+
- kubectl 1.28+
- Helm 3.12+
- Terraform 1.6+
- Docker 24+
- Azure DevOps CLI extension

### Quick Setup

```bash
# Run the automated setup script
chmod +x .azuredevops/setup-pipelines.sh
./.azuredevops/setup-pipelines.sh
```

### Manual Setup

1. **Service Connections**: [`service-connections/README.md`](./service-connections/README.md)
   - Azure Resource Manager connection
   - Azure Container Registry connection
   - Kubernetes service connection
   - Terraform service connection

2. **Variable Groups**: [`variable-groups/README.md`](./variable-groups/README.md)
   - Shared variables
   - Environment-specific variables
   - Terraform variables
   - Infrastructure variables

3. **Environments**: Create deployment environments
   - flamoral-dev
   - flamoral-test
   - flamoral-staging
   - flamoral-production
   - terraform-{env}
   - flamoral-infrastructure

## Pipeline Files

### Core Pipelines

#### 1. CI Pipeline
**File**: [`pipelines/azure-pipelines-ci.yml`](./pipelines/azure-pipelines-ci.yml)

**Purpose**: Continuous Integration - Build, test, and create Docker images

**Stages**:
1. Code Quality & Security
   - ESLint, Prettier
   - npm audit
   - Snyk security scan
   - TFSec (Terraform)

2. Build Backend Services
   - Node.js microservices (API Gateway, Auth, User, Matching, Messaging, Media, Payment, Notification, Analytics)
   - Python AI services
   - Unit tests with coverage

3. Build Frontend Applications
   - Web application
   - Mobile application

4. Build & Push Docker Images
   - Build images for all services
   - Tag with build ID and latest
   - Push to Azure Container Registry (flamoralacr.azurecr.io)

5. Integration Tests
   - Backend integration tests
   - E2E tests with Playwright

6. Publish Artifacts
   - Kubernetes manifests
   - Helm charts
   - Terraform configs
   - Build info

**Triggers**:
- Branches: main, develop, feature/*, hotfix/*
- Pull requests to main and develop
- Paths: backend/**, apps/**, packages/**, infrastructure/**

#### 2. CD Pipeline
**File**: [`pipelines/azure-pipelines-cd.yml`](./pipelines/azure-pipelines-cd.yml)

**Purpose**: Continuous Deployment to multiple environments

**Stages**:
1. Deploy to Dev (Auto)
   - Helm deployment
   - Smoke tests

2. Deploy to Test (Auto)
   - Helm deployment
   - Integration tests
   - E2E tests

3. Deploy to Staging (Auto with manual traffic switch)
   - Blue-green deployment
   - Validation tests
   - Manual approval for traffic switch

4. Deploy to Production (Manual approval)
   - Manual approval gate
   - Blue-green deployment
   - Production validation
   - Manual traffic switch approval

**Triggers**: Triggered by CI pipeline completion

**Deployment Strategy**: Blue-green with gradual traffic shift

#### 3. Terraform Pipeline
**File**: [`pipelines/azure-pipelines-terraform.yml`](./pipelines/azure-pipelines-terraform.yml)

**Purpose**: Infrastructure provisioning with Terraform

**Stages**:
1. Validate & Plan
   - Terraform init
   - Terraform validate
   - Terraform fmt check
   - TFLint
   - TFSec security scan
   - Terraform plan

2. Apply to Dev (Auto)
3. Apply to Test (Auto)
4. Apply to Staging (Auto)
5. Apply to Production (Manual approval)

6. Drift Detection (Scheduled)
   - Detect configuration drift
   - Report differences

**Triggers**:
- Branches: main
- Paths: infrastructure/terraform/**

**State Management**: Azure Storage (flamoraltfstate)

#### 4. Infrastructure Pipeline
**File**: [`pipelines/azure-pipelines-infra.yml`](./pipelines/azure-pipelines-infra.yml)

**Purpose**: Kubernetes and Helm deployments

**Stages**:
1. Validate Manifests
   - kubeval validation
   - kubeconform validation
   - kube-score best practices
   - Helm lint

2. Deploy Base Infrastructure
   - NGINX Ingress Controller
   - Cert Manager
   - Metrics Server
   - Prometheus & Grafana

3. Deploy Configs & Secrets (per environment)
   - Create namespaces
   - Create ConfigMaps
   - Fetch secrets from Azure Key Vault
   - Create Kubernetes secrets

4. Deploy Applications with Helm
   - Staging deployment
   - Production deployment (manual approval)

**Triggers**:
- Branches: main, develop
- Paths: k8s/**, infrastructure/kubernetes/**, infrastructure/helm/**

## Templates

### 1. Docker Build Template
**File**: [`templates/docker-build-template.yml`](./templates/docker-build-template.yml)

**Purpose**: Reusable template for building and pushing Docker images

**Parameters**:
- serviceName
- dockerfilePath
- buildContext
- imageRepository
- imageTag
- acrName
- additionalTags
- buildArgs

**Usage**:
```yaml
- template: .azuredevops/templates/docker-build-template.yml
  parameters:
    serviceName: 'auth-service'
    dockerfilePath: 'backend/services/auth-service/Dockerfile'
    buildContext: 'backend/services/auth-service'
```

### 2. Helm Deploy Template
**File**: [`templates/helm-deploy-template.yml`](./templates/helm-deploy-template.yml)

**Purpose**: Reusable template for Helm deployments

**Parameters**:
- environment
- namespace
- releaseName
- chartPath
- imageTag
- replicaCount
- values

**Usage**:
```yaml
- template: .azuredevops/templates/helm-deploy-template.yml
  parameters:
    environment: 'staging'
    namespace: 'flamoral-staging'
    releaseName: 'flamoral-staging'
    chartPath: 'infrastructure/helm/flamoral'
```

### 3. Test Template
**File**: [`templates/test-template.yml`](./templates/test-template.yml)

**Purpose**: Reusable template for running tests

**Parameters**:
- serviceName
- serviceDirectory
- testType (unit, integration, e2e)
- language (node, python, go)
- coverageThreshold

**Usage**:
```yaml
- template: .azuredevops/templates/test-template.yml
  parameters:
    serviceName: 'user-service'
    serviceDirectory: 'backend/services/user-service'
    testType: 'unit'
    language: 'node'
```

## Documentation

### Configuration Documentation

| File | Description |
|------|-------------|
| [`PIPELINE_ARCHITECTURE.md`](./PIPELINE_ARCHITECTURE.md) | Complete pipeline architecture overview |
| [`variable-groups/README.md`](./variable-groups/README.md) | Variable groups configuration guide |
| [`service-connections/README.md`](./service-connections/README.md) | Service connections setup guide |
| [`README.md`](./README.md) | Azure Boards integration documentation |
| [`INDEX.md`](./INDEX.md) | This file - complete index |

### Variable Groups

13 variable groups need to be created:

1. **flamoral-shared-vars** - Shared across all pipelines
2. **flamoral-ci-vars** - CI pipeline variables
3. **flamoral-cd-vars** - CD pipeline variables
4. **flamoral-terraform-vars** - Terraform general variables
5. **flamoral-infra-vars** - Infrastructure variables
6. **flamoral-dev-vars** - Dev environment variables
7. **flamoral-test-vars** - Test environment variables
8. **flamoral-staging-vars** - Staging environment variables
9. **flamoral-prod-vars** - Production environment variables
10. **flamoral-terraform-dev-vars** - Terraform dev variables
11. **flamoral-terraform-test-vars** - Terraform test variables
12. **flamoral-terraform-staging-vars** - Terraform staging variables
13. **flamoral-terraform-prod-vars** - Terraform production variables

See [`variable-groups/README.md`](./variable-groups/README.md) for complete variable lists.

### Service Connections

4 service connections need to be created:

1. **azure-datingapp-sp-connection** (Azure RM)
   - Azure subscription access
   - Service principal: a85e4029-4e37-4399-9390-6e18922b38e7

2. **azure-terraform-sp-connection** (Azure RM)
   - Terraform operations
   - Same service principal

3. **acr-datingapp-connection** (Docker Registry)
   - Azure Container Registry: flamoralacr.azurecr.io
   - Push/pull Docker images

4. **aks-flamoral-connection** (Kubernetes)
   - AKS cluster: flamoral-aks
   - Kubernetes operations

See [`service-connections/README.md`](./service-connections/README.md) for detailed setup instructions.

## Scripts

### Setup Script
**File**: [`setup-pipelines.sh`](./setup-pipelines.sh)

**Purpose**: Automated setup of Azure DevOps pipelines

**Usage**:
```bash
chmod +x .azuredevops/setup-pipelines.sh
./.azuredevops/setup-pipelines.sh
```

**What it does**:
- Checks prerequisites
- Logs into Azure and Azure DevOps
- Creates variable groups
- Creates deployment environments
- Creates Azure Key Vaults
- Sets up Terraform backend storage
- Creates pipelines
- Provides setup summary

## Architecture Diagram

```
Source Code (Azure DevOps Repos)
         ↓
    CI Pipeline
    ├── Code Quality & Security
    ├── Build & Test Services
    ├── Build Docker Images
    └── Push to ACR (flamoralacr)
         ↓
    CD Pipeline
    ├── Dev Environment (Auto)
    ├── Test Environment (Auto)
    ├── Staging Environment (Blue-Green)
    └── Production (Blue-Green + Manual Approval)
         ↓
    AKS Cluster (flamoral-aks)
    └── Microservices Running

Parallel Pipelines:
    Terraform Pipeline → Azure Infrastructure
    Infrastructure Pipeline → K8s Base Components
```

## Environments

| Environment | Namespace | Approval | URL |
|-------------|-----------|----------|-----|
| Dev | flamoral-dev | None | dev.flamoral.app |
| Test | flamoral-test | None | test.flamoral.app |
| Staging | flamoral-staging | Traffic switch | staging.flamoral.app |
| Production | flamoral-prod | Full manual | flamoral.app |

## Pipeline Workflows

### CI Workflow
1. Code Quality Checks → 2. Build Services → 3. Run Tests → 4. Build Docker Images → 5. Integration Tests → 6. Publish Artifacts

### CD Workflow
Dev (Auto) → Test (Auto) → Staging (Blue-Green) → Production (Manual + Blue-Green)

### Terraform Workflow
Validate → Plan → Apply Dev → Apply Test → Apply Staging → Apply Production (Manual)

### Infrastructure Workflow
Validate K8s → Deploy Base Infra → Deploy Configs/Secrets → Deploy Apps (Helm)

## Deployment Strategies

### Blue-Green Deployment

Used in Staging and Production:
1. Deploy new version to inactive slot (blue or green)
2. Run validation tests
3. Switch traffic to new slot (manual approval for prod)
4. Keep old slot for quick rollback

### Rolling Updates

Used in Dev and Test:
- Gradual pod replacement
- Zero downtime
- Automatic rollback on failure

## Security Features

- **Secrets Management**: Azure Key Vault integration
- **Service Principal**: Least privilege access
- **Security Scanning**: Snyk, TFSec, npm audit
- **Container Scanning**: Docker image vulnerability scanning
- **Network Policies**: Kubernetes network isolation
- **RBAC**: Role-based access control
- **Audit Logging**: All changes tracked

## Monitoring & Observability

- **Prometheus**: Metrics collection
- **Grafana**: Dashboards and visualization
- **Azure Monitor**: Application insights
- **Log Analytics**: Centralized logging
- **Pipeline Analytics**: Build and deployment metrics

## Best Practices Implemented

1. ✅ Multi-stage pipelines with quality gates
2. ✅ Reusable templates for DRY code
3. ✅ Blue-green deployments for zero downtime
4. ✅ Automated testing (unit, integration, E2E)
5. ✅ Security scanning at multiple stages
6. ✅ Secrets in Azure Key Vault, not code
7. ✅ Manual approvals for production
8. ✅ Infrastructure as Code (Terraform)
9. ✅ Container orchestration (Kubernetes)
10. ✅ Comprehensive monitoring and logging

## Troubleshooting

### Common Issues

1. **Pipeline fails at ACR login**
   - Check service connection credentials
   - Verify ACR permissions

2. **Terraform state lock**
   - Check Azure Storage account access
   - Break lock if needed (with caution)

3. **Kubernetes deployment timeout**
   - Check pod logs
   - Verify resource limits
   - Check image pull secrets

4. **Key Vault access denied**
   - Verify service principal permissions
   - Check Key Vault access policies

See [`PIPELINE_ARCHITECTURE.md`](./PIPELINE_ARCHITECTURE.md) for detailed troubleshooting.

## Support & Resources

### Internal Resources
- Pipeline Architecture: [`PIPELINE_ARCHITECTURE.md`](./PIPELINE_ARCHITECTURE.md)
- Variable Groups: [`variable-groups/README.md`](./variable-groups/README.md)
- Service Connections: [`service-connections/README.md`](./service-connections/README.md)
- Azure Boards: [`README.md`](./README.md)

### External Resources
- [Azure Pipelines Documentation](https://learn.microsoft.com/en-us/azure/devops/pipelines/)
- [YAML Schema Reference](https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/)
- [Terraform Documentation](https://www.terraform.io/docs)
- [Helm Documentation](https://helm.sh/docs/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)

### Contact
- Azure DevOps: https://dev.azure.com/citadelcloudmanagement/DatingPlatform
- Team: ops-team@flamoral.com

## Version History

- **v1.0** (2025-12-02): Initial pipeline architecture
  - CI/CD pipelines
  - Terraform pipeline
  - Infrastructure pipeline
  - Reusable templates
  - Complete documentation

---

**Last Updated**: 2025-12-02
**Maintained By**: DevOps Team
**Project**: Flamoral Dating Platform
