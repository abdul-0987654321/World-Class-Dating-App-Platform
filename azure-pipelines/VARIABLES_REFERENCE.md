# Pipeline Variables Reference

Complete reference for all Azure DevOps pipeline variables and variable groups used in the Flamoral Dating App Platform.

## Variable Groups

### flamoral-build-variables
**Purpose**: Build configuration for all services
**Scope**: CI pipelines

| Variable | Value | Type | Description |
|----------|-------|------|-------------|
| nodeVersion | 20.x | Plain Text | Node.js version for builds |
| goVersion | 1.21 | Plain Text | Go version for builds |
| pythonVersion | 3.11 | Plain Text | Python version for builds |
| buildConfiguration | Release | Plain Text | Build configuration type |
| npm_config_cache | $(Pipeline.Workspace)/.npm | Plain Text | npm cache directory |
| PIP_CACHE_DIR | $(Pipeline.Workspace)/.pip | Plain Text | pip cache directory |

### flamoral-test-variables
**Purpose**: Test execution configuration
**Scope**: Test pipelines

| Variable | Value | Type | Description |
|----------|-------|------|-------------|
| nodeVersion | 20.x | Plain Text | Node.js version for tests |
| goVersion | 1.21 | Plain Text | Go version for tests |
| pythonVersion | 3.11 | Plain Text | Python version for tests |
| testResultsDirectory | $(Build.ArtifactStagingDirectory)/test-results | Plain Text | Test results output |
| TEST_DATABASE_URL | postgresql://postgres:testpass@localhost:5432/test | Secret | Test database connection |
| TEST_REDIS_URL | redis://localhost:6379 | Secret | Test Redis connection |
| TEST_MONGODB_URL | mongodb://admin:testpass@localhost:27017 | Secret | Test MongoDB connection |
| JEST_JUNIT_OUTPUT_DIR | $(testResultsDirectory) | Plain Text | Jest JUnit output directory |

### flamoral-docker-variables
**Purpose**: Docker image build and push configuration
**Scope**: Docker build pipelines

| Variable | Value | Type | Description |
|----------|-------|------|-------------|
| containerRegistry | flamoral-acr | Plain Text | ACR service connection name |
| containerRegistryUrl | flamoralacr.azurecr.io | Plain Text | ACR URL |
| imagePrefix | flamoral | Plain Text | Image name prefix |
| dockerBuildArgs | --build-arg NODE_ENV=production | Plain Text | Additional Docker build args |
| DOCKER_BUILDKIT | 1 | Plain Text | Enable BuildKit |

### flamoral-dev-variables
**Purpose**: Development environment configuration
**Scope**: Dev deployment pipeline

| Variable | Value | Type | Description |
|----------|-------|------|-------------|
| environment | dev | Plain Text | Environment name |
| namespace | flamoral-dev | Plain Text | Kubernetes namespace |
| kubernetesServiceConnection | flamoral-aks-dev | Plain Text | AKS service connection |
| containerRegistryUrl | flamoralacr.azurecr.io | Plain Text | Container registry URL |
| imagePrefix | flamoral | Plain Text | Image prefix |
| DATABASE_URL | postgresql://... | Secret | PostgreSQL connection string |
| REDIS_URL | redis://... | Secret | Redis connection string |
| MONGODB_URL | mongodb://... | Secret | MongoDB connection string |
| JWT_SECRET | [auto-generated] | Secret | JWT signing secret |
| ENCRYPTION_KEY | [auto-generated] | Secret | Data encryption key |
| AWS_S3_BUCKET | flamoral-dev-media | Secret | S3 bucket for media |
| AWS_ACCESS_KEY_ID | [AWS key] | Secret | AWS access key |
| AWS_SECRET_ACCESS_KEY | [AWS secret] | Secret | AWS secret key |
| SENDGRID_API_KEY | [SendGrid key] | Secret | Email service API key |
| STRIPE_SECRET_KEY | [Stripe test key] | Secret | Payment processing key |
| AZURE_STORAGE_CONNECTION | [connection string] | Secret | Azure Storage connection |

### flamoral-test-variables
**Purpose**: Test/Staging environment configuration
**Scope**: Test deployment pipeline

