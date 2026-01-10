################################################################################
# Secrets Manager Module Outputs
################################################################################

output "kms_key_arn" {
  description = "ARN of the KMS key used for secrets encryption"
  value       = var.create_kms_key ? aws_kms_key.secrets[0].arn : var.kms_key_arn
}

output "kms_key_id" {
  description = "ID of the KMS key used for secrets encryption"
  value       = var.create_kms_key ? aws_kms_key.secrets[0].key_id : null
}

output "kms_key_alias_arn" {
  description = "ARN of the KMS key alias"
  value       = var.create_kms_key ? aws_kms_alias.secrets[0].arn : null
}

output "kms_key_alias_name" {
  description = "Name of the KMS key alias"
  value       = var.create_kms_key ? aws_kms_alias.secrets[0].name : null
}

output "secret_arns" {
  description = "Map of secret names to their ARNs"
  value       = { for k, v in aws_secretsmanager_secret.this : k => v.arn }
}

output "secret_ids" {
  description = "Map of secret names to their IDs"
  value       = { for k, v in aws_secretsmanager_secret.this : k => v.id }
}

output "secret_names" {
  description = "Map of secret keys to their full names"
  value       = { for k, v in aws_secretsmanager_secret.this : k => v.name }
}

output "all_secret_arns" {
  description = "List of all secret ARNs"
  value       = [for v in aws_secretsmanager_secret.this : v.arn]
}

output "secrets_access_role_arn" {
  description = "ARN of the IAM role for EKS pod secret access (IRSA)"
  value       = var.eks_cluster_oidc_arn != "" ? aws_iam_role.secrets_access[0].arn : null
}

output "secrets_access_role_name" {
  description = "Name of the IAM role for EKS pod secret access (IRSA)"
  value       = var.eks_cluster_oidc_arn != "" ? aws_iam_role.secrets_access[0].name : null
}

output "rotation_lambda_arn" {
  description = "ARN of the secret rotation Lambda function"
  value       = var.create_rotation_lambda ? aws_lambda_function.rotation[0].arn : null
}

output "rotation_lambda_name" {
  description = "Name of the secret rotation Lambda function"
  value       = var.create_rotation_lambda ? aws_lambda_function.rotation[0].function_name : null
}

output "rotation_lambda_role_arn" {
  description = "ARN of the rotation Lambda IAM role"
  value       = var.create_rotation_lambda ? aws_iam_role.rotation_lambda[0].arn : null
}

output "secret_version_ids" {
  description = "Map of secret names to their version IDs"
  value = {
    for k, v in aws_secretsmanager_secret_version.this : k => v.version_id
  }
}

output "name_prefix" {
  description = "Prefix used for naming secrets"
  value       = local.name_prefix
}
