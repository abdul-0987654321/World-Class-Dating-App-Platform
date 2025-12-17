# CI/CD Quality Gates - Fixes Implementation Guide
## Flamoral Dating Platform

This document provides step-by-step instructions to fix all identified issues in the CI/CD audit.

---

## Fix 1: Configure Branch Protection Rules

### Location: GitHub UI (Settings → Branches)

### Main Branch Protection

1. Go to: `https://github.com/YOUR_ORG/flamoral/settings/branches`
2. Click "Add rule" for `main` branch
3. Configure:

```yaml
Branch name pattern: main

Required status checks:
  ☑ Require status checks to pass before merging
  ☑ Require branches to be up to date before merging

  Required checks:
    - CI Pipeline Summary (main-ci.yml)
    - Code Quality (main-ci.yml)
    - Unit Tests (main-ci.yml)
    - Secret Scanning (secret-scan.yml)
    - Security Scan (unified-security-pipeline.yml)
    - Frontend Tests (main-ci.yml)
    - Integration Tests (main-ci.yml)

Pull request reviews:
  ☑ Require pull request reviews before merging
  ☑ Required approving reviews: 2
  ☑ Dismiss stale pull request approvals when new commits are pushed
  ☑ Require review from Code Owners

Additional settings:
  ☑ Require conversation resolution before merging
  ☑ Require signed commits
  ☑ Include administrators
  ☑ Restrict who can push to matching branches
  ☑ Do not allow bypassing the above settings
  ☑ Restrict force pushes
  ☑ Allow deletions: ☐ (unchecked)
```

### Develop Branch Protection

```yaml
Branch name pattern: develop

Required status checks:
  ☑ Require status checks to pass before merging

  Required checks:
    - CI Pipeline Summary (unified-ci.yml)
    - Code Quality (unified-ci.yml)
    - Unit Tests (unified-ci.yml)
    - Secret Scanning (secret-scan.yml)

Pull request reviews:
  ☑ Require pull request reviews before merging
  ☑ Required approving reviews: 1

Additional settings:
  ☑ Require conversation resolution before merging
  ☑ Restrict force pushes
```

### Staging Branch Protection

```yaml
Branch name pattern: staging

Required status checks:
  ☑ Require status checks to pass before merging

  Required checks:
    - CI Pipeline Summary

Pull request reviews:
  ☑ Require pull request reviews before merging
  ☑ Required approving reviews: 1

Additional settings:
  ☑ Do not allow force pushes
```

---

## Fix 2: Remove `continue-on-error` from Critical Quality Gates

### File: `.github/workflows/main-ci.yml`

#### Change 1: ESLint Must Block

**Line 111-115 - BEFORE:**
```yaml
- name: Run ESLint
  run: |
    npm run lint --if-present || echo "No lint script found"
    npx eslint . --ext .js,.jsx,.ts,.tsx --max-warnings 50 || true
  continue-on-error: true
```

**AFTER:**
```yaml
- name: Run ESLint
  run: |
    if npm run lint --if-present; then
      echo "Lint passed"
    else
      echo "::error::ESLint found errors. Please fix before merging."
      exit 1
    fi

- name: Run ESLint (fallback)
  if: failure()
  run: |
    # Run with more lenient settings if no lint script
    npx eslint . --ext .js,.jsx,.ts,.tsx --max-warnings 50
```

#### Change 2: Prettier Must Block

**Line 117-121 - BEFORE:**
```yaml
- name: Run Prettier check
  run: |
    npm run format:check --if-present || \
    npx prettier --check "**/*.{js,jsx,ts,tsx,json,yml,yaml,md}" || true
  continue-on-error: true
```

**AFTER:**
```yaml
- name: Run Prettier check
  run: |
    if npm run format:check --if-present; then
      echo "Formatting check passed"
    else
      echo "::error::Code formatting issues found. Run 'npm run format' to fix."
      npx prettier --check "**/*.{js,jsx,ts,tsx,json,yml,yaml,md}"
      exit 1
    fi
```

#### Change 3: TypeScript Type Checking Must Block

**Line 123-131 - BEFORE:**
```yaml
- name: TypeScript type checking
  run: |
    find . -name "tsconfig.json" -not -path "*/node_modules/*" | while read config; do
      dir=$(dirname "$config")
      echo "Type checking $dir"
      cd "$dir" && npx tsc --noEmit || true
      cd - > /dev/null
    done
  continue-on-error: true
```

