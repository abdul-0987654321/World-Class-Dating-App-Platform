/**
 * AWS Budgets Module Outputs
 */

output "monthly_budget_id" {
  description = "ID of the monthly cost budget"
  value       = aws_budgets_budget.monthly_cost.id
}

output "monthly_budget_name" {
  description = "Name of the monthly cost budget"
  value       = aws_budgets_budget.monthly_cost.name
}

output "ecs_budget_id" {
  description = "ID of the ECS budget"
  value       = var.create_service_budgets ? aws_budgets_budget.ecs[0].id : null
}

output "rds_budget_id" {
  description = "ID of the RDS budget"
  value       = var.create_service_budgets ? aws_budgets_budget.rds[0].id : null
}

output "s3_budget_id" {
  description = "ID of the S3 budget"
  value       = var.create_service_budgets ? aws_budgets_budget.s3[0].id : null
}

output "budget_action_role_arn" {
  description = "ARN of the budget action IAM role"
  value       = var.enable_budget_actions ? aws_iam_role.budget_action[0].arn : null
}
