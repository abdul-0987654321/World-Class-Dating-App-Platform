# Pipeline Templates Reference

## Overview

This directory contains reusable Azure DevOps pipeline templates for the Flamoral Dating Platform CD pipeline.

## Templates

### 🚀 Deployment Templates

#### `helm-deploy.yml`
**Purpose:** Standard Helm-based deployment with integrated migrations and health checks

**Parameters:**
```yaml
environment: string          # Environment name (dev, test, production)
namespace: string           # Kubernetes namespace
azureServiceConnection: string
aksClusterName: string
resourceGroup: string
releaseName: string         # Helm release name
imageTag: string           # Docker image tag
imageRegistry: string      # ACR registry URL
apiHost: string           # API hostname for health checks
runMigrations: boolean    # Run database migrations (default: true)
runHealthChecks: boolean  # Run post-deployment health checks (default: true)
additionalValues: string  # Additional Helm values
```

**Usage:**
```yaml
- template: templates/helm-deploy.yml
  parameters:
    environment: production
    namespace: flamoral-prod
    releaseName: flamoral-prod
    imageTag: $(Build.BuildId)
    apiHost: api.flamoral.app
```

---

#### `canary-deployment.yml`
**Purpose:** Progressive canary deployment with traffic shifting

**Parameters:**
```yaml
environment: string
namespace: string
azureServiceConnection: string
aksClusterName: string
resourceGroup: string
releaseName: string
imageTag: string
imageRegistry: string
canaryPercentage: number   # Percentage of traffic (default: 10)
additionalValues: string
```

**Usage:**
```yaml
- template: templates/canary-deployment.yml
  parameters:
    environment: production
    namespace: flamoral-prod
    releaseName: flamoral-prod-canary
    imageTag: $(Build.BuildId)
    canaryPercentage: 10
```

**Features:**
- Automatic replica calculation based on percentage
- Traffic split configuration
- 5-minute canary monitoring
- Pod health validation
- Automatic failure detection

---

### 🔧 Utility Templates

#### `database-migration.yml`
**Purpose:** Execute database migrations before deployment

**Parameters:**
```yaml
environment: string
namespace: string
azureServiceConnection: string
aksClusterName: string
resourceGroup: string
imageTag: string
imageRegistry: string
dryRun: boolean           # Test migrations without applying (default: false)
```

**Usage:**
```yaml
- template: templates/database-migration.yml
  parameters:
    environment: production
    namespace: flamoral-prod
    imageTag: $(Build.BuildId)
    dryRun: false
```

**Features:**
- Kubernetes Job-based execution
- Automatic cleanup of previous jobs
- Migration verification
- Detailed logging
- Database connection validation

---

#### `health-check.yml`
**Purpose:** Comprehensive health validation after deployment

**Parameters:**
```yaml
environment: string
apiHost: string
namespace: string
azureServiceConnection: string
aksClusterName: string
resourceGroup: string
maxRetries: number        # Max health check attempts (default: 10)
retryDelay: number        # Delay between retries in seconds (default: 30)
slot: string             # Deployment slot for blue-green (optional)
```

**Usage:**
```yaml
- template: templates/health-check.yml
  parameters:
    environment: production
    apiHost: api.flamoral.app
    namespace: flamoral-prod
    maxRetries: 10
    retryDelay: 30
```

**Validates:**
- ✅ Pod readiness and availability
- ✅ HTTP health endpoints (/health)
- ✅ Readiness endpoints (/ready)
- ✅ API functionality tests
- ✅ Performance baselines (response time)
- ✅ Service connectivity

---

#### `rollback-deployment.yml`
**Purpose:** Automated rollback mechanism for failed deployments

**Parameters:**
```yaml
environment: string
namespace: string
azureServiceConnection: string
aksClusterName: string
resourceGroup: string
releaseName: string
rollbackDatabase: boolean  # Also rollback database migrations (default: false)
imageRegistry: string
imageTag: string
```

**Usage:**
```yaml
- template: templates/rollback-deployment.yml
  parameters:
    environment: production
    namespace: flamoral-prod
    releaseName: flamoral-prod-green
    rollbackDatabase: false
```

**Features:**
- Helm release rollback
- Optional database migration rollback
- Post-rollback verification
- Health check validation
- Detailed rollback reporting

---

### 🏗️ Build Templates

#### `docker-build-push.yml`
**Purpose:** Build and push Docker images to Azure Container Registry

**Parameters:**
```yaml
dockerfilePath: string
imageName: string
imageTag: string
buildContext: string
azureServiceConnection: string
```

---

#### `node-build.yml`
**Purpose:** Build Node.js applications with testing

**Parameters:**
```yaml
nodeVersion: string
workingDirectory: string
runTests: boolean
runLint: boolean
```

---

### ⚙️ Variable Templates

