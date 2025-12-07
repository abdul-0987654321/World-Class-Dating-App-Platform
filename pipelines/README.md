# Flamoral Dating Platform - Azure DevOps Pipelines

## Overview

This directory contains the consolidated Azure DevOps pipeline configuration for the Flamoral Dating Platform. These pipelines replace all previous scattered pipeline definitions and provide a single source of truth for CI/CD operations.

**Organization:** citadelcloudmanagement
**Project:** DatingPlatform
**URL:** https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_build

## Pipeline Structure

```
pipelines/
├── README.md                      # This file
├── ci-pipeline.yml                # Main CI Pipeline
├── cd-pipeline.yml                # Main CD Pipeline (Dev → Test → Prod)
├── infrastructure-pipeline.yml   # Terraform Infrastructure Pipeline
├── security-pipeline.yml          # Security Scanning Pipeline
└── templates/                     # Reusable templates
    ├── variables-common.yml       # Common variables
    ├── variables-dev.yml          # Dev environment variables
    ├── variables-test.yml         # Test environment variables
    ├── variables-prod.yml         # Production environment variables
    ├── node-build.yml             # Node.js build template
    ├── docker-build-push.yml      # Docker build and push template
    ├── helm-deploy.yml            # Helm deployment template
    └── terraform-steps.yml        # Terraform operations template
```

## Pipelines

### 1. CI Pipeline (`ci-pipeline.yml`)

**Triggers:** Push to main, develop, release/*, hotfix/*, feature/*

**Stages:**
1. **Code Quality** - Linting, type checking, security scanning
2. **Build Backend** - Build all Node.js and Python microservices
3. **Build Frontend** - Build web and mobile applications
4. **Build Docker Images** - Build and push images to ACR
5. **Integration Tests** - Run integration test suite
6. **Publish Artifacts** - Publish deployment artifacts

### 2. CD Pipeline (`cd-pipeline.yml`)

**Triggers:** Successful CI pipeline completion on main branch

**Stages:**
1. **Deploy to Dev** - Automatic deployment
2. **Deploy to Test** - With integration tests
3. **Deploy to Production** - With manual approval gates

**Features:**
- Blue-Green deployment strategy
- Manual approval gates for production
- Smoke tests after each deployment
- Traffic switching with approval

### 3. Infrastructure Pipeline (`infrastructure-pipeline.yml`)

**Triggers:** Changes to infrastructure/terraform/**

**Parameters:**
- `environment`: dev, test, prod
- `terraformAction`: plan, apply, destroy
- `autoApprove`: boolean

**Stages:**
1. **Validation** - Format check, lint, security scan
2. **Plan** - Generate Terraform plan
3. **Apply** - Apply to selected environment
4. **Verify** - Verify deployed resources

### 4. Security Pipeline (`security-pipeline.yml`)

**Triggers:** All branches, scheduled weekly

**Stages:**
1. **Dependency Scanning** - NPM audit, Snyk, Trivy
2. **Secret Detection** - detect-secrets, TruffleHog, GitLeaks
3. **Container Scanning** - Trivy image scanning
4. **Infrastructure Scanning** - tfsec, Checkov, kubesec
5. **Security Report** - Consolidated report generation

## Required Azure DevOps Configuration

### Service Connections

Create these service connections in Azure DevOps:

| Name | Type | Purpose |
|------|------|---------|
| `azure-terraform-sp-connection` | Azure Resource Manager | Azure subscription access |
| `acr-datingapp-connection` | Docker Registry | ACR push/pull |
| `aks-flamoral-connection` | Kubernetes | AKS deployments |

### Variable Groups

Create these variable groups in Azure DevOps Library:

| Group Name | Variables |
|------------|-----------|
| `flamoral-shared-vars` | Common variables |
| `flamoral-ci-vars` | CI-specific variables |
| `flamoral-cd-vars` | CD-specific variables |
| `flamoral-terraform-vars` | Terraform variables |
| `flamoral-dev-vars` | Dev environment secrets |
| `flamoral-test-vars` | Test environment secrets |
| `flamoral-prod-vars` | Production secrets |
| `flamoral-security-vars` | Security scanning tokens |

### Required Secrets

Store these as secret variables in the appropriate variable groups:

```
ACR_USERNAME          # ACR service principal client ID
ACR_PASSWORD          # ACR service principal client secret
SNYK_TOKEN           # Snyk API token
INFRACOST_API_KEY    # Infracost API key (optional)
```

### Environments

Create these environments with approval gates:

| Environment | Approval Required | Approvers |
|-------------|-------------------|-----------|
| `flamoral-dev` | No | - |
| `flamoral-test` | No | - |
| `flamoral-staging` | Yes | ops-team@flamoral.com |
| `flamoral-production` | Yes | release-managers@flamoral.com, cto@flamoral.com |
| `terraform-dev` | No | - |
| `terraform-test` | No | - |
| `terraform-production` | Yes | infrastructure-team@flamoral.com |

## Setup Instructions

### 1. Create Pipelines in Azure DevOps

Navigate to: https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_build

For each pipeline:
1. Click "New Pipeline"
2. Select "Azure Repos Git"
3. Select your repository
4. Choose "Existing Azure Pipelines YAML file"
5. Select the pipeline file path (e.g., `/pipelines/ci-pipeline.yml`)
6. Save and run

### 2. Rename Pipelines

After creating, rename the pipelines:
- `Flamoral-CI-Pipeline`
- `Flamoral-CD-Pipeline`
- `Flamoral-Infrastructure-Pipeline`
- `Flamoral-Security-Pipeline`

### 3. Set Up Variable Groups

Go to Library > Variable Groups and create the required groups with their variables.

### 4. Configure Environments

Go to Environments and set up approval gates for staging and production.

## Migration from Old Pipelines

The following old pipeline locations are deprecated and should be removed after migration:

- `/.azuredevops/pipelines/` - Old pipeline location
- `/azure-pipelines/` - Duplicate pipeline folder
- `/.github/workflows/` - GitHub Actions (if migrating to Azure DevOps only)
- `/azure-pipelines.yml` (root) - Old main pipeline
- `/azure-pipelines-infrastructure.yml` (root) - Old infrastructure pipeline

**Note:** Keep the old pipelines disabled (not deleted) for a transition period to ensure the new pipelines work correctly.

## Best Practices

1. **Never commit secrets** - Use Azure DevOps variable groups and Azure Key Vault
2. **Use templates** - Reuse templates for consistent pipeline stages
3. **Tag your images** - Always use Build.BuildId for traceability
4. **Approval gates** - Always require manual approval for production
5. **Monitor pipelines** - Set up alerts for failed pipelines

## Troubleshooting

### Common Issues

1. **ACR authentication failed**
   - Verify the `acr-datingapp-connection` service connection
   - Check ACR_USERNAME and ACR_PASSWORD in variable groups

2. **Terraform state lock**
   - Check Azure Storage for state lock files
   - Use `terraform force-unlock` if needed

3. **Helm deployment timeout**
   - Increase timeout in helm-deploy.yml template
   - Check pod logs for startup issues

4. **Environment approval stuck**
   - Verify approvers have access to the project
   - Check email notifications are working

## Support

For issues with pipelines:
1. Check Azure DevOps pipeline logs
2. Review the security scan artifacts
3. Contact DevOps team at devops@flamoral.com
