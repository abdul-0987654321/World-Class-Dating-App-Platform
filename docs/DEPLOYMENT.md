# Flamoral Platform - Deployment Guide

**Version:** 1.0.0
**Last Updated:** 2026-01-10
**Infrastructure:** AWS ECS Fargate (Terraform-Managed)

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Infrastructure Setup](#infrastructure-setup)
3. [ECR Image Management](#ecr-image-management)
4. [ECS Service Deployment](#ecs-service-deployment)
5. [Environment Configuration](#environment-configuration)
6. [CI/CD Pipeline](#cicd-pipeline)
7. [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

### Required Tools

```bash
# AWS CLI v2
aws --version  # >= 2.0.0

# Terraform
terraform --version  # >= 1.6.0

# Docker
docker --version  # >= 24.0.0

# Node.js (for building services)
node --version  # >= 20.0.0
```

### AWS Configuration

```bash
# Configure AWS CLI with appropriate profile
aws configure --profile flamoral-prod

# Verify access
aws sts get-caller-identity --profile flamoral-prod
```

### Required IAM Permissions

The deployment user/role needs:
- `ecr:*` - Container registry access
- `ecs:*` - ECS cluster and service management
- `iam:PassRole` - Pass roles to ECS tasks
- `logs:*` - CloudWatch Logs access
- `secretsmanager:GetSecretValue` - Access to secrets

---

## Infrastructure Setup

### Terraform State Backend

State is stored in S3 with DynamoDB locking:

```bash
# Backend configuration (already provisioned)
# S3 Bucket: flamoral-terraform-state-992382449461
# DynamoDB Table: terraform-state-lock
```

### Initialize Terraform

```bash
cd infrastructure/terraform/environments/prod

# Initialize with backend
terraform init

# Verify workspace
terraform workspace show
```

### Plan Infrastructure Changes

```bash
# Generate execution plan
terraform plan -out=tfplan

# Review plan output carefully
# Check for any destructive changes (marked with -)
```

### Apply Infrastructure

```bash
# Apply the planned changes
terraform apply tfplan

# Or apply directly (prompts for confirmation)
terraform apply
```

### Key Terraform Outputs

After applying, these outputs are available:

```bash
# Get all outputs
terraform output

# Key outputs:
# - ecs_cluster_name: flamoral-prod-ecs
# - ecs_cluster_arn: arn:aws:ecs:us-east-1:...
# - alb_dns_name: flamoral-prod-alb-xxx.us-east-1.elb.amazonaws.com
# - ecr_repository_urls: Map of service -> ECR URL
# - target_group_arns: Map of service -> Target Group ARN
# - task_role_arns: Map of service -> Task Role ARN
```

---

## ECR Image Management

### ECR Repository Structure

Each of the 27 microservices has its own ECR repository:

| Service | Repository | Port |
|---------|------------|------|
| api-gateway | flamoral/api-gateway | 3000 |
| auth-service | flamoral/auth-service | 3001 |
| user-service | flamoral/user-service | 3002 |
| profile-service | flamoral/profile-service | 3003 |
| matching-service | flamoral/matching-service | 3004 |
| messaging-service | flamoral/messaging-service | 3005 |
| notification-service | flamoral/notification-service | 3006 |
| payment-service | flamoral/payment-service | 3007 |
| subscription-service | flamoral/subscription-service | 3008 |
| media-service | flamoral/media-service | 3009 |
| moderation-service | flamoral/moderation-service | 3010 |
| analytics-service | flamoral/analytics-service | 3011 |
| recommendation-service | flamoral/recommendation-service | 3012 |
| search-service | flamoral/search-service | 3013 |
| location-service | flamoral/location-service | 3014 |
| verification-service | flamoral/verification-service | 3015 |
| report-service | flamoral/report-service | 3016 |
| admin-service | flamoral/admin-service | 3017 |
| webhook-service | flamoral/webhook-service | 3018 |
| scheduler-service | flamoral/scheduler-service | 3019 |
| worker-service | flamoral/worker-service | 3020 |
| email-service | flamoral/email-service | 3021 |
| realtime-service | flamoral/realtime-service | 3022 |
| workflow-engine | flamoral/workflow-engine | 3023 |
| automation-service | flamoral/automation-service | 3024 |
| advertising-service | flamoral/advertising-service | 3025 |
| partnership-service | flamoral/partnership-service | 3026 |

### Authenticate to ECR

```bash
# Get ECR login token
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  992382449461.dkr.ecr.us-east-1.amazonaws.com
```

### Build and Push Images

```bash
# Build a single service
SERVICE_NAME="auth-service"
IMAGE_TAG=$(git rev-parse --short HEAD)
ECR_REPO="992382449461.dkr.ecr.us-east-1.amazonaws.com/flamoral/${SERVICE_NAME}"

# Build
docker build -t ${ECR_REPO}:${IMAGE_TAG} \
  -t ${ECR_REPO}:latest \
  ./backend/services/${SERVICE_NAME}

# Push
docker push ${ECR_REPO}:${IMAGE_TAG}
docker push ${ECR_REPO}:latest
```

### Build All Services Script

```bash
#!/bin/bash
# scripts/build-all-services.sh

set -e

AWS_ACCOUNT_ID="992382449461"
AWS_REGION="us-east-1"
ECR_BASE="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/flamoral"
IMAGE_TAG=$(git rev-parse --short HEAD)

SERVICES=(
  "api-gateway"
  "auth-service"
  "user-service"
  "profile-service"
  "matching-service"
  "messaging-service"
  "notification-service"
  "payment-service"
  "subscription-service"
  "media-service"
  "moderation-service"
  "analytics-service"
  "recommendation-service"
  "search-service"
  "location-service"
  "verification-service"
  "report-service"
  "admin-service"
  "webhook-service"
  "scheduler-service"
  "worker-service"
  "email-service"
  "realtime-service"
  "workflow-engine"
  "automation-service"
  "advertising-service"
  "partnership-service"
)

# Login to ECR
aws ecr get-login-password --region ${AWS_REGION} | \
  docker login --username AWS --password-stdin ${ECR_BASE}

for service in "${SERVICES[@]}"; do
  echo "Building ${service}..."
  docker build -t ${ECR_BASE}/${service}:${IMAGE_TAG} \
    -t ${ECR_BASE}/${service}:latest \
    ./backend/services/${service}

  echo "Pushing ${service}..."
  docker push ${ECR_BASE}/${service}:${IMAGE_TAG}
  docker push ${ECR_BASE}/${service}:latest
done

echo "All services built and pushed with tag: ${IMAGE_TAG}"
```

### Image Lifecycle Policy

ECR repositories are configured with lifecycle policies:

- **Tagged images:** Keep last 50 images
- **Untagged images:** Delete after 14 days
- **Image scanning:** Enabled on push (immutable tags)

---

## ECS Service Deployment

### Update a Single Service

```bash
# Update service to use new image
SERVICE_NAME="auth-service"
CLUSTER_NAME="flamoral-prod-ecs"
IMAGE_TAG=$(git rev-parse --short HEAD)

# Force new deployment with latest image
aws ecs update-service \
  --cluster ${CLUSTER_NAME} \
  --service ${SERVICE_NAME} \
  --force-new-deployment

# Monitor deployment
aws ecs wait services-stable \
  --cluster ${CLUSTER_NAME} \
  --services ${SERVICE_NAME}
```

### Update Task Definition

```bash
# Get current task definition
aws ecs describe-task-definition \
  --task-definition flamoral-prod-auth-service \
  --query 'taskDefinition' > task-def.json

# Modify the image tag in task-def.json
# Then register new task definition
aws ecs register-task-definition --cli-input-json file://task-def.json

# Update service to use new task definition
aws ecs update-service \
  --cluster ${CLUSTER_NAME} \
  --service auth-service \
  --task-definition flamoral-prod-auth-service:NEW_REVISION
```

### Deploy All Services

```bash
#!/bin/bash
# scripts/deploy-all-services.sh

CLUSTER_NAME="flamoral-prod-ecs"
SERVICES=$(aws ecs list-services --cluster ${CLUSTER_NAME} --query 'serviceArns[]' --output text)

for service_arn in ${SERVICES}; do
  service_name=$(echo ${service_arn} | awk -F'/' '{print $NF}')
  echo "Deploying ${service_name}..."

  aws ecs update-service \
    --cluster ${CLUSTER_NAME} \
    --service ${service_name} \
    --force-new-deployment
done

# Wait for all deployments
aws ecs wait services-stable \
  --cluster ${CLUSTER_NAME} \
  --services ${SERVICES}

echo "All services deployed successfully"
```

### Check Deployment Status

```bash
# List all services and their status
aws ecs list-services --cluster flamoral-prod-ecs

# Describe specific service
aws ecs describe-services \
  --cluster flamoral-prod-ecs \
  --services auth-service \
  --query 'services[0].{
    status: status,
    runningCount: runningCount,
    desiredCount: desiredCount,
    deployments: deployments[*].{status: status, runningCount: runningCount}
  }'

# View running tasks
aws ecs list-tasks \
  --cluster flamoral-prod-ecs \
  --service-name auth-service

# Get task details
aws ecs describe-tasks \
  --cluster flamoral-prod-ecs \
  --tasks TASK_ARN
```

---

## Environment Configuration

### Secrets Manager

Secrets are stored in AWS Secrets Manager:

| Secret | Path | Services |
|--------|------|----------|
| Database | flamoral/prod/database | All services |
| Redis | flamoral/prod/redis | Matching, Messaging, etc. |
| JWT | flamoral/prod/jwt | API Gateway, Auth, Admin |
| Stripe | flamoral/prod/stripe | Payment, Subscription |
| Firebase | flamoral/prod/firebase | Notification |

### SSM Parameter Store

Configuration parameters are stored in SSM:

```bash
# List all parameters
aws ssm get-parameters-by-path \
  --path "/flamoral/prod" \
  --recursive

# Get specific parameter
aws ssm get-parameter \
  --name "/flamoral/prod/api-gateway/rate-limit" \
  --with-decryption
```

### AI Kill Switch Parameters

AI services can be disabled via SSM:

```bash
# Disable AI for a specific service
aws ssm put-parameter \
  --name "/flamoral/prod/ai-kill-switch/matching-service" \
  --value "false" \
  --type "String" \
  --overwrite

# Check current status
aws ssm get-parameter \
  --name "/flamoral/prod/ai-kill-switch/matching-service"
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

The CI/CD pipeline is defined in `.github/workflows/flamoral-unified-pipeline.yml`:

1. **Build Stage:** Build Docker images for all services
2. **Test Stage:** Run unit and integration tests
3. **Security Scan:** Trivy vulnerability scanning
4. **Push Stage:** Push images to ECR
5. **Deploy Staging:** Deploy to staging environment
6. **Deploy Production:** Deploy to production (manual approval)

### Triggering Deployments

```bash
# Via GitHub Actions (preferred)
# Push to main branch triggers staging deployment
git push origin main

# Manual production deployment
# Approve the deployment in GitHub Actions UI
```

### Nightly Builds

Automated nightly builds run at 9 PM UTC via EventBridge:

```bash
# Check nightly build status
aws events describe-rule --name flamoral-nightly-deployment

# Disable for maintenance
aws events disable-rule --name flamoral-nightly-deployment

# Re-enable
aws events enable-rule --name flamoral-nightly-deployment
```

---

## Rollback Procedures

### Quick Rollback (ECS)

```bash
# Rollback to previous task definition
SERVICE_NAME="auth-service"
CLUSTER_NAME="flamoral-prod-ecs"

# Get previous task definition revision
PREVIOUS_REVISION=$(aws ecs describe-services \
  --cluster ${CLUSTER_NAME} \
  --services ${SERVICE_NAME} \
  --query 'services[0].deployments[1].taskDefinition' \
  --output text)

# Update service to previous version
aws ecs update-service \
  --cluster ${CLUSTER_NAME} \
  --service ${SERVICE_NAME} \
  --task-definition ${PREVIOUS_REVISION}

# Wait for rollback to complete
aws ecs wait services-stable \
  --cluster ${CLUSTER_NAME} \
  --services ${SERVICE_NAME}
```

### Rollback to Specific Image Tag

```bash
# 1. Find the image tag to rollback to
aws ecr describe-images \
  --repository-name flamoral/auth-service \
  --query 'imageDetails | sort_by(@, &imagePushedAt) | [-10:].[imageTags[0], imagePushedAt]' \
  --output table

# 2. Update task definition with old image tag
# 3. Deploy the updated task definition
```

### Full Environment Rollback

```bash
# Rollback all services to a known good state
./scripts/rollback-all-services.sh --tag v1.2.3

# Or rollback infrastructure via Terraform
cd infrastructure/terraform/environments/prod
terraform apply -target=module.ecs_cluster
```

---

## Health Checks

### Verify Deployment Health

```bash
# Check ALB target group health
aws elbv2 describe-target-health \
  --target-group-arn TARGET_GROUP_ARN

# Check API health endpoint
curl -s https://api.flamoral.com/health | jq .

# Check individual service health
curl -s https://api.flamoral.com/api/auth/health | jq .
```

### CloudWatch Metrics

Key metrics to monitor after deployment:

- `ECS/CPUUtilization` - Task CPU usage
- `ECS/MemoryUtilization` - Task memory usage
- `ApplicationELB/TargetResponseTime` - Response latency
- `ApplicationELB/HTTPCode_Target_5XX_Count` - Error rate

---

*Document Version: 1.0.0 | Last Updated: 2026-01-10*
*Infrastructure: AWS ECS Fargate*
*For questions, contact: platform@flamoral.com*