#### `variables-common.yml`
**Contains:**
- Azure subscription IDs
- Service connection names
- ACR registry URLs
- AKS cluster names
- Default Helm versions

#### `variables-dev.yml`
**Contains:**
- Dev environment configuration
- Single replica setup
- No autoscaling
- Dev-specific hostnames

#### `variables-test.yml`
**Contains:**
- Test environment configuration
- Multi-replica setup (2-5)
- Autoscaling enabled
- Test-specific hostnames

#### `variables-prod.yml`
**Contains:**
- Production environment configuration
- High-availability setup (5-50 replicas)
- Autoscaling enabled
- Production resource limits
- Production hostnames

---

## Template Combinations

### Standard Deployment Flow
```yaml
steps:
  # 1. Run database migrations
  - template: templates/database-migration.yml
    parameters: { ... }

  # 2. Deploy application
  - template: templates/helm-deploy.yml
    parameters: { ... }

  # 3. Validate deployment
  - template: templates/health-check.yml
    parameters: { ... }
```

### Canary Deployment Flow
```yaml
steps:
  # 1. Deploy canary
  - template: templates/canary-deployment.yml
    parameters:
      canaryPercentage: 10

  # 2. Validate canary
  - template: templates/health-check.yml
    parameters:
      slot: canary

  # 3. Promote or rollback
  - template: templates/canary-deployment.yml  # Increase to 50%
    parameters:
      canaryPercentage: 50
```

### Rollback on Failure
```yaml
jobs:
  - deployment: Deploy
    steps:
      - template: templates/helm-deploy.yml

  - deployment: Rollback
    dependsOn: Deploy
    condition: failed()
    steps:
      - template: templates/rollback-deployment.yml
```

---

## Best Practices

### 1. Always Use Health Checks
```yaml
- template: templates/helm-deploy.yml
  parameters:
    runHealthChecks: true  # Default, but be explicit
```

### 2. Test Migrations First
```yaml
# Test environment
- template: templates/database-migration.yml
  parameters:
    dryRun: true  # Test first

# Then apply
- template: templates/database-migration.yml
  parameters:
    dryRun: false
```

### 3. Configure Appropriate Timeouts
```yaml
- template: templates/health-check.yml
  parameters:
    maxRetries: 20        # More retries for production
    retryDelay: 30        # Longer delays for stability
```

### 4. Use Slot-Specific Health Checks
```yaml
# For blue-green deployments
- template: templates/health-check.yml
  parameters:
    slot: $(newSlot)  # Check specific deployment slot
```

### 5. Enable Database Rollback for Critical Deployments
```yaml
- template: templates/rollback-deployment.yml
  parameters:
    rollbackDatabase: true  # For schema changes
```

---

## Error Handling

### Migration Failures
- Migration job fails → Deployment stops
- Logs available via: `kubectl logs job/database-migration-<env>`
- Automatic cleanup of failed jobs

### Health Check Failures
- Max retries exceeded → Deployment marked as failed
- Triggers automatic rollback (if configured)
- Detailed logs in pipeline output

### Rollback Scenarios
- Automatic: On deployment or validation failure
- Manual: Can be triggered via separate pipeline run
- Database rollback: Optional, requires explicit configuration

---

## Variables Reference

### Required Variables (Set in Variable Groups)

**flamoral-shared-vars:**
- `azureServiceConnection`
- `acrLoginServer`
- `aksClusterName`
- `resourceGroup`
- `helmVersion`

**flamoral-cd-vars:**
- `ACR_USERNAME`
- `ACR_PASSWORD`
- `nodeVersion`

### Environment-Specific Variables

Each environment template provides:
- `environment`
- `namespace`
- `ingressHost`
- `apiHost`
- `replicaCount`
- `autoscalingEnabled`
- `autoscalingMinReplicas` (test, prod)
- `autoscalingMaxReplicas` (test, prod)

---

## Troubleshooting

### Template Not Found
```
Error: Template not found: templates/xyz.yml
```
**Solution:** Verify template path relative to pipeline file

### Parameter Validation Failed
```
Error: Missing required parameter 'environment'
```
**Solution:** Ensure all required parameters are provided

### Job Timeout
```
Error: Job timed out after 300s
```
**Solution:** Increase timeout in template or check for hung processes

---

## Version History

- **v1.0** - Initial templates with basic deployment
- **v2.0** - Added health checks and migrations
- **v3.0** - Added canary deployment support
- **v4.0** - Enhanced rollback mechanisms (current)

---

## Contributing

When creating new templates:
1. Document all parameters with types and defaults
2. Include usage examples
3. Add error handling
4. Test in dev environment first
5. Update this README

---

## Support

Questions about templates? Contact:
- DevOps Team: devops@flamoral.com
- Pipeline Documentation: See main CD_PIPELINE_GUIDE.md
