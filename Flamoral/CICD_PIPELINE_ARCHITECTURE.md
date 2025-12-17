# CI/CD Pipeline Architecture
## Flamoral Dating Platform - Visual Documentation

---

## Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FLAMORAL CI/CD PIPELINE                         │
│                    36+ Workflows | 15 Services | 3 Environments         │
└─────────────────────────────────────────────────────────────────────────┘

  Developer Push/PR
        │
        ├──────────────────────────────────────────────────────────────────┐
        │                                                                  │
        ▼                                                                  ▼
  ┌──────────────┐                                              ┌──────────────┐
  │   DEVELOP    │                                              │   FEATURE    │
  │    BRANCH    │                                              │    BRANCH    │
  └──────┬───────┘                                              └──────┬───────┘
         │                                                             │
         │ Auto-trigger                                                │ PR trigger
         ▼                                                             ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                          CI PIPELINE (Unified)                          │
  │  ┌─────────────────────────────────────────────────────────────────┐   │
  │  │  1. Change Detection → Skip unchanged components                │   │
  │  │  2. Code Quality → ESLint, Prettier, TypeScript                 │   │
  │  │  3. Unit Tests → 15 services (parallel matrix)                  │   │
  │  │  4. Integration Tests → PostgreSQL, Redis, RabbitMQ             │   │
  │  │  5. Security Scans → Secrets, SAST, Dependencies, Containers    │   │
  │  │  6. Frontend Tests → React, Vite, Bundle analysis               │   │
  │  │  7. E2E Tests → Playwright (multi-browser, sharded)             │   │
  │  │  8. Docker Build → Build images (no push on PR)                 │   │
  │  │  9. IaC Validation → Terraform, Helm, Kubernetes                │   │
  │  │ 10. SBOM Generation → Software Bill of Materials                │   │
  │  └─────────────────────────────────────────────────────────────────┘   │
  │                                                                         │
  │  Quality Gates:                                                         │
  │  ✅ Secret scanning BLOCKS                                              │
  │  ⚠️  ESLint (needs blocking)                                            │
  │  ⚠️  TypeScript (needs blocking)                                        │
  │  ⚠️  Tests (needs blocking)                                             │
  └─────────────────────────────────────────────────────────────────────────┘
         │
         │ All checks pass
         │
         ▼
  ┌─────────────────┐
  │  MERGE TO DEV   │ ─────┐
  └─────────────────┘      │
         │                 │
         │ Auto-deploy     │
         ▼                 │
  ┌─────────────────────────────────────────┐
  │  DEVELOPMENT ENVIRONMENT                │
  │  • Auto-deploy from develop             │
  │  • Fast feedback loop                   │
  │  • Internal testing                     │
  └─────────────────────────────────────────┘
         │                                   │
         │ Ready for staging                │
         ▼                                   │
  ┌──────────────┐                          │
  │  STAGING     │                          │
  │   BRANCH     │                          │
  └──────┬───────┘                          │
         │                                   │
         │ Auto-trigger                     │
         ▼                                   │
  ┌─────────────────────────────────────────┴────────────────────────────┐
  │                     CD PIPELINE - STAGING                            │
  │  ┌───────────────────────────────────────────────────────────────┐  │
  │  │  1. Build & Push → Docker images to ACR                       │  │
  │  │  2. Terraform Apply → Infrastructure updates                  │  │
  │  │  3. Blue-Green Deploy → Zero downtime deployment              │  │
  │  │  4. Database Migrations → Schema updates                      │  │
  │  │  5. Integration Tests → Full service stack                    │  │
  │  │  6. E2E Tests → Playwright against staging                    │  │
  │  │  7. DAST Scan → OWASP ZAP security testing                    │  │
  │  │  8. Performance Tests → K6 load, stress, spike tests          │  │
  │  │  9. Create Release Candidate → Tag for production             │  │
  │  └───────────────────────────────────────────────────────────────┘  │
  └──────────────────────────────────────────────────────────────────────┘
         │
         │ All tests pass
         │
         ▼
  ┌─────────────────────────────────────────┐
  │     RELEASE CANDIDATE CREATED           │
  │     Tag: rc-{commit-sha}                │
  │     Ready for production deployment     │
  └─────────────────────────────────────────┘
         │
         │ Manual trigger (workflow_dispatch)
         ▼
  ┌──────────────────────────────────────────────────────────────────────────┐
  │                     CD PIPELINE - PRODUCTION                             │
  │  ┌────────────────────────────────────────────────────────────────────┐  │
  │  │  0. FREEZE CHECK → Production frozen by default                    │  │
  │  │  1. Pre-deployment Approval → 2 reviewers required                 │  │
  │  │  2. Backup Current State → Database + Kubernetes manifests         │  │
  │  │  3. Build & Push → Docker images to production ACR                 │  │
  │  │  4. Terraform Apply → Production infrastructure                    │  │
  │  │  5. Deployment Strategy Selection:                                 │  │
  │  │     ┌─────────────────────────────────────────────────────────┐   │  │
  │  │     │  • CANARY (default): 10% → 25% → 50% → 75% → 100%      │   │  │
  │  │     │    - Gradual rollout with validation                    │   │  │
  │  │     │    - Metrics monitoring at each stage                   │   │  │
  │  │     │    - Auto-rollback on anomalies                         │   │  │
  │  │     │                                                          │   │  │
  │  │     │  • BLUE-GREEN: Instant switch                           │   │  │
  │  │     │    - Deploy to inactive slot                            │   │  │
  │  │     │    - Validate new deployment                            │   │  │
  │  │     │    - Switch traffic                                     │   │  │
  │  │     │                                                          │   │  │
  │  │     │  • ROLLING: Standard rolling update                     │   │  │
  │  │     │    - Progressive pod replacement                        │   │  │
  │  │     │    - Zero downtime                                      │   │  │
  │  │     └─────────────────────────────────────────────────────────┘   │  │
  │  │  6. Database Migrations → Run after deployment                    │  │
  │  │  7. Post-deployment Validation → Smoke tests + health checks      │  │
  │  │  8. Create GitHub Release → Version tag + changelog               │  │
  │  │  9. Notifications → Slack alerts                                  │  │
  │  └────────────────────────────────────────────────────────────────────┘  │
  │                                                                          │
  │  On Failure:                                                             │
  │  ┌────────────────────────────────────────────────────────────────────┐ │
  │  │  AUTOMATIC ROLLBACK                                                │ │
  │  │  • Shift traffic away                                              │ │
  │  │  • Helm rollback to previous version                               │ │
  │  │  • Restore database from backup                                    │ │
  │  │  • Verify rollback success                                         │ │
  │  │  • Alert team                                                      │ │
  │  └────────────────────────────────────────────────────────────────────┘ │
  └──────────────────────────────────────────────────────────────────────────┘
         │
         ▼
  ┌─────────────────────────────────────────┐
  │      PRODUCTION ENVIRONMENT              │
  │  ✅ Deployed successfully                │
  │  ✅ All services healthy                 │
  │  ✅ Monitoring active                    │
  └─────────────────────────────────────────┘
