# Flamoral Platform - Verification Scripts Documentation

This directory contains comprehensive post-deployment verification and health check scripts for the Flamoral platform.

## Overview

After deploying the Flamoral platform, use these scripts to verify that everything is working correctly and to monitor the health of the system.

## Scripts

### 1. verify-deployment.sh

**Purpose:** Comprehensive deployment verification script that checks all aspects of the deployment.

**Usage:**
```bash
./verify-deployment.sh [environment]
```

**What it checks:**
- DNS resolution for all domains (flamoral.com, www, api, admin)
- TLS certificate validity and expiration dates
- All Kubernetes pods are running and healthy
- All services have valid endpoints
- Health endpoints respond correctly
- External secrets are synced (if using External Secrets Operator)
- Azure Front Door routing (if applicable)
- WebSocket connections work
- API endpoints respond correctly

**Exit Codes:**
- `0` - All checks passed
- `1` - One or more critical checks failed
- `2` - Script usage error

**Example Output:**
```
========================================
DNS Resolution Checks
========================================

[CHECK] Checking DNS for flamoral.com...
[PASS] flamoral.com resolves to 48.200.65.15

[CHECK] Checking DNS for www.flamoral.com...
[PASS] www.flamoral.com resolves to 48.200.65.15

...

========================================
Verification Summary
========================================

Total Checks: 47
Passed: 45
Failed: 2

[FAIL] Deployment verification completed with 2 failed checks.
```

**Prerequisites:**
- `kubectl` installed and configured
- `curl` available
- `dig` or `nslookup` available
- `openssl` available
- `jq` for JSON parsing (optional but recommended)
- Azure CLI (`az`) for Front Door checks (optional)

### 2. smoke-tests.sh

**Purpose:** Perform comprehensive smoke tests on the deployed application to verify critical functionality.

**Usage:**
```bash
./smoke-tests.sh [options]

Options:
  -e, --environment ENV    Environment to test (production, staging, dev)
  -v, --verbose           Enable verbose output
  -h, --help              Show help message
```

**What it tests:**
- Main API endpoints (health, status, version)
- Authentication flow (registration, login, logout, token validation)
- WebSocket connection
- Static asset delivery (HTML, CSS, JS, images)
- CDN caching headers
- Response times for all endpoints
- Core business logic endpoints
- Security headers
- Error handling (404, 405, malformed requests)

**Example:**
```bash
# Test production environment
./smoke-tests.sh --environment production

# Test staging with verbose output
./smoke-tests.sh -e staging -v
```

**Example Output:**
```
========================================
API Endpoint Tests
========================================

[TEST] Testing API health endpoint...
[PASS] API health endpoint responding (127ms)

[TEST] Testing API status endpoint...
[PASS] API status endpoint responding (89ms)

...

========================================
Smoke Test Summary Report
========================================

Environment: production
Base URL: https://flamoral.com
API URL: https://api.flamoral.com

Test Results:
  Total Tests: 32
  Passed: 31
  Failed: 1

Performance Metrics:
  Average Response Time: 145ms
  Performance: GOOD (target: <2000ms)

========================================
ALL SMOKE TESTS PASSED!
========================================
```

**Prerequisites:**
- `curl` available
- `jq` for JSON parsing (optional)
- `websocat` for WebSocket testing (optional)

### 3. health-dashboard.sh

**Purpose:** Display a real-time health dashboard showing the status of all services, resource utilization, error rates, and performance metrics.

**Usage:**
```bash
./health-dashboard.sh [options]

Options:
  -w, --watch SECONDS     Auto-refresh dashboard every N seconds
  -n, --namespace NAME    Kubernetes namespace (default: flamoral)
  -j, --json              Output in JSON format
  -h, --help              Show help message
```

**What it shows:**
- Pod status for all services (running, pending, failed)
- Service endpoints and cluster IPs
- Ingress configuration and external IP
- Resource utilization (CPU and memory)
- Error rates from logs (last 5 minutes)
- Response times (95th percentile) from Prometheus
- Cache hit rates (Redis)

**Example:**
```bash
# Show dashboard once
./health-dashboard.sh

# Auto-refresh every 5 seconds
./health-dashboard.sh --watch 5

# Watch specific namespace
./health-dashboard.sh -n production -w 10

# Output in JSON format
./health-dashboard.sh --json
```

