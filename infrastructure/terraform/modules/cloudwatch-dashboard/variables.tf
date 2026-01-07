################################################################################
# CloudWatch Dashboard Module Variables
################################################################################

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "eks_cluster_name" {
  description = "EKS cluster name for Container Insights metrics"
  type        = string
  default     = null
}

variable "rds_cluster_id" {
  description = "RDS Aurora cluster identifier"
  type        = string
  default     = null
}

variable "elasticache_cluster_id" {
  description = "ElastiCache replication group ID"
  type        = string
  default     = null
}

variable "alb_arn_suffix" {
  description = "ALB ARN suffix for metrics"
  type        = string
  default     = null
}

variable "api_gateway_id" {
  description = "API Gateway ID for metrics"
  type        = string
  default     = null
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
