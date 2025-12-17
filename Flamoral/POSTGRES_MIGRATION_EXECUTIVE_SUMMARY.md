# PostgreSQL Public Access Migration - Executive Summary
## Flamoral Production Platform

**Date:** December 14, 2024
**Environment:** Production (flamoral-prod-rg, westus2)
**Risk Level:** HIGH (Database recreation required)
**Estimated Downtime:** 30-60 minutes

---

## Objective

Migrate PostgreSQL Flexible Server from **private VNET integration** to **public access with firewall rules** in Azure.

---

## Current vs Target Architecture

### Current (Private Access)
```
AKS Cluster ──► VNET ──► Private Subnet ──► PostgreSQL (Private)
                           ↓
                    Private DNS Zone
```
- ✓ Fully isolated in VNET
- ✗ Complex networking setup
- ✗ Harder to access for admin/troubleshooting
- ✗ Additional costs ($8/month for private DNS + endpoints)

### Target (Public Access with Firewall)
```
AKS Cluster ──► Internet ──► Firewall Rules ──► PostgreSQL (Public)
                                                      ↓
                                                 SSL/TLS Required
```
- ✓ Simplified networking
- ✓ Easier admin access
- ✓ Cost savings (~$8/month)
- ✓ IP-based access control
- ✓ SSL/TLS encryption enforced

---

## What Changes

### Infrastructure Changes
1. **PostgreSQL Server** - Recreated with public access enabled
2. **Private DNS Zone** - Removed (no longer needed)
3. **VNET Delegation** - Removed from database subnet
4. **Firewall Rules** - Added to control access
5. **SSL Configuration** - Enforced for all connections

### Terraform Resources Affected
- `azurerm_postgresql_flexible_server.main` - **RECREATED**
- `azurerm_private_dns_zone.postgres` - **DELETED**
- `azurerm_private_dns_zone_virtual_network_link.postgres` - **DELETED**
- `azurerm_postgresql_flexible_server_firewall_rule.*` - **CREATED**
- `azurerm_postgresql_flexible_server_configuration.*` - **CREATED**

### Application Changes
- Connection strings updated (new hostname)
- Kubernetes secrets updated
- No code changes required

---

## Security Measures

### Access Control
✓ **IP Whitelisting** - Only allowed IPs can connect
  - AKS outbound IPs
  - Office/VPN networks
  - CI/CD runners
  - Admin workstations

✓ **Azure Services** - Allow Azure internal services (0.0.0.0 special rule)

✓ **SSL/TLS Required** - All connections must use encryption

✓ **Connection Logging** - Track all connection attempts

✓ **Strong Authentication** - 32+ character passwords

### Monitoring
✓ Failed connection alerts
✓ Unusual traffic pattern detection
✓ Firewall rule audit logs
✓ Performance metrics

---

## Files to Change

### 1. Module Variables
**File:** `infrastructure/terraform/modules/postgres/variables.tf`
**Action:** Add public access variables (allowed_ips, allowed_ip_ranges, max_connections)

### 2. Module Main
**File:** `infrastructure/terraform/modules/postgres/main.tf`
**Action:** Remove VNET integration, add public access + firewall rules

### 3. Production Main
**File:** `infrastructure/terraform/environments/prod/main.tf`
**Action:** Remove private DNS zones, update PostgreSQL resource, add firewall rules

### 4. Production Variables
**File:** `infrastructure/terraform/environments/prod/variables.tf`
**Action:** Add postgres_allowed_ips, postgres_allowed_ip_ranges, postgres_max_connections

### 5. Production Values
**File:** `infrastructure/terraform/environments/prod/terraform.tfvars`
**Action:** Set AKS outbound IPs and connection limits

**Full details in:** `TERRAFORM_COMMANDS_SUMMARY.md`

---

## Prerequisites (MUST DO FIRST)

### 1. Get AKS Outbound IP Addresses
```bash
az login
az account set --subscription "ebd1613e-fea0-4b6d-8918-7e4de6a71c44"

az network public-ip list \
  --resource-group MC_flamoral-prod-rg_flamoral-prod-aks_westus2 \
  --query "[?tags.service=='kubernetes'].ipAddress" \
  --output tsv
```

### 2. Backup Everything
```bash
# Database backup
kubectl exec -it <postgres-pod> -n dating-app -- \
  pg_dumpall -U flamoraladmin > database_backup_$(date +%Y%m%d).sql

# Terraform state backup
cd infrastructure/terraform/environments/prod
terraform state pull > terraform_state_backup_$(date +%Y%m%d).json

# Configuration backup
cp -r . ../../../../backups/prod-$(date +%Y%m%d)/
```

### 3. Schedule Maintenance Window
- **Duration:** 60-90 minutes
- **Timing:** Off-peak hours (e.g., 2-4 AM UTC)
- **Notification:** Users notified 24 hours in advance

---

## Migration Steps (High Level)

### Phase 1: Preparation (Before Maintenance)
1. ✓ Get AKS outbound IPs
2. ✓ Update Terraform files
3. ✓ Create backups (database + state)
4. ✓ Run `terraform plan` and review
5. ✓ Schedule maintenance window
6. ✓ Notify stakeholders