| Variable | Value | Type | Description |
|----------|-------|------|-------------|
| environment | test | Plain Text | Environment name |
| namespace | flamoral-test | Plain Text | Kubernetes namespace |
| kubernetesServiceConnection | flamoral-aks-test | Plain Text | AKS service connection |
| containerRegistryUrl | flamoralacr.azurecr.io | Plain Text | Container registry URL |
| imagePrefix | flamoral | Plain Text | Image prefix |
| DATABASE_URL | postgresql://... | Secret | PostgreSQL connection string |
| REDIS_URL | redis://... | Secret | Redis connection string |
| MONGODB_URL | mongodb://... | Secret | MongoDB connection string |
| JWT_SECRET | [auto-generated] | Secret | JWT signing secret |
| ENCRYPTION_KEY | [auto-generated] | Secret | Data encryption key |
| AWS_S3_BUCKET | flamoral-test-media | Secret | S3 bucket for media |
| AWS_ACCESS_KEY_ID | [AWS key] | Secret | AWS access key |
| AWS_SECRET_ACCESS_KEY | [AWS secret] | Secret | AWS secret key |
| SENDGRID_API_KEY | [SendGrid key] | Secret | Email service API key |
| STRIPE_SECRET_KEY | [Stripe test key] | Secret | Payment processing key |
| AZURE_STORAGE_CONNECTION | [connection string] | Secret | Azure Storage connection |
| k6CloudToken | [k6 token] | Secret | k6 cloud token for load tests |
| OWASP_ZAP_API_KEY | [ZAP key] | Secret | OWASP ZAP API key |

### flamoral-prod-variables
**Purpose**: Production environment configuration
**Scope**: Production deployment pipeline

| Variable | Value | Type | Description |
|----------|-------|------|-------------|
| environment | prod | Plain Text | Environment name |
| namespace | flamoral-prod | Plain Text | Kubernetes namespace |
| kubernetesServiceConnection | flamoral-aks-prod | Plain Text | AKS service connection |
| containerRegistryUrl | flamoralacr.azurecr.io | Plain Text | Container registry URL |
| imagePrefix | flamoral | Plain Text | Image prefix |
| rollbackEnabled | true | Plain Text | Enable automatic rollback |
| DATABASE_URL | postgresql://... | Secret | PostgreSQL connection string |
| DATABASE_URL_REPLICA | postgresql://... | Secret | Read replica connection |
| REDIS_URL | redis://... | Secret | Redis primary connection |
| REDIS_REPLICA_URL | redis://... | Secret | Redis replica connection |
| MONGODB_URL | mongodb://... | Secret | MongoDB connection string |
| JWT_SECRET | [auto-generated] | Secret | JWT signing secret |
| ENCRYPTION_KEY | [auto-generated] | Secret | Data encryption key |
| AWS_S3_BUCKET | flamoral-prod-media | Secret | S3 bucket for media |
| AWS_CLOUDFRONT_DISTRIBUTION | [distribution ID] | Secret | CloudFront distribution |
| AWS_ACCESS_KEY_ID | [AWS key] | Secret | AWS access key |
| AWS_SECRET_ACCESS_KEY | [AWS secret] | Secret | AWS secret key |
| SENDGRID_API_KEY | [SendGrid key] | Secret | Email service API key |
| STRIPE_SECRET_KEY | [Stripe live key] | Secret | Payment processing key |
| STRIPE_WEBHOOK_SECRET | [Stripe webhook] | Secret | Stripe webhook secret |
| AZURE_STORAGE_CONNECTION | [connection string] | Secret | Azure Storage connection |
| AZURE_KEY_VAULT_URL | https://flamoral-kv.vault.azure.net | Secret | Azure Key Vault URL |
| TWILIO_ACCOUNT_SID | [Twilio SID] | Secret | Twilio account SID |
| TWILIO_AUTH_TOKEN | [Twilio token] | Secret | Twilio auth token |
| FIREBASE_SERVICE_ACCOUNT | [JSON key] | Secret | Firebase service account |
| SENTRY_DSN | [Sentry DSN] | Secret | Sentry error tracking |
| NEW_RELIC_LICENSE_KEY | [New Relic key] | Secret | New Relic monitoring |

## Pipeline-Specific Variables

### Build All Services Pipeline

| Variable | Value | Description |
|----------|-------|-------------|
| Build.BuildId | [auto] | Unique build identifier |
| Build.BuildNumber | [auto] | Build number |
| Build.SourceBranchName | [auto] | Branch name |
| Build.SourceVersion | [auto] | Git commit SHA |
| Build.RequestedFor | [auto] | User who triggered build |
| System.DefaultWorkingDirectory | [auto] | Pipeline workspace |

### Test All Services Pipeline

