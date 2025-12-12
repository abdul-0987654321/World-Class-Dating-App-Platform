# Azure DevOps CI/CD Pipelines for Flamoral Dating Platform

This directory contains the Azure DevOps pipeline definitions for building, testing, and deploying the Flamoral Dating Platform.

## Pipeline Files

### Main Pipelines

1. **azure-pipelines.yml** - CI Pipeline
   - Builds all backend services
   - Runs linting and code quality checks
   - Executes unit and integration tests
   - Builds and pushes Docker images to ACR
   - Performs security scanning
   - Publishes Helm charts

2. **azure-pipelines-cd.yml** - CD Pipeline
   - Multi-stage deployment: Dev -> Staging -> Production
   - Manual approval gates for production
   - Blue-green deployment strategy
   - Helm-based deployments to AKS
   - Automated smoke tests and integration tests
   - Rollback capabilities

3. **azure-pipelines-infra.yml** - Infrastructure Pipeline
   - Terraform-based infrastructure provisioning
   - Multi-environment support (dev, staging, prod)
   - Infrastructure validation and security scanning
   - Cost estimation with Infracost
   - Manual approval for staging and production
   - State backup and drift detection

### Reusable Templates

Located in `pipelines/templates/`:

1. **node-build.yml** - Node.js/TypeScript Build Template
   - Configurable Node.js version
   - Dependency caching
   - Linting and testing
   - Code coverage reporting
   - Build artifact publishing

2. **docker-build.yml** - Docker Image Build Template
   - Multi-stage Docker builds
   - BuildKit support
   - Image tagging strategy
   - Security scanning with Trivy
   - Push to Azure Container Registry
   - Image metadata collection

3. **helm-deploy.yml** - Helm Deployment Template
   - Namespace management
   - ConfigMap and Secret handling
   - Deployment verification
   - Rollback capabilities
   - Health checks
   - Service endpoint discovery

4. **terraform-apply.yml** - Terraform Operations Template
   - Plan and apply operations
   - State management
   - Drift detection
   - Cost estimation
   - Output capture
   - Validation and verification

## Prerequisites

### Azure Resources

1. **Azure DevOps Organization**
   - Project created
   - Service connections configured

2. **Azure Container Registry (ACR)**
   - Name: `flamoralprodacr`
   - Login server: `flamoralprodacr.azurecr.io`

3. **Azure Kubernetes Service (AKS)**
   - Cluster name: `flamoral-prod-aks`
   - Resource groups for dev, staging, and prod

4. **Storage Account for Terraform State**
   - Container for storing .tfstate files
   - Configured backend in Terraform

### Variable Groups

Create the following variable groups in Azure DevOps:

#### flamoral-common-vars
Common variables used across all pipelines:
- `ACR_USERNAME` - ACR username
- `ACR_PASSWORD` - ACR password (secret)
- `SNYK_TOKEN` - Snyk API token (secret)
- `INFRACOST_API_KEY` - Infracost API key (secret)

#### flamoral-terraform-vars (ID: 15)
Terraform-specific variables:
- `TF_STATE_RESOURCE_GROUP` - Resource group for Terraform state
- `TF_STATE_STORAGE_ACCOUNT` - Storage account name
- `TF_STATE_CONTAINER` - Container name

#### Environment-Specific Variable Groups
- `flamoral-dev-vars` - Development environment variables
- `flamoral-staging-vars` - Staging environment variables
- `flamoral-prod-vars` - Production environment variables

### Service Connections

Create the following service connections in Azure DevOps:

1. **Azure-Service-Connection**
   - Type: Azure Resource Manager
   - Authentication: Service Principal
   - Scope: Subscription or Resource Group

2. **flamoral-acr-connection**
   - Type: Docker Registry
   - Registry type: Azure Container Registry
   - Connection: `flamoralprodacr`

### Environments

Create the following environments in Azure DevOps for approval gates:

