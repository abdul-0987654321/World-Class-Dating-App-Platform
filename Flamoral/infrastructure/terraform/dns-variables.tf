# =============================================================================
# DNS Module Variables
# =============================================================================
# Add these variables to enable DNS management
# You can either add this to variables.tf or keep as a separate file
# =============================================================================

variable "dns_enabled" {
  description = "Enable DNS zone management"
  type        = bool
  default     = false
}

variable "domain_name" {
  description = "Domain name for the DNS zone"
  type        = string
  default     = "flamoral.com"
}

variable "dns_target_ip" {
  description = "Target IP address for DNS A records (Kubernetes ingress IP)"
  type        = string
  default     = "48.200.65.15"

  validation {
    condition     = can(regex("^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$", var.dns_target_ip))
    error_message = "Must be a valid IPv4 address."
  }
}

variable "dns_ttl" {
  description = "DNS record TTL in seconds"
  type        = number
  default     = 300

  validation {
    condition     = var.dns_ttl >= 60 && var.dns_ttl <= 86400
    error_message = "TTL must be between 60 and 86400 seconds."
  }
}

variable "dns_verification_txt" {
  description = "TXT record value for domain verification (optional)"
  type        = string
  default     = ""
  sensitive   = true
}
