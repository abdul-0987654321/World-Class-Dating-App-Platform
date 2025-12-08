/**
 * DNS Zone Module - Variables
 */

variable "domain_name" {
  description = "The domain name to create the DNS zone for"
  type        = string
  default     = "flamoral.com"
}

variable "resource_group_name" {
  description = "The name of the resource group"
  type        = string
}

variable "aks_public_ip" {
  description = "The public IP address of the AKS ingress load balancer"
  type        = string
  default     = ""
}

variable "create_environment_records" {
  description = "Whether to create dev/test/staging CNAME records"
  type        = bool
  default     = true
}

variable "dev_cname_target" {
  description = "CNAME target for dev subdomain"
  type        = string
  default     = ""
}

variable "test_cname_target" {
  description = "CNAME target for test subdomain"
  type        = string
  default     = ""
}

variable "staging_cname_target" {
  description = "CNAME target for staging subdomain"
  type        = string
  default     = ""
}

variable "domain_verification_txt" {
  description = "TXT record value for domain verification"
  type        = string
  default     = ""
}

variable "enable_email_records" {
  description = "Whether to create email-related DNS records (MX, SPF)"
  type        = bool
  default     = false
}

variable "mx_records" {
  description = "List of MX records for email"
  type = list(object({
    preference = number
    exchange   = string
  }))
  default = [
    {
      preference = 1
      exchange   = "aspmx.l.google.com."
    },
    {
      preference = 5
      exchange   = "alt1.aspmx.l.google.com."
    },
    {
      preference = 5
      exchange   = "alt2.aspmx.l.google.com."
    }
  ]
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
