# Flamoral Dating Platform - Operations Alignment

## Overview

This document outlines the alignment of the Flamoral Dating Platform with NetOps, SecOps, AppOps, and DevOps operational procedures and best practices.

---

## 1. NetOps (Network Operations)

### 1.1 Network Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           NETOPS ARCHITECTURE                                     │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  LAYER 7 (Application)                                                          │
│  ├── Azure Front Door (Global Load Balancing)                                   │
│  ├── Application Gateway Ingress Controller                                     │
│  └── NGINX Ingress Controller                                                   │
│                                                                                  │
│  LAYER 4 (Transport)                                                            │
│  ├── Azure Load Balancer (Regional)                                             │
│  ├── Network Security Groups (NSG)                                              │
│  └── Service Mesh (Istio-ready)                                                 │
│                                                                                  │
│  LAYER 3 (Network)                                                              │
│  ├── Virtual Networks (per region)                                              │
│  ├── VNet Peering (cross-region)                                                │
│  └── Private Endpoints                                                          │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Network Policies

| Policy | Description | Implementation |
|--------|-------------|----------------|
| Default Deny | All traffic denied by default | `network-policies.yaml` |
| Ingress Rules | Only allow traffic to exposed services | Port 80/443/8080 |
| Service-to-Service | Internal communication only via ClusterIP | Kubernetes Services |
| Database Access | Only from API pods | Port 5432 (PostgreSQL) |
| Cache Access | Only from authenticated services | Port 6379 (Redis) |

### 1.3 DNS Configuration

```yaml
# DNS Strategy
Primary DNS: Azure Private DNS Zones
  - flamoral.postgres.database.azure.com
  - flamoral.redis.cache.windows.net
  - flamoral.blob.core.windows.net

External DNS: Azure Front Door
  - flamoral.com → Front Door endpoint
  - api.flamoral.com → API Gateway
  - americas.flamoral.com → Americas region
  - eu.flamoral.com → Europe region
  - africa.flamoral.com → Africa region
```

### 1.4 Traffic Management

- **Global Routing**: Azure Front Door with geographic routing
- **Failover**: Automatic failover to healthy regions
- **Health Probes**: HTTP health checks every 30 seconds
- **Connection Draining**: 30-second grace period for graceful shutdown

---

## 2. SecOps (Security Operations)

### 2.1 Security Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           SECOPS ARCHITECTURE                                     │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  PERIMETER SECURITY                                                             │
│  ├── Azure DDoS Protection Standard                                             │
│  ├── Web Application Firewall (OWASP Rules)                                     │
│  ├── Rate Limiting (per user/IP/endpoint)                                       │
│  └── Geographic Filtering                                                       │
│                                                                                  │
│  APPLICATION SECURITY                                                           │
│  ├── JWT Authentication (RS256)                                                 │
│  ├── RBAC (Roles: USER, PREMIUM, VIP, MODERATOR, ADMIN)                        │
│  ├── CSRF Protection (Double-submit cookie)                                     │
│  ├── Security Headers (HSTS, CSP, X-Frame-Options)                             │
│  └── Input Validation (Joi/Zod schemas)                                         │
│                                                                                  │
│  DATA SECURITY                                                                  │
│  ├── Encryption at Rest (AES-256)                                              │
│  ├── Encryption in Transit (TLS 1.3)                                           │
│  ├── Key Management (Azure Key Vault)                                          │
│  └── Secret Rotation (90-day policy)                                           │
│                                                                                  │
│  CONTENT SECURITY                                                               │
│  ├── AI Content Moderation (Azure Content Moderator)                           │
│  ├── Image Moderation (AWS Rekognition)                                        │
│  ├── CSAM Detection                                                             │
│  └── User Reporting System                                                      │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Security Controls

#### Authentication & Authorization

| Control | Implementation | File Location |
|---------|---------------|---------------|
| JWT Auth | Access + Refresh tokens | `api-gateway/src/guards/jwt-auth.guard.ts` |
| Role-Based Access | 5 roles with hierarchy | `api-gateway/src/guards/roles.guard.ts` |
| Subscription Guard | 6-tier access control | `api-gateway/src/guards/subscription.guard.ts` |
| CSRF Protection | 256-bit tokens | `api-gateway/src/middleware/csrf.middleware.ts` |
| 2FA/TOTP | Time-based OTP | `auth-service/src/domain/services/auth.service.ts` |

#### Security Headers

```typescript
// Implemented in security-headers.middleware.ts
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; script-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
```

#### Rate Limiting Configuration

```typescript
// Rate limits by tier (per day)
const rateLimits = {
  FREE: { swipes: 50, superLikes: 1, boosts: 0 },
  BASIC: { swipes: Infinity, superLikes: 5, boosts: 1 },
  PLUS: { swipes: Infinity, superLikes: 10, boosts: 1 },
  PREMIUM: { swipes: Infinity, superLikes: Infinity, boosts: 2 },
  PREMIUM_PLUS: { swipes: Infinity, superLikes: Infinity, boosts: 4 },
  ELITE: { swipes: Infinity, superLikes: Infinity, boosts: 12 }
};
```

