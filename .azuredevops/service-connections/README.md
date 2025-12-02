# Azure DevOps Service Connections Setup

This document describes all required service connections for the Flamoral Dating Platform Azure DevOps pipelines.

## Overview

Service connections enable Azure Pipelines to connect to external services like Azure, Docker registries, and Kubernetes clusters.

## Required Service Connections

### 1. Azure Resource Manager Service Connection

**Name:** `azure-datingapp-sp-connection`
**Type:** Azure Resource Manager
**Service Principal:** terraform-datingapp-sp
**Service Principal ID:** a85e4029-4e37-4399-9390-6e18922b38e7
**Subscription:** d8afbfb0-0c60-4d11-a1c7-a614235f5eb6

#### Purpose
- Deploy Azure resources
- Access Azure Key Vault
- Manage AKS credentials
- Run Terraform operations

#### Setup Steps

##### Option 1: Using Azure DevOps UI

1. Navigate to Project Settings → Service connections
2. Click "+ New service connection"
3. Select "Azure Resource Manager"
4. Choose "Service principal (manual)"
5. Fill in details:
   ```
   Subscription ID: d8afbfb0-0c60-4d11-a1c7-a614235f5eb6
   Subscription Name: Flamoral Dating App Subscription
   Service Principal ID: a85e4029-4e37-4399-9390-6e18922b38e7
   Service Principal Key: <your-service-principal-secret>
   Tenant ID: <your-azure-tenant-id>
   ```
6. Service connection name: `azure-datingapp-sp-connection`
7. Grant access permission to all pipelines (or specific ones)
8. Click "Verify and save"

##### Option 2: Using Azure CLI

```bash
# Create service connection using Azure CLI
az devops service-endpoint azurerm create \
  --azure-rm-service-principal-id a85e4029-4e37-4399-9390-6e18922b38e7 \
  --azure-rm-subscription-id d8afbfb0-0c60-4d11-a1c7-a614235f5eb6 \
  --azure-rm-subscription-name "Flamoral Dating App" \
  --azure-rm-tenant-id <your-tenant-id> \
  --name azure-datingapp-sp-connection \
  --organization https://dev.azure.com/citadelcloudmanagement \
  --project DatingPlatform
```

### 2. Terraform Service Connection

**Name:** `azure-terraform-sp-connection`
**Type:** Azure Resource Manager
**Service Principal:** terraform-datingapp-sp
**Service Principal ID:** a85e4029-4e37-4399-9390-6e18922b38e7

#### Purpose
- Terraform init, plan, and apply operations
- State file management in Azure Storage
- Resource provisioning

#### Setup
Same as Azure Resource Manager connection, but named specifically for Terraform operations.

### 3. Azure Container Registry Service Connection

**Name:** `acr-datingapp-connection`
**Type:** Docker Registry
**Registry:** flamoralacr.azurecr.io

#### Purpose
- Push Docker images to ACR
- Pull images for deployments
- Image vulnerability scanning

#### Setup Steps

##### Option 1: Using Azure DevOps UI

1. Navigate to Project Settings → Service connections
2. Click "+ New service connection"
3. Select "Docker Registry"
4. Choose "Azure Container Registry"
5. Select Azure subscription
6. Select ACR: `flamoralacr`
7. Service connection name: `acr-datingapp-connection`
8. Grant access to all pipelines
9. Click "Save"

##### Option 2: Using Service Principal

```bash
# Get ACR credentials
ACR_USERNAME=$(az acr credential show --name flamoralacr --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name flamoralacr --query passwords[0].value -o tsv)

# Create Docker registry service connection
az devops service-endpoint create \
  --service-endpoint-type dockerregistry \
  --name acr-datingapp-connection \
  --url https://flamoralacr.azurecr.io \
  --organization https://dev.azure.com/citadelcloudmanagement \
  --project DatingPlatform
```

##### Option 3: Using Managed Identity (Recommended)

```bash
# Enable ACR integration with AKS
az aks update \
  --name flamoral-aks \
  --resource-group flamoral-dating-app-rg \
  --attach-acr flamoralacr
```

