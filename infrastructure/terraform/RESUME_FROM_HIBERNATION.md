# Resume Flamoral from Hibernation

## Prerequisites
- AWS CLI configured
- Terraform installed
- Access to AWS account 992382449461

## Step 1: Start RDS Aurora Clusters
```bash
aws rds start-db-cluster --db-cluster-identifier flamoral-prod-aurora
# Wait for cluster to be available (5-10 minutes)
aws rds wait db-cluster-available --db-cluster-identifier flamoral-prod-aurora
```

## Step 2: Apply Terraform with Resume Config
```bash
cd infrastructure/terraform/environments/prod
terraform init
terraform apply -var-file=resume.tfvars
```

## Step 3: Enable CloudFront
CloudFront should be enabled by Terraform, but verify:
```bash
aws cloudfront get-distribution --id ERHOTC1HYWUD9 --query "Distribution.DistributionConfig.Enabled"
```

## Step 4: Verify Services
```bash
aws ecs describe-services --cluster flamoral-prod-cluster --services flamoral-prod-web-app flamoral-prod-api-gateway flamoral-prod-auth-service --query "services[*].{name:serviceName,running:runningCount}"
```

## Step 5: Invalidate CloudFront Cache
```bash
aws cloudfront create-invalidation --distribution-id ERHOTC1HYWUD9 --paths "/*"
```

## Step 6: Test
- https://www.flamoral.com
- https://api.flamoral.com/health
