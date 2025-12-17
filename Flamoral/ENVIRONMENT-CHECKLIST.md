# Flamoral Production Environment - Pre-Deployment Checklist

## Overview
This checklist ensures all environment configurations are properly set before deploying the Flamoral platform to production.

---

## 1. Backend Services - Environment Files

### Core Services (.env.production files created)
- [x] **api-gateway** - Port 3000 (API Gateway & GraphQL)
- [x] **auth-service** - Port 3001 (Authentication & OAuth)
- [x] **user-service** - Port 3002 (User Management)
- [x] **matching-service** - Port 3009 (Matching Algorithm)
- [x] **messaging-service** - Port 3003 (Chat & Messaging)
- [x] **payment-service** - Port 3005 (Stripe Payments)
- [x] **media-service** - Port 3006 (Media Upload & Processing)
- [x] **analytics-service** - Port 3007 (Analytics & Tracking)
- [x] **moderation-service** - Port 3008 (Content Moderation)
- [x] **notification-service** - Port 3012 (Email/SMS/Push Notifications)
- [x] **realtime-service** - Port 8081 (WebSocket & Presence)

### Additional Services (Need .env.production)
- [ ] **admin-service** - Port 3013 (Admin Dashboard Backend)
- [ ] **advertising-service** - Port 3011 (Advertising Management)
- [ ] **automation-service** - Port 3014 (Automation Workflows)
- [ ] **workflow-engine** - Port 3015 (Workflow Orchestration)

### AI/ML Services (Python - Need .env.production)
- [ ] **ai-services/dating-coach-service** - Port 5004
- [ ] **ai-services/nlp-service** - Port 5001
- [ ] **ai-services/content-generator** - Port 5005

---

## 2. Frontend Applications

