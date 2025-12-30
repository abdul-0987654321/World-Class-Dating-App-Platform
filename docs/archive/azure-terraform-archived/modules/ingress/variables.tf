# =============================================================================
# Flamoral Dating Platform - NGINX Ingress Controller Variables
# =============================================================================

variable "namespace" {
  description = "Kubernetes namespace for ingress controller"
  type        = string
  default     = "ingress-nginx"
}

variable "environment" {
  description = "Environment name (dev, test, prod)"
  type        = string
}

variable "chart_version" {
  description = "NGINX Ingress Controller Helm chart version"
  type        = string
  default     = "4.8.3"
}

variable "replica_count" {
  description = "Number of ingress controller replicas"
  type        = number
  default     = 2
}

# =============================================================================
# Load Balancer Configuration
# =============================================================================
variable "use_internal_load_balancer" {
  description = "Use internal Azure Load Balancer (true for dev/test, false for prod)"
  type        = bool
  default     = true
}

variable "public_ip_address" {
  description = "Static public IP address (for production)"
  type        = string
  default     = ""
}

variable "public_ip_resource_group" {
  description = "Resource group containing the public IP"
  type        = string
  default     = ""
}

# =============================================================================
# Autoscaling Configuration
# =============================================================================
variable "enable_autoscaling" {
  description = "Enable horizontal pod autoscaling"
  type        = bool
  default     = true
}

variable "min_replicas" {
  description = "Minimum replicas for autoscaling"
  type        = number
  default     = 2
}

variable "max_replicas" {
  description = "Maximum replicas for autoscaling"
  type        = number
  default     = 10
}

# =============================================================================
# Resource Configuration
# =============================================================================
variable "cpu_request" {
  description = "CPU request"
  type        = string
  default     = "100m"
}

variable "memory_request" {
  description = "Memory request"
  type        = string
  default     = "128Mi"
}

variable "cpu_limit" {
  description = "CPU limit"
  type        = string
  default     = "500m"
}

variable "memory_limit" {
  description = "Memory limit"
  type        = string
  default     = "512Mi"
}

# =============================================================================
# Monitoring
# =============================================================================
variable "enable_service_monitor" {
  description = "Enable Prometheus ServiceMonitor"
  type        = bool
  default     = false
}

# =============================================================================
# Cert-Manager / Let's Encrypt Configuration
# =============================================================================
variable "enable_cert_manager" {
  description = "Install cert-manager for Let's Encrypt certificates"
  type        = bool
  default     = false
}

variable "cert_manager_version" {
  description = "Cert-manager Helm chart version"
  type        = string
  default     = "v1.13.3"
}

variable "letsencrypt_email" {
  description = "Email for Let's Encrypt registration"
  type        = string
  default     = ""
}
