# Azure Kubernetes Service (AKS) Module for Dating App Platform

resource "azurerm_kubernetes_cluster" "main" {
  name                = "${var.environment}-dating-app-aks"
  location            = var.location
  resource_group_name = var.resource_group_name
  dns_prefix          = "${var.environment}-dating-app"
  kubernetes_version  = var.kubernetes_version

  # Node Resource Group
  node_resource_group = "${var.resource_group_name}-aks-nodes"

  # Default Node Pool
  default_node_pool {
    name                = "system"
    node_count          = var.system_node_count
    vm_size             = var.system_node_size
    vnet_subnet_id      = var.aks_subnet_id
    enable_auto_scaling = true
    min_count           = var.system_node_min_count
    max_count           = var.system_node_max_count
    max_pods            = 110
    os_disk_size_gb     = var.system_node_disk_size
    os_disk_type        = "Managed"
    type                = "VirtualMachineScaleSets"

    upgrade_settings {
      max_surge = "33%"
    }

    tags = merge(
      var.common_tags,
      {
        NodePool = "system"
      }
    )
  }

  # Identity
  identity {
    type = "SystemAssigned"
  }

  # Network Profile
  network_profile {
    network_plugin      = "azure"
    network_policy      = "azure"
    dns_service_ip      = "10.250.0.10"
    service_cidr        = "10.250.0.0/16"
    load_balancer_sku   = "standard"
    outbound_type       = "loadBalancer"
  }

  # Azure Active Directory Integration
  azure_active_directory_role_based_access_control {
    managed                = true
    azure_rbac_enabled     = true
    admin_group_object_ids = var.admin_group_object_ids
  }

  # Key Vault Integration
  key_vault_secrets_provider {
    secret_rotation_enabled  = true
    secret_rotation_interval = "2m"
  }

  # Auto Scaler Profile
  auto_scaler_profile {
    balance_similar_node_groups      = true
    expander                         = "random"
    max_graceful_termination_sec     = 600
    max_node_provisioning_time       = "15m"
    max_unready_nodes                = 3
    max_unready_percentage           = 45
    new_pod_scale_up_delay           = "10s"
    scale_down_delay_after_add       = "10m"
    scale_down_delay_after_delete    = "10s"
    scale_down_delay_after_failure   = "3m"
    scan_interval                    = "10s"
    scale_down_unneeded              = "10m"
    scale_down_unready               = "20m"
    scale_down_utilization_threshold = 0.5
  }

  # Azure Monitor
  oms_agent {
    log_analytics_workspace_id = var.log_analytics_workspace_id
  }

  # Maintenance Window
  maintenance_window {
    allowed {
      day   = "Sunday"
      hours = [2, 3, 4]
    }
  }

  # Monitoring
  azure_policy_enabled = true

  tags = merge(
    var.common_tags,
    {
      Name = "${var.environment}-dating-app-aks"
    }
  )
}

# User Node Pool for Application Workloads
resource "azurerm_kubernetes_cluster_node_pool" "user" {
  name                  = "user"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  vm_size               = var.user_node_size
  node_count            = var.user_node_count
  enable_auto_scaling   = true
  min_count             = var.user_node_min_count
  max_count             = var.user_node_max_count
  vnet_subnet_id        = var.aks_subnet_id
  max_pods              = 110
  os_disk_size_gb       = var.user_node_disk_size
  os_type               = "Linux"

  node_labels = {
    "workload" = "application"
    "role"     = "user"
  }

  node_taints = []

  upgrade_settings {
    max_surge = "33%"
  }

  tags = merge(
    var.common_tags,
    {
      NodePool = "user"
    }
  )
}

# Spot Node Pool for Cost Optimization (Optional)
resource "azurerm_kubernetes_cluster_node_pool" "spot" {
  count                 = var.enable_spot_instances ? 1 : 0
  name                  = "spot"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  vm_size               = var.spot_node_size
  priority              = "Spot"
  eviction_policy       = "Delete"
  spot_max_price        = -1
  node_count            = var.spot_node_count
  enable_auto_scaling   = true
  min_count             = var.spot_node_min_count
  max_count             = var.spot_node_max_count
  vnet_subnet_id        = var.aks_subnet_id
  max_pods              = 110
  os_disk_size_gb       = 128

  node_labels = {
    "workload"            = "batch"
    "role"                = "spot"
    "kubernetes.azure.com/scalesetpriority" = "spot"
  }

  node_taints = [
    "kubernetes.azure.com/scalesetpriority=spot:NoSchedule"
  ]

  upgrade_settings {
    max_surge = "33%"
  }

  tags = merge(
    var.common_tags,
    {
      NodePool = "spot"
    }
  )
}

# Role Assignment for AKS to pull images from ACR
resource "azurerm_role_assignment" "aks_acr" {
  count                = var.container_registry_id != null ? 1 : 0
  principal_id         = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
  role_definition_name = "AcrPull"
  scope                = var.container_registry_id
}

# Role Assignment for AKS Network Contributor
resource "azurerm_role_assignment" "aks_network" {
  principal_id         = azurerm_kubernetes_cluster.main.identity[0].principal_id
  role_definition_name = "Network Contributor"
  scope                = var.vnet_id
}

# Diagnostic Settings
resource "azurerm_monitor_diagnostic_setting" "aks" {
  name                       = "${var.environment}-aks-diagnostics"
  target_resource_id         = azurerm_kubernetes_cluster.main.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  enabled_log {
    category = "kube-apiserver"
  }

  enabled_log {
    category = "kube-controller-manager"
  }

  enabled_log {
    category = "kube-scheduler"
  }

  enabled_log {
    category = "kube-audit"
  }

  enabled_log {
    category = "cluster-autoscaler"
  }

  metric {
    category = "AllMetrics"
    enabled  = true
  }
}
