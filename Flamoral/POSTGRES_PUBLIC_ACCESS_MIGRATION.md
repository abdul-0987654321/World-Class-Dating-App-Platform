# PostgreSQL Public Access Migration Guide
## Flamoral Production Platform - Terraform Configuration

---

## Executive Summary

This document provides step-by-step instructions to migrate the Flamoral PostgreSQL Flexible Server from **private VNET-integrated access** to **public access with firewall rules** in Azure.

**Current State:**
- PostgreSQL deployed in private subnet with VNET delegation
- Private DNS zone for internal resolution
- No public network access
- Services access via private endpoint only

**Target State:**
- PostgreSQL with public endpoint enabled
- Firewall rules controlling access
- SSL/TLS enforcement
- Azure services allowed
- AKS outbound IPs whitelisted
- No VNET integration

---

## Architecture Changes

### Before (Current - Private Access)
```
┌─────────────────────────────────────────────────────┐
│              Azure Virtual Network                   │
│                                                      │
│  ┌────────────────┐         ┌──────────────────┐   │
│  │  AKS Subnet    │────────►│ Database Subnet  │   │
│  │  10.30.1.0/24  │         │  10.30.2.0/24    │   │
│  └────────────────┘         └────────┬─────────┘   │
│                                      │              │
│                              ┌───────▼────────┐    │
│                              │   PostgreSQL   │    │
│                              │   (Private)    │    │
│                              └────────────────┘    │
│                                                      │
└─────────────────────────────────────────────────────┘
         Private DNS Zone: *.postgres.database.azure.com
```

### After (Target - Public Access)
```
┌─────────────────────────────────────────────────────┐
│              Azure Virtual Network                   │
│                                                      │
│  ┌────────────────┐                                 │
│  │  AKS Subnet    │                                 │
│  │  10.30.1.0/24  │                                 │
│  └───────┬────────┘                                 │
│          │                                           │
└──────────┼───────────────────────────────────────────┘
           │
           │ Firewall Rules
           │ - Azure Services: 0.0.0.0/0
           │ - AKS Outbound IPs
           │ - Office/VPN IPs
           │
           ▼
    ┌──────────────────┐
    │   PostgreSQL     │
    │   (Public)       │
    │   SSL Required   │
    └──────────────────┘
    Public Endpoint: flamoral-prod-postgres.postgres.database.azure.com
```

---

## Required Information

### 1. Get AKS Outbound IP Addresses

**Option A: Using Azure Portal**
1. Go to Azure Portal → Resource Groups → flamoral-prod-rg
2. Find the managed resource group for AKS (MC_flamoral-prod-rg_flamoral-prod-aks_westus2)
3. Filter resources by type: Public IP addresses
4. Note all IP addresses with tag `service=kubernetes`

**Option B: Using Azure CLI**
```bash
# Login to Azure
az login

# Set subscription
az account set --subscription "ebd1613e-fea0-4b6d-8918-7e4de6a71c44"

# Get AKS outbound IPs
az network public-ip list \
  --resource-group MC_flamoral-prod-rg_flamoral-prod-aks_westus2 \
  --query "[?tags.service=='kubernetes'].[name,ipAddress]" \
  --output table

# Alternative: Get from AKS load balancer
az aks show \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-aks \
  --query "networkProfile.loadBalancerProfile.effectiveOutboundIps[*].id" \
  --output tsv | xargs -I {} az network public-ip show --ids {} --query ipAddress -o tsv
```

### 2. Additional IPs to Whitelist (Optional)

- **Office Network**: Your office public IP
- **VPN Gateway**: If using VPN for admin access
- **CI/CD Runners**: GitHub Actions runners (if self-hosted)
- **Admin Workstations**: Developer machines for migrations/troubleshooting

---

## Terraform Configuration Changes

### Step 1: Update PostgreSQL Module Variables

**File:** `C:/Users/citad/OneDrive/Documents/Dating/Flamoral/infrastructure/terraform/modules/postgres/variables.tf`

Add these new variables:

```hcl
# PUBLIC ACCESS CONFIGURATION VARIABLES

variable "allowed_ips" {
  type        = list(string)
  default     = []
  description = "List of allowed IP addresses (AKS outbound IPs, CI/CD runners, etc.)"
}

variable "allowed_ip_ranges" {
  type = map(object({
    start_ip = string
    end_ip   = string
  }))
  default     = {}
  description = "Map of allowed IP ranges (office networks, VPN ranges, etc.)"
}

variable "max_connections" {
  type        = string
  default     = "200"
  description = "Maximum number of concurrent connections"
}

variable "enable_high_availability" {
  type        = bool
  default     = false
  description = "Enable zone-redundant high availability"
}
```

### Step 2: Update PostgreSQL Module Main Configuration

**File:** `C:/Users/citad/OneDrive/Documents/Dating/Flamoral/infrastructure/terraform/modules/postgres/main.tf`

Replace the entire content with:

```hcl
# PostgreSQL Flexible Server Module - PUBLIC ACCESS CONFIGURATION

resource "random_password" "postgres" {
  length  = 24
  special = true
}

resource "azurerm_postgresql_flexible_server" "main" {
  name                = "${var.prefix}-${var.env}-postgres"
  resource_group_name = var.resource_group_name
  location            = var.location
  version             = var.postgres_version

  # REMOVED: delegated_subnet_id for public access
  # delegated_subnet_id = var.subnet_id

  administrator_login          = "psqladmin"
  administrator_password       = random_password.postgres.result
  zone                         = "1"
  storage_mb                   = var.storage_mb
  sku_name                     = var.sku_name
  backup_retention_days        = var.backup_retention_days
  geo_redundant_backup_enabled = var.env == "prod" ? var.geo_redundant_backup : false

  # ENABLE PUBLIC NETWORK ACCESS
  public_network_access_enabled = true

  # HIGH AVAILABILITY (Optional - for production)
  dynamic "high_availability" {
    for_each = var.enable_high_availability ? [1] : []
    content {
      mode                      = "ZoneRedundant"
      standby_availability_zone = "2"
    }
  }

  tags = var.tags
}

resource "azurerm_postgresql_flexible_server_database" "dating" {
  name      = "datingapp"
  server_id = azurerm_postgresql_flexible_server.main.id
  collation = "en_US.utf8"
  charset   = "utf8"
}

# =============================================================================
# FIREWALL RULES
# =============================================================================

# Allow Azure Services
resource "azurerm_postgresql_flexible_server_firewall_rule" "allow_azure_services" {
  name             = "AllowAzureServices"
  server_id        = azurerm_postgresql_flexible_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# Allow AKS Outbound IPs
resource "azurerm_postgresql_flexible_server_firewall_rule" "aks_outbound" {
  for_each = toset(var.allowed_ips)

  name             = "AKS-${replace(each.key, ".", "-")}"
  server_id        = azurerm_postgresql_flexible_server.main.id
  start_ip_address = each.value
  end_ip_address   = each.value
}

# Allow specific IP ranges
resource "azurerm_postgresql_flexible_server_firewall_rule" "allowed_ranges" {
  for_each = var.allowed_ip_ranges

  name             = each.key
  server_id        = azurerm_postgresql_flexible_server.main.id
  start_ip_address = each.value.start_ip
  end_ip_address   = each.value.end_ip
}

# =============================================================================
# POSTGRESQL CONFIGURATION
# =============================================================================

resource "azurerm_postgresql_flexible_server_configuration" "max_connections" {
  name      = "max_connections"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = var.max_connections
}

resource "azurerm_postgresql_flexible_server_configuration" "shared_buffers" {
  name      = "shared_buffers"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = "524288" # 4GB for D4s_v3
}

resource "azurerm_postgresql_flexible_server_configuration" "work_mem" {
  name      = "work_mem"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = "16384" # 128MB
}

resource "azurerm_postgresql_flexible_server_configuration" "effective_cache_size" {
  name      = "effective_cache_size"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = "1310720" # 10GB for 16GB RAM
}

# SSL Enforcement
resource "azurerm_postgresql_flexible_server_configuration" "ssl_enforcement" {
  name      = "require_secure_transport"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = "on"
}

# Connection logging for security
resource "azurerm_postgresql_flexible_server_configuration" "log_connections" {
  name      = "log_connections"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = "on"
}

resource "azurerm_postgresql_flexible_server_configuration" "log_disconnections" {
  name      = "log_disconnections"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = "on"
}
```

