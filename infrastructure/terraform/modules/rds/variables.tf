################################################################################
# RDS Module Variables
################################################################################

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR block for security group egress rules"
  type        = string
}

variable "db_subnet_group_name" {
  description = "Name of the DB subnet group"
  type        = string
}

################################################################################
# Engine Configuration
################################################################################

variable "engine_mode" {
  description = "Database engine mode: 'aurora' for Aurora cluster or 'rds' for single RDS instance"
  type        = string
  default     = "aurora"

  validation {
    condition     = contains(["aurora", "rds"], var.engine_mode)
    error_message = "engine_mode must be either 'aurora' or 'rds'"
  }
}

variable "engine" {
  description = "Database engine (aurora-postgresql or postgres)"
  type        = string
  default     = "aurora-postgresql"
}

variable "engine_version" {
  description = "Database engine version"
  type        = string
  default     = "15.4"
}

variable "parameter_group_family" {
  description = "Parameter group family"
  type        = string
  default     = "aurora-postgresql15"
}

################################################################################
# Instance Configuration
################################################################################

variable "instance_class" {
  description = "Instance class for the database"
  type        = string
  default     = "db.r6g.large"
}

variable "instance_count" {
  description = "Number of Aurora instances (for Aurora cluster)"
  type        = number
  default     = 2
}

variable "allocated_storage" {
  description = "Allocated storage in GB (for RDS instance)"
  type        = number
  default     = 100
}

variable "max_allocated_storage" {
  description = "Maximum allocated storage in GB for autoscaling (for RDS instance)"
  type        = number
  default     = 500
}

variable "storage_type" {
  description = "Storage type (for RDS instance)"
  type        = string
  default     = "gp3"
}

################################################################################
# Serverless Configuration
################################################################################

variable "enable_serverless_v2" {
  description = "Enable Aurora Serverless v2"
  type        = bool
  default     = false
}

variable "serverless_min_capacity" {
  description = "Minimum ACU capacity for serverless"
  type        = number
  default     = 0.5
}

variable "serverless_max_capacity" {
  description = "Maximum ACU capacity for serverless"
  type        = number
  default     = 16
}

################################################################################
# Database Configuration
################################################################################

variable "database_name" {
  description = "Name of the database to create"
  type        = string
  default     = "flamoral"
}

variable "master_username" {
  description = "Master username for the database"
  type        = string
  default     = "dbadmin"
}

variable "master_password" {
  description = "Master password (leave null to auto-generate)"
  type        = string
  default     = null
  sensitive   = true
}

variable "manage_master_user_password" {
  description = "Let AWS manage the master password in Secrets Manager"
  type        = bool
  default     = true
}

variable "store_password_in_secrets_manager" {
  description = "Store the password in Secrets Manager (if not using manage_master_user_password)"
  type        = bool
  default     = true
}

variable "port" {
  description = "Database port"
  type        = number
  default     = 5432
}

################################################################################
# High Availability
################################################################################

variable "multi_az" {
  description = "Enable Multi-AZ deployment (for RDS instance)"
  type        = bool
  default     = true
}

################################################################################
# Backup Configuration
################################################################################

variable "backup_retention_period" {
  description = "Number of days to retain backups"
  type        = number
  default     = 7
}

variable "preferred_backup_window" {
  description = "Preferred backup window"
  type        = string
  default     = "03:00-04:00"
}

variable "preferred_maintenance_window" {
  description = "Preferred maintenance window"
  type        = string
  default     = "sun:04:00-sun:05:00"
}

variable "delete_automated_backups" {
  description = "Delete automated backups when instance is deleted"
  type        = bool
  default     = true
}

variable "skip_final_snapshot" {
  description = "Skip final snapshot when deleting"
  type        = bool
  default     = false
}

################################################################################
# Monitoring
################################################################################

variable "monitoring_interval" {
  description = "Enhanced monitoring interval in seconds (0 to disable)"
  type        = number
  default     = 60
}

variable "performance_insights_enabled" {
  description = "Enable Performance Insights"
  type        = bool
  default     = true
}

variable "performance_insights_retention_period" {
  description = "Performance Insights retention period in days"
  type        = number
  default     = 7
}

variable "enabled_cloudwatch_logs_exports" {
  description = "List of log types to export to CloudWatch"
  type        = list(string)
  default     = ["postgresql"]
}

################################################################################
# Security
################################################################################

variable "kms_key_arn" {
  description = "ARN of KMS key for encryption"
  type        = string
}

variable "ecs_security_group_id" {
  description = "Security group ID of ECS tasks"
  type        = string
  default     = null
}

variable "create_ecs_security_group_rule" {
  description = "Create security group rule for ECS access (set to false on initial deployment)"
  type        = bool
  default     = false
}

variable "allowed_cidr_blocks" {
  description = "List of CIDR blocks allowed to access the database"
  type        = list(string)
  default     = []
}

variable "additional_security_group_ids" {
  description = "Additional security group IDs allowed to access the database"
  type        = list(string)
  default     = []
}

variable "iam_database_authentication_enabled" {
  description = "Enable IAM database authentication"
  type        = bool
  default     = true
}

variable "deletion_protection" {
  description = "Enable deletion protection"
  type        = bool
  default     = true
}

################################################################################
# Parameter Groups
################################################################################

variable "cluster_parameters" {
  description = "Aurora cluster parameters"
  type = list(object({
    name         = string
    value        = string
    apply_method = optional(string, "immediate")
  }))
  default = [
    {
      name  = "log_statement"
      value = "all"
    },
    {
      name  = "log_min_duration_statement"
      value = "1000"
    }
  ]
}

variable "db_parameters" {
  description = "Database instance parameters"
  type = list(object({
    name         = string
    value        = string
    apply_method = optional(string, "immediate")
  }))
  default = [
    {
      name  = "log_statement"
      value = "all"
    },
    {
      name  = "log_min_duration_statement"
      value = "1000"
    }
  ]
}

################################################################################
# Version Upgrades
################################################################################

variable "auto_minor_version_upgrade" {
  description = "Enable automatic minor version upgrades"
  type        = bool
  default     = true
}

variable "allow_major_version_upgrade" {
  description = "Allow major version upgrades"
  type        = bool
  default     = false
}

################################################################################
# CloudWatch Alarms
################################################################################

variable "create_cloudwatch_alarms" {
  description = "Create CloudWatch alarms for the database"
  type        = bool
  default     = true
}

variable "cpu_utilization_threshold" {
  description = "CPU utilization threshold for alarm"
  type        = number
  default     = 80
}

variable "freeable_memory_threshold" {
  description = "Freeable memory threshold in bytes for alarm"
  type        = number
  default     = 1000000000 # 1 GB
}

variable "free_storage_space_threshold" {
  description = "Free storage space threshold in bytes for alarm"
  type        = number
  default     = 10000000000 # 10 GB
}

variable "alarm_actions" {
  description = "List of ARNs for alarm actions (e.g., SNS topics)"
  type        = list(string)
  default     = []
}

variable "ok_actions" {
  description = "List of ARNs for OK actions"
  type        = list(string)
  default     = []
}

################################################################################
# Tags
################################################################################

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
