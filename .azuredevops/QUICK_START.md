# Azure DevOps Pipelines - Quick Start Guide

## 1-Minute Overview

This directory contains a complete Azure DevOps CI/CD pipeline architecture for the Flamoral Dating Platform with:
- **4 core pipelines** (CI, CD, Terraform, Infrastructure)
- **3 reusable templates** (Docker, Helm, Testing)
- **Complete documentation** and setup scripts

## 5-Minute Setup (Automated)

```bash
cd .azuredevops
chmod +x setup-pipelines.sh
./setup-pipelines.sh
```

## 30-Minute Setup (Manual)

### Step 1: Service Connections (10 min)
Create in Azure DevOps UI:
1. `azure-datingapp-sp-connection` (Azure RM)
2. `acr-datingapp-connection` (Docker Registry)
3. `aks-flamoral-connection` (Kubernetes)

See: `service-connections/README.md`

### Step 2: Variable Groups (15 min)
Create 13 variable groups:
- flamoral-shared-vars
- flamoral-ci-vars
- flamoral-cd-vars
- flamoral-{env}-vars (dev, test, staging, prod)
- flamoral-terraform-{env}-vars

See: `variable-groups/README.md`

### Step 3: Create Pipelines (5 min)
```bash
# CI Pipeline
az pipelines create \
  --name 'Flamoral-CI-Pipeline' \
  --yml-path .azuredevops/pipelines/azure-pipelines-ci.yml

# CD Pipeline
az pipelines create \
  --name 'Flamoral-CD-Pipeline' \
  --yml-path .azuredevops/pipelines/azure-pipelines-cd.yml

# Terraform Pipeline
az pipelines create \
  --name 'Flamoral-Terraform-Pipeline' \
  --yml-path .azuredevops/pipelines/azure-pipelines-terraform.yml

# Infrastructure Pipeline
az pipelines create \
  --name 'Flamoral-Infrastructure-Pipeline' \
  --yml-path .azuredevops/pipelines/azure-pipelines-infra.yml
```

## Pipeline URLs

| Pipeline | URL |
|----------|-----|
| All Pipelines | https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_build |
| Boards | https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_workitems |
| Repos | https://dev.azure.com/citadelcloudmanagement/_git/DatingPlatform |

## Key Files

| File | Purpose |
|------|---------|
| `INDEX.md` | Complete index of all files |
| `DEPLOYMENT_SUMMARY.md` | Overall summary and features |
| `PIPELINE_ARCHITECTURE.md` | Detailed architecture |
| `pipelines/azure-pipelines-ci.yml` | CI pipeline |
| `pipelines/azure-pipelines-cd.yml` | CD pipeline |
| `pipelines/azure-pipelines-terraform.yml` | Terraform pipeline |
| `pipelines/azure-pipelines-infra.yml` | Infrastructure pipeline |

## Azure Configuration

```yaml
Organization: citadelcloudmanagement
Project: DatingPlatform
Subscription: d8afbfb0-0c60-4d11-a1c7-a614235f5eb6
Service Principal: a85e4029-4e37-4399-9390-6e18922b38e7
ACR: flamoralacr.azurecr.io
AKS: flamoral-aks
Resource Group: flamoral-dating-app-rg
```

## Pipeline Flow

```
Code Push → CI Pipeline → Build & Test → Docker Images → ACR
                                                           ↓
                                          CD Pipeline → Dev → Test → Staging → Production
                                                                                    ↓
                                                                              AKS Cluster
```

## Deployment Environments

| Environment | Namespace | URL | Approval |
|-------------|-----------|-----|----------|
| Dev | flamoral-dev | dev.flamoral.app | Auto |
| Test | flamoral-test | test.flamoral.app | Auto |
| Staging | flamoral-staging | staging.flamoral.app | Manual |
| Production | flamoral-prod | flamoral.app | Manual |

## Services Built & Deployed

1. API Gateway (port 4000)
2. Auth Service (port 3001)
3. User Service (port 3002)
4. Matching Service (port 3003)
5. Messaging Service (port 3004)
6. Media Service (port 3006)
7. Payment Service (port 3007)
8. Notification Service (port 3008)
9. Analytics Service (port 3009)

## Common Commands

### Run a Pipeline
```bash
az pipelines run \
  --name 'Flamoral-CI-Pipeline' \
  --branch main
```

### View Pipeline Runs
```bash
az pipelines runs list \
  --pipeline-ids <pipeline-id> \
  --top 10
```

### Check Build Status
```bash
az pipelines runs show \
  --id <run-id>
```

## Troubleshooting Quick Fixes

### Pipeline fails at ACR login
```bash
az acr login --name flamoralacr
```

### Cannot access Key Vault
```bash
az keyvault set-policy \
  --name flamoral-dev-kv \
  --spn a85e4029-4e37-4399-9390-6e18922b38e7 \
  --secret-permissions get list
```

### Kubernetes deployment timeout
```bash
kubectl get pods -n flamoral-dev
kubectl logs -n flamoral-dev <pod-name>
```

## Documentation

- **Quick Start**: This file
- **Complete Index**: `INDEX.md`
- **Architecture**: `PIPELINE_ARCHITECTURE.md`
- **Full Summary**: `DEPLOYMENT_SUMMARY.md`
- **Variable Groups**: `variable-groups/README.md`
- **Service Connections**: `service-connections/README.md`

## Support

- **Email**: ops-team@flamoral.com
- **Azure DevOps**: https://dev.azure.com/citadelcloudmanagement/DatingPlatform

## Next Steps

1. ✅ Run setup script or create service connections
2. ✅ Create variable groups and add secrets
3. ✅ Create pipelines
4. ✅ Test CI pipeline
5. ✅ Deploy to Dev environment
6. ✅ Progress through Test → Staging → Production

---

**Need Help?** See `INDEX.md` for complete documentation index.