### Phase 2: Migration (During Maintenance)
1. Scale down applications
2. Take final database snapshot
3. Run `terraform apply`
4. Wait for PostgreSQL creation (~15-20 min)
5. Restore database to new server
6. Update Kubernetes secrets
7. Scale up applications
8. Verify connectivity

### Phase 3: Verification (Post-Migration)
1. Test database connections
2. Check firewall rules
3. Verify SSL enforcement
4. Monitor application logs
5. Test user functionality
6. Check performance metrics

### Phase 4: Monitoring (24 hours)
1. Watch for connection errors
2. Monitor performance
3. Review security logs
4. Optimize if needed

**Full details in:** `POSTGRES_PUBLIC_ACCESS_MIGRATION.md`

---

## Key Commands

### Get AKS IPs
```bash
az network public-ip list \
  --resource-group MC_flamoral-prod-rg_flamoral-prod-aks_westus2 \
  --query "[?tags.service=='kubernetes'].ipAddress" -o tsv
```

### Backup Database
```bash
kubectl exec -it <postgres-pod> -n dating-app -- \
  pg_dumpall -U flamoraladmin > backup.sql
```

### Terraform Migration
```bash
cd infrastructure/terraform/environments/prod
terraform plan -out=migration.tfplan
terraform apply migration.tfplan
```

### Restore Database
```bash
psql "postgresql://flamoraladmin:PASSWORD@NEW-HOST:5432/postgres?sslmode=require" < backup.sql
```

### Update K8s Secrets
```bash
kubectl create secret generic postgres-credentials \
  --from-literal=host=NEW-HOST \
  --from-literal=password=NEW-PASSWORD \
  --namespace dating-app --dry-run=client -o yaml | kubectl apply -f -
```

**Full command reference in:** `TERRAFORM_COMMANDS_SUMMARY.md`

---

## Risks & Mitigations

### Risk 1: Data Loss
**Mitigation:**
- Full pg_dumpall backup before migration
- Terraform state backup
- Configuration file backups
- Verification after restore

### Risk 2: Extended Downtime
**Mitigation:**
- Detailed runbook prepared
- Team standing by during migration
- Rollback plan ready
- Expected: 30-60 min, Buffer: 90 min

### Risk 3: Connection Failures Post-Migration
**Mitigation:**
- AKS IPs whitelisted in advance
- Firewall rules tested
- SSL configuration verified
- Connection string validation

### Risk 4: Performance Issues
**Mitigation:**
- Same SKU maintained (GP_Standard_D4s_v3)
- Connection limits configured (300)
- Performance baseline documented
- Monitoring alerts configured

### Risk 5: Security Exposure
**Mitigation:**
- IP whitelist strictly enforced
- SSL/TLS required for all connections
- Connection logging enabled
- Regular security audits

---

## Rollback Plan

If issues occur:

### Immediate Rollback (< 5 minutes)
```bash
# Restore Terraform config from backup
cp -r backups/YYYYMMDD/* infrastructure/terraform/environments/prod/

# Revert changes
cd infrastructure/terraform/environments/prod
terraform destroy -target=azurerm_postgresql_flexible_server.main
terraform apply
```

### Database Restoration
```bash
# Restore database to old server
psql "postgresql://OLD-CONNECTION-STRING" < backup.sql
```

### Application Rollback
```bash
# Restore old secrets
kubectl apply -f k8s-secrets-backup.yaml
kubectl rollout restart deployment -n dating-app
```

**Full rollback details in:** `POSTGRES_PUBLIC_ACCESS_MIGRATION.md`

---

## Cost Impact

### Current Costs (Private Access)
- PostgreSQL GP_Standard_D4s_v3: $350/month
- Storage (256 GB): $26/month
- Private DNS Zone: $0.50/month
- Private Endpoint: $7.30/month
- **Total: $383.80/month**

### New Costs (Public Access)
- PostgreSQL GP_Standard_D4s_v3: $350/month
- Storage (256 GB): $26/month
- Firewall Rules: FREE
- **Total: $376/month**

### Savings
- **$7.80/month** (~$94/year)
- Simplified networking (easier troubleshooting = less ops time)

---

## Connection String Changes

### Current (Private)
```
Host: flamoral-prod-postgres.postgres.database.azure.com (private DNS)
Port: 5432
SSL: Optional
Access: VNET only
```

### New (Public)
```
Host: flamoral-prod-postgres.postgres.database.azure.com (public DNS)
Port: 5432
SSL: REQUIRED (sslmode=require)
Access: Whitelisted IPs only
```

### Example Connection String
```
postgresql://flamoraladmin:PASSWORD@flamoral-prod-postgres.postgres.database.azure.com:5432/flamoral?sslmode=require
```

---

## Success Criteria

Migration is successful when:

✓ PostgreSQL server created with public access
✓ All firewall rules applied correctly
✓ Database fully restored (all tables + data)
✓ Applications connect successfully
✓ No errors in application logs
✓ API health checks passing
✓ User functionality verified
✓ Performance metrics normal
✓ SSL enforcement confirmed
✓ Connection logging active