### Step 3: Update Production Environment Configuration

**File:** `C:/Users/citad/OneDrive/Documents/Dating/Flamoral/infrastructure/terraform/environments/prod/main.tf`

**Changes Required:**

1. **Remove Private DNS Zone** (Lines 335-347):
```hcl
# DELETE OR COMMENT OUT:
# resource "azurerm_private_dns_zone" "postgres" {
#   name                = "${local.name_prefix}.postgres.database.azure.com"
#   resource_group_name = azurerm_resource_group.prod.name
#   tags = local.common_tags
# }

# resource "azurerm_private_dns_zone_virtual_network_link" "postgres" {
#   name                  = "postgres-vnet-link"
#   private_dns_zone_name = azurerm_private_dns_zone.postgres.name
#   resource_group_name   = azurerm_resource_group.prod.name
#   virtual_network_id    = azurerm_virtual_network.main.id
# }
```

2. **Update PostgreSQL Resource** (Lines 355-378):
```hcl
# REPLACE this section:
resource "azurerm_postgresql_flexible_server" "main" {
  name                   = "${local.name_prefix}-postgres"
  resource_group_name    = azurerm_resource_group.prod.name
  location               = azurerm_resource_group.prod.location
  version                = var.postgres_version

  # REMOVE: delegated_subnet_id and private_dns_zone_id
  # delegated_subnet_id    = azurerm_subnet.database.id
  # private_dns_zone_id    = azurerm_private_dns_zone.postgres.id

  # ADD: Enable public access
  public_network_access_enabled = true

  administrator_login    = "flamoraladmin"
  administrator_password = random_password.postgres.result
  zone                   = "1"

  storage_mb = var.postgres_storage_mb
  sku_name   = var.postgres_sku_name

  # High Availability for Production (Optional)
  # high_availability {
  #   mode                      = "ZoneRedundant"
  #   standby_availability_zone = "2"
  # }

  backup_retention_days        = var.postgres_backup_retention_days
  geo_redundant_backup_enabled = var.postgres_geo_redundant_backup

  tags = local.common_tags

  # REMOVE: depends_on private DNS
  # depends_on = [azurerm_private_dns_zone_virtual_network_link.postgres]
}

# ADD: Firewall Rules after PostgreSQL resource
resource "azurerm_postgresql_flexible_server_firewall_rule" "allow_azure_services" {
  name             = "AllowAzureServices"
  server_id        = azurerm_postgresql_flexible_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# Allow AKS outbound IPs
resource "azurerm_postgresql_flexible_server_firewall_rule" "aks_outbound" {
  for_each = toset(var.postgres_allowed_ips)

  name             = "AKS-${replace(each.key, ".", "-")}"
  server_id        = azurerm_postgresql_flexible_server.main.id
  start_ip_address = each.value
  end_ip_address   = each.value
}

# Configuration for production settings
resource "azurerm_postgresql_flexible_server_configuration" "max_connections" {
  name      = "max_connections"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = var.postgres_max_connections
}

resource "azurerm_postgresql_flexible_server_configuration" "ssl_enforcement" {
  name      = "require_secure_transport"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = "on"
}

resource "azurerm_postgresql_flexible_server_configuration" "log_connections" {
  name      = "log_connections"
  server_id = azurerm_postgresql_flexible_server.main.id
  value     = "on"
}
```

3. **Optional: Remove Database Subnet Delegation** (Lines 88-106):

The database subnet can remain but delegation is no longer needed:

```hcl
# Database Subnet - Remove delegation for public PostgreSQL
resource "azurerm_subnet" "database" {
  name                 = "database-subnet"
  resource_group_name  = azurerm_resource_group.prod.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [var.db_subnet_prefix]

  # REMOVE delegation block
  # delegation {
  #   name = "postgresql-delegation"
  #   service_delegation {
  #     name = "Microsoft.DBforPostgreSQL/flexibleServers"
  #     actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
  #   }
  # }

  service_endpoints = ["Microsoft.Storage"]
}
```

### Step 4: Update Production Variables

**File:** `C:/Users/citad/OneDrive/Documents/Dating/Flamoral/infrastructure/terraform/environments/prod/variables.tf`

