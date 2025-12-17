# Flamoral Platform - Production Deployment Checklist

**Version:** 2.0.0
**Date:** _______________
**Deployed By:** _______________
**Deployment Type:** □ Initial  □ Update  □ Rollback

---

## Pre-Deployment Verification

### Access & Credentials
- [ ] Azure CLI installed (v2.50.0+)
- [ ] Azure subscription access verified
- [ ] kubectl configured for AKS cluster
- [ ] Docker registry access confirmed
- [ ] DNS registrar access available
- [ ] All team members notified of deployment window

### Environment Variables
- [ ] All Key Vault secrets populated (17 total)
- [ ] Auth vault secrets verified (4)
- [ ] Payment vault secrets verified (2)
- [ ] Data vault secrets verified (2)
- [ ] External services vault secrets verified (6)
- [ ] Infrastructure vault secrets verified (3)
- [ ] Secret verification script run successfully

### Infrastructure Status
- [ ] AKS cluster is running
- [ ] Container registry is accessible
- [ ] Public IP address reserved (48.200.65.15)
- [ ] Azure Front Door deployed
- [ ] PostgreSQL database provisioned
- [ ] MongoDB/Cosmos DB provisioned
- [ ] Redis cache provisioned
- [ ] Azure Blob Storage configured

### Monitoring & Alerting
- [ ] Application Insights configured
- [ ] Log Analytics workspace active
- [ ] Prometheus deployed
- [ ] Grafana dashboards imported
- [ ] Alert rules configured
- [ ] PagerDuty integration tested
- [ ] Slack notifications configured

### Backups
- [ ] Database backup verified (< 24 hours old)
- [ ] Terraform state backed up
- [ ] Kubernetes manifests committed to git
- [ ] Container images tagged with version
- [ ] Configuration files backed up

---

## Phase 1: DNS Configuration (5 min + propagation)

- [ ] Azure DNS zone created (flamoral.com)
- [ ] A record: @ → 48.200.65.15
- [ ] A record: www → 48.200.65.15
- [ ] A record: api → 48.200.65.15
- [ ] A record: admin → 48.200.65.15
- [ ] CAA records for Let's Encrypt
- [ ] TTL set to 300 seconds
- [ ] Azure nameservers noted
- [ ] Domain registrar updated
- [ ] DNS propagation initiated

**Time Started:** _______________
**Time Completed:** _______________

---

## Phase 2: Kubernetes Namespace (2 min)

- [ ] Namespace created (flamoral)
- [ ] Namespace labels applied
- [ ] kubectl context set to flamoral
- [ ] Resource quotas deployed
- [ ] Network policies prepared

**Time Started:** _______________
**Time Completed:** _______________

---

## Phase 3: External Secrets (5 min)

- [ ] External Secrets Operator installed
- [ ] Operator pods running
- [ ] SecretStore resources deployed (5 vaults)
- [ ] ExternalSecret: Auth secrets
- [ ] ExternalSecret: Payment secrets
- [ ] ExternalSecret: Database secrets
- [ ] ExternalSecret: External service secrets
- [ ] ExternalSecret: Infrastructure secrets
- [ ] All Kubernetes secrets synced

**Time Started:** _______________
**Time Completed:** _______________

---

## Phase 4: TLS Certificates (5-10 min)

- [ ] cert-manager installed
- [ ] cert-manager pods running
- [ ] Let's Encrypt ClusterIssuer created
- [ ] Certificate resource deployed (flamoral-tls)
- [ ] HTTP-01 challenge completed
- [ ] Certificate issued
- [ ] Certificate secret created
- [ ] Expiration noted: _______________

**Time Started:** _______________
**Time Completed:** _______________

---

## Phase 5: Azure Front Door (5 min)

