################################################################################
# CDN Module Variables
################################################################################

variable "project" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "domain_name" {
  description = "Domain name for the CDN"
  type        = string
  default     = ""
}

variable "alb_dns_name" {
  description = "ALB DNS name to use as origin"
  type        = string
}
