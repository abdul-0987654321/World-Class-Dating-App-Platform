# Azure DevOps Variable Groups Configuration

This directory contains documentation for the required Azure DevOps Variable Groups for the Flamoral Dating Platform pipelines.

## Overview

Variable Groups store pipeline variables and secrets that can be shared across multiple pipelines. They should be created in Azure DevOps Library.

## Required Variable Groups

### 1. flamoral-shared-vars
Common variables shared across all pipelines.

```yaml
Variables:
  - ACR_USERNAME: <Azure Container Registry username>
  - ACR_PASSWORD: <Azure Container Registry password> (Secret)
  - AZURE_SUBSCRIPTION_ID: d8afbfb0-0c60-4d11-a1c7-a614235f5eb6
  - AZURE_TENANT_ID: <Your Azure Tenant ID>
  - AZURE_CLIENT_ID: a85e4029-4e37-4399-9390-6e18922b38e7 (terraform-datingapp-sp)
  - AZURE_CLIENT_SECRET: <Service Principal Secret> (Secret)
  - SNYK_TOKEN: <Snyk security scanning token> (Secret)
  - SONAR_TOKEN: <SonarQube token for code quality> (Secret)
```

### 2. flamoral-ci-vars
Variables specific to the CI pipeline.

```yaml
Variables:
  - BUILD_NUMBER: $(Build.BuildNumber)
  - SOURCE_BRANCH: $(Build.SourceBranch)
  - COMMIT_SHA: $(Build.SourceVersion)
  - DOCKER_BUILDKIT: 1
  - COMPOSE_DOCKER_CLI_BUILD: 1
```

### 3. flamoral-cd-vars
Variables specific to the CD pipeline.

```yaml
Variables:
  - DEPLOYMENT_TIMEOUT: 15m
  - HEALTH_CHECK_TIMEOUT: 300s
  - ROLLBACK_ENABLED: true
```

### 4. flamoral-terraform-vars
Variables for Terraform infrastructure pipeline.

```yaml
Variables:
  - TF_VERSION: 1.6.0
  - TF_LOG: ERROR
  - ARM_SKIP_PROVIDER_REGISTRATION: false
```

### 5. flamoral-dev-vars
Development environment specific variables.

```yaml
Variables:
  - ENVIRONMENT: dev
  - NAMESPACE: flamoral-dev
  - INGRESS_HOST: dev.flamoral.app
  - DB_HOST: flamoral-dev-postgres.postgres.database.azure.com
  - REDIS_HOST: flamoral-dev-redis.redis.cache.windows.net
  - MONGODB_HOST: flamoral-dev-cosmos.mongo.cosmos.azure.com
  - JWT_SECRET: <Dev JWT Secret> (Secret)
  - JWT_ACCESS_SECRET: <Dev Access Secret> (Secret)
  - JWT_REFRESH_SECRET: <Dev Refresh Secret> (Secret)
  - DB_PASSWORD: <Dev Database Password> (Secret)
  - REDIS_PASSWORD: <Dev Redis Password> (Secret)
  - MONGODB_PASSWORD: <Dev MongoDB Password> (Secret)
  - INTERNAL_SERVICE_KEY: <Dev Internal Service Key> (Secret)
  - STRIPE_SECRET_KEY: <Dev Stripe Key> (Secret)
  - SENDGRID_API_KEY: <Dev SendGrid Key> (Secret)
  - TWILIO_AUTH_TOKEN: <Dev Twilio Token> (Secret)
  - AZURE_STORAGE_CONNECTION_STRING: <Dev Storage Connection> (Secret)
  - GRAFANA_ADMIN_PASSWORD: <Dev Grafana Password> (Secret)
```

### 6. flamoral-test-vars
Test environment specific variables.

```yaml
Variables:
  - ENVIRONMENT: test
  - NAMESPACE: flamoral-test
  - INGRESS_HOST: test.flamoral.app
  - DB_HOST: flamoral-test-postgres.postgres.database.azure.com
  - REDIS_HOST: flamoral-test-redis.redis.cache.windows.net
  - MONGODB_HOST: flamoral-test-cosmos.mongo.cosmos.azure.com
  - JWT_SECRET: <Test JWT Secret> (Secret)
  - JWT_ACCESS_SECRET: <Test Access Secret> (Secret)
  - JWT_REFRESH_SECRET: <Test Refresh Secret> (Secret)
  - DB_PASSWORD: <Test Database Password> (Secret)
  - REDIS_PASSWORD: <Test Redis Password> (Secret)
  - MONGODB_PASSWORD: <Test MongoDB Password> (Secret)
```

