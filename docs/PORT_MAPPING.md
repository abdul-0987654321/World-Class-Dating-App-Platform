# Flamoral Platform - Service Port Mapping

**Version:** 1.0.0
**Last Updated:** 2026-01-10
**Total Services:** 27

---

## Port Assignment Overview

All 27 microservices are assigned consecutive ports from **3000 to 3026** for easy management and consistent routing.

---

## Complete Service Port Mapping

| Port | Service | API Path | CPU | Memory | Description |
|------|---------|----------|-----|--------|-------------|
| 3000 | api-gateway | `/api/*` | 256 | 512 | Entry point, routing, rate limiting |
| 3001 | auth-service | `/api/auth/*` | 256 | 512 | Authentication, JWT, OAuth 2.0, MFA |
| 3002 | user-service | `/api/users/*` | 256 | 512 | User account management |
| 3003 | profile-service | `/api/profiles/*` | 256 | 512 | Profile data, photos, preferences |
| 3004 | matching-service | `/api/matching/*` | 512 | 1024 | Discovery, swipes, matches, AI matching |
| 3005 | messaging-service | `/api/messages/*` | 256 | 512 | Real-time chat, WebSocket |
| 3006 | notification-service | `/api/notifications/*` | 256 | 512 | Push, email, SMS notifications |
| 3007 | payment-service | `/api/payments/*` | 256 | 512 | Stripe integration, payments |
| 3008 | subscription-service | `/api/subscriptions/*` | 256 | 512 | Premium tiers, billing cycles |
| 3009 | media-service | `/api/media/*` | 512 | 1024 | Photo/video upload, processing |
| 3010 | moderation-service | `/api/moderation/*` | 512 | 1024 | AI content moderation, CSAM detection |
| 3011 | analytics-service | `/api/analytics/*` | 256 | 512 | Usage analytics, dashboards |
| 3012 | recommendation-service | `/api/recommendations/*` | 512 | 1024 | AI-powered recommendations |
| 3013 | search-service | `/api/search/*` | 256 | 512 | User discovery, advanced filters |
| 3014 | location-service | `/api/location/*` | 256 | 512 | Geolocation, proximity matching |
| 3015 | verification-service | `/api/verification/*` | 256 | 512 | Identity verification, face matching |
| 3016 | report-service | `/api/reports/*` | 256 | 512 | User reports, safety flags |
| 3017 | admin-service | `/api/admin/*` | 256 | 512 | Admin dashboard, user management |
| 3018 | webhook-service | `/api/webhooks/*` | 256 | 512 | External integrations, callbacks |
| 3019 | scheduler-service | `/api/scheduler/*` | 256 | 512 | Scheduled jobs, cron tasks |
| 3020 | worker-service | (internal) | 256 | 512 | Background job processing |
| 3021 | email-service | `/api/email/*` | 256 | 512 | Email delivery via SES |
| 3022 | realtime-service | `/api/realtime/*` | 256 | 512 | WebSocket hub, presence |
| 3023 | workflow-engine | `/api/workflows/*` | 256 | 512 | Business workflow orchestration |
| 3024 | automation-service | `/api/automation/*` | 256 | 512 | Automated actions, triggers |
| 3025 | advertising-service | `/api/advertising/*` | 256 | 512 | Ad campaigns, targeting |
| 3026 | partnership-service | `/api/partnerships/*` | 256 | 512 | Partner integrations, affiliates |

---

## Service Categories

### Core Services (Ports 3000-3005)

| Port | Service | Purpose |
|------|---------|---------|
| 3000 | api-gateway | Request routing, authentication validation |
| 3001 | auth-service | User authentication, token management |
| 3002 | user-service | User account CRUD operations |
| 3003 | profile-service | Dating profile management |
| 3004 | matching-service | Swipe, match, and discovery logic |
| 3005 | messaging-service | Real-time chat and media messages |

### Communication Services (Ports 3006, 3021-3022)

| Port | Service | Purpose |
|------|---------|---------|
| 3006 | notification-service | Push notifications, email, SMS |
| 3021 | email-service | Transactional email via AWS SES |
| 3022 | realtime-service | WebSocket connections, presence |

### Monetization Services (Ports 3007-3008, 3025)

| Port | Service | Purpose |
|------|---------|---------|
| 3007 | payment-service | Payment processing via Stripe |
| 3008 | subscription-service | Premium tier management |
| 3025 | advertising-service | In-app advertising |

### AI/ML Services (Ports 3010, 3012)

| Port | Service | Purpose |
|------|---------|---------|
| 3010 | moderation-service | AI content moderation (Rekognition, Bedrock) |
| 3012 | recommendation-service | ML-based user recommendations |

### Safety & Trust Services (Ports 3010, 3015-3016)

| Port | Service | Purpose |
|------|---------|---------|
| 3010 | moderation-service | Content review, deepfake detection |
| 3015 | verification-service | Photo verification, identity check |
| 3016 | report-service | User reports, block/ban management |

### Administration Services (Ports 3011, 3017)

| Port | Service | Purpose |
|------|---------|---------|
| 3011 | analytics-service | Usage metrics, business dashboards |
| 3017 | admin-service | Admin portal, user management |

### Background Services (Ports 3019-3020, 3023-3024)

| Port | Service | Purpose |
|------|---------|---------|
| 3019 | scheduler-service | Cron-like scheduled tasks |
| 3020 | worker-service | Async job processing |
| 3023 | workflow-engine | Multi-step workflow orchestration |
| 3024 | automation-service | Event-driven automations |

