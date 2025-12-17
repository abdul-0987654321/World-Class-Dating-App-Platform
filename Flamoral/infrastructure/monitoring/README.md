# Flamoral Dating Platform - Production Monitoring Stack

Comprehensive monitoring and alerting setup for the Flamoral Dating Platform production environment.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Components](#components)
4. [Prerequisites](#prerequisites)
5. [Deployment](#deployment)
6. [Configuration](#configuration)
7. [Dashboards](#dashboards)
8. [Alerting](#alerting)
9. [Maintenance](#maintenance)
10. [Troubleshooting](#troubleshooting)

## Overview

This monitoring stack provides comprehensive observability for the Flamoral Dating Platform including:

- **Metrics Collection**: Prometheus for time-series metrics
- **Log Aggregation**: Loki and Promtail for centralized logging
- **Distributed Tracing**: Jaeger for request tracing across services
- **Visualization**: Grafana dashboards for metrics, logs, and traces
- **Alerting**: Alertmanager with PagerDuty and Slack integration
- **Uptime Monitoring**: Blackbox exporter for external endpoint monitoring
- **Crash Reporting**: Sentry for mobile app crash and error tracking

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Flamoral Monitoring Stack                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Prometheus  │  │     Loki     │  │    Jaeger    │          │
│  │   (Metrics)  │  │    (Logs)    │  │   (Traces)   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                   │
│         └──────────────────┴──────────────────┘                   │
│                            │                                      │
│                    ┌───────▼────────┐                            │
│                    │    Grafana     │                            │
│                    │ (Visualization) │                            │
│                    └────────────────┘                            │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Alertmanager │  │   Blackbox   │  │    Sentry    │          │
│  │  (Alerting)  │  │  (Uptime)    │  │   (Crashes)  │          │
│  └──────┬───────┘  └──────────────┘  └──────────────┘          │
│         │                                                         │
│  ┌──────▼───────┐  ┌──────────────┐                            │
│  │  PagerDuty   │  │    Slack     │                            │
│  └──────────────┘  └──────────────┘                            │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Prometheus
- **Purpose**: Metrics collection and storage
- **Storage**: 500Gi persistent volume
- **Retention**: 30 days
- **Replicas**: 2 (HA setup)
- **Endpoints**:
  - UI: https://prometheus.flamoral.com
  - API: http://prometheus:9090

### 2. Grafana
- **Purpose**: Metrics and logs visualization
- **Storage**: 50Gi persistent volume
- **Replicas**: 2 (HA setup)
- **Endpoints**: https://grafana.flamoral.com
- **Dashboards**:
  - System Overview
  - API Performance
  - Database Performance
  - User Activity
  - Payment & Revenue
  - Error Tracking
  - Security Events

### 3. Loki
- **Purpose**: Log aggregation
- **Storage**: 200Gi persistent volume
- **Retention**: 30 days
- **Replicas**: 2
- **Endpoints**: http://loki:3100

### 4. Promtail
- **Purpose**: Log collection agent
- **Type**: DaemonSet (runs on all nodes)
- **Function**: Collects logs from all pods and nodes

### 5. Jaeger
- **Purpose**: Distributed tracing
- **Storage**: 100Gi persistent volume (Badger DB)
- **Endpoints**: https://jaeger.flamoral.com
- **Protocols**: OTLP, Jaeger, Zipkin

### 6. Alertmanager
- **Purpose**: Alert routing and notification
- **Storage**: 20Gi persistent volume
- **Replicas**: 3 (clustered)
- **Integrations**:
  - PagerDuty (critical alerts)
  - Slack (warnings and info)
  - Email

### 7. Blackbox Exporter
- **Purpose**: External uptime monitoring
- **Replicas**: 2
- **Monitors**:
  - HTTP endpoints
  - TCP connections
  - DNS queries
  - SSL certificates

### 8. Node Exporter
- **Purpose**: Host-level metrics
- **Type**: DaemonSet
- **Metrics**: CPU, memory, disk, network

### 9. Database Exporters
- **PostgreSQL Exporter**: Database metrics
- **Redis Exporter**: Cache metrics
- **MongoDB Exporter**: Document store metrics

### 10. Sentry
- **Purpose**: Mobile app crash reporting
- **Platform**: Sentry.io (SaaS)
- **Projects**:
  - iOS app
  - Android app
  - Web app
  - Backend services

## Prerequisites

Before deploying the monitoring stack, ensure you have:

1. **Kubernetes Cluster**: 1.25+
2. **kubectl**: Configured and connected
3. **Helm** (optional): 3.0+
4. **Storage Class**: `premium-ssd` or equivalent
5. **Ingress Controller**: NGINX ingress
6. **Cert Manager**: For SSL certificates
7. **External Services**:
   - Slack workspace and webhook URLs
   - PagerDuty account and routing keys
   - Sentry.io account (or self-hosted Sentry)

## Deployment

### Quick Start

```bash
# 1. Create monitoring namespace and RBAC
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-rbac.yaml

# 2. Deploy Prometheus
kubectl apply -f k8s/02-prometheus-config.yaml
kubectl apply -f k8s/03-prometheus-deployment.yaml
kubectl apply -f k8s/04-prometheus-rules.yaml

# 3. Deploy Alertmanager
kubectl apply -f k8s/05-alertmanager-deployment.yaml
kubectl apply -f k8s/06-alertmanager-templates.yaml

# 4. Deploy Grafana
kubectl apply -f k8s/07-grafana-deployment.yaml
kubectl apply -f k8s/08-grafana-dashboards-configmap.yaml

# 5. Deploy Loki
kubectl apply -f k8s/09-loki-deployment.yaml

# 6. Deploy Jaeger
kubectl apply -f k8s/10-jaeger-deployment.yaml

# 7. Deploy Uptime Monitoring
kubectl apply -f k8s/11-uptime-monitoring.yaml

# 8. Deploy Node Exporter
kubectl apply -f k8s/12-node-exporter.yaml

# 9. Deploy Database Exporters
kubectl apply -f k8s/13-database-exporters.yaml

# 10. Verify deployment
kubectl get pods -n monitoring
```

### Step-by-Step Deployment

#### 1. Update Secrets

Before deploying, update the following secrets with actual values:

```bash
# Prometheus basic auth
kubectl create secret generic prometheus-basic-auth \
  --from-literal=auth=$(htpasswd -nb admin YOUR_PASSWORD | base64) \
  -n monitoring

# Grafana secrets
kubectl create secret generic grafana-secrets \
  --from-literal=admin-password=YOUR_GRAFANA_PASSWORD \
  --from-literal=secret-key=YOUR_SECRET_KEY \
  --from-literal=db-password=YOUR_DB_PASSWORD \
  -n monitoring

# Alertmanager secrets
kubectl create secret generic alertmanager-secrets \
  --from-literal=slack-webhook-url=YOUR_SLACK_WEBHOOK \
  --from-literal=pagerduty-critical-key=YOUR_PAGERDUTY_KEY \
  -n monitoring

# Sentry DSNs
kubectl create secret generic sentry-dsns \
  --from-literal=ios-dsn=YOUR_IOS_DSN \
  --from-literal=android-dsn=YOUR_ANDROID_DSN \
  -n flamoral-dating
```

#### 2. Configure PagerDuty

1. Create PagerDuty services for:
   - Critical alerts
   - High severity alerts
   - Payment service
   - Auth service
   - Database alerts
   - Security alerts

2. Get routing keys for each service

3. Update `alertmanager-secrets` with routing keys

#### 3. Configure Slack

1. Create Slack channels:
   - `#flamoral-critical` - Critical alerts
   - `#flamoral-alerts` - High severity alerts
   - `#flamoral-warnings` - Warning alerts
   - `#flamoral-infrastructure` - Infrastructure alerts
   - `#flamoral-database` - Database alerts
   - `#flamoral-security` - Security alerts

2. Create incoming webhooks for each channel

3. Update `alertmanager-secrets` with webhook URLs

#### 4. Configure Sentry

1. Create Sentry projects:
   - flamoral-mobile-ios
   - flamoral-mobile-android
   - flamoral-web
   - flamoral-backend

2. Get DSN for each project

3. Update `sentry-dsns` secret

4. Configure Sentry integrations:
   - Slack notifications
   - Email alerts
   - GitHub integration

## Configuration

### Prometheus Configuration

Edit `k8s/02-prometheus-config.yaml` to adjust:
- Scrape intervals
- Retention period
- Remote write endpoints
- Service discovery

### Alert Rules

Alert rules are defined in `k8s/04-prometheus-rules.yaml`:
- Infrastructure alerts
- Service alerts
- Database alerts
- Security alerts
- Payment alerts

To add custom alerts:

```yaml
- alert: CustomAlert
  expr: your_metric > threshold
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Alert summary"
    description: "Alert description"
```

### Grafana Dashboards

Dashboards are located in `grafana/dashboards/`:
- `dating-app-overview.json` - Overall platform health
- `api-dashboard.json` - API performance
- `database-dashboard.json` - Database metrics
- `payment-revenue-dashboard.json` - Payment and revenue
- `error-tracking-dashboard.json` - Error rates and types
- `security-events-dashboard.json` - Security events

To add custom dashboards:
1. Create dashboard in Grafana UI
2. Export as JSON
3. Save to `grafana/dashboards/`
4. Update ConfigMap

## Dashboards

### System Overview Dashboard

**URL**: https://grafana.flamoral.com/d/system-overview

**Panels**:
- Active users
- API request rate
- Error rate
- Response time (p95, p99)
- Database connections
- Cache hit rate
- CPU and memory usage

### API Performance Dashboard

**URL**: https://grafana.flamoral.com/d/api-performance

**Panels**:
- Requests per second by endpoint
- Response time distribution
- Error rate by endpoint
- Status code distribution
- Top slow endpoints
- API gateway throughput

### Database Performance Dashboard

**URL**: https://grafana.flamoral.com/d/database-performance

**Panels**:
- Query performance
- Connection pool usage
- Replication lag
- Slow queries
- Database size
- Cache hit rate

### Payment & Revenue Dashboard

**URL**: https://grafana.flamoral.com/d/payment-revenue

**Panels**:
- Revenue (hourly, daily, weekly, monthly)
- Transaction success rate
- Payment failure rate
- Active subscriptions by tier
- Subscription churn rate
- Stripe webhook activity

### Error Tracking Dashboard

**URL**: https://grafana.flamoral.com/d/error-tracking

**Panels**:
- Overall error rate
- Errors by service
- Error types distribution
- Recent error logs
- Database errors
- Cache errors

### Security Events Dashboard

**URL**: https://grafana.flamoral.com/d/security-events

**Panels**:
- Login failure rate
- Account lockouts
- Unauthorized access attempts
- Failed login attempts by IP
- Rate limit violations
- User reports by type
- Moderation queue depth
- Blocked users and IPs

## Alerting

### Alert Severity Levels

1. **Critical**: Immediate action required (PagerDuty)
   - Service down
   - High error rate (>5%)
   - Database down
   - Payment failures

2. **High**: Urgent attention needed (PagerDuty + Slack)
   - Elevated error rate (>2%)
   - Slow response times
   - Database connection issues

3. **Warning**: Should be addressed (Slack only)
   - High resource usage
   - Approaching limits
   - Performance degradation

### Alert Routing

```
Critical → PagerDuty + Slack (#flamoral-critical)
High     → PagerDuty + Slack (#flamoral-alerts)
Warning  → Slack (#flamoral-warnings)
```

### Runbooks

Runbooks are available at: https://runbooks.flamoral.com

Each alert has a `runbook_url` annotation linking to:
- Diagnostic steps
- Common causes
- Resolution procedures
- Escalation path

## Maintenance

### Regular Tasks

**Daily**:
- Review critical alerts
- Check dashboard anomalies
- Verify backup status

**Weekly**:
- Review alert history
- Analyze performance trends
- Update alert thresholds
- Clean up old incidents

**Monthly**:
- Review retention policies
- Analyze storage usage
- Update dashboards
- Review and update runbooks
- Audit access controls

### Backup and Recovery

**Prometheus**:
```bash
# Backup Prometheus data
kubectl exec -n monitoring prometheus-0 -- tar czf /tmp/backup.tar.gz /prometheus
kubectl cp monitoring/prometheus-0:/tmp/backup.tar.gz ./prometheus-backup.tar.gz
```

**Grafana**:
```bash
# Backup Grafana database and dashboards
kubectl exec -n monitoring grafana-0 -- tar czf /tmp/backup.tar.gz /var/lib/grafana
kubectl cp monitoring/grafana-0:/tmp/backup.tar.gz ./grafana-backup.tar.gz
```

**Loki**:
```bash
# Backup Loki data
kubectl exec -n monitoring loki-0 -- tar czf /tmp/backup.tar.gz /loki
kubectl cp monitoring/loki-0:/tmp/backup.tar.gz ./loki-backup.tar.gz
```

### Scaling

**Horizontal Scaling**:
```bash
# Scale Prometheus
kubectl scale deployment prometheus -n monitoring --replicas=3

# Scale Grafana
kubectl scale deployment grafana -n monitoring --replicas=3

# Scale Alertmanager
kubectl scale deployment alertmanager -n monitoring --replicas=5
```

**Vertical Scaling**:
Edit deployment YAML and update resource limits.

### Upgrading

```bash
# Update Prometheus
kubectl set image deployment/prometheus \
  prometheus=prom/prometheus:v2.50.0 \
  -n monitoring

# Update Grafana
kubectl set image deployment/grafana \
  grafana=grafana/grafana:10.3.0 \
  -n monitoring

# Update Loki
kubectl set image deployment/loki \
  loki=grafana/loki:2.10.0 \
  -n monitoring
```

## Troubleshooting

### Common Issues

#### Prometheus not scraping targets

```bash
# Check Prometheus logs
kubectl logs -n monitoring deployment/prometheus

# Verify service discovery
kubectl get servicemonitors -n monitoring

# Check network policies
kubectl get networkpolicies -n monitoring
```

#### Grafana dashboards not loading

```bash
# Check Grafana logs
kubectl logs -n monitoring deployment/grafana

# Verify datasource configuration
kubectl exec -n monitoring deployment/grafana -- \
  curl http://localhost:3000/api/datasources

# Check database connection
kubectl exec -n monitoring deployment/grafana -- \
  nc -zv postgres 5432
```

#### Alerts not firing

```bash
# Check alert rules
kubectl get prometheusrules -n monitoring

# Verify Alertmanager connectivity
kubectl exec -n monitoring deployment/prometheus -- \
  wget -O- http://alertmanager:9093/-/healthy

# Check Alertmanager logs
kubectl logs -n monitoring deployment/alertmanager
```

#### Loki not receiving logs

```bash
# Check Promtail logs
kubectl logs -n monitoring daemonset/promtail

# Verify Loki connectivity
kubectl exec -n monitoring daemonset/promtail -- \
  wget -O- http://loki:3100/ready

# Check Loki logs
kubectl logs -n monitoring deployment/loki
```

### Debug Commands

```bash
# Get all monitoring resources
kubectl get all -n monitoring

# Check persistent volumes
kubectl get pv,pvc -n monitoring

# View events
kubectl get events -n monitoring --sort-by='.lastTimestamp'

# Port forward to services
kubectl port-forward -n monitoring svc/prometheus 9090:9090
kubectl port-forward -n monitoring svc/grafana 3000:3000
kubectl port-forward -n monitoring svc/alertmanager 9093:9093

# Exec into pods
kubectl exec -it -n monitoring deployment/prometheus -- /bin/sh
```

## Access

### Web UIs

- **Prometheus**: https://prometheus.flamoral.com (admin/flamoral_prom_2025)
- **Grafana**: https://grafana.flamoral.com (admin/flamoral_grafana_admin_2025)
- **Alertmanager**: https://alertmanager.flamoral.com (admin/flamoral_alert_2025)
- **Jaeger**: https://jaeger.flamoral.com (admin/flamoral_jaeger_2025)

### API Endpoints

- **Prometheus**: http://prometheus:9090/api/v1/
- **Loki**: http://loki:3100/loki/api/v1/
- **Jaeger**: http://jaeger-collector:14268/api/
- **Alertmanager**: http://alertmanager:9093/api/v2/

## Security

### Authentication

All monitoring UIs are protected with:
- Basic authentication
- SSL/TLS encryption
- IP whitelisting (optional)

### RBAC

Monitoring components have minimal required permissions:
- Prometheus: Read-only access to Kubernetes API
- Loki: Read-only access to pod logs
- Promtail: Read-only access to node logs

### Network Policies

Network policies restrict:
- Ingress to monitoring namespace
- Egress from monitoring pods
- Cross-namespace communication

## Support

For issues or questions:
- **Email**: devops@flamoral.com
- **Slack**: #flamoral-monitoring
- **PagerDuty**: For critical production issues

## License

Internal use only - Flamoral Dating Platform
