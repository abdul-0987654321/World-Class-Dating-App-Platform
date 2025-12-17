# Terraform PostgreSQL Public Access - Quick Command Reference

## Executive Summary

**Objective:** Migrate PostgreSQL from private VNET integration to public access with firewall rules

**Location:** `C:/Users/citad/OneDrive/Documents/Dating/Flamoral/infrastructure/terraform/environments/prod`

**Estimated Time:** 30-60 minutes (in maintenance window)

**Risk Level:** HIGH (PostgreSQL will be recreated - requires full database backup and restore)

---

## Prerequisites - MUST DO FIRST

### 1. Get AKS Outbound IP Addresses

```bash
# Login to Azure
az login

# Set subscription
az account set --subscription "ebd1613e-fea0-4b6d-8918-7e4de6a71c44"

# Get AKS outbound IPs (METHOD 1 - Recommended)
az network public-ip list \
  --resource-group MC_flamoral-prod-rg_flamoral-prod-aks_westus2 \
  --query "[?tags.service=='kubernetes'].ipAddress" \
  --output tsv

# Get AKS outbound IPs (METHOD 2 - Alternative)
az aks show \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-aks \
  --query "networkProfile.loadBalancerProfile.effectiveOutboundIps[*].id" \
  --output tsv | xargs -I {} az network public-ip show --ids {} --query ipAddress -o tsv
```

**COPY THESE IP ADDRESSES** - You'll need them for terraform.tfvars

---

## File Changes Required

### File 1: Module Variables
**Path:** `infrastructure/terraform/modules/postgres/variables.tf`

**Action:** ADD to end of file:

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

### File 2: Module Main Configuration
**Path:** `infrastructure/terraform/modules/postgres/main.tf`

**Action:** Use the file created at `infrastructure/terraform/modules/postgres/main.tf.public`

Or manually make these changes:
1. Remove `delegated_subnet_id` parameter
2. Remove `subnet_id` variable requirement
3. Add `public_network_access_enabled = true`
4. Add firewall rules (see migration guide)
5. Add PostgreSQL configurations (see migration guide)

### File 3: Production Main
**Path:** `infrastructure/terraform/environments/prod/main.tf`

**Changes:**

1. **DELETE/COMMENT Lines 335-347** (Private DNS Zone):
```hcl
# DELETE THESE:
# resource "azurerm_private_dns_zone" "postgres" { ... }
# resource "azurerm_private_dns_zone_virtual_network_link" "postgres" { ... }
```

2. **UPDATE Lines 355-378** (PostgreSQL Server):
```hcl
# REMOVE these parameters:
#   delegated_subnet_id    = azurerm_subnet.database.id
#   private_dns_zone_id    = azurerm_private_dns_zone.postgres.id
#   public_network_access_enabled = false

# ADD this parameter:
  public_network_access_enabled = true

# REMOVE this dependency:
#   depends_on = [azurerm_private_dns_zone_virtual_network_link.postgres]
```

3. **ADD after PostgreSQL resource** (around line 393):
```hcl
# Firewall Rules
resource "azurerm_postgresql_flexible_server_firewall_rule" "allow_azure_services" {
  name             = "AllowAzureServices"
  server_id        = azurerm_postgresql_flexible_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

resource "azurerm_postgresql_flexible_server_firewall_rule" "aks_outbound" {
  for_each = toset(var.postgres_allowed_ips)

  name             = "AKS-${replace(each.key, ".", "-")}"
  server_id        = azurerm_postgresql_flexible_server.main.id
  start_ip_address = each.value
  end_ip_address   = each.value
}

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

### File 4: Production Variables
**Path:** `infrastructure/terraform/environments/prod/variables.tf`

**Action:** ADD to end of file:

```hcl
# PostgreSQL Public Access Configuration
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

### File 5: Production Values
**Path:** `infrastructure/terraform/environments/prod/terraform.tfvars`

**Action:** ADD after PostgreSQL section (around line 56):

