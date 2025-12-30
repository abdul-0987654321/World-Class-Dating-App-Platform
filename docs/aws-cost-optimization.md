# AWS Cost Optimization Guide

This document outlines the cost optimization strategies implemented across all AWS environments (dev, staging, prod) for the Flamoral dating platform.

## Summary of Monthly Cost Savings

| Environment | Before | After | Savings |
|-------------|--------|-------|---------|
| Dev | ~$800/month | ~$150/month | ~81% |
| Staging | ~$1,200/month | ~$300/month | ~75% |
| Prod | ~$3,500/month | ~$1,200/month | ~66% |

## Cost Optimization Strategies by Service

### 1. EKS (Elastic Kubernetes Service)

#### Development Environment
- **Instance Types**: `t3.medium`, `t3a.medium` (smallest viable)
- **Capacity Type**: 100% Spot instances (60-90% savings vs On-Demand)
- **Scaling**: Desired size = 0, Min = 0, Max = 3 (scale-to-zero capable)
- **Disk Size**: 30GB (reduced from 50GB)

#### Staging Environment
- **Instance Types**: `t3.medium`, `t3a.medium`, `t3.large`, `t3a.large`
- **Capacity Type**: 100% Spot instances
- **Scaling**: Desired size = 0, Min = 0, Max = 5 (scale-to-zero capable)
- **Disk Size**: 50GB

#### Production Environment
- **System Nodes**: `t3.large`, `t3a.large` On-Demand (for reliability)
- **Application Nodes**: `t3.xlarge`, `t3a.xlarge`, `m5.large` Spot (cost savings)
- **Spot Pool**: `m5.large`, `m5a.large`, `m6i.large`, `m6a.large`
- **Scaling**: Application nodes can scale to zero during off-peak
- **GPU Nodes**: Disabled by default (enable only when needed for ML)

**Cost Tip**: Consider purchasing Compute Savings Plans for predictable workloads (up to 72% savings).

### 2. RDS (Aurora PostgreSQL)

#### Development & Staging
- **Mode**: Aurora Serverless v2
- **Capacity**: 0.5 - 4 ACU (scales automatically)
- **Cost**: ~$87/month at minimum usage vs ~$400/month provisioned
- **Backup Retention**: 7 days

#### Production
- **Mode**: Aurora Serverless v2
- **Capacity**: 0.5 - 16 ACU (scales for production traffic)
- **Cost**: ~$87/month at minimum, scales as needed
- **Backup Retention**: 14 days (reduced from 35)
- **Performance Insights**: Enabled (7-day retention)

**Alternative**: If consistent high traffic, provisioned `db.r6g.large` x 2 may be more cost-effective.

### 3. ElastiCache (Redis)

#### Development
- **Node Type**: `cache.t3.micro` (~$12/month)
- **Clusters**: 1 (single node)
- **Failover**: Disabled
- **Multi-AZ**: Disabled

#### Staging
- **Node Type**: `cache.t3.small` (~$24/month)
- **Clusters**: 1 (single node)
- **Failover**: Disabled
- **Multi-AZ**: Disabled

#### Production
- **Node Type**: `cache.r6g.large` (~$200/month each)
- **Clusters**: 2 (primary + replica)
- **Failover**: Enabled
- **Multi-AZ**: Enabled
- **Snapshot Retention**: 3 days (reduced from 7)

### 4. CloudWatch Logs & Monitoring

| Environment | Log Retention | Container Insights | Dashboard | Alarms |
|-------------|---------------|-------------------|-----------|--------|
| Dev | 3 days | Disabled | No | No |
| Staging | 7 days | Disabled | No | No |
| Prod | 30 days | 14 days retention | Yes | Yes |

**X-Ray Sampling Rates**:
- Dev: 5% of requests
- Staging: 10% of requests
- Prod: 0.5% of requests, 100% of errors

### 5. NAT Gateway

| Environment | Configuration | Cost |
|-------------|---------------|------|
| Dev | Single NAT Gateway | ~$45/month |
| Staging | Single NAT Gateway | ~$45/month |
| Prod | Multi-AZ NAT Gateways | ~$135/month |

### 6. ECR (Container Registry)

