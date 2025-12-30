################################################################################
# RDS Module Outputs
################################################################################

################################################################################
# Aurora Cluster Outputs
################################################################################

output "aurora_cluster_id" {
  description = "ID of the Aurora cluster"
  value       = try(aws_rds_cluster.aurora[0].id, null)
}

output "aurora_cluster_arn" {
  description = "ARN of the Aurora cluster"
  value       = try(aws_rds_cluster.aurora[0].arn, null)
}

output "aurora_cluster_endpoint" {
  description = "Writer endpoint for the Aurora cluster"
  value       = try(aws_rds_cluster.aurora[0].endpoint, null)
}

output "aurora_cluster_reader_endpoint" {
  description = "Reader endpoint for the Aurora cluster"
  value       = try(aws_rds_cluster.aurora[0].reader_endpoint, null)
}

output "aurora_cluster_resource_id" {
  description = "Resource ID of the Aurora cluster"
  value       = try(aws_rds_cluster.aurora[0].cluster_resource_id, null)
}

output "aurora_cluster_instances" {
  description = "List of Aurora cluster instance identifiers"
  value       = try(aws_rds_cluster_instance.aurora[*].identifier, [])
}

################################################################################
# RDS Instance Outputs
################################################################################

output "rds_instance_id" {
  description = "ID of the RDS instance"
  value       = try(aws_db_instance.postgres[0].id, null)
}

output "rds_instance_arn" {
  description = "ARN of the RDS instance"
  value       = try(aws_db_instance.postgres[0].arn, null)
}

output "rds_instance_endpoint" {
  description = "Endpoint of the RDS instance"
  value       = try(aws_db_instance.postgres[0].endpoint, null)
}

output "rds_instance_address" {
  description = "Address of the RDS instance"
  value       = try(aws_db_instance.postgres[0].address, null)
}

output "rds_instance_resource_id" {
  description = "Resource ID of the RDS instance"
  value       = try(aws_db_instance.postgres[0].resource_id, null)
}

################################################################################
# Common Outputs
################################################################################

output "endpoint" {
  description = "Database endpoint (writer)"
  value       = var.engine_mode == "aurora" ? try(aws_rds_cluster.aurora[0].endpoint, null) : try(aws_db_instance.postgres[0].address, null)
}

output "reader_endpoint" {
  description = "Database reader endpoint (Aurora only)"
  value       = var.engine_mode == "aurora" ? try(aws_rds_cluster.aurora[0].reader_endpoint, null) : try(aws_db_instance.postgres[0].address, null)
}

output "port" {
  description = "Database port"
  value       = var.port
}

output "database_name" {
  description = "Name of the database"
  value       = var.database_name
}

output "master_username" {
  description = "Master username"
  value       = var.master_username
}

output "connection_string" {
  description = "PostgreSQL connection string"
  value       = "postgresql://${var.master_username}@${var.engine_mode == "aurora" ? try(aws_rds_cluster.aurora[0].endpoint, "") : try(aws_db_instance.postgres[0].address, "")}:${var.port}/${var.database_name}"
  sensitive   = true
}

################################################################################
# Security Outputs
################################################################################

output "security_group_id" {
  description = "ID of the RDS security group"
  value       = aws_security_group.rds.id
}

output "security_group_arn" {
  description = "ARN of the RDS security group"
  value       = aws_security_group.rds.arn
}

output "iam_auth_policy_arn" {
  description = "ARN of the IAM authentication policy"
  value       = try(aws_iam_policy.rds_iam_auth[0].arn, null)
}

################################################################################
# Secrets Manager Outputs
################################################################################

output "master_password_secret_arn" {
  description = "ARN of the Secrets Manager secret containing master password"
  value       = var.manage_master_user_password ? try(aws_rds_cluster.aurora[0].master_user_secret[0].secret_arn, try(aws_db_instance.postgres[0].master_user_secret[0].secret_arn, null)) : try(aws_secretsmanager_secret.rds_master_password[0].arn, null)
}

output "master_password_secret_id" {
  description = "ID of the Secrets Manager secret containing master password"
  value       = try(aws_secretsmanager_secret.rds_master_password[0].id, null)
}

################################################################################
# Monitoring Outputs
################################################################################

output "enhanced_monitoring_role_arn" {
  description = "ARN of the enhanced monitoring IAM role"
  value       = try(aws_iam_role.rds_enhanced_monitoring[0].arn, null)
}

output "parameter_group_name" {
  description = "Name of the DB parameter group"
  value       = aws_db_parameter_group.main.name
}

output "cluster_parameter_group_name" {
  description = "Name of the Aurora cluster parameter group"
  value       = try(aws_rds_cluster_parameter_group.aurora[0].name, null)
}
