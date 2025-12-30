################################################################################
# ElastiCache Module Variables
################################################################################

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for the ElastiCache subnet group"
  type        = list(string)
  default     = []
}

variable "create_subnet_group" {
  description = "Create a new subnet group"
  type        = bool
  default     = true
}

variable "subnet_group_name" {
  description = "Name of existing subnet group (if not creating new one)"
  type        = string
  default     = null
}

################################################################################
# Redis Configuration
################################################################################

variable "engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.0"
}

variable "node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.r6g.large"
}

variable "port" {
  description = "Redis port"
  type        = number
  default     = 6379
}

variable "num_cache_clusters" {
  description = "Number of cache clusters (primary and replicas) for non-cluster mode"
  type        = number
  default     = 2
}

variable "parameter_group_family" {
  description = "ElastiCache parameter group family"
  type        = string
  default     = "redis7"
}

variable "parameters" {
  description = "List of ElastiCache parameters"
  type = list(object({
    name  = string
    value = string
  }))
  default = [
    {
      name  = "maxmemory-policy"
      value = "volatile-lru"
    }
  ]
}

################################################################################
# Cluster Mode Configuration
################################################################################

variable "cluster_mode_enabled" {
  description = "Enable cluster mode (sharding)"
  type        = bool
  default     = false
}

variable "num_node_groups" {
  description = "Number of node groups (shards) for cluster mode"
  type        = number
  default     = 1
}

variable "replicas_per_node_group" {
  description = "Number of replicas per node group for cluster mode"
  type        = number
  default     = 1
}

################################################################################
# High Availability
################################################################################

variable "automatic_failover_enabled" {
  description = "Enable automatic failover"
  type        = bool
  default     = true
}

variable "multi_az_enabled" {
  description = "Enable Multi-AZ"
  type        = bool
  default     = true
}

################################################################################
# Encryption
################################################################################

variable "at_rest_encryption_enabled" {
  description = "Enable encryption at rest"
  type        = bool
  default     = true
}

variable "transit_encryption_enabled" {
  description = "Enable encryption in transit (TLS)"
  type        = bool
  default     = true
}

variable "kms_key_arn" {
  description = "ARN of KMS key for encryption"
  type        = string
  default     = null
}

variable "auth_token" {
  description = "Auth token for Redis (leave null to auto-generate)"
  type        = string
  default     = null
  sensitive   = true
}

variable "store_auth_token_in_secrets_manager" {
  description = "Store the auth token in Secrets Manager"
  type        = bool
  default     = true
}

################################################################################
# Backup Configuration
################################################################################

variable "snapshot_retention_limit" {
  description = "Number of days to retain snapshots"
  type        = number
  default     = 7
}

variable "snapshot_window" {
  description = "Daily time range for snapshots"
  type        = string
  default     = "03:00-04:00"
}

variable "maintenance_window" {
  description = "Weekly time range for maintenance"
  type        = string
  default     = "sun:04:00-sun:05:00"
}

################################################################################
# Security
################################################################################

variable "eks_security_group_id" {
  description = "Security group ID of EKS nodes"
  type        = string
  default     = null
}

variable "create_eks_security_group_rule" {
  description = "Create security group rule for EKS access (set to false on initial deployment)"
  type        = bool
  default     = false
}

variable "allowed_cidr_blocks" {
  description = "List of CIDR blocks allowed to access Redis"
  type        = list(string)
  default     = []
}

variable "additional_security_group_ids" {
  description = "Additional security group IDs allowed to access Redis"
  type        = list(string)
  default     = []
}

################################################################################
# Logging
################################################################################

variable "enable_slow_log" {
  description = "Enable slow log delivery to CloudWatch"
  type        = bool
  default     = true
}

variable "enable_engine_log" {
  description = "Enable engine log delivery to CloudWatch"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "Number of days to retain logs"
  type        = number
  default     = 30
}

################################################################################
# Maintenance
################################################################################

variable "auto_minor_version_upgrade" {
  description = "Enable automatic minor version upgrades"
  type        = bool
  default     = true
}

variable "apply_immediately" {
  description = "Apply changes immediately"
  type        = bool
  default     = false
}

################################################################################
# Notifications
################################################################################

variable "notification_topic_arn" {
  description = "ARN of SNS topic for notifications"
  type        = string
  default     = null
}

################################################################################
# CloudWatch Alarms
################################################################################

variable "create_cloudwatch_alarms" {
  description = "Create CloudWatch alarms"
  type        = bool
  default     = true
}

variable "cpu_utilization_threshold" {
  description = "CPU utilization threshold for alarm"
  type        = number
  default     = 80
}

variable "memory_usage_threshold" {
  description = "Memory usage percentage threshold for alarm"
  type        = number
  default     = 80
}

variable "evictions_threshold" {
  description = "Evictions threshold for alarm"
  type        = number
  default     = 100
}

variable "alarm_actions" {
  description = "List of ARNs for alarm actions"
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