**AFTER:**
```yaml
- name: TypeScript type checking
  run: |
    TYPE_ERRORS=0
    find . -name "tsconfig.json" -not -path "*/node_modules/*" | while read config; do
      dir=$(dirname "$config")
      echo "Type checking $dir"
      if ! (cd "$dir" && npx tsc --noEmit); then
        echo "::error::Type errors found in $dir"
        TYPE_ERRORS=$((TYPE_ERRORS + 1))
      fi
      cd - > /dev/null
    done

    if [ $TYPE_ERRORS -gt 0 ]; then
      echo "::error::Found TypeScript errors in $TYPE_ERRORS location(s)"
      exit 1
    fi
```

#### Change 4: Unit Tests Must Block

**Line 221-224 - BEFORE:**
```yaml
- name: Run unit tests
  if: steps.check.outputs.exists == 'true' && github.event.inputs.skip_tests != 'true'
  working-directory: backend/services/${{ matrix.service }}
  run: npm test -- --coverage --ci --maxWorkers=2 || npm test || true
```

**AFTER:**
```yaml
- name: Run unit tests
  if: steps.check.outputs.exists == 'true' && github.event.inputs.skip_tests != 'true'
  working-directory: backend/services/${{ matrix.service }}
  run: |
    if npm test -- --coverage --ci --maxWorkers=2; then
      echo "Tests passed"
    else
      echo "::error::Unit tests failed for ${{ matrix.service }}"
      exit 1
    fi
```

#### Change 5: Integration Tests Must Block

**Line 297-299 - BEFORE:**
```yaml
- name: Run integration tests
  if: github.event.inputs.skip_tests != 'true'
  run: npm run test:integration || true
```

**AFTER:**
```yaml
- name: Run integration tests
  if: github.event.inputs.skip_tests != 'true'
  run: |
    if npm run test:integration; then
      echo "Integration tests passed"
    else
      echo "::error::Integration tests failed"
      exit 1
    fi
```

#### Change 6: npm audit Must Block on Critical

**Line 386-389 - BEFORE:**
```yaml
- name: Run npm audit
  run: |
    npm audit --audit-level=high --production || echo "Vulnerabilities found"
  continue-on-error: true
```

**AFTER:**
```yaml
- name: Run npm audit
  run: |
    # Fail on CRITICAL vulnerabilities only
    if npm audit --audit-level=critical --production; then
      echo "No critical vulnerabilities"
    else
      echo "::error::CRITICAL vulnerabilities found. Please fix before merging."
      npm audit --audit-level=critical --production
      exit 1
    fi

    # Warn on HIGH vulnerabilities
    if ! npm audit --audit-level=high --production; then
      echo "::warning::HIGH vulnerabilities found. Consider fixing."
    fi
```

---

## Fix 3: Add Test Coverage Threshold

### File: `.github/workflows/main-ci.yml`

Add after line 224 (after "Run unit tests"):

```yaml
- name: Check coverage threshold
  if: steps.check.outputs.exists == 'true'
  working-directory: backend/services/${{ matrix.service }}
  run: |
    if [ -f "coverage/coverage-summary.json" ]; then
      LINES=$(jq '.total.lines.pct' coverage/coverage-summary.json)
      STATEMENTS=$(jq '.total.statements.pct' coverage/coverage-summary.json)
      FUNCTIONS=$(jq '.total.functions.pct' coverage/coverage-summary.json)
      BRANCHES=$(jq '.total.branches.pct' coverage/coverage-summary.json)

      THRESHOLD=80
      FAILED=0

      if (( $(echo "$LINES < $THRESHOLD" | bc -l) )); then
        echo "::error::Line coverage ${LINES}% is below threshold ${THRESHOLD}%"
        FAILED=1
      fi

      if (( $(echo "$STATEMENTS < $THRESHOLD" | bc -l) )); then
        echo "::error::Statement coverage ${STATEMENTS}% is below threshold ${THRESHOLD}%"
        FAILED=1
      fi

      if (( $(echo "$FUNCTIONS < 70" | bc -l) )); then
        echo "::error::Function coverage ${FUNCTIONS}% is below threshold 70%"
        FAILED=1
      fi

      if (( $(echo "$BRANCHES < 70" | bc -l) )); then
        echo "::error::Branch coverage ${BRANCHES}% is below threshold 70%"
        FAILED=1
      fi

      if [ $FAILED -eq 1 ]; then
        echo "Coverage report:"
        cat coverage/coverage-summary.json
        exit 1
      fi

      echo "Coverage thresholds met:"
      echo "  Lines: ${LINES}%"
      echo "  Statements: ${STATEMENTS}%"
      echo "  Functions: ${FUNCTIONS}%"
      echo "  Branches: ${BRANCHES}%"
    else
      echo "::warning::No coverage report found"
    fi
```

