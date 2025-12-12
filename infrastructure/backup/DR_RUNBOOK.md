# Disaster Recovery Runbook
# Flamoral Dating Platform

**Classification:** CONFIDENTIAL - INTERNAL USE ONLY
**Last Updated:** 2024-12-11
**Version:** 1.0.0
**Owner:** DevOps Team

---

## Table of Contents

1. [Emergency Contacts](#emergency-contacts)
2. [Quick Reference](#quick-reference)
3. [Decision Tree](#decision-tree)
4. [Recovery Procedures](#recovery-procedures)
5. [Verification Steps](#verification-steps)
6. [Post-Recovery Actions](#post-recovery-actions)
7. [Communication Templates](#communication-templates)

---

## Emergency Contacts

### 24/7 On-Call Team

| Role | Primary | Backup | Phone | Email |
|------|---------|--------|-------|-------|
| Incident Commander | John Smith | Sarah Johnson | +1-555-0100 | john.smith@flamoral.com |
| Infrastructure Lead | Mike Chen | David Lee | +1-555-0102 | mike.chen@flamoral.com |
| Database Lead | Lisa Wong | Robert Kim | +1-555-0103 | lisa.wong@flamoral.com |
| Security Lead | Robert Davis | Emily Park | +1-555-0104 | robert.davis@flamoral.com |
| Application Lead | Emily Brown | Alex Chen | +1-555-0105 | emily.brown@flamoral.com |

### External Contacts

- **Azure Support:** Premium Support Ticket (Critical Priority)
- **PagerDuty:** +1-844-700-4487
- **Stripe Support:** +1-888-926-2289 (Priority Support)
- **Twilio Support:** +1-415-390-2337 (Enterprise Support)

### Communication Channels

- **Primary:** Slack #incident-response
- **Backup:** Microsoft Teams #dr-war-room
- **Conference Bridge:** +1-555-0199, PIN: 123456#
- **Status Page:** https://status.flamoral.com
- **War Room (Zoom):** https://zoom.us/j/flamoral-dr-room

---

## Quick Reference

### Critical Access Information

```bash
# Azure Portal
https://portal.azure.com
Subscription: Flamoral Production

# Kubernetes Dashboard
kubectl proxy
http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/

# Monitoring
Grafana: https://grafana.flamoral.com
Prometheus: https://prometheus.flamoral.com
Kibana: https://logs.flamoral.com

# Backup Storage
Primary: https://flamoralbackup.blob.core.windows.net
Secondary: https://flamoralbackupdr.blob.core.windows.net
```

### Key Metrics and Thresholds

| Metric | Normal | Warning | Critical |
|--------|--------|---------|----------|
| API Response Time | < 200ms | > 500ms | > 1000ms |
| Error Rate | < 0.1% | > 1% | > 5% |
| Database Connections | < 500 | > 800 | > 950 |
| CPU Usage | < 60% | > 80% | > 90% |
| Memory Usage | < 70% | > 85% | > 95% |
| Disk Usage | < 70% | > 85% | > 90% |

### RTO/RPO Targets

| Component | RTO | RPO | Priority |
|-----------|-----|-----|----------|
| Authentication | 5 min | 0 min | P0 |
| Payment Processing | 5 min | 0 min | P0 |
| Messaging | 15 min | 15 min | P1 |
| Matching Engine | 15 min | 1 hour | P1 |
| User Profiles | 30 min | 1 hour | P2 |
| Analytics | 4 hours | 24 hours | P3 |

---

## Decision Tree

### Step 1: Assess the Situation

```
Is the service responding?
  ├─ YES → Is it performing within SLA?
  │        ├─ YES → Monitor closely, no action needed
  │        └─ NO → Degraded Performance → Go to Step 2
  └─ NO → Complete Outage → Go to Step 3
```

### Step 2: Degraded Performance

```
Check metrics:
  ├─ High CPU/Memory? → Scale horizontally
  ├─ Database slow? → Check slow queries, optimize or failover
  ├─ Network issues? → Check ingress, DNS, load balancer
  └─ External service? → Check third-party status pages
```

### Step 3: Complete Outage

```
Scope of outage:
  ├─ Single service → Restart/redeploy service
  ├─ Multiple services → Check infrastructure
  ├─ Entire namespace → Restore from Velero backup
  ├─ Database failure → Initiate database recovery
  ├─ Cluster failure → Deploy to DR cluster
  └─ Regional failure → Full DR activation → Go to DR_PROCEDURE_FULL
```

---

## Recovery Procedures

### PROCEDURE 1: Service-Level Recovery (RTO: 5-15 minutes)

**Scenario:** Single service failure (e.g., auth-service, payment-service)

#### Prerequisites
- [ ] Backup image available in ACR
- [ ] Last known good configuration
- [ ] Database is operational

#### Steps

```bash
# 1. Identify failed service
kubectl get pods -n flamoral-dating | grep -v Running

# 2. Check logs for errors
kubectl logs -n flamoral-dating <pod-name> --tail=100

# 3. Quick restart attempt
kubectl rollout restart deployment/<service-name> -n flamoral-dating

# 4. If restart fails, rollback to previous version
kubectl rollout undo deployment/<service-name> -n flamoral-dating

# 5. If rollback fails, redeploy from Helm
helm rollback <service-name> -n flamoral-dating

# 6. Monitor recovery
kubectl rollout status deployment/<service-name> -n flamoral-dating

# 7. Verify health
curl https://api.flamoral.com/health/<service-name>
```

#### Verification
- Service pods are Running
- Health checks return 200 OK
- Error rate < 1%
- Response time < 500ms

---

### PROCEDURE 2: Database Recovery (RTO: 30 minutes)

**Scenario:** PostgreSQL database corruption or failure

#### Prerequisites
- [ ] Database backup available (hourly)
- [ ] WAL files for PITR
- [ ] Standby database ready

#### Steps

```bash
# 1. Stop all services writing to database
kubectl scale deployment --all --replicas=0 -n flamoral-dating

# 2. Assess database state
PGPASSWORD=$PG_PASSWORD psql -h $PG_HOST -U $PG_USER -d postgres -c "\l"

# 3. Option A: Promote standby (fastest - 2 minutes)
pg_ctl promote -D /var/lib/postgresql/standby

# 4. Option B: Point-in-time recovery (15-30 minutes)
cd /path/to/scripts/disaster-recovery
BACKUP_TIMESTAMP=latest PITR_TARGET="2024-12-11 14:30:00" \
  bash postgres-restore.sh -p "2024-12-11 14:30:00"

# 5. Verify database
bash data-validation.sh --quick

# 6. Restart services
kubectl scale deployment --all --replicas=3 -n flamoral-dating

# 7. Monitor for errors
kubectl logs -n flamoral-dating -l app=auth-service --tail=50
```

#### Verification
- All databases accessible
- No data corruption
- Replication lag < 1 second
- Application queries successful

---

### PROCEDURE 3: Kubernetes Cluster Recovery (RTO: 1 hour)

**Scenario:** Kubernetes cluster failure or corruption

#### Prerequisites
- [ ] Velero backups available
- [ ] Terraform state intact
- [ ] Azure subscription accessible

#### Steps

```bash
# 1. Assess cluster state
kubectl cluster-info
kubectl get nodes

# 2. If cluster unreachable, check Azure Portal
az aks show --resource-group $RG_NAME --name $AKS_NAME

# 3. Option A: Restart cluster (fastest)
az aks stop --resource-group $RG_NAME --name $AKS_NAME
az aks start --resource-group $RG_NAME --name $AKS_NAME

# 4. Option B: Restore from Velero backup
cd /path/to/scripts/disaster-recovery
bash velero-setup.sh restore create <backup-name>

# 5. Option C: Rebuild cluster
cd /path/to/infrastructure/terraform
terraform taint azurerm_kubernetes_cluster.main
terraform apply -auto-approve

# 6. Restore applications
cd /path/to/scripts/disaster-recovery
bash velero-setup.sh restore create daily-full-latest

# 7. Verify all services
kubectl get pods --all-namespaces
bash data-validation.sh --full
```

#### Verification
- All nodes Ready
- All pods Running
- Services accessible
- Ingress functioning

---

### PROCEDURE 4: Full Environment Rebuild (RTO: 4 hours)

**Scenario:** Complete regional failure, data center loss, or catastrophic failure

#### Prerequisites
- [ ] Terraform code in Git
- [ ] Backups in secondary region
- [ ] DNS can be updated
- [ ] Azure access to DR region

#### Activation Criteria

**Execute FULL DR when:**
- Complete Azure region outage (confirmed by Azure Status)
- Primary data center destroyed
- Complete loss of production environment
- Cyber attack requiring complete rebuild
- Data corruption across multiple systems

#### Steps

```bash
# 1. DECLARE DISASTER
# Alert all stakeholders via pre-configured channels
# Update status page: "Platform is under maintenance"

# 2. Assemble DR team
# Primary and backup contacts for each role
# Join war room: Zoom DR link

# 3. Switch to DR region
export AZURE_REGION="West US 2"
export ENV="production"
export BACKUP_TIMESTAMP="latest"

# 4. Execute full rebuild
cd /path/to/scripts/disaster-recovery

# Dry run first to check
DRY_RUN=true bash full-environment-rebuild.sh

# If dry run successful, execute
SKIP_CONFIRMATION=true bash full-environment-rebuild.sh

# This script will:
# - Rebuild infrastructure from Terraform
# - Create new AKS cluster
# - Restore databases from backups
# - Restore Kubernetes resources from Velero
# - Deploy all applications
# - Configure DNS and ingress

# 5. Monitor rebuild progress
# Progress logged to /var/log/flamoral-dr/rebuild-TIMESTAMP.log

# 6. Parallel: Update DNS
# Point main domain to new region
az network dns record-set a update \
  --resource-group dns-rg \
  --zone-name flamoral.com \
  --name "@" \
  --set aRecords[0].ipv4Address=<new-ingress-ip>

# 7. SSL certificate update
# cert-manager will automatically request new certificates

# 8. Validate environment
bash data-validation.sh --comprehensive

# 9. Smoke tests
bash smoke-tests.sh --all

# 10. Load testing (limited)
# Gradually increase traffic to verify capacity
```

#### Critical Path Timeline

| Time | Action | Responsible |
|------|--------|-------------|
| T+0 | Declare disaster, assemble team | Incident Commander |
| T+5 | Initiate infrastructure rebuild | Infrastructure Lead |
| T+15 | Infrastructure provisioned | Infrastructure Lead |
| T+25 | Kubernetes cluster ready | Infrastructure Lead |
| T+35 | Database restore initiated | Database Lead |
| T+60 | Database restore complete | Database Lead |
| T+75 | Applications deployed | Application Lead |
| T+90 | DNS updated | Infrastructure Lead |
| T+105 | Smoke tests passed | QA Team |
| T+120 | Traffic cutover | Infrastructure Lead |
| T+150 | Monitoring stable | All |
| T+180 | Incident resolved | Incident Commander |

#### Verification Checklist

- [ ] All infrastructure resources created
- [ ] Kubernetes cluster operational
- [ ] All databases restored and accessible
- [ ] All pods Running
- [ ] Ingress receiving traffic
- [ ] SSL certificates valid
- [ ] DNS propagated globally
- [ ] Health checks passing
- [ ] Authentication working
- [ ] Payment processing functional
- [ ] Real-time messaging operational
- [ ] File uploads working
- [ ] Monitoring and logging functional
- [ ] Alerts configured

---

## Verification Steps

### System Health Verification

```bash
# 1. Infrastructure
az resource list --resource-group $RG_NAME --output table

# 2. Kubernetes
kubectl get nodes
kubectl get pods --all-namespaces
kubectl top nodes
kubectl top pods -n flamoral-dating

# 3. Databases
bash scripts/disaster-recovery/data-validation.sh --full

# 4. Applications
curl https://api.flamoral.com/health
curl https://api.flamoral.com/auth/health
curl https://api.flamoral.com/payments/health

# 5. Services
kubectl get svc -n flamoral-dating
kubectl get ingress -n flamoral-dating

# 6. Monitoring
# Check Grafana dashboards
# Verify metrics flowing
# Check alert status

# 7. End-to-end test
# Run automated test suite
bash scripts/e2e-tests.sh
```

### Data Integrity Verification

```bash
# Run comprehensive validation
bash scripts/disaster-recovery/data-validation.sh --comprehensive

# Check key metrics
- User count matches pre-disaster
- Recent transactions recovered
- Messages intact
- Media files accessible
- Matches preserved
```

---

## Post-Recovery Actions

### Immediate (Within 1 hour)

1. **Update Status Page**
   - "All systems operational"
   - Provide incident summary
   - Estimated time of normal operation

2. **Notify Stakeholders**
   - Internal team
   - Key customers (if needed)
   - Partners and vendors

3. **Monitor Closely**
   - Watch error rates
   - Monitor performance
   - Check user reports

### Short Term (Within 24 hours)

1. **Verify Backups Resume**
   - Hourly database backups
   - Velero schedules
   - Log archiving

2. **Security Audit**
   - Review access logs
   - Verify no unauthorized access
   - Check for data breaches

3. **Initial Incident Report**
   - Timeline of events
   - Actions taken
   - Impact assessment

### Medium Term (Within 1 week)

1. **Post-Mortem Meeting**
   - Root cause analysis
   - What went well
   - What needs improvement
   - Action items

2. **Update Documentation**
   - Runbook improvements
   - Process updates
   - Contact information

3. **Implement Improvements**
   - Fix identified issues
   - Update automation
   - Enhance monitoring

### Long Term (Within 1 month)

1. **Comprehensive Review**
   - RTO/RPO actual vs target
   - Cost analysis
   - Process efficiency

2. **DR Drill**
   - Test updated procedures
   - Train new team members
   - Validate improvements

3. **Report to Leadership**
   - Executive summary
   - Financial impact
   - Risk mitigation steps

---

## Communication Templates

### Template 1: Initial Incident Notification

```
Subject: [CRITICAL] Production Incident - Flamoral Platform

Team,

We are experiencing a production incident affecting [service/platform].

Status: INVESTIGATING
Severity: P0/P1/P2
Impact: [description]
Started: [timestamp]

Actions:
- Incident response team assembled
- DR procedures initiated
- Users notified via status page

War Room: [Zoom link]
Status Updates: Every 15 minutes
Next Update: [time]

Incident Commander: [name]
```

### Template 2: Recovery Update

```
Subject: [UPDATE] Production Incident - Recovery in Progress

Team,

Recovery efforts are progressing.

Status: RECOVERING
ETA: [time]
Progress:
  ✓ Infrastructure restored
  ✓ Databases recovered
  ⏳ Applications deploying
  ⏳ DNS propagating

Current metrics:
- Services restored: X/Y
- Data integrity: Verified
- Performance: Within normal range

Next Update: [time]
```

### Template 3: Incident Resolved

```
Subject: [RESOLVED] Production Incident - All Systems Operational

Team,

The production incident has been resolved.

Status: RESOLVED
Duration: [time]
Impact: [summary]

Recovery Summary:
- Incident detected: [time]
- DR activated: [time]
- Services restored: [time]
- Full recovery: [time]

All systems are now operational and performing normally.

Post-Mortem: [date and time]
Incident Report: [link]

Thank you for your quick response and professionalism.
```

### Template 4: Customer Communication

```
Subject: Service Restoration Complete

Dear Flamoral Users,

We want to inform you that the service disruption you may have experienced
has been fully resolved. Our platform is now operating normally.

What happened:
[Brief, non-technical explanation]

Timeline:
- Issue started: [time]
- Resolution completed: [time]
- Total duration: [time]

Your data security and privacy were not compromised during this incident.

We sincerely apologize for any inconvenience and appreciate your patience.

If you experience any issues, please contact support@flamoral.com

Thank you,
Flamoral Team
```

---

## Appendix

### Backup Locations

- **PostgreSQL Backups:** Azure Blob Storage, Container: `postgresql-backups`
- **Cosmos DB Backups:** Automatic continuous backup (Azure managed)
- **Kubernetes Backups:** Azure Blob Storage, Container: `kubernetes-backups`
- **Media Files:** Geo-redundant storage with versioning
- **Configuration:** Git repository + Azure Key Vault

### Scripts Reference

| Script | Purpose | Location |
|--------|---------|----------|
| postgres-backup.sh | PostgreSQL backup automation | scripts/disaster-recovery/ |
| postgres-restore.sh | PostgreSQL restore | scripts/disaster-recovery/ |
| velero-setup.sh | Velero management | scripts/disaster-recovery/ |
| full-environment-rebuild.sh | Complete DR rebuild | scripts/disaster-recovery/ |
| data-validation.sh | Data integrity checks | scripts/disaster-recovery/ |

### Testing Schedule

- **Weekly:** Single service recovery drill
- **Monthly:** Database restore test
- **Quarterly:** Full DR activation drill
- **Annually:** Multi-region failover test

---

**Document Control:**

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2024-12-11 | 1.0.0 | DevOps Team | Initial version |

**Next Review Date:** 2025-01-11

---

*This document contains confidential information. Do not share outside authorized personnel.*