Add these new variables:

```hcl
# =============================================================================
# PostgreSQL Public Access Configuration
# =============================================================================
variable "postgres_allowed_ips" {
  description = "List of allowed IP addresses for PostgreSQL access"
  type        = list(string)
  default     = []
}

variable "postgres_allowed_ip_ranges" {
  description = "Map of allowed IP ranges for PostgreSQL access"
  type = map(object({
    start_ip = string
    end_ip   = string
  }))
  default = {}
}

variable "postgres_max_connections" {
  description = "Maximum PostgreSQL connections"
  type        = string
  default     = "200"
}
```

### Step 5: Update Production tfvars

**File:** `C:/Users/citad/OneDrive/Documents/Dating/Flamoral/infrastructure/terraform/environments/prod/terraform.tfvars`

Add configuration after PostgreSQL section:

```hcl
# PostgreSQL Public Access Configuration
postgres_max_connections = "300"

# IMPORTANT: Replace with actual AKS outbound IPs
# Run: az network public-ip list --resource-group MC_flamoral-prod-rg_flamoral-prod-aks_westus2 --query "[?tags.service=='kubernetes'].ipAddress" -o tsv
postgres_allowed_ips = [
  # "1.2.3.4",      # AKS Outbound IP 1
  # "5.6.7.8",      # AKS Outbound IP 2
  # "9.10.11.12",   # CI/CD Runner IP
]

# Optional: IP ranges for office networks, VPN, etc.
postgres_allowed_ip_ranges = {
  # office = {
  #   start_ip = "203.0.113.0"
  #   end_ip   = "203.0.113.255"
  # }
}
```

---

## Migration Steps

### Prerequisites

1. **Backup Current Database**
```bash
# SSH to AKS or use Cloud Shell
kubectl exec -it <postgres-pod> -n dating-app -- pg_dump -U flamoraladmin -d flamoral > flamoral_backup_$(date +%Y%m%d).sql
```

2. **Get AKS Outbound IPs**
```bash
az login
az account set --subscription "ebd1613e-fea0-4b6d-8918-7e4de6a71c44"

# Method 1: From managed resource group
az network public-ip list \
  --resource-group MC_flamoral-prod-rg_flamoral-prod-aks_westus2 \
  --query "[?tags.service=='kubernetes'].ipAddress" \
  --output tsv

# Method 2: From AKS load balancer
az aks show \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-aks \
  --query "networkProfile.loadBalancerProfile.effectiveOutboundIps[*].id" \
  --output tsv | \
  xargs -I {} az network public-ip show --ids {} --query ipAddress -o tsv
```

### Execution Plan

**IMPORTANT:** This is a destructive change. PostgreSQL will be recreated.

#### Phase 1: Preparation (Day 1)

1. **Schedule Maintenance Window**
   - Estimated downtime: 30-60 minutes
   - Notify users in advance
   - Plan for off-peak hours

2. **Backup Everything**
```bash
cd C:/Users/citad/OneDrive/Documents/Dating/Flamoral/infrastructure/terraform/environments/prod

# Database backup
kubectl exec -it <postgres-pod> -n dating-app -- \
  pg_dumpall -U flamoraladmin > full_backup_$(date +%Y%m%d_%H%M%S).sql

# Terraform state backup
terraform state pull > terraform_state_backup_$(date +%Y%m%d_%H%M%S).json

# Configuration backup
cp -r . ../prod-backup-$(date +%Y%m%d)
```

3. **Update Terraform Files**
   - Follow all changes in Step 1-5 above
   - Update terraform.tfvars with actual AKS outbound IPs
   - Review all changes carefully

#### Phase 2: Terraform Plan (Day 2)

1. **Initialize Terraform** (if needed)
```bash
cd C:/Users/citad/OneDrive/Documents/Dating/Flamoral/infrastructure/terraform/environments/prod
terraform init
```

2. **Run Terraform Plan**
```bash
terraform plan -out=postgres-public-migration.tfplan

# Review the plan carefully:
# Expected changes:
# - azurerm_private_dns_zone.postgres: DESTROY
# - azurerm_private_dns_zone_virtual_network_link.postgres: DESTROY
# - azurerm_postgresql_flexible_server.main: DESTROY and CREATE (forced replacement)
# - azurerm_postgresql_flexible_server_firewall_rule.* : CREATE
# - azurerm_postgresql_flexible_server_configuration.* : CREATE
# - azurerm_subnet.database: UPDATE (remove delegation)
```