---

## Fix 4: Make Container Scans Blocking on Critical

### File: `.github/workflows/main-ci.yml`

**Line 551-559 - BEFORE:**
```yaml
- name: Scan Docker image with Trivy
  if: steps.dockerfile.outputs.exists == 'true'
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_PREFIX }}/${{ matrix.service.name }}:${{ github.ref_name }}
    format: 'sarif'
    output: 'trivy-image-${{ matrix.service.name }}.sarif'
    severity: 'CRITICAL,HIGH'
  continue-on-error: true
```

**AFTER:**
```yaml
- name: Scan Docker image with Trivy
  if: steps.dockerfile.outputs.exists == 'true'
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_PREFIX }}/${{ matrix.service.name }}:${{ github.ref_name }}
    format: 'sarif'
    output: 'trivy-image-${{ matrix.service.name }}.sarif'
    severity: 'CRITICAL,HIGH'
    exit-code: '1'  # Fail on CRITICAL/HIGH vulnerabilities

- name: Scan Docker image with Trivy (detailed)
  if: failure() && steps.dockerfile.outputs.exists == 'true'
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_PREFIX }}/${{ matrix.service.name }}:${{ github.ref_name }}
    format: 'table'
    severity: 'CRITICAL,HIGH'
```

---

## Fix 5: Make SAST Blocking on Critical

### File: `.github/workflows/unified-security-pipeline.yml`

Add after line 215 (after CodeQL analysis):

```yaml
- name: Check CodeQL Results
  run: |
    echo "Checking for CRITICAL/HIGH severity findings..."
    # CodeQL results are in SARIF format
    # GitHub will automatically fail if critical issues are found
    # This step documents the requirement

- name: Fail on Critical SAST Findings
  if: failure()
  run: |
    echo "::error::CRITICAL or HIGH severity security issues found"
    echo "Please review and fix security findings before merging"
    exit 1
```

### File: `.github/workflows/unified-security-pipeline.yml`

**Line 218-228 - Semgrep Configuration:**

Add to Semgrep step:

```yaml
- name: Run Semgrep
  id: semgrep
  uses: returntocorp/semgrep-action@v1
  with:
    config: >-
      p/javascript
      p/typescript
      p/react
      p/nodejs
      p/owasp-top-ten
      p/security-audit
    generateSarif: "1"
    auditOn: push  # Enable for push events

- name: Check Semgrep Results
  if: always()
  run: |
    if [ -f "semgrep.sarif" ]; then
      CRITICAL=$(jq '[.runs[].results[] | select(.level == "error")] | length' semgrep.sarif)
      if [ "$CRITICAL" -gt 0 ]; then
        echo "::error::Found $CRITICAL critical security issues"
        exit 1
      fi
    fi
```

---

## Fix 6: Configure Production Environment Protection

### Location: GitHub UI (Settings → Environments)

1. Go to: `https://github.com/YOUR_ORG/flamoral/settings/environments`

2. Create/Edit `production` environment:
   ```
   Environment name: production

   Deployment branches:
     ☑ Selected branches
     Allowed branches: main

   Environment protection rules:
     ☑ Required reviewers: 2
       Select: @lead-engineer, @devops-team

     ☑ Wait timer: 5 minutes

   Environment secrets:
     PROD_URL
     PROD_API_URL
     AZURE_CLIENT_SECRET
   ```

3. Create `production-approval` environment:
   ```
   Environment name: production-approval

   Environment protection rules:
     ☑ Required reviewers: 2
       Select: @cto, @lead-engineer

     ☑ Wait timer: 0 minutes
   ```

