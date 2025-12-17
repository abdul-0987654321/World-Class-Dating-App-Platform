# CI/CD Pipeline Documentation Index

Welcome to the Flamoral Dating Platform CI/CD pipeline documentation. This index will help you find the right documentation for your needs.

## 🚀 Quick Start

**New to the pipelines?** Start here:

1. **[PIPELINE_QUICK_START.md](./PIPELINE_QUICK_START.md)** - Get started in 5 minutes
   - Quick deployment commands
   - Common operations
   - Troubleshooting basics

## 📚 Documentation by Role

### For Developers

**I want to...**

- **Deploy my changes to dev** → [PIPELINE_QUICK_START.md](./PIPELINE_QUICK_START.md#step-3-run-your-first-deployment)
- **Understand the CI process** → [README.md](./README.md#ci-pipeline-azure-pipelinesyml)
- **Run tests locally** → [DEPLOYMENT_AUTOMATION_GUIDE.md](./DEPLOYMENT_AUTOMATION_GUIDE.md#testing-strategy)
- **Debug a failed build** → [DEPLOYMENT_AUTOMATION_GUIDE.md](./DEPLOYMENT_AUTOMATION_GUIDE.md#troubleshooting)

### For DevOps Engineers

**I want to...**

- **Set up the pipelines** → [DEPLOYMENT_AUTOMATION_GUIDE.md](./DEPLOYMENT_AUTOMATION_GUIDE.md#prerequisites)
- **Configure environments** → [environment-variables-template.yml](./environment-variables-template.yml)
- **Understand deployment strategies** → [DEPLOYMENT_AUTOMATION_GUIDE.md](./DEPLOYMENT_AUTOMATION_GUIDE.md#deployment-strategies)
- **Set up notifications** → [DEPLOYMENT_AUTOMATION_GUIDE.md](./DEPLOYMENT_AUTOMATION_GUIDE.md#notifications)
- **Perform a rollback** → [DEPLOYMENT_AUTOMATION_GUIDE.md](./DEPLOYMENT_AUTOMATION_GUIDE.md#rollback-procedures)

### For Team Leads / Managers

**I want to...**

- **Understand the system** → [CI_CD_IMPLEMENTATION_SUMMARY.md](../docs/CI_CD_IMPLEMENTATION_SUMMARY.md)
- **Review deployment process** → [DEPLOYMENT_AUTOMATION_GUIDE.md](./DEPLOYMENT_AUTOMATION_GUIDE.md#pipeline-architecture)
- **See success metrics** → [CI_CD_IMPLEMENTATION_SUMMARY.md](../docs/CI_CD_IMPLEMENTATION_SUMMARY.md#success-metrics)
- **Understand costs** → Contact DevOps team

## 📖 Complete Documentation

### Pipeline Files

#### Azure DevOps Pipelines

1. **[azure-pipelines.yml](./azure-pipelines.yml)**
   - CI pipeline (build, test, push)
   - Comprehensive testing
   - Security scanning
   - Artifact publishing

2. **[azure-pipelines-complete-cd.yml](./azure-pipelines-complete-cd.yml)** ⭐ NEW
   - Complete deployment automation
   - Multi-environment deployment
   - Manual approval gates
   - Automatic rollback
   - Deployment strategies (rolling, canary, blue-green)

3. **[azure-pipelines-cd.yml](./azure-pipelines-cd.yml)**
   - Original CD pipeline
   - Basic deployment functionality

4. **[azure-pipelines-infra.yml](./azure-pipelines-infra.yml)**
   - Infrastructure provisioning
   - Terraform automation

#### GitHub Actions Workflows

1. **[.github/workflows/complete-cd-pipeline.yml](../.github/workflows/complete-cd-pipeline.yml)** ⭐ NEW
   - Complete CI/CD automation
   - Multi-stage deployments
   - Approval gates
   - Rollback capabilities

2. **[.github/workflows/unified-ci.yml](../.github/workflows/unified-ci.yml)**
   - Unified CI pipeline
   - Parallel testing
   - Security scanning

3. **[.github/workflows/unified-cd-production.yml](../.github/workflows/unified-cd-production.yml)**
   - Production deployment
   - Canary rollout
   - Progressive deployment

### Documentation Files

#### Getting Started

1. **[PIPELINE_QUICK_START.md](./PIPELINE_QUICK_START.md)** ⭐ START HERE
   - 5-minute quick start
   - Common commands
   - Quick troubleshooting
   - Best for: First-time users

2. **[README.md](./README.md)**
   - Overview of all pipelines
   - Prerequisites
   - Configuration basics
   - Best for: General overview

#### Comprehensive Guides

3. **[DEPLOYMENT_AUTOMATION_GUIDE.md](./DEPLOYMENT_AUTOMATION_GUIDE.md)** ⭐ COMPLETE GUIDE
   - 400+ lines of detailed documentation
   - Pipeline architecture
   - Deployment strategies
   - Environment configuration
   - Rollback procedures
   - Troubleshooting
   - Best practices
   - Best for: Complete understanding

4. **[CI_CD_IMPLEMENTATION_SUMMARY.md](../docs/CI_CD_IMPLEMENTATION_SUMMARY.md)** ⭐ SUMMARY
   - What was implemented
   - File structure
   - Configuration required
   - Success metrics
   - Next steps
   - Best for: Project overview

#### Configuration

5. **[environment-variables-template.yml](./environment-variables-template.yml)**
   - All environment variables
   - Configuration for dev/staging/prod
   - Secrets management
   - Service-specific config
   - Best for: Environment setup

6. **[QUICK_START.md](./QUICK_START.md)**
   - Original quick start guide
   - Basic pipeline usage

### Template Files

Located in `pipelines/templates/`:

1. **[docker-build.yml](./templates/docker-build.yml)**
   - Reusable Docker build template
   - Multi-stage builds
   - Security scanning

2. **[helm-deploy.yml](./templates/helm-deploy.yml)**
   - Reusable Helm deployment template
   - Namespace management
   - Health checks

3. **[node-build.yml](./templates/node-build.yml)**
   - Reusable Node.js build template
   - Dependency caching
   - Testing and coverage

4. **[terraform-apply.yml](./templates/terraform-apply.yml)**
   - Reusable Terraform template
   - State management
   - Drift detection

## 🎯 Documentation by Topic

### Architecture & Design

- [Pipeline Architecture](./DEPLOYMENT_AUTOMATION_GUIDE.md#pipeline-architecture)
- [Deployment Strategies](./DEPLOYMENT_AUTOMATION_GUIDE.md#deployment-strategies)
- [File Structure](../docs/CI_CD_IMPLEMENTATION_SUMMARY.md#file-structure)
- [Services Deployed](../docs/CI_CD_IMPLEMENTATION_SUMMARY.md#services-deployed)

### Configuration & Setup

- [Prerequisites](./DEPLOYMENT_AUTOMATION_GUIDE.md#prerequisites)
- [Azure Resources Setup](./DEPLOYMENT_AUTOMATION_GUIDE.md#azure-resources)
- [Variable Groups](./DEPLOYMENT_AUTOMATION_GUIDE.md#variable-groups)
- [Service Connections](./DEPLOYMENT_AUTOMATION_GUIDE.md#service-connections)
- [Environment Configuration](./DEPLOYMENT_AUTOMATION_GUIDE.md#environment-configuration)
- [Environment Variables Template](./environment-variables-template.yml)

### Operations

- [Running CI Pipeline](./DEPLOYMENT_AUTOMATION_GUIDE.md#running-the-ci-pipeline)
- [Running CD Pipeline](./DEPLOYMENT_AUTOMATION_GUIDE.md#running-the-cd-pipeline)
- [Deployment Strategies](./DEPLOYMENT_AUTOMATION_GUIDE.md#deployment-strategies)
- [Rollback Procedures](./DEPLOYMENT_AUTOMATION_GUIDE.md#rollback-procedures)
- [Common Commands](./PIPELINE_QUICK_START.md#common-commands)

### Monitoring & Troubleshooting

- [Monitoring Deployment](./PIPELINE_QUICK_START.md#monitoring-deployment)
- [Troubleshooting Guide](./DEPLOYMENT_AUTOMATION_GUIDE.md#troubleshooting)
- [Quick Troubleshooting](./PIPELINE_QUICK_START.md#quick-troubleshooting)
- [Debug Mode](./DEPLOYMENT_AUTOMATION_GUIDE.md#debug-mode)

### Notifications & Integrations

- [Slack Integration](./DEPLOYMENT_AUTOMATION_GUIDE.md#slack-integration)
- [Microsoft Teams Integration](./DEPLOYMENT_AUTOMATION_GUIDE.md#microsoft-teams-integration)
- [Notification Setup](./PIPELINE_QUICK_START.md#notifications-setup)

### Testing

- [Testing Strategy](../docs/CI_CD_IMPLEMENTATION_SUMMARY.md#testing-strategy)
- [Production Deployment Checklist](./PIPELINE_QUICK_START.md#production-deployment-checklist)

### Security

- [Security Features](../docs/CI_CD_IMPLEMENTATION_SUMMARY.md#security-features)
- [Security Scanning](./README.md#security-features)
- [Access Control](../docs/CI_CD_IMPLEMENTATION_SUMMARY.md#access-control)

### Best Practices

- [Best Practices](./DEPLOYMENT_AUTOMATION_GUIDE.md#best-practices)
- [Success Metrics](./PIPELINE_QUICK_START.md#success-metrics)

## 🔍 Finding Information

### Search by Keyword

- **Approval gates** → [DEPLOYMENT_AUTOMATION_GUIDE.md](./DEPLOYMENT_AUTOMATION_GUIDE.md#approval-gates)
- **Azure** → [DEPLOYMENT_AUTOMATION_GUIDE.md](./DEPLOYMENT_AUTOMATION_GUIDE.md#azure-resources)
- **Backup** → [DEPLOYMENT_AUTOMATION_GUIDE.md](./DEPLOYMENT_AUTOMATION_GUIDE.md#backup--rollback)
- **Blue-green** → [DEPLOYMENT_AUTOMATION_GUIDE.md](./DEPLOYMENT_AUTOMATION_GUIDE.md#3-blue-green-deployment)
- **Canary** → [DEPLOYMENT_AUTOMATION_GUIDE.md](./DEPLOYMENT_AUTOMATION_GUIDE.md#2-canary-deployment)
- **Docker** → [azure-pipelines.yml](./azure-pipelines.yml) / [templates/docker-build.yml](./templates/docker-build.yml)
- **Environment** → [environment-variables-template.yml](./environment-variables-template.yml)
- **GitHub Actions** → [complete-cd-pipeline.yml](../.github/workflows/complete-cd-pipeline.yml)
- **Helm** → [templates/helm-deploy.yml](./templates/helm-deploy.yml)
- **Kubernetes** → [DEPLOYMENT_AUTOMATION_GUIDE.md](./DEPLOYMENT_AUTOMATION_GUIDE.md)
- **Notifications** → [DEPLOYMENT_AUTOMATION_GUIDE.md](./DEPLOYMENT_AUTOMATION_GUIDE.md#notifications)
- **Rollback** → [DEPLOYMENT_AUTOMATION_GUIDE.md](./DEPLOYMENT_AUTOMATION_GUIDE.md#rollback-procedures)
- **Rolling update** → [DEPLOYMENT_AUTOMATION_GUIDE.md](./DEPLOYMENT_AUTOMATION_GUIDE.md#1-rolling-update-default)
- **Security** → [README.md](./README.md#security-features)
- **Slack** → [DEPLOYMENT_AUTOMATION_GUIDE.md](./DEPLOYMENT_AUTOMATION_GUIDE.md#slack-integration)
- **Teams** → [DEPLOYMENT_AUTOMATION_GUIDE.md](./DEPLOYMENT_AUTOMATION_GUIDE.md#microsoft-teams-integration)
- **Testing** → [README.md](./README.md#ci-pipeline-azure-pipelinesyml)
- **Terraform** → [azure-pipelines-infra.yml](./azure-pipelines-infra.yml)
- **Troubleshooting** → [DEPLOYMENT_AUTOMATION_GUIDE.md](./DEPLOYMENT_AUTOMATION_GUIDE.md#troubleshooting)
- **Variables** → [environment-variables-template.yml](./environment-variables-template.yml)

## 📝 Quick Reference

### Deployment Commands

#### Azure DevOps
```bash
# Deploy to dev
az pipelines run --name "Flamoral-Complete-CD" \
  --parameters environment=dev deploymentStrategy=rolling imageTag=latest

# Deploy to production
az pipelines run --name "Flamoral-Complete-CD" \
  --parameters environment=production deploymentStrategy=canary imageTag=abc123
```

#### GitHub Actions
```bash
# Deploy via workflow
gh workflow run complete-cd-pipeline.yml \
  -f environment=production \
  -f deployment_strategy=canary
```

#### Kubectl
```bash
# Check deployment status
kubectl get pods -n flamoral-prod

# Rollback deployment
kubectl rollout undo deployment/api-gateway -n flamoral-prod

# View logs
kubectl logs -f deployment/api-gateway -n flamoral-prod
```

### Environment URLs

- **Development:** https://dev-api.flamoral.com
- **Staging:** https://staging-api.flamoral.com
- **Production:** https://api.flamoral.com

### Support Contacts

- **Slack:** #devops-support
- **Email:** devops@flamoral.com
- **On-call:** +1-xxx-xxx-xxxx
- **Documentation:** https://docs.flamoral.com

## 🎓 Learning Path

### Beginner (Week 1)
1. Read [PIPELINE_QUICK_START.md](./PIPELINE_QUICK_START.md)
2. Deploy to dev environment
3. Practice rollback in dev
4. Set up notifications

### Intermediate (Week 2)
1. Read [DEPLOYMENT_AUTOMATION_GUIDE.md](./DEPLOYMENT_AUTOMATION_GUIDE.md)
2. Understand deployment strategies
3. Deploy to staging
4. Run E2E tests

### Advanced (Week 3+)
1. Configure production deployment
2. Customize pipelines
3. Optimize performance
4. Implement monitoring

## 📊 Metrics & KPIs

Track these metrics (details in [PIPELINE_QUICK_START.md](./PIPELINE_QUICK_START.md#success-metrics)):

- Deployment Frequency
- Lead Time for Changes
- Mean Time to Recovery (MTTR)
- Change Failure Rate
- Deployment Success Rate

## 🔄 Updates & Maintenance

This documentation is maintained by the DevOps team. Last updated: 2025-12-11

To suggest updates:
1. Create issue in repository
2. Submit pull request
3. Contact devops@flamoral.com

## 📚 Additional Resources

### External Documentation
- [Azure Pipelines](https://docs.microsoft.com/azure/devops/pipelines/)
- [GitHub Actions](https://docs.github.com/actions)
- [Helm](https://helm.sh/docs/)
- [Kubernetes](https://kubernetes.io/docs/)
- [Azure AKS](https://docs.microsoft.com/azure/aks/)

### Internal Resources
- [Project README](../README.md)
- [Architecture Documentation](../ARCHITECTURE.md)
- [Security Compliance](../SECURITY_COMPLIANCE.md)
- [Rollback Plan](../ROLLBACK_PLAN.md)

---

**Need help?** Start with [PIPELINE_QUICK_START.md](./PIPELINE_QUICK_START.md) or contact #devops-support on Slack.
