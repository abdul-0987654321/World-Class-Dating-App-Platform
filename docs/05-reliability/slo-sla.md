# Service Level Objectives (SLOs) and Service Level Agreements (SLAs)

## Overview

This document defines the reliability targets for the Flamoral platform. SLOs are internal targets; SLAs are external commitments.

## Availability SLOs

### Overall Platform

| Metric | Target | Measurement |
|--------|--------|-------------|
| Uptime | 99.9% | Monthly |
| Error Rate | < 0.1% | 5xx responses / total requests |
| Degraded Mode | < 1% | Partial functionality available |

### Per-Service Targets

| Service | Availability | Notes |
|---------|--------------|-------|
| API Gateway | 99.95% | Critical path |
| Auth Service | 99.95% | Critical path |
| Profile Service | 99.9% | Core functionality |
| Discovery Service | 99.5% | Can queue requests |
| Matching Service | 99.5% | Can queue requests |
| Messaging Service | 99.9% | Core functionality |
| Call Service | 99.5% | Premium feature |
| Payment Service | 99.95% | Revenue critical |
| Verification Service | 99.5% | Can queue requests |
| Media Service | 99.5% | CDN provides caching |

## Latency SLOs

### API Response Times

| Endpoint Category | p50 | p95 | p99 |
|-------------------|-----|-----|-----|
| Auth (login/register) | 100ms | 300ms | 500ms |
| Profile read | 50ms | 150ms | 300ms |
| Profile write | 100ms | 300ms | 500ms |
| Discovery feed | 150ms | 400ms | 800ms |
| Like/Pass/Super-Like | 100ms | 250ms | 400ms |
| Message send | 100ms | 300ms | 500ms |
| Message list | 100ms | 300ms | 500ms |
| Match list | 100ms | 300ms | 500ms |
| Media upload | 500ms | 2000ms | 5000ms |
| Verification status | 50ms | 150ms | 300ms |
| Subscription status | 50ms | 150ms | 300ms |

### Real-Time Latency

| Feature | Target | Measurement |
|---------|--------|-------------|
| Message delivery | < 500ms | Time from send to recipient notification |
| Typing indicator | < 200ms | Time from keystroke to display |
| Call signaling | < 1000ms | Time from request to ring |
| Presence update | < 2000ms | Time from status change to propagation |

### Background Job Latency

| Worker | Target Processing Time | Max Retry Delay |
|--------|------------------------|-----------------|
| Match creation | < 5 seconds | 1 minute |
| Message delivery | < 2 seconds | 30 seconds |
| Verification processing | < 5 minutes | 30 minutes |
| Subscription sync | < 30 seconds | 5 minutes |
| Notification send | < 10 seconds | 2 minutes |

## Throughput SLOs

### API Throughput

| Endpoint | Requests/Second | Per User Limit |
|----------|-----------------|----------------|
| Discovery feed | 1000 | 10/minute |
| Like/Pass | 500 | Tier-based daily |
| Message send | 2000 | 100/minute |
| Media upload | 100 | 20/hour |
| General API | 5000 | 100/minute |

### Background Processing

| Worker | Jobs/Second | Max Queue Depth |
|--------|-------------|-----------------|
| Match creation | 100 | 10,000 |
| Message delivery | 500 | 50,000 |
| Notifications | 200 | 100,000 |

## Data Durability

| Data Type | Durability | Recovery Point Objective (RPO) |
|-----------|------------|-------------------------------|
| User accounts | 99.999999999% | 0 (synchronous replication) |
| Messages | 99.99% | 5 minutes |
| Media files | 99.999999999% | 0 (Azure Blob) |
| Audit logs | 99.999999999% | 0 |
| Analytics | 99.9% | 1 hour |

## Recovery Objectives

