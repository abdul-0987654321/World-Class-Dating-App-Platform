# Flamoral Dating Platform - Azure DevOps Pipeline Architecture

Complete CI/CD pipeline architecture for the Flamoral dating application using Azure DevOps.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Pipeline Files](#pipeline-files)
- [Prerequisites](#prerequisites)
- [Setup Instructions](#setup-instructions)
- [Pipeline Workflows](#pipeline-workflows)
- [Variable Groups](#variable-groups)
- [Service Connections](#service-connections)
- [Environments](#environments)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

## Overview

This Azure DevOps pipeline architecture provides:

- **Continuous Integration (CI)**: Automated build, test, and Docker image creation
- **Continuous Deployment (CD)**: Multi-stage deployment to Dev → Test → Staging → Production
- **Infrastructure as Code**: Terraform pipeline for Azure resource provisioning
- **Kubernetes Management**: Automated K8s and Helm deployments
- **Security**: Integrated security scanning and secrets management
- **Quality Gates**: Code quality checks, test coverage, and manual approvals

### Key Features

- Multi-service microservices support (Node.js, Python, Go)
- Blue-green deployment strategy
- Automated testing (unit, integration, E2E)
- Security scanning (Snyk, TFSec)
- Container image management (Azure Container Registry)
- Infrastructure drift detection
- Environment-specific configurations
- Approval gates for production deployments

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Source Control (Git)                      │
│            https://dev.azure.com/citadelcloud...             │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              CI Pipeline (azure-pipelines-ci.yml)            │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────────┐   │
│  │Code Quality│→ │Build & Test│→ │ Build Docker Images │   │
│  │ & Security │  │  Services  │  │  Push to ACR       │   │
│  └────────────┘  └────────────┘  └─────────────────────┘   │
└──────────────────┬──────────────────────────────────────────┘
                   │ Triggers CD Pipeline
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              CD Pipeline (azure-pipelines-cd.yml)            │
│  ┌─────┐    ┌─────┐    ┌─────────┐    ┌──────────────┐    │
│  │ Dev │ → │Test │ → │ Staging │ → │ Production   │    │
│  └─────┘    └─────┘    └─────────┘    └──────────────┘    │
│     ↓          ↓            ↓               ↓ (Manual)     │
│   Auto       Auto    Blue-Green      Blue-Green Deploy     │
└─────────────────────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│    Terraform Pipeline (azure-pipelines-terraform.yml)        │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌───────┐  ┌─────────┐     │
│  │ Init │→│Validate│→│ Plan │→│ Apply │→│Drift Det │     │
│  └──────┘  └──────┘  └──────┘  └───────┘  └─────────┘     │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│    Infrastructure Pipeline (azure-pipelines-infra.yml)       │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────┐      │
│  │K8s Validate│→│Deploy Infra│→│Deploy Apps (Helm)│      │
│  └────────────┘  └────────────┘  └──────────────────┘      │
└─────────────────────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              Azure Kubernetes Service (AKS)                  │
│  ┌────────────────────────────────────────────────────┐     │
│  │ Microservices Running in Kubernetes Cluster        │     │
│  │ - API Gateway    - Auth Service   - User Service   │     │
│  │ - Matching       - Messaging      - Media Service  │     │
│  │ - Payment        - Notification   - Analytics      │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## Pipeline Files

### Core Pipelines

| File | Purpose | Triggers |
|------|---------|----------|
| `pipelines/azure-pipelines-ci.yml` | Continuous Integration - Build, test, and create Docker images | PR, commits to main/develop |
| `pipelines/azure-pipelines-cd.yml` | Continuous Deployment - Deploy to all environments | CI pipeline completion |
| `pipelines/azure-pipelines-terraform.yml` | Infrastructure provisioning with Terraform | Commits to infrastructure/terraform/** |
| `pipelines/azure-pipelines-infra.yml` | Kubernetes and Helm deployments | Commits to k8s/**, infrastructure/helm/** |

### Templates

| File | Purpose |
|------|---------|
| `templates/docker-build-template.yml` | Reusable Docker build and push template |
| `templates/helm-deploy-template.yml` | Reusable Helm deployment template |
| `templates/test-template.yml` | Reusable testing template (Node.js, Python, Go) |

### Configuration

| Directory | Purpose |
|-----------|---------|
| `variable-groups/` | Documentation for Azure DevOps variable groups |
| `service-connections/` | Service connection setup documentation |

## Prerequisites

### Azure Resources

1. **Azure Subscription**: d8afbfb0-0c60-4d11-a1c7-a614235f5eb6
2. **Service Principal**: terraform-datingapp-sp (a85e4029-4e37-4399-9390-6e18922b38e7)
3. **Azure Container Registry**: flamoralacr.azurecr.io
4. **Azure Kubernetes Service**: flamoral-aks
5. **Resource Group**: flamoral-dating-app-rg

### Azure DevOps

1. **Organization**: citadelcloudmanagement
2. **Project**: DatingPlatform
3. **Repository**: https://dev.azure.com/citadelcloudmanagement/_git/DatingPlatform

### Required Tools

- Azure CLI 2.50+
- kubectl 1.28+
- Helm 3.12+
- Terraform 1.6+
- Docker 24+

## Setup Instructions

See detailed setup instructions in:
- `variable-groups/README.md` - Variable group configuration
- `service-connections/README.md` - Service connection setup
- `SETUP_GUIDE.md` - Complete step-by-step guide

## Pipeline Workflows

### CI Pipeline Workflow

1. **Code Quality & Security**
   - ESLint/Prettier
   - npm audit
   - Snyk security scan

2. **Build Backend Services**
   - Build Node.js microservices
   - Build Python AI services
   - Run unit tests
   - Generate coverage reports

3. **Build Frontend Applications**
   - Build web application
   - Build mobile app

4. **Build & Push Docker Images**
   - Build Docker images for all services
   - Tag with build ID and latest
   - Push to Azure Container Registry

5. **Integration Tests**
   - Run integration tests
   - Run E2E tests

6. **Publish Artifacts**
   - K8s manifests
   - Helm charts
   - Terraform configs

### CD Pipeline Workflow

1. **Deploy to Dev** → 2. **Deploy to Test** → 3. **Deploy to Staging** → 4. **Deploy to Production**

Each stage includes:
- Helm deployment
- Health checks
- Smoke/integration tests
- Manual approvals (staging/prod)

## Best Practices

1. Use templates for reusable components
2. Enable branch policies requiring PR reviews
3. Set up retention policies for artifacts
4. Use manual approvals for production
5. Implement blue-green deployments
6. Keep secrets in Key Vault
7. Use least privilege for service principals
8. Enable audit logging
9. Document all changes

## Support

- Azure DevOps: https://dev.azure.com/citadelcloudmanagement/DatingPlatform/_boards
- Team: ops-team@flamoral.com

## References

- [Azure Pipelines Documentation](https://learn.microsoft.com/en-us/azure/devops/pipelines/)
- [YAML Schema Reference](https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/)
- [Terraform Azure Provider](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