```

---

## Workflow Categories

### 1. Continuous Integration (CI)

```
┌─────────────────────────────────────────────────────────────────┐
│                    CI WORKFLOWS                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  main-ci.yml                    unified-ci.yml                  │
│  ┌─────────────────┐            ┌─────────────────┐            │
│  │ • Change detect │            │ • Fast feedback │            │
│  │ • Code quality  │            │ • Path filters  │            │
│  │ • All tests     │            │ • Essential     │            │
│  │ • Security      │            │   checks only   │            │
│  │ • Build all     │            │ • Quick CI      │            │
│  └─────────────────┘            └─────────────────┘            │
│         │                              │                        │
│         └──────────┬───────────────────┘                        │
│                    ▼                                            │
│         ┌──────────────────────┐                               │
│         │   Quality Gates      │                               │
│         │  • ESLint            │                               │
│         │  • TypeScript        │                               │
│         │  • Prettier          │                               │
│         │  • Tests (15 svcs)   │                               │
│         │  • Secret scan       │                               │
│         │  • SAST              │                               │
│         │  • Dependency scan   │                               │
│         │  • Container scan    │                               │
│         └──────────────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Security Scanning

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY WORKFLOWS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  secret-scan.yml             unified-security-pipeline.yml      │
│  ┌─────────────────┐         ┌──────────────────────────┐      │
│  │ • Gitleaks      │         │ • SAST (CodeQL, Semgrep) │      │
│  │ • TruffleHog    │         │ • Dependency scan        │      │
│  │ • Custom rules  │         │ • IaC scan (Checkov)     │      │
│  │ • BLOCKS PRs    │         │ • Container scan         │      │
│  └─────────────────┘         │ • DAST (OWASP ZAP)       │      │
│         │                    │ • Compliance check       │      │
│         │                    └──────────────────────────┘      │
│         │                              │                       │
│         └──────────┬───────────────────┘                       │
│                    ▼                                           │
│         ┌──────────────────────┐                              │
│         │  Security Findings   │                              │
│         │  • GitHub Security   │                              │
│         │  • SARIF reports     │                              │
│         │  • PR comments       │                              │
│         │  • Issue creation    │                              │
│         └──────────────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Testing

