# Azure DevOps Pipeline Setup - Status Report

## Completed Steps

### 1. Variable Groups Created
| Group Name | ID | Variables |
|------------|-----|-----------|
| flamoral-shared-vars | 12 | nodeVersion, goVersion, pythonVersion, terraformVersion, helmVersion |
| flamoral-ci-vars | 13 | acrName, acrLoginServer, imagePrefix, vmImageName |
| flamoral-cd-vars | 14 | aksClusterName, resourceGroup, azureServiceConnection, kubernetesServiceConnection, dockerRegistryServiceConnection, ACR_USERNAME, ACR_PASSWORD (secret) |
| flamoral-terraform-vars | 15 | tfStateResourceGroup, tfStateStorageAccount, tfStateContainer |
| flamoral-security-vars | 16 | scanEnabled |

### 2. Pipelines Created
| Pipeline Name | ID | YAML Path |
|---------------|-----|-----------|
| Flamoral-CI-Pipeline | 11 | pipelines/ci-pipeline.yml |
| Flamoral-CD-Pipeline | 12 | pipelines/cd-pipeline.yml |
| Flamoral-Infrastructure-Pipeline | 13 | pipelines/infrastructure-pipeline.yml |
| Flamoral-Security-Pipeline | 14 | pipelines/security-pipeline.yml |

### 3. Pipeline Files Pushed to Repository
All pipeline files are now in Azure Repos at:
- https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_git/DatingPlatform?path=/pipelines

## Manual Steps Required

### Step 1: Create Service Connections

Go to: https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_settings/adminservices

Create these service connections:

#### Azure RM Service Connection
1. Click "New service connection"
2. Select "Azure Resource Manager"
3. Select "Service principal (automatic)"
4. Configure:
   - **Name:** `azure-terraform-sp-connection`
   - **Subscription:** Apply (ba233460-2dbe-4603-a594-68f93ec9deb3)
   - **Resource Group:** Leave empty (subscription-level access)
   - **Grant access permission to all pipelines:** Yes

#### Docker Registry (ACR) Connection
1. Click "New service connection"
2. Select "Docker Registry"
3. Select "Azure Container Registry"
4. Configure:
   - **Name:** `acr-datingapp-connection`
   - **Subscription:** Apply
   - **Azure Container Registry:** flamoralacr8eq5eg
   - **Grant access permission to all pipelines:** Yes

#### Kubernetes (AKS) Connection
1. Click "New service connection"
2. Select "Kubernetes"
3. Select "Azure subscription"
4. Configure:
   - **Name:** `aks-flamoral-connection`
   - **Subscription:** Apply
   - **Cluster:** datingapp-dev-aks
   - **Namespace:** default (or leave empty for all)
   - **Grant access permission to all pipelines:** Yes

### Step 2: Configure Environment Approval Gates

Go to: https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_environments

Environments will be auto-created when pipelines run. After creation:

#### For flamoral-staging and flamoral-production:
1. Click on the environment
2. Click "..." > "Approvals and checks"
3. Add "Approvals" check
4. Add approvers (yourself or team members)
5. Set timeout (e.g., 24 hours)

### Step 3: Test the Pipelines

After service connections are configured:

1. Go to Pipelines
2. Click on "Flamoral-CI-Pipeline"
3. Click "Run pipeline"
4. Select "main" branch
5. Click "Run"

## Pipeline URLs

- CI Pipeline: https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_build?definitionId=11
- CD Pipeline: https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_build?definitionId=12
- Infrastructure Pipeline: https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_build?definitionId=13
- Security Pipeline: https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_build?definitionId=14

## Variable Groups

- https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_library?itemType=VariableGroups

## Repository

- https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_git/DatingPlatform

## Azure Resources Used

| Resource | Name | Resource Group |
|----------|------|----------------|
| AKS Cluster | datingapp-dev-aks | datingapp-dev-rg |
| Container Registry | flamoralacr8eq5eg | datingapp-dev-rg |

## Notes

- All existing Azure resources (AKS, ACR, databases) remain unchanged
- Service connections require Azure portal permissions to create automatically
- The pipelines will create environments automatically on first run
- Old pipelines in `.azuredevops/` and `/azure-pipelines/` are deprecated but not deleted