### 2.3 Vulnerability Management

- **SAST**: SonarQube scanning in CI/CD pipeline
- **DAST**: OWASP ZAP automated testing
- **Dependency Scanning**: npm audit, Snyk integration
- **Container Scanning**: Trivy for Docker images
- **Penetration Testing**: Annual third-party assessment

### 2.4 Incident Response

```
INCIDENT SEVERITY LEVELS:
├── SEV1 (Critical): Service outage, data breach
│   └── Response: 15 minutes, All-hands response
├── SEV2 (High): Partial outage, security vulnerability
│   └── Response: 1 hour, On-call engineer
├── SEV3 (Medium): Degraded performance, minor security issue
│   └── Response: 4 hours, Next business day
└── SEV4 (Low): Non-critical bugs, cosmetic issues
    └── Response: 24 hours, Sprint planning
```

---

## 3. AppOps (Application Operations)

### 3.1 Application Health Monitoring

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           APPOPS MONITORING                                       │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  HEALTH ENDPOINTS                                                               │
│  ├── /health         → General health check (memory, uptime)                    │
│  ├── /health/ready   → Kubernetes readiness probe                               │
│  ├── /health/live    → Kubernetes liveness probe                                │
│  ├── /health/services → Aggregated service health                               │
│  └── /health/circuits → Circuit breaker status                                  │
│                                                                                  │
│  METRICS COLLECTION                                                             │
│  ├── Prometheus scraping every 15s                                              │
│  ├── Custom business metrics                                                    │
│  ├── Request duration histograms                                                │
│  └── Error rate counters                                                        │
│                                                                                  │
│  ALERTING                                                                       │
│  ├── PagerDuty integration                                                      │
│  ├── Slack notifications                                                        │
│  ├── Email escalation                                                           │
│  └── Alert silencing for maintenance                                            │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Circuit Breaker Configuration

```typescript
// Circuit Breaker States
CLOSED → Normal operation
OPEN → Fast-fail all requests
HALF_OPEN → Testing recovery

// Configuration
failureThreshold: 5        // Failures to open circuit
successThreshold: 2        // Successes to close circuit
timeout: 60000             // ms before HALF_OPEN
resetTimeout: 300000       // ms before retry after OPEN
```

### 3.3 Retry Logic

```typescript
// Database Retry Configuration
const retryConfig = {
  maxRetries: 5,
  baseDelay: 1000,          // ms
  maxDelay: 30000,          // ms
  exponentialBackoff: 2,
  jitter: true,
  retryableErrors: [
    '08003', '08006', '08001',  // Connection errors
    '57P01', '57P02', '57P03',  // Admin shutdown
    '40001', '40P01',           // Serialization/deadlock
    '53300'                     // Too many connections
  ]
};

// Redis Retry Configuration
const redisRetryConfig = {
  maxRetries: 5,
  baseDelay: 1000,
  retryableErrors: [
    'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT',
    'EHOSTUNREACH', 'EAI_AGAIN', 'NR_CLOSED'
  ]
};
```

### 3.4 Graceful Shutdown

```typescript
// Process Signal Handlers
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, initiating graceful shutdown');

  // 1. Stop accepting new connections
  server.close();

  // 2. Complete in-flight requests (30s timeout)
  await drainConnections(30000);

  // 3. Close database connections
  await db.destroy();

  // 4. Close Redis connections
  await redis.quit();

  // 5. Exit cleanly
  process.exit(0);
});
```

### 3.5 Environment Variable Validation

```typescript
// Validated at startup (env-validator.ts)
Required Variables:
├── NODE_ENV (development | staging | production | test)
├── PORT (1024-65535)
├── JWT_ACCESS_SECRET (min 32 chars, no weak defaults)
├── JWT_REFRESH_SECRET (min 32 chars, no weak defaults)
├── DB_HOST, DB_PORT, DB_PASSWORD
├── REDIS_HOST, REDIS_PORT
└── AZURE_STORAGE_* (if media service)

Validation Actions:
├── Missing required → Process exit with error
├── Weak defaults in production → Process exit with error
├── Invalid format → Process exit with error
└── Optional missing → Warning log only
```

---

## 4. DevOps (Development Operations)