```
┌─────────────────────────────────────────────────────────────────┐
│                    TESTING WORKFLOWS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  e2e-test-pipeline.yml     performance-tests.yml                │
│  ┌─────────────────┐       ┌─────────────────┐                │
│  │ • Playwright    │       │ • K6 load tests │                │
│  │ • Multi-browser │       │ • Stress tests  │                │
│  │ • Accessibility │       │ • Spike tests   │                │
│  │ • Mobile tests  │       │ • Soak tests    │                │
│  └─────────────────┘       │ • Lighthouse    │                │
│                            │ • DB profiling  │                │
│                            └─────────────────┘                │
│                                                                 │
│  integration-tests.yml     contract-test-pipeline.yml          │
│  ┌─────────────────┐       ┌─────────────────┐                │
│  │ • Service stack │       │ • API contracts │                │
│  │ • PostgreSQL    │       │ • Pact tests    │                │
│  │ • Redis         │       │ • Schema valid  │                │
│  │ • RabbitMQ      │       └─────────────────┘                │
│  └─────────────────┘                                           │
└─────────────────────────────────────────────────────────────────┘
```

### 4. Deployment

```
┌──────────────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT WORKFLOWS                              │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  unified-cd-dev.yml    unified-cd-staging.yml   unified-cd-prod.yml │
│  ┌────────────────┐    ┌─────────────────┐     ┌────────────────┐  │
│  │ • Fast deploy  │    │ • Full testing  │     │ • Freeze check │  │
│  │ • Auto on push │    │ • Blue-green    │     │ • 2 approvers  │  │
│  │ • Dev cluster  │    │ • DAST scan     │     │ • Backup state │  │
│  └────────────────┘    │ • Perf tests    │     │ • Canary       │  │
│                        │ • Create RC     │     │ • Migrations   │  │
│                        └─────────────────┘     │ • Validation   │  │
│                                                │ • Release      │  │
│                                                └────────────────┘  │
│                                                                      │
│  rollback-pipeline.yml                                              │
│  ┌──────────────────────────────────────┐                          │
│  │ • Manual trigger (emergency)         │                          │
│  │ • Application rollback (Helm)        │                          │
│  │ • Database restore (Azure backup)    │                          │
│  │ • Traffic shift                      │                          │
│  │ • Post-rollback validation           │                          │
│  └──────────────────────────────────────┘                          │
└──────────────────────────────────────────────────────────────────────┘
```

### 5. Infrastructure & Operations

