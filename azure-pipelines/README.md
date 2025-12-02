# Azure DevOps CI/CD Pipelines

Complete Azure DevOps pipeline configuration for the Flamoral Dating App Platform.

## Overview

This directory contains comprehensive CI/CD pipelines for building, testing, and deploying all microservices across Node.js, Go, and Python stacks to Azure Kubernetes Service (AKS).

## Directory Structure

```
azure-pipelines/
├── ci/                          # Continuous Integration pipelines
│   ├── build-all-services.yml   # Build all microservices
│   ├── test-all-services.yml    # Run all tests
│   └── docker-build.yml         # Build and push Docker images
├── cd/                          # Continuous Deployment pipelines
│   ├── deploy-dev.yml           # Deploy to Development
│   ├── deploy-test.yml          # Deploy to Test/Staging
│   └── deploy-prod.yml          # Deploy to Production
├── templates/                   # Reusable pipeline templates
│   ├── node-build-template.yml
│   ├── go-build-template.yml
│   ├── python-build-template.yml
│   ├── docker-build-template.yml
│   └── k8s-deploy-template.yml
└── README.md                    # This file
```

## Services Coverage

### Node.js Services (11)
- auth-service
- user-service
- matching-service
- messaging-service
- payment-service
- notification-service
- moderation-service
- analytics-service
- media-service
- api-gateway
- advertising-service

### Go Services (1)
- realtime-service

### Python AI Services (4)
- nlp-service
- recommendation-service
- fraud-detection
- photo-analysis

**Total: 16 microservices**

## Pipeline Features

### CI Pipelines