```hcl
# PostgreSQL Public Access Configuration
postgres_max_connections = "300"

# CRITICAL: Replace with actual AKS outbound IPs from prerequisite step
postgres_allowed_ips = [
  "1.2.3.4",      # Replace with actual AKS Outbound IP 1
  "5.6.7.8",      # Replace with actual AKS Outbound IP 2
  # Add more IPs as needed
]

# Optional: IP ranges for office, VPN, etc.
postgres_allowed_ip_ranges = {
  # office = {
  #   start_ip = "203.0.113.0"
  #   end_ip   = "203.0.113.255"
  # }
}
```

---

## Backup Commands - CRITICAL

```bash
# Navigate to project
cd C:/Users/citad/OneDrive/Documents/Dating/Flamoral

# Create backup directory
mkdir -p backups/$(date +%Y%m%d)

# Backup database (FROM KUBERNETES POD)
kubectl exec -it $(kubectl get pod -l app=postgres -n dating-app -o jsonpath='{.items[0].metadata.name}') -n dating-app -- \
  pg_dumpall -U flamoraladmin > backups/$(date +%Y%m%d)/database_backup.sql

# OR if PostgreSQL is accessible externally
pg_dumpall -h flamoral-prod-postgres.postgres.database.azure.com -U flamoraladmin > backups/$(date +%Y%m%d)/database_backup.sql

# Backup Terraform state
cd infrastructure/terraform/environments/prod
terraform state pull > ../../../../backups/$(date +%Y%m%d)/terraform_state.json

# Backup configuration
cp -r . ../../../../backups/$(date +%Y%m%d)/terraform-config/
```

---

## Terraform Migration Commands

```bash
# Navigate to production environment
cd C:/Users/citad/OneDrive/Documents/Dating/Flamoral/infrastructure/terraform/environments/prod

# 1. Initialize (if needed)
terraform init

# 2. Validate configuration
terraform validate

# 3. Format files
terraform fmt -recursive

# 4. Plan migration
terraform plan -out=postgres-public-migration.tfplan

# 5. Review plan (IMPORTANT - read carefully!)
terraform show postgres-public-migration.tfplan

# Save plan for review
terraform show postgres-public-migration.tfplan > plan-review.txt

# 6. Apply changes (IN MAINTENANCE WINDOW ONLY)
terraform apply postgres-public-migration.tfplan

# 7. Verify outputs
terraform output postgres_fqdn
terraform output -json
```

---

## Expected Terraform Plan Output

You should see these changes:

```
Plan: X to add, Y to change, Z to destroy.

Changes to be performed:

  # azurerm_private_dns_zone.postgres will be destroyed
  - resource "azurerm_private_dns_zone" "postgres" {
      - name = "flamoral-prod.postgres.database.azure.com" -> null
    }

  # azurerm_private_dns_zone_virtual_network_link.postgres will be destroyed
  - resource "azurerm_private_dns_zone_virtual_network_link" "postgres" {
      - name = "postgres-vnet-link" -> null
    }

  # azurerm_postgresql_flexible_server.main must be replaced
-/+ resource "azurerm_postgresql_flexible_server" "main" {
      ~ public_network_access_enabled = false -> true
      - delegated_subnet_id            = "..." -> null
      - private_dns_zone_id            = "..." -> null
    }

  # azurerm_postgresql_flexible_server_firewall_rule.allow_azure_services will be created
  + resource "azurerm_postgresql_flexible_server_firewall_rule" "allow_azure_services" {
      + name             = "AllowAzureServices"
      + start_ip_address = "0.0.0.0"
      + end_ip_address   = "0.0.0.0"
    }

  # azurerm_postgresql_flexible_server_firewall_rule.aks_outbound["1.2.3.4"] will be created
  + resource "azurerm_postgresql_flexible_server_firewall_rule" "aks_outbound" {
      + name             = "AKS-1-2-3-4"
      + start_ip_address = "1.2.3.4"
      + end_ip_address   = "1.2.3.4"
    }

  # PostgreSQL configurations will be created
  + resource "azurerm_postgresql_flexible_server_configuration" ...
```