4. Create `production-rollback` environment:
   ```
   Environment name: production-rollback

   Environment protection rules:
     ☑ Required reviewers: 1
       Select: @devops-team

     ☑ Wait timer: 0 minutes
   ```

---

## Fix 7: Add Performance Budgets to E2E Tests

### File: Create `apps/web-app/lighthouse-budget.json`

```json
[
  {
    "resourceSizes": [
      {
        "resourceType": "script",
        "budget": 300
      },
      {
        "resourceType": "stylesheet",
        "budget": 100
      },
      {
        "resourceType": "image",
        "budget": 500
      },
      {
        "resourceType": "total",
        "budget": 1000
      }
    ],
    "timings": [
      {
        "metric": "interactive",
        "budget": 3000
      },
      {
        "metric": "first-contentful-paint",
        "budget": 1500
      },
      {
        "metric": "largest-contentful-paint",
        "budget": 2500
      },
      {
        "metric": "cumulative-layout-shift",
        "budget": 0.1
      },
      {
        "metric": "max-potential-fid",
        "budget": 100
      }
    ]
  }
]
```

### File: `.github/workflows/performance-tests.yml`

Update Lighthouse step (line 270-282):

```yaml
- name: Run Lighthouse CI
  uses: treosh/lighthouse-ci-action@v11
  with:
    urls: |
      ${{ secrets.STAGING_URL }}
      ${{ secrets.STAGING_URL }}/login
      ${{ secrets.STAGING_URL }}/discover
      ${{ secrets.STAGING_URL }}/messages
      ${{ secrets.STAGING_URL }}/profile
    budgetPath: ./apps/web-app/lighthouse-budget.json
    uploadArtifacts: true
    temporaryPublicStorage: true

- name: Check Lighthouse thresholds
  run: |
    echo "Performance thresholds:"
    echo "- Performance: >= 90"
    echo "- Accessibility: >= 95"
    echo "- Best Practices: >= 90"
    echo "- SEO: >= 90"

    # Add actual threshold checking
    if [ -f "lhci_reports/manifest.json" ]; then
      PERFORMANCE=$(jq '.[] | select(.url | contains("/")) | .summary.performance' lhci_reports/manifest.json | head -1)
      ACCESSIBILITY=$(jq '.[] | select(.url | contains("/")) | .summary.accessibility' lhci_reports/manifest.json | head -1)

      if (( $(echo "$PERFORMANCE < 0.90" | bc -l) )); then
        echo "::error::Performance score $PERFORMANCE is below 0.90"
        exit 1
      fi

      if (( $(echo "$ACCESSIBILITY < 0.95" | bc -l) )); then
        echo "::error::Accessibility score $ACCESSIBILITY is below 0.95"
        exit 1
      fi
    fi
```

---

## Fix 8: Add Secret Rotation Reminders

### File: Create `.github/workflows/secret-rotation-reminder.yml`