### Web Application
- [x] **apps/web-app/.env.production** - Created and verified
  - API URLs correctly configured (https://api.flamoral.com/api/v1)
  - WebSocket URLs configured (wss://api.flamoral.com)
  - All feature flags set
  - Placeholders for Azure Key Vault injection

### Mobile Application
- [ ] **apps/mobile-app/.env.production** - Needs review/update
  - React Native specific configuration
  - API endpoints
  - Deep linking configuration

---

## 3. Infrastructure Configuration

### Kubernetes Resources
- [x] **ConfigMaps** - Enhanced with all service URLs and configuration
  - `infrastructure/kubernetes/base/configmap.yaml`
  - All service discovery URLs added
  - AI/ML service URLs included
  - Queue and topic names defined
  - Health check paths configured

- [x] **Secrets Template** - Comprehensive template created
  - `infrastructure/kubernetes/base/secrets.yaml`
  - All sensitive variables documented
  - Azure Key Vault integration placeholders

### Environment Templates
- [x] **Production Template** - Comprehensive 900+ line template
  - `infrastructure/config/.env.production.template`
  - All services documented
  - Security best practices included
  - Azure Key Vault integration

---

## 4. Azure Key Vault Setup

### Required Secrets (Must be stored before deployment)

#### Authentication & Security
- [ ] `jwt-access-secret` (64+ chars)
- [ ] `jwt-refresh-secret` (64+ chars)
- [ ] `service-api-key` (64+ chars)
- [ ] `session-secret` (32+ chars)

#### Database Credentials
- [ ] `db-password` (32+ chars)
- [ ] `database-url` (Full PostgreSQL connection string)
- [ ] `mongodb-uri` (Cosmos DB connection string)
- [ ] `redis-password` (16+ chars)

#### External Services - Payment
- [ ] `stripe-secret-key` (sk_live_...)
- [ ] `stripe-webhook-secret` (whsec_...)

#### External Services - Communication
- [ ] `sendgrid-api-key` (SG.*)
- [ ] `twilio-auth-token`

#### External Services - Azure
- [ ] `azure-storage-key`
- [ ] `azure-storage-connection-string`
- [ ] `azure-face-api-key`
- [ ] `azure-content-moderator-key`
- [ ] `azure-computer-vision-key`

#### External Services - Firebase
- [ ] `firebase-private-key` (JSON service account)
- [ ] `fcm-server-key`

#### External Services - OAuth
- [ ] `google-client-secret`
- [ ] `facebook-app-secret`
- [ ] `apple-private-key`

#### External Services - AI/ML
- [ ] `openai-api-key` (sk-*)

#### Monitoring
- [ ] `sentry-dsn`
- [ ] `application-insights-connection-string`
- [ ] `application-insights-instrumentation-key`

#### Analytics
- [ ] `mixpanel-token`
- [ ] `segment-write-key`
- [ ] `google-maps-api-key`

#### Azure Service Bus
- [ ] `azure-service-bus-connection-string`

---

## 5. Pre-Deployment Validation

### Automated Validation
- [ ] Run `./scripts/validate-env-production.sh`
- [ ] Verify all CRITICAL variables are set
- [ ] Check for placeholder values
- [ ] Validate secret lengths meet minimums

### Manual Verification
- [ ] All URLs use HTTPS (no HTTP except internal k8s)
- [ ] CORS origins exclude localhost
- [ ] Stripe keys are LIVE mode (sk_live_, pk_live_)
- [ ] Email template IDs are production IDs
- [ ] Firebase project is production project
- [ ] Sentry environment is "production"
- [ ] Feature flags correctly set for production
- [ ] Debug/development features disabled

### Security Checks
- [ ] No secrets committed to Git
- [ ] Azure Key Vault access policies configured
- [ ] Managed identities enabled for AKS
- [ ] SSL/TLS certificates valid and not expired
- [ ] Network security groups configured
- [ ] DDoS protection enabled
- [ ] WAF (Web Application Firewall) configured

### Service Configuration
- [ ] Database connection pooling configured
- [ ] Redis cluster mode enabled
- [ ] Rate limiting enabled on all services
- [ ] Circuit breakers configured
- [ ] Health check endpoints responding
- [ ] Readiness probes configured
- [ ] Liveness probes configured

---

## 6. Monitoring & Observability Setup

### Application Insights
- [ ] Connection string configured
- [ ] Instrumentation key set
- [ ] Log levels appropriate for production
- [ ] Custom metrics configured

### Sentry
- [ ] Production DSN configured
- [ ] Environment set to "production"
- [ ] Sample rate configured (0.1 recommended)
- [ ] Release tracking enabled

### Prometheus & Grafana
- [ ] Metrics endpoints exposed (:9090/metrics)
- [ ] Dashboards imported
- [ ] Alert rules configured

### Logging
- [ ] Log aggregation configured (Azure Log Analytics)
- [ ] Log retention policies set (30+ days)
- [ ] Structured logging (JSON format)
- [ ] PII redaction enabled

---

## 7. Database & Storage

### PostgreSQL (Azure Database for PostgreSQL)
- [ ] Production database created
- [ ] SSL/TLS enforced
- [ ] Firewall rules configured
- [ ] Backup retention configured (35 days)
- [ ] Read replicas configured
- [ ] Connection pooling enabled

### MongoDB/Cosmos DB
- [ ] Production instance provisioned
- [ ] Geo-replication configured
- [ ] Throughput configured (RU/s)
- [ ] Backup policies set

### Redis (Azure Cache for Redis)
- [ ] Premium tier provisioned
- [ ] Cluster mode enabled
- [ ] TLS/SSL enforced (port 6380)
- [ ] Data persistence configured

### Azure Storage
- [ ] Production storage account created
- [ ] Blob containers created (photos, videos, etc.)
- [ ] CDN configured
- [ ] Lifecycle management policies set
- [ ] Encryption at rest enabled

---

## 8. Networking & Security

### DNS & Certificates
- [ ] DNS records configured (flamoral.com, api.flamoral.com)
- [ ] SSL certificates provisioned (Let's Encrypt or Azure)
- [ ] Certificate auto-renewal configured

### Network Security
- [ ] Virtual Network (VNet) configured
- [ ] Subnets properly segmented
- [ ] Network Security Groups (NSGs) configured
- [ ] Private endpoints for databases
- [ ] Azure Firewall configured

### Kubernetes Networking
- [ ] Ingress controller configured (NGINX)
- [ ] Network policies applied
- [ ] Service mesh configured (optional)
- [ ] Load balancer configured

---

## 9. CI/CD Pipeline

### GitHub Actions / Azure DevOps
- [ ] Production deployment pipeline configured
- [ ] Secret injection from Key Vault working
- [ ] Environment approval gates enabled
- [ ] Rollback procedures tested
- [ ] Blue-green deployment configured

### Container Registry
- [ ] Azure Container Registry (ACR) configured
- [ ] Image scanning enabled
- [ ] Vulnerability scanning enabled
- [ ] Retention policies set

---

## 10. Testing in Staging

### Integration Testing
- [ ] All service-to-service communication working
- [ ] Database migrations successful
- [ ] External APIs responding
- [ ] WebSocket connections stable

### Load Testing
- [ ] Performance benchmarks met
- [ ] Autoscaling triggers tested
- [ ] Database connection pool sizing verified
- [ ] CDN caching working

### User Acceptance Testing
- [ ] Core user flows tested
- [ ] Payment processing verified
- [ ] Email/SMS delivery working
- [ ] Push notifications working
- [ ] File uploads working
- [ ] Video calls functional

---

## 11. Documentation

- [x] **ENVIRONMENT-SETUP.md** - Comprehensive setup guide created
- [x] **ENVIRONMENT-CHECKLIST.md** - This pre-deployment checklist
- [ ] Runbook for common operations
- [ ] Incident response procedures
- [ ] Disaster recovery plan
- [ ] Scaling procedures

---

## 12. Final Pre-Launch Checks

### Business Continuity
- [ ] Backup and restore tested
- [ ] Disaster recovery plan tested
- [ ] Failover procedures documented
- [ ] On-call rotation established

### Compliance
- [ ] GDPR compliance verified
- [ ] Privacy policy updated
- [ ] Terms of service updated
- [ ] Cookie consent implemented
- [ ] Data retention policies configured

### Support
- [ ] Support email configured (support@flamoral.com)
- [ ] Status page configured
- [ ] Monitoring alerts configured
- [ ] PagerDuty/alerting integrated
- [ ] Slack notifications configured

---

## Sign-Off

### Technical Lead
- [ ] Reviewed and approved all configurations
- [ ] Verified security measures
- [ ] Confirmed monitoring setup
- Name: _________________ Date: _______

### DevOps Engineer
- [ ] Infrastructure provisioned
- [ ] Pipelines configured
- [ ] Secrets management verified
- Name: _________________ Date: _______

### Security Officer
- [ ] Security audit completed
- [ ] Penetration testing completed
- [ ] Compliance verified
- Name: _________________ Date: _______

### Product Owner
- [ ] Business requirements met
- [ ] User acceptance testing passed
- [ ] Ready for launch
- Name: _________________ Date: _______

---

## Post-Deployment

### Immediate (First Hour)
- [ ] Monitor error rates
- [ ] Check response times
- [ ] Verify all services healthy
- [ ] Monitor resource usage

### First 24 Hours
- [ ] Review application logs
- [ ] Check for any security alerts
- [ ] Monitor user feedback
- [ ] Verify analytics tracking

### First Week
- [ ] Review performance metrics
- [ ] Optimize resource allocation
- [ ] Address any issues
- [ ] Plan improvements

---

**Checklist Version**: 1.0.0
**Last Updated**: December 15, 2024
**Next Review**: Before Production Deployment