#### 1. Build All Services (`ci/build-all-services.yml`)
- **Triggers**: Push to main, develop, feature/*, hotfix/*
- **Stages**:
  - Build Node.js Services (parallel execution)
  - Build Go Services
  - Build Python AI Services
  - Generate Build Report
- **Features**:
  - Parallel builds for faster execution
  - Dependency caching (npm, go modules, pip)
  - Linting and code quality checks
  - Build artifact publishing

#### 2. Test All Services (`ci/test-all-services.yml`)
- **Triggers**: Push to main, develop, feature/*
- **Stages**:
  - Unit Tests (with code coverage)
  - Integration Tests (with database services)
  - E2E Tests (Playwright)
  - Test Summary Report
- **Features**:
  - Test result publishing to Azure DevOps
  - Code coverage reports (Cobertura)
  - JUnit test result format
  - Docker-based integration testing
  - Performance baseline checks

#### 3. Docker Build (`ci/docker-build.yml`)
- **Triggers**: Push to main, develop, release/*
- **Stages**:
  - Build Node.js Service Images
  - Build Go Service Images
  - Build Python Service Images
  - Security Scanning
  - Build Summary
- **Features**:
  - Multi-stage Docker builds
  - Image tagging (latest, build-id, git-sha, branch)
  - Push to Azure Container Registry (ACR)
  - Trivy security scanning
  - Azure Defender integration

### CD Pipelines

#### 1. Deploy to Dev (`cd/deploy-dev.yml`)
- **Trigger**: Automatic on docker-build completion (develop branch)
- **Stages**:
  - Deploy Infrastructure (databases)
  - Deploy Core Services
  - Deploy Business Services
  - Deploy Realtime Services
  - Deploy AI Services
  - Post-Deployment Tests
- **Features**:
  - Automatic deployment
  - Health checks
  - Smoke tests
  - No approval required

#### 2. Deploy to Test (`cd/deploy-test.yml`)
- **Trigger**: Manual or docker-build completion (main branch)
- **Stages**:
  - Pre-Deployment Approval (manual gate)
  - Backup Databases
  - Deploy Infrastructure
  - Deploy All Services
  - Integration Tests
  - Performance Tests
  - Security Tests (OWASP ZAP)
- **Features**:
  - Manual approval required
  - Database backups before deployment
  - Comprehensive testing suite
  - Email notifications

#### 3. Deploy to Production (`cd/deploy-prod.yml`)
- **Trigger**: Manual only
- **Stages**:
  - Pre-Production Checklist
  - Manager Approval (manual gate)
  - Backup Production Data
  - Enable Maintenance Mode
  - Blue-Green Deployment
  - Smoke Test Green Environment
  - Traffic Switch Approval
  - Gradual Traffic Switch (10% → 50% → 100%)
  - Monitor Production
  - Cleanup Blue Environment
- **Features**:
  - Multi-level approval gates
  - Blue-green deployment strategy
  - Gradual traffic shifting
  - Automatic rollback capability
  - Production monitoring
  - Comprehensive backups

## Setup Instructions

### Prerequisites

1. **Azure Resources**:
   - Azure DevOps organization and project
   - Azure Container Registry (ACR)
   - Azure Kubernetes Service (AKS) clusters (dev, test, prod)
   - Azure PostgreSQL, Redis, MongoDB instances
   - Azure Key Vault for secrets

2. **Service Connections**:
   - `flamoral-acr` - Azure Container Registry
   - `flamoral-aks-dev` - Dev AKS cluster
   - `flamoral-aks-test` - Test AKS cluster
   - `flamoral-aks-prod` - Prod AKS cluster
   - `flamoral-azure-subscription` - Azure subscription

3. **Variable Groups**:
   Create the following variable groups in Azure DevOps:

   - `flamoral-build-variables`
   - `flamoral-test-variables`
   - `flamoral-docker-variables`
   - `flamoral-dev-variables`
   - `flamoral-test-variables`
   - `flamoral-prod-variables`

### Variable Group Configuration

#### flamoral-build-variables
```yaml
nodeVersion: '20.x'
goVersion: '1.21'
pythonVersion: '3.11'
```

#### flamoral-docker-variables
```yaml
containerRegistry: 'flamoral-acr'
containerRegistryUrl: 'flamoralacr.azurecr.io'
imagePrefix: 'flamoral'
```

#### flamoral-dev-variables
```yaml
environment: 'dev'
namespace: 'flamoral-dev'
kubernetesServiceConnection: 'flamoral-aks-dev'
DATABASE_URL: $(dev-database-url)  # Secure variable
REDIS_URL: $(dev-redis-url)        # Secure variable
```

#### flamoral-test-variables
```yaml
environment: 'test'
namespace: 'flamoral-test'
kubernetesServiceConnection: 'flamoral-aks-test'
DATABASE_URL: $(test-database-url)  # Secure variable
REDIS_URL: $(test-redis-url)        # Secure variable
k6CloudToken: $(k6-cloud-token)     # Secure variable
```

#### flamoral-prod-variables
```yaml
environment: 'prod'
namespace: 'flamoral-prod'
kubernetesServiceConnection: 'flamoral-aks-prod'
DATABASE_URL: $(prod-database-url)  # Secure variable
REDIS_URL: $(prod-redis-url)        # Secure variable
```

### Creating Pipelines in Azure DevOps

1. **Navigate to Pipelines**:
   - Go to Azure DevOps → Pipelines → Create Pipeline

2. **Select Repository**:
   - Choose your Git repository

3. **Configure Pipeline**:
   - Select "Existing Azure Pipelines YAML file"
   - Choose the appropriate YAML file from the dropdown

4. **Create Pipelines for**:
   - CI: Build All Services
   - CI: Test All Services
   - CI: Docker Build
   - CD: Deploy to Dev
   - CD: Deploy to Test
   - CD: Deploy to Prod

5. **Configure Environments**:
   - Create environments: `flamoral-dev`, `flamoral-test`, `flamoral-prod`
   - Add approval checks for test and prod environments

### Environment Configuration

#### Creating Environments

1. Go to Pipelines → Environments
2. Create environment: `flamoral-dev`
   - No approvals required
3. Create environment: `flamoral-test`
   - Add approval: DevOps team
4. Create environment: `flamoral-prod`
   - Add approval: Engineering Manager + SRE
   - Add approval: CTO (for production releases)

#### Approval Gates

**Test Environment**:
- Approvers: DevOps Team
- Timeout: 24 hours
- Instructions: Review test results before approving

**Production Environment**:
- Primary Approvers: Engineering Manager, SRE Team
- Secondary Approvers: CTO
- Timeout: 3 days
- Instructions: Review checklist before production deployment

## Pipeline Templates

### Node Build Template
**File**: `templates/node-build-template.yml`

**Parameters**:
- `serviceName`: Name of the service
- `serviceDirectory`: Path to service directory
- `nodeVersion`: Node.js version (default: 20.x)
- `runTests`: Run tests (default: true)
- `publishCoverage`: Publish coverage (default: true)
- `buildCommand`: Build command (default: npm run build)

**Usage**:
```yaml
- template: ../templates/node-build-template.yml
  parameters:
    serviceName: 'auth-service'
    serviceDirectory: 'backend/services/auth-service'
    nodeVersion: '20.x'
```

### Go Build Template
**File**: `templates/go-build-template.yml`

**Parameters**:
- `serviceName`: Name of the service
- `serviceDirectory`: Path to service directory
- `goVersion`: Go version (default: 1.21)
- `runTests`: Run tests (default: true)
- `publishCoverage`: Publish coverage (default: true)

### Python Build Template
**File**: `templates/python-build-template.yml`

**Parameters**:
- `serviceName`: Name of the service
- `serviceDirectory`: Path to service directory
- `pythonVersion`: Python version (default: 3.11)
- `runTests`: Run tests (default: true)
- `publishCoverage`: Publish coverage (default: true)

### Docker Build Template
**File**: `templates/docker-build-template.yml`

**Parameters**:
- `serviceName`: Name of the service
- `dockerfilePath`: Path to Dockerfile
- `buildContext`: Build context directory
- `containerRegistry`: ACR service connection
- `imageRepository`: Image repository name
- `tagWithBuildId`: Tag with build ID (default: true)
- `tagWithGitSha`: Tag with git SHA (default: true)

### Kubernetes Deploy Template
**File**: `templates/k8s-deploy-template.yml`

**Parameters**:
- `serviceName`: Name of the service
- `environment`: Target environment (dev/test/prod)
- `namespace`: Kubernetes namespace
- `kubernetesServiceConnection`: AKS service connection
- `imageRepository`: Image repository
- `imageTag`: Image tag to deploy
- `manifestsPath`: Path to K8s manifests
- `useHelm`: Use Helm for deployment (default: false)
- `healthCheckUrl`: Health check endpoint
- `waitForRollout`: Wait for deployment rollout (default: true)

## Deployment Strategies

### Development Environment
- **Strategy**: Direct deployment
- **Approval**: None
- **Trigger**: Automatic on merge to develop
- **Rollback**: Manual

### Test Environment
- **Strategy**: Rolling update
- **Approval**: DevOps team
- **Trigger**: Manual or automatic on main branch
- **Testing**: Integration, Performance, Security
- **Rollback**: Automatic on test failure

### Production Environment
- **Strategy**: Blue-Green deployment
- **Approval**: Multi-level (Manager + SRE + CTO)
- **Trigger**: Manual only
- **Traffic Shift**: Gradual (10% → 50% → 100%)
- **Monitoring**: 15-minute observation period
- **Rollback**: Automatic on error spike, manual option available

## Monitoring and Observability

### Pipeline Monitoring
- Build status badges
- Test result trends
- Code coverage metrics
- Deployment frequency
- Change failure rate
- Mean time to recovery (MTTR)

### Application Monitoring
- Azure Monitor integration
- Application Insights
- Prometheus metrics
- Grafana dashboards
- Log Analytics

## Security Features

### Pipeline Security
- Secure variable groups
- Azure Key Vault integration
- Service principal authentication
- RBAC for pipeline execution

### Container Security
- Trivy vulnerability scanning
- Azure Defender for Containers
- Base image scanning
- Secret scanning prevention

### Deployment Security
- Network policies
- Pod security policies
- TLS/SSL enforcement
- Azure AD integration

## Troubleshooting

### Common Issues

#### Build Failures
1. **npm ci fails**:
   - Clear npm cache
   - Check package-lock.json
   - Verify Node.js version

2. **Docker build fails**:
   - Check Dockerfile syntax
   - Verify base image availability
   - Check ACR credentials

3. **Test failures**:
   - Check database connectivity
   - Verify environment variables
   - Review test logs

#### Deployment Failures
1. **K8s deployment fails**:
   - Check service connection
   - Verify namespace exists
   - Review pod logs
   - Check resource quotas

2. **Health checks fail**:
   - Verify service endpoints
   - Check application logs
   - Review ingress configuration

3. **Rollout timeout**:
   - Check pod status
   - Review resource constraints
   - Verify image pull secrets

### Getting Help

- Check Azure DevOps pipeline logs
- Review Kubernetes pod logs
- Check Application Insights
- Contact DevOps team

## Best Practices

### Pipeline Design
1. Use parallel execution where possible
2. Cache dependencies for faster builds
3. Fail fast on critical errors
4. Keep pipelines modular with templates
5. Document all custom scripts

### Testing
1. Run unit tests on every commit
2. Run integration tests on pull requests
3. Run E2E tests on main branch
4. Maintain test coverage above 80%
5. Mock external dependencies

### Deployment
1. Always backup before production deployment
2. Use gradual rollouts for production
3. Monitor metrics during deployment
4. Have rollback plan ready
5. Communicate deployment schedule

### Security
1. Never commit secrets to source control
2. Use Azure Key Vault for sensitive data
3. Scan images for vulnerabilities
4. Keep base images updated
5. Follow principle of least privilege

## Maintenance

### Regular Tasks
- Review and update pipeline dependencies
- Update base Docker images
- Review and optimize pipeline performance
- Update security scanning rules
- Archive old build artifacts

### Monthly Reviews
- Pipeline success rate
- Build duration trends
- Deployment frequency
- Test coverage trends
- Security scan results

## Additional Resources

- [Azure DevOps Documentation](https://docs.microsoft.com/azure/devops/)
- [Azure Kubernetes Service](https://docs.microsoft.com/azure/aks/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)

## Support

For issues or questions:
- DevOps Team: devops@flamoral.com
- SRE Team: sre@flamoral.com
- Engineering: engineering@flamoral.com

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Maintained By**: DevOps Team