```
┌─────────────────────────────────────────────────────────────────┐
│               INFRASTRUCTURE WORKFLOWS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  infrastructure-pipeline.yml    infrastructure-check.yml        │
│  ┌─────────────────┐            ┌─────────────────┐            │
│  │ • Terraform     │            │ • PR validation │            │
│  │ • Drift detect  │            │ • Plan preview  │            │
│  │ • Cost estimate │            │ • Cost impact   │            │
│  └─────────────────┘            └─────────────────┘            │
│                                                                 │
│  cost-report.yml               self-healing-agent.yml          │
│  ┌─────────────────┐            ┌─────────────────┐           │
│  │ • Weekly report │            │ • Auto-remediate│           │
│  │ • Budget alerts │            │ • Health checks │           │
│  │ • Issue create  │            │ • Recovery      │           │
│  └─────────────────┘            └─────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Service Architecture

### Microservices Matrix

```
┌──────────────────────────────────────────────────────────────────┐
│                    15 MICROSERVICES                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Core Services                Infrastructure Services           │
│  ┌─────────────────┐          ┌─────────────────┐              │
│  │ • api-gateway   │          │ • admin-service │              │
│  │ • auth-service  │          │ • automation-   │              │
│  │ • user-service  │          │   service       │              │
│  └─────────────────┘          │ • workflow-     │              │
│                                │   engine        │              │
│  Feature Services              └─────────────────┘              │
│  ┌─────────────────┐                                            │
│  │ • matching-     │          Support Services                  │
│  │   service       │          ┌─────────────────┐              │
│  │ • messaging-    │          │ • analytics-    │              │
│  │   service       │          │   service       │              │
│  │ • media-service │          │ • moderation-   │              │
│  │ • notification- │          │   service       │              │
│  │   service       │          │ • realtime-     │              │
│  │ • payment-      │          │   service       │              │
│  │   service       │          │ • advertising-  │              │
│  │                 │          │   service       │              │
│  └─────────────────┘          └─────────────────┘              │
│                                                                  │
│  All services:                                                   │
│  • Built in parallel (matrix strategy)                          │
│  • Dockerized with multi-stage builds                           │
│  • Scanned for vulnerabilities (Trivy)                          │
│  • Unit tested with coverage                                    │
│  • Deployed to AKS with Helm                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## Environment Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                      ENVIRONMENT PROGRESSION                       │
└────────────────────────────────────────────────────────────────────┘

  FEATURE BRANCH
       │
       ├─ PR → CI Pipeline → Review → Merge
       ▼
  DEVELOP BRANCH
       │
       ├─ Auto-deploy to DEV
       │  ┌─────────────────────────────┐
       │  │  DEV ENVIRONMENT            │
       │  │  • flamoral-dev-aks         │
       │  │  • Auto-deploy              │
       │  │  • Fast feedback            │
       │  │  • Internal testing         │
       │  └─────────────────────────────┘
       │
       ├─ Ready for staging → Merge to staging branch
       ▼
  STAGING BRANCH
       │
       ├─ Auto-deploy to STAGING
       │  ┌─────────────────────────────┐
       │  │  STAGING ENVIRONMENT        │
       │  │  • flamoral-staging-aks     │
       │  │  • Full test suite          │
       │  │  • DAST scanning            │
       │  │  • Performance tests        │
       │  │  • Blue-green deployment    │
       │  │  • Creates Release Candidate│
       │  └─────────────────────────────┘
       │
       ├─ All tests pass → Create RC tag
       │
       ├─ Manual approval (2 reviewers)
       ▼
  MAIN BRANCH
       │
       ├─ Manual dispatch to PRODUCTION
       │  ┌─────────────────────────────┐
       │  │  PRODUCTION ENVIRONMENT     │
       │  │  • flamoral-prod-aks        │
       │  │  • Freeze check             │
       │  │  • Pre-deployment backup    │
       │  │  • Canary deployment        │
       │  │  • Post-deploy validation   │
       │  │  • Monitoring & alerts      │
       │  │  • Auto-rollback on failure │
       │  └─────────────────────────────┘
       ▼
  PRODUCTION LIVE
```

---

## Quality Gate Checkpoints

```
┌────────────────────────────────────────────────────────────────────┐
│                      QUALITY GATE MATRIX                           │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Stage 1: CODE QUALITY                                             │
│  ├─ ESLint (max 50 warnings)               ⚠️  Not blocking       │
│  ├─ Prettier (formatting check)            ⚠️  Not blocking       │
│  ├─ TypeScript (type checking)             ⚠️  Not blocking       │
│  └─ Recommendation: Make all blocking                             │
│                                                                    │
│  Stage 2: TESTING                                                  │
│  ├─ Unit Tests (15 services)               ⚠️  Some not blocking  │
│  ├─ Integration Tests                      ⚠️  Not blocking       │
│  ├─ E2E Tests (Playwright)                 ✅  Blocking           │
│  ├─ Performance Tests (K6)                 ℹ️   Manual/Scheduled  │
│  └─ Coverage Threshold                     ❌  Not enforced       │
│                                                                    │
│  Stage 3: SECURITY                                                 │
│  ├─ Secret Scanning (Gitleaks)             ✅  BLOCKS PRs         │
│  ├─ SAST (CodeQL, Semgrep)                 ⚠️  Not blocking       │
│  ├─ Dependency Scan (npm, Trivy)           ⚠️  Not blocking       │
│  ├─ Container Scan (Trivy)                 ⚠️  Not blocking       │
│  └─ DAST (OWASP ZAP)                       ℹ️   Staging only      │
│                                                                    │
│  Stage 4: INFRASTRUCTURE                                           │
│  ├─ Terraform Validation                   ✅  Blocking           │
│  ├─ Helm Linting                           ✅  Blocking           │
│  ├─ Kubernetes Validation                  ✅  Blocking           │
│  └─ IaC Security (Checkov)                 ⚠️  Soft fail          │
│                                                                    │
│  Stage 5: DEPLOYMENT                                               │
│  ├─ Production Freeze Check                ✅  Blocking           │
│  ├─ Required Approvers (2)                 ✅  Enforced           │
│  ├─ Pre-deployment Backup                  ✅  Automatic          │
│  ├─ Post-deployment Validation             ✅  Automatic          │
│  └─ Rollback on Failure                    ✅  Automatic          │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