```yaml
name: Secret Rotation Reminder

on:
  schedule:
    - cron: '0 9 1 * *'  # First day of every month at 9 AM UTC
  workflow_dispatch:

jobs:
  check-secret-age:
    name: Check Secret Age
    runs-on: ubuntu-latest

    steps:
      - name: Check Azure Key Vault secrets
        run: |
          echo "# Secret Rotation Reminder" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "Please verify and rotate the following secrets:" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "## Production Secrets" >> $GITHUB_STEP_SUMMARY
          echo "- [ ] Database passwords (90-day rotation)" >> $GITHUB_STEP_SUMMARY
          echo "- [ ] API keys (90-day rotation)" >> $GITHUB_STEP_SUMMARY
          echo "- [ ] JWT secrets (180-day rotation)" >> $GITHUB_STEP_SUMMARY
          echo "- [ ] Service principal credentials (180-day rotation)" >> $GITHUB_STEP_SUMMARY
          echo "- [ ] Payment provider keys (yearly review)" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "## GitHub Secrets" >> $GITHUB_STEP_SUMMARY
          echo "- [ ] AZURE_CLIENT_SECRET" >> $GITHUB_STEP_SUMMARY
          echo "- [ ] CODECOV_TOKEN" >> $GITHUB_STEP_SUMMARY
          echo "- [ ] SNYK_TOKEN" >> $GITHUB_STEP_SUMMARY
          echo "- [ ] SLACK_WEBHOOK_URL" >> $GITHUB_STEP_SUMMARY

      - name: Create rotation issue
        uses: actions/github-script@v7
        with:
          script: |
            const issue = await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `[Security] Monthly Secret Rotation Reminder - ${new Date().toISOString().split('T')[0]}`,
              body: `## Secret Rotation Checklist\n\n` +
                    `This is an automated reminder to rotate secrets per security policy.\n\n` +
                    `### Production Secrets (90-day rotation)\n` +
                    `- [ ] Database passwords\n` +
                    `- [ ] Redis passwords\n` +
                    `- [ ] RabbitMQ passwords\n` +
                    `- [ ] API keys\n\n` +
                    `### Long-lived Secrets (180-day rotation)\n` +
                    `- [ ] JWT secrets\n` +
                    `- [ ] Service principal credentials\n` +
                    `- [ ] Azure Storage keys\n\n` +
                    `### Yearly Review\n` +
                    `- [ ] Payment provider keys\n` +
                    `- [ ] Third-party API keys\n\n` +
                    `### Process\n` +
                    `1. Generate new secret\n` +
                    `2. Update Azure Key Vault\n` +
                    `3. Deploy with new secret\n` +
                    `4. Verify application functionality\n` +
                    `5. Remove old secret\n` +
                    `6. Check this box when complete\n\n` +
                    `**Due Date:** ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`,
              labels: ['security', 'secret-rotation', 'high-priority'],
              assignees: process.env.SECURITY_TEAM ? process.env.SECURITY_TEAM.split(',') : []
            });

            console.log('Created issue:', issue.data.html_url);
```

---

## Fix 9: Add Required Status Check Configuration

### File: Create `.github/settings.yml` (for Probot Settings)

```yaml
# Repository settings

# Branch protection
branches:
  - name: main
    protection:
      required_status_checks:
        strict: true
        contexts:
          - "CI Pipeline Summary"
          - "Code Quality"
          - "Unit Tests"
          - "Integration Tests"
          - "Secret Scanning"
          - "Security Scan"
          - "Frontend Tests"
          - "Docker Build"
      required_pull_request_reviews:
        dismissal_restrictions: {}
        dismiss_stale_reviews: true
        require_code_owner_reviews: true
        required_approving_review_count: 2
      restrictions: null
      enforce_admins: true
      required_linear_history: false
      allow_force_pushes: false
      allow_deletions: false
      required_conversation_resolution: true

  - name: develop
    protection:
      required_status_checks:
        strict: true
        contexts:
          - "CI Pipeline Summary"
          - "Code Quality"
          - "Unit Tests"
          - "Secret Scanning"
      required_pull_request_reviews:
        dismissal_restrictions: {}
        dismiss_stale_reviews: true
        require_code_owner_reviews: false
        required_approving_review_count: 1
      restrictions: null
      enforce_admins: false
      required_linear_history: false
      allow_force_pushes: false
      allow_deletions: false
      required_conversation_resolution: true
```

---

## Fix 10: Update CI Summary to Fail on Critical Issues

### File: `.github/workflows/main-ci.yml`

**Line 774-784 - BEFORE:**
```yaml
- name: Check overall status
  run: |
    if [[ "${{ needs.code-quality.result }}" == "failure" ]] || \
       [[ "${{ needs.unit-tests.result }}" == "failure" ]] || \
       [[ "${{ needs.secret-scanning.result }}" == "failure" ]] || \
       [[ "${{ needs.security-sast.result }}" == "failure" ]]; then
      echo "::error::CI Pipeline has critical failures"
      exit 1
    fi
    echo "::notice::CI Pipeline completed successfully"