3. **Review Plan Output**
```bash
# Save plan output for review
terraform show postgres-public-migration.tfplan > plan-review.txt

# Look for:
# - PostgreSQL will be RECREATED (expected)
# - Private DNS zones will be REMOVED (expected)
# - Firewall rules will be ADDED (expected)
# - No other unexpected changes
```

#### Phase 3: Apply Changes (Maintenance Window)

1. **Enable Maintenance Mode**
```bash
# Scale down application pods
kubectl scale deployment --all --replicas=0 -n dating-app

# Verify no active connections
kubectl get pods -n dating-app
```

2. **Apply Terraform Changes**
```bash
cd C:/Users/citad/OneDrive/Documents/Dating/Flamoral/infrastructure/terraform/environments/prod

# Apply the plan
terraform apply postgres-public-migration.tfplan

# Monitor output for errors
# Expected duration: 15-30 minutes
```

3. **Verify PostgreSQL Creation**
```bash
# Get new PostgreSQL FQDN
terraform output postgres_fqdn

# Test connectivity from local machine (if your IP is whitelisted)
psql "postgresql://flamoraladmin@flamoral-prod-postgres.postgres.database.azure.com:5432/flamoral?sslmode=require"
```

4. **Restore Database**
```bash
# Connect to new PostgreSQL
psql "postgresql://flamoraladmin:<password>@flamoral-prod-postgres.postgres.database.azure.com:5432/postgres?sslmode=require" < full_backup_YYYYMMDD_HHMMSS.sql

# Verify restoration
psql "postgresql://flamoraladmin:<password>@flamoral-prod-postgres.postgres.database.azure.com:5432/flamoral?sslmode=require" -c "\dt"
```

5. **Update Application Configuration**
```bash
# Update connection strings in Kubernetes secrets
kubectl create secret generic postgres-credentials \
  --from-literal=host=flamoral-prod-postgres.postgres.database.azure.com \
  --from-literal=port=5432 \
  --from-literal=database=flamoral \
  --from-literal=username=flamoraladmin \
  --from-literal=password=<new-password> \
  --from-literal=sslmode=require \
  --namespace dating-app \
  --dry-run=client -o yaml | kubectl apply -f -

# Or update existing secret
kubectl edit secret postgres-credentials -n dating-app
```

6. **Scale Up Applications**
```bash
# Restore application pods
kubectl scale deployment api-gateway --replicas=3 -n dating-app
kubectl scale deployment user-service --replicas=3 -n dating-app
# ... scale other services

# Monitor pod startup
kubectl get pods -n dating-app -w
```

7. **Verify Connectivity**
```bash
# Check pod logs for database connections
kubectl logs -l app=api-gateway -n dating-app --tail=50

# Test API endpoints
curl https://api.flamoral.com/health
curl https://api.flamoral.com/api/v1/health/db
```

#### Phase 4: Post-Migration Verification

1. **Database Health Check**
```bash
# Check active connections
psql "postgresql://flamoraladmin:<password>@flamoral-prod-postgres.postgres.database.azure.com:5432/flamoral?sslmode=require" -c "SELECT count(*) FROM pg_stat_activity;"

# Check database size
psql "postgresql://flamoraladmin:<password>@flamoral-prod-postgres.postgres.database.azure.com:5432/flamoral?sslmode=require" -c "SELECT pg_size_pretty(pg_database_size('flamoral'));"

# Verify tables
psql "postgresql://flamoraladmin:<password>@flamoral-prod-postgres.postgres.database.azure.com:5432/flamoral?sslmode=require" -c "\dt"
```

2. **Firewall Rules Verification**
```bash
# Verify firewall rules in Azure Portal
az postgres flexible-server firewall-rule list \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-postgres \
  --output table

# Test connection from AKS
kubectl run -it --rm debug --image=postgres:15 --restart=Never -n dating-app -- \
  psql "postgresql://flamoraladmin:<password>@flamoral-prod-postgres.postgres.database.azure.com:5432/flamoral?sslmode=require" -c "SELECT version();"
```