Legend:
  ✅  Fully implemented and blocking
  ⚠️   Implemented but not blocking (needs fix)
  ❌  Not implemented
  ℹ️   Information only / Optional
```

---

## Deployment Strategies Comparison

```
┌──────────────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT STRATEGIES                             │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  CANARY DEPLOYMENT (Default - Production)                            │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                                                                │ │
│  │  10%  ──▶  Validate  ──▶  25%  ──▶  Validate                 │ │
│  │   │                        │                                   │ │
│  │   └─ Metrics OK?           └─ Metrics OK?                     │ │
│  │                                                                │ │
│  │  50%  ──▶  Validate  ──▶  75%  ──▶  Validate  ──▶  100%      │ │
│  │   │                        │                         │         │ │
│  │   └─ Metrics OK?           └─ Metrics OK?            └─Done    │ │
│  │                                                                │ │
│  │  Any stage fails ──▶ Automatic Rollback                       │ │
│  │                                                                │ │
│  │  Best for: High-risk changes, gradual rollout                 │ │
│  │  Time: ~30 minutes (with validation)                          │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  BLUE-GREEN DEPLOYMENT                                               │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                                                                │ │
│  │  Current: BLUE (100% traffic)                                 │ │
│  │     │                                                          │ │
│  │     │  Deploy to GREEN ──▶ Validate                           │ │
│  │     │                        │                                 │ │
│  │     │                        ├─ Tests pass?                   │ │
│  │     │                        │   ├─ Yes ──▶ Switch traffic    │ │
│  │     │                        │   │           to GREEN          │ │
│  │     │                        │   └─ No ──▶  Keep BLUE         │ │
│  │     │                        │                                 │ │
│  │     └──────────────────────  GREEN (100% traffic)             │ │
│  │                               BLUE (standby for rollback)      │ │
│  │                                                                │ │
│  │  Best for: Critical updates, instant rollback needed          │ │
│  │  Time: ~15 minutes                                            │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ROLLING DEPLOYMENT                                                  │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                                                                │ │
│  │  Pods: [Old] [Old] [Old] [Old] [Old]                          │ │
│  │         │                                                      │ │
│  │         └──▶ [New] [Old] [Old] [Old] [Old]                    │ │
│  │                │                                               │ │
│  │                └──▶ [New] [New] [Old] [Old] [Old]             │ │
│  │                       │                                        │ │
│  │                       └──▶ [New] [New] [New] [Old] [Old]      │ │
│  │                              │                                 │ │
│  │                              └──▶ [New] [New] [New] [New] [New]│ │
│  │                                                                │ │
│  │  • MaxUnavailable: 0                                          │ │
│  │  • MaxSurge: 1                                                │ │
│  │  • One pod at a time                                          │ │
│  │                                                                │ │
│  │  Best for: Low-risk updates, resource efficiency              │ │
│  │  Time: ~10-20 minutes                                         │ │
│  └────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Security Layers