### Integration Services (Ports 3018, 3026)

| Port | Service | Purpose |
|------|---------|---------|
| 3018 | webhook-service | Incoming/outgoing webhooks |
| 3026 | partnership-service | Third-party integrations |

---

## ALB Routing Rules

Path-based routing is configured on the Application Load Balancer with priority-based rules:

| Priority | Path Pattern | Target Service | Port |
|----------|--------------|----------------|------|
| 1 | `/api/*` | api-gateway | 3000 |
| 10 | `/api/auth/*` | auth-service | 3001 |
| 11 | `/api/users/*` | user-service | 3002 |
| 12 | `/api/profiles/*` | profile-service | 3003 |
| 13 | `/api/matching/*` | matching-service | 3004 |
| 14 | `/api/messages/*` | messaging-service | 3005 |
| 15 | `/api/notifications/*` | notification-service | 3006 |
| 16 | `/api/payments/*` | payment-service | 3007 |
| 17 | `/api/subscriptions/*` | subscription-service | 3008 |
| 18 | `/api/media/*` | media-service | 3009 |
| 19 | `/api/moderation/*` | moderation-service | 3010 |
| 20 | `/api/analytics/*` | analytics-service | 3011 |
| 21 | `/api/recommendations/*` | recommendation-service | 3012 |
| 22 | `/api/search/*` | search-service | 3013 |
| 23 | `/api/location/*` | location-service | 3014 |
| 24 | `/api/verification/*` | verification-service | 3015 |
| 25 | `/api/reports/*` | report-service | 3016 |
| 26 | `/api/admin/*` | admin-service | 3017 |
| 27 | `/api/webhooks/*` | webhook-service | 3018 |
| 28 | `/api/scheduler/*` | scheduler-service | 3019 |
| 30 | `/api/email/*` | email-service | 3021 |
| 31 | `/api/realtime/*` | realtime-service | 3022 |
| 32 | `/api/workflows/*` | workflow-engine | 3023 |
| 33 | `/api/automation/*` | automation-service | 3024 |
| 34 | `/api/advertising/*` | advertising-service | 3025 |
| 35 | `/api/partnerships/*` | partnership-service | 3026 |

**Note:** worker-service (port 3020) has no external path as it only processes internal queue messages.

---

## Service Discovery

Internal service-to-service communication uses AWS Cloud Map:

| Service | DNS Name |
|---------|----------|
| api-gateway | api-gateway.flamoral.local:3000 |
| auth-service | auth-service.flamoral.local:3001 |
| user-service | user-service.flamoral.local:3002 |
| profile-service | profile-service.flamoral.local:3003 |
| matching-service | matching-service.flamoral.local:3004 |
| messaging-service | messaging-service.flamoral.local:3005 |
| notification-service | notification-service.flamoral.local:3006 |
| payment-service | payment-service.flamoral.local:3007 |
| subscription-service | subscription-service.flamoral.local:3008 |
| media-service | media-service.flamoral.local:3009 |
| moderation-service | moderation-service.flamoral.local:3010 |
| analytics-service | analytics-service.flamoral.local:3011 |
| recommendation-service | recommendation-service.flamoral.local:3012 |
| search-service | search-service.flamoral.local:3013 |
| location-service | location-service.flamoral.local:3014 |
| verification-service | verification-service.flamoral.local:3015 |
| report-service | report-service.flamoral.local:3016 |
| admin-service | admin-service.flamoral.local:3017 |
| webhook-service | webhook-service.flamoral.local:3018 |
| scheduler-service | scheduler-service.flamoral.local:3019 |
| worker-service | worker-service.flamoral.local:3020 |
| email-service | email-service.flamoral.local:3021 |
| realtime-service | realtime-service.flamoral.local:3022 |
| workflow-engine | workflow-engine.flamoral.local:3023 |
| automation-service | automation-service.flamoral.local:3024 |
| advertising-service | advertising-service.flamoral.local:3025 |
| partnership-service | partnership-service.flamoral.local:3026 |

---

## Health Check Endpoints

All services expose health endpoints on their respective ports:

| Endpoint | Path | Expected Response |
|----------|------|-------------------|
| Liveness | `/health` | `200 OK` |
| Readiness | `/health/ready` | `200 OK` |
| Metrics | `/metrics` | Prometheus format |

Health check configuration in ALB:
- **Path:** `/health`
- **Interval:** 30 seconds
- **Timeout:** 5 seconds
- **Healthy threshold:** 2
- **Unhealthy threshold:** 3
- **Success code:** 200

---

## Resource Allocation Summary

| Resource Level | CPU | Memory | Services |
|----------------|-----|--------|----------|
| Standard | 256 | 512 MB | 23 services |
| Enhanced | 512 | 1024 MB | 4 services (matching, media, moderation, recommendation) |

Enhanced resources are allocated to CPU/memory-intensive AI/ML workloads.

---

## Quick Reference

```bash
# Get all service ports
for i in {3000..3026}; do echo "Port $i: $(grep -E "port = $i" main.tf | head -1)"; done

# Check service health
curl http://localhost:3001/health  # auth-service
curl http://localhost:3004/health  # matching-service

# List all ECS services with ports
aws ecs list-services --cluster flamoral-prod-ecs | jq -r '.serviceArns[]'
```

---

*Document Version: 1.0.0 | Last Updated: 2026-01-10*
*Total: 27 microservices on ports 3000-3026*
