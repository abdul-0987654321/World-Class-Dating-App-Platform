# Additional Provider Configurations
# Note: terraform block and azurerm provider are defined in main.tf

provider "kubernetes" {
  host                   = try(data.azurerm_kubernetes_cluster.aks[0].kube_config.0.host, null)
  client_certificate     = try(base64decode(data.azurerm_kubernetes_cluster.aks[0].kube_config.0.client_certificate), null)
  client_key             = try(base64decode(data.azurerm_kubernetes_cluster.aks[0].kube_config.0.client_key), null)
  cluster_ca_certificate = try(base64decode(data.azurerm_kubernetes_cluster.aks[0].kube_config.0.cluster_ca_certificate), null)
}

provider "helm" {
  kubernetes {
    host                   = try(data.azurerm_kubernetes_cluster.aks[0].kube_config.0.host, null)
    client_certificate     = try(base64decode(data.azurerm_kubernetes_cluster.aks[0].kube_config.0.client_certificate), null)
    client_key             = try(base64decode(data.azurerm_kubernetes_cluster.aks[0].kube_config.0.client_key), null)
    cluster_ca_certificate = try(base64decode(data.azurerm_kubernetes_cluster.aks[0].kube_config.0.cluster_ca_certificate), null)
  }
}

# Data source for existing AKS cluster (if creating kubernetes/helm resources)
data "azurerm_kubernetes_cluster" "aks" {
  count               = var.enable_aks ? 1 : 0
  name                = "${var.prefix}-${var.env}-aks"
  resource_group_name = "${var.prefix}-${var.env}-rg"
}

# Note: Variables subscription_id, tenant_id, prefix, env are defined in variables.tf
# to avoid duplicate declarations

variable "enable_aks" {
  description = "Whether AKS is enabled (for kubernetes/helm providers)"
  type        = bool
  default     = false
}