**Example Output:**
```
╔═══════════════════════════════════════════════════════════════════════════╗
║                    FLAMORAL PLATFORM HEALTH DASHBOARD                     ║
╚═══════════════════════════════════════════════════════════════════════════╝

Last Updated: Fri Dec 13 21:00:00 UTC 2025
Namespace: flamoral

========================================
Pod Status - Namespace: flamoral
========================================

Summary: Total: 16 | Running: 14 | Pending: 0 | Failed: 2

POD NAME                                 STATUS          READY    RESTARTS   AGE
────────────────────────────────────────────────────────────────────────────────
web-app-6d4b654dd9-qg9jc                Running         True     0          2h
web-app-6d4b654dd9-ttmt8                Running         True     0          2h
api-gateway-5f8c9d7b6-xk2lp             Running         True     1          2h
...

========================================
Resource Utilization
========================================

POD NAME                                 CPU             MEMORY
────────────────────────────────────────────────────────────────────────────────
web-app-6d4b654dd9-qg9jc                85m             142Mi
web-app-6d4b654dd9-ttmt8                92m             138Mi
...
────────────────────────────────────────────────────────────────────────────────
TOTAL                                    1240m           2456Mi
```

**Prerequisites:**
- `kubectl` installed and configured
- `jq` for JSON parsing
- Metrics server installed for resource utilization
- Prometheus for response times and cache metrics (optional)

## Configuration Files

### 4. alerts-config.yaml

**Purpose:** Comprehensive alert configuration for Prometheus and AlertManager.

**Location:** `infrastructure/monitoring/alerts-config.yaml`

**What it includes:**
- Prometheus alert rules for:
  - Critical alerts (pod crashes, service down, high error rates, certificate expiration)
  - Performance alerts (high response time, CPU/memory usage, slow queries)
  - Resource alerts (disk pressure, memory pressure, PVC usage)
  - Business logic alerts (matching queue, WebSocket issues, payment failures)
- AlertManager configuration with:
  - Notification channels (Slack, Email, PagerDuty)
  - Alert routing rules
  - Inhibition rules (suppress redundant alerts)
  - Multiple receivers for different teams

**Deployment:**
```bash
# Before deploying, update the configuration:
# 1. Replace YOUR_SLACK_WEBHOOK_URL with your Slack webhook
# 2. Replace SMTP credentials with your email provider
# 3. Replace YOUR_PAGERDUTY_SERVICE_KEY if using PagerDuty
# 4. Update email addresses for each team

# Deploy to Kubernetes
kubectl apply -f infrastructure/monitoring/alerts-config.yaml

# Verify deployment
kubectl get pods -n monitoring
kubectl get configmap -n monitoring flamoral-alert-rules
kubectl get configmap -n monitoring alertmanager-config
```

**Customization:**
Edit the alert thresholds in `alerts-config.yaml`:
- Error rate threshold (default: 5%)
- Response time threshold (default: 2 seconds)
- CPU usage threshold (default: 90%)
- Memory usage threshold (default: 90%)

### 5. VERIFICATION_CHECKLIST.md

**Purpose:** Comprehensive manual verification checklist for post-deployment sign-off.

**Location:** `infrastructure/VERIFICATION_CHECKLIST.md`

**Sections:**
1. Pre-Verification Prerequisites
2. Infrastructure Verification (DNS, TLS, Kubernetes)
3. Application Verification (Web app, API, microservices)
4. Security Verification (headers, secrets, network policies)
5. Performance Verification (load testing, caching)
6. Monitoring & Alerts Verification
7. Business Logic Verification (user flows)
8. Disaster Recovery Verification
9. Sign-Off section with spaces for signatures

**Usage:**
1. Print the checklist or use digitally
2. Go through each section systematically
3. Mark each check as passed (✅) or failed (❌)
4. Document any issues or notes
5. Get sign-off from all stakeholders
6. Keep as deployment record

## Quick Start Guide

### After Deployment

**Step 1: Run Deployment Verification**
```bash
cd infrastructure/scripts
./verify-deployment.sh production
```

**Step 2: Run Smoke Tests**
```bash
./smoke-tests.sh --environment production --verbose
```

**Step 3: Monitor Health Dashboard**
```bash
# Watch dashboard with 10-second refresh
./health-dashboard.sh --watch 10
```

**Step 4: Configure Alerts**
```bash
# Update alerts-config.yaml with your credentials
# Then deploy
kubectl apply -f ../monitoring/alerts-config.yaml

# Verify alerts are loaded
kubectl get configmap -n monitoring flamoral-alert-rules
```

