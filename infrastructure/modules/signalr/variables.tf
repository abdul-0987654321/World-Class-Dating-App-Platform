variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "env" {
  description = "Environment name"
  type        = string
}

variable "sku_name" {
  description = "SKU name (Free_F1, Standard_S1, Premium_P1)"
  type        = string
  default     = "Standard_S1"
}

variable "capacity" {
  description = "Number of SignalR units"
  type        = number
  default     = 1
}

variable "service_mode" {
  description = "Service mode (Default, Serverless, Classic)"
  type        = string
  default     = "Default"
}

variable "enable_public_access" {
  description = "Enable public network access"
  type        = bool
  default     = true
}

variable "cors_allowed_origins" {
  description = "CORS allowed origins"
  type        = list(string)
  default     = ["*"]
}

variable "upstream_url_template" {
  description = "Upstream URL template for serverless mode"
  type        = string
  default     = "https://your-backend-api.com/api/signalr/negotiate"
}

variable "enable_private_endpoint" {
  description = "Enable private endpoint for SignalR"
  type        = bool
  default     = false
}

variable "private_endpoint_subnet_id" {
  description = "Subnet ID for private endpoint"
  type        = string
  default     = ""
}

variable "custom_domain_name" {
  description = "Custom domain name for SignalR"
  type        = string
  default     = ""
}

variable "custom_certificate_id" {
  description = "Custom certificate ID for custom domain"
  type        = string
  default     = ""
}

variable "default_network_action" {
  description = "Default network action (Allow or Deny)"
  type        = string
  default     = "Allow"
}

variable "public_allowed_request_types" {
  description = "Allowed request types from public network"
  type        = list(string)
  default     = ["ServerConnection", "ClientConnection", "RESTAPI", "Trace"]
}

variable "public_denied_request_types" {
  description = "Denied request types from public network"
  type        = list(string)
  default     = []
}

variable "log_analytics_workspace_id" {
  description = "Log Analytics workspace ID for diagnostics"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}
