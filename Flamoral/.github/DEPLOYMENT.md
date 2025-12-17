# Flamoral Platform - Deployment Guide

## Table of Contents

1. [CI/CD Pipeline Overview](#cicd-pipeline-overview)
2. [Environment Promotion Process](#environment-promotion-process)
3. [Secrets Management in CI/CD](#secrets-management-in-cicd)
4. [Manual Deployment Procedures](#manual-deployment-procedures)
5. [Rollback Procedures](#rollback-procedures)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

---

## CI/CD Pipeline Overview

The Flamoral platform uses GitHub Actions for continuous integration and continuous deployment. Our pipeline is designed with security, reliability, and automation in mind.

### Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CI/CD PIPELINE                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Code Push/PR                                           │
│  │                                                          │
│  ├──> unified-ci.yml          (Build, Test, Security)      │
│  ├──> infrastructure-check.yml (Validate Infra)            │
│  │                                                          │
│  2. Merge to develop                                        │
│  │                                                          │
│  └──> deploy-staging.yml     (Auto-deploy to Staging)      │
│      ├──> Build Docker Images                              │
│      ├──> Push to ACR                                      │
│      ├──> Deploy to AKS                                    │
│      ├──> Run Integration Tests                            │
│      ├──> Run E2E Tests                                    │
│      ├──> Security Scan (DAST)                             │
│      ├──> Performance Tests                                │
│      └──> Create Release Candidate                         │
│                                                             │
│  3. Merge to main (Manual Approval Required)               │
│  │                                                          │
│  └──> deploy-production.yml  (Deploy to Production)        │
│      ├──> Production Approval Gate                         │
│      ├──> Run All Tests                                    │
│      ├──> Security Scanning                                │
│      ├──> Build Docker Images                              │
│      ├──> Backup Current State                             │
│      ├──> Deploy to Kubernetes (Canary/Blue-Green/Rolling) │
│      ├──> Run Smoke Tests                                  │
│      ├──> Auto-Rollback on Failure                         │
│      └──> Slack Notifications                              │
│                                                             │
│  4. Weekly Schedule                                         │
│  │                                                          │
│  └──> cost-report.yml        (Cost Analysis & Reports)     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Available Workflows

#### 1. **deploy-production.yml** - Production Deployment
- **Trigger:** Push to `main` branch or manual dispatch
- **Features:**
  - Manual approval gate (production-approval environment)
  - Full test suite execution
  - Security vulnerability scanning
  - Docker image builds for all services
  - Azure Container Registry push
  - Kubernetes deployment (Canary, Blue-Green, or Rolling strategies)
  - Database migrations
  - Post-deployment smoke tests
  - Automatic rollback on failure
  - Slack notifications
- **Deployment Strategies:**
  - **Canary:** Progressive rollout (10% → 25% → 50% → 75% → 100%)
  - **Blue-Green:** Zero-downtime deployment with instant switch
  - **Rolling:** Gradual instance replacement

#### 2. **deploy-staging.yml** - Staging Deployment
- **Trigger:** Push to `develop` branch or PR merge
- **Features:**
  - Automatic deployment
  - Docker image builds
  - Kubernetes deployment
  - Integration tests
  - E2E tests
  - API tests (Postman/Newman)
  - Performance tests (k6)
  - DAST security scanning (OWASP ZAP)
  - Release candidate creation
  - Slack notifications

#### 3. **infrastructure-check.yml** - Infrastructure Validation
- **Trigger:** PR to `main`/`develop` with infrastructure changes
- **Features:**
  - Terraform validation and linting (TFLint)
  - Terraform security scanning (tfsec, Checkov, Trivy)
  - Kubernetes manifest validation (kubeval, kubeconform)
  - Kubernetes security scanning (kube-score, Polaris)
  - Helm chart validation and linting
  - Infrastructure cost estimation (Infracost)
  - Documentation checks

#### 4. **cost-report.yml** - Weekly Cost Report
- **Trigger:** Every Monday at 9:00 AM UTC or manual dispatch
- **Features:**
  - Azure actual cost analysis
  - Infrastructure cost estimation
  - Cost optimization recommendations
  - Cost trend analysis
  - GitHub Issue creation with report
  - Slack notifications
  - Email notifications (optional)

---

## Environment Promotion Process

### Environments

We maintain three environments with progressive promotion:

```
Development → Staging → Production
```

#### Development Environment
- **Purpose:** Feature development and testing
- **Deployment:** Automatic on merge to `develop`
- **Resources:** Minimal (cost-optimized)
- **Data:** Test data only
- **Access:** Development team

#### Staging Environment
- **Purpose:** Pre-production validation
- **Deployment:** Automatic on merge to `develop`
- **Resources:** Production-like
- **Data:** Anonymized production data
- **Access:** QA team, Developers
- **Testing:**
  - Integration tests
  - E2E tests
  - Performance tests
  - Security tests

#### Production Environment
- **Purpose:** Live user traffic
- **Deployment:** Manual approval required
- **Resources:** Full production scale
- **Data:** Real production data
- **Access:** DevOps team only
- **Monitoring:** 24/7 monitoring and alerting

### Promotion Workflow

#### Step 1: Develop → Staging

```bash
# 1. Create feature branch
git checkout -b feature/my-feature develop

# 2. Develop and commit changes
git add .
git commit -m "feat: implement new feature"

# 3. Create pull request to develop
git push origin feature/my-feature

# 4. After PR approval and merge, staging deployment triggers automatically
```

The `deploy-staging.yml` workflow will:
1. Build Docker images
2. Deploy to staging AKS
3. Run all tests
4. Create release candidate tag if tests pass

#### Step 2: Staging → Production

```bash
# 1. Create pull request from develop to main
# 2. Code review and approval
# 3. Merge to main

# The deploy-production.yml workflow will trigger
# 4. Approve deployment in GitHub (required)
# 5. Monitor deployment progress
```

The `deploy-production.yml` workflow will:
1. Wait for manual approval
2. Run full test suite
3. Build and push production images
4. Backup current state
5. Deploy using selected strategy
6. Run smoke tests
7. Rollback automatically if tests fail

---

## Secrets Management in CI/CD

### Required GitHub Secrets

All secrets are stored in GitHub Secrets and never committed to the repository.

#### Azure Credentials

```yaml
# Production
AZURE_CREDENTIALS          # Azure service principal credentials (JSON)
AZURE_CLIENT_ID            # Azure AD application client ID
AZURE_CLIENT_SECRET        # Azure AD application client secret
AZURE_TENANT_ID            # Azure AD tenant ID
AZURE_SUBSCRIPTION_ID      # Azure subscription ID

# Staging
AZURE_CREDENTIALS_STAGING
AZURE_CLIENT_ID_STAGING
AZURE_CLIENT_SECRET_STAGING
AZURE_SUBSCRIPTION_ID_STAGING

# Development
AZURE_CREDENTIALS_DEV
AZURE_CLIENT_ID_DEV
AZURE_CLIENT_SECRET_DEV
AZURE_SUBSCRIPTION_ID_DEV
```

#### Application URLs

```yaml
PROD_URL                   # Production web URL (e.g., https://flamoral.com)
PROD_API_URL              # Production API URL (e.g., https://api.flamoral.com)
STAGING_URL               # Staging web URL
STAGING_API_URL           # Staging API URL
```

#### Notification Services

```yaml
SLACK_WEBHOOK_URL         # Slack webhook for notifications
SENDGRID_API_KEY          # SendGrid API key for email notifications (optional)
```

#### Cost Management

```yaml
INFRACOST_API_KEY         # Infracost API key for cost estimation
```

#### Test Accounts

```yaml
TEST_USER_EMAIL           # Test user email for integration tests
TEST_USER_PASSWORD        # Test user password
```

#### Terraform State

```yaml
TF_STATE_STORAGE_ACCOUNT  # Azure Storage Account for Terraform state
TF_STATE_CONTAINER        # Container name for Terraform state
```

### Setting Up Secrets

#### 1. Via GitHub UI

1. Go to repository Settings
2. Navigate to Secrets and variables → Actions
3. Click "New repository secret"
4. Add each secret with appropriate value

#### 2. Via GitHub CLI

```bash
# Set production Azure credentials
gh secret set AZURE_CREDENTIALS < azure-credentials.json

# Set Slack webhook
gh secret set SLACK_WEBHOOK_URL --body "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# Set Infracost API key
gh secret set INFRACOST_API_KEY --body "your-api-key"
```

### Environment-Specific Secrets

Configure environment protection rules in GitHub:

1. Go to Settings → Environments
2. Create environments: `production`, `staging`, `development`
3. Add protection rules:
   - **Production:** Require reviewers (2 approvers recommended)
   - **Staging:** Auto-deployment allowed
   - **Development:** Auto-deployment allowed

### Secret Rotation

Secrets should be rotated regularly:

- **Azure Service Principals:** Every 90 days
- **API Keys:** Every 180 days
- **Webhooks:** As needed

Use the `secret-rotation-drift-repair.yml` workflow to automate rotation.

---

## Manual Deployment Procedures

### Prerequisites

Before manual deployment, ensure you have:

1. Azure CLI installed and configured
2. kubectl installed
3. Helm installed
4. Access to Azure subscription
5. Kubeconfig for AKS cluster

### Manual Production Deployment

#### Option 1: Using GitHub Actions (Recommended)

1. Navigate to Actions → Deploy to Production
2. Click "Run workflow"
3. Select deployment strategy (canary/blue-green/rolling)
4. Confirm and run
5. Approve deployment when prompted
6. Monitor deployment progress

#### Option 2: Manual kubectl Deployment

```bash
# 1. Authenticate with Azure
az login
az account set --subscription <SUBSCRIPTION_ID>

# 2. Get AKS credentials
az aks get-credentials \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-aks

# 3. Verify cluster access
kubectl get nodes

# 4. Deploy using Helm
helm upgrade --install flamoral-prod ./infrastructure/helm/flamoral \
  --namespace flamoral-prod \
  --values ./infrastructure/helm/flamoral/values-prod.yaml \
  --set global.image.tag=<IMAGE_TAG> \
  --set global.image.registry=flamoralprodacr.azurecr.io \
  --wait --timeout 15m

# 5. Verify deployment
kubectl get pods -n flamoral-prod
kubectl rollout status deployment --all -n flamoral-prod

# 6. Run database migrations
kubectl apply -f infrastructure/k8s/jobs/db-migration.yaml

# 7. Verify application health
curl https://api.flamoral.com/health
```

#### Option 3: Terraform Infrastructure Update

```bash
# 1. Navigate to Terraform directory
cd infrastructure/terraform/environments/prod

# 2. Initialize Terraform
terraform init

# 3. Plan changes
terraform plan -out=tfplan

# 4. Review plan carefully
terraform show tfplan

# 5. Apply changes (with approval)
terraform apply tfplan

# 6. Verify infrastructure
az aks show --resource-group flamoral-prod-rg --name flamoral-prod-aks
```

### Manual Staging Deployment

```bash
# 1. Authenticate with Azure
az login

# 2. Get AKS credentials
az aks get-credentials \
  --resource-group flamoral-staging-rg \
  --name flamoral-staging-aks

# 3. Deploy with Helm
helm upgrade --install flamoral-staging ./infrastructure/helm/flamoral \
  --namespace flamoral-staging \
  --values ./infrastructure/helm/flamoral/values-test.yaml \
  --set global.image.tag=<IMAGE_TAG> \
  --wait

# 4. Verify deployment
kubectl get all -n flamoral-staging
```

### Manual Docker Image Build

```bash
# 1. Login to ACR
az acr login --name flamoralprodacr

# 2. Build image for a service
cd backend/services/user-service
docker build -t flamoralprodacr.azurecr.io/flamoral/user-service:v1.0.0 .

# 3. Push image
docker push flamoralprodacr.azurecr.io/flamoral/user-service:v1.0.0

# 4. Update Kubernetes deployment
kubectl set image deployment/user-service \
  user-service=flamoralprodacr.azurecr.io/flamoral/user-service:v1.0.0 \
  -n flamoral-prod

# 5. Monitor rollout
kubectl rollout status deployment/user-service -n flamoral-prod
```

---

## Rollback Procedures

### Automatic Rollback

The production deployment pipeline includes automatic rollback if:
- Smoke tests fail
- Health checks fail
- Deployment times out

The rollback process:
1. Restores previous Kubernetes deployment state
2. Verifies rollback completion
3. Sends Slack notification

### Manual Rollback

#### Option 1: Helm Rollback (Recommended)

```bash
# 1. List Helm releases
helm list -n flamoral-prod

# 2. View release history
helm history flamoral-prod -n flamoral-prod

# 3. Rollback to previous revision
helm rollback flamoral-prod -n flamoral-prod

# Or rollback to specific revision
helm rollback flamoral-prod 5 -n flamoral-prod

# 4. Verify rollback
kubectl get pods -n flamoral-prod
```

#### Option 2: Kubernetes Rollback

```bash
# 1. View deployment history
kubectl rollout history deployment/user-service -n flamoral-prod

# 2. Rollback to previous version
kubectl rollout undo deployment/user-service -n flamoral-prod

# 3. Rollback to specific revision
kubectl rollout undo deployment/user-service --to-revision=3 -n flamoral-prod

# 4. Monitor rollback
kubectl rollout status deployment/user-service -n flamoral-prod
```

#### Option 3: Blue-Green Rollback

```bash
# 1. Identify current active slot
ACTIVE_SLOT=$(kubectl get configmap deployment-slot -n flamoral-prod -o jsonpath='{.data.active}')

# 2. Switch back to previous slot
if [ "$ACTIVE_SLOT" = "green" ]; then
  kubectl patch configmap deployment-slot -n flamoral-prod \
    --type merge -p '{"data":{"active":"blue"}}'
else
  kubectl patch configmap deployment-slot -n flamoral-prod \
    --type merge -p '{"data":{"active":"green"}}'
fi

# 3. Verify traffic switch
kubectl get svc -n flamoral-prod
```

#### Option 4: Database Rollback

```bash
# 1. List database backups
az postgres flexible-server backup list \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-postgres

# 2. Restore from backup
az postgres flexible-server restore \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-postgres-restored \
  --source-server flamoral-prod-postgres \
  --restore-time "2024-12-13T10:00:00Z"

# 3. Update connection strings in Key Vault
az keyvault secret set \
  --vault-name flamoral-prod-kv \
  --name DatabaseConnectionString \
  --value "postgresql://..."
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. Deployment Timeout

**Problem:** Deployment exceeds timeout period

**Solution:**
```bash
# Check pod status
kubectl get pods -n flamoral-prod

# Check pod logs
kubectl logs <pod-name> -n flamoral-prod

# Check events
kubectl get events -n flamoral-prod --sort-by='.lastTimestamp'

# Increase timeout
helm upgrade --timeout 30m ...
```

#### 2. Image Pull Errors

**Problem:** Cannot pull Docker images from ACR

**Solution:**
```bash
# Verify ACR credentials
az acr login --name flamoralprodacr

# Check image exists
az acr repository show --name flamoralprodacr --image flamoral/user-service:v1.0.0

# Verify AKS has pull permissions
az aks check-acr \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-aks \
  --acr flamoralprodacr.azurecr.io
```

#### 3. Database Migration Failures

**Problem:** Database migrations fail during deployment

**Solution:**
```bash
# Check migration job status
kubectl get jobs -n flamoral-prod

# View migration logs
kubectl logs job/db-migration-prod-123 -n flamoral-prod

# Manually run migration
kubectl apply -f infrastructure/k8s/jobs/db-migration.yaml

# Connect to database and verify
kubectl run -it --rm psql --image=postgres:15 -- \
  psql postgresql://user:pass@flamoral-prod-postgres.postgres.database.azure.com/flamoral
```

#### 4. Certificate Issues

**Problem:** TLS/SSL certificate errors

**Solution:**
```bash
# Check cert-manager certificates
kubectl get certificates -n flamoral-prod

# Check certificate status
kubectl describe certificate flamoral-tls -n flamoral-prod

# Force certificate renewal
kubectl delete secret flamoral-tls -n flamoral-prod
```

#### 5. High Resource Usage

**Problem:** Pods consuming too much CPU/memory

**Solution:**
```bash
# Check resource usage
kubectl top pods -n flamoral-prod

# Describe pod for resource limits
kubectl describe pod <pod-name> -n flamoral-prod

# Scale deployment
kubectl scale deployment/user-service --replicas=5 -n flamoral-prod

# Update resource limits
kubectl set resources deployment/user-service \
  --limits=cpu=500m,memory=512Mi \
  --requests=cpu=250m,memory=256Mi \
  -n flamoral-prod
```

### Debugging Commands

```bash
# View all resources
kubectl get all -n flamoral-prod

# Check pod logs
kubectl logs -f <pod-name> -n flamoral-prod

# Execute commands in pod
kubectl exec -it <pod-name> -n flamoral-prod -- /bin/bash

# Port forward for local testing
kubectl port-forward service/user-service 3000:3000 -n flamoral-prod

# View deployment details
kubectl describe deployment/user-service -n flamoral-prod

# Check HPA status
kubectl get hpa -n flamoral-prod

# View ingress
kubectl get ingress -n flamoral-prod
```

---

## Best Practices

### 1. Deployment Best Practices

✅ **DO:**
- Always deploy to staging before production
- Use release candidates for production deployments
- Tag Docker images with semantic versions
- Run smoke tests after deployment
- Monitor metrics during and after deployment
- Keep deployment windows short
- Deploy during off-peak hours for production
- Use canary deployments for high-risk changes

❌ **DON'T:**
- Skip testing in staging
- Deploy directly to production without approval
- Use `latest` tag for production images
- Deploy multiple services simultaneously
- Deploy without backup plan
- Ignore failed health checks
- Deploy untested database migrations

### 2. Security Best Practices

✅ **DO:**
- Rotate secrets regularly
- Use Azure Key Vault for sensitive data
- Enable Azure AD integration
- Use managed identities where possible
- Scan images for vulnerabilities
- Enable Pod Security Policies
- Use network policies
- Enable audit logging

❌ **DON'T:**
- Commit secrets to repository
- Use default credentials
- Skip security scans
- Disable TLS/SSL
- Expose services publicly unnecessarily

### 3. Monitoring Best Practices

✅ **DO:**
- Set up alerts for critical metrics
- Monitor application logs
- Track deployment metrics
- Use Azure Application Insights
- Monitor cost trends
- Set up budget alerts
- Track SLA/SLO compliance

❌ **DON'T:**
- Ignore alerts
- Skip log retention policies
- Disable monitoring in production
- Overlook cost anomalies

### 4. Cost Optimization Best Practices

✅ **DO:**
- Use autoscaling for dynamic workloads
- Enable cluster autoscaler
- Use spot instances for dev/staging
- Implement resource quotas
- Review and remove unused resources
- Use Azure reservations for stable workloads
- Optimize storage tiers

❌ **DON'T:**
- Over-provision resources
- Ignore cost reports
- Keep idle resources running
- Use premium SKUs unnecessarily

---

## Emergency Contacts

### On-Call Rotation
- **Primary:** DevOps Team Lead
- **Secondary:** Senior DevOps Engineer
- **Escalation:** CTO

### Communication Channels
- **Slack:** #incidents (high priority)
- **Email:** devops@flamoral.com
- **Phone:** [Emergency Hotline]

### Incident Response
1. Acknowledge incident in Slack
2. Assess severity and impact
3. Execute rollback if necessary
4. Communicate status updates
5. Resolve and document

---

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Azure Kubernetes Service Documentation](https://docs.microsoft.com/en-us/azure/aks/)
- [Helm Documentation](https://helm.sh/docs/)
- [Terraform Azure Provider](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [kubectl Reference](https://kubernetes.io/docs/reference/kubectl/)

---

**Last Updated:** December 2024
**Version:** 1.0.0
**Maintained By:** Flamoral DevOps Team
