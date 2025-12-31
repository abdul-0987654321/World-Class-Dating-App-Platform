# Flamoral Dating Platform - AWS Infrastructure

Production-ready AWS infrastructure for the Flamoral Dating Platform, built with Terraform.

## Quick Start

```bash
# Prerequisites
terraform >= 1.6.0
aws-cli >= 2.15.0
kubectl >= 1.29.0
helm >= 3.14.0

# Configure AWS credentials
aws configure

# Deploy production environment
cd infrastructure/terraform/environments/prod
terraform init
terraform plan
terraform apply

# Get EKS credentials
aws eks update-kubeconfig --name dating-prod-eks --region us-east-1

# Deploy application
kubectl apply -f ../../../kubernetes/
```

## Repository Structure

```
infrastructure/
├── terraform/
│   ├── providers.tf              # AWS provider configuration
│   ├── README.md                 # Terraform documentation
│   ├── MIGRATION_REPORT.md       # Azure to AWS migration log
│   ├── environments/
│   │   ├── dev/                  # Development environment
│   │   ├── staging/              # Staging environment
│   │   └── prod/                 # Production environment
│   └── modules/
│       ├── networking/           # VPC, subnets, NAT gateways
│       ├── eks/                  # Elastic Kubernetes Service
│       ├── rds/                  # Aurora PostgreSQL
│       ├── elasticache/          # Redis cluster
│       ├── s3/                   # Object storage
│       ├── cognito/              # User authentication
│       ├── ecr/                  # Container registry
│       ├── secrets/              # Secrets Manager
│       ├── monitoring/           # CloudWatch + X-Ray
│       ├── cloudfront/           # CDN + WAF
│       ├── route53/              # DNS management
│       ├── messaging/            # SQS/SNS
│       └── acm/                  # SSL/TLS certificates
├── kubernetes/
│   ├── README.md                 # K8s deployment docs
│   └── *.yaml                    # Kubernetes manifests
├── docker/
│   ├── README.md                 # Docker documentation
│   └── BASE_IMAGES.md            # Pinned base images
├── scripts/
│   └── deployment/               # Deployment scripts
├── monitoring/
│   └── README.md                 # Monitoring setup
├── security/
│   └── README.md                 # Security configuration
├── disaster-recovery/
│   ├── DISASTER_RECOVERY_PLAN.md
│   └── DR_RUNBOOK.md
└── runbooks/
    ├── environment-promotion.md
    ├── rollback-procedure.md
    ├── security-incident-response.md
    └── health-monitoring.md
```

## AWS Infrastructure Components

### Networking
- **VPC**: Multi-AZ with public, private, and database subnets
- **NAT Gateways**: High availability across AZs
- **VPC Endpoints**: Private access to AWS services
- **Security Groups**: Least-privilege network access

### Compute
- **EKS Cluster**: Kubernetes 1.29 with managed node groups
- **Node Groups**: Auto-scaling (3-20 nodes)
- **Instance Types**:
  - Dev: t3.large (SPOT)
  - Staging: t3.xlarge (ON_DEMAND)
  - Prod: m6i.xlarge (ON_DEMAND)

### Data Services
- **Aurora PostgreSQL**: Serverless v2 with auto-scaling
- **ElastiCache Redis**: Cluster mode with replication
- **S3**: Media storage with versioning and lifecycle policies

### Application Services
- **Cognito**: User pools with MFA
- **ECR**: 22 microservice repositories
- **Secrets Manager**: Automatic rotation with IRSA
- **SQS/SNS**: Async messaging with DLQ

### CDN & Security
- **CloudFront**: Global edge distribution
- **WAF**: OWASP rule sets + bot control
- **ACM**: SSL/TLS with auto-renewal
- **Route53**: DNS with health checks

### Monitoring
- **CloudWatch**: Logs, metrics, alarms
- **X-Ray**: Distributed tracing
- **SNS**: Alert notifications

## Environments

| Environment | Purpose | Instance Type | Cost/month | URL |
|------------|---------|---------------|------------|-----|
| **Dev** | Development | t3.large SPOT | ~$200 | dev.flamoral.com |
| **Staging** | Pre-production | t3.xlarge | ~$500 | staging.flamoral.com |
| **Production** | Live traffic | m6i.xlarge | ~$2,500 | flamoral.com |

## Deployment

### Via Terraform
```bash
cd infrastructure/terraform/environments/prod
terraform init
terraform plan
terraform apply
```

### Via GitHub Actions (Recommended)
```bash
# Trigger deployment workflow
git push origin main
# Pipeline: aws-unified-pipeline.yml
```

### Build and Push Docker Images
```bash
./scripts/build-and-push-ecr.sh
```

## Monitoring & Alerting

### Key Metrics
- Request Rate (req/sec)
- Error Rate (target: <1%)
- Response Time (P50, P95, P99)
- Resource Utilization (CPU, memory)

### Alerts Configured
- High CPU (>85%) - Critical
- High Memory (>85%) - Critical
- High Error Rate (>5%) - Critical
- Slow Response Time (>2000ms) - Warning

### Dashboards
- CloudWatch: Application performance
- X-Ray: Request tracing
- EKS Console: Cluster health

## Security

### Identity & Access
- IAM roles with least privilege
- OIDC federation for EKS pods (IRSA)
- No static credentials

### Network Security
- WAF with managed rule sets
- TLS 1.3 everywhere
- Private subnets for services
- VPC endpoints for AWS services

### Data Security
- Encryption at rest (KMS)
- Encryption in transit (TLS)
- Secrets rotation enabled
- S3 bucket policies (no public access)

### Compliance
- CloudTrail audit logging
- VPC Flow Logs
- Config rules for drift detection

## Microservices (22 Total)

| Service | Port | Description |
|---------|------|-------------|
| api-gateway | 4000 | API routing and rate limiting |
| auth-service | 3001 | Authentication and JWT |
| user-service | 3002 | User profiles and preferences |
| matching-service | 3003 | Match algorithm |
| messaging-service | 3004 | Real-time chat |
| media-service | 3006 | Photo/video processing |
| payment-service | 3007 | Stripe integration |
| notification-service | 3008 | Push/email/SMS |
| moderation-service | 3009 | Content moderation |
| analytics-service | 3010 | Metrics and tracking |
| admin-service | 3012 | Admin dashboard |
| automation-service | 3013 | Workflow automation |
| realtime-service | 8080 | WebSocket server |

## Documentation

- **[Terraform README](./terraform/README.md)**: Infrastructure details
- **[Kubernetes README](./kubernetes/README.md)**: K8s deployment
- **[Disaster Recovery](./disaster-recovery/DISASTER_RECOVERY_PLAN.md)**: DR procedures
- **[Runbooks](./runbooks/)**: Operational procedures

## Support

- **Email**: ops-team@flamoral.com
- **On-call**: PagerDuty configured
- **Slack**: #flamoral-ops
