# Terraform Deployment Checklist

Use this checklist to ensure a smooth and successful deployment of the Flamoral Dating Platform infrastructure.

---

## Pre-Deployment Checklist

### Environment Setup

- [ ] Terraform installed (version >= 1.4.0)
  ```bash
  terraform version
  ```

- [ ] Azure CLI installed (version >= 2.50.0)
  ```bash
  az version
  ```

- [ ] Logged into Azure
  ```bash
  az login
  az account show
  ```

- [ ] Correct subscription selected
  ```bash
  az account set --subscription ba233460-2dbe-4603-a594-68f93ec9deb3
  ```

### Credentials and Authentication

- [ ] Service Principal Client ID confirmed
  - Expected: `a85e4029-4e37-4399-9390-6e18922b38e7`

- [ ] Service Principal Client Secret obtained
  - [ ] Retrieved from Key Vault OR
  - [ ] Retrieved from Azure Portal

- [ ] Tenant ID confirmed
  - Expected: `ed27e9a3-1b1c-46c9-8a73-a4f3609d75c0`

- [ ] Environment variables set
  ```bash
  export ARM_CLIENT_ID="a85e4029-4e37-4399-9390-6e18922b38e7"
  export ARM_CLIENT_SECRET="<your-secret>"
  export ARM_TENANT_ID="ed27e9a3-1b1c-46c9-8a73-a4f3609d75c0"
  export ARM_SUBSCRIPTION_ID="ba233460-2dbe-4603-a594-68f93ec9deb3"
  ```

- [ ] Environment variables verified
  ```bash
  echo $ARM_CLIENT_ID
  echo $ARM_TENANT_ID
  echo $ARM_SUBSCRIPTION_ID
  # Don't echo CLIENT_SECRET!
  ```

### Documentation Review