**WARNING SIGNS:**
- If you see resources being destroyed that aren't PostgreSQL-related, STOP and review
- If you see AKS cluster changes, STOP and review
- If you see more than 10-15 resource changes, STOP and review

---

## Database Restore Commands

After Terraform creates the new PostgreSQL:

```bash
# Get new password from Terraform output
NEW_PASSWORD=$(terraform output -raw postgres_password)

# Get new FQDN
NEW_FQDN=$(terraform output -raw postgres_fqdn)

# Test connection
psql "postgresql://flamoraladmin:$NEW_PASSWORD@$NEW_FQDN:5432/postgres?sslmode=require" -c "SELECT version();"

# Restore database
psql "postgresql://flamoraladmin:$NEW_PASSWORD@$NEW_FQDN:5432/postgres?sslmode=require" < backups/YYYYMMDD/database_backup.sql

# Verify restoration
psql "postgresql://flamoraladmin:$NEW_PASSWORD@$NEW_FQDN:5432/flamoral?sslmode=require" -c "\dt"
psql "postgresql://flamoraladmin:$NEW_PASSWORD@$NEW_FQDN:5432/flamoral?sslmode=require" -c "SELECT count(*) FROM users;"
```

---

## Application Update Commands

Update Kubernetes secrets with new connection info:

```bash
# Get new credentials
NEW_PASSWORD=$(cd infrastructure/terraform/environments/prod && terraform output -raw postgres_password)
NEW_HOST=$(cd infrastructure/terraform/environments/prod && terraform output -raw postgres_fqdn)

# Update secret
kubectl create secret generic postgres-credentials \
  --from-literal=host=$NEW_HOST \
  --from-literal=port=5432 \
  --from-literal=database=flamoral \
  --from-literal=username=flamoraladmin \
  --from-literal=password=$NEW_PASSWORD \
  --from-literal=sslmode=require \
  --namespace dating-app \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart deployments to pick up new secret
kubectl rollout restart deployment -n dating-app

# Monitor rollout
kubectl get pods -n dating-app -w
```

---

## Verification Commands

```bash
# 1. Check PostgreSQL firewall rules
az postgres flexible-server firewall-rule list \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-postgres \
  --output table

# 2. Test connection from AKS
kubectl run -it --rm psql-test --image=postgres:15 --restart=Never -n dating-app -- \
  psql "postgresql://flamoraladmin:PASSWORD@flamoral-prod-postgres.postgres.database.azure.com:5432/flamoral?sslmode=require" -c "SELECT version();"

# 3. Check application logs
kubectl logs -l app=api-gateway -n dating-app --tail=50 | grep -i database
kubectl logs -l app=user-service -n dating-app --tail=50 | grep -i postgres

# 4. Test API health endpoint
curl https://api.flamoral.com/health
curl https://api.flamoral.com/api/v1/health/db

# 5. Check database metrics
az monitor metrics list \
  --resource /subscriptions/ebd1613e-fea0-4b6d-8918-7e4de6a71c44/resourceGroups/flamoral-prod-rg/providers/Microsoft.DBforPostgreSQL/flexibleServers/flamoral-prod-postgres \
  --metric active_connections \
  --output table

# 6. Verify SSL enforcement
psql "postgresql://flamoraladmin:PASSWORD@flamoral-prod-postgres.postgres.database.azure.com:5432/flamoral" -c "SHOW require_secure_transport;"
```

---

## Rollback Commands (If Things Go Wrong)

```bash
cd C:/Users/citad/OneDrive/Documents/Dating/Flamoral/infrastructure/terraform/environments/prod

# Option 1: Restore from backup directory
cp -r ../../../../backups/YYYYMMDD/terraform-config/* .
terraform init
terraform plan
terraform apply

# Option 2: Destroy and recreate
terraform destroy -target=azurerm_postgresql_flexible_server.main
terraform destroy -target=azurerm_postgresql_flexible_server_firewall_rule.allow_azure_services
terraform destroy -target=azurerm_postgresql_flexible_server_firewall_rule.aks_outbound

# Restore old configuration
git checkout main.tf terraform.tfvars variables.tf
terraform plan
terraform apply

# Option 3: Restore Terraform state
terraform state push ../../../../backups/YYYYMMDD/terraform_state.json
```