### 7. flamoral-staging-vars
Staging environment specific variables.

```yaml
Variables:
  - ENVIRONMENT: staging
  - NAMESPACE: flamoral-staging
  - INGRESS_HOST: staging.flamoral.app
  - DB_HOST: flamoral-staging-postgres.postgres.database.azure.com
  - REDIS_HOST: flamoral-staging-redis.redis.cache.windows.net
  - MONGODB_HOST: flamoral-staging-cosmos.mongo.cosmos.azure.com
  - JWT_SECRET: <Staging JWT Secret> (Secret)
  - JWT_ACCESS_SECRET: <Staging Access Secret> (Secret)
  - JWT_REFRESH_SECRET: <Staging Refresh Secret> (Secret)
  - DB_PASSWORD: <Staging Database Password> (Secret)
  - REDIS_PASSWORD: <Staging Redis Password> (Secret)
  - MONGODB_PASSWORD: <Staging MongoDB Password> (Secret)
```

### 8. flamoral-prod-vars
Production environment specific variables.

```yaml
Variables:
  - ENVIRONMENT: production
  - NAMESPACE: flamoral-prod
  - INGRESS_HOST: flamoral.app
  - DB_HOST: flamoral-prod-postgres.postgres.database.azure.com
  - REDIS_HOST: flamoral-prod-redis.redis.cache.windows.net
  - MONGODB_HOST: flamoral-prod-cosmos.mongo.cosmos.azure.com
  - JWT_SECRET: <Production JWT Secret> (Secret)
  - JWT_ACCESS_SECRET: <Production Access Secret> (Secret)
  - JWT_REFRESH_SECRET: <Production Refresh Secret> (Secret)
  - DB_PASSWORD: <Production Database Password> (Secret)
  - REDIS_PASSWORD: <Production Redis Password> (Secret)
  - MONGODB_PASSWORD: <Production MongoDB Password> (Secret)
  - STRIPE_SECRET_KEY: <Production Stripe Key> (Secret)
  - SENDGRID_API_KEY: <Production SendGrid Key> (Secret)
  - TWILIO_AUTH_TOKEN: <Production Twilio Token> (Secret)
  - AZURE_STORAGE_CONNECTION_STRING: <Production Storage> (Secret)
```

### 9. flamoral-terraform-dev-vars
Terraform variables for dev environment.

```yaml
Variables:
  - TF_VAR_environment: dev
  - TF_VAR_location: eastus
  - TF_VAR_aks_node_count: 2
  - TF_VAR_aks_vm_size: Standard_D2s_v3
  - TF_VAR_postgres_sku: B_Gen5_1
  - TF_VAR_redis_sku: Basic
```

### 10. flamoral-terraform-test-vars
Terraform variables for test environment.

```yaml
Variables:
  - TF_VAR_environment: test
  - TF_VAR_location: eastus
  - TF_VAR_aks_node_count: 2
  - TF_VAR_aks_vm_size: Standard_D2s_v3
  - TF_VAR_postgres_sku: GP_Gen5_2
  - TF_VAR_redis_sku: Standard
```

### 11. flamoral-terraform-staging-vars
Terraform variables for staging environment.

```yaml
Variables:
  - TF_VAR_environment: staging
  - TF_VAR_location: eastus
  - TF_VAR_aks_node_count: 3
  - TF_VAR_aks_vm_size: Standard_D4s_v3
  - TF_VAR_postgres_sku: GP_Gen5_4
  - TF_VAR_redis_sku: Standard
```

### 12. flamoral-terraform-prod-vars
Terraform variables for production environment.

```yaml
Variables:
  - TF_VAR_environment: production
  - TF_VAR_location: eastus
  - TF_VAR_aks_node_count: 5
  - TF_VAR_aks_vm_size: Standard_D8s_v3
  - TF_VAR_postgres_sku: GP_Gen5_8
  - TF_VAR_redis_sku: Premium
  - TF_VAR_enable_autoscaling: true
  - TF_VAR_min_nodes: 5
  - TF_VAR_max_nodes: 50
```

### 13. flamoral-infra-vars
Infrastructure deployment specific variables.

