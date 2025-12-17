variable "resource_group_name" {
  type = string
}

variable "location" {
  type = string
}

variable "prefix" {
  type = string
}

variable "env" {
  type = string
}

variable "sku_name" {
  type    = string
  default = "GP_Standard_D4s_v3"
}

variable "storage_mb" {
  type    = number
  default = 131072
}

variable "postgres_version" {
  type    = string
  default = "14"
}

variable "subnet_id" {
  type = string
}

variable "vnet_id" {
  description = "Virtual Network ID for private DNS zone link"
  type        = string
  default     = ""
}

variable "enable_private_endpoint" {
  type    = bool
  default = true
}

variable "tags" {
  type    = map(string)
  default = {}
}