3. **Performance Testing**
```bash
# Run database performance tests
# Monitor query performance
# Check connection pool utilization
```

4. **Monitoring**
```bash
# Check Azure Monitor metrics
# Review Application Insights
# Verify logs in Log Analytics
```

---

## Rollback Plan

If issues occur during migration:

### Immediate Rollback

1. **Revert Terraform Changes**
```bash
# Restore from backup
cp -r ../prod-backup-YYYYMMDD/* .

# Destroy new public PostgreSQL
terraform destroy -target=azurerm_postgresql_flexible_server.main

# Re-apply old configuration
terraform plan -out=rollback.tfplan
terraform apply rollback.tfplan
```

2. **Restore Database**
```bash
# Restore from backup to old private PostgreSQL
psql "postgresql://flamoraladmin@flamoral-prod-postgres.postgres.database.azure.com:5432/postgres?sslmode=require" < full_backup_YYYYMMDD_HHMMSS.sql
```

3. **Update Application**
```bash
# Restore old connection strings
kubectl apply -f k8s-secrets-backup.yaml
kubectl rollout restart deployment -n dating-app
```

---

## Security Considerations

### 1. SSL/TLS Enforcement
- All connections MUST use SSL (configured via `require_secure_transport = on`)
- Connection string must include `sslmode=require`

### 2. Firewall Rules
- Principle of least privilege
- Only whitelist known IPs
- Regularly audit allowed IPs
- Remove unused IP ranges

### 3. Authentication
- Use strong passwords (32+ characters)
- Store credentials in Azure Key Vault
- Rotate passwords regularly (90 days)
- Use Azure AD authentication where possible

### 4. Monitoring
- Enable connection logging
- Monitor failed connection attempts
- Alert on unusual connection patterns
- Review firewall logs weekly

### 5. Network Security
- Keep AKS outbound IPs updated
- Use NSG rules for additional protection
- Consider Azure Private Link for sensitive data
- Enable Azure DDoS Protection

---

## Connection String Examples

### Standard Connection (with SSL)
```
postgresql://flamoraladmin:<password>@flamoral-prod-postgres.postgres.database.azure.com:5432/flamoral?sslmode=require
```

### High Availability Connection
```
postgresql://flamoraladmin:<password>@flamoral-prod-postgres.postgres.database.azure.com:5432/flamoral?sslmode=require&target_session_attrs=read-write
```

### Connection Pool (PgBouncer)
```
postgresql://flamoraladmin:<password>@flamoral-prod-postgres.postgres.database.azure.com:5432/flamoral?sslmode=require&pool_size=20&max_overflow=10
```

### Node.js (pg library)
```javascript
const { Pool } = require('pg');

const pool = new Pool({
  host: 'flamoral-prod-postgres.postgres.database.azure.com',
  port: 5432,
  database: 'flamoral',
  user: 'flamoraladmin',
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false,
    require: true
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

---

## Cost Considerations

### Public vs Private Access Costs

**Private (Current):**
- Private DNS Zone: ~$0.50/month
- VNET Integration: Included
- Private Endpoint: ~$7.30/month (if used)

**Public (Target):**
- No private DNS costs
- No private endpoint costs
- Firewall rules: Free
- **Savings: ~$8/month**

### PostgreSQL Costs (Unchanged)
- GP_Standard_D4s_v3: ~$350/month
- Storage (256 GB): ~$26/month
- Backup Storage: ~$10/month (7 days retention)

---

## Terraform Commands Reference

```bash
# Navigate to production environment
cd C:/Users/citad/OneDrive/Documents/Dating/Flamoral/infrastructure/terraform/environments/prod

# Initialize Terraform
terraform init

# Validate configuration
terraform validate

# Format files
terraform fmt -recursive

# Plan changes
terraform plan -out=migration.tfplan

# Show plan details
terraform show migration.tfplan

# Apply changes
terraform apply migration.tfplan

# Destroy specific resource (rollback)
terraform destroy -target=azurerm_postgresql_flexible_server.main

# Get outputs
terraform output
terraform output postgres_fqdn
terraform output -json

# State management
terraform state list
terraform state show azurerm_postgresql_flexible_server.main
terraform state pull > state_backup.json

