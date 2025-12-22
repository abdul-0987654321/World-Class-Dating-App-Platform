# Flamoral Platform - CI/CD Pipelines Documentation

## Overview

This document describes the Azure DevOps CI/CD pipeline architecture for the Flamoral dating platform. All pipelines are configured to use the self-hosted agent pool "Default".

**Azure DevOps Organization:** `https://dev.azure.com/citadelcloudmanagement`
**Project:** `DatingPlatform`

---

## 1. Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Azure DevOps Pipelines                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────┐     ┌─────────────────────┐                       │
│  │    CI Pipeline      │────▶│    CD Pipeline      │                       │
│  │  (Build & Test)     │     │    (Deploy)         │                       │
│  └─────────────────────┘     └─────────────────────┘                       │
│           │                            │                                    │
│           │                            ▼                                    │
│           │                  ┌─────────────────┐                           │
│           │                  │    Dev AKS      │                           │
│           │                  └────────┬────────┘                           │
│           │                           │                                    │
│           │                           ▼                                    │
│           │                  ┌─────────────────┐                           │
│           │                  │    Test AKS     │                           │
│           │                  └────────┬────────┘                           │
│           │                           │                                    │
│           │                           ▼ (Manual Approval)                  │
│           │                  ┌─────────────────┐                           │
│           │                  │   Prod AKS      │                           │
│           │                  └─────────────────┘                           │
│           │                                                                │
│  ┌─────────────────────┐     ┌─────────────────────┐                       │
│  │ Infrastructure      │     │  Security Pipeline  │                       │
│  │   Pipeline          │     │    (Weekly)         │                       │
│  │  (Terraform)        │     │                     │                       │
│  └─────────────────────┘     └─────────────────────┘                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Pipeline Inventory

| Pipeline | File | Trigger | Purpose |
|----------|------|---------|---------|
| CI Pipeline | `pipelines/ci-pipeline.yml` | Push to main/develop | Build, test, create Docker images |
| CD Pipeline | `pipelines/cd-pipeline.yml` | CI completion | Deploy to environments |
| Infrastructure | `pipelines/azure-pipelines-infra.yml` | terraform/** changes | Terraform deployment |
| Security | `pipelines/security-pipeline.yml` | Weekly schedule | Security scanning |

---

## 3. CI Pipeline Details

### 3.1 File Location
`pipelines/ci-pipeline.yml`

### 3.2 Triggers

```yaml
trigger:
  branches:
    include:
      - main
      - develop
      - release/*
      - hotfix/*
      - feature/*
  paths:
    exclude:
      - docs/**
      - '**/*.md'
```

### 3.3 Stages

| Stage | Jobs | Purpose |
|-------|------|---------|
| CodeQuality | Linting, SecurityScan, SecretsScan | Code quality & security analysis |
| BuildBackend | BuildNodeServices, BuildAIServices | Build all microservices |
| BuildFrontend | BuildWebApp, BuildMobileApp | Build frontend applications |
| BuildDockerImages | BuildImages (matrix) | Build & push Docker images to ACR |
| IntegrationTests | RunIntegrationTests | End-to-end integration tests |
| PublishArtifacts | PublishManifests | Publish K8s manifests and Helm charts |

### 3.4 Service Build Matrix

```yaml
strategy:
  maxParallel: 5
  matrix:
    ApiGateway:
      serviceName: 'api-gateway'
      serviceDir: 'backend/services/api-gateway'
    AuthService:
      serviceName: 'auth-service'
      serviceDir: 'backend/services/auth-service'
    UserService:
      serviceName: 'user-service'
      serviceDir: 'backend/services/user-service'
    MatchingService:
      serviceName: 'matching-service'
      serviceDir: 'backend/services/matching-service'
    MessagingService:
      serviceName: 'messaging-service'
      serviceDir: 'backend/services/messaging-service'
    MediaService:
      serviceName: 'media-service'
      serviceDir: 'backend/services/media-service'
    PaymentService:
      serviceName: 'payment-service'
      serviceDir: 'backend/services/payment-service'
    NotificationService:
      serviceName: 'notification-service'
      serviceDir: 'backend/services/notification-service'
    AnalyticsService:
      serviceName: 'analytics-service'
      serviceDir: 'backend/services/analytics-service'
    ModerationService:
      serviceName: 'moderation-service'
      serviceDir: 'backend/services/moderation-service'
    AdvertisingService:
      serviceName: 'advertising-service'
      serviceDir: 'backend/services/advertising-service'
    RealtimeService:
      serviceName: 'realtime-service'
      serviceDir: 'backend/services/realtime-service'
