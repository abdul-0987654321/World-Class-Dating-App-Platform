# Azure DevOps Pipelines - Quick Start Guide

## Initial Setup (One-Time)

### 1. Create Variable Groups

In Azure DevOps > Pipelines > Library, create these variable groups:

#### flamoral-common-vars
```
ACR_USERNAME: flamoralprodacr
ACR_PASSWORD: <secret-from-acr>
SNYK_TOKEN: <your-snyk-token>
INFRACOST_API_KEY: <your-infracost-key>
```

#### flamoral-terraform-vars
```
TF_STATE_RESOURCE_GROUP: flamoral-tfstate-rg
TF_STATE_STORAGE_ACCOUNT: flamoraltfstate
TF_STATE_CONTAINER: tfstate
```

#### flamoral-dev-vars
```
PROD_DATABASE_URL: <dev-database-connection-string>
```

#### flamoral-staging-vars
```
PROD_DATABASE_URL: <staging-database-connection-string>
```

#### flamoral-prod-vars
```
PROD_DATABASE_URL: <prod-database-connection-string>
```

### 2. Create Service Connections

#### Azure Resource Manager Connection
1. Go to Project Settings > Service connections
2. Click "New service connection"
3. Select "Azure Resource Manager"
4. Choose "Service Principal (automatic)"
5. Name: `Azure-Service-Connection`
6. Select your subscription
7. Click "Save"

#### ACR Connection
1. New service connection > Docker Registry
2. Registry type: Azure Container Registry
3. Name: `flamoral-acr-connection`
4. Subscription: Select your subscription
5. ACR: `flamoralprodacr`
6. Click "Save"

### 3. Create Environments

Create these environments with approval gates:

1. **flamoral-dev** (no approvals)
2. **flamoral-dev-infrastructure** (no approvals)
3. **flamoral-staging** (no approvals)
4. **flamoral-staging-infrastructure** (1 approver)
5. **flamoral-production** (2+ approvers)
6. **flamoral-production-infrastructure** (2+ approvers)

To create:
1. Go to Pipelines > Environments
2. Click "New environment"
3. Enter name and description
4. For production environments:
   - Click on environment
   - Click the "..." menu > Approvals and checks
   - Add required approvers

### 4. Create Pipelines

#### CI Pipeline
1. Go to Pipelines > New pipeline
2. Select "Azure Repos Git"
3. Choose your repository
4. Select "Existing Azure Pipelines YAML file"
5. Path: `/pipelines/azure-pipelines.yml`
6. Name: `Flamoral-CI`
7. Save and run

#### CD Pipeline
1. Pipelines > New pipeline
2. Select "Azure Repos Git"
3. Choose repository
4. Existing YAML file: `/pipelines/azure-pipelines-cd.yml`
5. Name: `Flamoral-CD`
6. Configure trigger from Flamoral-CI pipeline
7. Save

#### Infrastructure Pipeline
1. Pipelines > New pipeline
2. Select "Azure Repos Git"
3. Choose repository
4. Existing YAML file: `/pipelines/azure-pipelines-infra.yml`
5. Name: `Flamoral-Infrastructure`
6. Save

## Common Operations

### Running a Build

**Automatic Trigger:**
```bash
git add .
git commit -m "Your changes"
git push origin main
```

**Manual Trigger:**
1. Go to Pipelines
2. Select `Flamoral-CI`
3. Click "Run pipeline"
4. Select branch
5. Click "Run"

### Deploying to Development

Development deploys automatically when CI succeeds on `main` or `develop` branch.

### Deploying to Staging

Staging deploys automatically after successful dev deployment.

### Deploying to Production

1. CD pipeline will pause at "Production Approval" stage
2. Approvers receive notification
3. Review:
   - Staging test results
   - Security scan results
   - Deployment plan
4. Click "Review" in Azure DevOps
5. Approve or Reject with comments
6. Pipeline continues or stops based on approval

### Applying Infrastructure Changes

1. Make changes to Terraform files
2. Commit and push to trigger pipeline
3. Pipeline will run:
   - Validation (automatic)
   - Plan Dev (automatic)
   - Apply Dev (automatic)
   - Plan Staging (automatic)
   - **WAIT** for approval
   - Apply Staging (after approval)
   - Plan Production (automatic)
   - **WAIT** for approval
   - Apply Production (after approval)

