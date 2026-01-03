/**
 * AWS SES Module Outputs
 */

output "domain_identity_arn" {
  description = "ARN of the SES domain identity"
  value       = aws_ses_domain_identity.main.arn
}

output "domain_identity_verification_token" {
  description = "Verification token for SES domain"
  value       = aws_ses_domain_identity.main.verification_token
}

output "dkim_tokens" {
  description = "DKIM tokens for DNS configuration"
  value       = aws_ses_domain_dkim.main.dkim_tokens
}

output "configuration_set_name" {
  description = "Name of the SES configuration set"
  value       = aws_ses_configuration_set.main.name
}

output "configuration_set_arn" {
  description = "ARN of the SES configuration set"
  value       = aws_ses_configuration_set.main.arn
}

output "ses_send_policy_arn" {
  description = "ARN of the IAM policy for sending emails"
  value       = aws_iam_policy.ses_send.arn
}

output "mail_from_domain" {
  description = "Mail from domain (if configured)"
  value       = var.mail_from_subdomain != "" ? "${var.mail_from_subdomain}.${var.domain}" : null
}

output "template_names" {
  description = "Map of created email template names"
  value       = { for k, v in aws_ses_template.templates : k => v.name }
}

output "domain" {
  description = "The verified SES domain"
  value       = var.domain
}

output "receipt_rule_set_name" {
  description = "Name of the receipt rule set (if email receiving is enabled)"
  value       = var.enable_email_receiving ? aws_ses_receipt_rule_set.main[0].rule_set_name : null
}
