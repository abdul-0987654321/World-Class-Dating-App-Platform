################################################################################
# EKS Module Variables
################################################################################

variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
}

variable "cluster_version" {
  description = "Kubernetes version for the EKS cluster"
  type        = string
  default     = "1.28"
}

variable "vpc_id" {
  description = "ID of the VPC where the cluster will be created"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for the EKS cluster control plane"
  type        = list(string)
}

variable "node_subnet_ids" {
  description = "List of subnet IDs for EKS worker nodes"
  type        = list(string)
}

variable "cluster_endpoint_private_access" {
  description = "Enable private API server endpoint access"
  type        = bool
  default     = true
}

variable "cluster_endpoint_public_access" {
  description = "Enable public API server endpoint access"
  type        = bool
  default     = false
}

variable "cluster_endpoint_public_access_cidrs" {
  description = "List of CIDR blocks allowed to access the public API endpoint"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "cluster_service_ipv4_cidr" {
  description = "CIDR block for Kubernetes service IPs"
  type        = string
  default     = "172.20.0.0/16"
}

variable "cluster_enabled_log_types" {
  description = "List of control plane logging types to enable"
  type        = list(string)
  default     = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
}

variable "cluster_log_retention_days" {
  description = "Number of days to retain cluster logs"
  type        = number
  default     = 30
}

variable "node_groups" {
  description = "Map of EKS managed node group configurations"
  type = map(object({
    instance_types             = list(string)
    capacity_type              = string
    disk_size                  = number
    desired_size               = number
    min_size                   = number
    max_size                   = number
    max_unavailable_percentage = number
    labels                     = map(string)
    taints = list(object({
      key    = string
      value  = string
      effect = string
    }))
  }))
  default = {
    general = {
      instance_types             = ["t3.large"]
      capacity_type              = "ON_DEMAND"
      disk_size                  = 50
      desired_size               = 2
      min_size                   = 1
      max_size                   = 10
      max_unavailable_percentage = 50
      labels                     = {}
      taints                     = []
    }
  }
}

variable "create_kms_key" {
  description = "Create a new KMS key for EKS encryption"
  type        = bool
  default     = true
}

variable "kms_key_arn" {
  description = "ARN of existing KMS key for EKS encryption (if not creating new key)"
  type        = string
  default     = null
}

variable "kms_key_deletion_window" {
  description = "Number of days before KMS key deletion"
  type        = number
  default     = 30
}

variable "enable_ebs_csi_driver" {
  description = "Enable AWS EBS CSI Driver add-on"
  type        = bool
  default     = true
}

variable "enable_cluster_autoscaler" {
  description = "Enable Cluster Autoscaler IAM role"
  type        = bool
  default     = true
}

variable "enable_aws_lb_controller" {
  description = "Enable AWS Load Balancer Controller IAM role"
  type        = bool
  default     = true
}

variable "enable_external_dns" {
  description = "Enable External DNS IAM role"
  type        = bool
  default     = true
}

variable "vpc_cni_version" {
  description = "VPC CNI add-on version"
  type        = string
  default     = null
}

variable "coredns_version" {
  description = "CoreDNS add-on version"
  type        = string
  default     = null
}

variable "kube_proxy_version" {
  description = "kube-proxy add-on version"
  type        = string
  default     = null
}

variable "ebs_csi_driver_version" {
  description = "EBS CSI Driver add-on version"
  type        = string
  default     = null
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
