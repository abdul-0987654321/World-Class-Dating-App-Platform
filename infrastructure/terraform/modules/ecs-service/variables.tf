################################################################################
# ECS Fargate Service Module - Variables
################################################################################

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "service_name" {
  description = "Name of the service"
  type        = string
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}

################################################################################
# ECS Cluster Configuration
################################################################################

variable "cluster_id" {
  description = "ECS cluster ID"
  type        = string
}

variable "cluster_name" {
  description = "ECS cluster name"
  type        = string
}

################################################################################
# Container Configuration
################################################################################

variable "ecr_repository_url" {
  description = "ECR repository URL for the container image"
  type        = string
}

variable "image_tag" {
  description = "Container image tag. SECURITY: MUST use immutable tags (git commit SHA or image digest). NEVER use 'latest' in production."
  type        = string
  # SECURITY: No default - forces explicit image tag specification
  # Use git commit SHA (e.g., 'abc123def') or digest (e.g., 'sha256:...')

  validation {
    condition     = var.image_tag != "latest"
    error_message = "SECURITY VIOLATION: 'latest' tag is not allowed. Use immutable tags (git SHA or image digest) for container traceability and rollback capability."
  }
}

variable "container_port" {
  description = "Port exposed by the container"
  type        = number
}

variable "cpu" {
  description = "CPU units for the task (256, 512, 1024, 2048, 4096)"
  type        = number
  default     = 256
}

variable "memory" {
  description = "Memory for the task in MB"
  type        = number
  default     = 512
}

variable "cpu_architecture" {
  description = "CPU architecture (X86_64 or ARM64)"
  type        = string
  default     = "X86_64"
}

variable "stop_timeout" {
  description = "Time to wait before forcefully stopping the container"
  type        = number
  default     = 30
}

################################################################################
# Environment Variables and Secrets
################################################################################

variable "environment_variables" {
  description = "Environment variables for the container"
  type        = map(string)
  default     = {}
}

variable "secrets" {
  description = "Secrets to inject into the container (key = env var name, value = Secrets Manager ARN or SSM Parameter ARN)"
  type        = map(string)
  default     = {}
}

################################################################################
# Health Check Configuration
################################################################################

variable "container_health_check" {
  description = "Container health check configuration"
  type = object({
    command      = list(string)
    interval     = number
    timeout      = number
    retries      = number
    start_period = number
  })
  default = null
}

################################################################################
# Networking Configuration
################################################################################

variable "subnet_ids" {
  description = "Subnet IDs for the ECS tasks"
  type        = list(string)
}

variable "security_group_ids" {
  description = "Security group IDs for the ECS tasks"
  type        = list(string)
}

variable "assign_public_ip" {
  description = "Assign public IP to tasks (required for public subnets without NAT)"
  type        = bool
  default     = false
}

################################################################################
# IAM Configuration
################################################################################

variable "task_execution_role_arn" {
  description = "ARN of the ECS task execution role"
  type        = string
}

variable "task_role_arn" {
  description = "ARN of the ECS task role"
  type        = string
  default     = null
}

################################################################################
# Load Balancer Configuration
################################################################################

variable "target_group_arn" {
  description = "ARN of the target group for load balancing"
  type        = string
  default     = null
}

variable "alb_arn_suffix" {
  description = "ARN suffix of the ALB for request-based scaling"
  type        = string
  default     = null
}

variable "target_group_arn_suffix" {
  description = "ARN suffix of the target group for request-based scaling"
  type        = string
  default     = null
}

variable "health_check_grace_period" {
  description = "Health check grace period in seconds"
  type        = number
  default     = 60
}

################################################################################
# Service Discovery Configuration
################################################################################

variable "service_discovery_namespace_id" {
  description = "Service discovery namespace ID"
  type        = string
  default     = null
}

variable "service_discovery_arn" {
  description = "Service discovery service ARN"
  type        = string
  default     = null
}

################################################################################
# Capacity Configuration
################################################################################

variable "desired_count" {
  description = "Desired number of tasks"
  type        = number
  default     = 2
}

variable "use_fargate_spot" {
  description = "Use Fargate Spot for cost savings"
  type        = bool
  default     = false
}

variable "platform_version" {
  description = "Fargate platform version"
  type        = string
  default     = "LATEST"
}

################################################################################
# Deployment Configuration
################################################################################

variable "deployment_minimum_healthy_percent" {
  description = "Minimum healthy percent during deployment"
  type        = number
  default     = 100
}

variable "deployment_maximum_percent" {
  description = "Maximum percent during deployment"
  type        = number
  default     = 200
}

variable "enable_circuit_breaker" {
  description = "Enable deployment circuit breaker"
  type        = bool
  default     = true
}

variable "enable_circuit_breaker_rollback" {
  description = "Enable automatic rollback on circuit breaker"
  type        = bool
  default     = true
}

variable "enable_execute_command" {
  description = "Enable ECS Exec for debugging"
  type        = bool
  default     = false
}

################################################################################
# Auto Scaling Configuration
################################################################################

variable "enable_autoscaling" {
  description = "Enable auto-scaling for the service"
  type        = bool
  default     = true
}

variable "min_capacity" {
  description = "Minimum number of tasks"
  type        = number
  default     = 1
}

variable "max_capacity" {
  description = "Maximum number of tasks"
  type        = number
  default     = 10
}

variable "cpu_target_value" {
  description = "Target CPU utilization percentage for scaling"
  type        = number
  default     = 70
}

variable "enable_memory_scaling" {
  description = "Enable memory-based auto-scaling"
  type        = bool
  default     = true
}

variable "memory_target_value" {
  description = "Target memory utilization percentage for scaling"
  type        = number
  default     = 80
}

variable "enable_request_scaling" {
  description = "Enable request count-based auto-scaling"
  type        = bool
  default     = false
}

variable "request_count_target" {
  description = "Target request count per target for scaling"
  type        = number
  default     = 1000
}

variable "scale_in_cooldown" {
  description = "Scale in cooldown period in seconds"
  type        = number
  default     = 300
}

variable "scale_out_cooldown" {
  description = "Scale out cooldown period in seconds"
  type        = number
  default     = 60
}

################################################################################
# Logging Configuration
################################################################################

variable "log_retention_days" {
  description = "Number of days to retain logs"
  type        = number
  default     = 30
}

variable "kms_key_arn" {
  description = "KMS key ARN for log encryption"
  type        = string
  default     = null
}

################################################################################
# Alerting Configuration
################################################################################

variable "create_alarms" {
  description = "Create CloudWatch alarms for the service"
  type        = bool
  default     = true
}

variable "alarm_actions" {
  description = "List of ARNs to notify on alarm"
  type        = list(string)
  default     = []
}

################################################################################
# Container Security Configuration
################################################################################

variable "readonly_root_filesystem" {
  description = "SECURITY: When enabled, the container's root filesystem is mounted as read-only. Applications must write to mounted volumes (e.g., /tmp). Recommended for production."
  type        = bool
  default     = true
}

variable "container_capabilities" {
  description = "SECURITY: Linux capabilities to add to the container. By default, all capabilities are dropped (least privilege). Only add capabilities that are absolutely required."
  type        = list(string)
  default     = [] # Empty = no additional capabilities beyond what's strictly needed
}

variable "container_user" {
  description = "SECURITY: User to run the container as. Format: 'uid' or 'uid:gid'. Set to non-root user (e.g., '1000:1000') for enhanced security. Null = container default."
  type        = string
  default     = null
}
