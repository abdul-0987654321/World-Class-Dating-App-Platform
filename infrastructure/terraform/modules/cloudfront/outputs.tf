################################################################################
# CloudFront + WAF Outputs
################################################################################

output "distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.main.id
}

output "distribution_arn" {
  description = "CloudFront distribution ARN"
  value       = aws_cloudfront_distribution.main.arn
}

output "distribution_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "distribution_hosted_zone_id" {
  description = "CloudFront distribution hosted zone ID (for Route53 alias)"
  value       = aws_cloudfront_distribution.main.hosted_zone_id
}

output "oac_id" {
  description = "Origin Access Control ID for S3"
  value       = aws_cloudfront_origin_access_control.s3.id
}

output "waf_web_acl_arn" {
  description = "WAF Web ACL ARN"
  value       = var.enable_waf ? aws_wafv2_web_acl.main[0].arn : null
}

output "waf_web_acl_id" {
  description = "WAF Web ACL ID"
  value       = var.enable_waf ? aws_wafv2_web_acl.main[0].id : null
}

output "api_cache_policy_id" {
  description = "API cache policy ID"
  value       = var.api_cache_policy_id != null ? var.api_cache_policy_id : (length(aws_cloudfront_cache_policy.api) > 0 ? aws_cloudfront_cache_policy.api[0].id : null)
}

output "media_cache_policy_id" {
  description = "Media cache policy ID"
  value       = var.media_cache_policy_id != null ? var.media_cache_policy_id : (length(aws_cloudfront_cache_policy.media) > 0 ? aws_cloudfront_cache_policy.media[0].id : null)
}