```yaml
Variables:
  - HELM_VERSION: 3.12.0
  - KUBECTL_VERSION: latest
  - CERT_MANAGER_VERSION: v1.13.0
  - NGINX_INGRESS_VERSION: 4.8.0
  - PROMETHEUS_VERSION: 51.0.0
```

## Creating Variable Groups

### Using Azure CLI

```bash
# Login to Azure DevOps
az devops login

# Set default organization and project
az devops configure --defaults organization=https://dev.azure.com/citadelcloudmanagement project=DatingPlatform

# Create a variable group
az pipelines variable-group create \
  --name flamoral-shared-vars \
  --variables \
    AZURE_SUBSCRIPTION_ID=d8afbfb0-0c60-4d11-a1c7-a614235f5eb6 \
    AZURE_CLIENT_ID=a85e4029-4e37-4399-9390-6e18922b38e7

# Add secret variables
az pipelines variable-group variable create \
  --group-id <group-id> \
  --name ACR_PASSWORD \
  --value <password> \
  --secret true
```

### Using Azure DevOps UI

1. Navigate to: https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_library
2. Click "+ Variable group"
3. Enter the group name (e.g., `flamoral-shared-vars`)
4. Add variables:
   - Click "+ Add" for each variable
   - Toggle the lock icon for secret variables
5. Link to Azure Key Vault (recommended for secrets):
   - Toggle "Link secrets from an Azure key vault as variables"
   - Select Azure subscription
   - Select Key Vault name
   - Authorize and select secrets
6. Click "Save"

## Using Azure Key Vault Integration

Instead of storing secrets directly in Variable Groups, it's recommended to use Azure Key Vault integration:

1. Create Key Vaults for each environment:
   ```bash
   az keyvault create \
     --name flamoral-dev-kv \
     --resource-group flamoral-dating-app-rg \
     --location eastus
   ```

2. Add secrets to Key Vault:
   ```bash
   az keyvault secret set \
     --vault-name flamoral-dev-kv \
     --name JWT-SECRET \
     --value "your-secret-value"
   ```

3. Grant Service Principal access:
   ```bash
   az keyvault set-policy \
     --name flamoral-dev-kv \
     --spn a85e4029-4e37-4399-9390-6e18922b38e7 \
     --secret-permissions get list
   ```

4. Link Key Vault to Variable Group in Azure DevOps UI

## Security Best Practices

1. **Never commit secrets to source control**
2. **Use Azure Key Vault** for all sensitive data
3. **Rotate secrets regularly** (every 90 days)
4. **Use separate credentials** for each environment
5. **Limit variable group permissions** to specific teams
6. **Enable audit logging** for variable group changes
7. **Use managed identities** where possible
8. **Implement least privilege access** for service principals

## Variable Naming Conventions

- Use UPPER_SNAKE_CASE for environment variables
- Prefix environment-specific variables with environment name
- Use descriptive names (e.g., `DB_PASSWORD` not `DBPWD`)
- Suffix secret variables with `_SECRET` or `_KEY`
- Group related variables with common prefixes

## Updating Variable Groups

To update variable groups programmatically:

```bash
# Update a variable
az pipelines variable-group variable update \
  --group-id <group-id> \
  --name <variable-name> \
  --value <new-value>

# Delete a variable
az pipelines variable-group variable delete \
  --group-id <group-id> \
  --name <variable-name>
```

## Troubleshooting

### Pipeline Cannot Access Variable Group

1. Check pipeline permissions:
   - Go to Library → Variable Groups
   - Select the variable group
   - Click "Pipeline permissions"
   - Add the pipeline

2. Verify service connection authorization

3. Check Azure Key Vault access policies

### Secret Variables Not Loading

1. Verify Key Vault connection
2. Check service principal permissions
3. Ensure secrets exist in Key Vault
4. Review pipeline logs for authentication errors

## References

- [Azure DevOps Variable Groups](https://learn.microsoft.com/en-us/azure/devops/pipelines/library/variable-groups)
- [Azure Key Vault Integration](https://learn.microsoft.com/en-us/azure/devops/pipelines/library/variable-groups?view=azure-devops&tabs=yaml#link-secrets-from-an-azure-key-vault)
- [Service Connections](https://learn.microsoft.com/en-us/azure/devops/pipelines/library/service-endpoints)