```

**AFTER:**
```yaml
- name: Check overall status
  run: |
    FAILED=0

    # Critical checks that must pass
    if [[ "${{ needs.code-quality.result }}" == "failure" ]]; then
      echo "::error::Code quality checks failed"
      FAILED=1
    fi

    if [[ "${{ needs.unit-tests.result }}" == "failure" ]]; then
      echo "::error::Unit tests failed"
      FAILED=1
    fi

    if [[ "${{ needs.integration-tests.result }}" == "failure" ]]; then
      echo "::error::Integration tests failed"
      FAILED=1
    fi

    if [[ "${{ needs.secret-scanning.result }}" == "failure" ]]; then
      echo "::error::Secret scanning found leaked credentials"
      FAILED=1
    fi

    if [[ "${{ needs.security-sast.result }}" == "failure" ]]; then
      echo "::error::Security SAST found critical vulnerabilities"
      FAILED=1
    fi

    if [[ "${{ needs.dependency-scan.result }}" == "failure" ]]; then
      echo "::error::Dependency scan found critical vulnerabilities"
      FAILED=1
    fi

    if [[ "${{ needs.frontend-tests.result }}" == "failure" ]]; then
      echo "::error::Frontend tests failed"
      FAILED=1
    fi

    # Exit with failure if any critical check failed
    if [ $FAILED -eq 1 ]; then
      echo "::error::CI Pipeline has critical failures that must be fixed before merging"
      exit 1
    fi

    echo "::notice::✅ All CI Pipeline checks passed successfully"
```

---

## Testing the Fixes

### 1. Test Branch Protection
```bash
# Try to push directly to main (should fail)
git checkout main
git commit --allow-empty -m "test: direct push"
git push origin main
# Expected: rejected by remote

# Try to merge without reviews (should fail in GitHub UI)
```

### 2. Test Quality Gates
```bash
# Create a branch with linting errors
git checkout -b test/quality-gates
echo "var x=1" > test-lint-error.js
git add test-lint-error.js
git commit -m "test: lint error"
git push origin test/quality-gates
# Expected: CI fails on ESLint check

# Create PR and verify it's blocked
```

### 3. Test Coverage Threshold
```bash
# Temporarily lower test coverage
# Remove some tests from a service
git push
# Expected: CI fails on coverage check
```

### 4. Test Secret Detection
```bash
# Add a fake secret
echo "STRIPE_KEY=sk_live_testabc123456789012345678" > .env
git add .env
git commit -m "test: secret"
git push
# Expected: Blocked by Gitleaks, PR blocked, security issue created
```

---

## Rollout Plan

### Phase 1: Non-Breaking Changes (Week 1)
1. ✅ Add test coverage checks (warn only first)
2. ✅ Add performance budgets (warn only first)
3. ✅ Create secret rotation workflow
4. ✅ Update documentation

### Phase 2: Quality Gate Enforcement (Week 2)
1. ✅ Remove continue-on-error from ESLint
2. ✅ Remove continue-on-error from Prettier
3. ✅ Remove continue-on-error from TypeScript
4. ✅ Make test coverage blocking
5. ✅ Notify team of changes

### Phase 3: Security Enforcement (Week 3)
1. ✅ Make SAST findings blocking
2. ✅ Make container scans blocking
3. ✅ Make dependency audit blocking
4. ✅ Update security runbooks

### Phase 4: Branch Protection (Week 4)
1. ✅ Configure branch protection for main
2. ✅ Configure branch protection for develop
3. ✅ Configure environment protections
4. ✅ Test and validate

---

## Validation Checklist

After applying all fixes:

- [ ] Branch protection rules configured
- [ ] ESLint blocks on errors
- [ ] Prettier blocks on formatting issues
- [ ] TypeScript blocks on type errors
- [ ] Unit tests block on failures
- [ ] Integration tests block on failures
- [ ] Test coverage threshold enforced (80%)
- [ ] npm audit blocks on CRITICAL vulnerabilities
- [ ] Container scans block on CRITICAL/HIGH
- [ ] SAST findings block on CRITICAL/HIGH
- [ ] Secret scanning blocks (already working)
- [ ] Production environment requires approval
- [ ] Performance budgets enforced
- [ ] Secret rotation reminders active
- [ ] All workflows documented
- [ ] Team trained on new gates

---

## Support & Rollback

### If Issues Arise

1. **Temporary Bypass** (Emergency Only):
   ```bash
   # Add to workflow inputs
   bypass_quality_gates:
     description: 'Emergency bypass (requires approval)'
     type: boolean
     default: false
   ```

2. **Rollback Branch Protection**:
   - GitHub Settings → Branches
   - Edit rule → Disable temporarily

3. **Rollback Workflow Changes**:
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

### Contact

- **Slack:** #devops
- **Email:** devops@flamoral.com
- **On-Call:** Check PagerDuty

---

**Last Updated:** December 16, 2024
**Next Review:** After implementation complete
**Owner:** DevOps Team
