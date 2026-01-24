# Flamoral Rollback Runbook

## Overview

This runbook provides step-by-step procedures for rolling back Flamoral production deployments. It covers the frontend (Vercel), backend (Railway), and database migrations.

**IMPORTANT:** Before rolling back, document the issue and notify the team via #incident-response Slack channel.

---

## Table of Contents

1. [Decision Matrix](#decision-matrix)
2. [Rollback Priority Order](#rollback-priority-order)
3. [Vercel Frontend Rollback](#vercel-frontend-rollback)
4. [Railway Backend Rollback](#railway-backend-rollback)
5. [Database Migration Rollback](#database-migration-rollback)
6. [DNS/CDN Rollback](#dnscdn-rollback)
7. [Feature Flag Emergency Disable](#feature-flag-emergency-disable)
8. [Post-Rollback Verification](#post-rollback-verification)
9. [Emergency Contacts](#emergency-contacts)
10. [Escalation Procedures](#escalation-procedures)

---

## Decision Matrix

### When to Rollback

| Condition                    | Threshold                        | Action                         |
| ---------------------------- | -------------------------------- | ------------------------------ |
| Error rate increase          | > 5% for 5 minutes               | Immediate rollback             |
| API response time            | > 2s p95 for 5 minutes           | Investigate + prepare rollback |
| Payment failures             | > 2% for 2 minutes               | Immediate rollback             |
| User authentication failures | > 10% for 2 minutes              | Immediate rollback             |
| Discovery feed empty         | All users affected for 5 minutes | Immediate rollback             |
| Chat/messaging down          | > 5 minutes                      | Immediate rollback             |
| Database connectivity lost   | > 1 minute                       | Emergency rollback             |
| Security vulnerability       | Active exploitation              | Immediate rollback + isolate   |

### Rollback vs Fix Forward

**Rollback when:**

- Issue is causing immediate user impact
- Root cause is unclear
- Fix will take > 30 minutes
- Issue affects critical paths (auth, payments, matching)

**Fix forward when:**

- Issue is isolated to non-critical feature
- Root cause is known and fix is simple (< 15 min)
- Rollback would cause data issues
- Previous version has known issues

---

## Rollback Priority Order

When multiple systems need rollback, follow this order:

1. **Feature Flags** - Fastest, disable problematic features
2. **Frontend (Vercel)** - Usually safe, no data concerns
3. **Backend (Railway)** - Coordinate with database state
4. **Database Migrations** - Most complex, highest risk

---

## Vercel Frontend Rollback

### Prerequisites

- Vercel CLI installed (`npm i -g vercel`)
- Authenticated to Vercel account
- Access to Flamoral Vercel project

### Option 1: Vercel Dashboard (Recommended)

**Estimated Time:** 2-3 minutes

1. **Access Vercel Dashboard**

   ```
   URL: https://vercel.com/flamoral/web-app
   ```

2. **Navigate to Deployments**
   - Click "Deployments" tab
   - Locate the last known good deployment
   - Identify by deployment date/time and commit hash

3. **Instant Rollback**
   - Click the three dots (...) menu on the target deployment
   - Select "Promote to Production"
   - Confirm the promotion

4. **Verify Rollback**

   ```bash
   # Check current deployment
   curl -sI https://www.flamoral.com | grep -i x-vercel-deployment

   # Verify homepage loads
   curl -s https://www.flamoral.com | head -20
   ```

### Option 2: Vercel CLI

```bash
# List recent deployments
vercel ls flamoral-web-app

# Get deployment details
vercel inspect <deployment-url>

# Promote previous deployment to production
vercel promote <deployment-url> --prod

# Or alias directly
vercel alias set <deployment-url> www.flamoral.com
```

### Option 3: Git Revert

**Use when:** You need to revert specific changes and redeploy

```bash
# Identify the commit to revert to
git log --oneline -10

# Revert to previous commit
git revert HEAD --no-edit

# Or reset to specific commit (destructive)
git reset --hard <commit-hash>

# Push to trigger redeployment
git push origin main --force  # CAUTION: Coordinate with team first
```

### Vercel Environment Variables

If environment variables caused the issue:

1. Go to Project Settings > Environment Variables
2. Edit or rollback the problematic variable
3. Trigger redeployment:
   ```bash
   vercel --prod
   ```

---

## Railway Backend Rollback

### Prerequisites

- Railway CLI installed (`npm i -g @railway/cli`)
- Authenticated to Railway
- Access to Flamoral Railway project

### Option 1: Railway Dashboard (Recommended)

**Estimated Time:** 3-5 minutes

1. **Access Railway Dashboard**

   ```
   URL: https://railway.app/project/flamoral
   ```

2. **Navigate to Deployments**
   - Select the affected service (e.g., api-gateway)
   - Click "Deployments" tab

3. **Rollback Deployment**
   - Find the last known good deployment
   - Click "Redeploy" on that deployment
   - Confirm the rollback

4. **Repeat for Related Services**
   - If deploying multiple services, rollback in reverse order:
     1. API Gateway
     2. Background workers
     3. Core services (auth, user, matching)

### Option 2: Railway CLI

```bash
# Login to Railway
railway login

# Link to project
railway link

# List recent deployments
railway deployments

# Rollback to specific deployment
railway redeploy <deployment-id>

# Or rollback by setting a previous commit
railway variables set RAILWAY_GIT_COMMIT_SHA=<previous-commit>
railway up
```

### Option 3: Git-Based Rollback

```bash
# Switch to the backend repository
cd backend

# Identify the commit to rollback to
git log --oneline -10

# Create a rollback branch
git checkout -b hotfix/rollback-$(date +%Y%m%d)

# Reset to previous commit
git reset --hard <commit-hash>

# Force push to trigger Railway deployment
git push origin hotfix/rollback-$(date +%Y%m%d) --force

# In Railway, switch deployment branch temporarily
```

### Service-Specific Rollback

For individual services:

```bash
# API Gateway
railway service api-gateway
railway rollback

# Auth Service
railway service auth-service
railway rollback

# User Service
railway service user-service
railway rollback

# Matching Service
railway service matching-service
railway rollback
```

### Railway Environment Variables

If environment variables caused the issue:

1. Railway Dashboard > Service > Variables
2. Modify or revert the problematic variable
3. Service automatically redeploys

---

## Database Migration Rollback

### CRITICAL WARNING

Database rollbacks are the most complex and risky. Always:

- Backup before any migration
- Test rollback in staging first
- Coordinate with DBA if available

### Prerequisites

- Database credentials with admin access
- Access to migration scripts
- Recent backup verified

### Check Current Migration Status

```bash
# Connect to database
psql $DATABASE_URL

# Check migration version
SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;

# Or using Knex
npx knex migrate:status --env production
```

### Option 1: Knex Migration Rollback

```bash
# Rollback last migration
npx knex migrate:rollback --env production

# Rollback specific number of migrations
npx knex migrate:rollback --env production --step 2

# Rollback all migrations (DANGER - data loss!)
npx knex migrate:rollback --env production --all
```

### Option 2: Manual SQL Rollback

1. **Identify the migration to rollback:**

   ```sql
   SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 1;
   ```

2. **Execute the down migration:**

   ```bash
   # Find the down migration file
   ls -la backend/migrations/*_down.sql

   # Execute manually
   psql $DATABASE_URL -f backend/migrations/20240101_feature_down.sql
   ```

3. **Update migration table:**
   ```sql
   DELETE FROM schema_migrations WHERE version = '20240101120000';
   ```

### Option 3: Point-in-Time Recovery (PITR)

For catastrophic failures, restore from backup:

```bash
# AWS RDS Example
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier flamoral-prod \
  --target-db-instance-identifier flamoral-prod-restored \
  --restore-time "2024-01-15T10:00:00Z"

# Switch application to restored database
railway variables set DATABASE_URL=<new-db-url>
```

### Data Migration Rollback Considerations

If the migration involved data transformation:

1. **Check for data backups:**

   ```sql
   SELECT * FROM data_backup_20240115;
   ```

2. **Restore from backup table:**

   ```sql
   BEGIN;
   TRUNCATE TABLE affected_table;
   INSERT INTO affected_table SELECT * FROM data_backup_20240115;
   COMMIT;
   ```

3. **Verify data integrity:**
   ```sql
   SELECT COUNT(*) FROM affected_table;
   -- Compare with expected count
   ```

---

## DNS/CDN Rollback

### CloudFront (CDN)

If CDN configuration is causing issues:

```bash
# Get current distribution config
aws cloudfront get-distribution-config --id <distribution-id>

# Disable distribution temporarily
aws cloudfront update-distribution \
  --id <distribution-id> \
  --if-match <etag> \
  --distribution-config file://previous-config.json

# Invalidate cache
aws cloudfront create-invalidation \
  --distribution-id <distribution-id> \
  --paths "/*"
```

### DNS Rollback

For DNS-level issues:

1. **Route 53 Console:**
   - Navigate to hosted zone
   - Edit problematic record
   - Update to previous IP/CNAME

2. **CLI:**
   ```bash
   aws route53 change-resource-record-sets \
     --hosted-zone-id <zone-id> \
     --change-batch file://dns-rollback.json
   ```

---

## Feature Flag Emergency Disable

The fastest way to disable problematic features without full rollback.

### Common Feature Flags

| Flag                        | Purpose             | Disable Impact               |
| --------------------------- | ------------------- | ---------------------------- |
| `ENABLE_VIDEO_CALLS`        | Video calling       | Disables video chat          |
| `ENABLE_AI_MATCHING`        | AI-powered matching | Falls back to basic matching |
| `ENABLE_PHOTO_VERIFICATION` | Photo verification  | Bypasses verification        |
| `ENABLE_PUSH_NOTIFICATIONS` | Push notifications  | Disables push                |
| `ENABLE_EVENTS`             | Events feature      | Hides events section         |

### How to Disable

**Option 1: Railway/Vercel Dashboard**

1. Go to project settings
2. Find Environment Variables
3. Set flag to `false`
4. Redeploy

**Option 2: CLI**

```bash
# Railway
railway variables set ENABLE_PROBLEMATIC_FEATURE=false

# Vercel
vercel env add ENABLE_PROBLEMATIC_FEATURE production
# Enter: false
vercel --prod  # Redeploy
```

**Option 3: Database Flag (if using database flags)**

```sql
UPDATE feature_flags SET enabled = false WHERE name = 'problematic_feature';
```

---

## Post-Rollback Verification

### Immediate Checks (First 5 Minutes)

```bash
# 1. Health endpoints
curl https://api.flamoral.com/health
curl https://www.flamoral.com/health

# 2. Auth flow
curl -X POST https://api.flamoral.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}' \
  -w "\n%{http_code}"

# 3. Error rates (check monitoring)
# - CloudWatch
# - Application Insights
# - Grafana
```

### Run Smoke Tests

```bash
# Navigate to project
cd World-Class-Dating-App-Platform

# Run smoke tests against production
API_URL=https://api.flamoral.com \
WEB_URL=https://www.flamoral.com \
npx playwright test infrastructure/qa/smoke-tests.ts

# Or run bash smoke test
./scripts/smoke-test.sh https://api.flamoral.com
```

### Monitoring Dashboard Checklist

- [ ] Error rate returned to baseline (< 0.1%)
- [ ] Response times within SLA (p95 < 500ms)
- [ ] No 5xx errors in logs
- [ ] User login success rate > 99%
- [ ] Payment success rate > 98%
- [ ] WebSocket connections stable

### User Impact Assessment

- [ ] Check user complaint channels (support tickets, social media)
- [ ] Review error logs for user-facing errors
- [ ] Verify core user journeys work:
  - [ ] Login/logout
  - [ ] View discovery feed
  - [ ] Send messages
  - [ ] Complete payment

---

## Emergency Contacts

### Primary Contacts

| Role             | Name     | Phone     | Slack        | Email                 |
| ---------------- | -------- | --------- | ------------ | --------------------- |
| On-Call Engineer | Rotation | PagerDuty | @oncall      | oncall@flamoral.com   |
| Engineering Lead | [Name]   | [Phone]   | @eng-lead    | eng@flamoral.com      |
| DevOps Lead      | [Name]   | [Phone]   | @devops-lead | devops@flamoral.com   |
| Database Admin   | [Name]   | [Phone]   | @dba         | dba@flamoral.com      |
| Security Lead    | [Name]   | [Phone]   | @security    | security@flamoral.com |

### Platform Support

| Platform  | Support Contact              | Response Time         |
| --------- | ---------------------------- | --------------------- |
| Vercel    | support@vercel.com           | < 1 hour (Enterprise) |
| Railway   | support@railway.app          | < 4 hours             |
| AWS       | AWS Support Console          | Immediate (Business)  |
| Stripe    | dashboard.stripe.com/support | < 1 hour              |
| PagerDuty | support@pagerduty.com        | < 1 hour              |

### Vendor Escalation

| Issue Type       | Primary Vendor | Escalation Path                  |
| ---------------- | -------------- | -------------------------------- |
| Frontend hosting | Vercel         | Vercel Support > Account Manager |
| Backend hosting  | Railway        | Railway Support > Discord        |
| Database (RDS)   | AWS            | AWS Support Case > TAM           |
| Payments         | Stripe         | Stripe Dashboard > Phone         |
| SMS/Email        | AWS SES/SNS    | AWS Support Case                 |
| CDN              | CloudFront     | AWS Support Case                 |

---

## Escalation Procedures

### Escalation Timeline

```
0-15 minutes:   On-call engineer
                - Assess situation
                - Begin rollback if needed
                - Post in #incident-response

15-30 minutes:  Engineering Lead
                - Verify rollback progress
                - Coordinate resources
                - Begin customer communication prep

30-60 minutes:  DevOps Lead + Security (if applicable)
                - Infrastructure review
                - Security assessment
                - External vendor escalation

60+ minutes:    Executive notification
                - CTO/VP Engineering
                - Customer communication
                - Post-incident planning
```

### Escalation Triggers

**Immediate Executive Escalation:**

- Data breach confirmed
- Complete service outage > 30 minutes
- Payment system down > 15 minutes
- User data exposed
- Legal/compliance issue

**Standard Escalation:**

- Rollback unsuccessful after 30 minutes
- Multiple systems affected
- External vendor support needed
- SLA breach imminent

### Communication Templates

**Internal (Slack #incident-response):**

```
INCIDENT ALERT - [SEVERITY]
Status: [INVESTIGATING/ROLLING BACK/RESOLVED]
Impact: [DESCRIPTION]
Started: [TIME]
Lead: @[NAME]
Next Update: [TIME]
```

**Status Page Update:**

```
Title: Service Disruption - [COMPONENT]
Status: Investigating

We are currently investigating reports of [ISSUE].
Impact: [WHO/WHAT IS AFFECTED]
Next update in 30 minutes.
```

---

## Quick Reference Commands

### Vercel Rollback

```bash
vercel ls
vercel promote <deployment-url> --prod
```

### Railway Rollback

```bash
railway deployments
railway redeploy <deployment-id>
```

### Database Status

```bash
npx knex migrate:status --env production
npx knex migrate:rollback --env production
```

### Health Checks

```bash
curl https://api.flamoral.com/health
curl https://www.flamoral.com
./scripts/smoke-test.sh https://api.flamoral.com
```

### Feature Flags

```bash
railway variables set FEATURE_FLAG=false
vercel env add FEATURE_FLAG production
```

---

## Appendix: Rollback Checklist

### Pre-Rollback

- [ ] Document the issue (what, when, who reported)
- [ ] Post to #incident-response
- [ ] Assess rollback necessity (use decision matrix)
- [ ] Identify target version to rollback to
- [ ] Verify backup availability (if database involved)

### During Rollback

- [ ] Execute rollback procedure
- [ ] Monitor for errors during rollback
- [ ] Update #incident-response with progress
- [ ] Prepare verification tests

### Post-Rollback

- [ ] Run smoke tests
- [ ] Verify health endpoints
- [ ] Check error rates in monitoring
- [ ] Confirm user impact resolved
- [ ] Update status page
- [ ] Post resolution to #incident-response
- [ ] Schedule post-incident review

---

_Document Version: 1.0_
_Last Updated: 2026-01-24_
_Owner: DevOps & SRE Team_
_Review Frequency: Quarterly_