# Import existing resource (if needed)
terraform import azurerm_postgresql_flexible_server.main /subscriptions/ebd1613e-fea0-4b6d-8918-7e4de6a71c44/resourceGroups/flamoral-prod-rg/providers/Microsoft.DBforPostgreSQL/flexibleServers/flamoral-prod-postgres
```

---

## Monitoring & Alerts

### Azure Monitor Queries

**Failed Connections**
```kusto
AzureDiagnostics
| where ResourceType == "SERVERS"
| where Category == "PostgreSQLLogs"
| where Message contains "connection" and Message contains "failed"
| summarize count() by bin(TimeGenerated, 5m), ClientIP
```

**Connection Count**
```kusto
AzureMetrics
| where ResourceId contains "POSTGRESQLSERVERS"
| where MetricName == "active_connections"
| summarize avg(Average) by bin(TimeGenerated, 5m)
```

**Blocked IPs**
```kusto
AzureDiagnostics
| where ResourceType == "SERVERS"
| where Category == "PostgreSQLLogs"
| where Message contains "no pg_hba.conf entry"
| summarize count() by ClientIP, bin(TimeGenerated, 1h)
```

---

## FAQ

### Q: Will there be downtime?
**A:** Yes, approximately 30-60 minutes. PostgreSQL must be recreated, which requires:
- Destroying the old private server
- Creating the new public server
- Restoring the database backup

### Q: Can we migrate without downtime?
**A:** Possible but complex:
1. Create new public PostgreSQL alongside existing
2. Set up continuous replication
3. Switch applications during maintenance window
4. This requires additional infrastructure and testing

### Q: What about data loss?
**A:** No data loss if:
- Proper backups are taken before migration
- Database is fully restored after migration
- Verification steps are followed

### Q: How do we get AKS outbound IPs?
**A:** Use Azure CLI:
```bash
az network public-ip list --resource-group MC_flamoral-prod-rg_flamoral-prod-aks_westus2 --query "[?tags.service=='kubernetes'].ipAddress" -o tsv
```

### Q: Can we add IPs later?
**A:** Yes! Update `terraform.tfvars` and run:
```bash
terraform plan
terraform apply
```

### Q: Is public access secure?
**A:** Yes, when configured properly:
- SSL/TLS encryption required
- IP whitelisting enforced
- Strong authentication
- Connection logging enabled
- Regular security audits

### Q: What if AKS IPs change?
**A:** Azure AKS outbound IPs are stable but can change during:
- AKS cluster upgrades
- Region failover
- Load balancer recreation

Monitor and update firewall rules accordingly.

### Q: Can we use Azure AD authentication?
**A:** Yes! Enable via:
```bash
az postgres flexible-server ad-admin create \
  --resource-group flamoral-prod-rg \
  --server-name flamoral-prod-postgres \
  --display-name "Flamoral Admin Group" \
  --object-id <AAD-GROUP-OBJECT-ID>
```

---

## Post-Migration Checklist

- [ ] Database backup completed
- [ ] Terraform state backup completed
- [ ] AKS outbound IPs identified
- [ ] Terraform files updated
- [ ] Terraform plan reviewed
- [ ] Maintenance window scheduled
- [ ] Users notified
- [ ] Applications scaled down
- [ ] Terraform apply completed successfully
- [ ] New PostgreSQL created
- [ ] Database restored
- [ ] Connection strings updated
- [ ] Applications scaled up
- [ ] Health checks passing
- [ ] Firewall rules verified
- [ ] SSL enforcement verified
- [ ] Monitoring configured
- [ ] Performance tested
- [ ] Documentation updated
- [ ] Team trained on new setup

---

## Support & References

### Documentation
- **Azure PostgreSQL Flexible Server**: https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/
- **Firewall Rules**: https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-firewall-rules
- **Terraform azurerm_postgresql_flexible_server**: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/postgresql_flexible_server

### Contact
- **DevOps Team**: devops@flamoral.com
- **Database Team**: dba@flamoral.com
- **On-Call**: PagerDuty escalation

---

**Document Version:** 1.0
**Last Updated:** December 14, 2024
**Author:** Terraform Infrastructure Agent
**Environment:** Production (flamoral-prod-rg)