**Step 5: Complete Manual Checklist**
```bash
# Open the verification checklist
cat ../VERIFICATION_CHECKLIST.md

# Or open in your editor/print it
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Post-Deployment Verification

on:
  workflow_dispatch:
  deployment:
    types: [created]

jobs:
  verify-deployment:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Configure kubectl
        run: |
          echo "${{ secrets.KUBE_CONFIG }}" > kubeconfig
          export KUBECONFIG=kubeconfig

      - name: Run Deployment Verification
        run: |
          cd infrastructure/scripts
          chmod +x verify-deployment.sh
          ./verify-deployment.sh production

      - name: Run Smoke Tests
        run: |
          cd infrastructure/scripts
          chmod +x smoke-tests.sh
          ./smoke-tests.sh --environment production

      - name: Upload Results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: verification-results
          path: |
            verification-*.log
            smoke-test-*.log
```

### Azure DevOps Pipeline Example

```yaml
trigger: none

pr: none

pool:
  vmImage: 'ubuntu-latest'

steps:
- task: Kubernetes@1
  displayName: 'Configure kubectl'
  inputs:
    connectionType: 'Kubernetes Service Connection'
    kubernetesServiceEndpoint: 'flamoral-aks'
    command: 'login'

- bash: |
    cd infrastructure/scripts
    chmod +x verify-deployment.sh
    ./verify-deployment.sh production
  displayName: 'Run Deployment Verification'

- bash: |
    cd infrastructure/scripts
    chmod +x smoke-tests.sh
    ./smoke-tests.sh --environment production
  displayName: 'Run Smoke Tests'

- task: PublishTestResults@2
  displayName: 'Publish Test Results'
  condition: always()
  inputs:
    testResultsFormat: 'JUnit'
    testResultsFiles: '**/test-results.xml'
```

## Troubleshooting

### verify-deployment.sh

**Issue:** "kubectl command not found"
- **Solution:** Install kubectl: https://kubernetes.io/docs/tasks/tools/

**Issue:** "Permission denied"
- **Solution:** `chmod +x verify-deployment.sh`

**Issue:** "Unable to connect to cluster"
- **Solution:** Configure kubectl context: `kubectl config use-context flamoral-prod-aks`

**Issue:** DNS checks failing
- **Solution:** Wait for DNS propagation (can take up to 48 hours) or check DNS records

### smoke-tests.sh

**Issue:** All tests failing with "connection timeout"
- **Solution:** Check if services are actually running and accessible

**Issue:** WebSocket tests skipped
- **Solution:** Install websocat: `cargo install websocat`

**Issue:** Certificate validation errors
- **Solution:** Certificate may not be trusted. Check cert-manager logs.

### health-dashboard.sh

**Issue:** "Metrics server not available"
- **Solution:** Install metrics-server: `kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml`

**Issue:** "Prometheus not accessible"
- **Solution:** Port-forward Prometheus: `kubectl port-forward -n monitoring svc/prometheus-server 9090:9090`

**Issue:** No response time data
- **Solution:** Ensure Prometheus is scraping your services and metrics are being exported

### alerts-config.yaml

**Issue:** Alerts not firing
- **Solution:** Check Prometheus rules: `kubectl get prometheusrules -n monitoring`

**Issue:** No notifications received
- **Solution:** Verify AlertManager configuration and test webhook URLs

**Issue:** Too many false positives
- **Solution:** Adjust alert thresholds in the ConfigMap and re-apply

## Best Practices

1. **Run verification scripts after every deployment**
2. **Monitor the health dashboard during and after deployments**
3. **Keep the verification checklist as deployment record**
4. **Test alerts regularly** (at least monthly)
5. **Update alert thresholds** based on actual baseline metrics
6. **Automate verification in CI/CD pipeline**
7. **Document any deviations from expected results**
8. **Review and improve scripts based on incidents**

## Support

For issues or questions:
- Check the troubleshooting section above
- Review logs: `kubectl logs -n flamoral <pod-name>`
- Contact the platform team
- Refer to runbooks: https://docs.flamoral.com/runbooks

## Contributing

To improve these scripts:
1. Fork the repository
2. Make your changes
3. Test thoroughly
4. Submit a pull request
5. Update this documentation

## License

Copyright © 2025 Flamoral Platform. All rights reserved.
