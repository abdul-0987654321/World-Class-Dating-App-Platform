################################################################################
# SQS/SNS Messaging Outputs
################################################################################

# Standard Queue Outputs
output "standard_queue_urls" {
  description = "Map of standard queue URLs"
  value       = { for k, v in aws_sqs_queue.standard : k => v.url }
}

output "standard_queue_arns" {
  description = "Map of standard queue ARNs"
  value       = { for k, v in aws_sqs_queue.standard : k => v.arn }
}

# FIFO Queue Outputs
output "fifo_queue_urls" {
  description = "Map of FIFO queue URLs"
  value       = { for k, v in aws_sqs_queue.fifo : k => v.url }
}

output "fifo_queue_arns" {
  description = "Map of FIFO queue ARNs"
  value       = { for k, v in aws_sqs_queue.fifo : k => v.arn }
}

# Combined Queue Outputs
output "all_queue_urls" {
  description = "Map of all queue URLs"
  value = merge(
    { for k, v in aws_sqs_queue.standard : k => v.url },
    { for k, v in aws_sqs_queue.fifo : k => v.url }
  )
}

output "all_queue_arns" {
  description = "Map of all queue ARNs"
  value = merge(
    { for k, v in aws_sqs_queue.standard : k => v.arn },
    { for k, v in aws_sqs_queue.fifo : k => v.arn }
  )
}

# DLQ Outputs
output "dlq_urls" {
  description = "Map of DLQ URLs"
  value = merge(
    { for k, v in aws_sqs_queue.dlq : k => v.url },
    { for k, v in aws_sqs_queue.dlq_fifo : k => v.url }
  )
}

output "dlq_arns" {
  description = "Map of DLQ ARNs"
  value = merge(
    { for k, v in aws_sqs_queue.dlq : k => v.arn },
    { for k, v in aws_sqs_queue.dlq_fifo : k => v.arn }
  )
}

# SNS Topic Outputs
output "topic_arns" {
  description = "Map of SNS topic ARNs"
  value       = { for k, v in aws_sns_topic.main : k => v.arn }
}

output "topic_ids" {
  description = "Map of SNS topic IDs"
  value       = { for k, v in aws_sns_topic.main : k => v.id }
}

# IAM Role
output "messaging_role_arn" {
  description = "IAM role ARN for messaging access"
  value       = var.create_eks_role ? aws_iam_role.messaging[0].arn : null
}

output "messaging_role_name" {
  description = "IAM role name for messaging access"
  value       = var.create_eks_role ? aws_iam_role.messaging[0].name : null
}

# EventBridge
output "event_rule_arns" {
  description = "Map of EventBridge rule ARNs"
  value       = { for k, v in aws_cloudwatch_event_rule.main : k => v.arn }
}
