# Flamoral Dating Platform - Launch Runbook

**Version:** 1.0.0
**Last Updated:** December 11, 2025
**Status:** Production Ready
**Document Owner:** DevOps Team

---

## Table of Contents

1. [Pre-Launch Checklist](#1-pre-launch-checklist)
2. [Launch Day Procedures](#2-launch-day-procedures)
3. [Post-Launch Monitoring](#3-post-launch-monitoring)
4. [Incident Response](#4-incident-response)
5. [Scaling Procedures](#5-scaling-procedures)
6. [Emergency Contacts](#6-emergency-contacts)

---

## 1. Pre-Launch Checklist

### 1.1 Third-Party Accounts Configuration

#### 1.1.1 Stripe Payment Gateway

- [ ] **Production Stripe Account Activated**
  - Business information completed
  - Banking details verified
  - Tax forms submitted (W-9/W-8)
  - Identity verification completed
  - Payout schedule configured

- [ ] **Stripe Products Created**
  - [ ] Basic Subscription ($9.99/month) - Price ID: `price_xxxxx`
  - [ ] Mid Subscription ($19.99/month) - Price ID: `price_xxxxx`
  - [ ] Ultra Subscription ($29.99/month) - Price ID: `price_xxxxx`
  - [ ] Coin packages (4 tiers) - Price IDs recorded
  - [ ] Boost packages (3 tiers) - Price IDs recorded

- [ ] **Stripe Configuration Complete**
  - [ ] Production API keys obtained (sk_live_xxx, pk_live_xxx)
  - [ ] Webhook endpoint configured: `https://api.flamoral.com/api/payment-service/webhook`
  - [ ] Webhook signing secret obtained: `whsec_xxxxx`
  - [ ] Payment methods enabled (Cards, Apple Pay, Google Pay)
  - [ ] Customer portal enabled
  - [ ] Email receipts configured
  - [ ] Tax collection configured (if applicable)

- [ ] **Stripe Testing Complete**
  - [ ] Test subscription creation
  - [ ] Test payment processing
  - [ ] Test webhook delivery
  - [ ] Test refund processing
  - [ ] Test failed payment handling

**Reference:** `/docs/deployment/PRODUCTION_STRIPE_SETUP.md`

#### 1.1.2 Azure Infrastructure

- [ ] **Azure Subscription Active**
  - Subscription ID: `ebd1613e-fea0-4b6d-8918-7e4de6a71c44`
  - Valid payment method attached
  - Spending limits configured
  - Cost alerts enabled

- [ ] **Resource Groups Created**
  - [ ] Production: `rg-flamoral-prod-westus2`
  - [ ] Staging: `rg-flamoral-staging-westus2`
  - [ ] DNS: `rg-terraform-state-westus2`

- [ ] **Azure Services Provisioned**
  - [ ] AKS cluster (production): 5+ nodes
  - [ ] Azure SQL Database: S3 tier (100GB)
  - [ ] Azure Storage Account: RAGRS redundancy
  - [ ] Azure Key Vault: Premium with HSM
  - [ ] Azure Container Registry: Premium tier
  - [ ] Log Analytics workspace: 90-day retention
  - [ ] Application Insights configured

- [ ] **Network Configuration**
  - [ ] Virtual Network: 10.2.0.0/16
  - [ ] Subnets configured (App, DB, Cache, Mgmt)
  - [ ] NSG rules applied
  - [ ] Service endpoints configured
  - [ ] Private endpoints enabled (Key Vault, SQL, Storage)

**Reference:** `/docs/ARCHITECTURE.md`

#### 1.1.3 SendGrid Email Service

- [ ] **SendGrid Account Setup**
  - Account created and verified
  - Sending domain authenticated
  - SPF, DKIM, DMARC records configured
  - Sender identity verified

- [ ] **SendGrid Configuration**
  - [ ] Production API key: `SG.xxxxx`
  - [ ] From email: `noreply@flamoral.com`
  - [ ] Reply-to email: `support@flamoral.com`
  - [ ] Email templates created
  - [ ] Unsubscribe links configured
  - [ ] IP warming plan (if dedicated IP)

- [ ] **Email Templates Ready**
  - [ ] Welcome email
  - [ ] Email verification
  - [ ] Password reset
  - [ ] Match notifications
  - [ ] Message notifications
  - [ ] Subscription receipts

#### 1.1.4 Twilio SMS Service

- [ ] **Twilio Account Setup**
  - Account SID: `ACxxxxx`
  - Auth token obtained
  - Phone number purchased: `+1-XXX-XXX-XXXX`
  - SMS enabled in target countries

- [ ] **Twilio Configuration**
  - [ ] Webhook URL configured
  - [ ] SMS templates approved
  - [ ] Rate limits verified
  - [ ] Opt-out handling configured

#### 1.1.5 Domain & DNS

- [ ] **Domain Registration**
  - Domain: `flamoral.com`
  - Registrar account active
  - Auto-renewal enabled
  - WHOIS privacy enabled

- [ ] **Azure DNS Zone**
  - [ ] DNS Zone created: `flamoral.com`
  - [ ] Nameservers updated at registrar
  - [ ] DNS propagation verified (24-48 hours)

- [ ] **DNS Records Configured**
  - [ ] A record: `@ → <AKS_PUBLIC_IP>`
  - [ ] A record: `www → <AKS_PUBLIC_IP>`
  - [ ] A record: `api → <AKS_PUBLIC_IP>`
  - [ ] CAA record: `@ → 0 issue "letsencrypt.org"`
  - [ ] TXT record: Domain verification
  - [ ] CNAME: `dev.flamoral.com`
  - [ ] CNAME: `test.flamoral.com`
  - [ ] CNAME: `staging.flamoral.com`

- [ ] **DNS Verification**
  ```bash
  dig flamoral.com
  dig www.flamoral.com
  dig api.flamoral.com
  ```

**Reference:** `/docs/DNS_SETUP.md`

#### 1.1.6 Monitoring Services

- [ ] **Sentry Error Tracking**
  - [ ] Organization created: "Flamoral"
  - [ ] Projects created for each service (9 backend + 1 frontend)
  - [ ] DSN keys obtained for all projects
  - [ ] Release tracking configured
  - [ ] Performance monitoring enabled
  - [ ] User context tracking configured

- [ ] **UptimeRobot Monitoring**
  - [ ] Monitor: `https://flamoral.com` (main site)
  - [ ] Monitor: `https://api.flamoral.com/health` (API health)
  - [ ] Alert contacts configured (email, SMS, Slack)
  - [ ] 5-minute check interval

- [ ] **Application Insights**
  - [ ] Workspace connected to AKS
  - [ ] Custom metrics configured
  - [ ] Dashboards created
  - [ ] Alert rules configured

**Reference:** `/docs/deployment/MONITORING_SETUP_GUIDE.md`

---

### 1.2 Environment Variables Configuration

#### 1.2.1 Production Environment Variables

All environment variables must be set in Kubernetes secrets:

```bash
# Create production secrets
kubectl create secret generic flamoral-prod-secrets \
  --namespace=flamoral-prod \
  --from-literal=NODE_ENV=production \
  --from-literal=DATABASE_URL=postgresql://... \
  --from-literal=MONGODB_URI=mongodb://... \
  --from-literal=REDIS_URL=redis://... \
  --from-literal=JWT_SECRET=<64-char-secret> \
  --from-literal=JWT_REFRESH_SECRET=<64-char-secret> \
  --from-literal=STRIPE_SECRET_KEY=sk_live_xxxxx \
  --from-literal=STRIPE_WEBHOOK_SECRET=whsec_xxxxx \
  --from-literal=SENDGRID_API_KEY=SG.xxxxx \
  --from-literal=TWILIO_ACCOUNT_SID=ACxxxxx \
  --from-literal=TWILIO_AUTH_TOKEN=xxxxx \
  --from-literal=AZURE_STORAGE_CONNECTION_STRING=xxxxx \
  --from-literal=SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

- [ ] **Database Credentials**
  - [ ] PostgreSQL: Production database URL
  - [ ] MongoDB: Production connection string
  - [ ] Redis: Production connection string
  - [ ] All passwords rotated from staging

- [ ] **Authentication Secrets**
  - [ ] JWT_SECRET: 64+ characters, cryptographically secure
  - [ ] JWT_REFRESH_SECRET: 64+ characters, different from JWT_SECRET
  - [ ] Secrets never committed to git
  - [ ] Secrets backed up in secure location

- [ ] **Third-Party API Keys**
  - [ ] Stripe: Live mode keys
  - [ ] SendGrid: Production API key
  - [ ] Twilio: Production credentials
  - [ ] Azure Storage: Production connection string
  - [ ] Sentry: Production DSN for each service

- [ ] **Stripe Price IDs**
  - [ ] STRIPE_PRICE_BASIC_MONTHLY
  - [ ] STRIPE_PRICE_MID_MONTHLY
  - [ ] STRIPE_PRICE_ULTRA_MONTHLY
  - [ ] STRIPE_PRICE_COIN_SMALL
  - [ ] STRIPE_PRICE_COIN_MEDIUM
  - [ ] STRIPE_PRICE_COIN_LARGE
  - [ ] STRIPE_PRICE_COIN_XL
  - [ ] STRIPE_PRICE_BOOST_30MIN
  - [ ] STRIPE_PRICE_BOOST_1HR
  - [ ] STRIPE_PRICE_BOOST_3HR

- [ ] **Frontend Environment Variables**
  - [ ] VITE_API_URL=https://api.flamoral.com
  - [ ] VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
  - [ ] VITE_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
  - [ ] CORS_ORIGIN=https://flamoral.com,https://www.flamoral.com

**Reference:** `.env.example` and `.env.prod.example`

#### 1.2.2 Verify Secrets in Azure Key Vault

- [ ] All production secrets stored in Azure Key Vault
- [ ] Key Vault access policies configured
- [ ] Managed identities assigned to AKS
- [ ] Secrets synced to Kubernetes via CSI driver
- [ ] Secret rotation policy defined

---

### 1.3 SSL/TLS Certificates

- [ ] **cert-manager Installed in AKS**
  - cert-manager namespace created
  - cert-manager CRDs installed
  - ClusterIssuer configured for Let's Encrypt

- [ ] **Let's Encrypt Configuration**
  - [ ] Production issuer configured (not staging)
  - [ ] Email for expiry notifications: `devops@flamoral.com`
  - [ ] ACME challenge method: HTTP-01
  - [ ] Rate limits understood (50 certs/week per domain)

- [ ] **Certificates Issued**
  - [ ] Certificate for `flamoral.com`
  - [ ] Certificate for `www.flamoral.com`
  - [ ] Certificate for `api.flamoral.com`
  - [ ] Wildcard certificate: `*.flamoral.com` (optional)

- [ ] **Certificate Verification**
  ```bash
  # Verify SSL certificate
  openssl s_client -connect flamoral.com:443 -servername flamoral.com

  # Check certificate expiry
  kubectl get certificate -n flamoral-prod
  ```

- [ ] **Auto-Renewal Configured**
  - cert-manager auto-renewal enabled (30 days before expiry)
  - Monitoring alerts for certificate expiry

---

### 1.4 Database Setup

#### 1.4.1 PostgreSQL Production Database

- [ ] **Database Provisioned**
  - Azure SQL Database: S3 tier (100GB)
  - Geo-redundant backup enabled
  - Automated backups: Daily
  - Backup retention: 35 days
  - Point-in-time restore enabled

- [ ] **Database Configuration**
  - [ ] SSL/TLS connections enforced
  - [ ] Firewall rules configured (AKS subnet only)
  - [ ] Private endpoint enabled
  - [ ] Azure AD authentication enabled
  - [ ] Connection pooling configured (PgBouncer)

- [ ] **Database Schema**
  - [ ] All migrations executed in order
  - [ ] Schema matches production requirements
  - [ ] Indexes created on all foreign keys
  - [ ] Performance indexes added
  - [ ] Database statistics updated

- [ ] **Database Security**
  - [ ] Least privilege access granted
  - [ ] Application user created with limited permissions
  - [ ] Admin user different from application user
  - [ ] Password complexity enforced
  - [ ] Audit logging enabled

- [ ] **Database Testing**
  - [ ] Connection test from AKS
  - [ ] Query performance testing
  - [ ] Backup restoration tested
  - [ ] Failover tested

#### 1.4.2 MongoDB (if used)

- [ ] MongoDB Atlas cluster provisioned
- [ ] Replica set configured (3 nodes minimum)
- [ ] Automated backups enabled
- [ ] Network access configured (AKS IP whitelist)
- [ ] Database users created
- [ ] Connection string tested

#### 1.4.3 Redis Cache

- [ ] Redis instance provisioned
- [ ] High availability configured (replica)
- [ ] Persistence enabled (AOF + RDB)
- [ ] Maxmemory policy set (allkeys-lru)
- [ ] Connection from AKS tested
- [ ] Password authentication enabled

---

### 1.5 Kubernetes Cluster Readiness

- [ ] **Cluster Health**
  - [ ] All nodes ready and healthy
  - [ ] Node count: 5+ nodes in production
  - [ ] Node auto-scaling configured (5-20 nodes)
  - [ ] System pods running (kube-system namespace)
  - [ ] Cluster version: Latest stable Kubernetes version

- [ ] **Namespaces Created**
  - [ ] `flamoral-prod` - Production workloads
  - [ ] `ingress-nginx` - Ingress controller
  - [ ] `cert-manager` - Certificate management
  - [ ] `monitoring` - Prometheus, Grafana
  - [ ] `logging` - FluentD, Elasticsearch (if applicable)

- [ ] **RBAC Configuration**
  - [ ] Service accounts created
  - [ ] Role-based access control configured
  - [ ] Least privilege principle applied
  - [ ] Pod security policies enforced

- [ ] **Ingress Controller**
  - [ ] NGINX Ingress Controller installed
  - [ ] Load balancer service created
  - [ ] External IP assigned
  - [ ] Ingress resources deployed
  - [ ] Rate limiting configured
  - [ ] Request size limits set

- [ ] **Storage Classes**
  - [ ] Default storage class configured
  - [ ] Premium storage class available
  - [ ] Persistent volume provisioner working

- [ ] **Network Policies**
  - [ ] Default deny-all policy
  - [ ] Explicit allow policies for required traffic
  - [ ] Database access restricted to app pods
  - [ ] Internet egress controlled

**Verification Commands:**
```bash
# Check cluster health
kubectl cluster-info
kubectl get nodes
kubectl get pods --all-namespaces

# Check ingress
kubectl get svc -n ingress-nginx
kubectl get ingress -n flamoral-prod

# Check certificates
kubectl get certificate -n flamoral-prod
```

---

### 1.6 Monitoring & Alerting Configuration

#### 1.6.1 Sentry Configuration

- [ ] **Error Tracking**
  - [ ] All services connected to Sentry
  - [ ] Error grouping configured
  - [ ] Release tracking enabled
  - [ ] Source maps uploaded (frontend)
  - [ ] Performance monitoring enabled
  - [ ] Session replay enabled (frontend)

- [ ] **Alert Rules**
  - [ ] High error rate: > 100 errors/hour
  - [ ] New error type detected
  - [ ] Error spike: 10x increase in 5 minutes
  - [ ] Payment errors (critical)

#### 1.6.2 Application Insights / Prometheus

- [ ] **Metrics Collection**
  - [ ] CPU usage per service
  - [ ] Memory usage per service
  - [ ] Request rate and latency
  - [ ] Error rate per endpoint
  - [ ] Database query performance
  - [ ] Cache hit rate
  - [ ] Queue lengths

- [ ] **Dashboards Created**
  - [ ] System overview dashboard
  - [ ] Service health dashboard
  - [ ] Business metrics dashboard
  - [ ] Error dashboard
  - [ ] Performance dashboard

- [ ] **Alert Thresholds Set**
  - [ ] CPU usage > 80% for 5 minutes
  - [ ] Memory usage > 85% for 5 minutes
  - [ ] Disk usage > 90%
  - [ ] Pod restart > 3 times in 10 minutes
  - [ ] Response time p95 > 1 second
  - [ ] Error rate > 1% for 5 minutes
  - [ ] Webhook failures > 5% in 15 minutes

#### 1.6.3 Log Aggregation

- [ ] **Logging Infrastructure**
  - [ ] Centralized logging enabled (Azure Log Analytics)
  - [ ] Log retention: 90 days (production)
  - [ ] Structured logging (JSON format)
  - [ ] Log levels configured properly
  - [ ] Sensitive data excluded from logs

- [ ] **Log Queries**
  - [ ] Common queries saved
  - [ ] Error log filters
  - [ ] Audit log queries
  - [ ] Performance investigation queries

---

### 1.7 Backup Systems

- [ ] **Database Backups**
  - [ ] Automated daily backups enabled
  - [ ] Backup retention: 35 days
  - [ ] Point-in-time restore tested
  - [ ] Geo-redundant backup enabled
  - [ ] Backup restoration documented

- [ ] **Application Backups**
  - [ ] Kubernetes resources backed up (Velero)
  - [ ] ConfigMaps and Secrets backed up
  - [ ] Persistent volumes backed up
  - [ ] Backup schedule: Daily

- [ ] **Disaster Recovery Plan**
  - [ ] RTO: 4 hours
  - [ ] RPO: 1 hour
  - [ ] Failover procedures documented
  - [ ] DR drill completed
  - [ ] Secondary region ready (East US 2)

---

### 1.8 Legal Documents & Compliance

- [ ] **Legal Documents Published**
  - [ ] Privacy Policy: `https://flamoral.com/privacy`
  - [ ] Terms of Service: `https://flamoral.com/terms`
  - [ ] Cookie Policy: `https://flamoral.com/cookies`
  - [ ] Data Deletion Request Form: `https://flamoral.com/delete-account`
  - [ ] Contact page: `https://flamoral.com/contact`

- [ ] **GDPR Compliance**
  - [ ] Data minimization implemented
  - [ ] User consent management
  - [ ] Right to deletion implemented
  - [ ] Right to data export implemented
  - [ ] Data retention policies defined
  - [ ] Privacy by design principles followed

- [ ] **Security Compliance**
  - [ ] Security audit completed (Score: 82/100)
  - [ ] Vulnerabilities addressed
  - [ ] Password policies enforced
  - [ ] Encryption at rest and in transit
  - [ ] Access controls implemented

**Reference:** `/docs/SECURITY-AUDIT-REPORT.md`

---

### 1.9 App Store & Play Store Preparation

#### 1.9.1 iOS App Store

- [ ] **Apple Developer Account**
  - [ ] Active account ($99/year paid)
  - [ ] App ID created in App Store Connect
  - [ ] Certificates and provisioning profiles configured
  - [ ] App listing created

- [ ] **App Submission Requirements**
  - [ ] Built with Xcode 16+ targeting iOS 18
  - [ ] Privacy manifest file included
  - [ ] NSCameraUsageDescription in Info.plist
  - [ ] NSPhotoLibraryUsageDescription in Info.plist
  - [ ] NSLocationWhenInUseUsageDescription in Info.plist
  - [ ] Screenshots for all device sizes
  - [ ] App icon 1024x1024
  - [ ] App description and keywords
  - [ ] Age rating: 17+ (Mature content)

- [ ] **Test Accounts Provided**
  - Demo account 1: `demo@flamoral.com` / `Demo123!`
  - Demo account 2: `premium@flamoral.com` / `Premium123!`

#### 1.9.2 Google Play Store

- [ ] **Google Play Developer Account**
  - [ ] Active account ($25 one-time fee paid)
  - [ ] Organization verification completed
  - [ ] App listing created

- [ ] **App Submission Requirements**
  - [ ] Target Android 14 (API level 34)
  - [ ] App Bundle (.aab) format
  - [ ] 64-bit native libraries
  - [ ] Data Safety form completed
  - [ ] IARC content rating questionnaire completed
  - [ ] Screenshots for phone and tablet
  - [ ] Feature graphic
  - [ ] App icon 512x512

- [ ] **Testing Requirements**
  - [ ] Internal testing track setup
  - [ ] 20 testers for 2 weeks minimum
  - [ ] Closed testing completed

**Reference:** `/docs/guides/50-App-Store-Compliance.md`

---

### 1.10 CI/CD Pipeline Verification

- [ ] **GitHub Actions Workflows**
  - [ ] Backend CI workflow passing
  - [ ] Frontend CI workflow passing
  - [ ] Docker build & push workflow configured
  - [ ] Deploy to staging workflow working
  - [ ] Deploy to production workflow ready

- [ ] **GitHub Secrets Configured**
  - [ ] DOCKER_PASSWORD
  - [ ] KUBE_CONFIG_PRODUCTION
  - [ ] DB_PASSWORD_PRODUCTION
  - [ ] JWT_ACCESS_SECRET_PROD
  - [ ] JWT_REFRESH_SECRET_PROD
  - [ ] STRIPE_SECRET_KEY_LIVE
  - [ ] AZURE_STORAGE_KEY_PROD
  - [ ] SENTRY_AUTH_TOKEN
  - [ ] SLACK_WEBHOOK

- [ ] **Docker Images**
  - [ ] All services built and pushed to registry
  - [ ] Images tagged with version number
  - [ ] Security scan passed (Trivy)
  - [ ] Images tested in staging

- [ ] **Deployment Tested in Staging**
  - [ ] Full deployment successful in staging
  - [ ] All services healthy
  - [ ] End-to-end tests passing
  - [ ] Performance tests acceptable
  - [ ] Staging environment stable for 48+ hours

**Reference:** `/docs/deployment/CICD_PIPELINE_GUIDE.md`

---

### 1.11 Service Health Verification

Run this verification on staging environment first:

- [ ] **API Gateway**
  ```bash
  curl https://api-staging.flamoral.com/health
  # Expected: {"status":"ok","timestamp":"..."}
  ```

- [ ] **All Microservices**
  - [ ] User Service: `/api/user-service/health`
  - [ ] Matching Service: `/api/matching-service/health`
  - [ ] Messaging Service: `/api/messaging-service/health`
  - [ ] Payment Service: `/api/payment-service/health`
  - [ ] Media Service: `/api/media-service/health`
  - [ ] Notification Service: `/api/notification-service/health`
  - [ ] Analytics Service: `/api/analytics-service/health`
  - [ ] Moderation Service: `/api/moderation-service/health`
  - [ ] Realtime Service: WebSocket connection test

- [ ] **Database Connectivity**
  - [ ] PostgreSQL: Connection test
  - [ ] MongoDB: Connection test
  - [ ] Redis: Connection test

- [ ] **External Services**
  - [ ] Stripe: Test webhook delivery
  - [ ] SendGrid: Test email sending
  - [ ] Twilio: Test SMS sending
  - [ ] Azure Storage: Test file upload/download

---

### 1.12 Performance Baseline

Establish performance baselines in staging before production launch:

- [ ] **Load Testing Results**
  - [ ] Concurrent users tested: 1,000+
  - [ ] Average response time: < 200ms
  - [ ] P95 response time: < 500ms
  - [ ] P99 response time: < 1000ms
  - [ ] Error rate: < 0.1%
  - [ ] Throughput: 5,000+ requests/minute

- [ ] **Database Performance**
  - [ ] Query response time: < 100ms (average)
  - [ ] Slow query log monitored
  - [ ] Connection pool size: 50-100 per service
  - [ ] No connection leaks

- [ ] **Cache Performance**
  - [ ] Cache hit rate: > 80%
  - [ ] Cache eviction rate: < 5%
  - [ ] Redis memory usage: < 70%

---

## Pre-Launch Sign-off

**Checklist Completion:** _____ / _____ items completed (target: 100%)

**Sign-offs Required:**

- [ ] **DevOps Lead:** ___________________ Date: _________
- [ ] **Backend Lead:** ___________________ Date: _________
- [ ] **Frontend Lead:** ___________________ Date: _________
- [ ] **QA Lead:** ___________________ Date: _________
- [ ] **Security Lead:** ___________________ Date: _________
- [ ] **Product Manager:** ___________________ Date: _________
- [ ] **CTO:** ___________________ Date: _________

**Pre-Launch Meeting Scheduled:** Date: _________ Time: _________

**Go/No-Go Decision:** ☐ GO  ☐ NO-GO  ☐ DELAYED

**If NO-GO or DELAYED, reasons:**
_______________________________________________________________
_______________________________________________________________

---

## 2. Launch Day Procedures

### 2.1 Launch Day Preparation

**Recommended Launch Window:**
- Day: Tuesday, Wednesday, or Thursday
- Time: 10:00 AM - 2:00 PM EST
- Avoid: Fridays, weekends, holidays, after 6:00 PM

**Launch Team Roles:**

| Role | Name | Contact | Responsibilities |
|------|------|---------|------------------|
| Launch Commander | __________ | __________ | Overall coordination, go/no-go decisions |
| DevOps Lead | __________ | __________ | Infrastructure, deployment execution |
| Backend Lead | __________ | __________ | Backend services, API monitoring |
| Frontend Lead | __________ | __________ | Web/mobile apps, user experience |
| Database Admin | __________ | __________ | Database performance, queries |
| QA Lead | __________ | __________ | Testing, verification |
| Customer Support | __________ | __________ | User issues, feedback |
| Communications | __________ | __________ | Status updates, announcements |

**Communication Channels:**
- Primary: Slack channel `#launch-war-room`
- Video: Zoom/Teams call (entire launch team on standby)
- Backup: Phone numbers shared in advance
- Status page: `https://status.flamoral.com` (if applicable)

---

### 2.2 T-24 Hours: Final Preparations

**24 Hours Before Launch:**

- [ ] **Team Briefing**
  - Launch plan reviewed with entire team
  - Roles and responsibilities confirmed
  - Communication channels tested
  - Emergency procedures reviewed

- [ ] **Final Code Freeze**
  - No code changes unless critical
  - Main branch locked
  - Version tagged: `v1.0.0`
  - Release notes finalized

- [ ] **Final Testing in Staging**
  - [ ] Full regression test suite
  - [ ] Performance testing
  - [ ] Security scanning
  - [ ] Load testing
  - [ ] All tests passing

- [ ] **Backup Creation**
  - [ ] Database backup taken
  - [ ] Kubernetes state backed up
  - [ ] Configuration files backed up
  - [ ] Backup restoration verified

- [ ] **Monitoring Check**
  - [ ] All monitoring dashboards accessible
  - [ ] Alert rules tested
  - [ ] Notification channels verified (Slack, email, SMS)
  - [ ] On-call rotation confirmed

- [ ] **Communication Prepared**
  - [ ] Launch announcement drafted
  - [ ] Social media posts scheduled
  - [ ] Press release ready (if applicable)
  - [ ] Support team briefed

---

### 2.3 T-4 Hours: Pre-Launch Verification

**4 Hours Before Launch:**

- [ ] **Launch Team Assembly**
  - All team members online and available
  - War room (video call) active
  - Slack channel active

- [ ] **Production Environment Check**
  ```bash
  # Verify cluster health
  kubectl get nodes
  kubectl get pods --all-namespaces

  # Check ingress
  kubectl get ingress -n flamoral-prod

  # Verify certificates
  kubectl get certificate -n flamoral-prod
  ```

- [ ] **DNS Verification**
  ```bash
  dig flamoral.com
  dig api.flamoral.com
  nslookup flamoral.com
  ```

- [ ] **SSL Certificate Check**
  ```bash
  openssl s_client -connect flamoral.com:443 -servername flamoral.com
  ```

- [ ] **Database Health**
  - [ ] PostgreSQL: Connection test, query performance
  - [ ] Redis: Connection test, memory usage
  - [ ] MongoDB: Connection test (if applicable)

- [ ] **External Services Check**
  - [ ] Stripe: API connectivity test
  - [ ] SendGrid: API connectivity test
  - [ ] Twilio: API connectivity test
  - [ ] Azure Storage: Upload/download test

---

### 2.4 T-1 Hour: Final Countdown

**1 Hour Before Launch:**

- [ ] **Go/No-Go Poll**
  - Poll each team lead for go/no-go
  - Document any concerns
  - Launch Commander makes final decision

- [ ] **Final Staging Test**
  - [ ] End-to-end user journey test
  - [ ] Payment flow test (test mode)
  - [ ] All critical paths verified

- [ ] **Monitoring Dashboards Open**
  - [ ] System metrics dashboard
  - [ ] Application performance dashboard
  - [ ] Error tracking dashboard (Sentry)
  - [ ] Business metrics dashboard

- [ ] **Support Team Ready**
  - [ ] Support email monitored: `support@flamoral.com`
  - [ ] Support phone line staffed (if applicable)
  - [ ] FAQ and knowledge base ready
  - [ ] Escalation procedures clear

---

### 2.5 Launch Execution: Deployment Sequence

**Step-by-Step Launch Procedure:**

#### Step 1: Database Migration (T-0:00)

**Estimated Time:** 10-15 minutes

```bash
# Connect to production cluster
kubectl config use-context production-cluster

# Run database migrations
kubectl apply -f k8s/production/migration-job.yaml

# Monitor migration
kubectl logs -f job/db-migration -n flamoral-prod
```

**Verification Checkpoints:**
- [ ] Migration job completed successfully
- [ ] No migration errors in logs
- [ ] Database schema version updated
- [ ] Sample queries work correctly

**Rollback Trigger:** Migration fails or takes > 30 minutes

---

#### Step 2: Deploy Backend Services (T-0:15)

**Estimated Time:** 15-20 minutes

```bash
# Deploy all backend services with rolling update
kubectl apply -f k8s/production/services/

# Services to deploy:
# - user-service
# - matching-service
# - messaging-service
# - media-service
# - payment-service
# - notification-service
# - analytics-service
# - moderation-service
# - realtime-service
# - api-gateway

# Monitor rollout for each service
kubectl rollout status deployment/user-service -n flamoral-prod
kubectl rollout status deployment/matching-service -n flamoral-prod
# ... (repeat for all services)
```

**Verification Checkpoints:**
- [ ] All pods running and ready
  ```bash
  kubectl get pods -n flamoral-prod
  ```
- [ ] Health endpoints responding
  ```bash
  for service in user matching messaging media payment notification analytics moderation; do
    echo "Checking $service-service..."
    curl -f https://api.flamoral.com/api/$service-service/health || echo "FAILED"
  done
  ```
- [ ] No errors in service logs
  ```bash
  kubectl logs deployment/user-service -n flamoral-prod --tail=50
  ```
- [ ] CPU and memory usage normal
  ```bash
  kubectl top pods -n flamoral-prod
  ```

**Rollback Trigger:**
- Any pod fails to start
- Health checks fail after 5 minutes
- Error rate > 5%
- CPU/Memory usage > 90%

---

#### Step 3: Deploy Frontend Application (T-0:35)

**Estimated Time:** 10 minutes

```bash
# Deploy web frontend
kubectl apply -f k8s/production/web-app.yaml

# Monitor deployment
kubectl rollout status deployment/web-app -n flamoral-prod

# Check frontend accessibility
curl -I https://flamoral.com
```

**Verification Checkpoints:**
- [ ] Frontend pods running
- [ ] Website accessible: `https://flamoral.com`
- [ ] Static assets loading correctly
- [ ] API connectivity from frontend working
- [ ] No console errors in browser

**Rollback Trigger:**
- Website not accessible after 5 minutes
- Critical JavaScript errors
- API calls failing

---

#### Step 4: Traffic Switch & Smoke Tests (T-0:45)

**Estimated Time:** 15 minutes

```bash
# Verify ingress routing
kubectl get ingress flamoral -n flamoral-prod -o yaml

# Run smoke tests
curl https://api.flamoral.com/health
curl https://flamoral.com
curl https://www.flamoral.com
curl https://api.flamoral.com/api/user-service/health
```

**Critical User Journeys to Test:**

1. **User Registration Flow**
   - [ ] Navigate to registration page
   - [ ] Fill in registration form
   - [ ] Submit registration
   - [ ] Verify email sent
   - [ ] Complete email verification

2. **User Login Flow**
   - [ ] Navigate to login page
   - [ ] Enter test credentials
   - [ ] Submit login form
   - [ ] Verify JWT token received
   - [ ] Dashboard loads correctly

3. **Profile Setup Flow**
   - [ ] Upload profile photo
   - [ ] Fill in profile information
   - [ ] Save profile
   - [ ] Verify profile saved

4. **Matching Flow**
   - [ ] View potential matches
   - [ ] Swipe right on profile
   - [ ] Verify match recorded
   - [ ] Check match notification

5. **Messaging Flow**
   - [ ] Open conversation
   - [ ] Send test message
   - [ ] Verify message delivered
   - [ ] Real-time update received

6. **Payment Flow** (Test Mode)
   - [ ] Navigate to subscription page
   - [ ] Select subscription tier
   - [ ] Enter test credit card: `4242 4242 4242 4242`
   - [ ] Complete payment
   - [ ] Verify subscription activated
   - [ ] Check Stripe webhook received

**Verification Checkpoints:**
- [ ] All smoke tests passing
- [ ] No 500 errors in any endpoint
- [ ] Response times < 500ms
- [ ] Error rate < 0.5%

**Rollback Trigger:**
- Any critical user journey fails
- Error rate > 2%
- Response time > 2 seconds
- Database errors

---

### 2.6 Launch Verification Checkpoints

#### Checkpoint 1: T+10 Minutes

**System Health:**
- [ ] All pods running (target: 100%)
- [ ] CPU usage < 50% (normal load)
- [ ] Memory usage < 60%
- [ ] Error rate < 0.5%
- [ ] Response time p95 < 500ms

**Metrics:**
```bash
# Check pod status
kubectl get pods -n flamoral-prod

# Check metrics
kubectl top pods -n flamoral-prod

# Check error logs
kubectl logs deployment/api-gateway -n flamoral-prod --tail=100 | grep ERROR
```

**Action if Failed:** Investigate immediately, prepare for rollback

---

#### Checkpoint 2: T+30 Minutes

**Application Performance:**
- [ ] Website fully accessible
- [ ] All API endpoints responding
- [ ] Stripe webhooks processing correctly
- [ ] Email delivery working
- [ ] SMS delivery working (if applicable)
- [ ] File uploads working
- [ ] Real-time messaging working

**User Testing:**
- [ ] 5+ test users registered successfully
- [ ] End-to-end user journeys completed
- [ ] No critical bugs reported

**Monitoring:**
- [ ] Sentry: No critical errors
- [ ] Application Insights: Metrics normal
- [ ] UptimeRobot: All monitors green

**Action if Failed:** Investigate, fix minor issues, or initiate rollback if critical

---

#### Checkpoint 3: T+1 Hour

**Stability Check:**
- [ ] No pod restarts
- [ ] No memory leaks detected
- [ ] Database performance stable
- [ ] Cache hit rate > 70%
- [ ] No timeout errors
- [ ] External API calls succeeding

**Business Metrics:**
- [ ] User registrations working
- [ ] Payment processing working
- [ ] Match algorithm running
- [ ] Notifications sending

**Team Status:**
- [ ] No critical issues reported
- [ ] Support team: No escalations
- [ ] Monitoring: All green

**Action if Failed:** Address issues immediately or rollback

---

### 2.7 Rollback Procedures

**Rollback Decision Criteria:**

Immediate rollback if:
- Error rate > 5% for 5+ minutes
- Critical user journey broken
- Database corruption detected
- Payment processing failing
- Security breach detected
- > 50% of pods failing

Consider rollback if:
- Error rate > 2% for 15+ minutes
- Response time p95 > 2 seconds consistently
- Multiple non-critical issues

---

#### Rollback Option 1: Kubernetes Rollback (Fastest)

**Estimated Time:** 5-10 minutes

```bash
# Rollback all services to previous version
for service in user matching messaging media payment notification analytics moderation realtime api-gateway; do
  echo "Rolling back $service-service..."
  kubectl rollout undo deployment/$service-service -n flamoral-prod
done

# Rollback frontend
kubectl rollout undo deployment/web-app -n flamoral-prod

# Verify rollback
kubectl get pods -n flamoral-prod
kubectl rollout status deployment/user-service -n flamoral-prod
```

**Verification:**
- [ ] All pods running previous version
- [ ] Health checks passing
- [ ] Error rate back to normal
- [ ] Users can access application

---

#### Rollback Option 2: Database Rollback (If Needed)

**Only if database migration caused issues**

**Estimated Time:** 15-30 minutes

```bash
# Run rollback migration scripts
kubectl apply -f k8s/production/migration-rollback-job.yaml

# Monitor rollback
kubectl logs -f job/db-migration-rollback -n flamoral-prod

# Verify database state
# (Connect to database and verify schema version)
```

**WARNING:** Database rollback should be a last resort. Data loss may occur.

---

#### Rollback Option 3: Complete Rollback to Previous Release

**Estimated Time:** 20-30 minutes

```bash
# Re-run deployment with previous version tag
gh workflow run deploy-production.yml -f version=v0.9.9

# Or manually apply previous release
kubectl apply -f k8s/production/releases/v0.9.9/
```

---

### 2.8 Communication Templates

#### Launch Announcement (Internal - Slack)

```
🚀 **FLAMORAL PRODUCTION LAUNCH - IN PROGRESS**

Status: Deployment started
Time: [TIMESTAMP]
Version: v1.0.0

Current Progress:
✅ Database migration complete
✅ Backend services deploying
⏳ Frontend deployment in progress

Next Checkpoint: T+10 minutes

War Room: [ZOOM/TEAMS LINK]
Monitoring: [DASHBOARD LINKS]

Updates every 15 minutes.
```

#### Launch Success Announcement (Internal)

```
🎉 **FLAMORAL IS LIVE! 🎉**

Status: ✅ PRODUCTION DEPLOYMENT SUCCESSFUL
Time: [TIMESTAMP]
Version: v1.0.0

All Systems Green:
✅ All services healthy
✅ Website accessible
✅ Smoke tests passed
✅ No errors detected

Monitoring continues for the next 24 hours.

Next steps:
- Continue monitoring metrics
- Support team on standby
- Marketing announcement in 1 hour

Great work, team! 🚀
```

#### Launch Public Announcement (Social Media / Website)

```
🎊 Flamoral is now LIVE! 🎊

The future of dating is here. Join thousands of people finding meaningful connections.

✨ Smart matching algorithm
💬 Secure messaging
🎯 Authentic profiles
🔒 Your privacy, protected

Download now:
📱 iOS: [APP STORE LINK]
📱 Android: [PLAY STORE LINK]
🌐 Web: https://flamoral.com

Welcome to Flamoral! ❤️
```

#### Issue Detected Notification

```
⚠️ **ISSUE DETECTED DURING LAUNCH**

Status: Investigating
Severity: [CRITICAL/HIGH/MEDIUM/LOW]
Time Detected: [TIMESTAMP]
Issue: [BRIEF DESCRIPTION]

Actions:
- [TEAM MEMBER] investigating
- [ACTIONS BEING TAKEN]

Next Update: [TIME]

Rollback Status: [ON STANDBY / IN PROGRESS / NOT NEEDED]
```

#### Rollback Notification

```
🔄 **PRODUCTION ROLLBACK IN PROGRESS**

Reason: [REASON FOR ROLLBACK]
Time Started: [TIMESTAMP]
Rolling back to: v0.9.9

Status: [IN PROGRESS / COMPLETE]

Impact: [DESCRIBE USER IMPACT]

Next Steps:
1. Complete rollback
2. Investigate root cause
3. Fix issues
4. Re-schedule launch

Updates every 5 minutes.
```

---

## 3. Post-Launch Monitoring

### 3.1 Monitoring Schedule

**First 24 Hours: Continuous Monitoring**

| Time Period | Team On Duty | Focus Areas |
|-------------|--------------|-------------|
| Launch + 0-4 hours | Full team | All metrics, critical bugs |
| Launch + 4-8 hours | Core team | Error rates, performance |
| Launch + 8-12 hours | Rotating shifts | System stability |
| Launch + 12-24 hours | On-call rotation | Critical alerts only |

**Week 1: Enhanced Monitoring**
- Daily team sync (30 min)
- Review metrics twice daily
- Triage all bugs daily
- Support team check-ins

**Week 2-4: Standard Monitoring**
- Weekly team sync
- Daily automated reports
- Standard on-call rotation
- Monthly incident review

---

### 3.2 Key Metrics to Watch

#### 3.2.1 System Health Metrics

**Critical (Monitor Every 5 Minutes):**

| Metric | Target | Warning | Critical | Action |
|--------|--------|---------|----------|--------|
| Error Rate | < 0.1% | > 0.5% | > 1% | Investigate immediately |
| Response Time (p95) | < 500ms | > 1s | > 2s | Check slow queries |
| Response Time (p99) | < 1s | > 2s | > 5s | Optimize bottlenecks |
| Pod Availability | 100% | < 100% | < 90% | Scale up or investigate |
| CPU Usage | < 60% | > 70% | > 85% | Scale horizontally |
| Memory Usage | < 70% | > 80% | > 90% | Check memory leaks |
| Database Connections | < 70% | > 80% | > 95% | Check connection leaks |

**Monitoring Queries:**

```bash
# Error rate (last 5 minutes)
kubectl logs deployment/api-gateway -n flamoral-prod --since=5m | grep ERROR | wc -l

# Pod status
kubectl get pods -n flamoral-prod

# Resource usage
kubectl top pods -n flamoral-prod
```

---

#### 3.2.2 Application Performance Metrics

**Monitor Hourly:**

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| API Gateway Response Time | < 100ms | > 500ms |
| User Service Response Time | < 150ms | > 600ms |
| Matching Service Response Time | < 200ms | > 800ms |
| Messaging Service Response Time | < 100ms | > 500ms |
| Payment Service Response Time | < 300ms | > 1000ms |
| Database Query Time (avg) | < 50ms | > 200ms |
| Cache Hit Rate | > 80% | < 60% |
| Webhook Success Rate | > 99% | < 95% |

**Dashboards:**
- Application Insights: Performance Dashboard
- Sentry: Performance Monitoring
- Grafana: Service-specific dashboards

---

#### 3.2.3 Business Metrics

**Monitor Daily:**

| Metric | Day 1 Target | Week 1 Target | Notes |
|--------|--------------|---------------|-------|
| New User Registrations | 100+ | 500+ | Track registration funnel |
| Email Verification Rate | > 60% | > 70% | Monitor email delivery |
| Profile Completion Rate | > 50% | > 60% | Track onboarding flow |
| Daily Active Users (DAU) | 50+ | 200+ | Returning users |
| Match Rate | 10+ matches | 100+ matches | Algorithm effectiveness |
| Message Rate | 20+ messages | 150+ messages | User engagement |
| Subscription Conversions | 2+ | 10+ | Revenue tracking |
| Churn Rate | < 5% | < 3% | User retention |

**Business Dashboard:**
- Application Insights: Custom metrics
- Internal analytics dashboard
- Stripe dashboard for revenue

---

#### 3.2.4 Error Rate Thresholds

**Error Classification:**

| Error Type | Acceptable Rate | Warning | Critical | Response |
|------------|-----------------|---------|----------|----------|
| 4xx Errors (Client) | < 5% | > 10% | > 20% | Check API docs, improve UX |
| 5xx Errors (Server) | < 0.1% | > 0.5% | > 1% | Investigate immediately |
| Database Errors | 0% | > 0.1% | > 0.5% | Check DB health |
| Payment Errors | < 1% | > 2% | > 5% | Critical - fix immediately |
| Webhook Failures | < 1% | > 5% | > 10% | Check external services |
| Authentication Errors | < 0.5% | > 1% | > 2% | Check auth service |

**Error Monitoring:**

```bash
# Check error logs
kubectl logs deployment/user-service -n flamoral-prod | grep ERROR

# Sentry dashboard
# Filter by: severity, service, time range

# Application Insights
# Query: requests | where resultCode >= 500
```

---

#### 3.2.5 Performance Baselines

**Response Time Targets:**

| Endpoint | p50 | p95 | p99 | Max |
|----------|-----|-----|-----|-----|
| GET /api/users/:id | 50ms | 150ms | 300ms | 500ms |
| POST /api/auth/login | 100ms | 300ms | 600ms | 1000ms |
| GET /api/matches | 150ms | 400ms | 800ms | 1500ms |
| POST /api/messages | 80ms | 250ms | 500ms | 1000ms |
| POST /api/payments | 200ms | 600ms | 1200ms | 2000ms |
| GET /health | 10ms | 50ms | 100ms | 200ms |

**Database Query Baselines:**

| Query Type | Average | p95 | p99 | Notes |
|------------|---------|-----|-----|-------|
| User lookup by ID | 10ms | 30ms | 60ms | Indexed |
| Match algorithm query | 50ms | 150ms | 300ms | Complex query |
| Message history | 20ms | 60ms | 120ms | Paginated |
| Profile search | 40ms | 120ms | 250ms | Full-text search |

---

### 3.3 User Feedback Collection

#### 3.3.1 Feedback Channels

**Monitor Continuously:**

- [ ] **Support Email:** `support@flamoral.com`
  - Response time target: < 1 hour (first 24 hours)
  - Escalation: Critical issues immediately

- [ ] **In-App Feedback:** Feedback button in settings
  - Review daily
  - Tag by category (bug, feature request, general)

- [ ] **Social Media Monitoring**
  - Twitter: @flamoral mentions
  - Instagram: @flamoral comments
  - Facebook: Flamoral page comments
  - Reddit: r/flamoral (if exists)

- [ ] **App Store Reviews**
  - iOS App Store: Monitor daily
  - Google Play Store: Monitor daily
  - Respond to all reviews (especially negative)

- [ ] **Analytics Events**
  - Track user drop-off points
  - Monitor error events
  - Track feature usage

**Feedback Tracking:**

Create a feedback tracker (Notion, Airtable, or spreadsheet):

| Date | Source | Category | Priority | Issue | Status | Assigned To | Resolution |
|------|--------|----------|----------|-------|--------|-------------|------------|
| | | | | | | | |

**Categories:**
- Bug (Critical, High, Medium, Low)
- Feature Request
- User Experience
- Performance
- Security
- Other

---

#### 3.3.2 User Surveys

**Day 1 Survey (Soft Launch Users):**
- How did you hear about Flamoral?
- First impressions?
- Any issues encountered?
- Features you love?
- Features missing?
- Overall satisfaction: 1-10

**Week 1 Survey (Active Users):**
- How often do you use Flamoral?
- Have you found meaningful matches?
- App performance satisfaction?
- Would you recommend to friends?
- NPS (Net Promoter Score)

**Delivery:**
- In-app popup (non-intrusive)
- Email to active users
- Incentive: Free coins/boost for completion

---

### 3.4 Bug Triage Process

#### 3.4.1 Bug Severity Classification

**Priority P0 - Critical (Fix Immediately)**
- Application down or inaccessible
- Payment processing broken
- Data loss or corruption
- Security vulnerability
- Legal/compliance issue

**Priority P1 - High (Fix within 24 hours)**
- Major feature broken (login, messaging, matching)
- Performance degradation > 50%
- Widespread user impact (> 10% of users)
- Workaround available but poor UX

**Priority P2 - Medium (Fix within 1 week)**
- Minor feature broken
- Limited user impact (< 10% of users)
- UI/UX issues (not blocking)
- Edge case bugs

**Priority P3 - Low (Fix in next release)**
- Cosmetic issues
- Rare edge cases
- Nice-to-have improvements
- Non-critical enhancements

---

#### 3.4.2 Bug Triage Workflow

**Daily Bug Triage Meeting (First Week):**
- Time: 9:00 AM EST
- Duration: 30 minutes
- Attendees: DevOps, Backend Lead, Frontend Lead, QA Lead, Product Manager

**Agenda:**
1. Review new bugs (from previous 24 hours)
2. Assign severity and priority
3. Assign to team member
4. Set target resolution date
5. Update stakeholders

**Bug Tracking:**

Use GitHub Issues or Jira with these fields:
- **Title:** Clear, descriptive
- **Description:** Steps to reproduce, expected vs actual behavior
- **Environment:** Production, staging, mobile, web
- **Severity:** P0, P1, P2, P3
- **Status:** New, Triaged, In Progress, In Review, Resolved, Closed
- **Assigned To:** Team member
- **Labels:** bug, backend, frontend, mobile, performance, security
- **Due Date:** Based on priority

---

#### 3.4.3 Hotfix Process

**For P0/P1 bugs requiring immediate fix:**

```bash
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug-name

# 2. Make fix and test locally
npm test
npm run lint

# 3. Create PR (fast-track review)
gh pr create --title "Hotfix: [Bug Description]" \
             --body "P0 Bug - Requires immediate deployment" \
             --reviewer @devops-team

# 4. After approval, merge to main
git checkout main
git merge hotfix/critical-bug-name
git push origin main

# 5. Tag hotfix version
git tag -a v1.0.1 -m "Hotfix: [Bug Description]"
git push origin v1.0.1

# 6. Deploy to production
gh workflow run deploy-production.yml -f version=v1.0.1
```

**Hotfix Deployment Checklist:**
- [ ] Fix verified in staging
- [ ] Tests passing
- [ ] Code review approved
- [ ] DevOps notified
- [ ] Monitoring ready
- [ ] Rollback plan ready
- [ ] Deploy during low-traffic window (if possible)
- [ ] Monitor for 1 hour post-deploy

---

### 3.5 Daily Monitoring Reports

**Automated Daily Report (Email to Team):**

**Subject:** Flamoral Daily Report - [Date]

**System Health:**
- Uptime: 99.98%
- Error Rate: 0.12%
- Average Response Time: 187ms (p95: 542ms)
- Total Requests: 1.2M

**New Users:**
- Registrations: 234
- Email Verifications: 156 (67%)
- Profile Completions: 98 (42%)

**Engagement:**
- Daily Active Users: 1,234
- Matches Created: 89
- Messages Sent: 567

**Revenue:**
- New Subscriptions: 12
- Subscription Revenue: $239.88
- Coin Sales: $78.50
- Total Daily Revenue: $318.38

**Issues:**
- New Bugs: 3 (1 P1, 2 P2)
- Resolved: 5
- Open: 8 (1 P0, 2 P1, 5 P2)

**Alerts:**
- Critical: 0
- Warnings: 2 (High memory usage on media-service)

**Actions Required:**
- Investigate media-service memory usage
- Review P1 bug (#234)

---

**Dashboard Links:**
- System Metrics: [LINK]
- Application Insights: [LINK]
- Sentry: [LINK]
- Business Metrics: [LINK]

---

## 4. Incident Response

### 4.1 Incident Classification

#### Severity Levels

**SEV1 - Critical (All Hands on Deck)**
- **Definition:** Complete service outage or critical security breach
- **Examples:**
  - Website completely down
  - All APIs returning 500 errors
  - Database down
  - Payment system completely broken
  - Active security attack
  - Data breach
- **Response Time:** Immediate (< 5 minutes)
- **Team:** All on-call engineers
- **Communication:** Every 15 minutes
- **Resolution Target:** < 1 hour

**SEV2 - High (Urgent)**
- **Definition:** Major feature broken or significant performance degradation
- **Examples:**
  - Login/registration broken
  - Messaging not working
  - Matching algorithm down
  - Payment processing failing for some users
  - Error rate > 5%
  - Response time > 5 seconds
- **Response Time:** < 15 minutes
- **Team:** On-call engineer + relevant team leads
- **Communication:** Every 30 minutes
- **Resolution Target:** < 4 hours

**SEV3 - Medium (Important)**
- **Definition:** Minor feature broken or performance issues
- **Examples:**
  - Profile photo upload failing
  - Email notifications delayed
  - Minor UI bugs
  - Error rate 1-5%
  - Slow response times (2-5 seconds)
- **Response Time:** < 1 hour
- **Team:** On-call engineer
- **Communication:** Hourly
- **Resolution Target:** < 24 hours

**SEV4 - Low (Minor)**
- **Definition:** Cosmetic issues or edge cases
- **Examples:**
  - UI alignment issues
  - Non-critical feature not working
  - Rare edge case bugs
- **Response Time:** Next business day
- **Team:** Regular development process
- **Communication:** As needed
- **Resolution Target:** < 1 week

---

### 4.2 Incident Response Process

#### 4.2.1 Incident Detection

**Automated Alerts:**
- Sentry: Critical error spike
- UptimeRobot: Service down
- Application Insights: Performance degradation
- Kubernetes: Pod crash loops
- Azure: Resource alerts

**Manual Detection:**
- User reports via support
- Team member notices issue
- Monitoring dashboard observation

---

#### 4.2.2 Incident Workflow

**Step 1: Incident Declared (T+0)**

```
1. Person detecting issue declares incident
2. Create incident in incident management system (PagerDuty, Opsgenie)
3. Assign incident commander
4. Open incident channel: #incident-[ID]
5. Page on-call engineer(s)
6. Start incident timeline document
```

**Incident Declaration Template:**

```
🚨 INCIDENT DECLARED: SEV[1/2/3/4]

Incident ID: INC-2025-001
Time Detected: [TIMESTAMP]
Detected By: [NAME]
Severity: [SEV LEVEL]

Symptoms:
- [WHAT USERS ARE EXPERIENCING]
- [WHAT ALERTS FIRED]

Impact:
- Affected Users: [ESTIMATED %]
- Affected Services: [LIST]
- Data Loss Risk: [YES/NO]

Incident Commander: [NAME]
On-Call: [NAME(S)]

Incident Channel: #incident-INC-2025-001
War Room: [VIDEO CALL LINK]

Updates every: [15/30/60] minutes
```

---

**Step 2: Assess & Triage (T+5)**

```
1. Incident Commander gathers information
2. Verify incident severity
3. Determine scope of impact
4. Identify affected services
5. Check for data integrity issues
6. Estimate time to resolution
```

**Assessment Checklist:**
- [ ] What is broken?
- [ ] How many users affected?
- [ ] When did it start?
- [ ] Is it getting worse?
- [ ] What changed recently?
- [ ] Is data at risk?

---

**Step 3: Assemble Response Team (T+10)**

**SEV1 Incidents:**
- Incident Commander
- On-call DevOps Engineer
- Backend Lead
- Database Administrator
- Security Lead (if security-related)
- Product Manager
- Customer Support Lead

**SEV2 Incidents:**
- Incident Commander
- On-call Engineer
- Relevant service owner
- DevOps on standby

**SEV3/4 Incidents:**
- On-call Engineer
- Relevant service owner

---

**Step 4: Immediate Mitigation (T+15)**

**Priority: Stop the bleeding**

**Mitigation Options (in order of preference):**

1. **Rollback to Previous Version**
   ```bash
   kubectl rollout undo deployment/[SERVICE] -n flamoral-prod
   ```

2. **Scale Up Resources**
   ```bash
   kubectl scale deployment/[SERVICE] --replicas=10 -n flamoral-prod
   ```

3. **Restart Pods**
   ```bash
   kubectl rollout restart deployment/[SERVICE] -n flamoral-prod
   ```

4. **Disable Feature (Feature Flag)**
   ```bash
   # Turn off problematic feature
   kubectl set env deployment/[SERVICE] FEATURE_FLAG_X=false -n flamoral-prod
   ```

5. **Traffic Rerouting**
   ```bash
   # Route traffic away from affected service
   kubectl patch ingress flamoral -n flamoral-prod -p '[PATCH]'
   ```

6. **Database Failover** (if database issue)
   ```bash
   # Failover to replica
   # (Specific to database provider)
   ```

---

**Step 5: Root Cause Investigation (Parallel to Mitigation)**

**Investigation Questions:**
- What changed in the last 24 hours?
  - Code deployments
  - Configuration changes
  - Infrastructure changes
  - Database schema changes

- What do the logs say?
  ```bash
  kubectl logs deployment/[SERVICE] -n flamoral-prod --tail=500
  ```

- What do the metrics show?
  - CPU/Memory usage spike?
  - Error rate increase?
  - Response time increase?
  - Database query slowdown?

- Is this a known issue?
  - Check past incidents
  - Check GitHub issues
  - Check vendor status pages

---

**Step 6: Resolution & Verification (T+Variable)**

**Resolution Actions:**
1. Apply fix (hotfix deployment)
2. Verify fix in staging first (if time permits)
3. Deploy to production
4. Monitor closely for 30 minutes
5. Verify all metrics back to normal

**Verification Checklist:**
- [ ] Error rate back to < 0.5%
- [ ] Response time back to normal
- [ ] All pods healthy
- [ ] No new errors in logs
- [ ] User-reported issues resolved
- [ ] Monitoring dashboards green

---

**Step 7: Communication Updates**

**Update Template:**

```
📊 INCIDENT UPDATE: INC-2025-001 (SEV1)

Status: [INVESTIGATING / MITIGATING / RESOLVED]
Time: [TIMESTAMP] (T+45 minutes)

Current Situation:
- [WHAT'S HAPPENING NOW]

Actions Taken:
- [ACTION 1]
- [ACTION 2]

Impact:
- Users Affected: [ESTIMATED %]
- Service Status: [STATUS]

Next Update: [TIME]
ETA to Resolution: [ESTIMATE]
```

**Communication Channels:**
- Internal: Slack #incident-[ID]
- External: Status page (status.flamoral.com)
- Social Media: Twitter @flamoral (for major outages)
- Email: To affected customers (post-resolution)

---

**Step 8: Incident Closure (After Resolution)**

```
1. Verify incident fully resolved
2. Monitor for 1 hour post-fix
3. Update status page: "All systems operational"
4. Thank response team
5. Schedule post-incident review (within 24-48 hours)
6. Close incident
```

**Incident Closure Template:**

```
✅ INCIDENT RESOLVED: INC-2025-001

Resolution Time: [TIMESTAMP]
Total Duration: [X hours Y minutes]
Severity: SEV[1/2/3/4]

Issue: [BRIEF DESCRIPTION]

Root Cause: [ROOT CAUSE]

Resolution: [WHAT WAS DONE]

Impact:
- Users Affected: [NUMBER/%]
- Duration: [TIME]
- Data Loss: [YES/NO]

Follow-up Actions:
- [ ] Post-incident review scheduled: [DATE/TIME]
- [ ] Hotfix deployed: [VERSION]
- [ ] Documentation updated
- [ ] Monitoring improved

Thank you to: [TEAM MEMBERS]

Post-Incident Review: [LINK TO DOCUMENT]
```

---

### 4.3 Escalation Procedures

#### 4.3.1 Escalation Path

**Level 1: On-Call Engineer**
- Initial response
- First 30 minutes of investigation
- Routine incidents (SEV3, SEV4)

**Level 2: Team Lead**
- After 30 minutes without resolution
- SEV2 incidents
- Complex technical issues

**Level 3: Engineering Manager + DevOps Lead**
- After 1 hour without resolution
- SEV1 incidents
- Cross-service issues

**Level 4: CTO**
- SEV1 incidents > 2 hours
- Security breaches
- Legal/compliance issues
- Executive decision needed

**Level 5: CEO**
- Public relations crisis
- Major business impact
- Legal action required

---

#### 4.3.2 When to Escalate

**Immediate Escalation (Don't Wait):**
- SEV1 incidents
- Security breach detected
- Data loss confirmed
- Legal/compliance violation
- Media attention
- Unable to access critical systems

**Escalate After Timeframe:**
- SEV2: After 1 hour
- SEV3: After 4 hours
- SEV4: After 24 hours

**Escalate If:**
- Need additional resources
- Need business decision
- Root cause unclear
- Fix not working
- Situation worsening

---

### 4.4 Communication Protocols

#### 4.4.1 Internal Communication

**Slack Channels:**
- `#incidents` - All incident notifications
- `#incident-[ID]` - Specific incident war room
- `#on-call` - On-call engineer coordination
- `#engineering` - General engineering updates
- `#leadership` - Executive updates (SEV1/SEV2)

**War Room (Video Call):**
- For SEV1 incidents: Mandatory
- For SEV2 incidents: Recommended
- All responders join and stay until resolved
- Mute when not speaking
- Incident Commander leads discussion

**Status Updates:**
- SEV1: Every 15 minutes
- SEV2: Every 30 minutes
- SEV3: Every hour
- SEV4: Daily

---

#### 4.4.2 External Communication

**Status Page: https://status.flamoral.com**

**Status Levels:**
- 🟢 **Operational:** All systems normal
- 🟡 **Degraded Performance:** Service slow but functional
- 🟠 **Partial Outage:** Some features unavailable
- 🔴 **Major Outage:** Service unavailable

**Update Template (Status Page):**

```
🔴 Investigating - We're currently investigating issues with [SERVICE]
   [TIMESTAMP]

🟡 Identified - We've identified the issue and are working on a fix
   [TIMESTAMP]

🔧 Monitoring - A fix has been deployed and we're monitoring results
   [TIMESTAMP]

✅ Resolved - This incident has been resolved
   [TIMESTAMP]
```

**Social Media (Twitter @flamoral):**
- Only for major outages (SEV1)
- Keep brief and factual
- Provide status page link
- Avoid technical jargon

**Example Tweet:**
```
We're aware that some users are experiencing issues accessing Flamoral.
Our team is investigating and working on a fix.

Status updates: https://status.flamoral.com

We apologize for the inconvenience.
```

**Email to Affected Users (Post-Resolution):**

**Subject:** Flamoral Service Update - [Date]

```
Hi [First Name],

We wanted to let you know that on [Date] between [Time] and [Time],
you may have experienced issues with [SERVICE/FEATURE].

What happened:
[BRIEF EXPLANATION]

What we did:
[ACTIONS TAKEN]

Impact to your account:
[ANY DATA LOSS OR ISSUES]

What we're doing to prevent this:
[PREVENTIVE MEASURES]

We sincerely apologize for any inconvenience this may have caused.

As a token of our appreciation for your patience, we've added [GIFT:
50 coins / 1 free boost / 1 week premium] to your account.

If you have any questions, please contact us at support@flamoral.com

Thank you,
The Flamoral Team
```

---

### 4.5 Post-Incident Review Template

**Schedule within 24-48 hours of incident resolution**

**Attendees:**
- Incident Commander
- All incident responders
- Service owners
- Engineering Manager
- Product Manager
- CTO (for SEV1 incidents)

**Duration:** 60-90 minutes

---

#### Post-Incident Review Document

```markdown
# Post-Incident Review: INC-2025-001

**Date of Incident:** [Date]
**Date of Review:** [Date]
**Incident Commander:** [Name]
**Attendees:** [Names]

---

## Incident Summary

**Severity:** SEV[1/2/3/4]
**Duration:** [X hours Y minutes]
**Time to Detection:** [Minutes]
**Time to Mitigation:** [Minutes]
**Time to Resolution:** [Minutes]

**Impact:**
- Users Affected: [Number/Percentage]
- Requests Failed: [Number]
- Revenue Lost: $[Amount] (estimate)
- Data Loss: [Yes/No - details]

---

## Timeline

| Time | Event | Actions Taken |
|------|-------|---------------|
| T+0  | Incident detected | Alert fired in Sentry |
| T+5  | Incident declared | On-call engineer paged |
| T+10 | Team assembled | War room opened |
| T+15 | Root cause identified | Database connection pool exhausted |
| T+20 | Mitigation started | Increased connection pool size |
| T+30 | Service restored | Error rate back to normal |
| T+60 | Incident closed | Monitoring confirmed stable |

---

## What Happened

**Root Cause:**
[Detailed technical explanation of what went wrong]

**Contributing Factors:**
- [Factor 1]
- [Factor 2]
- [Factor 3]

**Why It Wasn't Caught Earlier:**
- [Monitoring gap]
- [Testing gap]
- [Other reasons]

---

## What Went Well

- [Thing 1]
- [Thing 2]
- [Thing 3]

---

## What Went Wrong

- [Issue 1]
- [Issue 2]
- [Issue 3]

---

## Action Items

| Action | Owner | Due Date | Priority | Status |
|--------|-------|----------|----------|--------|
| Add monitoring for connection pool usage | @DevOps | 2025-XX-XX | P1 | Open |
| Increase default connection pool size | @Backend | 2025-XX-XX | P1 | Open |
| Add automated alerts for similar issues | @DevOps | 2025-XX-XX | P2 | Open |
| Update runbook with new mitigation steps | @OnCall | 2025-XX-XX | P2 | Open |
| Load testing with higher concurrency | @QA | 2025-XX-XX | P3 | Open |

---

## Lessons Learned

**Technical:**
- [Lesson 1]
- [Lesson 2]

**Process:**
- [Lesson 1]
- [Lesson 2]

**Communication:**
- [Lesson 1]
- [Lesson 2]

---

## Preventive Measures

**Short-term (This Week):**
- [Action 1]
- [Action 2]

**Medium-term (This Month):**
- [Action 1]
- [Action 2]

**Long-term (This Quarter):**
- [Action 1]
- [Action 2]

---

## Appendix

**Related Documents:**
- Incident Timeline: [Link]
- Monitoring Dashboards: [Link]
- Slack Thread: [Link]
- Code Changes: [PR Links]

**Incident Log:**
[Full chronological log of all actions and communications]
```

---

### 4.6 Incident Response Runbooks

#### Common Incidents & Quick Fixes

**🔴 Incident: Service Completely Down**

**Symptoms:**
- Health check endpoint returning 500/503
- All API requests failing
- Multiple pod restarts

**Quick Diagnosis:**
```bash
kubectl get pods -n flamoral-prod
kubectl describe pod [POD-NAME] -n flamoral-prod
kubectl logs [POD-NAME] -n flamoral-prod --tail=100
```

**Quick Fix:**
```bash
# Option 1: Rollback
kubectl rollout undo deployment/[SERVICE] -n flamoral-prod

# Option 2: Restart
kubectl rollout restart deployment/[SERVICE] -n flamoral-prod

# Option 3: Scale up
kubectl scale deployment/[SERVICE] --replicas=5 -n flamoral-prod
```

---

**🟠 Incident: High Error Rate**

**Symptoms:**
- Error rate > 5%
- Sentry alert firing
- Specific endpoint failing

**Quick Diagnosis:**
```bash
# Check recent logs
kubectl logs deployment/[SERVICE] -n flamoral-prod --tail=500 | grep ERROR

# Check Sentry dashboard
# Identify error pattern
```

**Quick Fix:**
```bash
# If recent deployment caused it:
kubectl rollout undo deployment/[SERVICE] -n flamoral-prod

# If external service issue:
# Check vendor status pages (Stripe, SendGrid, Twilio)

# If database issue:
# Check database connection pool
# Check slow query log
```

---

**🟡 Incident: Slow Response Times**

**Symptoms:**
- Response time p95 > 2 seconds
- Users reporting slowness
- Timeout errors

**Quick Diagnosis:**
```bash
# Check resource usage
kubectl top pods -n flamoral-prod

# Check database performance
# (Connect to database, check active queries)

# Check Application Insights
# Identify slow endpoints
```

**Quick Fix:**
```bash
# Scale up pods
kubectl scale deployment/[SERVICE] --replicas=10 -n flamoral-prod

# Clear Redis cache (if stale data)
redis-cli FLUSHDB

# Restart database connection pool
kubectl rollout restart deployment/[SERVICE] -n flamoral-prod
```

---

**🟣 Incident: Payment Processing Failing**

**Symptoms:**
- Stripe webhook failures
- Users can't subscribe
- Payment errors in Sentry

**Quick Diagnosis:**
```bash
# Check payment service logs
kubectl logs deployment/payment-service -n flamoral-prod --tail=200

# Check Stripe dashboard
# - Webhook logs
# - Payment failures

# Verify Stripe API keys
kubectl get secret flamoral-prod-secrets -n flamoral-prod -o yaml | grep STRIPE
```

**Quick Fix:**
```bash
# Restart payment service
kubectl rollout restart deployment/payment-service -n flamoral-prod

# Verify webhook secret
# (May need to regenerate in Stripe dashboard)

# Check Stripe service status
# https://status.stripe.com
```

---

**🔵 Incident: Database Connection Issues**

**Symptoms:**
- "Connection pool exhausted" errors
- "Too many connections" errors
- Services timing out

**Quick Diagnosis:**
```bash
# Check active database connections
# (Connect to database)
SELECT COUNT(*) FROM pg_stat_activity;

# Check service logs
kubectl logs deployment/user-service -n flamoral-prod | grep "database"
```

**Quick Fix:**
```bash
# Restart services to reset connection pools
kubectl rollout restart deployment/user-service -n flamoral-prod
kubectl rollout restart deployment/matching-service -n flamoral-prod

# If persistent, increase connection pool size
# Update environment variable: DATABASE_POOL_SIZE=100
```

---

## 5. Scaling Procedures

### 5.1 When to Scale

#### 5.1.1 Scaling Triggers

**Automatic Scaling (HPA - Horizontal Pod Autoscaler):**

Already configured for these metrics:
- CPU usage > 70% → Scale up
- Memory usage > 80% → Scale up
- CPU usage < 30% for 5 minutes → Scale down
- Request rate (custom metric) → Scale based on load

**Manual Scaling Indicators:**

**Scale UP when:**
- Response time p95 > 1 second consistently
- CPU usage > 80% for 10+ minutes
- Memory usage > 85% for 10+ minutes
- Error rate increasing (> 1%)
- Queue lengths growing
- User complaints about slowness
- Anticipated traffic spike (marketing campaign, press coverage)

**Scale DOWN when:**
- CPU usage < 20% for 1+ hour
- Memory usage < 40% for 1+ hour
- Off-peak hours (predictable patterns)
- Cost optimization during low traffic

---

### 5.2 How to Scale Each Component

#### 5.2.1 Backend Services (Kubernetes Pods)

**Manual Scaling:**

```bash
# Scale specific service
kubectl scale deployment/user-service --replicas=10 -n flamoral-prod

# Scale all services
for service in user matching messaging media payment notification analytics moderation realtime api-gateway; do
  kubectl scale deployment/$service-service --replicas=8 -n flamoral-prod
done

# Verify scaling
kubectl get pods -n flamoral-prod
kubectl top pods -n flamoral-prod
```

**HPA Configuration (if not using auto-scaling):**

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: user-service-hpa
  namespace: flamoral-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: user-service
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

**Recommended Replica Counts:**

| Service | Min | Normal | High Load | Max |
|---------|-----|--------|-----------|-----|
| API Gateway | 3 | 5 | 10 | 20 |
| User Service | 3 | 5 | 10 | 15 |
| Matching Service | 2 | 3 | 8 | 12 |
| Messaging Service | 3 | 5 | 10 | 20 |
| Payment Service | 2 | 3 | 6 | 10 |
| Media Service | 2 | 3 | 8 | 15 |
| Notification Service | 2 | 3 | 8 | 12 |
| Analytics Service | 1 | 2 | 4 | 8 |
| Moderation Service | 1 | 2 | 4 | 8 |
| Realtime Service | 3 | 5 | 10 | 20 |

---

#### 5.2.2 AKS Cluster Nodes

**Manual Node Scaling:**

```bash
# Scale AKS node pool
az aks scale \
  --resource-group rg-flamoral-prod-westus2 \
  --name flamoral-prod-aks \
  --node-count 8 \
  --nodepool-name nodepool1

# Verify node count
kubectl get nodes
```

**Auto-Scaling (Cluster Autoscaler):**

Should already be enabled. Configuration:

```yaml
minCount: 3
maxCount: 15
enableAutoScaling: true
```

**When to Add Nodes:**
- Pods pending due to insufficient resources
- Node CPU > 80% across all nodes
- Node memory > 85% across all nodes
- Many pods in "Pending" state

**Verification:**
```bash
kubectl get nodes
kubectl describe nodes | grep -A 5 "Allocated resources"
```

---

#### 5.2.3 Database Scaling

**Azure SQL Database Scaling:**

**Vertical Scaling (Upgrade Tier):**

Current: S3 (100 DTUs, 100GB)

Upgrade options:
- S6: 200 DTUs, 250GB
- S9: 400 DTUs, 500GB
- S12: 800 DTUs, 1TB
- P1: Premium tier (125 DTUs + better performance)

```bash
# Scale up database tier
az sql db update \
  --resource-group rg-flamoral-prod-westus2 \
  --server flamoral-prod-sql \
  --name flamoral-prod-db \
  --service-objective S6

# Monitor during scaling (no downtime)
az sql db show \
  --resource-group rg-flamoral-prod-westus2 \
  --server flamoral-prod-sql \
  --name flamoral-prod-db \
  --query "status"
```

**When to Scale Database:**
- DTU usage > 80% consistently
- Slow query log showing many slow queries
- Connection timeouts
- Lock waits increasing
- Growing dataset (approaching storage limit)

**Read Replicas (for heavy read load):**

```bash
# Create read replica
az sql db replica create \
  --name flamoral-prod-db-replica \
  --resource-group rg-flamoral-prod-westus2 \
  --server flamoral-prod-sql \
  --source-database flamoral-prod-db
```

Route read-only queries to replica:
- Use separate connection string for read-only operations
- Update application configuration

---

#### 5.2.4 Redis Cache Scaling

**Azure Cache for Redis Scaling:**

Current: Standard tier (2.5GB)

Upgrade options:
- Standard C1: 1GB
- Standard C2: 2.5GB
- Standard C3: 6GB
- Premium P1: 6GB (with clustering)
- Premium P2: 13GB
- Premium P3: 26GB
- Premium P4: 53GB

```bash
# Scale Redis cache
az redis update \
  --name flamoral-prod-redis \
  --resource-group rg-flamoral-prod-westus2 \
  --sku Premium \
  --vm-size P1

# Monitor scaling (causes brief connection disruption)
```

**When to Scale Redis:**
- Memory usage > 80%
- Cache evictions increasing
- High latency (> 10ms)
- Connection timeouts

---

#### 5.2.5 Storage (Azure Blob Storage)

**No manual scaling needed** - Azure Blob Storage scales automatically.

**Optimizations:**
- Enable CDN for frequently accessed files
- Use Blob lifecycle policies to archive old files
- Compress images before upload

---

### 5.3 Cost Implications

#### 5.3.1 Estimated Costs by Scale

**Small Scale (Launch Day):**
- 100-500 daily active users
- AKS: 5 nodes (D2s_v3) = $180/month
- Azure SQL: S3 tier = $150/month
- Redis: Standard C2 = $75/month
- Storage: 100GB = $2/month
- Bandwidth: 500GB = $40/month
- **Total: ~$450/month**

**Medium Scale (Month 1-3):**
- 1,000-5,000 daily active users
- AKS: 8 nodes (D2s_v3) = $288/month
- Azure SQL: S6 tier = $300/month
- Redis: Standard C3 = $150/month
- Storage: 500GB = $10/month
- Bandwidth: 2TB = $170/month
- **Total: ~$920/month**

**Large Scale (Month 6+):**
- 10,000+ daily active users
- AKS: 12 nodes (D4s_v3) = $864/month
- Azure SQL: S12 tier = $1,200/month
- Redis: Premium P1 = $500/month
- Storage: 2TB = $40/month
- Bandwidth: 10TB = $830/month
- **Total: ~$3,400/month**

**Cost Optimization Tips:**
- Use reserved instances for predictable workloads (save 30-50%)
- Scale down during off-peak hours
- Use auto-scaling to match demand
- Archive old data to cool/archive storage
- Optimize images and videos (compression)
- Enable CDN to reduce bandwidth costs

---

### 5.4 Scaling Playbooks

#### Playbook 1: Traffic Spike (Expected)

**Scenario:** Marketing campaign launching, expect 5x traffic

**Pre-emptive Actions (1 hour before):**

```bash
# 1. Scale all backend services
kubectl scale deployment/api-gateway --replicas=15 -n flamoral-prod
kubectl scale deployment/user-service --replicas=12 -n flamoral-prod
kubectl scale deployment/matching-service --replicas=10 -n flamoral-prod
kubectl scale deployment/messaging-service --replicas=12 -n flamoral-prod
kubectl scale deployment/media-service --replicas=10 -n flamoral-prod

# 2. Scale AKS nodes
az aks scale --resource-group rg-flamoral-prod-westus2 \
             --name flamoral-prod-aks \
             --node-count 12

# 3. Increase database tier (if needed)
az sql db update --resource-group rg-flamoral-prod-westus2 \
                 --server flamoral-prod-sql \
                 --name flamoral-prod-db \
                 --service-objective S6

# 4. Pre-warm Redis cache
# (Run cache warming script)

# 5. Alert team
# Post in #engineering: "Traffic spike expected, scaled infrastructure"

# 6. Monitor closely
# Watch dashboards every 5 minutes
```

**After Traffic Returns to Normal:**

```bash
# Scale back down gradually
# Wait 2 hours after traffic normalizes

kubectl scale deployment/api-gateway --replicas=5 -n flamoral-prod
# ... (scale other services)

az aks scale --resource-group rg-flamoral-prod-westus2 \
             --name flamoral-prod-aks \
             --node-count 5
```

---

#### Playbook 2: Unexpected Traffic Spike

**Scenario:** Sudden 10x traffic (viral post, news coverage)

**Emergency Actions:**

```bash
# 1. Immediately scale critical services
kubectl scale deployment/api-gateway --replicas=20 -n flamoral-prod
kubectl scale deployment/user-service --replicas=15 -n flamoral-prod
kubectl scale deployment/messaging-service --replicas=15 -n flamoral-prod

# 2. Enable aggressive caching
# (Update cache TTL settings)

# 3. Scale AKS nodes max
az aks scale --resource-group rg-flamoral-prod-westus2 \
             --name flamoral-prod-aks \
             --node-count 15

# 4. Alert ALL team members
# Post in #engineering, #on-call, #leadership

# 5. Monitor critical metrics
# Error rate, response time, CPU, memory

# 6. Disable non-essential features if needed
# (Use feature flags to reduce load)

# 7. Upgrade database tier if slow
az sql db update --resource-group rg-flamoral-prod-westus2 \
                 --server flamoral-prod-sql \
                 --name flamoral-prod-db \
                 --service-objective S9

# 8. Consider rate limiting if malicious
# (Update ingress rate limit settings)
```

---

#### Playbook 3: Database Performance Degradation

**Scenario:** Database queries slowing down, affecting all services

**Diagnosis:**

```bash
# Check database DTU usage
az sql db show-usage --resource-group rg-flamoral-prod-westus2 \
                     --server flamoral-prod-sql \
                     --name flamoral-prod-db

# Connect to database and check active queries
SELECT * FROM pg_stat_activity WHERE state = 'active';

# Check slow query log
SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;
```

**Immediate Actions:**

```bash
# 1. Kill long-running queries (if blocking)
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'active' AND query_start < NOW() - INTERVAL '5 minutes';

# 2. Scale up database tier
az sql db update --resource-group rg-flamoral-prod-westus2 \
                 --server flamoral-prod-sql \
                 --name flamoral-prod-db \
                 --service-objective S6

# 3. Increase connection pool size
kubectl set env deployment/user-service DATABASE_POOL_SIZE=100 -n flamoral-prod

# 4. Clear application cache (force refresh)
redis-cli FLUSHDB

# 5. Restart services (reset connection pools)
kubectl rollout restart deployment/user-service -n flamoral-prod
```

**Long-term Solutions:**
- Add missing indexes
- Optimize slow queries
- Implement query caching
- Consider read replicas

---

## 6. Emergency Contacts

### 6.1 On-Call Rotation

**Primary On-Call (24/7 Coverage):**

| Week | Engineer | Phone | Email | Backup |
|------|----------|-------|-------|--------|
| Dec 11-17 | John Doe | +1-555-0101 | john@flamoral.com | Jane Smith |
| Dec 18-24 | Jane Smith | +1-555-0102 | jane@flamoral.com | Mike Johnson |
| Dec 25-31 | Mike Johnson | +1-555-0103 | mike@flamoral.com | John Doe |

**Secondary On-Call (Escalation):**

| Role | Name | Phone | Email | Availability |
|------|------|-------|-------|--------------|
| DevOps Lead | Sarah Wilson | +1-555-0201 | sarah@flamoral.com | Business hours + emergencies |
| Backend Lead | Tom Anderson | +1-555-0202 | tom@flamoral.com | Business hours + emergencies |
| Database Admin | Lisa Chen | +1-555-0203 | lisa@flamoral.com | Business hours + emergencies |

---

### 6.2 Vendor Support Contacts

#### Azure Support

- **Support Portal:** https://portal.azure.com/#blade/Microsoft_Azure_Support/HelpAndSupportBlade
- **Phone:** +1-800-642-7676
- **Support Plan:** Standard (24/7 technical support)
- **Account Manager:** [NAME], [EMAIL], [PHONE]
- **Critical Issue Escalation:** File support ticket with Severity A

---

#### Stripe Support

- **Dashboard:** https://dashboard.stripe.com/support
- **Email:** support@stripe.com
- **Chat:** Available in dashboard (24/7)
- **Phone:** +1-888-926-2289 (for accounts > $10k/month)
- **Critical Payment Issues:** Use chat or email with "URGENT" in subject
- **Status Page:** https://status.stripe.com

---

#### SendGrid Support

- **Support Portal:** https://support.sendgrid.com/
- **Email:** support@sendgrid.com
- **Phone:** +1-877-969-8647 (Silver plan and above)
- **Live Chat:** Available in portal (business hours)
- **Status Page:** https://status.sendgrid.com

---

#### Twilio Support

- **Support Portal:** https://support.twilio.com/
- **Email:** help@twilio.com
- **Phone:** +1-855-853-2235
- **Live Chat:** Available in console (business hours)
- **Critical SMS Issues:** File ticket with "High Priority"
- **Status Page:** https://status.twilio.com

---

#### Sentry Support

- **Support Portal:** https://sentry.io/support/
- **Email:** support@sentry.io
- **Documentation:** https://docs.sentry.io/
- **Status Page:** https://status.sentry.io
- **Community:** Discord & GitHub Discussions

---

#### Domain Registrar (Varies)

- **GoDaddy:** +1-480-505-8877
- **Namecheap:** +1-866-349-0999
- **CloudFlare Registrar:** support@cloudflare.com
- **Status:** [REGISTRAR STATUS PAGE]

---

### 6.3 Internal Escalation Paths

#### Tier 1: First Responder (On-Call Engineer)
- **Response Time:** < 15 minutes
- **Responsibility:** Initial triage, diagnosis, mitigation
- **Escalate to Tier 2 if:** Can't resolve within 30 minutes, need expertise

---

#### Tier 2: Team Leads
- **DevOps Lead:** Infrastructure, deployment, database issues
- **Backend Lead:** API, microservices, business logic
- **Frontend Lead:** Web/mobile app issues, UI/UX
- **Response Time:** < 30 minutes
- **Escalate to Tier 3 if:** Can't resolve within 1 hour, need resources

---

#### Tier 3: Engineering Management
- **Engineering Manager:** Resource allocation, cross-team coordination
- **DevOps Manager:** Infrastructure decisions
- **Response Time:** < 1 hour
- **Escalate to Tier 4 if:** Need executive decision, PR crisis, security breach

---

#### Tier 4: Executive Leadership
- **CTO:** Technical strategy, major incidents, vendor escalations
- **CEO:** Business impact, legal issues, PR crisis, board communication
- **Response Time:** < 2 hours
- **Escalate to Tier 5 if:** Legal action, regulatory, public safety

---

#### Tier 5: External Resources
- **Legal Counsel:** Data breaches, lawsuits, compliance violations
- **PR Firm:** Media crisis, reputation management
- **Security Consultants:** Major security incidents
- **Law Enforcement:** Criminal activity, threats

---

### 6.4 Communication Directory

#### Team Email Lists

| List | Email | Purpose |
|------|-------|---------|
| Engineering Team | engineering@flamoral.com | All engineers |
| DevOps Team | devops@flamoral.com | Infrastructure & deployment |
| On-Call Engineers | oncall@flamoral.com | Current on-call rotation |
| Leadership Team | leadership@flamoral.com | Executives & managers |
| Support Team | support@flamoral.com | Customer support |
| Security Team | security@flamoral.com | Security incidents |
| All Staff | allstaff@flamoral.com | Company-wide announcements |

#### Slack Channels

| Channel | Purpose |
|---------|---------|
| #incidents | All incident notifications |
| #on-call | On-call coordination |
| #devops | Infrastructure discussions |
| #engineering | Engineering general |
| #launches | Deployment announcements |
| #monitoring | Automated alerts |
| #security | Security issues |
| #support | Customer support issues |

#### External Communication

| Channel | Handle/URL | Owner |
|---------|------------|-------|
| Twitter | @flamoral | Marketing team |
| Instagram | @flamoral | Marketing team |
| Facebook | /flamoral | Marketing team |
| LinkedIn | /company/flamoral | Marketing team |
| Status Page | status.flamoral.com | DevOps team |

---

### 6.5 Emergency Contact Card

**Print and keep accessible:**

```
┌─────────────────────────────────────────────────────┐
│           FLAMORAL EMERGENCY CONTACTS               │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 🚨 PRIMARY ON-CALL: [NAME]                          │
│    Phone: +1-555-0101                              │
│    Email: oncall@flamoral.com                      │
│                                                     │
│ 🔧 DEVOPS LEAD: [NAME]                              │
│    Phone: +1-555-0201                              │
│                                                     │
│ 👨‍💼 ENGINEERING MANAGER: [NAME]                      │
│    Phone: +1-555-0301                              │
│                                                     │
│ 🏢 CTO: [NAME]                                      │
│    Phone: +1-555-0401                              │
│                                                     │
│ ☁️  AZURE SUPPORT: +1-800-642-7676                  │
│ 💳 STRIPE SUPPORT: Chat in dashboard               │
│ 📧 SENDGRID SUPPORT: +1-877-969-8647               │
│                                                     │
│ 📊 STATUS PAGE: https://status.flamoral.com        │
│ 📱 SLACK: #incidents                                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Appendix A: Quick Reference Commands

### Kubernetes Commands

```bash
# Cluster health
kubectl cluster-info
kubectl get nodes
kubectl get pods --all-namespaces

# Service status
kubectl get pods -n flamoral-prod
kubectl get svc -n flamoral-prod
kubectl get ingress -n flamoral-prod

# Logs
kubectl logs deployment/user-service -n flamoral-prod --tail=100
kubectl logs -f deployment/user-service -n flamoral-prod

# Describe resources
kubectl describe pod [POD-NAME] -n flamoral-prod
kubectl describe deployment user-service -n flamoral-prod

# Exec into pod
kubectl exec -it [POD-NAME] -n flamoral-prod -- /bin/sh

# Resource usage
kubectl top nodes
kubectl top pods -n flamoral-prod

# Rollback
kubectl rollout undo deployment/user-service -n flamoral-prod
kubectl rollout history deployment/user-service -n flamoral-prod

# Scaling
kubectl scale deployment/user-service --replicas=10 -n flamoral-prod

# Restart
kubectl rollout restart deployment/user-service -n flamoral-prod
```

---

### Health Check Commands

```bash
# Website
curl -I https://flamoral.com
curl -I https://www.flamoral.com

# API Gateway
curl https://api.flamoral.com/health

# All Services
for service in user matching messaging media payment notification analytics moderation; do
  echo "Checking $service-service..."
  curl -f https://api.flamoral.com/api/$service-service/health || echo "FAILED"
done

# WebSocket
wscat -c wss://flamoral.com/ws
```

---

### DNS Commands

```bash
# Check DNS records
dig flamoral.com
dig www.flamoral.com
dig api.flamoral.com

# Check from specific nameserver
dig @8.8.8.8 flamoral.com

# Full DNS info
nslookup flamoral.com
```

---

### SSL Certificate Commands

```bash
# Check certificate
openssl s_client -connect flamoral.com:443 -servername flamoral.com

# Check expiry
echo | openssl s_client -connect flamoral.com:443 2>/dev/null | openssl x509 -noout -dates

# Kubernetes certificates
kubectl get certificate -n flamoral-prod
kubectl describe certificate flamoral-tls -n flamoral-prod
```

---

### Database Commands

```bash
# PostgreSQL
psql $DATABASE_URL

# Check connections
SELECT COUNT(*) FROM pg_stat_activity;

# Check slow queries
SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;

# Redis
redis-cli -h [REDIS-HOST] -p 6379
INFO
KEYS *
```

---

## Appendix B: Runbook Maintenance

**This runbook is a living document and should be updated regularly.**

**Update Schedule:**
- **Weekly:** During first month post-launch
- **Monthly:** Months 2-6
- **Quarterly:** After 6 months

**Update Triggers:**
- After each incident (update procedures)
- Infrastructure changes (new services, architecture changes)
- Contact changes (team members, vendors)
- Process improvements identified
- Regulatory or compliance changes

**Version History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-12-11 | DevOps Team | Initial launch runbook |
| | | | |
| | | | |

---

**Document Owner:** DevOps Team
**Last Review:** 2025-12-11
**Next Review:** 2025-12-18

**Feedback:** devops@flamoral.com

---

**END OF LAUNCH RUNBOOK**
