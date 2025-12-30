################################################################################
# ACM Module Outputs
################################################################################

output "certificate_arn" {
  description = "ARN of the primary certificate (for CloudFront)"
  value       = aws_acm_certificate.main.arn
}

output "certificate_domain_name" {
  description = "Domain name of the primary certificate"
  value       = aws_acm_certificate.main.domain_name
}

output "certificate_status" {
  description = "Status of the primary certificate"
  value       = aws_acm_certificate.main.status
}

output "validated_certificate_arn" {
  description = "ARN of the validated primary certificate"
  value       = var.wait_for_validation ? aws_acm_certificate_validation.main[0].certificate_arn : aws_acm_certificate.main.arn
}

output "domain_validation_options" {
  description = "Domain validation options for the primary certificate"
  value       = aws_acm_certificate.main.domain_validation_options
}

output "validation_record_fqdns" {
  description = "FQDNs of the validation records created"
  value       = var.create_route53_records ? [for record in aws_route53_record.validation : record.fqdn] : []
}

output "regional_certificate_arn" {
  description = "ARN of the regional certificate (for ALB)"
  value       = var.create_regional_certificate ? aws_acm_certificate.regional[0].arn : null
}

output "validated_regional_certificate_arn" {
  description = "ARN of the validated regional certificate"
  value       = var.create_regional_certificate && var.wait_for_validation ? aws_acm_certificate_validation.regional[0].certificate_arn : (var.create_regional_certificate ? aws_acm_certificate.regional[0].arn : null)
}