### 4. Kubernetes Service Connection

**Name:** `aks-flamoral-connection`
**Type:** Kubernetes
**Cluster:** flamoral-aks

#### Purpose
- Deploy applications to AKS
- Run kubectl commands
- Helm deployments
- Access K8s resources

#### Setup Steps

##### Option 1: Using Azure DevOps UI

1. Navigate to Project Settings → Service connections
2. Click "+ New service connection"
3. Select "Kubernetes"
4. Choose "Azure Subscription"
5. Select Azure subscription: `azure-datingapp-sp-connection`
6. Select cluster: `flamoral-aks`
7. Select namespace: Leave empty for all namespaces
8. Service connection name: `aks-flamoral-connection`
9. Grant access to all pipelines
10. Click "Save"

##### Option 2: Using kubeconfig

```bash
# Get AKS credentials
az aks get-credentials \
  --resource-group flamoral-dating-app-rg \
  --name flamoral-aks \
  --file kubeconfig

# Create service connection with kubeconfig
# (Must be done via UI - upload kubeconfig file)
```

### 5. GitHub Service Connection (Optional)

**Name:** `github-flamoral-connection`
**Type:** GitHub

#### Purpose
- Pull source code from GitHub
- Trigger pipelines on GitHub events
- Update PR status

#### Setup
1. Navigate to Project Settings → Service connections
2. Click "+ New service connection"
3. Select "GitHub"
4. Authorize with GitHub OAuth or Personal Access Token
5. Service connection name: `github-flamoral-connection`

### 6. Snyk Security Scan Connection (Optional)

**Name:** `snyk-security-connection`
**Type:** Generic

#### Purpose
- Security vulnerability scanning
- Dependency analysis
- Container image scanning

#### Setup
1. Get Snyk API token from https://app.snyk.io/account
2. Create generic service connection with token
3. Or use variable group with SNYK_TOKEN

## Service Principal Permissions

The service principal `terraform-datingapp-sp` requires the following permissions:

### Azure RBAC Roles

```bash
# Contributor role on subscription
az role assignment create \
  --assignee a85e4029-4e37-4399-9390-6e18922b38e7 \
  --role Contributor \
  --scope /subscriptions/d8afbfb0-0c60-4d11-a1c7-a614235f5eb6

# User Access Administrator (for role assignments)
az role assignment create \
  --assignee a85e4029-4e37-4399-9390-6e18922b38e7 \
  --role "User Access Administrator" \
  --scope /subscriptions/d8afbfb0-0c60-4d11-a1c7-a614235f5eb6

# AcrPush for ACR
az role assignment create \
  --assignee a85e4029-4e37-4399-9390-6e18922b38e7 \
  --role AcrPush \
  --scope /subscriptions/d8afbfb0-0c60-4d11-a1c7-a614235f5eb6/resourceGroups/flamoral-dating-app-rg/providers/Microsoft.ContainerRegistry/registries/flamoralacr
```

### Key Vault Access Policies

```bash
# Grant access to all Key Vaults
for env in dev test staging prod; do
  az keyvault set-policy \
    --name flamoral-${env}-kv \
    --spn a85e4029-4e37-4399-9390-6e18922b38e7 \
    --secret-permissions get list set delete \
    --key-permissions get list create import \
    --certificate-permissions get list create import
done
```

### AKS Permissions

```bash
# Azure Kubernetes Service Cluster User Role
az role assignment create \
  --assignee a85e4029-4e37-4399-9390-6e18922b38e7 \
  --role "Azure Kubernetes Service Cluster User Role" \
  --scope /subscriptions/d8afbfb0-0c60-4d11-a1c7-a614235f5eb6/resourceGroups/flamoral-dating-app-rg/providers/Microsoft.ContainerService/managedClusters/flamoral-aks
```

## Service Connection Security

### Best Practices