---

## Maintenance Window Checklist

**30 minutes before:**
- [ ] Notify users of upcoming maintenance
- [ ] Verify backups are complete
- [ ] Review Terraform plan one final time
- [ ] Confirm team is standing by

**Start of window:**
- [ ] Scale down applications: `kubectl scale deployment --all --replicas=0 -n dating-app`
- [ ] Verify no active connections to database
- [ ] Take final database snapshot

**During migration:**
- [ ] Run `terraform apply postgres-public-migration.tfplan`
- [ ] Monitor Terraform output for errors
- [ ] Wait for PostgreSQL creation (15-20 minutes)
- [ ] Verify new PostgreSQL is accessible

**Database restoration:**
- [ ] Test connection to new PostgreSQL
- [ ] Restore database from backup
- [ ] Verify data integrity
- [ ] Check table counts match backup

**Application update:**
- [ ] Update Kubernetes secrets
- [ ] Scale up critical services first (api-gateway, user-service)
- [ ] Verify services start successfully
- [ ] Scale up remaining services
- [ ] Monitor logs for errors

**Verification:**
- [ ] Test API health endpoints
- [ ] Verify firewall rules
- [ ] Check database metrics
- [ ] Monitor application performance
- [ ] Confirm user functionality

**Completion:**
- [ ] Document any issues encountered
- [ ] Update runbooks if needed
- [ ] Notify users maintenance is complete
- [ ] Monitor for 1 hour post-migration

---

## Common Issues & Solutions

### Issue 1: "No pg_hba.conf entry for host"
**Solution:** IP not whitelisted. Add to `postgres_allowed_ips` in terraform.tfvars and re-apply.

### Issue 2: Connection refused
**Solution:** Check firewall rules, verify `public_network_access_enabled = true`

### Issue 3: SSL/TLS errors
**Solution:** Ensure connection string includes `sslmode=require`

### Issue 4: Too many connections
**Solution:** Increase `postgres_max_connections` in terraform.tfvars

### Issue 5: Slow database performance
**Solution:** Check connection pool settings, verify PostgreSQL configuration parameters

---

## Post-Migration Tasks

**Immediate (Day 1):**
- [ ] Monitor database performance
- [ ] Review connection logs
- [ ] Check error rates in Application Insights
- [ ] Verify backups are running

**Week 1:**
- [ ] Review firewall logs for blocked connections
- [ ] Optimize connection pool settings
- [ ] Performance test under load
- [ ] Update documentation

**Month 1:**
- [ ] Review Azure costs (should see ~$8/month savings)
- [ ] Audit IP whitelist
- [ ] Rotate database credentials
- [ ] Conduct DR test

---

## Contact Information

**For Issues During Migration:**
- DevOps Team: devops@flamoral.com
- Database Team: dba@flamoral.com
- On-Call: PagerDuty escalation

**Azure Support:**
- Subscription ID: ebd1613e-fea0-4b6d-8918-7e4de6a71c44
- Resource Group: flamoral-prod-rg
- Region: westus2

---

## Quick Reference URLs

- **Azure Portal**: https://portal.azure.com
- **PostgreSQL Dashboard**: https://portal.azure.com/#resource/subscriptions/ebd1613e-fea0-4b6d-8918-7e4de6a71c44/resourceGroups/flamoral-prod-rg/providers/Microsoft.DBforPostgreSQL/flexibleServers/flamoral-prod-postgres
- **AKS Dashboard**: https://portal.azure.com/#resource/subscriptions/ebd1613e-fea0-4b6d-8918-7e4de6a71c44/resourceGroups/flamoral-prod-rg/providers/Microsoft.ContainerService/managedClusters/flamoral-prod-aks
- **Grafana**: https://grafana.flamoral.com
- **Kibana**: https://kibana.flamoral.com

---

**Document Version:** 1.0
**Created:** December 14, 2024
**Environment:** Production
**Risk Level:** HIGH
**Estimated Time:** 30-60 minutes
