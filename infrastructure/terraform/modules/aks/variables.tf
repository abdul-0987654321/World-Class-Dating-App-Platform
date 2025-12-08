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

variable "vnet_subnet_id" {
  type = string
}

variable "node_count" {
  type    = number
  default = 3
}

variable "node_vm_size" {
  type    = string
  default = "Standard_D4s_v3"
}

variable "kubernetes_version" {
  type    = string
  default = "1.28.3"
}

variable "log_analytics_workspace_id" {
  type    = string
  default = ""
}

variable "tags" {
  type    = map(string)
  default = {}
}