1. **Use Managed Identities** where possible instead of service principals
2. **Rotate credentials** every 90 days
3. **Apply least privilege** - grant only necessary permissions
4. **Limit pipeline access** - don't grant access to all pipelines
5. **Enable audit logging** for all service connections
6. **Use separate service principals** for dev/prod
7. **Monitor service principal usage** in Azure AD

### Secret Management

```bash
# Create new service principal secret
az ad sp credential reset \
  --id a85e4029-4e37-4399-9390-6e18922b38e7 \
  --display-name "ADO Pipeline Secret" \
  --years 1

# List existing credentials
az ad sp credential list \
  --id a85e4029-4e37-4399-9390-6e18922b38e7
```

### Rotating Service Principal Secrets

1. Generate new secret in Azure AD:
   ```bash
   az ad sp credential reset \
     --id a85e4029-4e37-4399-9390-6e18922b38e7
   ```

2. Update service connection in Azure DevOps:
   - Go to Project Settings → Service connections
   - Select the connection
   - Click "Edit"
   - Update the secret
   - Click "Verify and save"

3. Test the connection with a simple pipeline

4. Delete old secret after verification

## Verifying Service Connections

### Test Azure Connection

```yaml
# test-azure-connection.yml
trigger: none

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: AzureCLI@2
    inputs:
      azureSubscription: 'azure-datingapp-sp-connection'
      scriptType: 'bash'
      scriptLocation: 'inlineScript'
      inlineScript: |
        az account show
        az group list --output table
```

### Test ACR Connection

```yaml
# test-acr-connection.yml
trigger: none

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: Docker@2
    inputs:
      command: login
      containerRegistry: 'acr-datingapp-connection'

  - script: |
      docker pull mcr.microsoft.com/hello-world
      docker tag mcr.microsoft.com/hello-world flamoralacr.azurecr.io/test:latest
      docker push flamoralacr.azurecr.io/test:latest
```

### Test Kubernetes Connection

```yaml
# test-k8s-connection.yml
trigger: none

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: Kubernetes@1
    inputs:
      connectionType: 'Kubernetes Service Connection'
      kubernetesServiceEndpoint: 'aks-flamoral-connection'
      command: 'get'
      arguments: 'nodes'
```

## Troubleshooting

### Common Issues

#### Service Principal Authentication Failed
```bash
# Verify service principal exists
az ad sp show --id a85e4029-4e37-4399-9390-6e18922b38e7

# Check role assignments
az role assignment list \
  --assignee a85e4029-4e37-4399-9390-6e18922b38e7 \
  --all
```

#### Cannot Access ACR
```bash
# Enable admin user (not recommended for production)
az acr update --name flamoralacr --admin-enabled true

# Or use managed identity
az aks update \
  --name flamoral-aks \
  --resource-group flamoral-dating-app-rg \
  --attach-acr flamoralacr
```

#### Kubernetes Connection Timeout
```bash
# Check AKS is running
az aks show \
  --name flamoral-aks \
  --resource-group flamoral-dating-app-rg \
  --query powerState

# Get credentials
az aks get-credentials \
  --resource-group flamoral-dating-app-rg \
  --name flamoral-aks \
  --overwrite-existing

# Test connection
kubectl get nodes
```

## Pipeline Permissions

Grant pipeline access to service connections:

```bash
# Using Azure CLI
az devops service-endpoint update \
  --id <service-connection-id> \
  --enable-for-all true \
  --organization https://dev.azure.com/citadelcloudmanagement \
  --project DatingPlatform
```

## References

- [Azure DevOps Service Connections](https://learn.microsoft.com/en-us/azure/devops/pipelines/library/service-endpoints)
- [Azure Resource Manager Service Connection](https://learn.microsoft.com/en-us/azure/devops/pipelines/library/connect-to-azure)
- [Docker Registry Service Connection](https://learn.microsoft.com/en-us/azure/devops/pipelines/library/service-endpoints?view=azure-devops&tabs=yaml#docker-registry-service-connection)
- [Kubernetes Service Connection](https://learn.microsoft.com/en-us/azure/devops/pipelines/library/service-endpoints?view=azure-devops&tabs=yaml#kubernetes-service-connection)
