# CI/CD Pipeline Guide

**Version:** 1.0.0
**Last Updated:** 2025-11-21
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Pipeline Architecture](#pipeline-architecture)
3. [GitHub Actions Workflows](#github-actions-workflows)
4. [Environment Setup](#environment-setup)
5. [Secrets Management](#secrets-management)
6. [Deployment Process](#deployment-process)
7. [Rollback Strategy](#rollback-strategy)
8. [Best Practices](#best-practices)

---

## Overview

ConnectSphere uses **GitHub Actions** for continuous integration and continuous deployment (CI/CD).

### Key Features

✅ **Automated Testing** - Unit, integration, and E2E tests
✅ **Code Quality** - Linting, type checking, security scans
✅ **Docker Builds** - Automated container builds and pushes
✅ **Multi-Environment** - Development, Staging, Production
✅ **Zero-Downtime** - Rolling updates with health checks
✅ **Automated Rollback** - Automatic rollback on failures
✅ **Notifications** - Slack alerts for all deployments

---

## Pipeline Architecture

```
┌─────────────┐
│   Commit    │
│   to Repo   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│         CI/CD Pipeline              │
├─────────────────────────────────────┤
│                                     │
│  1. Lint & Type Check               │
│  2. Run Tests (Unit + Integration)  │
│  3. Build Application               │
│  4. Security Scan                   │
│  5. Build Docker Images             │
│  6. Push to Registry                │
│  7. Deploy to Environment           │
│  8. Run Smoke Tests                 │
│  9. Notify Team                     │
│                                     │
└─────────────────────────────────────┘
       │
       ├──────── develop branch ──────▶ Skip Deploy
       │
       ├──────── staging branch ──────▶ Deploy to Staging
       │
       └──────── main branch ─────────▶ Deploy to Production
```

---

## GitHub Actions Workflows

### 1. Backend CI (`backend-ci.yml`)

**Triggers:**
- Push to `main`, `develop`, `staging`
- Pull requests to `main`, `develop`
- Changes to `backend/**` files

**Jobs:**
- Lint and test all 9 backend services
- TypeScript compilation
- Code coverage upload
- Security scanning with npm audit and Snyk
- Build artifacts

**Services Matrix:**
```yaml
services:
  - user-service
  - matching-service
  - messaging-service
  - media-service
  - payment-service
  - api-gateway
  - analytics-service
  - moderation-service
  - notification-service
```

### 2. Frontend CI (`frontend-ci.yml`)

**Triggers:**
- Push to `main`, `develop`, `staging`
- Pull requests
- Changes to `frontend/**` files

**Jobs:**
- ESLint and Prettier checks
- TypeScript compilation
- Unit tests with Jest
- Build production bundle
- Lighthouse performance audit
- Bundle size analysis

### 3. Docker Build & Push (`docker-build-push.yml`)

**Triggers:**
- Push to `main`, `staging`
- Release published
- Changes to Dockerfiles

**Jobs:**
- Build Docker images for all services
- Tag with commit SHA and version
- Push to Docker Hub
- Security scan with Trivy
- Image verification

**Image Tags:**
```
citadelcloud1/world-class-dating-platform:user-service-latest
citadelcloud1/world-class-dating-platform:user-service-<sha>
citadelcloud1/world-class-dating-platform:user-service-v1.0.0
```

### 4. Deploy to Staging (`deploy-staging.yml`)

**Triggers:**
- Push to `staging`, `develop` branches
- Manual workflow dispatch

**Jobs:**
- Configure kubectl for staging cluster
- Create/update Kubernetes secrets
- Deploy all services with rolling update
- Wait for rollout completion
- Run smoke tests
- Notify team via Slack

**Environment:** `staging`
**URL:** https://app-staging.connectsphere.com

### 5. Deploy to Production (`deploy-production.yml`)

**Triggers:**
- Release published
- Manual workflow dispatch (requires version input)

**Jobs:**
- Pre-deployment security checks
- Verify Docker images exist
- Create backup of current deployment
- Deploy with rolling update strategy
- Health checks and smoke tests
- Automatic rollback on failure
- Create Sentry release
- Notify team

**Environment:** `production`
**URL:** https://app.connectsphere.com

---

## Environment Setup

### Development Environment

**Branch:** `develop`
**Auto-Deploy:** No
**Testing:** Comprehensive

```bash
# Local development
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

### Staging Environment

**Branch:** `staging`
**Auto-Deploy:** Yes
**URL:** https://app-staging.connectsphere.com

**Purpose:**
- QA testing
- Integration testing
- Performance testing
- Pre-production validation

**Database:** Staging PostgreSQL (separate from production)
**Stripe:** Test mode keys
**Azure:** Staging storage account

### Production Environment

**Branch:** `main`
**Auto-Deploy:** Only on release
**URL:** https://app.connectsphere.com

**Features:**
- Blue-green deployment
- Automated rollback
- Health monitoring
- Zero-downtime updates

**Database:** Production PostgreSQL with replication
**Stripe:** Live mode keys
**Azure:** Production storage with CDN

---

## Secrets Management

### Required GitHub Secrets

Add these secrets in: **Settings** → **Secrets and variables** → **Actions**

#### Docker Hub

```
DOCKER_PASSWORD=your_docker_hub_access_token
```

#### Kubernetes

```
KUBE_CONFIG_STAGING=<base64-encoded-kubeconfig>
KUBE_CONFIG_PRODUCTION=<base64-encoded-kubeconfig>
```

#### Database

```
DB_PASSWORD_STAGING=staging_db_password
DB_PASSWORD_PRODUCTION=production_db_password
```

#### JWT Secrets

```
JWT_ACCESS_SECRET=your-access-secret-min-64-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-64-chars
JWT_ACCESS_SECRET_PROD=production-access-secret
JWT_REFRESH_SECRET_PROD=production-refresh-secret
```

#### Stripe

```
STRIPE_SECRET_KEY_TEST=sk_test_xxxxx
STRIPE_SECRET_KEY_LIVE=sk_live_xxxxx
```

#### Azure

```
AZURE_STORAGE_KEY=azure_storage_account_key
AZURE_STORAGE_KEY_PROD=production_storage_key
```

#### Monitoring

```
SENTRY_AUTH_TOKEN=sentry_auth_token
SNYK_TOKEN=snyk_api_token
```

#### Notifications

```
SLACK_WEBHOOK=https://hooks.slack.com/services/xxxxx
```

### How to Add Secrets

```bash
# Using GitHub CLI
gh secret set DOCKER_PASSWORD --body "your-password"

# Or via GitHub UI:
# Repository → Settings → Secrets and variables → Actions → New repository secret
```

---

## Deployment Process

### Automatic Deployment (Staging)

1. **Create feature branch:**
   ```bash
   git checkout -b feature/new-feature
   ```

2. **Make changes and commit:**
   ```bash
   git add .
   git commit -m "Add new feature"
   ```

3. **Push to staging branch:**
   ```bash
   git push origin feature/new-feature
   # Create PR to staging
   # After approval, merge to staging
   ```

4. **Automatic deployment:**
   - GitHub Actions triggers
   - Runs all tests
   - Builds Docker images
   - Deploys to staging cluster
   - Sends Slack notification

5. **Verify deployment:**
   ```bash
   curl https://api-staging.connectsphere.com/health
   ```

### Manual Deployment (Production)

1. **Create release:**
   ```bash
   # Update version in package.json
   npm version minor  # or major/patch

   # Create git tag
   git tag -a v1.2.0 -m "Release v1.2.0"
   git push origin v1.2.0
   ```

2. **Create GitHub Release:**
   - Go to **Releases** → **Draft a new release**
   - Choose tag: `v1.2.0`
   - Add release notes
   - **Publish release**

3. **Automated production deploy:**
   - Pre-deployment checks run
   - Security scans pass
   - Docker images built
   - Deploy to production with rolling update
   - Smoke tests run
   - Team notified

4. **Monitor deployment:**
   ```bash
   # Watch rollout
   kubectl rollout status deployment/user-service -n connectsphere-production

   # Check logs
   kubectl logs -f deployment/user-service -n connectsphere-production
   ```

### Manual Workflow Dispatch

For urgent hotfixes:

1. Go to **Actions** tab
2. Select **Deploy to Production**
3. Click **Run workflow**
4. Enter version number
5. Confirm deployment

---

## Rollback Strategy

### Automatic Rollback

If deployment fails (health checks, smoke tests), automatic rollback occurs:

```yaml
- name: Rollback on failure
  if: failure()
  run: |
    kubectl rollout undo deployment/user-service --namespace=connectsphere-production
```

### Manual Rollback

#### Option 1: Rollback via kubectl

```bash
# Rollback to previous version
kubectl rollout undo deployment/user-service -n connectsphere-production

# Rollback to specific revision
kubectl rollout history deployment/user-service -n connectsphere-production
kubectl rollout undo deployment/user-service --to-revision=5 -n connectsphere-production
```

#### Option 2: Redeploy Previous Version

```bash
# Re-run workflow with previous version
gh workflow run deploy-production.yml -f version=v1.1.0
```

#### Option 3: Emergency Rollback

```bash
# Scale down new version
kubectl scale deployment/user-service --replicas=0 -n connectsphere-production

# Scale up old version
kubectl scale deployment/user-service-old --replicas=5 -n connectsphere-production
```

---

## Best Practices

### 1. Branching Strategy

```
main (production)
  │
  ├── staging (pre-production)
  │     │
  │     ├── develop (integration)
  │     │     │
  │     │     ├── feature/user-auth
  │     │     ├── feature/payment
  │     │     └── bugfix/login-issue
  │     │
  │     └── release/v1.2.0
  │
  └── hotfix/critical-bug
```

### 2. Commit Messages

Follow conventional commits:

```bash
feat: Add video chat feature
fix: Fix payment webhook handling
docs: Update API documentation
chore: Update dependencies
test: Add unit tests for auth service
refactor: Improve matching algorithm
perf: Optimize database queries
```

### 3. Pull Request Process

1. **Create PR** with clear description
2. **CI checks must pass**
3. **Code review** by at least 1 developer
4. **QA testing** in staging
5. **Merge** when approved

### 4. Version Numbering

Follow Semantic Versioning (SemVer):

```
v1.2.3
│ │ │
│ │ └─ Patch: Bug fixes
│ └─── Minor: New features (backward compatible)
└───── Major: Breaking changes
```

### 5. Testing Requirements

**Before merging to staging:**
- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] Linting passes
- [ ] Type checking passes
- [ ] Manual testing completed

**Before releasing to production:**
- [ ] All staging tests pass
- [ ] Security scan passes
- [ ] Performance tests acceptable
- [ ] Smoke tests pass
- [ ] Stakeholder approval

### 6. Monitoring After Deployment

Monitor these metrics for 30 minutes post-deployment:

- ✅ Error rate < 1%
- ✅ Response time < 200ms (p95)
- ✅ CPU usage < 70%
- ✅ Memory usage < 80%
- ✅ No critical errors in Sentry
- ✅ Stripe webhooks successful

### 7. Deployment Windows

**Staging:** Anytime
**Production:**
- **Best:** Tuesday-Thursday, 10am-4pm EST
- **Avoid:** Fridays, weekends, holidays, after 6pm
- **Emergency:** Anytime with approval

### 8. Feature Flags

Use feature flags for risky changes:

```typescript
if (featureFlags.isEnabled('new-matching-algorithm')) {
  // New code
} else {
  // Old code
}
```

---

## Troubleshooting

### CI Pipeline Fails

**Tests failing:**
```bash
# Run tests locally
npm test

# Check coverage
npm run test:coverage

# Debug specific test
npm test -- --grep "user authentication"
```

**Docker build fails:**
```bash
# Test build locally
docker build -t test-image ./backend/services/user-service

# Check Dockerfile syntax
docker build --no-cache -t test ./
```

### Deployment Fails

**Kubernetes apply fails:**
```bash
# Check syntax
kubectl apply --dry-run=client -f k8s/production/

# View events
kubectl get events -n connectsphere-production --sort-by='.lastTimestamp'
```

**Pods not starting:**
```bash
# Check pod status
kubectl get pods -n connectsphere-production

# View logs
kubectl logs deployment/user-service -n connectsphere-production

# Describe pod
kubectl describe pod user-service-xxx -n connectsphere-production
```

### Rollback Fails

If automatic rollback fails:

1. **Emergency scale down:**
   ```bash
   kubectl scale deployment/user-service --replicas=0 -n connectsphere-production
   ```

2. **Check revision history:**
   ```bash
   kubectl rollout history deployment/user-service -n connectsphere-production
   ```

3. **Manual rollback:**
   ```bash
   kubectl rollout undo deployment/user-service -n connectsphere-production
   ```

4. **Verify:**
   ```bash
   kubectl get pods -n connectsphere-production
   curl https://api.connectsphere.com/health
   ```

---

## Metrics and Monitoring

### Pipeline Metrics

Track these metrics in GitHub Actions:

- **Build time:** < 10 minutes
- **Test success rate:** > 95%
- **Deployment frequency:** 2-5 times/week
- **Lead time:** < 1 hour (commit to production)
- **MTTR:** < 30 minutes
- **Change failure rate:** < 5%

### Deployment Dashboard

Monitor at: https://github.com/connectsphere/app/actions

**Key indicators:**
- ✅ Green: All checks passed
- 🟡 Yellow: Tests running
- ❌ Red: Build/deploy failed

---

## Security

### Code Scanning

**Enabled:**
- ✅ Snyk (dependency vulnerabilities)
- ✅ Trivy (container scanning)
- ✅ npm audit (npm packages)
- ✅ CodeQL (code analysis)

### Secrets Scanning

GitHub automatically scans for:
- API keys
- Access tokens
- Private keys
- Database passwords

**If secrets are detected:**
1. Rotate immediately
2. Update in GitHub Secrets
3. Redeploy affected services

---

## Support

### Documentation
- GitHub Actions: https://docs.github.com/actions
- Kubectl: https://kubernetes.io/docs/reference/kubectl/
- Docker: https://docs.docker.com/

### Team Contacts
- **DevOps Lead:** devops@connectsphere.com
- **On-Call:** oncall@connectsphere.com
- **Slack:** #devops channel

---

**CI/CD Pipeline Ready for Production!**
