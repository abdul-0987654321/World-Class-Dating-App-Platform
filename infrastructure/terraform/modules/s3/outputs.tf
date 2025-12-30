################################################################################
# S3 Module Outputs
################################################################################

output "buckets" {
  description = "Map of bucket names to bucket attributes"
  value = {
    for k, v in aws_s3_bucket.main : k => {
      id                          = v.id
      arn                         = v.arn
      bucket                      = v.bucket
      bucket_domain_name          = v.bucket_domain_name
      bucket_regional_domain_name = v.bucket_regional_domain_name
      hosted_zone_id              = v.hosted_zone_id
      region                      = v.region
    }
  }
}

output "bucket_ids" {
  description = "Map of bucket names to bucket IDs"
  value       = { for k, v in aws_s3_bucket.main : k => v.id }
}

output "bucket_arns" {
  description = "Map of bucket names to bucket ARNs"
  value       = { for k, v in aws_s3_bucket.main : k => v.arn }
}

output "bucket_names" {
  description = "Map of bucket names to actual bucket names"
  value       = { for k, v in aws_s3_bucket.main : k => v.bucket }
}

output "bucket_domain_names" {
  description = "Map of bucket names to bucket domain names"
  value       = { for k, v in aws_s3_bucket.main : k => v.bucket_domain_name }
}

output "bucket_regional_domain_names" {
  description = "Map of bucket names to bucket regional domain names"
  value       = { for k, v in aws_s3_bucket.main : k => v.bucket_regional_domain_name }
}

output "bucket_hosted_zone_ids" {
  description = "Map of bucket names to Route53 hosted zone IDs"
  value       = { for k, v in aws_s3_bucket.main : k => v.hosted_zone_id }
}

output "bucket_urls" {
  description = "Map of bucket names to S3 URLs"
  value       = { for k, v in aws_s3_bucket.main : k => "s3://${v.bucket}" }
}

output "bucket_https_urls" {
  description = "Map of bucket names to HTTPS URLs"
  value       = { for k, v in aws_s3_bucket.main : k => "https://${v.bucket_regional_domain_name}" }
}

output "access_policy_arns" {
  description = "Map of bucket names to access policy ARNs"
  value       = { for k, v in aws_iam_policy.bucket_access : k => v.arn }
}

output "eks_access_policy_arns" {
  description = "Map of bucket names to EKS IRSA policy ARNs"
  value       = { for k, v in aws_iam_policy.eks_bucket_access : k => v.arn }
}

output "replication_role_arns" {
  description = "Map of bucket names to replication role ARNs"
  value       = { for k, v in aws_iam_role.replication : k => v.arn }
}
