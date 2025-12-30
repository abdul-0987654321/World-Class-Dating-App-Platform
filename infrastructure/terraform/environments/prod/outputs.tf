################################################################################
# Production Environment Outputs
################################################################################

# Networking
output "vpc_id" {
  description = "VPC ID"
  value       = module.networking.vpc_id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = module.networking.private_subnet_ids
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = module.networking.public_subnet_ids
}

# EKS
output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
  sensitive   = true
}

output "eks_cluster_certificate_authority" {
  description = "EKS cluster CA certificate"
  value       = module.eks.cluster_certificate_authority_data
  sensitive   = true
}

output "eks_oidc_provider_arn" {
  description = "EKS OIDC provider ARN"
  value       = module.eks.oidc_provider_arn
}

# RDS
output "rds_cluster_endpoint" {
  description = "RDS cluster endpoint"
  value       = module.rds.endpoint
  sensitive   = true
}

output "rds_reader_endpoint" {
  description = "RDS reader endpoint"
  value       = module.rds.reader_endpoint
  sensitive   = true
}

# ElastiCache
output "elasticache_primary_endpoint" {
  description = "ElastiCache primary endpoint"
  value       = module.elasticache.primary_endpoint_address
  sensitive   = true
}

# S3
output "media_bucket_name" {
  description = "Media S3 bucket name"
  value       = module.s3.bucket_names["media"]
}

output "media_bucket_arn" {
  description = "Media S3 bucket ARN"
  value       = module.s3.bucket_arns["media"]
}

# Cognito
output "cognito_user_pool_id" {
  description = "Cognito user pool ID"
  value       = module.cognito.user_pool_id
}

output "cognito_user_pool_client_ids" {
  description = "Cognito user pool client IDs"
  value       = module.cognito.user_pool_client_ids
  sensitive   = true
}

# ECR
output "ecr_repository_urls" {
  description = "ECR repository URLs"
  value       = module.ecr.repository_urls
}

# Secrets
output "secrets_arns" {
  description = "Secrets Manager ARNs"
  value       = module.secrets.secret_arns
  sensitive   = true
}

# Messaging
output "queue_urls" {
  description = "SQS queue URLs"
  value       = module.messaging.all_queue_urls
}

output "topic_arns" {
  description = "SNS topic ARNs"
  value       = module.messaging.topic_arns
}

# Route53
output "route53_zone_id" {
  description = "Route53 public zone ID"
  value       = module.route53.public_zone_id
}

output "route53_name_servers" {
  description = "Route53 name servers (delegate your domain to these)"
  value       = module.route53.public_zone_name_servers
}

output "route53_private_zone_id" {
  description = "Route53 private zone ID"
  value       = module.route53.private_zone_id
}

# ACM
output "acm_certificate_arn" {
  description = "ACM certificate ARN"
  value       = module.acm.certificate_arn
}

output "acm_certificate_status" {
  description = "ACM certificate validation status"
  value       = module.acm.certificate_status
}

# CloudFront
output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = module.cloudfront.distribution_id
}

output "cloudfront_distribution_domain" {
  description = "CloudFront distribution domain name"
  value       = module.cloudfront.distribution_domain_name
}

output "cloudfront_distribution_arn" {
  description = "CloudFront distribution ARN"
  value       = module.cloudfront.distribution_arn
}

output "waf_web_acl_arn" {
  description = "WAF Web ACL ARN"
  value       = module.cloudfront.waf_web_acl_arn
}

# Monitoring
output "monitoring_sns_topic_arn" {
  description = "Monitoring SNS topic ARN"
  value       = module.monitoring.sns_topic_arn
}