| Scenario | Recovery Time Objective (RTO) | Recovery Point Objective (RPO) |
|----------|-------------------------------|-------------------------------|
| Single service failure | 2 minutes | 0 |
| Database failover | 5 minutes | 0 |
| Full region failure | 30 minutes | 5 minutes |
| Data corruption | 1 hour | 24 hours |
| Security incident | 15 minutes | 0 |

## Error Budgets

### Calculation

```
Error Budget = 100% - SLO Target

Example for 99.9% availability:
- Error budget = 0.1%
- Monthly: 0.1% * 43,200 minutes = 43.2 minutes of downtime allowed
- Quarterly: 0.1% * 129,600 minutes = 129.6 minutes allowed
```

### Per-Service Error Budgets (Monthly)

| Service | SLO | Error Budget | Downtime Allowed |
|---------|-----|--------------|------------------|
| API Gateway | 99.95% | 0.05% | 21.6 minutes |
| Auth Service | 99.95% | 0.05% | 21.6 minutes |
| Messaging | 99.9% | 0.1% | 43.2 minutes |
| Discovery | 99.5% | 0.5% | 216 minutes |

### Error Budget Policy

| Budget Remaining | Action |
|------------------|--------|
| > 50% | Normal development velocity |
| 25-50% | Prioritize reliability work |
| 10-25% | Feature freeze, focus on stability |
| < 10% | All hands on reliability |
| Exhausted | Rollback recent changes, incident review |

## SLA Commitments (Customer-Facing)

### Premium Tier SLA

| Metric | Commitment | Credits |
|--------|------------|---------|
| Monthly Uptime | 99.9% | Pro-rated refund below target |
| Message Delivery | 99.9% | - |
| Support Response | 4 hours | - |

### Credit Schedule

| Uptime | Credit |
|--------|--------|
| < 99.9% | 10% |
| < 99.5% | 25% |
| < 99.0% | 50% |
| < 95.0% | 100% |

### Exclusions

- Scheduled maintenance (with 24-hour notice)
- Force majeure events
- Customer-caused issues
- Third-party service outages (Stripe, Twilio, etc.)

## Monitoring and Alerting

### SLO Dashboards

Each service has a dashboard showing:
- Current SLO status (green/yellow/red)
- Error budget remaining
- Trend over time
- Active incidents

### Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Error rate | > 0.5% | > 1% |
| Latency p99 | > 2x target | > 5x target |
| Error budget burn | > 2x normal | > 10x normal |
| Queue depth | > 50% max | > 80% max |

### Burn Rate Alerting

```
Fast burn: Error budget consumed at 14.4x normal rate
  - Alert after 1 hour
  - 5% budget consumed in 1 hour

Slow burn: Error budget consumed at 2x normal rate
  - Alert after 6 hours
  - 2.5% budget consumed in 6 hours
```

## Incident Response SLOs

| Severity | Response Time | Resolution Time |
|----------|---------------|-----------------|
| SEV-1 | 5 minutes | 4 hours |
| SEV-2 | 30 minutes | 8 hours |
| SEV-3 | 4 hours | 72 hours |
| SEV-4 | 24 hours | 2 weeks |

## Review Cadence

| Review | Frequency | Participants |
|--------|-----------|--------------|
| SLO Dashboard | Daily | On-call engineer |
| Error Budget | Weekly | Engineering lead |
| SLO Targets | Quarterly | Engineering + Product |
| SLA Review | Annually | Engineering + Legal + Product |

## Capacity Planning

### Current Capacity

| Resource | Current | Peak Usage | Headroom |
|----------|---------|------------|----------|
| API pods | 10 | 60% | 40% |
| Database connections | 200 | 70% | 30% |
| Redis memory | 8GB | 50% | 50% |
| Message queue | 100k msgs | 20% | 80% |

### Scaling Triggers

| Metric | Scale Up | Scale Down |
|--------|----------|------------|
| CPU usage | > 70% | < 30% |
| Memory usage | > 80% | < 40% |
| Request queue | > 100 | < 10 |
| Response time | > p95 target | < p50 target |