- [ ] Route: default (/* )
- [ ] Route: api (/api/*, /graphql)
- [ ] Route: websocket (/ws/*, /socket.io/*)
- [ ] Route: static (/static/*, /assets/*)
- [ ] Route: media (/media/*, /uploads/*)
- [ ] Route: health (/health, /healthz)
- [ ] Caching rules configured
- [ ] HTTPS redirect enabled

**Time Started:** _______________
**Time Completed:** _______________

---

## Phase 6: Backend Services (15-20 min)

### Infrastructure
- [ ] PgBouncer deployed (2 replicas)
- [ ] Redis configuration deployed

### Application Services
- [ ] API Gateway
- [ ] Auth Service
- [ ] User Service
- [ ] Matching Service
- [ ] Messaging Service
- [ ] Notification Service
- [ ] Analytics Service
- [ ] Realtime Service
- [ ] Admin Service
- [ ] Moderation Service

### Web Application
- [ ] Web app deployed (2 replicas)
- [ ] Health endpoint responding

### Ingress
- [ ] NGINX Ingress Controller (3 replicas)
- [ ] Public IP assigned (48.200.65.15)
- [ ] Ingress resource deployed
- [ ] TLS configuration applied
- [ ] Host rules configured (4 hosts)

### Autoscaling
- [ ] HPA: API Gateway
- [ ] HPA: Auth Service
- [ ] HPA: Messaging Service
- [ ] HPA: Web App

### High Availability
- [ ] PDB: API Gateway (min 1)
- [ ] PDB: Auth Service (min 1)
- [ ] PDB: Messaging Service (min 1)
- [ ] PDB: Web App (min 1)

### Security
- [ ] Network policies deployed
- [ ] Default deny policy active

**Time Started:** _______________
**Time Completed:** _______________

---

## Phase 7: Verification (10 min)

### Pod Health
- [ ] All pods Running
- [ ] No CrashLoopBackOff
- [ ] Health checks passing

### Service Connectivity
- [ ] Internal service calls working
- [ ] Database connected
- [ ] Redis accessible
- [ ] Secrets loaded

### External Access
- [ ] Front Door endpoint accessible
- [ ] DNS resolution working
- [ ] HTTPS working
- [ ] SSL certificate valid

### API Testing
- [ ] GET /health → 200 OK
- [ ] GET /api/health → 200 OK
- [ ] Auth endpoints working
- [ ] WebSocket connects

### Frontend Testing
- [ ] Homepage loads
- [ ] Static assets loading
- [ ] No console errors
- [ ] API calls working

**Time Started:** _______________
**Time Completed:** _______________

---

## Post-Deployment

### Monitoring
- [ ] Application Insights connected
- [ ] Prometheus metrics flowing
- [ ] Grafana dashboards verified
- [ ] Logs in Log Analytics

### Alerts
- [ ] Critical alerts configured
- [ ] Warning alerts configured
- [ ] Info alerts configured

### Performance Baseline
- [ ] API response time recorded
- [ ] Frontend load time recorded
- [ ] Resource usage recorded

### Documentation
- [ ] Production endpoints documented
- [ ] DNS records documented
- [ ] Deployment timestamp recorded
- [ ] Runbooks updated

### Communication
- [ ] Deployment announced (Slack/Email)
- [ ] Known issues documented
- [ ] On-call rotation confirmed

---

## First 24 Hours Monitoring

### Hour 1
- [ ] Error logs checked (every 15 min)
- [ ] Pod status monitored
- [ ] Resource usage normal

### Hours 2-4
- [ ] Error logs checked (every 30 min)
- [ ] Autoscaling verified
- [ ] Certificate status OK

### Hours 4-24
- [ ] Error logs checked (hourly)
- [ ] Overall health verified
- [ ] Performance metrics reviewed

---

## Sign-Off

| Role | Name | Date/Time |
|------|------|-----------|
| **Platform Lead** | _______________ | _______________ |
| **DevOps Engineer** | _______________ | _______________ |
| **Backend Engineer** | _______________ | _______________ |
| **Frontend Engineer** | _______________ | _______________ |
| **Engineering Manager** | _______________ | _______________ |

---

## Deployment Summary

### Timeline
| Phase | Duration | Status |
|-------|----------|--------|
| DNS Configuration | _______ | □ Success □ Issues |
| Namespace | _______ | □ Success □ Issues |
| External Secrets | _______ | □ Success □ Issues |
| TLS Certificates | _______ | □ Success □ Issues |
| Front Door | _______ | □ Success □ Issues |
| Backend Services | _______ | □ Success □ Issues |
| Verification | _______ | □ Success □ Issues |

**Total Time:** _______________

### Versions
- **Platform:** v2.0.0
- **Web App:** _______________
- **Backend:** _______________

### Issues
| Issue | Severity | Resolution |
|-------|----------|------------|
| _______________ | □ Critical □ High □ Low | _______________ |

---

## Emergency Contacts

- **Primary On-Call:** _______________
- **Backup On-Call:** _______________
- **Azure Support:** _______________

---

**Deployment Status:** □ Successful  □ Successful with Issues  □ Failed  □ Rolled Back

**Completed:** _______________
