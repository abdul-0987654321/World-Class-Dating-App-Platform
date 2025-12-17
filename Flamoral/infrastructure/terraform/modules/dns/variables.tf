# =============================================================================
# DNS Module Variables
# =============================================================================

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "domain_name" {
  description = "Domain name for the DNS zone (e.g., flamoral.com)"
  type        = string
  default     = "flamoral.com"
}

variable "target_ip" {
  description = "Target IP address for A records"
  type        = string
  default     = "48.200.65.15"
}

variable "use_frontdoor" {
  description = "Use Azure Front Door for DNS routing"
  type        = bool
  default     = true
}

variable "frontdoor_hostname" {
  description = "Front Door endpoint hostname for CNAME records"
  type        = string
  default     = ""
}

variable "frontdoor_id" {
  description = "Front Door resource ID for Azure Alias records"
  type        = string
  default     = ""
}

variable "aks_ingress_hostname" {
  description = "AKS Ingress hostname for direct DNS routing"
  type        = string
  default     = ""
}

variable "ttl" {
  description = "Time to Live for DNS records in seconds"
  type        = number
  default     = 300

  validation {
    condition     = var.ttl >= 60 && var.ttl <= 86400
    error_message = "TTL must be between 60 and 86400 seconds (1 minute to 24 hours)."
  }
}

variable "verification_txt" {
  description = "TXT record value for domain verification (optional)"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