### 4.1 CI/CD Pipeline

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           DEVOPS CI/CD PIPELINE                                   │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  STAGE 1: BUILD                                                                 │
│  ├── Checkout code                                                              │
│  ├── Install dependencies (npm ci)                                              │
│  ├── TypeScript compilation                                                     │
│  ├── Run linting (ESLint)                                                       │
│  └── Build Docker images (multi-stage)                                          │
│                                                                                  │
│  STAGE 2: TEST                                                                  │
│  ├── Unit tests (Jest)                                                          │
│  ├── Integration tests                                                          │
│  ├── E2E tests (Playwright)                                                     │
│  └── Coverage report (>80% required)                                            │
│                                                                                  │
│  STAGE 3: SECURITY SCAN                                                         │
│  ├── SAST (SonarQube)                                                           │
│  ├── Dependency audit (npm audit)                                               │
│  ├── Container scan (Trivy)                                                     │
│  └── Secret detection                                                           │
│                                                                                  │
│  STAGE 4: DEPLOY                                                                │
│  ├── Push to ACR (geo-replicated)                                               │
│  ├── Helm chart deployment                                                      │
│  ├── Database migrations                                                        │
│  └── Health check verification                                                  │
│                                                                                  │
│  STAGE 5: POST-DEPLOY                                                           │
│  ├── Smoke tests                                                                │
│  ├── Performance validation                                                     │
│  ├── Rollback if unhealthy                                                      │
│  └── Notify stakeholders                                                        │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Infrastructure as Code

| Component | Tool | Location |
|-----------|------|----------|
| Azure Resources | Terraform | `infrastructure/terraform/` |
| Kubernetes Manifests | Helm | `infrastructure/helm/` |
| Network Policies | Kubernetes YAML | `infrastructure/kubernetes/` |
| Monitoring | Prometheus/Grafana | `infrastructure/monitoring/` |
| Logging | ELK/Loki | `infrastructure/logging/` |

### 4.3 Deployment Strategies

#### Blue-Green Deployment
```yaml
# Zero-downtime deployment
1. Deploy new version to "green" environment
2. Run health checks on green
3. Switch traffic from blue to green
4. Keep blue as rollback for 24 hours
5. Decommission blue after validation
```

#### Canary Deployment
```yaml
# Gradual rollout
1. Deploy to 10% of pods
2. Monitor error rates for 10 minutes
3. If healthy, expand to 50%
4. Monitor for 30 minutes
5. If healthy, expand to 100%
6. If unhealthy at any stage, automatic rollback
```

### 4.4 GitOps Workflow

```
main branch
├── feature/* → Development environment (auto-deploy)
├── staging → Staging environment (auto-deploy + manual approval)
└── release/* → Production environment (manual approval required)

Protection Rules:
├── main: Require PR, 2 approvers, passing CI
├── staging: Require PR, 1 approver, passing CI
└── release/*: Require PR, 2 approvers, passing CI + security review
```

### 4.5 Rollback Procedures

```bash
# Automatic Rollback Triggers
- Health check failure (>30% error rate)
- Deployment timeout (>10 minutes)
- Memory/CPU threshold exceeded
- Security scan failure

# Manual Rollback Commands
kubectl rollout undo deployment/api-gateway -n production
helm rollback flamoral-platform <revision> -n production
```

---

## 5. Service Level Objectives (SLOs)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Availability | 99.9% | Uptime per month |
| API Latency (p99) | <500ms | Request duration |
| Error Rate | <0.1% | 5xx responses |
| Deployment Frequency | Daily | Releases per day |
| Mean Time to Recovery | <30 min | Incident resolution |
| Change Failure Rate | <5% | Failed deployments |

---

## 6. Runbook Quick Reference

### Common Operations

| Operation | Command | Notes |
|-----------|---------|-------|
| Scale service | `kubectl scale deployment/user-service --replicas=5` | HPA auto-adjusts |
| View logs | `kubectl logs -f deployment/api-gateway` | Use -c for container |
| Restart pods | `kubectl rollout restart deployment/auth-service` | Rolling restart |
| Check health | `curl https://api.flamoral.com/health` | Returns JSON status |
| Database migration | `kubectl exec -it migration-job -- npm run migrate:latest` | Run in job pod |

### Emergency Procedures

| Emergency | Immediate Action | Escalation |
|-----------|-----------------|------------|
| DDoS Attack | Enable Azure DDoS Protection aggressive mode | Security team |
| Data Breach | Isolate affected services, rotate secrets | Security + Legal |
| Service Outage | Failover to backup region | On-call engineer |
| Database Corruption | Restore from geo-redundant backup | DBA team |

---

## 7. Compliance Checklist

### SOC2 Controls
- [x] Access control policies
- [x] Encryption at rest and in transit
- [x] Audit logging
- [x] Incident response procedures
- [x] Change management

### GDPR Compliance
- [x] Data residency (EU data in EU)
- [x] Right to erasure (delete user data)
- [x] Data portability (export user data)
- [x] Consent management
- [x] DPO contact information

### CCPA Compliance
- [x] Data inventory
- [x] Consumer rights (access, delete)
- [x] Opt-out mechanisms
- [x] Privacy notice

---

*Last Updated: December 2024*
*Document Owner: Platform Engineering Team*
*Review Cycle: Quarterly*
