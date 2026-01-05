################################################################################
# Production Alarms Module - Variables
################################################################################

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}

################################################################################
# KMS Configuration
################################################################################

variable "kms_key_arn" {
  description = "ARN of KMS key for SNS topic encryption"
  type        = string
  default     = null
}

################################################################################
# SNS Configuration
################################################################################

variable "create_sns_topics" {
  description = "Create SNS topics for alerts"
  type        = bool
  default     = true
}

variable "critical_alert_emails" {
  description = "Email addresses for critical alerts"
  type        = list(string)
  default     = []
}

variable "warning_alert_emails" {
  description = "Email addresses for warning alerts"
  type        = list(string)
  default     = []
}

variable "critical_alarm_actions" {
  description = "List of ARNs for critical alarm actions"
  type        = list(string)
  default     = []
}

variable "warning_alarm_actions" {
  description = "List of ARNs for warning alarm actions"
  type        = list(string)
  default     = []
}

################################################################################
# EKS Configuration
################################################################################

variable "eks_cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
  default     = null
}

################################################################################
# RDS Configuration
################################################################################

variable "rds_cluster_identifier" {
  description = "RDS cluster identifier"
  type        = string
  default     = null
}

variable "rds_max_connections" {
  description = "Maximum number of RDS connections"
  type        = number
  default     = 1000
}

################################################################################
# ElastiCache Configuration
################################################################################

variable "elasticache_replication_group_id" {
  description = "ElastiCache replication group ID"
  type        = string
  default     = null
}

################################################################################
# ALB Configuration
################################################################################

variable "alb_arn_suffix" {
  description = "ALB ARN suffix for metrics"
  type        = string
  default     = null
}

################################################################################
# WAF Configuration
################################################################################

variable "waf_web_acl_name" {
  description = "WAF Web ACL name"
  type        = string
  default     = null
}

################################################################################
# SQS Configuration
################################################################################

variable "sqs_queues" {
  description = "Map of SQS queues to monitor"
  type = map(object({
    queue_name      = string
    depth_threshold = number
  }))
  default = {}
}

variable "sqs_dlq_queues" {
  description = "Map of SQS dead letter queues to monitor"
  type = map(object({
    queue_name = string
  }))
  default = {}
}

################################################################################
# Cost Anomaly Detection
################################################################################

variable "enable_cost_anomaly_detection" {
  description = "Enable AWS Cost Anomaly Detection"
  type        = bool
  default     = true
}

variable "cost_anomaly_email" {
  description = "Email for cost anomaly notifications"
  type        = string
  default     = ""
}