| Variable | Value | Description |
|----------|-------|-------------|
| Agent.OS | [auto] | Operating system (Linux) |
| Pipeline.Workspace | [auto] | Pipeline workspace directory |
| Build.ArtifactStagingDirectory | [auto] | Artifact staging directory |
| CI | true | CI environment flag |

### Docker Build Pipeline

| Variable | Value | Description |
|----------|-------|-------------|
| Build.BuildId | [auto] | Used for image tagging |
| Build.SourceVersion | [auto] | Git SHA for image tagging |
| Build.SourceBranchName | [auto] | Branch name for image tagging |

### Deployment Pipelines

| Variable | Value | Description |
|----------|-------|-------------|
| resources.pipeline.docker-build.runID | [auto] | Docker build pipeline run ID |
| Environment.Name | [auto] | Target environment name |
| Environment.ResourceName | [auto] | Target resource name |

## Template Variables

### node-build-template.yml

| Parameter | Default | Description |
|-----------|---------|-------------|
| serviceName | (required) | Service name |
| serviceDirectory | (required) | Service directory path |
| nodeVersion | 20.x | Node.js version |
| runTests | true | Run tests flag |
| publishCoverage | true | Publish coverage flag |
| buildCommand | npm run build | Build command |

### go-build-template.yml

| Parameter | Default | Description |
|-----------|---------|-------------|
| serviceName | (required) | Service name |
| serviceDirectory | (required) | Service directory path |
| goVersion | 1.21 | Go version |
| runTests | true | Run tests flag |
| publishCoverage | true | Publish coverage flag |

### python-build-template.yml

| Parameter | Default | Description |
|-----------|---------|-------------|
| serviceName | (required) | Service name |
| serviceDirectory | (required) | Service directory path |
| pythonVersion | 3.11 | Python version |
| runTests | true | Run tests flag |
| publishCoverage | true | Publish coverage flag |

### docker-build-template.yml

| Parameter | Default | Description |
|-----------|---------|-------------|
| serviceName | (required) | Service name |
| dockerfilePath | (required) | Dockerfile path |
| buildContext | . | Docker build context |
| containerRegistry | flamoral-acr | ACR service connection |
| imageRepository | (required) | Image repository name |
| tagWithBuildId | true | Tag with build ID |
| tagWithGitSha | true | Tag with git SHA |

### k8s-deploy-template.yml

| Parameter | Default | Description |
|-----------|---------|-------------|
| serviceName | (required) | Service name |
| environment | (required) | Target environment |
| namespace | (required) | Kubernetes namespace |
| kubernetesServiceConnection | (required) | K8s service connection |
| imageRepository | (required) | Image repository |
| imageTag | $(Build.BuildId) | Image tag |
| manifestsPath | k8s/base | K8s manifests path |
| useHelm | false | Use Helm flag |
| healthCheckUrl | '' | Health check URL |
| waitForRollout | true | Wait for rollout flag |

## Service-Specific Environment Variables

### All Node.js Services

```yaml
NODE_ENV: production
PORT: 3000
LOG_LEVEL: info
CORS_ORIGINS: https://flamoral.com,https://app.flamoral.com
```

### Auth Service

```yaml
JWT_SECRET: [secret]
JWT_EXPIRES_IN: 7d
REFRESH_TOKEN_EXPIRES_IN: 30d
PASSWORD_BCRYPT_ROUNDS: 12
MAX_LOGIN_ATTEMPTS: 5
LOCKOUT_DURATION: 900
```

### Payment Service

```yaml
STRIPE_SECRET_KEY: [secret]
STRIPE_WEBHOOK_SECRET: [secret]
PAYMENT_CURRENCY: USD
SUBSCRIPTION_PRICES_API: https://api.flamoral.com/prices
```

### Media Service

```yaml
AWS_S3_BUCKET: [bucket-name]
AWS_CLOUDFRONT_DISTRIBUTION: [distribution-id]
MAX_FILE_SIZE: 10485760
ALLOWED_FILE_TYPES: jpg,jpeg,png,gif,mp4
IMAGE_OPTIMIZATION_QUALITY: 85
```

### Messaging Service

```yaml
WEBSOCKET_PORT: 8080
MESSAGE_RETENTION_DAYS: 30
MAX_MESSAGE_LENGTH: 5000
ENABLE_MEDIA_MESSAGES: true
```

### Realtime Service (Go)

```yaml
WEBSOCKET_PORT: 8080
REDIS_URL: [url]
MAX_CONNECTIONS: 10000
HEARTBEAT_INTERVAL: 30s
CONNECTION_TIMEOUT: 60s
```