```

---

## 4. CD Pipeline Details

### 4.1 File Location
`pipelines/cd-pipeline.yml`

### 4.2 Triggers

```yaml
trigger: none  # Manual or CI-triggered only

resources:
  pipelines:
    - pipeline: ci-pipeline
      source: 'Flamoral-CI-Pipeline'
      trigger:
        branches:
          include:
            - main
```

### 4.3 Stages

| Stage | Environment | Approval | Actions |
|-------|-------------|----------|---------|
| DeployDev | flamoral-dev | Auto | Helm deploy, smoke tests |
| DeployTest | flamoral-test | Auto | Helm deploy, E2E tests, performance tests |
| DeployProduction | flamoral-production | **Manual** | Blue-green deploy, validation, traffic switch |
| PostDeploymentMonitoring | N/A | Auto | 10-minute health monitoring |

### 4.4 Blue-Green Deployment (Production)

The production deployment uses blue-green strategy:

1. Determine current active slot (blue/green)
2. Deploy to inactive slot
3. Run health validation
4. Manual approval for traffic switch
5. Switch service selector to new slot
6. Monitor for 10 minutes

```yaml
# Determine deployment slot
CURRENT_SLOT=$(kubectl get service flamoral-api-gateway -n $(namespace) -o jsonpath='{.spec.selector.slot}' || echo "blue")
if [ "$CURRENT_SLOT" == "blue" ]; then
  NEW_SLOT="green"
else
  NEW_SLOT="blue"
fi

# Switch traffic
kubectl patch service flamoral-api-gateway -n $(namespace) \
  -p '{"spec":{"selector":{"slot":"$(newSlot)"}}}'
