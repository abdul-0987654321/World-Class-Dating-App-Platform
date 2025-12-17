# Flamoral Dating Platform - Incident Response Runbook

## Overview

This runbook provides comprehensive procedures for responding to production incidents in the Flamoral dating platform. It defines incident classification, escalation procedures, communication templates, and recovery processes.

**Last Updated:** 2025-12-17
**Version:** 1.0.0
**Maintained By:** DevOps & SRE Team

## Table of Contents

1. [Incident Classification](#incident-classification)
2. [Initial Response](#initial-response)
3. [Escalation Procedures](#escalation-procedures)
4. [Communication Templates](#communication-templates)
5. [Investigation Process](#investigation-process)
6. [Resolution and Recovery](#resolution-and-recovery)
7. [Post-Incident Review](#post-incident-review)
8. [Recovery Objectives](#recovery-objectives)
9. [Contact Information](#contact-information)

## Incident Classification

### Severity Levels

#### P1 - Critical (Response Time: Immediate)
**Definition:** Complete service outage or critical security breach affecting all users

**Characteristics:**
- Platform completely unavailable
- Database corruption or data loss
- Active security breach with data exfiltration
- Payment processing failure affecting all transactions
- Authentication system completely down

**Response Requirements:**
- Immediate page to on-call engineer
- Incident commander assigned within 5 minutes
- Executive notification within 15 minutes
- Status page updated immediately
- All hands on deck response

**RTO:** 1 hour
**RPO:** 5 minutes

#### P2 - High (Response Time: 15 minutes)
**Definition:** Major degradation affecting significant portion of users

**Characteristics:**
- Matching algorithm failure
- Real-time messaging down
- Photo upload/download failures
- Severe performance degradation (>5s response times)
- Database replication lag >5 minutes
- Single region outage

**Response Requirements:**
- Page on-call engineer
- Incident commander assigned within 15 minutes
- Stakeholder notification within 30 minutes
- Status page updated within 15 minutes

**RTO:** 4 hours
**RPO:** 15 minutes

#### P3 - Medium (Response Time: 1 hour)
**Definition:** Partial functionality impairment affecting subset of users

**Characteristics:**
- Non-critical feature unavailable
- Moderate performance issues (2-5s delays)
- Notification delays
- Search functionality degraded
- Admin panel issues
- Scheduled job failures

**Response Requirements:**
- Create incident ticket
- Assign to on-call engineer
- Team lead notification within 1 hour
- Status page update if user-facing

**RTO:** 8 hours
**RPO:** 1 hour

#### P4 - Low (Response Time: 4 hours)
**Definition:** Minor issues with minimal user impact

**Characteristics:**
- Cosmetic UI issues
- Non-critical logging errors
- Minor documentation issues
- Internal tool degradation
- Monitoring alert noise

**Response Requirements:**
- Create ticket in backlog
- Assign to appropriate team
- No immediate notification required
- Fix during business hours

**RTO:** 24 hours
**RPO:** 4 hours

## Initial Response

### First 5 Minutes

#### 1. Acknowledge the Incident
```bash
# Acknowledge PagerDuty alert
# Via mobile app or:
curl -X PUT https://api.pagerduty.com/incidents/INCIDENT_ID/acknowledge \
  -H 'Authorization: Token token=YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "incident": {
      "type": "incident_reference",
      "status": "acknowledged"
    }
  }'
```

#### 2. Perform Initial Triage
```bash
# Check overall platform health
kubectl get pods -n datingapp --field-selector=status.phase!=Running

# Check recent deployments
kubectl rollout history deployment/dating-api -n datingapp

# Check error rates
az monitor metrics list \
  --resource /subscriptions/YOUR_SUBSCRIPTION/resourceGroups/datingapp-prod-rg/providers/Microsoft.Insights/components/datingapp-prod-appinsights \
  --metric 'requests/failed' \
  --interval PT5M \
  --start-time $(date -u -d '30 minutes ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ)

# Check database connections
kubectl exec -n datingapp deployment/dating-api -- \
  curl -s localhost:8080/health/database

# Check Redis connectivity
kubectl exec -n datingapp deployment/dating-api -- \
  curl -s localhost:8080/health/redis
```

#### 3. Classify Severity
Use the classification matrix above to determine incident severity (P1-P4)

#### 4. Create Incident Channel
```bash
# Create Slack incident channel
# Format: #incident-YYYY-MM-DD-brief-description
# Example: #incident-2025-12-17-api-outage

# Post initial update:
"""
INCIDENT DECLARED - P1
Time: 2025-12-17 14:30 UTC
Summary: API service completely unavailable
Impact: All users unable to access platform
Incident Commander: @engineer-name
Status: Investigating
"""
```

### First 15 Minutes

#### 5. Gather Context
```bash
# Check application logs
kubectl logs -n datingapp deployment/dating-api --tail=500 --since=30m | grep -i error

# Check ingress logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller --tail=100

# Check recent changes
git log --oneline --since="2 hours ago" --all

# Check infrastructure changes
cd infrastructure/terraform
git log --oneline --since="24 hours ago"

# Check Application Insights
az monitor app-insights query \
  --app datingapp-prod-appinsights \
  --analytics-query '
    exceptions
    | where timestamp > ago(30m)
    | summarize count() by problemId, outerMessage
    | order by count_ desc
    | take 10
  '
```

#### 6. Implement Immediate Mitigation (if available)
```bash
# Option 1: Rollback recent deployment
kubectl rollout undo deployment/dating-api -n datingapp

# Option 2: Scale up resources
kubectl scale deployment/dating-api --replicas=10 -n datingapp

# Option 3: Enable maintenance mode
kubectl apply -f manifests/maintenance-mode.yaml

# Option 4: Failover to secondary region (see DATABASE_FAILOVER_RUNBOOK.md)
```

## Escalation Procedures

### Escalation Matrix

```
P1 Critical Incident
├── Immediate: On-Call Engineer (0 min)
├── Immediate: Incident Commander (5 min)
├── 15 min: Engineering Manager
├── 15 min: VP Engineering
├── 30 min: CTO
├── 30 min: CEO (if customer-facing)
└── 1 hour: PR/Communications (if public)

P2 High Incident
├── Immediate: On-Call Engineer (0 min)
├── 15 min: Incident Commander (if needed)
├── 30 min: Engineering Manager
└── 1 hour: VP Engineering (if unresolved)

P3 Medium Incident
├── 1 hour: On-Call Engineer
├── 2 hours: Engineering Manager
└── 4 hours: VP Engineering (if unresolved)

P4 Low Incident
├── 4 hours: Assigned Engineer
└── Business hours: Team Lead
```

### Escalation Triggers

#### Automatic Escalation
- P1 not resolved within 1 hour → Escalate to VP Engineering
- P2 not resolved within 4 hours → Escalate to VP Engineering
- Any incident lasting >6 hours → Escalate to CTO
- Multiple simultaneous incidents → Escalate to Engineering Manager

#### Manual Escalation
```bash
# Via PagerDuty
curl -X POST https://api.pagerduty.com/incidents \
  -H 'Authorization: Token token=YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "incident": {
      "type": "incident",
      "title": "ESCALATED: API Outage",
      "service": {
        "id": "SERVICE_ID",
        "type": "service_reference"
      },
      "urgency": "high",
      "escalation_policy": {
        "id": "ESCALATION_POLICY_ID",
        "type": "escalation_policy_reference"
      }
    }
  }'
```

### Contact Chain

**On-Call Engineer** → **Incident Commander** → **Engineering Manager** → **VP Engineering** → **CTO**

## Communication Templates

### Internal Status Update (Every 30 minutes for P1/P2)

```markdown
INCIDENT UPDATE - [TIME] UTC

Severity: [P1/P2/P3/P4]
Status: [Investigating/Identified/Monitoring/Resolved]
Incident Commander: @username

SUMMARY:
[Brief description of what's happening]

IMPACT:
- Affected Users: [Number/Percentage]
- Affected Features: [List]
- Started: [Timestamp]

CURRENT ACTIONS:
[What we're doing right now]

NEXT UPDATE:
[When to expect next update]

TIMELINE:
14:30 UTC - Incident detected
14:32 UTC - P1 declared
14:35 UTC - Incident commander assigned
14:40 UTC - Root cause identified
14:45 UTC - Fix deployed
```

### External Status Page Update

```markdown
[INVESTIGATING]
We are currently investigating reports of [service] being unavailable.
We will provide an update within 30 minutes.
Posted: [Timestamp]

[IDENTIFIED]
We have identified the issue affecting [service].
Our team is working on a fix. Expected resolution: [Timeframe]
Posted: [Timestamp]

[MONITORING]
A fix has been deployed and we are monitoring the situation.
Service should be restored for all users.
Posted: [Timestamp]

[RESOLVED]
The issue has been fully resolved. All services are operating normally.
We apologize for any inconvenience.
Posted: [Timestamp]
```

### Customer Support Template

```markdown
Subject: Service Disruption - [DATE]

Dear Flamoral Users,

We are aware that some users are experiencing [description of issue] with the Flamoral platform.

What happened:
[Brief explanation]

Impact:
[What features are affected]

Status:
[Current status and ETA]

What we're doing:
[Actions being taken]

What you can do:
[Any workarounds or actions users can take]

We sincerely apologize for the inconvenience and appreciate your patience.

Updates: [Link to status page]
Support: support@flamoral.com

The Flamoral Team
```

### Executive Summary Template

```markdown
EXECUTIVE INCIDENT BRIEF

Incident: [Title]
Severity: [P1/P2/P3/P4]
Duration: [Start - End]
Status: [Open/Resolved]

BUSINESS IMPACT:
- Users Affected: [Number/Percentage]
- Revenue Impact: [Estimated $]
- Reputation Impact: [High/Medium/Low]

ROOT CAUSE:
[1-2 sentence explanation]

RESOLUTION:
[What was done to fix it]

TIMELINE:
[Key milestones]

PREVENTIVE MEASURES:
[What we're doing to prevent recurrence]

NEXT STEPS:
- Post-incident review scheduled: [Date]
- Action items: [Number]
- Responsible: [Team/Person]
```

## Investigation Process

### Data Collection

#### 1. Application Metrics
```bash
# Request rate
az monitor metrics list \
  --resource $APP_INSIGHTS_ID \
  --metric 'requests/count' \
  --interval PT1M

# Response time
az monitor metrics list \
  --resource $APP_INSIGHTS_ID \
  --metric 'requests/duration' \
  --interval PT1M

# Error rate
az monitor metrics list \
  --resource $APP_INSIGHTS_ID \
  --metric 'requests/failed' \
  --interval PT1M

# Dependency failures
az monitor app-insights query \
  --app datingapp-prod-appinsights \
  --analytics-query '
    dependencies
    | where timestamp > ago(1h)
    | where success == false
    | summarize count() by target, resultCode
  '
```

#### 2. Infrastructure Metrics
```bash
# Pod resource usage
kubectl top pods -n datingapp

# Node resource usage
kubectl top nodes

# PVC usage
kubectl get pvc -n datingapp

# Network policies
kubectl get networkpolicies -n datingapp
```

#### 3. Database Health
```bash
# Connection count
kubectl exec -n datingapp deployment/postgres-primary -- \
  psql -U psqladmin -d datingapp -c \
  "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

# Long-running queries
kubectl exec -n datingapp deployment/postgres-primary -- \
  psql -U psqladmin -d datingapp -c \
  "SELECT pid, age(clock_timestamp(), query_start), usename, query
   FROM pg_stat_activity
   WHERE state != 'idle'
   AND query_start < now() - interval '5 minutes'
   ORDER BY query_start;"

# Replication lag
kubectl exec -n datingapp deployment/postgres-primary -- \
  psql -U psqladmin -d datingapp -c \
  "SELECT client_addr, state, sync_state,
   pg_wal_lsn_diff(sent_lsn, replay_lsn) as lag_bytes
   FROM pg_stat_replication;"
```

#### 4. Cache Status
```bash
# Redis info
kubectl exec -n datingapp deployment/redis-master -- redis-cli INFO

# Memory usage
kubectl exec -n datingapp deployment/redis-master -- \
  redis-cli INFO memory | grep used_memory_human

# Eviction rate
kubectl exec -n datingapp deployment/redis-master -- \
  redis-cli INFO stats | grep evicted_keys
```

### Root Cause Analysis

#### 5 Whys Technique
```markdown
1. Why did the service fail?
   → Because the database connections were exhausted

2. Why were database connections exhausted?
   → Because connection pooling was not configured properly

3. Why was connection pooling not configured?
   → Because the configuration was not updated after last deployment

4. Why was the configuration not updated?
   → Because the deployment checklist was not followed

5. Why was the checklist not followed?
   → Because it was not enforced in the CI/CD pipeline
```

## Resolution and Recovery

### Recovery Procedures

#### Database Recovery
See: `DATABASE_FAILOVER_RUNBOOK.md`

#### Service Restart
See: `SERVICE_RESTART_PROCEDURES.md`

#### Data Recovery
See: `DATA_RECOVERY_RUNBOOK.md`

#### Scaling
See: `EMERGENCY_SCALING_RUNBOOK.md`

### Verification Steps

#### 1. Health Checks
```bash
# Application health
kubectl exec -n datingapp deployment/dating-api -- \
  curl -s localhost:8080/health | jq

# Database connectivity
kubectl exec -n datingapp deployment/dating-api -- \
  curl -s localhost:8080/health/database | jq

# Redis connectivity
kubectl exec -n datingapp deployment/dating-api -- \
  curl -s localhost:8080/health/redis | jq

# External dependencies
kubectl exec -n datingapp deployment/dating-api -- \
  curl -s localhost:8080/health/dependencies | jq
```

#### 2. End-to-End Tests
```bash
# Run smoke tests
cd tests/smoke
npm test

# Check critical user journeys
curl -X POST https://api.flamoral.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "test123"}'

# Verify matching service
curl https://api.flamoral.com/v1/matches \
  -H "Authorization: Bearer $TEST_TOKEN"

# Verify messaging
curl https://api.flamoral.com/v1/messages \
  -H "Authorization: Bearer $TEST_TOKEN"
```

#### 3. Monitoring Verification
```bash
# Check error rate normalized
az monitor metrics list \
  --resource $APP_INSIGHTS_ID \
  --metric 'requests/failed' \
  --interval PT5M

# Verify response times
az monitor metrics list \
  --resource $APP_INSIGHTS_ID \
  --metric 'requests/duration' \
  --aggregation Average \
  --interval PT5M
```

## Post-Incident Review

### Timeline Documentation

Create detailed timeline in incident channel:
```markdown
INCIDENT TIMELINE

Detection:
14:30:00 UTC - First alert triggered
14:30:15 UTC - PagerDuty notification sent
14:30:45 UTC - On-call engineer acknowledged

Investigation:
14:32:00 UTC - Initial triage started
14:35:00 UTC - Root cause identified
14:36:00 UTC - Incident commander assigned

Mitigation:
14:40:00 UTC - Fix deployed to production
14:42:00 UTC - Services restarted
14:45:00 UTC - Health checks passing

Recovery:
14:50:00 UTC - All services restored
14:55:00 UTC - Monitoring confirmed normal
15:00:00 UTC - Incident declared resolved

Total Duration: 30 minutes
Detection to Resolution: 30 minutes
Mean Time to Detect (MTTD): <1 minute
Mean Time to Resolve (MTTR): 30 minutes
```

### Post-Mortem Meeting

**Schedule within 48 hours of incident resolution**

#### Agenda
1. Incident timeline review (10 min)
2. What went well (10 min)
3. What went wrong (15 min)
4. Root cause analysis (15 min)
5. Action items (10 min)

#### Attendees
- Incident Commander (required)
- On-call engineers involved (required)
- Engineering Manager (required)
- Product Manager (if user-facing)
- Customer Support lead (if customer impact)

### Post-Mortem Document Template

```markdown
# Post-Mortem: [Incident Title]

Date: [YYYY-MM-DD]
Authors: [Names]
Reviewers: [Names]

## Summary
[2-3 sentence summary of what happened]

## Impact
- Duration: [X hours Y minutes]
- Users affected: [Number/Percentage]
- Services affected: [List]
- Revenue impact: [Amount]
- Support tickets: [Number]

## Timeline
[Detailed timeline from detection to resolution]

## Root Cause
[Detailed explanation of root cause]

## Detection
How was the incident detected?
[Description]

Why did it take X minutes to detect?
[Analysis]

## Resolution
What steps were taken to resolve?
[Detailed steps]

What could have been done faster?
[Analysis]

## What Went Well
- [Item 1]
- [Item 2]
- [Item 3]

## What Went Wrong
- [Item 1]
- [Item 2]
- [Item 3]

## Action Items
| Action | Owner | Priority | Due Date | Status |
|--------|-------|----------|----------|--------|
| [Action 1] | @person | P1 | 2025-12-20 | Open |
| [Action 2] | @person | P2 | 2025-12-25 | Open |

## Lessons Learned
[Key takeaways]

## Related Incidents
- [Link to similar incident 1]
- [Link to similar incident 2]
```

### Action Item Tracking

```bash
# Create GitHub issues for action items
gh issue create \
  --title "Post-incident: Improve database connection pooling" \
  --body "From incident #123: Configure proper connection pooling to prevent exhaustion" \
  --label "incident-followup,priority-high" \
  --assignee @engineer

# Track in project board
gh project item-add PROJECT_NUMBER --url ISSUE_URL
```

## Recovery Objectives

### Recovery Time Objective (RTO)

**Maximum acceptable downtime before business impact becomes critical**

| Service | P1 RTO | P2 RTO | P3 RTO | P4 RTO |
|---------|--------|--------|--------|--------|
| API Service | 1 hour | 4 hours | 8 hours | 24 hours |
| Database | 30 min | 2 hours | 4 hours | 8 hours |
| Real-time Messaging | 1 hour | 4 hours | 8 hours | 24 hours |
| Photo Storage | 2 hours | 8 hours | 16 hours | 48 hours |
| Admin Panel | 4 hours | 8 hours | 16 hours | 72 hours |
| Analytics | 24 hours | 48 hours | 96 hours | 1 week |

### Recovery Point Objective (RPO)

**Maximum acceptable data loss**

| Data Type | RPO | Backup Frequency | Retention |
|-----------|-----|------------------|-----------|
| User Profiles | 5 minutes | Continuous WAL | 30 days |
| Messages | 5 minutes | Continuous WAL | 30 days |
| Matches | 15 minutes | Every 15 min | 30 days |
| Photos | 1 hour | Hourly snapshot | 90 days |
| Analytics | 24 hours | Daily backup | 365 days |
| Configuration | 0 (no loss) | Git versioned | Infinite |

### Service Level Objectives (SLO)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Availability | 99.9% | Monthly uptime |
| API Latency (p95) | <500ms | Per endpoint |
| Error Rate | <0.1% | 5-minute window |
| Database Query Time (p99) | <100ms | Per query type |
| Message Delivery | <2 seconds | End-to-end |

## Contact Information

### On-Call Rotation

**Primary On-Call:** Check PagerDuty schedule
**Secondary On-Call:** Check PagerDuty schedule
**Incident Commander:** Check weekly rotation

### Escalation Contacts

| Role | Contact Method | Response Time |
|------|---------------|---------------|
| On-Call Engineer | PagerDuty | Immediate |
| Engineering Manager | Slack + Phone | 15 minutes |
| VP Engineering | Slack + Phone | 30 minutes |
| CTO | Phone | 1 hour |
| CEO | Phone | 1 hour (P1 only) |

### Team Contacts

| Team | Slack Channel | Email |
|------|--------------|-------|
| DevOps/SRE | #team-devops | devops@flamoral.com |
| Backend Engineering | #team-backend | backend@flamoral.com |
| Frontend Engineering | #team-frontend | frontend@flamoral.com |
| Security | #team-security | security@flamoral.com |
| Customer Support | #team-support | support@flamoral.com |

### Vendor Support

| Vendor | Service | Contact | SLA |
|--------|---------|---------|-----|
| Microsoft Azure | Cloud Infrastructure | Premier Support Portal | 15 min (Severity A) |
| PagerDuty | Incident Management | support@pagerduty.com | 1 hour |
| Datadog | Monitoring | support@datadoghq.com | 2 hours |
| GitHub | Code Repository | enterprise@github.com | 4 hours |

### External Resources

- **Status Page:** https://status.flamoral.com
- **Runbook Repository:** https://github.com/flamoral/runbooks
- **Documentation:** https://docs.flamoral.com
- **Architecture Diagrams:** https://diagrams.flamoral.com
- **Post-Mortems:** https://github.com/flamoral/post-mortems

## Appendix

### Common Issues Quick Reference

| Symptom | Likely Cause | Quick Fix | Runbook |
|---------|--------------|-----------|---------|
| 503 Service Unavailable | Pod crashes | Restart deployment | SERVICE_RESTART_PROCEDURES.md |
| High latency | Resource exhaustion | Scale up pods | EMERGENCY_SCALING_RUNBOOK.md |
| Database connection errors | Connection pool exhausted | Restart app pods | SERVICE_RESTART_PROCEDURES.md |
| Redis connection errors | Redis out of memory | Clear cache/scale Redis | CACHE_MANAGEMENT_RUNBOOK.md |
| SSL certificate errors | Certificate expired | Renew certificate | NETWORK_TROUBLESHOOTING_RUNBOOK.md |
| Deployment failures | Config mismatch | Rollback deployment | Rollback procedure |

### Incident Retrospective Metrics

Track these metrics for continuous improvement:

- **MTTD (Mean Time to Detect):** Target <5 minutes
- **MTTR (Mean Time to Resolve):** Target <1 hour for P1
- **MTTA (Mean Time to Acknowledge):** Target <2 minutes
- **Incident Frequency:** Track weekly/monthly trends
- **Recurring Incidents:** Identify patterns
- **Action Item Completion Rate:** Target >90% within SLA

### Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-12-17 | DevOps Team | Initial creation |

---

**Document Status:** Active
**Next Review Date:** 2026-01-17
**Document Owner:** SRE Team Lead
