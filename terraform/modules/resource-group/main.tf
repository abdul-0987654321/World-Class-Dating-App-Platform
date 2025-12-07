resource "azurerm_resource_group" "this" {
  name     = var.name
  location = var.location

  tags = merge(
    var.tags,
    {
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  )

  lifecycle {
    prevent_destroy = false
    ignore_changes  = [tags["CreatedDate"]]
  }
}
