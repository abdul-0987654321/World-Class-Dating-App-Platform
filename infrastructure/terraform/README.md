# AWS Infrastructure - Terraform

## Overview

This directory contains **AWS-only** Terraform infrastructure for the Flamoral dating platform.

> **IMPORTANT**: Azure providers are **FORBIDDEN**. This infrastructure uses AWS exclusively.

## Directory Structure

```
aws/
├── environments/
│   ├── dev/           # Development environment
│   ├── staging/       # Staging environment
│   └── prod/          # Production environment
├── modules/
│   ├── networking/    # VPC, subnets, NAT, routing
│   ├── eks/           # Elastic Kubernetes Service
│   ├── rds/           # Aurora PostgreSQL
│   ├── elasticache/   # Redis cluster
│   ├── s3/            # S3 buckets
│   ├── cognito/       # User authentication
│   ├── ecr/           # Container registry
│   ├── secrets/       # Secrets Manager
│   ├── monitoring/    # CloudWatch, X-Ray
│   ├── cloudfront/    # CDN + WAF
│   ├── route53/       # DNS management
│   └── messaging/     # SQS/SNS
├── providers.tf       # Provider version constraints
└── README.md          # This file
```

## Prerequisites

1. **AWS CLI** configured with appropriate credentials
2. **Terraform** >= 1.6.0
3. **kubectl** for EKS access
4. **S3 bucket** for Terraform state (see Backend Setup)

## Backend Setup

Before running Terraform, create the state backend:

```bash
# Create S3 bucket for state
aws s3api create-bucket \
  --bucket flamoral-terraform-state \
  --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket flamoral-terraform-state \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket flamoral-terraform-state \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "aws:kms"
      }
    }]
  }'

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name terraform-state-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

## Usage

### Development Environment

```bash
cd environments/dev
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

### Staging Environment

```bash
cd environments/staging
terraform init
terraform plan -out=tfplan
# Requires approval for apply
```

### Production Environment

```bash
cd environments/prod
terraform init
terraform plan -out=tfplan
# APPLY IS DISABLED FOR PRODUCTION
# Changes must go through GitOps workflow
```

## Environment Differences

| Feature | Dev | Staging | Prod |
|---------|-----|---------|------|
| EKS Node Type | t3.large (SPOT) | t3.xlarge | m6i.xlarge |
| EKS Min Nodes | 1 | 2 | 3 |
| RDS | Serverless v2 | db.r6g.large | db.r6g.xlarge (3 nodes) |
| Redis | cache.t3.medium | cache.r6g.large | cache.r6g.xlarge (3 nodes) |
| Multi-AZ | No | Yes | Yes |
| Deletion Protection | No | Yes | Yes |
| MFA | Optional | Optional | Required |
| WAF Bot Control | No | No | Yes |
| Log Retention | 14 days | 30 days | 90 days |

## Module Documentation

### networking
Creates VPC with public/private subnets, NAT gateways, VPC endpoints.

### eks
Creates EKS cluster with managed node groups, OIDC provider, and add-ons.

### rds
Creates Aurora PostgreSQL cluster with automated backups and encryption.

### elasticache
Creates Redis replication group with encryption and automatic failover.

### s3
Creates S3 buckets for media, backups, and logs with lifecycle policies.

### cognito
Creates user pool for authentication with MFA and security features.

### ecr
Creates container repositories for all microservices.

### secrets
Creates Secrets Manager secrets with EKS IRSA integration.

### monitoring
Creates CloudWatch log groups, dashboards, alarms, and X-Ray configuration.

### cloudfront
Creates CloudFront distribution with WAF for CDN and DDoS protection.

### route53
Creates DNS zones and records with health checks and DNSSEC.

### messaging
Creates SQS queues and SNS topics for async communication.

## Security

- All resources are encrypted at rest and in transit
- VPC endpoints for AWS service access (no public internet)
- IAM roles follow least-privilege principle
- Secrets are stored in AWS Secrets Manager
- WAF protects against common web attacks
- DNSSEC enabled for DNS integrity

## Cost Optimization

- Dev uses SPOT instances
- Staging uses a mix of ON_DEMAND and SPOT
- S3 lifecycle policies move data to cheaper storage tiers
- RDS uses Aurora Serverless v2 in dev for cost efficiency

## Compliance

- All resources are tagged for cost allocation
- CloudTrail logging enabled
- VPC Flow Logs enabled
- Access logging on all storage
- Encryption keys managed by KMS

## Forbidden Providers

The following providers are **NOT ALLOWED** in this infrastructure:

- `azurerm` - Azure Resource Manager
- `azuread` - Azure Active Directory
- `azurestack` - Azure Stack
- Any other Azure-related providers

All Azure resources have been migrated to AWS equivalents.

## Support

For issues or questions, contact the platform team.