| Environment | Tagged Images Kept | Untagged Expiry |
|-------------|-------------------|-----------------|
| Dev | 10 | 3 days |
| Staging | 20 | 7 days |
| Prod | 50 | 14 days |

## Operational Cost Savings

### Scale-to-Zero for Dev/Staging

When not in use, scale down resources:

```bash
# Scale EKS nodes to 0
aws eks update-nodegroup-config \
  --cluster-name flamoral-dev-eks \
  --nodegroup-name general \
  --scaling-config desiredSize=0,minSize=0,maxSize=3

# Stop Aurora cluster
aws rds stop-db-cluster --db-cluster-identifier flamoral-dev-aurora
```

**Note**: Aurora clusters auto-restart after 7 days. Set up automation to re-stop if needed.

### Scheduled Scaling

Consider implementing scheduled scaling for predictable patterns:

```yaml
# Example Kubernetes CronJob for scaling
apiVersion: batch/v1
kind: CronJob
metadata:
  name: scale-down-night
spec:
  schedule: "0 22 * * 1-5"  # 10 PM weekdays
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: kubectl
            image: bitnami/kubectl
            command:
            - /bin/sh
            - -c
            - kubectl scale deployment --all --replicas=1
```

## Monitoring Cost

Use AWS Cost Explorer and set up budgets:

```bash
# Create a budget alert
aws budgets create-budget \
  --account-id YOUR_ACCOUNT_ID \
  --budget file://budget.json \
  --notifications-with-subscribers file://notifications.json
```

## Recommendations for Further Savings

1. **Reserved Instances/Savings Plans**: For production workloads, consider:
   - EC2 Savings Plans (up to 72% savings)
   - RDS Reserved Instances (up to 69% savings)
   - ElastiCache Reserved Nodes (up to 55% savings)

2. **S3 Intelligent-Tiering**: Enable for media bucket to auto-tier objects.

3. **Graviton Instances**: Already using ARM-based instances where possible (r6g, t3a).

4. **Spot Interruption Handling**: Implement proper pod disruption budgets and graceful shutdown.

5. **Right-Sizing**: Regularly review CloudWatch metrics to identify over-provisioned resources.

## Monthly Cost Estimates

### Development (Minimal Usage)
| Service | Monthly Cost |
|---------|-------------|
| EKS Cluster | $73 |
| EKS Nodes (when scaled up) | ~$30-50 |
| Aurora Serverless (idle) | ~$15-30 |
| ElastiCache | ~$12 |
| NAT Gateway | ~$45 |
| S3 + ECR | ~$5-10 |
| **Total** | **~$150-200** |

### Staging (Light Usage)
| Service | Monthly Cost |
|---------|-------------|
| EKS Cluster | $73 |
| EKS Nodes (when scaled up) | ~$50-100 |
| Aurora Serverless | ~$50-100 |
| ElastiCache | ~$24 |
| NAT Gateway | ~$45 |
| S3 + ECR | ~$10-20 |
| **Total** | **~$250-350** |

### Production (Active Usage)
| Service | Monthly Cost |
|---------|-------------|
| EKS Cluster | $73 |
| EKS Nodes (System + App) | ~$200-400 |
| Aurora Serverless v2 | ~$150-400 |
| ElastiCache | ~$400 |
| NAT Gateways (3x) | ~$135 |
| CloudFront + WAF | ~$50-100 |
| Route53 | ~$5 |
| S3 + ECR | ~$30-50 |
| CloudWatch | ~$50-100 |
| **Total** | **~$1,000-1,600** |

## Quick Commands

### Stop All Dev Resources
```bash
# Stop Aurora
aws rds stop-db-cluster --db-cluster-identifier flamoral-dev-aurora

# Scale EKS to 0
aws eks update-nodegroup-config \
  --cluster-name flamoral-dev-eks \
  --nodegroup-name general \
  --scaling-config desiredSize=0,minSize=0,maxSize=3
```

### Start Dev Resources
```bash
# Start Aurora
aws rds start-db-cluster --db-cluster-identifier flamoral-dev-aurora

# Scale EKS up
aws eks update-nodegroup-config \
  --cluster-name flamoral-dev-eks \
  --nodegroup-name general \
  --scaling-config desiredSize=2,minSize=0,maxSize=3
```
