################################################################################
# CI/CD Module Outputs
################################################################################

output "codepipeline_arn" {
  description = "ARN of the CodePipeline"
  value       = aws_codepipeline.main.arn
}

output "codepipeline_name" {
  description = "Name of the CodePipeline"
  value       = aws_codepipeline.main.name
}

output "codebuild_project_names" {
  description = "Names of the CodeBuild projects"
  value       = { for k, v in aws_codebuild_project.services : k => v.name }
}

output "codebuild_project_arns" {
  description = "ARNs of the CodeBuild projects"
  value       = { for k, v in aws_codebuild_project.services : k => v.arn }
}

output "artifacts_bucket_name" {
  description = "Name of the S3 bucket for artifacts"
  value       = aws_s3_bucket.artifacts.bucket
}

output "artifacts_bucket_arn" {
  description = "ARN of the S3 bucket for artifacts"
  value       = aws_s3_bucket.artifacts.arn
}

output "codebuild_role_arn" {
  description = "ARN of the CodeBuild IAM role"
  value       = aws_iam_role.codebuild.arn
}

output "codepipeline_role_arn" {
  description = "ARN of the CodePipeline IAM role"
  value       = aws_iam_role.codepipeline.arn
}

output "github_connection_arn" {
  description = "ARN of the GitHub CodeStar connection"
  value       = var.create_github_connection ? aws_codestarconnections_connection.github[0].arn : var.codestar_connection_arn
}

output "github_connection_status" {
  description = "Status of the GitHub connection (needs to be AVAILABLE)"
  value       = var.create_github_connection ? aws_codestarconnections_connection.github[0].connection_status : "EXTERNAL"
}

################################################################################
# Nightly Build Outputs
################################################################################

output "nightly_build_rule_arn" {
  description = "ARN of the EventBridge rule for nightly builds"
  value       = var.enable_nightly_build ? aws_cloudwatch_event_rule.nightly_build[0].arn : null
}

output "nightly_build_schedule" {
  description = "Schedule expression for nightly builds"
  value       = var.enable_nightly_build ? var.nightly_build_schedule : null
}

output "pipeline_notification_topic_arn" {
  description = "ARN of the SNS topic for pipeline notifications"
  value       = var.create_notification_topic ? aws_sns_topic.pipeline_notifications[0].arn : null
}