```

---

## 5. Infrastructure Pipeline Details

### 5.1 File Location
`pipelines/azure-pipelines-infra.yml`

### 5.2 Triggers

```yaml
trigger:
  branches:
    include:
      - main
      - develop
  paths:
    include:
      - terraform/**
```

### 5.3 Stages

| Stage | Environment | Approval | Actions |
|-------|-------------|----------|---------|
| Validate | N/A | Auto | Format check, validate, TFLint, Checkov |
| DeployDev | datingplatform-dev | Auto | Terraform init/plan/apply |
| DeployTest | datingplatform-test | Auto | Terraform init/plan/apply |
| DeployProd | datingplatform-prod | **Manual** | Terraform init/plan/apply |
| Summary | N/A | Auto | Generate deployment summary |

### 5.4 Validation Steps

```yaml
- script: |
    terraform fmt -check -recursive -diff terraform/
  displayName: 'Terraform Format Check'

- script: |
    for env in dev test prod; do
      cd terraform/environments/$env
      terraform init -backend=false
      terraform validate
    done
  displayName: 'Terraform Validate'

- script: |
    tflint --init
    tflint
  displayName: 'TFLint Analysis'

- script: |
    checkov -d terraform/ --config-file .checkov.yaml
  displayName: 'Checkov Security Scan'
```

---

## 6. Variable Groups

### 6.1 Required Variable Groups

| Variable Group | Purpose | Variables |
|----------------|---------|-----------|
| flamoral-shared-vars | Common variables | nodeVersion, pythonVersion, helmVersion |
| flamoral-cd-vars | CD-specific | ACR_USERNAME, ACR_PASSWORD |
| datingplatform-terraform-common | Terraform common | ARM_CLIENT_ID, ARM_SUBSCRIPTION_ID |
| datingplatform-terraform-dev | Dev environment | TF state backend config |
| datingplatform-terraform-test | Test environment | TF state backend config |
| datingplatform-terraform-prod | Prod environment | TF state backend config |

### 6.2 Environment Variables Template

```yaml
# templates/variables-common.yml
variables:
  nodeVersion: '20.x'
  pythonVersion: '3.11'
  helmVersion: '3.13.0'
  terraformVersion: '1.6.6'
  imagePrefix: 'flamoral'
  imageTag: '$(Build.BuildId)'
  dockerRegistryServiceConnection: 'flamoral-acr-connection'

# templates/variables-prod.yml
variables:
  environment: 'production'
  namespace: 'flamoral'
  aksClusterName: 'flamoral-prod-aks'
  resourceGroup: 'flamoral-prod-rg'
  azureServiceConnection: 'flamoral-prod-azure'
  kubernetesServiceConnection: 'flamoral-prod-aks-connection'
  acrLoginServer: 'flamoralprodacr.azurecr.io'
  ingressHost: 'flamoral.com'
  apiHost: 'api.flamoral.com'
  replicaCount: 3
  autoscalingEnabled: true
  autoscalingMinReplicas: 3
  autoscalingMaxReplicas: 20
  targetCPUUtilization: 60
  resourceRequestMemory: '512Mi'
  resourceRequestCpu: '200m'
  resourceLimitMemory: '1Gi'
  resourceLimitCpu: '1000m'
```

---

## 7. Service Connections

### 7.1 Required Service Connections

| Connection Name | Type | Scope |
|-----------------|------|-------|
| flamoral-dev-azure | Azure Resource Manager | Dev subscription |
| flamoral-test-azure | Azure Resource Manager | Test subscription |
| flamoral-prod-azure | Azure Resource Manager | Prod subscription |
| flamoral-acr-connection | Docker Registry | Azure Container Registry |
| flamoral-dev-aks-connection | Kubernetes | Dev AKS cluster |
| flamoral-test-aks-connection | Kubernetes | Test AKS cluster |
| flamoral-prod-aks-connection | Kubernetes | Prod AKS cluster |

### 7.2 Create Service Connection (CLI)

```bash
# Azure Resource Manager connection
az devops service-endpoint azurerm create \
  --azure-rm-service-principal-id <SP_CLIENT_ID> \
  --azure-rm-subscription-id <SUBSCRIPTION_ID> \
  --azure-rm-subscription-name "Flamoral Production" \
  --azure-rm-tenant-id <TENANT_ID> \
  --name "flamoral-prod-azure" \
  --org https://dev.azure.com/citadelcloudmanagement \
  --project DatingPlatform
```

---

## 8. Environments and Approvals

### 8.1 Environment Configuration

| Environment | Approvers | Check Types |
|-------------|-----------|-------------|
| flamoral-dev | None (auto) | None |
| flamoral-test | None (auto) | None |
| flamoral-production | Release Managers | Manual Approval |
| datingplatform-dev | None (auto) | None |
| datingplatform-test | None (auto) | None |
| datingplatform-prod | DevOps Team | Manual Approval |

### 8.2 Configure Environment Approval

1. Go to **Pipelines** > **Environments**
2. Select **flamoral-production**
3. Click **...** > **Approvals and checks**
4. Add **Approvals** check
5. Add approvers (Release Managers)

---

## 9. Pipeline Templates

### 9.1 Available Templates

| Template | Purpose |
|----------|---------|
| `templates/node-build.yml` | Build Node.js services |
| `templates/docker-build-push.yml` | Build and push Docker images |
| `templates/helm-deploy.yml` | Deploy with Helm |
| `templates/terraform-init.yml` | Initialize Terraform |
| `templates/terraform-plan.yml` | Plan Terraform changes |
| `templates/terraform-apply.yml` | Apply Terraform changes |

### 9.2 Node Build Template Example

```yaml
# templates/node-build.yml
parameters:
  - name: serviceName
    type: string
  - name: serviceDirectory
    type: string
  - name: nodeVersion
    type: string
    default: '20.x'
  - name: runTests
    type: boolean
    default: true

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: ${{ parameters.nodeVersion }}

  - script: |
      cd ${{ parameters.serviceDirectory }}
      npm ci || npm install
    displayName: 'Install Dependencies'

  - script: |
      cd ${{ parameters.serviceDirectory }}
      npm run build
    displayName: 'Build ${{ parameters.serviceName }}'

  - ${{ if eq(parameters.runTests, true) }}:
    - script: |
        cd ${{ parameters.serviceDirectory }}
        npm test
      displayName: 'Test ${{ parameters.serviceName }}'
```

### 9.3 Helm Deploy Template Example

```yaml
# templates/helm-deploy.yml
parameters:
  - name: environment
    type: string
  - name: namespace
    type: string
  - name: releaseName
    type: string
  - name: imageTag
    type: string
  - name: imageRegistry
    type: string

steps:
  - task: HelmInstaller@1
    inputs:
      helmVersionToInstall: '3.13.0'

  - task: AzureCLI@2
    inputs:
      azureSubscription: ${{ parameters.azureServiceConnection }}
      scriptType: 'bash'
      inlineScript: |
        az aks get-credentials \
          --resource-group ${{ parameters.resourceGroup }} \
          --name ${{ parameters.aksClusterName }} \
          --overwrite-existing

  - task: HelmDeploy@0
    inputs:
      connectionType: 'Azure Resource Manager'
      azureSubscription: ${{ parameters.azureServiceConnection }}
      azureResourceGroup: ${{ parameters.resourceGroup }}
      kubernetesCluster: ${{ parameters.aksClusterName }}
      namespace: ${{ parameters.namespace }}
      command: 'upgrade'
      chartType: 'FilePath'
      chartPath: 'k8s/helm/flamoral'
      releaseName: ${{ parameters.releaseName }}
      valueFile: 'k8s/helm/flamoral/values-${{ parameters.environment }}.yaml'
      overrideValues: |
        global.image.tag=${{ parameters.imageTag }}
        global.image.registry=${{ parameters.imageRegistry }}
      arguments: '--create-namespace --install --wait --timeout 10m'
```

---

## 10. Agent Pool Configuration

### 10.1 Self-Hosted Agent

All pipelines use the self-hosted agent pool:

```yaml
pool:
  name: 'Default'  # Self-hosted agent pool
```

### 10.2 Agent Requirements

The self-hosted agent must have:

- Docker
- kubectl
- Helm 3.x
- Terraform 1.6+
- Node.js 20.x
- Python 3.11+
- Azure CLI
- Git

---

## 11. Troubleshooting

### 11.1 Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Agent not available | Pool exhausted | Add more agents or wait |
| ACR push failed | Auth expired | Refresh service connection |
| Terraform state lock | Previous run crashed | Manual unlock |
| Helm timeout | Slow image pull | Increase timeout, check ACR |

### 11.2 Debug Commands

```bash
# Check pipeline runs
az pipelines runs list --org https://dev.azure.com/citadelcloudmanagement -p DatingPlatform --top 10

# Get pipeline logs
az pipelines runs show --id <RUN_ID> --org https://dev.azure.com/citadelcloudmanagement -p DatingPlatform

# Check variable groups
az pipelines variable-group list --org https://dev.azure.com/citadelcloudmanagement -p DatingPlatform
```

---

## Document Information

| Field | Value |
|-------|-------|
| Last Updated | December 2024 |
| Version | 1.0 |
| Author | Flamoral DevOps Team |
| Status | Production Ready |
