################################################################################
# CloudWatch Dashboard Module Outputs
################################################################################

output "operations_dashboard_name" {
  description = "Name of the operations dashboard"
  value       = aws_cloudwatch_dashboard.operations.dashboard_name
}

output "operations_dashboard_arn" {
  description = "ARN of the operations dashboard"
  value       = aws_cloudwatch_dashboard.operations.dashboard_arn
}

output "api_performance_dashboard_name" {
  description = "Name of the API performance dashboard"
  value       = aws_cloudwatch_dashboard.api_performance.dashboard_name
}

output "api_performance_dashboard_arn" {
  description = "ARN of the API performance dashboard"
  value       = aws_cloudwatch_dashboard.api_performance.dashboard_arn
}

output "business_metrics_dashboard_name" {
  description = "Name of the business metrics dashboard"
  value       = aws_cloudwatch_dashboard.business_metrics.dashboard_name
}

output "business_metrics_dashboard_arn" {
  description = "ARN of the business metrics dashboard"
  value       = aws_cloudwatch_dashboard.business_metrics.dashboard_arn
}

output "cost_dashboard_name" {
  description = "Name of the cost dashboard"
  value       = aws_cloudwatch_dashboard.cost.dashboard_name
}

output "cost_dashboard_arn" {
  description = "ARN of the cost dashboard"
  value       = aws_cloudwatch_dashboard.cost.dashboard_arn
}

output "all_dashboard_names" {
  description = "List of all dashboard names"
  value = [
    aws_cloudwatch_dashboard.operations.dashboard_name,
    aws_cloudwatch_dashboard.api_performance.dashboard_name,
    aws_cloudwatch_dashboard.business_metrics.dashboard_name,
    aws_cloudwatch_dashboard.cost.dashboard_name
  ]
}

output "all_dashboard_arns" {
  description = "List of all dashboard ARNs"
  value = [
    aws_cloudwatch_dashboard.operations.dashboard_arn,
    aws_cloudwatch_dashboard.api_performance.dashboard_arn,
    aws_cloudwatch_dashboard.business_metrics.dashboard_arn,
    aws_cloudwatch_dashboard.cost.dashboard_arn
  ]
}
