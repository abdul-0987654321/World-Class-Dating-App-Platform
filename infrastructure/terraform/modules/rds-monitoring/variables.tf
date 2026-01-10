################################################################################
# RDS Monitoring Module Variables
################################################################################

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "db_cluster_identifier" {
  description = "RDS Aurora cluster identifier"
  type        = string
}

variable "db_instance_identifiers" {
  description = "List of RDS Aurora instance identifiers"
  type        = list(string)
  default     = []
}

variable "kms_key_arn" {
  description = "ARN of the KMS key for encryption"
  type        = string
  default     = null
}

variable "log_retention_days" {
  description = "Number of days to retain CloudWatch logs"
  type        = number
  default     = 30
}

variable "tags" {
  description = "Additional tags for resources"
  type        = map(string)
  default     = {}
}

################################################################################
# Feature Toggles
################################################################################

variable "create_monitoring_role" {
  description = "Create IAM role for RDS Enhanced Monitoring"
  type        = bool
  default     = true
}

variable "create_sns_topic" {
  description = "Create SNS topic for RDS alerts"
  type        = bool
  default     = true
}

variable "create_event_subscription" {
  description = "Create RDS event subscription"
  type        = bool
  default     = true
}

variable "create_dashboard" {
  description = "Create CloudWatch dashboard for RDS monitoring"
  type        = bool
  default     = true
}

variable "create_composite_alarm" {
  description = "Create composite CloudWatch alarm"
  type        = bool
  default     = true
}

variable "create_warning_alarms" {
  description = "Create warning-level alarms in addition to critical alarms"
  type        = bool
  default     = true
}

################################################################################
# Log Configuration
################################################################################

variable "enable_audit_log" {
  description = "Enable audit log CloudWatch log group"
  type        = bool
  default     = true
}

variable "enable_error_log" {
  description = "Enable error log CloudWatch log group"
  type        = bool
  default     = true
}

variable "enable_general_log" {
  description = "Enable general log CloudWatch log group"
  type        = bool
  default     = false
}

variable "enable_slowquery_log" {
  description = "Enable slow query log CloudWatch log group"
  type        = bool
  default     = true
}

################################################################################
# Alarm Configuration
################################################################################

variable "create_cpu_alarm" {
  description = "Create CPU utilization alarm"
  type        = bool
  default     = true
}

variable "create_connection_alarm" {
  description = "Create database connection alarm"
  type        = bool
  default     = true
}

variable "create_storage_alarm" {
  description = "Create storage-related alarms"
  type        = bool
  default     = true
}

variable "create_replication_alarm" {
  description = "Create replication lag alarms"
  type        = bool
  default     = true
}

variable "create_deadlock_alarm" {
  description = "Create deadlock detection alarm"
  type        = bool
  default     = true
}

variable "create_latency_alarm" {
  description = "Create read/write latency alarms"
  type        = bool
  default     = true
}

variable "create_disk_queue_alarm" {
  description = "Create disk queue depth alarm"
  type        = bool
  default     = true
}

variable "create_serverless_alarms" {
  description = "Create Serverless v2 specific alarms"
  type        = bool
  default     = false
}

variable "is_serverless_v2" {
  description = "Whether the cluster is Aurora Serverless v2"
  type        = bool
  default     = false
}

variable "enable_binlog_replication_monitoring" {
  description = "Enable binlog replication monitoring"
  type        = bool
  default     = false
}

variable "alarm_evaluation_periods" {
  description = "Number of evaluation periods for alarms"
  type        = number
  default     = 3
}

variable "alarm_period" {
  description = "Alarm evaluation period in seconds"
  type        = number
  default     = 300
}

variable "alarm_thresholds" {
  description = "Thresholds for various alarms"
  type = object({
    cpu_utilization_high      = optional(number, 90)
    cpu_utilization_warning   = optional(number, 70)
    connection_count_high     = optional(number, 500)
    connection_count_warning  = optional(number, 400)
    volume_bytes_used_high    = optional(number, 107374182400) # 100 GB
    freeable_memory_low       = optional(number, 536870912)    # 512 MB
    free_local_storage_low    = optional(number, 5368709120)   # 5 GB
    replica_lag_high          = optional(number, 100)
    replica_lag_warning       = optional(number, 50)
    binlog_replica_lag_high   = optional(number, 300)
    deadlocks_threshold       = optional(number, 1)
    read_latency_high         = optional(number, 0.02)
    write_latency_high        = optional(number, 0.1)
    disk_queue_depth_high     = optional(number, 64)
    serverless_capacity_high  = optional(number, 90)
    serverless_max_capacity   = optional(number, 16)
    acu_utilization_high      = optional(number, 90)
  })
  default = {}
}

################################################################################
# Notification Configuration
################################################################################

variable "existing_sns_topic_arn" {
  description = "ARN of existing SNS topic (if not creating a new one)"
  type        = string
  default     = null
}

variable "notification_email_addresses" {
  description = "List of email addresses for SNS notifications"
  type        = list(string)
  default     = []
}

variable "notification_sms_numbers" {
  description = "List of phone numbers for SNS SMS notifications"
  type        = list(string)
  default     = []
}

variable "notification_lambda_arns" {
  description = "List of Lambda ARNs for SNS notifications"
  type        = list(string)
  default     = []
}

variable "alarm_actions" {
  description = "List of actions to execute when alarm transitions to ALARM state"
  type        = list(string)
  default     = null
}

variable "ok_actions" {
  description = "List of actions to execute when alarm transitions to OK state"
  type        = list(string)
  default     = null
}

variable "insufficient_data_actions" {
  description = "List of actions to execute when alarm transitions to INSUFFICIENT_DATA state"
  type        = list(string)
  default     = []
}

################################################################################
# Event Configuration
################################################################################

variable "event_categories" {
  description = "List of event categories for cluster event subscription"
  type        = list(string)
  default = [
    "availability",
    "deletion",
    "failover",
    "failure",
    "maintenance",
    "notification"
  ]
}

variable "instance_event_categories" {
  description = "List of event categories for instance event subscription"
  type        = list(string)
  default = [
    "availability",
    "configuration change",
    "deletion",
    "failover",
    "failure",
    "maintenance",
    "notification",
    "recovery",
    "restoration"
  ]
}
