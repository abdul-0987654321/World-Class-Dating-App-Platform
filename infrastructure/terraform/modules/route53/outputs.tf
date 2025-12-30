################################################################################
# Route53 Outputs
################################################################################

output "public_zone_id" {
  description = "Public hosted zone ID"
  value       = var.create_public_zone ? aws_route53_zone.public[0].zone_id : null
}

output "public_zone_arn" {
  description = "Public hosted zone ARN"
  value       = var.create_public_zone ? aws_route53_zone.public[0].arn : null
}

output "public_zone_name_servers" {
  description = "Public hosted zone name servers"
  value       = var.create_public_zone ? aws_route53_zone.public[0].name_servers : null
}

output "private_zone_id" {
  description = "Private hosted zone ID"
  value       = var.create_private_zone ? aws_route53_zone.private[0].zone_id : null
}

output "private_zone_arn" {
  description = "Private hosted zone ARN"
  value       = var.create_private_zone ? aws_route53_zone.private[0].arn : null
}

output "domain_name" {
  description = "Primary domain name"
  value       = var.domain_name
}

output "health_check_ids" {
  description = "Map of health check IDs"
  value       = { for k, v in aws_route53_health_check.main : k => v.id }
}

output "dnssec_key_signing_key_id" {
  description = "DNSSEC key signing key ID"
  value       = var.enable_dnssec && var.create_public_zone ? aws_route53_key_signing_key.main[0].id : null
}
