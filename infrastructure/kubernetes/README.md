# Kubernetes Configuration (AWS EKS)

This directory contains Kubernetes manifests for deploying the Flamoral dating platform on AWS EKS.

## Directory Structure

```
kubernetes/
├── base/                    # Base deployment configurations
│   └── deployment.yaml      # Core API deployment, service, ingress
├── configmaps/              # Environment configuration
│   └── production-configmap.yaml
├── secrets/                 # Secret management
│   └── external-secrets-config.yaml  # AWS Secrets Manager integration
├── production/              # Production-specific overlays
├── staging/                 # Staging-specific overlays
└── dev/                     # Development-specific overlays
```

## AWS Services Used

| Kubernetes Resource | AWS Service |
|---------------------|-------------|
| Database | Aurora PostgreSQL |
| Cache | ElastiCache Redis |
| Object Storage | S3 |
| Secrets | AWS Secrets Manager |
| Container Registry | ECR |
| Ingress | ALB (via AWS Load Balancer Controller) |
| DNS | Route53 |
| CDN | CloudFront |
| Authentication | Cognito |
| Message Queues | SQS |
| Notifications | SNS |

## Prerequisites

1. **EKS Cluster**: Deployed via Terraform in `../terraform/`
2. **AWS Load Balancer Controller**: For ALB ingress
3. **External Secrets Operator**: For AWS Secrets Manager integration
4. **IAM Roles for Service Accounts (IRSA)**: Configured for workload identity

## Deployment

### Deploy to Production

```bash
# Set environment variables
export AWS_ACCOUNT_ID=xxxxxxxxxxxx
export ECR_REGISTRY=${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com
export IMAGE_TAG=latest
export ACM_CERTIFICATE_ARN=arn:aws:acm:us-east-1:${AWS_ACCOUNT_ID}:certificate/xxxxx

# Apply configurations
kubectl apply -f configmaps/production-configmap.yaml
kubectl apply -f secrets/external-secrets-config.yaml
envsubst < base/deployment.yaml | kubectl apply -f -
```

### Deploy to Staging

```bash
kubectl apply -k staging/
```

### Deploy to Development

```bash
kubectl apply -k dev/
```

## External Secrets

Secrets are managed through AWS Secrets Manager and synced using External Secrets Operator:

- `flamoral/prod/database` - Database credentials
- `flamoral/prod/redis` - Redis auth token
- `flamoral/prod/jwt` - JWT signing secrets
- `flamoral/prod/stripe` - Stripe API keys
- `flamoral/prod/cognito` - Cognito client credentials

## Security

- All pods run as non-root users
- Read-only root filesystem enabled
- Pod security contexts enforced
- Network policies restrict traffic
- Secrets never stored in manifests (use External Secrets)

## Monitoring

Metrics and logs are sent to:
- **CloudWatch**: Application logs and metrics
- **X-Ray**: Distributed tracing
- **CloudWatch Container Insights**: EKS monitoring