```
┌──────────────────────────────────────────────────────────────────────┐
│                    SECURITY DEFENSE IN DEPTH                         │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Layer 1: CODE COMMIT                                                │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  • Pre-commit hooks (local)                                    │ │
│  │  • Git hooks validation                                        │ │
│  └────────────────────────────────────────────────────────────────┘ │
│          │                                                           │
│          ▼                                                           │
│  Layer 2: SECRET DETECTION (PR/Push)                                │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  • Gitleaks (658-line custom config)    ✅  BLOCKS PRs         │ │
│  │  • TruffleHog (verified only)                                  │ │
│  │  • Custom patterns (payment providers)                         │ │
│  │  • Creates security issues                                     │ │
│  └────────────────────────────────────────────────────────────────┘ │
│          │                                                           │
│          ▼                                                           │
│  Layer 3: STATIC ANALYSIS (SAST)                                    │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  • CodeQL (security-extended queries)                          │ │
│  │  • Semgrep (OWASP Top 10, security-audit)                      │ │
│  │  • SARIF reports → GitHub Security tab                         │ │
│  └────────────────────────────────────────────────────────────────┘ │
│          │                                                           │
│          ▼                                                           │
│  Layer 4: DEPENDENCY SCANNING                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  • npm audit (high/critical)                                   │ │
│  │  • Trivy (filesystem scan)                                     │ │
│  │  • Snyk (if configured)                                        │ │
│  │  • Dependabot (automated PRs)                                  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│          │                                                           │
│          ▼                                                           │
│  Layer 5: CONTAINER SCANNING                                        │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  • Trivy image scan (CRITICAL/HIGH)                            │ │
│  │  • Base image vulnerabilities                                  │ │
│  │  • Configuration issues                                        │ │
│  └────────────────────────────────────────────────────────────────┘ │
│          │                                                           │
│          ▼                                                           │
│  Layer 6: INFRASTRUCTURE SECURITY (IaC)                             │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  • Checkov (Terraform/K8s)                                     │ │
│  │  • tfsec (Terraform)                                           │ │
│  │  • Trivy config scan                                           │ │
│  │  • CIS benchmarks                                              │ │
│  └────────────────────────────────────────────────────────────────┘ │
│          │                                                           │
│          ▼                                                           │
│  Layer 7: DYNAMIC TESTING (DAST - Staging)                          │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  • OWASP ZAP baseline scan                                     │ │
│  │  • Active security testing                                     │ │
│  │  • Running application analysis                                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│          │                                                           │
│          ▼                                                           │
│  Layer 8: RUNTIME PROTECTION (Production)                           │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  • Azure Security Center                                       │ │
│  │  • Network policies                                            │ │
│  │  • Pod security policies                                       │ │
│  │  • RBAC enforcement                                            │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Rollback Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                    ROLLBACK MECHANISMS                               │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  AUTOMATIC ROLLBACK (Triggered on Deployment Failure)                │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                                                                │ │
│  │  Deployment Fails ──▶ Detect Failure                          │ │
│  │                          │                                     │ │
│  │                          ├─ Shift traffic away (0%)           │ │
│  │                          │                                     │ │
│  │                          ├─ Helm rollback                     │ │
│  │                          │   (to previous revision)           │ │
│  │                          │                                     │ │
│  │                          ├─ Verify rollback                   │ │
│  │                          │   (health checks)                  │ │
│  │                          │                                     │ │
│  │                          ├─ Alert team (Slack)                │ │
│  │                          │                                     │ │
│  │                          └─ Create incident report            │ │
│  │                                                                │ │
│  │  Time to rollback: < 2 minutes                                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  MANUAL ROLLBACK (Emergency Workflow)                                │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                                                                │ │
│  │  Manual Trigger ──▶ Validate Request                          │ │
│  │  (workflow_dispatch)   │                                      │ │
│  │                        │                                       │ │
│  │                        ├─ Backup current state                │ │
│  │                        │   (K8s manifests + DB)               │ │
│  │                        │                                       │ │
│  │                        ├─ Choose rollback type:               │ │
│  │                        │   • Application only                 │ │
│  │                        │   • Database only                    │ │
│  │                        │   • Full (both)                      │ │
│  │                        │                                       │ │
│  │                        ├─ Shift traffic away                  │ │
│  │                        │                                       │ │
│  │                        ├─ Rollback application                │ │
│  │                        │   (Helm to target version)           │ │
│  │                        │                                       │ │
│  │                        ├─ Restore database                    │ │
│  │                        │   (Azure backup)                     │ │
│  │                        │                                       │ │
│  │                        ├─ Validate rollback                   │ │
│  │                        │   (smoke tests)                      │ │
│  │                        │                                       │ │
│  │                        └─ Notify team                         │ │
│  │                                                                │ │
│  │  Time to rollback: < 10 minutes                               │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  BLUE-GREEN INSTANT ROLLBACK                                         │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                                                                │ │
│  │  Traffic on GREEN ──▶ Issue Detected                          │ │
│  │                          │                                     │ │
│  │                          ├─ Switch traffic to BLUE            │ │
│  │                          │   (instant - configmap update)     │ │
│  │                          │                                     │ │
│  │                          └─ Verify (< 30 seconds)             │ │
│  │                                                                │ │
│  │  Time to rollback: < 30 seconds                               │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Monitoring & Observability

```
┌──────────────────────────────────────────────────────────────────────┐
│                    OBSERVABILITY STACK                               │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  GitHub Actions                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  • Workflow status                                             │ │
│  │  • Job summaries                                               │ │
│  │  • Artifacts                                                   │ │
│  │  • Logs (streaming)                                            │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  Azure Monitor                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  • Application Insights                                        │ │
│  │  • Log Analytics                                               │ │
│  │  • Metrics                                                     │ │
│  │  • Alerts                                                      │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  Slack Notifications                                                 │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  #production-deployments  #staging-deployments                 │ │
│  │  #infrastructure          #finance                             │ │
│  │  #security-alerts         #incidents                           │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  GitHub Security Tab                                                 │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  • Secret scanning alerts                                      │ │
│  │  • Code scanning alerts (SARIF)                                │ │
│  │  • Dependency alerts                                           │ │
│  │  • Security advisories                                         │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Documentation Resources