1. `flamoral-dev`
2. `flamoral-dev-infrastructure`
3. `flamoral-staging`
4. `flamoral-staging-infrastructure`
5. `flamoral-production` (with approvers)
6. `flamoral-production-infrastructure` (with approvers)

## Pipeline Configuration

### CI Pipeline (azure-pipelines.yml)

**Triggers:**
- Branches: `main`, `develop`, `feature/*`
- Excludes: Documentation files

**Stages:**
1. Build and Test
2. Build Docker Images
3. Security Scanning
4. Publish Artifacts

**Services Built:**
- Core Services: auth, user, matching, messaging, media, payment, notification
- AI Services: recommendation, nlp, photo-analysis, fraud-detection, dating-coach, content-generator
- Support Services: api-gateway, realtime, moderation, analytics, advertising, automation, workflow-engine

### CD Pipeline (azure-pipelines-cd.yml)

**Trigger:** Manual or on CI pipeline completion

**Stages:**
1. Deploy to Development
   - Automatic deployment
   - Smoke tests
2. Deploy to Staging
   - Automatic deployment
   - Integration tests
   - Performance tests
3. Production Approval
   - Manual approval required
4. Deploy to Production
   - Database migrations
   - Blue-green deployment
   - Traffic switching
   - Smoke tests
   - Cleanup old deployment

**Deployment Strategy:**
- Dev/Staging: Rolling update
- Production: Blue-green with manual traffic switch

### Infrastructure Pipeline (azure-pipelines-infra.yml)

**Triggers:**
- Changes to `infrastructure/terraform/**`

**Stages:**
1. Validate Infrastructure
   - Terraform validation
   - Security scanning (Checkov, tflint)
   - Cost estimation
2. Plan & Apply Development
   - Automatic apply
3. Plan & Apply Staging
   - Manual approval required
4. Plan & Apply Production
   - Manual approval required (multiple approvers)
   - State backup
   - Drift detection

## Usage

### Running the CI Pipeline

The CI pipeline runs automatically on:
- Push to `main`, `develop`, or `feature/*` branches
- Pull requests to `main` or `develop`

To run manually:
```bash
# In Azure DevOps UI
Pipelines > Flamoral-CI > Run Pipeline
```

### Running the CD Pipeline

The CD pipeline can be triggered:
1. Automatically after successful CI pipeline completion
2. Manually from Azure DevOps UI

```bash
# Manual trigger
Pipelines > Flamoral-CD > Run Pipeline
```

**Approval Process:**
- Dev: Automatic
- Staging: Automatic
- Production: Requires manual approval from designated approvers

### Running the Infrastructure Pipeline

```bash
# Manual trigger
Pipelines > Flamoral-Infrastructure > Run Pipeline
```

**Approval Requirements:**
- Dev: Automatic apply
- Staging: Manual approval (1 approver)
- Production: Manual approval (2+ approvers recommended)

## Template Usage Examples

### Using node-build.yml Template

```yaml
- template: templates/node-build.yml
  parameters:
    projectPath: 'backend/services/auth-service'
    nodeVersion: '20.x'
    buildCommand: 'npm run build'
    testCommand: 'npm run test'
    publishArtifact: true
    artifactName: 'auth-service-build'
```

### Using docker-build.yml Template

```yaml
- template: templates/docker-build.yml
  parameters:
    serviceName: 'auth-service'
    dockerfile: 'backend/services/auth-service/Dockerfile'
    acrLoginServer: 'flamoralprodacr.azurecr.io'
    imageTag: '$(Build.BuildId)'
    scanImage: true
```

### Using helm-deploy.yml Template

```yaml
- template: templates/helm-deploy.yml
  parameters:
    chartName: 'flamoral'
    chartPath: 'infrastructure/helm/flamoral'
    namespace: 'flamoral-prod'
    environment: 'prod'
    imageTag: '$(Build.BuildId)'
    acrLoginServer: 'flamoralprodacr.azurecr.io'
    releaseName: 'flamoral-platform'
    valueFiles:
      - 'infrastructure/helm/flamoral/values-prod.yaml'
```

