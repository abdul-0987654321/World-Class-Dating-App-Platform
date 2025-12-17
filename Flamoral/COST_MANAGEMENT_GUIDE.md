# Flamoral Platform - Cost Management Guide

## Table of Contents

1. [Overview](#overview)
2. [Expected Monthly Costs Breakdown](#expected-monthly-costs-breakdown)
3. [Cost Optimization Checklist](#cost-optimization-checklist)
4. [Reserved Instance Calculator](#reserved-instance-calculator)
5. [Budget Alerts Configuration](#budget-alerts-configuration)
6. [Cost Allocation & Tagging](#cost-allocation--tagging)
7. [Cost Monitoring Tools](#cost-monitoring-tools)
8. [Optimization Strategies](#optimization-strategies)
9. [Emergency Cost Controls](#emergency-cost-controls)
10. [Quarterly Review Process](#quarterly-review-process)

---

## Overview

This guide provides comprehensive cost management strategies for the Flamoral dating platform running on Azure. It includes expected costs, optimization techniques, and tools for monitoring and controlling cloud spending.

### Key Objectives

- Maintain production costs under $2,500/month
- Achieve 40-60% savings through reserved instances
- Minimize waste from unused resources
- Implement proactive cost anomaly detection
- Enable granular cost allocation by service and team

### Cost Management Tools

| Tool | Purpose | Location |
|------|---------|----------|
| Terraform Module | Budget alerts & cost exports | `infrastructure/terraform/modules/cost-management/` |
| Azure Budgets | Monthly spending limits | `infrastructure/azure/budget-alerts.json` |
| Cost Script | Advisor recommendations | `scripts/check-cost-recommendations.sh` |
| Tagging Policy | Cost allocation | `infrastructure/azure/cost-tags-policy.json` |
| PowerShell Scripts | Resource management | `infrastructure/cost-control/scripts/` |

---

## Expected Monthly Costs Breakdown

### Production Environment

#### Core Infrastructure (Always Running)

| Service | SKU/Tier | Quantity | Unit Cost | Monthly Cost | Annual Cost |
|---------|----------|----------|-----------|--------------|-------------|
| **Azure Front Door** | Premium | 1 | $325 | **$325** | $3,900 |
| **Azure Kubernetes Service** | Standard | 3 nodes | $150/node | **$450** | $5,400 |
| **PostgreSQL Flexible Server** | General Purpose D4s_v3 | 1 | $365 | **$365** | $4,380 |
| **Redis Cache** | Premium P1 | 1 | $411 | **$411** | $4,932 |
| **SignalR Service** | Premium P1 | 1 | $100 | **$100** | $1,200 |
| **Container Registry** | Premium (shared) | 1 | $450 | **$450** | $5,400 |
| **Azure Blob Storage** | GRS Hot | ~500GB | $0.03/GB | **$15** | $180 |
| **Cosmos DB** | Serverless | 1 | $50 | **$50** | $600 |
| **Key Vault** | Standard | 10 | $1/vault | **$10** | $120 |
| **Log Analytics** | Per GB | ~100GB | $0.30/GB | **$30** | $360 |
| **Virtual Network** | Standard | 1 | $5 | **$5** | $60 |
| **Public IP** | Standard | 2 | $4/IP | **$8** | $96 |
| **Bandwidth (Egress)** | - | ~2TB | $0.05/GB | **$100** | $1,200 |
| | | | **TOTAL** | **$2,319** | **$27,828** |

#### Variable Costs (Usage-Based)

| Service | Basis | Estimated | Notes |
|---------|-------|-----------|-------|
| **SignalR Messages** | Per million | $25-50 | Depends on active users |
| **Storage Operations** | Per 10k ops | $10-20 | File uploads/downloads |
| **Cosmos DB RUs** | Per hour | $25-75 | Serverless billing |
| **CDN Bandwidth** | Per GB | $20-40 | Via Front Door |
| **Key Vault Operations** | Per 10k ops | $5 | Secret retrievals |
| | | **$85-180** | |

**Total Production Cost: $2,400-2,500/month**

### Staging Environment

| Service | SKU/Tier | Monthly Cost | Notes |
|---------|----------|--------------|-------|
| AKS Cluster | 1 node B2s | $30 | Scaled down when not in use |
| PostgreSQL | Burstable B1ms | $25 | Lower tier |
| Redis | Basic C0 | $16 | Minimal cache |
| Storage | LRS | $5 | |
| Other Services | Minimal | $24 | |
| | **TOTAL** | **$100-150** | Can be shutdown nights/weekends |

### Development Environment

| Service | Monthly Cost | Notes |
|---------|--------------|-------|
| Container Registry (Basic) | $5 | Separate registry |
| Storage | $5 | Local development preferred |
| Other | $10 | Ad-hoc testing resources |
| | **$20-30** | Shutdown when not in use |

### Shared Resources

| Service | Monthly Cost | Allocation |
|---------|--------------|------------|
| ACR Premium (shared) | $450 | Split across environments |
| Terraform State Storage | $5 | Shared infrastructure |
| Azure DevOps Pipelines | $0 | Free tier (1800 mins/month) |
| | **$455** | |

---

## Cost Optimization Checklist

### Daily Tasks

- [ ] Monitor cost anomaly alerts
- [ ] Review budget alert emails
- [ ] Check for failed resources (avoid orphaned costs)

### Weekly Tasks

- [ ] Review Azure Advisor recommendations
  ```bash
  ./scripts/check-cost-recommendations.sh -o markdown -f weekly-cost-report.md
  ```
- [ ] Check for unused resources (disks, IPs, etc.)
- [ ] Verify auto-shutdown worked for non-prod
- [ ] Review top 10 cost contributors

### Monthly Tasks

- [ ] Compare actual vs. budgeted costs
- [ ] Review resource utilization (right-sizing)
- [ ] Update budget forecasts
- [ ] Clean up old backups and snapshots
- [ ] Review reserved instance utilization
- [ ] Generate cost allocation report by team/service
- [ ] Review and optimize storage lifecycle policies

### Quarterly Tasks

- [ ] Reserved instance renewal review
- [ ] Evaluate new Azure pricing options
- [ ] Review and update cost allocation tags
- [ ] Capacity planning for next quarter
- [ ] Evaluate alternative service tiers
- [ ] Cost optimization workshop with team
- [ ] Update cost management documentation

### Annual Tasks

- [ ] Reserved instance commitment review (1-year vs 3-year)
- [ ] Architecture review for cost efficiency
- [ ] Vendor negotiation (Enterprise Agreement)
- [ ] Disaster recovery cost assessment
- [ ] Budget planning for next fiscal year

---

## Reserved Instance Calculator

### Virtual Machines (AKS Nodes)

#### Scenario: 3 x Standard_D4s_v3 nodes (production AKS)

| Term | Pay-as-you-go | 1-Year RI | 3-Year RI | Savings |
|------|---------------|-----------|-----------|---------|
| **Hourly Rate** | $0.206/hr | $0.147/hr | $0.104/hr | - |
| **Monthly Cost** | $450 | $321 | $227 | - |
| **Annual Cost** | $5,400 | $3,852 | $2,724 | - |
| **3-Year Total** | $16,200 | $11,556 | $8,172 | - |
| **Savings** | - | **29% ($1,548/yr)** | **50% ($2,676/yr)** | |
| **Upfront Payment** | None | $3,852 | $8,172 | All upfront |
| **Monthly Payment** | $450 | $321 | $227 | Pay monthly option |

**Recommendation:** 1-year RI for production, pay monthly

### PostgreSQL Flexible Server

#### Scenario: General Purpose D4s_v3 (production database)

| Term | Pay-as-you-go | 1-Year Reserved | 3-Year Reserved | Savings |
|------|---------------|-----------------|-----------------|---------|
| **Monthly Cost** | $365 | $237 | $182 | - |
| **Annual Cost** | $4,380 | $2,844 | $2,184 | - |
| **3-Year Total** | $13,140 | $8,532 | $6,552 | - |
| **Savings** | - | **35% ($1,536/yr)** | **50% ($2,196/yr)** | |

**Recommendation:** 3-year reserved capacity for stable production DB

### Redis Cache

#### Scenario: Premium P1 (production cache)

| Term | Pay-as-you-go | 1-Year RI | 3-Year RI | Savings |
|------|---------------|-----------|-----------|---------|
| **Monthly Cost** | $411 | $267 | $205 | - |
| **Annual Cost** | $4,932 | $3,204 | $2,460 | - |
| **3-Year Total** | $14,796 | $9,612 | $7,380 | - |
| **Savings** | - | **35% ($1,728/yr)** | **50% ($2,472/yr)** | |

**Recommendation:** 1-year RI initially, evaluate 3-year after 6 months

### Total Reserved Instance Savings

#### Conservative Approach (1-Year RIs)

| Resource | Pay-as-you-go | 1-Year RI | Annual Savings |
|----------|---------------|-----------|----------------|
| AKS (3 nodes) | $5,400 | $3,852 | **$1,548** |
| PostgreSQL | $4,380 | $2,844 | **$1,536** |
| Redis | $4,932 | $3,204 | **$1,728** |
| **TOTAL** | **$14,712** | **$9,900** | **$4,812 (33%)** |

#### Aggressive Approach (3-Year RIs)

| Resource | Pay-as-you-go | 3-Year RI | Annual Savings |
|----------|---------------|-----------|----------------|
| AKS (3 nodes) | $5,400 | $2,724 | **$2,676** |
| PostgreSQL | $4,380 | $2,184 | **$2,196** |
| Redis | $4,932 | $2,460 | **$2,472** |
| **TOTAL** | **$14,712** | **$7,368** | **$7,344 (50%)** |

**With 3-year RIs, estimated production cost drops from $2,500 to $1,600/month**

### RI Purchase Recommendations

#### Immediate (High Confidence)

✅ **PostgreSQL Database** - 3-year reserved capacity
- Stable workload, core service
- 50% savings (~$2,200/year)
- Low risk

✅ **AKS Nodes (2 nodes)** - 1-year RI
- Core production capacity
- 29% savings (~$1,000/year)
- Keep 1 node pay-as-you-go for flexibility

#### 3-Month Evaluation

⏳ **Redis Cache** - Monitor usage patterns
- Evaluate P1 vs P2 tier needs
- Consider 1-year RI after pattern analysis
- Potential 35% savings (~$1,700/year)

⏳ **AKS Node 3** - Watch scaling patterns
- Determine if 3rd node is always needed
- Convert to 3-year RI if consistently utilized
- Additional 21% savings (~$650/year)

#### Not Recommended

❌ **Front Door Premium** - Keep pay-as-you-go
- May optimize configuration over time
- No RI option available

❌ **SignalR Service** - Keep pay-as-you-go
- Usage may vary significantly
- Evaluate serverless alternatives

---

## Budget Alerts Configuration

### Alert Thresholds

All budgets configured with 4-tier alerting:

| Threshold | Type | Action | Recipients |
|-----------|------|--------|------------|
| **50%** | Warning | Email | DevOps team |
| **75%** | Alert | Email + Slack | DevOps + Finance |
| **90%** | Critical | Email + Slack + PagerDuty | Engineering leadership |
| **100%** | Exceeded | All channels + escalation | C-level |
| **100% (Forecasted)** | Predictive | Email | Finance team |

### Budget Configuration

```bash
# Deploy budgets via Terraform
cd infrastructure/terraform
terraform apply -target=module.cost_management

# Or via Azure CLI
az deployment sub create \
  --location eastus \
  --template-file infrastructure/azure/budget-alerts.json \
  --parameters notificationEmails='["devops@flamoral.com","finance@flamoral.com"]'
```

### Budget Amounts by Environment

| Environment | Overall | Compute | Storage | Network | Database |
|-------------|---------|---------|---------|---------|----------|
| **Production** | $2,500 | $600 | $200 | $400 | $800 |
| **Staging** | $200 | $50 | $25 | $50 | $75 |
| **Development** | $100 | $25 | $15 | $25 | $35 |
| **Shared** | $500 | $0 | $100 | $50 | $0 |
| **TOTAL** | **$3,300** | **$675** | **$340** | **$525** | **$910** |

---

## Cost Allocation & Tagging

### Required Tags

Every resource must have these tags for cost allocation:

```hcl
tags = {
  Environment  = "prod"                    # dev, staging, prod, shared
  Service      = "flamoral-platform"       # Service name
  Team         = "platform"                # Owning team
  CostCenter   = "engineering"             # Billing department
  BillingOwner = "platform-team@flamoral.com"
  ManagedBy    = "terraform"               # How it's provisioned
}
```

### Tag Enforcement

```bash
# Deploy tagging policy
az policy assignment create \
  --name flamoral-cost-tags \
  --policy infrastructure/azure/cost-tags-policy.json \
  --scope /subscriptions/<subscription-id>

# Audit existing resources
az policy state list \
  --policy-assignment flamoral-cost-tags \
  --filter "complianceState eq 'NonCompliant'" \
  --output table
```

### Cost Allocation Views

#### By Environment

```bash
az costmanagement query \
  --type ActualCost \
  --dataset-grouping name=Environment type=Tag \
  --timeframe MonthToDate
```

#### By Service

```bash
az costmanagement query \
  --type ActualCost \
  --dataset-grouping name=Service type=Tag \
  --timeframe MonthToDate
```

#### By Team

```bash
az costmanagement query \
  --type ActualCost \
  --dataset-grouping name=Team type=Tag \
  --timeframe MonthToDate
```

---

## Cost Monitoring Tools

### 1. Azure Cost Management

**Portal:** [portal.azure.com/#view/Microsoft_Azure_CostManagement](https://portal.azure.com/#view/Microsoft_Azure_CostManagement/Menu/~/overview)

**Key Features:**
- Daily cost updates (24-48 hour lag)
- Cost analysis and forecasting
- Budget alerts
- Advisor recommendations
- Cost allocation by tag

**Daily Review:**
1. Check cost trends
2. Review top resources
3. Identify anomalies
4. Verify budget status

### 2. Automated Cost Script

```bash
# Daily cost report (automated in CI/CD)
./scripts/check-cost-recommendations.sh -o markdown -f daily-cost-report.md

# Weekly detailed analysis
./scripts/check-cost-recommendations.sh -o html -f weekly-report.html

# On-demand JSON export
./scripts/check-cost-recommendations.sh -o json -f cost-data.json
```

### 3. Azure Advisor

**Portal:** [portal.azure.com/#view/Microsoft_Azure_Expert/AdvisorMenuBlade](https://portal.azure.com/#view/Microsoft_Azure_Expert/AdvisorMenuBlade/~/Cost)

**Recommendations:**
- Right-size underutilized resources
- Reserved instance opportunities
- Delete unused resources
- Optimize VM SKUs

### 4. Cost Export to Storage

**Configure:**
```bash
# Exports configured via Terraform module
# Data exported daily to: flamoral-cost-export-prod/cost-exports/

# Download latest export
az storage blob download \
  --account-name <cost-export-account> \
  --container-name cost-exports \
  --name <latest-export.csv> \
  --file cost-export.csv
```

### 5. Power BI Integration

**Setup:**
1. Connect Power BI to cost export storage account
2. Use provided template: `infrastructure/cost-control/powerbi-template.pbit`
3. Configure incremental refresh (daily)
4. Share dashboard with stakeholders

**Dashboards:**
- Executive summary (daily/monthly trends)
- Cost breakdown by service
- Team cost allocation
- Budget vs. actual
- Reserved instance utilization

---

## Optimization Strategies

### 1. Auto-Shutdown Non-Production

```bash
# Shutdown dev/staging environments (nights & weekends)
cd infrastructure/cost-control/scripts
./shutdown-nonprod.ps1

# Estimated savings: $50-100/month
```

**Schedule:**
- Weekdays: Shutdown 10 PM - 6 AM (8 hours)
- Weekends: Full shutdown
- Monthly savings: ~$80

### 2. Right-Size Resources

**AKS Nodes:**
- Current: Standard_D4s_v3 (4 vCPU, 16GB)
- Evaluate: Standard_D2s_v3 (2 vCPU, 8GB) for non-peak nodes
- Savings: $75/node/month

**PostgreSQL:**
- Monitor CPU and memory utilization
- Consider Burstable tier for read replicas
- Use Azure Advisor recommendations

**Redis:**
- Evaluate P1 vs P2 tier based on memory usage
- Consider Standard tier for non-production

### 3. Storage Optimization

```bash
# Implement lifecycle policies
# Move old data to Cool/Archive tier
# Delete snapshots older than 90 days
```

**Lifecycle Policy Example:**
- Hot: 0-30 days
- Cool: 31-90 days
- Archive: 91+ days
- Delete: 365+ days

**Estimated savings: $10-20/month**

### 4. Network Optimization

- Review Front Door routing rules
- Optimize CDN caching (reduce origin fetches)
- Use private endpoints to avoid egress charges
- Compress static assets

**Estimated savings: $20-40/month**

### 5. Database Optimization

**Query Optimization:**
- Use Query Performance Insights
- Add missing indexes
- Optimize slow queries

**Connection Pooling:**
- Implement PgBouncer
- Reduce connection overhead

**Read Replicas:**
- Use for reporting workloads
- Lower tier acceptable

**Estimated savings: $30-50/month**

### 6. Log Retention

```hcl
# Reduce Log Analytics retention
log_retention_days = 30  # Down from 90

# Estimated savings: $15-20/month
```

### 7. Container Registry

**Image Cleanup:**
```bash
# Delete old/unused images
acr purge --registry <name> --filter 'timestamp < "30d"' --dry-run

# Estimated savings: $50-100/month on Premium ACR
```

---

## Emergency Cost Controls

### Immediate Actions (Budget Exceeded)

#### Level 1: Investigation (50-75% of budget)

1. **Identify anomalies**
   ```bash
   ./scripts/check-cost-recommendations.sh
   ```

2. **Review top cost contributors**
   - Check Azure Cost Management
   - Identify unexpected resources

3. **Alert stakeholders**
   - Notify engineering leadership
   - Prepare cost reduction plan

#### Level 2: Non-Critical Reductions (75-90% of budget)

1. **Shutdown non-production environments**
   ```bash
   ./infrastructure/cost-control/scripts/shutdown-nonprod.ps1
   ```

2. **Reduce AKS node count**
   ```bash
   az aks nodepool scale --name <pool> --node-count 2
   ```

3. **Lower database tier** (staging only)
   ```bash
   az postgres flexible-server update --sku-name Standard_B1ms
   ```

4. **Disable scheduled jobs**
   - Pause non-critical cron jobs
   - Reduce background processing

**Estimated savings: $200-300/month**

#### Level 3: Production Optimization (90-100% of budget)

1. **Scale down AKS to minimum**
   - Reduce replicas to 2 per deployment
   - Scale to 2 nodes

2. **Reduce Redis cache tier**
   - Downgrade from P1 to Standard if possible

3. **Disable optional features**
   - Video calls (SignalR)
   - Real-time notifications

4. **Throttle API rate limits**
   - Reduce concurrent requests
   - Implement request queuing

**Estimated savings: $300-500/month** (with service degradation)

#### Level 4: Emergency Shutdown (>100% of budget)

**ONLY IF NECESSARY - REQUIRES C-LEVEL APPROVAL**

1. Put site in maintenance mode
2. Scale to absolute minimum (1 AKS node, smallest DB)
3. Disable all non-essential services
4. Contact Azure support for emergency cost controls

### Prevention

- Daily cost monitoring
- Weekly budget reviews
- Automated anomaly detection
- Reserved instance commitments
- Resource tagging enforcement

---

## Quarterly Review Process

### Preparation (Week 1)

- [ ] Export cost data for quarter
- [ ] Generate trend analysis
- [ ] Compile optimization opportunities
- [ ] Review reserved instance utilization
- [ ] Prepare stakeholder presentation

### Review Meeting (Week 2)

**Attendees:**
- Engineering leadership
- Finance team
- Platform/DevOps team
- Product management

**Agenda:**
1. Actual vs. budgeted costs
2. Cost trends and forecasts
3. Top cost contributors
4. Optimization achievements
5. Reserved instance ROI
6. Next quarter budget
7. Action items

### Action Items (Week 3-4)

- [ ] Implement approved optimizations
- [ ] Update budget allocations
- [ ] Renew/purchase reserved instances
- [ ] Update cost documentation
- [ ] Configure new budget alerts

### Quarterly Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Total cost vs. budget | < 100% | __%  | ✅/⚠️/❌ |
| Reserved instance utilization | > 90% | __% | ✅/⚠️/❌ |
| Unused resources | < 5 | __ | ✅/⚠️/❌ |
| Cost per user | Decreasing | __ | ✅/⚠️/❌ |
| Optimization savings | > $500 | $__ | ✅/⚠️/❌ |

---

## Quick Reference Commands

```bash
# Check current month costs
az costmanagement query --type ActualCost --timeframe MonthToDate

# List all budgets
az consumption budget list --subscription <sub-id>

# Get Advisor recommendations
az advisor recommendation list --category Cost --output table

# Find unused resources
./scripts/check-cost-recommendations.sh -o table

# Export costs to CSV
az costmanagement query --type ActualCost --timeframe Custom \
  --time-period from=2024-12-01 to=2024-12-31 \
  --output csv > december-costs.csv

# Shutdown non-prod
./infrastructure/cost-control/scripts/shutdown-nonprod.ps1

# Check budget status
az consumption budget show --budget-name flamoral-prod-overall-budget
```

---

## Resources

### Internal Documentation

- Terraform Cost Module: `infrastructure/terraform/modules/cost-management/`
- Budget Configuration: `infrastructure/azure/budget-alerts.json`
- Tagging Policy: `infrastructure/azure/cost-tags-policy.json`
- Cost Scripts: `scripts/check-cost-recommendations.sh`
- PowerShell Tools: `infrastructure/cost-control/scripts/`

### External Resources

- [Azure Pricing Calculator](https://azure.microsoft.com/pricing/calculator/)
- [Azure Cost Management Docs](https://docs.microsoft.com/azure/cost-management-billing/)
- [Reserved Instances](https://portal.azure.com/#view/Microsoft_Azure_Reservations/ReservationsBrowseBlade)
- [Azure Advisor](https://portal.azure.com/#view/Microsoft_Azure_Expert/AdvisorMenuBlade/~/Cost)
- [TCO Calculator](https://azure.microsoft.com/pricing/tco/calculator/)

### Support

- **Cost Optimization Questions:** platform-team@flamoral.com
- **Budget Alerts:** devops@flamoral.com
- **Azure Support:** [Azure Portal](https://portal.azure.com/#blade/Microsoft_Azure_Support/HelpAndSupportBlade)

---

**Last Updated:** 2024-12-13
**Version:** 1.0.0
**Maintained By:** DevOps Team
