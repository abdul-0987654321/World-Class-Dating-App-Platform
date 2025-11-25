output "aks_id" { value = azurerm_kubernetes_cluster.main.id }
output "aks_name" { value = azurerm_kubernetes_cluster.main.name }
output "aks_fqdn" { value = azurerm_kubernetes_cluster.main.fqdn }
output "kube_config" { value = azurerm_kubernetes_cluster.main.kube_config_raw; sensitive = true }
output "kubelet_identity_object_id" { value = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id }
output "kubelet_identity_client_id" { value = azurerm_kubernetes_cluster.main.kubelet_identity[0].client_id }
