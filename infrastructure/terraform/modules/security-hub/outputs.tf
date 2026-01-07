################################################################################
# Security Hub Module Outputs
################################################################################

output "security_hub_arn" {
  description = "The ARN of the Security Hub"
  value       = var.enable_security_hub ? aws_securityhub_account.main[0].arn : null
}

output "security_hub_id" {
  description = "The ID of the Security Hub account"
  value       = var.enable_security_hub ? aws_securityhub_account.main[0].id : null
}

output "enabled_standards" {
  description = "List of enabled security standards ARNs"
  value = compact([
    var.enable_cis_standard ? try(aws_securityhub_standards_subscription.cis_benchmark[0].standards_arn, null) : null,
    var.enable_pci_dss_standard ? try(aws_securityhub_standards_subscription.pci_dss[0].standards_arn, null) : null,
    var.enable_nist_standard ? try(aws_securityhub_standards_subscription.nist[0].standards_arn, null) : null,
    var.enable_aws_foundational_standard ? try(aws_securityhub_standards_subscription.aws_foundational[0].standards_arn, null) : null,
  ])
}

output "enabled_standards_count" {
  description = "Number of enabled security standards"
  value = sum([
    var.enable_cis_standard ? 1 : 0,
    var.enable_pci_dss_standard ? 1 : 0,
    var.enable_nist_standard ? 1 : 0,
    var.enable_aws_foundational_standard ? 1 : 0,
  ])
}

output "insights_arns" {
  description = "Map of custom insight ARNs"
  value       = { for k, v in aws_securityhub_insight.main : k => v.arn }
}

output "automation_rules" {
  description = "Map of automation rule ARNs"
  value       = { for k, v in aws_securityhub_automation_rule.main : k => v.arn }
}

output "finding_aggregator_arn" {
  description = "ARN of the finding aggregator (if enabled)"
  value       = var.enable_finding_aggregator ? try(aws_securityhub_finding_aggregator.main[0].arn, null) : null
}

output "cis_standard_arn" {
  description = "ARN of the CIS standard subscription"
  value       = var.enable_cis_standard ? try(aws_securityhub_standards_subscription.cis_benchmark[0].standards_arn, null) : null
}

output "pci_dss_standard_arn" {
  description = "ARN of the PCI DSS standard subscription"
  value       = var.enable_pci_dss_standard ? try(aws_securityhub_standards_subscription.pci_dss[0].standards_arn, null) : null
}

output "nist_standard_arn" {
  description = "ARN of the NIST standard subscription"
  value       = var.enable_nist_standard ? try(aws_securityhub_standards_subscription.nist[0].standards_arn, null) : null
}

output "aws_foundational_standard_arn" {
  description = "ARN of the AWS Foundational Security Best Practices standard subscription"
  value       = var.enable_aws_foundational_standard ? try(aws_securityhub_standards_subscription.aws_foundational[0].standards_arn, null) : null
}

output "auto_enable_controls" {
  description = "Whether auto-enable controls is enabled"
  value       = var.auto_enable_controls
}

output "control_finding_generator" {
  description = "The control finding generator setting"
  value       = var.control_finding_generator
}
