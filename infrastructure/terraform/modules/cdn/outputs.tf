################################################################################
# CDN Module Outputs
################################################################################

output "distribution_id" {
  description = "CloudFront distribution ID"
  value       = module.cloudfront.distribution_id
}

output "cloudfront_domain" {
  description = "CloudFront distribution domain name"
  value       = module.cloudfront.distribution_domain_name
}

output "distribution_arn" {
  description = "CloudFront distribution ARN"
  value       = module.cloudfront.distribution_arn
}

output "hosted_zone_id" {
  description = "CloudFront hosted zone ID for Route53"
  value       = module.cloudfront.distribution_hosted_zone_id
}

output "waf_web_acl_arn" {
  description = "WAF Web ACL ARN"
  value       = module.cloudfront.waf_web_acl_arn
}