---

## Timeline

### T-7 days: Preparation
- Document review
- Team training
- Backup strategy finalized

### T-3 days: Testing
- Terraform plan generated
- Plan reviewed by team
- Dry run in staging (optional)

### T-1 day: Final Prep
- Final backups
- Maintenance window confirmed
- User notification sent

### T-0: Migration Day
- **T+0:00** - Start maintenance window
- **T+0:05** - Scale down applications
- **T+0:10** - Run terraform apply
- **T+0:25** - PostgreSQL created
- **T+0:30** - Database restore starts
- **T+0:45** - Update K8s secrets
- **T+0:50** - Scale up applications
- **T+0:55** - Verification tests
- **T+1:00** - End maintenance window

### T+1 day: Monitoring
- 24-hour close monitoring
- Performance baseline comparison
- Security audit

### T+7 days: Review
- Post-mortem meeting
- Documentation updates
- Lessons learned

---

## Team Roles

### Migration Lead
- Execute Terraform changes
- Coordinate team
- Make go/no-go decisions

### Database Administrator
- Backup verification
- Database restoration
- Performance validation

### DevOps Engineer
- Application scaling
- Kubernetes secrets update
- Monitoring setup

### Application Engineer
- Connection string validation
- Smoke tests
- User acceptance testing

### On-Call Support
- Standby for issues
- User communication
- Incident response

---

## Communication Plan

### 24 Hours Before
**To:** All users, stakeholders
**Subject:** Scheduled Maintenance - Database Migration
**Content:**
- Maintenance window details
- Expected downtime: 60 minutes
- Impact: Platform unavailable
- Support contact info

### During Maintenance
**Status Page:** Updated every 15 minutes
**Slack Channel:** #flamoral-maintenance
**Updates on:**
- Migration progress
- Issues encountered
- Expected completion time

### After Completion
**To:** All users, stakeholders
**Subject:** Maintenance Complete - Service Restored
**Content:**
- Migration successful
- Any observed issues
- Next steps
- Thank you for patience

---

## Documentation Artifacts

This migration includes three comprehensive documents:

### 1. Executive Summary (This Document)
**File:** `POSTGRES_MIGRATION_EXECUTIVE_SUMMARY.md`
**Purpose:** High-level overview for stakeholders
**Audience:** Management, project sponsors

### 2. Migration Guide
**File:** `POSTGRES_PUBLIC_ACCESS_MIGRATION.md`
**Purpose:** Detailed technical implementation guide
**Audience:** DevOps, Database administrators
**Contents:**
- Architecture diagrams
- Detailed Terraform changes
- Step-by-step migration process
- Rollback procedures
- Security configurations
- FAQ

### 3. Command Reference
**File:** `TERRAFORM_COMMANDS_SUMMARY.md`
**Purpose:** Quick command reference for execution
**Audience:** Engineers executing migration
**Contents:**
- Prerequisites commands
- Backup commands
- Terraform commands
- Verification commands
- Rollback commands
- Checklists

---

## Approval & Sign-Off

**Migration Prepared By:** Terraform Infrastructure Agent
**Date:** December 14, 2024

**Approvals Required:**

- [ ] **Engineering Lead** - Technical review and approval
      Name: ___________________ Date: ___________

- [ ] **Database Administrator** - Database migration approval
      Name: ___________________ Date: ___________

- [ ] **DevOps Lead** - Infrastructure change approval
      Name: ___________________ Date: ___________

- [ ] **Security Officer** - Security configuration approval
      Name: ___________________ Date: ___________

- [ ] **Product Owner** - Business impact acceptance
      Name: ___________________ Date: ___________

---

## Post-Migration Report

**To be completed after migration:**

**Actual Downtime:** __________ minutes
**Issues Encountered:** _________________________________
**Rollback Required:** Yes [ ] No [ ]
**Performance Impact:** _________________________________
**Lessons Learned:** _________________________________

**Migration Status:** Success [ ] Partial [ ] Failed [ ]

**Completed By:** ___________________ Date: ___________

---

## References

- **Azure PostgreSQL Docs**: https://learn.microsoft.com/azure/postgresql/flexible-server/
- **Terraform Provider Docs**: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/postgresql_flexible_server
- **Internal Runbooks**: `infrastructure/runbooks/`
- **Monitoring Dashboard**: https://grafana.flamoral.com

---

## Contact Information

**For Questions or Issues:**

**DevOps Team**
- Email: devops@flamoral.com
- Slack: #devops

**Database Team**
- Email: dba@flamoral.com
- Slack: #database

**On-Call Support**
- PagerDuty: Flamoral Production Escalation
- Phone: [On-Call Number]

**Azure Support**
- Subscription: ebd1613e-fea0-4b6d-8918-7e4de6a71c44
- Portal: https://portal.azure.com

---

**Document Status:** FINAL - READY FOR REVIEW
**Version:** 1.0.0
**Last Updated:** December 14, 2024
**Next Review:** Post-migration (within 7 days)