### Using terraform-apply.yml Template

```yaml
- template: templates/terraform-apply.yml
  parameters:
    environment: 'prod'
    terraformCommand: 'apply'
    workingDirectory: 'infrastructure/terraform/environments/prod'
    backendServiceArm: 'Azure-Service-Connection'
    backendResourceGroup: 'flamoral-tfstate-rg'
    backendStorageAccount: 'flamoraltfstate'
    backendContainer: 'tfstate'
    stateKey: 'flamoral-prod.tfstate'
```

## Security Features

### CI Pipeline Security
- Dependency scanning with npm audit
- Container image scanning with Trivy
- SAST with Snyk
- Code coverage reporting
- License compliance checking

### CD Pipeline Security
- Image signature verification
- Secret management via Azure Key Vault
- Network policies enforcement
- RBAC validation
- Audit logging

### Infrastructure Pipeline Security
- Terraform security scanning (Checkov)
- Policy validation (tflint)
- State encryption
- Remote state locking
- Least privilege access

## Monitoring and Alerts

### Pipeline Notifications

Configure notifications in Azure DevOps:
- Build failures: Notify team via email/Slack
- Deployment approvals: Notify approvers
- Security scan failures: Notify security team

### Deployment Metrics

Tracked metrics:
- Build duration
- Test coverage
- Deployment frequency
- Lead time for changes
- Mean time to recovery (MTTR)
- Change failure rate

## Troubleshooting

### Common Issues

**Issue: Docker build fails with "no space left on device"**
```yaml
# Add cleanup step before build
- script: docker system prune -af
  displayName: 'Clean up Docker'
```

**Issue: Helm deployment timeout**
```yaml
# Increase timeout in helm-deploy.yml
timeout: '20m'
```

**Issue: Terraform state lock**
```bash
# Manually unlock state (use with caution)
terraform force-unlock <LOCK_ID>
```

**Issue: ACR authentication failure**
```yaml
# Verify service connection and regenerate credentials if needed
- task: Docker@2
  inputs:
    command: 'login'
    containerRegistry: 'flamoral-acr-connection'
```

### Debug Mode

Enable debug output:
```yaml
variables:
  system.debug: true
```

## Maintenance

### Regular Tasks

1. **Weekly:**
   - Review pipeline run history
   - Check for failed builds
   - Update dependencies

2. **Monthly:**
   - Review and rotate secrets
   - Update Docker base images
   - Check for outdated pipeline tasks

3. **Quarterly:**
   - Review and optimize pipeline performance
   - Update Terraform providers
   - Security audit

### Updating Pipelines

1. Create feature branch
2. Update pipeline YAML files
3. Test in development environment
4. Create pull request
5. Review and approve
6. Merge to main branch

## Best Practices

1. **Use Templates** - Maximize reusability with templates
2. **Cache Dependencies** - Use caching to speed up builds
3. **Parallel Execution** - Run independent jobs in parallel
4. **Fail Fast** - Run quick checks (lint, unit tests) before expensive operations
5. **Artifact Management** - Clean up old artifacts regularly
6. **Secret Management** - Never commit secrets; use Azure Key Vault
7. **Version Control** - Tag releases and Docker images consistently
8. **Documentation** - Keep this README updated with changes

## Support

For issues or questions:
- DevOps Team: devops@flamoral.com
- Infrastructure: infrastructure@flamoral.com
- Documentation: https://docs.flamoral.com/pipelines

## References

- [Azure Pipelines Documentation](https://docs.microsoft.com/azure/devops/pipelines/)
- [Helm Documentation](https://helm.sh/docs/)
- [Terraform Documentation](https://www.terraform.io/docs/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
