################################################################################
# Secrets Manager Module Outputs
################################################################################

output "secrets" {
  description = "Map of secret names to secret attributes"
  value = {
    for k, v in aws_secretsmanager_secret.main : k => {
      arn  = v.arn
      id   = v.id
      name = v.name
    }
  }
}

output "secret_arns" {
  description = "Map of secret names to ARNs"
  value       = { for k, v in aws_secretsmanager_secret.main : k => v.arn }
}

output "secret_ids" {
  description = "Map of secret names to IDs"
  value       = { for k, v in aws_secretsmanager_secret.main : k => v.id }
}

output "secret_names" {
  description = "Map of secret keys to full secret names"
  value       = { for k, v in aws_secretsmanager_secret.main : k => v.name }
}

output "secret_version_ids" {
  description = "Map of secret names to version IDs"
  value = merge(
    { for k, v in aws_secretsmanager_secret_version.main : k => v.version_id },
    { for k, v in aws_secretsmanager_secret_version.random : k => v.version_id }
  )
}

output "access_policy_arns" {
  description = "Map of secret names to access policy ARNs"
  value       = { for k, v in aws_iam_policy.secret_access : k => v.arn }
}

output "external_secrets_role_arn" {
  description = "ARN of the External Secrets Operator IAM role"
  value       = try(aws_iam_role.external_secrets[0].arn, null)
}

output "external_secrets_role_name" {
  description = "Name of the External Secrets Operator IAM role"
  value       = try(aws_iam_role.external_secrets[0].name, null)
}

output "secret_paths" {
  description = "Map of secret names to their full paths in Secrets Manager"
  value       = { for k, v in aws_secretsmanager_secret.main : k => "${var.project_name}/${var.environment}/${k}" }
}

################################################################################
# Helper Outputs for External Secrets Operator
################################################################################

output "external_secrets_store_config" {
  description = "Configuration for ExternalSecrets SecretStore"
  value = {
    region       = data.aws_region.current.name
    service_name = "SecretsManager"
    role_arn     = try(aws_iam_role.external_secrets[0].arn, null)
  }
}