- [ ] Read [QUICK_START.md](QUICK_START.md)
- [ ] Read [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- [ ] Reviewed [ISSUES_AND_FIXES.md](ISSUES_AND_FIXES.md)
- [ ] Noted troubleshooting procedures

---

## Development Environment Deployment

### Phase 1: Backend Storage (5-10 minutes)

- [ ] Navigate to terraform directory
  ```bash
  cd DatingPlatform/infrastructure/terraform
  ```

- [ ] Run backend setup script
  ```bash
  chmod +x scripts/setup-backend.sh
  ./scripts/setup-backend.sh dev
  ```

- [ ] Verify backend storage created
  ```bash
  az storage account show --name flamoraltfstatedev --resource-group flamoral-tfstate-rg
  ```

- [ ] Verify container exists
  ```bash
  az storage container show --name tfstate --account-name flamoraltfstatedev --auth-mode login
  ```

### Phase 2: Terraform Initialization (2-3 minutes)

- [ ] Navigate to dev environment
  ```bash
  cd environments/dev
  ```

- [ ] Initialize Terraform
  ```bash
  terraform init
  ```

- [ ] Verify successful initialization
  - Should see: "Terraform has been successfully initialized!"
  - Should see providers downloaded

- [ ] Validate configuration
  ```bash
  terraform validate
  ```

- [ ] Expected output: "Success! The configuration is valid."

### Phase 3: Planning (2-5 minutes)

- [ ] Create execution plan
  ```bash
  terraform plan -var-file="dev.tfvars" -out=tfplan
  ```

- [ ] Review plan output carefully:
  - [ ] Check number of resources to create (~30)
  - [ ] Verify resource names are correct
  - [ ] Verify location is westus2
  - [ ] Check for any unexpected changes
  - [ ] No resources being destroyed
  - [ ] Resource SKUs match expectations

- [ ] Save plan output for review
  ```bash
  terraform show tfplan > plan-review.txt
  ```

### Phase 4: Cost Validation (5 minutes)

- [ ] Estimate monthly costs
  - Expected dev cost: ~$130/month
  - [ ] AKS: ~$70/month
  - [ ] PostgreSQL: ~$25/month
  - [ ] Redis: ~$15/month
  - [ ] Storage: ~$5/month
  - [ ] Other: ~$15/month

- [ ] Set up budget alerts (optional)
  ```bash
  # In Azure Portal: Cost Management + Billing > Budgets
  ```

### Phase 5: Deployment (20-30 minutes)

- [ ] **FINAL CONFIRMATION** - Ready to deploy?
  - [ ] Plan reviewed and approved
  - [ ] Cost estimates acceptable
  - [ ] Time window available (30+ minutes)
  - [ ] Monitoring ready

- [ ] Apply Terraform configuration
  ```bash
  terraform apply tfplan
  ```

- [ ] Monitor deployment progress
  - [ ] Resource group created
  - [ ] Virtual network created
  - [ ] AKS cluster creating (longest step)
  - [ ] Databases creating
  - [ ] Storage and other services created

- [ ] Wait for completion
  - Expected time: 15-25 minutes
  - Watch for any errors

### Phase 6: Post-Deployment Validation (10-15 minutes)

- [ ] View Terraform outputs
  ```bash
  terraform output
  ```

- [ ] Verify resource group exists
  ```bash
  az resource list --resource-group Dating-dev-rg --output table
  ```

- [ ] Count resources created
  ```bash
  az resource list --resource-group Dating-dev-rg --query "length([])"
  ```
  - Expected: 30+ resources

- [ ] Check AKS cluster
  ```bash
  az aks list --resource-group Dating-dev-rg --output table
  az aks show --resource-group Dating-dev-rg --name flamoral-dev-aks --query provisioningState
  ```
  - Expected state: "Succeeded"

- [ ] Get AKS credentials
  ```bash
  az aks get-credentials --resource-group Dating-dev-rg --name flamoral-dev-aks
  ```

- [ ] Verify Kubernetes access
  ```bash
  kubectl get nodes
  kubectl get namespaces
  ```
  - Should see 2 nodes (1 system, 1 user)

- [ ] Check PostgreSQL server
  ```bash
  az postgres flexible-server list --resource-group Dating-dev-rg --output table
  az postgres flexible-server db list --resource-group Dating-dev-rg --server-name flamoral-dev-postgres
  ```
  - Should see 2 databases: flamoral, flamoral_analytics

- [ ] Verify Redis cache
  ```bash
  az redis list --resource-group Dating-dev-rg --output table
  ```

- [ ] Check storage account
  ```bash
  az storage account list --resource-group Dating-dev-rg --output table
  ```

- [ ] Get storage account name
  ```bash
  STORAGE_NAME=$(terraform output -raw storage_account_name)
  echo $STORAGE_NAME
  ```

- [ ] Verify blob containers
  ```bash
  az storage container list --account-name $STORAGE_NAME --auth-mode login
  ```
  - Should see: media, profiles, videos, stories

- [ ] Check Key Vault
  ```bash
  KV_NAME=$(terraform output -raw key_vault_name)
  az keyvault list --resource-group Dating-dev-rg --output table
  ```

- [ ] Verify secrets in Key Vault
  ```bash
  az keyvault secret list --vault-name $KV_NAME --output table
  ```
  - Should see: postgres-password, redis-connection-string, storage-connection-string

- [ ] Retrieve a secret (test access)
  ```bash
  az keyvault secret show --vault-name $KV_NAME --name postgres-password --query name
  ```

- [ ] Check monitoring resources
  ```bash
  az monitor log-analytics workspace list --resource-group Dating-dev-rg --output table
  az monitor app-insights component list --resource-group Dating-dev-rg --output table
  ```

- [ ] Verify CDN endpoint
  ```bash
  az cdn endpoint list --profile-name flamoral-dev-cdn --resource-group Dating-dev-rg --output table
  ```

### Phase 7: Documentation (5 minutes)

- [ ] Document deployment details
  - [ ] Deployment date and time
  - [ ] Terraform version used
  - [ ] Any issues encountered
  - [ ] Resource names (especially with random suffixes)

- [ ] Save important outputs
  ```bash
  terraform output > deployment-outputs.txt
  terraform output -json > deployment-outputs.json
  ```

- [ ] Update team documentation
  - [ ] Add AKS cluster name
  - [ ] Add Key Vault name
  - [ ] Add PostgreSQL FQDN
  - [ ] Add ACR login server

---

## Staging Environment Deployment

### Prerequisites

- [ ] Development environment successfully deployed
- [ ] Development environment tested and validated
- [ ] Same authentication credentials available

### Deployment Steps

- [ ] Create backend storage
  ```bash
  cd DatingPlatform/infrastructure/terraform
  ./scripts/setup-backend.sh staging
  ```

- [ ] Initialize Terraform
  ```bash
  cd environments/staging
  terraform init
  ```

- [ ] Validate configuration
  ```bash
  terraform validate
  ```

- [ ] Create plan
  ```bash
  terraform plan -var-file="terraform.tfvars" -out=tfplan
  ```

- [ ] Review plan
  - Expected resources: ~30
  - Location: westus2 (or configured region)
  - Higher SKUs than dev

- [ ] Apply configuration
  ```bash
  terraform apply tfplan
  ```

- [ ] Run post-deployment validation (same as dev)

- [ ] Document staging deployment

---

## Production Environment Deployment

### Prerequisites

⚠️ **PRODUCTION DEPLOYMENT - EXTRA CAUTION REQUIRED**

- [ ] Staging environment successfully deployed
- [ ] Staging environment tested for at least 7 days
- [ ] All tests passing in staging
- [ ] Team lead approval obtained
- [ ] Change request submitted and approved
- [ ] Maintenance window scheduled
- [ ] Rollback plan prepared
- [ ] Team members notified

### Pre-Production Checks

- [ ] Review production tfvars
  ```bash
  cat environments/prod/terraform.tfvars
  ```

- [ ] Verify production costs acceptable
  - Expected: ~$1,480/month
  - [ ] Budget approved
  - [ ] Cost alerts configured

- [ ] Verify high availability settings
  - [ ] PostgreSQL HA enabled
  - [ ] Geo-redundant backups enabled
  - [ ] Multiple node pools configured

- [ ] Review security settings
  - [ ] All secrets in Key Vault
  - [ ] Network security groups configured
  - [ ] Private endpoints configured

### Deployment Steps

- [ ] **STOP** - Final confirmation checklist:
  - [ ] Team lead approval ✓
  - [ ] Maintenance window active ✓
  - [ ] Rollback plan ready ✓
  - [ ] Team on standby ✓

- [ ] Create backend storage
  ```bash
  ./scripts/setup-backend.sh prod
  ```

- [ ] Initialize Terraform
  ```bash
  cd environments/prod
  terraform init
  ```

- [ ] Validate configuration
  ```bash
  terraform validate
  ```

- [ ] Create plan
  ```bash
  terraform plan -var-file="terraform.tfvars" -out=tfplan
  ```

- [ ] **COMPREHENSIVE PLAN REVIEW**
  - [ ] Save plan output
    ```bash
    terraform show tfplan > prod-plan-review.txt
    ```
  - [ ] Review with team
  - [ ] Verify all resources
  - [ ] Check resource sizes
  - [ ] Verify costs
  - [ ] Check security settings

- [ ] **FINAL APPROVAL** - Proceed with production deployment?
  - [ ] Plan approved by team lead
  - [ ] All checks passed
  - [ ] Team ready

- [ ] Apply configuration
  ```bash
  terraform apply tfplan
  ```

- [ ] Monitor deployment closely
  - [ ] Watch for any errors
  - [ ] Monitor Azure Portal
  - [ ] Check Application Insights

- [ ] Run comprehensive post-deployment validation

- [ ] Configure DNS (if new deployment)
  ```bash
  # Get Application Gateway IP
  terraform output ingress_public_ip
  # Update DNS A record for flamoral.com
  ```

- [ ] Configure SSL certificates

- [ ] Run integration tests

- [ ] Monitor for 24-48 hours

---

## Rollback Procedures

### If Deployment Fails

- [ ] Document the error
  ```bash
  terraform plan > error-state.txt
  ```

- [ ] Check Terraform state
  ```bash
  terraform state list
  ```

- [ ] Identify problematic resource
  ```bash
  terraform state show <resource-name>
  ```

- [ ] Option 1: Fix and re-apply
  ```bash
  terraform apply
  ```

- [ ] Option 2: Destroy and recreate
  ```bash
  terraform destroy -target=<resource-name>
  terraform apply
  ```

- [ ] Option 3: Complete rollback (dev/staging only)
  ```bash
  terraform destroy
  ```

### If Post-Deployment Issues Found

- [ ] Review Application Insights
- [ ] Check Azure Monitor
- [ ] Review AKS logs
  ```bash
  kubectl logs -n <namespace> <pod-name>
  ```

- [ ] Check resource health in Azure Portal

---

## Post-Deployment Tasks

### Immediate (Day 1)

- [ ] Configure AKS access for team
  ```bash
  az aks get-credentials --resource-group <rg-name> --name <aks-name>
  # Share kubeconfig securely
  ```

- [ ] Deploy application to AKS
- [ ] Configure CI/CD pipelines
- [ ] Set up monitoring alerts
- [ ] Configure log forwarding

### Short-term (Week 1)

- [ ] Verify backup jobs running
- [ ] Monitor costs daily
- [ ] Review resource utilization
- [ ] Optimize resource sizing if needed
- [ ] Document any issues or improvements

### Long-term (Month 1)

- [ ] Review security posture
- [ ] Audit access controls
- [ ] Review and optimize costs
- [ ] Update documentation
- [ ] Plan for scaling

---

## Troubleshooting Reference

### Common Issues

**Issue:** Backend initialization fails
```bash
./scripts/setup-backend.sh dev
terraform init -reconfigure
```

**Issue:** Authentication errors
```bash
# Re-export environment variables
source .env
```

**Issue:** State locked
```bash
terraform force-unlock <lock-id>
```

**Issue:** Resource exists
```bash
terraform import <resource-type>.<name> <azure-resource-id>
```

**Issue:** Quota exceeded
```bash
az vm list-usage --location westus2 --output table
# Request quota increase or reduce sizes
```

---

## Sign-Off

### Development Environment

- [ ] Deployment completed successfully
- [ ] All validation checks passed
- [ ] Documentation updated
- [ ] Team notified

**Deployed By:** ________________
**Date:** ________________
**Time:** ________________

### Staging Environment

- [ ] Deployment completed successfully
- [ ] All validation checks passed
- [ ] Documentation updated
- [ ] Team notified

**Deployed By:** ________________
**Date:** ________________
**Time:** ________________

### Production Environment

- [ ] Deployment completed successfully
- [ ] All validation checks passed
- [ ] DNS configured
- [ ] SSL certificates installed
- [ ] Monitoring configured
- [ ] Documentation updated
- [ ] Team notified

**Deployed By:** ________________
**Approved By:** ________________
**Date:** ________________
**Time:** ________________

---

## Notes and Comments

Use this section to document any issues, deviations, or important notes during deployment:

```
Date: ________
Notes:



```

---

**Checklist Version:** 1.0
**Last Updated:** 2025-12-11
**Next Review:** After first deployment