```
┌──────────────────────────────────────────────────────────────────────┐
│                    DOCUMENTATION STRUCTURE                           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Primary Documents                                                   │
│  ├─ CICD_QUALITY_GATES_AUDIT_REPORT.md     (Comprehensive audit)    │
│  ├─ CICD_AUDIT_EXECUTIVE_SUMMARY.md        (Executive overview)     │
│  ├─ CICD_PIPELINE_ARCHITECTURE.md          (This document)          │
│  └─ .github/CICD_QUALITY_GATES_FIXES.md    (Fix implementation)     │
│                                                                      │
│  Workflow Documentation                                              │
│  ├─ .github/CICD_QUICK_REFERENCE.md        (Quick commands)         │
│  ├─ .github/DEPLOYMENT.md                  (Deployment guide)       │
│  ├─ .github/SECURITY.md                    (Security policies)      │
│  └─ .github/workflows/README-SECRET-SCANNING.md                     │
│                                                                      │
│  Configuration Files                                                 │
│  ├─ .gitleaks.toml                         (Secret detection rules) │
│  ├─ .github/dependabot.yml                 (Dependency updates)     │
│  └─ .github/workflows/*.yml                (36+ workflow files)     │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Key Metrics

```
┌──────────────────────────────────────────────────────────────────────┐
│                    PIPELINE METRICS                                  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Total Workflows: 36+                                                │
│  ├─ CI Workflows: 4                                                  │
│  ├─ CD Workflows: 5                                                  │
│  ├─ Security: 6                                                      │
│  ├─ Testing: 5                                                       │
│  ├─ Infrastructure: 8                                                │
│  └─ Operations: 8+                                                   │
│                                                                      │
│  Services Covered: 15 microservices                                  │
│  ├─ Parallel build: Yes (matrix strategy)                           │
│  ├─ Individual testing: Yes                                          │
│  └─ Independent deployment: Yes                                      │
│                                                                      │
│  Test Coverage:                                                      │
│  ├─ Unit tests: 15 services                                         │
│  ├─ Integration tests: Full stack                                   │
│  ├─ E2E tests: 3 browsers × 2 shards                                │
│  ├─ Performance tests: 9 test types                                 │
│  └─ Security tests: 8 scanners                                      │
│                                                                      │
│  Deployment Time:                                                    │
│  ├─ Development: ~10 minutes                                        │
│  ├─ Staging: ~25-35 minutes (full tests)                            │
│  └─ Production: ~30-45 minutes (canary)                             │
│                                                                      │
│  Rollback Time:                                                      │
│  ├─ Automatic: < 2 minutes                                          │
│  ├─ Manual (app): < 10 minutes                                      │
│  └─ Blue-Green: < 30 seconds                                        │
│                                                                      │
│  Maturity Score: 87% (Level 4 - Measured)                            │
│  Target: 95% (Level 5 - Optimizing)                                 │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

**Document Version:** 1.0
**Last Updated:** December 16, 2024
**Maintained By:** DevOps Team
**Contact:** devops@flamoral.com | #devops Slack