### Rollback a Deployment

#### Application Rollback
```bash
# Get AKS credentials
az aks get-credentials --resource-group flamoral-prod-rg --name flamoral-prod-aks

# View release history
helm history flamoral-platform -n flamoral-prod

# Rollback to previous version
helm rollback flamoral-platform -n flamoral-prod

# Or rollback to specific revision
helm rollback flamoral-platform 5 -n flamoral-prod
```

#### Infrastructure Rollback
Download backup state from pipeline artifacts and restore:
```bash
# Download state backup from pipeline artifacts
# Restore via Azure Storage or Terraform workspace
```

## Monitoring Pipeline Runs

### View Pipeline Status
1. Go to Pipelines
2. Click on pipeline name
3. View recent runs
4. Click on a run to see details

### View Logs
1. Open pipeline run
2. Click on stage name
3. Click on job name
4. View real-time or completed logs

### Download Artifacts
1. Open pipeline run
2. Go to "Artifacts" tab
3. Download required artifacts:
   - Build outputs
   - Test results
   - Security scans
   - Terraform plans
   - Deployment manifests

## Troubleshooting

### Build Fails at Lint Stage
```bash
# Run locally to identify issues
npm run lint:all

# Fix issues
npm run lint:all -- --fix

# Commit fixes
git add .
git commit -m "Fix linting issues"
git push
```

### Docker Build Fails
```bash
# Test Docker build locally
docker build -f backend/services/auth-service/Dockerfile -t test .

# Check Dockerfile syntax
# Fix issues and push
```

### Helm Deployment Fails
```bash
# Test Helm chart locally
helm lint infrastructure/helm/flamoral

# Dry-run deployment
helm install flamoral-test infrastructure/helm/flamoral --dry-run --debug

# Fix issues in chart
```

### Terraform Apply Fails
```bash
# Run Terraform locally
cd infrastructure/terraform/environments/dev
terraform init
terraform plan
terraform apply

# Fix issues and commit
```

## Security Best Practices

### Secrets Management
- Never commit secrets to repository
- Use Azure Key Vault for sensitive data
- Rotate secrets regularly
- Use pipeline variables for non-sensitive config

### Access Control
- Limit who can approve production deployments
- Use branch protection rules
- Enable audit logging
- Review access regularly

### Image Security
- Scan all images before deployment
- Use minimal base images
- Update dependencies regularly
- Monitor for vulnerabilities

## Performance Optimization

### Speed Up Builds
```yaml
# Use caching
- task: Cache@2
  inputs:
    key: 'npm | "$(Agent.OS)" | package-lock.json'
    path: node_modules

# Run jobs in parallel
jobs:
  - job: Test1
  - job: Test2  # Runs parallel to Test1
  - job: Test3  # Runs parallel to Test1 and Test2
```

### Reduce Docker Build Time
```dockerfile
# Use multi-stage builds
# Cache dependencies layer
# Use .dockerignore
```

## Getting Help

### Documentation
- Main README: `/pipelines/README.md`
- Azure DevOps Docs: https://docs.microsoft.com/azure/devops/pipelines/

### Support Contacts
- DevOps Team: devops@flamoral.com
- Infrastructure: infrastructure@flamoral.com
- Emergency: Use on-call rotation

### Common Resources
- Pipeline Templates: `/pipelines/templates/`
- Terraform Modules: `/infrastructure/terraform/modules/`
- Helm Charts: `/infrastructure/helm/`
- Scripts: `/scripts/`

## Checklist for New Team Members

- [ ] Access to Azure DevOps project
- [ ] Added to appropriate security groups
- [ ] Can view pipelines
- [ ] Can trigger builds (if required)
- [ ] Can approve deployments (if required)
- [ ] Understand rollback procedures
- [ ] Know escalation contacts
- [ ] Read main README.md
- [ ] Completed initial setup (if admin)

## Next Steps

1. Review the main [README.md](./README.md) for detailed documentation
2. Explore the [templates directory](./templates/) for reusable components
3. Check existing pipelines in Azure DevOps
4. Run a test build
5. Review recent pipeline runs
6. Join DevOps team channels (Slack/Teams)

---

**Last Updated:** 2025-12-10
**Version:** 1.0.0
**Maintained By:** Flamoral DevOps Team
