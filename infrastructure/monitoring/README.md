# Flamoral Observability Stack

## Overview

This directory contains monitoring and observability configuration for the Flamoral dating platform deployed on Vercel (frontend) and Railway (backend).

## Architecture

```
                    Flamoral Services
                          |
         +----------------+----------------+
         |                |                |
      Vercel           Railway          External
    (Frontend)        (Backend)         Services
         |                |                |
         v                v                v
    +------------------------------------------+
    |           Observability Layer            |
    |  +--------+  +--------+  +----------+   |
    |  | Sentry |  | Uptime |  | Grafana  |   |
    |  | Errors |  | Checks |  | Metrics  |   |
    |  +--------+  +--------+  +----------+   |
    +------------------------------------------+
                      |
                      v
              Alert Channels
         (Slack, Discord, Email)
```

## Components

### 1. Error Tracking (Sentry)

Already configured in the application:

- Frontend: `apps/web-app/` with `VITE_SENTRY_DSN`
- Backend: Each service with `SENTRY_DSN`

### 2. Uptime Monitoring

Configure with one of these services (free tiers available):

#### Better Uptime (Recommended)

1. Sign up at https://betteruptime.com
2. Add monitors for:
   - `https://flamoral.com` (Frontend)
   - `https://api.flamoral.com/health` (API)
3. Configure alert policies

#### UptimeRobot

1. Sign up at https://uptimerobot.com
2. Add HTTP(s) monitors
3. Set check interval to 5 minutes

See `uptime-config.json` for monitor definitions.

### 3. Metrics & Dashboards

#### Grafana Cloud (Free Tier)

1. Sign up at https://grafana.com/products/cloud/
2. Create a Prometheus data source
3. Import dashboards

#### Railway Metrics

Railway provides built-in metrics:

- CPU usage
- Memory usage
- Network I/O
- Request counts

Access via Railway Dashboard > Service > Metrics

### 4. Log Aggregation

#### Option A: Railway Logs

- Built-in log viewer
- Log search and filtering
- Real-time streaming

#### Option B: External (Grafana Loki)

- Configure log shipping
- Centralized log search
- Log-based alerts

## Configuration Files

| File                   | Purpose                        |
| ---------------------- | ------------------------------ |
| `uptime-config.json`   | Uptime monitor definitions     |
| `alerting-config.json` | Alert rules and thresholds     |
| `health-check.sh`      | Manual health check script     |
| `metrics-exporter.ts`  | Prometheus metrics for Node.js |

## Quick Setup

### 1. Configure Uptime Monitoring

```bash
# Using Better Uptime API
curl -X POST https://betteruptime.com/api/v2/monitors \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d @uptime-config.json
```

### 2. Set Up Alerting

1. Create Slack webhook: https://api.slack.com/messaging/webhooks
2. Update `alerting-config.json` with webhook URL
3. Test alert delivery

### 3. Configure Grafana Dashboard

1. Create Grafana Cloud account
2. Add Prometheus data source
3. Import Node.js dashboard (ID: 11159)

## Health Endpoints

| Service   | Endpoint                        | Expected Response |
| --------- | ------------------------------- | ----------------- |
| Frontend  | https://flamoral.com            | 200 OK            |
| API       | https://api.flamoral.com/health | 200 OK, JSON      |
| WebSocket | wss://api.flamoral.com/ws       | Upgrade 101       |

## Alert Thresholds

| Metric        | Warning | Critical |
| ------------- | ------- | -------- |
| Response Time | > 1s    | > 3s     |
| Error Rate    | > 1%    | > 5%     |
| CPU Usage     | > 70%   | > 90%    |
| Memory Usage  | > 80%   | > 95%    |
| Uptime        | < 99.9% | < 99%    |

## Runbooks

### High Error Rate

1. Check Sentry for error details
2. Review recent deployments
3. Check external service status
4. Rollback if necessary

### High Response Time

1. Check Railway metrics for CPU/memory
2. Review database query performance
3. Check for traffic spikes
4. Scale services if needed

### Service Down

1. Check Railway service status
2. Review deployment logs
3. Verify database connectivity
4. Check DNS resolution

## Integration with CI/CD

The monitoring stack integrates with GitHub Actions:

1. **Pre-deployment**: Health checks before deploy
2. **Post-deployment**: Smoke tests verify health
3. **Alerting**: Deployment notifications

## Cost Estimation

| Service       | Free Tier    | Paid Tier |
| ------------- | ------------ | --------- |
| Sentry        | 5k events/mo | $26/mo    |
| Better Uptime | 10 monitors  | $20/mo    |
| Grafana Cloud | 10k metrics  | $50/mo    |
| Railway       | Included     | -         |

**Recommended Start**: Use free tiers of all services.
