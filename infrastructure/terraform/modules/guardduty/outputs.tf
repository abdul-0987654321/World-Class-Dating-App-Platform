################################################################################
# GuardDuty Module Outputs
################################################################################

output "detector_id" {
  description = "The ID of the GuardDuty detector"
  value       = aws_guardduty_detector.main.id
}

output "detector_arn" {
  description = "The ARN of the GuardDuty detector"
  value       = aws_guardduty_detector.main.arn
}

output "detector_status" {
  description = "Status of the GuardDuty detector"
  value       = aws_guardduty_detector.main.enable ? "ENABLED" : "DISABLED"
}

output "account_id" {
  description = "The AWS account ID of the GuardDuty detector"
  value       = aws_guardduty_detector.main.account_id
}

output "finding_publishing_frequency" {
  description = "Frequency of publishing findings"
  value       = aws_guardduty_detector.main.finding_publishing_frequency
}

output "findings_bucket_arn" {
  description = "ARN of the S3 bucket for findings export"
  value       = var.create_findings_bucket ? aws_s3_bucket.guardduty_findings[0].arn : null
}

output "findings_bucket_name" {
  description = "Name of the S3 bucket for findings export"
  value       = var.create_findings_bucket ? aws_s3_bucket.guardduty_findings[0].id : null
}

output "s3_protection_status" {
  description = "Status of S3 protection"
  value       = var.enable_s3_protection ? "ENABLED" : "DISABLED"
}

output "eks_protection_status" {
  description = "Status of EKS audit log protection"
  value       = var.enable_eks_protection ? "ENABLED" : "DISABLED"
}

output "eks_runtime_monitoring_status" {
  description = "Status of EKS runtime monitoring"
  value       = var.enable_eks_runtime_monitoring ? "ENABLED" : "DISABLED"
}

output "malware_protection_status" {
  description = "Status of malware protection"
  value       = var.enable_malware_protection ? "ENABLED" : "DISABLED"
}

output "rds_protection_status" {
  description = "Status of RDS protection"
  value       = var.enable_rds_protection ? "ENABLED" : "DISABLED"
}

output "lambda_protection_status" {
  description = "Status of Lambda protection"
  value       = var.enable_lambda_protection ? "ENABLED" : "DISABLED"
}

output "event_rule_arn" {
  description = "ARN of the CloudWatch Event Rule for findings"
  value       = var.create_finding_alerts ? aws_cloudwatch_event_rule.guardduty_findings[0].arn : null
}

output "filter_names" {
  description = "List of created filter names"
  value       = [for k, v in aws_guardduty_filter.main : k]
}

output "threat_intel_set_ids" {
  description = "Map of threat intelligence set IDs"
  value       = { for k, v in aws_guardduty_threatintelset.main : k => v.id }
}

output "trusted_ip_set_ids" {
  description = "Map of trusted IP set IDs"
  value       = { for k, v in aws_guardduty_ipset.trusted : k => v.id }
}
