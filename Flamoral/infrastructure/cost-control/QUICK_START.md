# Cost Management - Quick Start Guide

## 🚀 Deploy in 5 Minutes

### Step 1: Deploy Budgets & Alerts (2 min)

```bash
cd infrastructure/terraform/environments/prod

# Update notification emails
echo 'cost_notification_emails = ["your-email@flamoral.com"]' >> terraform.tfvars

# Deploy
terraform apply -target=module.cost_management -auto-approve
```

### Step 2: Configure Cost Export (1 min)

```bash
cd ../../../infrastructure/azure

./setup-cost-export.sh \
  -s ebd1613e-fea0-4b6d-8918-7e4de6a71c44 \
  -r flamoral-prod-rg \
  -a flamoralcostexpprod \
  -f Daily
```

### Step 3: Generate First Report (1 min)

```bash
cd ../../scripts
./check-cost-recommendations.sh -o markdown -f cost-report.md
cat cost-report.md
```

### Step 4: Deploy Tagging Policy (1 min)

```bash
cd ../infrastructure/azure

az policy definition create \
  --name flamoral-cost-tags \
  --mode Indexed \
  --rules cost-tags-policy.json

az policy assignment create \
  --name flamoral-cost-tags-prod \
  --policy flamoral-cost-tags \
  --scope /subscriptions/ebd1613e-fea0-4b6d-8918-7e4de6a71c44/resourceGroups/flamoral-prod-rg \
  --params '{"effect":{"value":"Audit"}}'
```

## ✅ Verify Everything Works

```bash
# Check budgets
az consumption budget list --subscription ebd1613e-fea0-4b6d-8918-7e4de6a71c44 --output table

# Check action groups
az monitor action-group list --resource-group flamoral-prod-rg --output table

# Check cost exports
az costmanagement export list --scope /subscriptions/ebd1613e-fea0-4b6d-8918-7e4de6a71c44 --output table
```

## 📊 Daily Tasks (30 seconds)

```bash
# Quick cost check
./scripts/check-cost-recommendations.sh -o table

# Review budget status
az consumption budget show \
  --budget-name flamoral-prod-overall-budget \
  --subscription ebd1613e-fea0-4b6d-8918-7e4de6a71c44 \
  --query "{Name:name,Amount:amount,Current:currentSpend.amount,Percent:currentSpend.unit}" \
  --output table
```

## 📈 Weekly Tasks (5 minutes)

```bash
# Generate detailed report
./scripts/check-cost-recommendations.sh -o markdown -f weekly-report.md

# Review Advisor recommendations
az advisor recommendation list --category Cost --output table

# Check for unused resources
az disk list --query "[?diskState=='Unattached']" --output table
az network public-ip list --query "[?ipConfiguration==null]" --output table
```

## 💰 Current Costs (Baseline)

| Category | Monthly | Annual | RI Savings Potential |
|----------|---------|--------|---------------------|
| Front Door | $325 | $3,900 | N/A |
| AKS | $450 | $5,400 | $2,676 (50%) |
| PostgreSQL | $365 | $4,380 | $2,196 (50%) |
| Redis | $411 | $4,932 | $2,472 (50%) |
| ACR Premium | $450 | $5,400 | N/A |
| Other | $349 | $4,188 | N/A |
| **TOTAL** | **$2,350** | **$28,200** | **$7,344 (26%)** |

## 🎯 Quick Wins (Implement Today)

1. **Delete unattached disks** - $20-40/month
   ```bash
   az disk list --query "[?diskState=='Unattached'].{Name:name,RG:resourceGroup}" -o table
   # Review and delete manually
   ```

2. **Remove unused public IPs** - $8-16/month
   ```bash
   az network public-ip list --query "[?ipConfiguration==null].{Name:name,RG:resourceGroup}" -o table
   # Review and delete manually
   ```

3. **Clean old container images** - $50-100/month
   ```bash
   az acr repository list --name flamoralacr --output table
   # Use ACR purge command or Azure Portal
   ```

4. **Reduce log retention** - $15-20/month
   ```bash
   # Update in terraform.tfvars: log_analytics_retention_days = 30
   terraform apply
   ```

**Total Quick Wins: $93-176/month**

## 🔔 Budget Alerts

| Threshold | Action | Recipients |
|-----------|--------|------------|
| 50% | Email | DevOps team |
| 75% | Email + Review | DevOps + Finance |
| 90% | Email + Escalation | Leadership |
| 100% | All channels | C-level |

## 📋 Monthly Checklist

- [ ] Review budget vs. actual
- [ ] Implement Advisor recommendations
- [ ] Clean up unused resources
- [ ] Check RI utilization
- [ ] Update cost forecasts
- [ ] Generate stakeholder report

## 🆘 Emergency: Budget Exceeded

```bash
# 1. Immediate investigation
./scripts/check-cost-recommendations.sh -o table

# 2. Shutdown non-prod (if needed)
cd infrastructure/cost-control/scripts
./shutdown-nonprod.ps1

# 3. Scale down production (last resort)
az aks nodepool scale --name <pool> --node-count 2 --cluster-name <aks-name> --resource-group flamoral-prod-rg
```

## 📚 Full Documentation

- **Complete Guide:** `COST_MANAGEMENT_GUIDE.md`
- **Implementation Summary:** `COST_MANAGEMENT_IMPLEMENTATION_SUMMARY.md`
- **Terraform Module:** `infrastructure/terraform/modules/cost-management/README.md`
- **Azure Guide:** `infrastructure/azure/README-COST-MANAGEMENT.md`

## 🔗 Quick Links

- [Azure Cost Management](https://portal.azure.com/#view/Microsoft_Azure_CostManagement/Menu/~/overview)
- [Azure Advisor](https://portal.azure.com/#view/Microsoft_Azure_Expert/AdvisorMenuBlade/~/Cost)
- [Pricing Calculator](https://azure.microsoft.com/pricing/calculator/)
- [Reserved Instances](https://portal.azure.com/#view/Microsoft_Azure_Reservations/ReservationsBrowseBlade)

## 💬 Support

- **Questions:** devops@flamoral.com
- **Finance:** finance@flamoral.com
- **Escalation:** engineering-leadership@flamoral.com