### AI Services (Python)

```yaml
MODEL_PATH: /models
BATCH_SIZE: 32
MAX_WORKERS: 4
CACHE_TTL: 3600
ENABLE_GPU: true
```

## Azure Key Vault Secrets

Secrets stored in Azure Key Vault and referenced in pipelines:

| Secret Name | Used By | Description |
|-------------|---------|-------------|
| DATABASE-URL-DEV | Dev deployment | Dev database connection |
| DATABASE-URL-TEST | Test deployment | Test database connection |
| DATABASE-URL-PROD | Prod deployment | Prod database connection |
| REDIS-URL-PROD | Prod deployment | Redis connection string |
| JWT-SECRET-PROD | Prod deployment | JWT signing secret |
| STRIPE-SECRET-KEY | Payment service | Stripe API key |
| AWS-ACCESS-KEY | Media service | AWS access key |
| AWS-SECRET-KEY | Media service | AWS secret key |
| SENDGRID-API-KEY | Notification service | SendGrid API key |
| FIREBASE-SERVICE-ACCOUNT | Notification service | Firebase credentials |

## Variable Naming Conventions

### General Rules
- Use UPPER_CASE for environment variables
- Use camelCase for pipeline variables
- Use kebab-case for file names
- Prefix secrets with service name: `AUTH_JWT_SECRET`
- Suffix URLs with `-URL`: `DATABASE_URL`
- Suffix API keys with `-KEY` or `-API-KEY`

### Environment Prefixes
- `DEV_` - Development environment
- `TEST_` - Test environment
- `PROD_` - Production environment
- `SHARED_` - Shared across environments

### Service Prefixes
- `AUTH_` - Auth service
- `USER_` - User service
- `PAYMENT_` - Payment service
- `MEDIA_` - Media service
- `MESSAGING_` - Messaging service

## Security Best Practices

1. **Never commit secrets to source control**
   - Use variable groups for secrets
   - Mark variables as secret in Azure DevOps
   - Use Azure Key Vault for sensitive data

2. **Rotate secrets regularly**
   - Database passwords: Every 90 days
   - API keys: Every 180 days
   - JWT secrets: Every 365 days

3. **Use environment-specific secrets**
   - Different secrets for dev/test/prod
   - Never reuse production secrets in other environments

4. **Limit secret access**
   - Use RBAC for variable groups
   - Restrict access to production variables
   - Audit secret access regularly

5. **Secret format validation**
   - Validate secret format before use
   - Check secret expiration
   - Test secrets in isolated environment

## Variable Management Scripts

### Export Variable Group
```bash
az pipelines variable-group list \
  --org https://dev.azure.com/flamoral \
  --project FlavoralApp \
  --output table
```

### Create Variable Group
```bash
az pipelines variable-group create \
  --org https://dev.azure.com/flamoral \
  --project FlavoralApp \
  --name flamoral-dev-variables \
  --variables environment=dev namespace=flamoral-dev
```

### Update Variable
```bash
az pipelines variable-group variable update \
  --org https://dev.azure.com/flamoral \
  --project FlavoralApp \
  --group-id <group-id> \
  --name DATABASE_URL \
  --value "postgresql://..." \
  --secret true
```

### Link to Key Vault
```bash
az pipelines variable-group create \
  --org https://dev.azure.com/flamoral \
  --project FlavoralApp \
  --name flamoral-keyvault-secrets \
  --authorize true \
  --variables \
  DATABASE_URL=$(az keyvault secret show --vault-name flamoral-kv --name DATABASE-URL-PROD --query value -o tsv)
```

## Troubleshooting Variables

### Variable Not Found
1. Check variable group is linked to pipeline
2. Verify variable name spelling
3. Check variable scope (pipeline/stage/job)
4. Ensure variable group permissions

### Secret Not Accessible
1. Verify variable marked as secret
2. Check Azure Key Vault permissions
3. Validate service connection
4. Check variable group authorization

### Variable Not Updating
1. Clear pipeline cache
2. Re-run pipeline
3. Verify variable group version
4. Check variable precedence

## Additional Resources

- [Azure DevOps Variables](https://docs.microsoft.com/azure/devops/pipelines/process/variables)
- [Variable Groups](https://docs.microsoft.com/azure/devops/pipelines/library/variable-groups)
- [Azure Key Vault](https://docs.microsoft.com/azure/key-vault/)
- [Secret Management](https://docs.microsoft.com/azure/devops/pipelines/security/secrets)

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Maintained By**: DevOps Team
