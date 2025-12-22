#!/bin/bash
# Flamoral Platform - Release Readiness Gate
# Comprehensive pre-deployment validation checklist

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
REQUIRED_COVERAGE=70
REQUIRED_PASS_RATE=95

# Gate status
declare -A GATES
TOTAL_GATES=0
PASSED_GATES=0
FAILED_GATES=0
BLOCKED_GATES=0

# Utility functions
log_header() {
    echo ""
    echo -e "${CYAN}┌──────────────────────────────────────────────────────────┐${NC}"
    echo -e "${CYAN}│ $1$(printf '%*s' $((56 - ${#1})) '')│${NC}"
    echo -e "${CYAN}└──────────────────────────────────────────────────────────┘${NC}"
}

log_subheader() {
    echo -e "\n${BLUE}  ▶ $1${NC}"
}

gate_pass() {
    local gate_name=$1
    echo -e "    ${GREEN}✓${NC} $gate_name"
    GATES[$gate_name]="PASS"
    ((PASSED_GATES++))
    ((TOTAL_GATES++))
}

gate_fail() {
    local gate_name=$1
    local reason=${2:-"Check failed"}
    echo -e "    ${RED}✗${NC} $gate_name"
    echo -e "      ${RED}Reason: $reason${NC}"
    GATES[$gate_name]="FAIL"
    ((FAILED_GATES++))
    ((TOTAL_GATES++))
}

gate_warn() {
    local gate_name=$1
    local reason=${2:-"Warning"}
    echo -e "    ${YELLOW}⚠${NC} $gate_name"
    echo -e "      ${YELLOW}$reason${NC}"
    GATES[$gate_name]="WARN"
    ((TOTAL_GATES++))
}

gate_block() {
    local gate_name=$1
    local reason=${2:-"Blocking issue"}
    echo -e "    ${MAGENTA}◼${NC} $gate_name (BLOCKED)"
    echo -e "      ${MAGENTA}$reason${NC}"
    GATES[$gate_name]="BLOCKED"
    ((BLOCKED_GATES++))
    ((TOTAL_GATES++))
}

# Gate 1: Version Control
check_version_control() {
    log_header "Gate 1: Version Control"

    cd "$PROJECT_ROOT"

    # Check current branch
    log_subheader "Branch Verification"
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

    if [ "$CURRENT_BRANCH" = "main" ] || [ "$CURRENT_BRANCH" = "release/"* ]; then
        gate_pass "On deployment branch: $CURRENT_BRANCH"
    else
        gate_warn "Not on main/release branch: $CURRENT_BRANCH" "Deploying from feature branch"
    fi

    # Check for uncommitted changes
    log_subheader "Working Directory Status"
    if git diff-index --quiet HEAD -- 2>/dev/null; then
        gate_pass "No uncommitted changes"
    else
        gate_fail "Uncommitted changes detected" "Commit or stash changes before release"
    fi

    # Check if branch is up to date
    log_subheader "Remote Sync"
    git fetch origin 2>/dev/null || true
    LOCAL=$(git rev-parse HEAD 2>/dev/null)
    REMOTE=$(git rev-parse origin/$CURRENT_BRANCH 2>/dev/null || echo "unknown")

    if [ "$LOCAL" = "$REMOTE" ]; then
        gate_pass "Branch is up to date with remote"
    elif [ "$REMOTE" = "unknown" ]; then
        gate_warn "Cannot verify remote sync" "Remote branch not found"
    else
        gate_warn "Branch is behind/ahead of remote" "Consider syncing before deploy"
    fi
}

# Gate 2: Code Quality
check_code_quality() {
    log_header "Gate 2: Code Quality"

    cd "$PROJECT_ROOT"

    # TypeScript compilation
    log_subheader "TypeScript Compilation"
    if [ -f "backend/shared/tsconfig.json" ]; then
        cd backend/shared
        if npx tsc --noEmit 2>/dev/null; then
            gate_pass "Shared library compiles"
        else
            gate_fail "Shared library has TypeScript errors"
        fi
        cd "$PROJECT_ROOT"
    fi

    # ESLint check
    log_subheader "Linting"
    if [ -f "backend/.eslintrc.js" ] || [ -f "backend/.eslintrc.json" ]; then
        cd backend
        if npx eslint . --quiet --max-warnings 0 2>/dev/null; then
            gate_pass "No linting errors"
        else
            gate_warn "Linting warnings/errors detected"
        fi
        cd "$PROJECT_ROOT"
    else
        gate_warn "ESLint not configured" "Consider adding linting"
    fi
}

# Gate 3: Test Coverage
check_test_coverage() {
    log_header "Gate 3: Test Coverage"

    cd "$PROJECT_ROOT"

    log_subheader "Unit Test Execution"
    # Check if tests exist and run
    test_dirs=("backend/services/auth-service" "backend/services/user-service")

    for dir in "${test_dirs[@]}"; do
        service_name=$(basename "$dir")
        if [ -d "$dir" ]; then
            cd "$dir"
            if [ -f "package.json" ] && grep -q '"test"' package.json; then
                if npm test --if-present 2>/dev/null; then
                    gate_pass "$service_name tests pass"
                else
                    gate_fail "$service_name tests fail"
                fi
            else
                gate_warn "$service_name has no tests"
            fi
            cd "$PROJECT_ROOT"
        fi
    done
}

# Gate 4: Security
check_security() {
    log_header "Gate 4: Security"

    cd "$PROJECT_ROOT"

    # npm audit
    log_subheader "Dependency Vulnerabilities"
    cd backend 2>/dev/null || cd "$PROJECT_ROOT"

    if npm audit --audit-level=critical 2>/dev/null; then
        gate_pass "No critical vulnerabilities"
    else
        gate_fail "Critical vulnerabilities detected" "Run npm audit fix"
    fi

    cd "$PROJECT_ROOT"

    # Secrets check
    log_subheader "Secret Detection"

    secrets_found=false
    if grep -rE "(?i)(password|secret|api_key|private_key)\s*[:=]\s*['\"][^'\"]{8,}['\"]" \
        --include="*.ts" --include="*.js" --include="*.json" \
        backend/ 2>/dev/null | grep -v "node_modules" | grep -v ".env" | head -1 &>/dev/null; then
        secrets_found=true
    fi

    if [ "$secrets_found" = false ]; then
        gate_pass "No hardcoded secrets detected"
    else
        gate_fail "Potential hardcoded secrets found" "Remove secrets from code"
    fi

    # .env protection
    log_subheader "Environment File Protection"
    if grep -q "\.env" .gitignore 2>/dev/null; then
        gate_pass ".env files in .gitignore"
    else
        gate_fail ".env files may be committed" "Add .env to .gitignore"
    fi
}

# Gate 5: Docker Images
check_docker() {
    log_header "Gate 5: Docker Images"

    cd "$PROJECT_ROOT"

    log_subheader "Dockerfile Validation"

    services=("auth-service" "user-service" "matching-service" "messaging-service" "payment-service" "media-service")

    for svc in "${services[@]}"; do
        svc_path="backend/services/$svc"
        if [ -d "$svc_path" ]; then
            if [ -f "$svc_path/Dockerfile" ] || [ -f "$svc_path/Dockerfile.prod" ]; then
                gate_pass "$svc has Dockerfile"
            else
                gate_warn "$svc missing Dockerfile"
            fi
        fi
    done
}

# Gate 6: Documentation
check_documentation() {
    log_header "Gate 6: Documentation"

    cd "$PROJECT_ROOT"

    log_subheader "Required Documentation"

    # Check for key docs
    docs=(
        "docs/architecture/SYSTEM_MAP.md"
        "docs/architecture/API_INVENTORY.md"
        "docs/api/openapi-complete.yaml"
    )

    for doc in "${docs[@]}"; do
        if [ -f "$doc" ]; then
            gate_pass "$(basename $doc) exists"
        else
            gate_warn "$(basename $doc) missing"
        fi
    done

    # Check README
    if [ -f "README.md" ]; then
        if [ "$(wc -l < README.md)" -gt 50 ]; then
            gate_pass "README.md is comprehensive"
        else
            gate_warn "README.md may need more content"
        fi
    else
        gate_fail "README.md missing"
    fi
}

# Gate 7: Infrastructure
check_infrastructure() {
    log_header "Gate 7: Infrastructure Configuration"

    cd "$PROJECT_ROOT"

    log_subheader "Kubernetes Manifests"

    if [ -d "infrastructure/kubernetes" ]; then
        manifest_count=$(find infrastructure/kubernetes -name "*.yaml" | wc -l)
        if [ "$manifest_count" -gt 5 ]; then
            gate_pass "Kubernetes manifests present ($manifest_count files)"
        else
            gate_warn "Limited Kubernetes manifests"
        fi
    else
        gate_fail "Kubernetes manifests missing"
    fi

    log_subheader "Helm Charts"

    if [ -d "infrastructure/helm" ]; then
        gate_pass "Helm charts directory exists"
    else
        gate_warn "Helm charts not configured"
    fi

    log_subheader "Terraform Configuration"

    if [ -d "infrastructure/terraform" ]; then
        gate_pass "Terraform configuration exists"
    else
        gate_warn "Terraform not configured"
    fi
}

# Gate 8: CI/CD
check_cicd() {
    log_header "Gate 8: CI/CD Pipelines"

    cd "$PROJECT_ROOT"

    log_subheader "GitHub Actions Workflows"

    if [ -d ".github/workflows" ]; then
        workflow_count=$(find .github/workflows -name "*.yml" -o -name "*.yaml" | wc -l)

        if [ "$workflow_count" -gt 0 ]; then
            gate_pass "GitHub Actions configured ($workflow_count workflows)"
        else
            gate_warn "No workflow files found"
        fi

        # Check for specific workflows
        if [ -f ".github/workflows/nightly-health-check.yml" ]; then
            gate_pass "Nightly health check configured"
        else
            gate_warn "Nightly health check not configured"
        fi
    else
        gate_fail "GitHub Actions not configured"
    fi
}

# Gate 9: Monitoring & Observability
check_monitoring() {
    log_header "Gate 9: Monitoring & Observability"

    cd "$PROJECT_ROOT"

    log_subheader "Health Check Endpoints"

    # Check if health endpoints are implemented
    health_files=$(grep -rl "'/health'" backend/services --include="*.ts" 2>/dev/null | wc -l)
    if [ "$health_files" -gt 0 ]; then
        gate_pass "Health endpoints implemented in $health_files services"
    else
        gate_warn "Health endpoints not found"
    fi

    log_subheader "Logging Configuration"

    if grep -r "winston\|pino\|bunyan" backend/services --include="*.ts" 2>/dev/null | head -1 &>/dev/null; then
        gate_pass "Structured logging configured"
    else
        gate_warn "Structured logging not detected"
    fi
}

# Gate 10: Environment Readiness
check_environment() {
    log_header "Gate 10: Environment Readiness"

    log_subheader "Environment Variables"

    # Check for .env.example
    if [ -f ".env.example" ] || [ -f "backend/.env.example" ]; then
        gate_pass "Environment template exists"
    else
        gate_warn "No .env.example template"
    fi

    log_subheader "Azure CLI"

    if command -v az &>/dev/null; then
        az_version=$(az --version 2>/dev/null | head -1)
        gate_pass "Azure CLI available"
    else
        gate_warn "Azure CLI not installed"
    fi

    log_subheader "kubectl"

    if command -v kubectl &>/dev/null; then
        gate_pass "kubectl available"
    else
        gate_warn "kubectl not installed"
    fi
}

# Generate summary
generate_summary() {
    log_header "Release Readiness Summary"

    echo ""
    echo -e "  ${CYAN}Total Gates:${NC}    $TOTAL_GATES"
    echo -e "  ${GREEN}Passed:${NC}         $PASSED_GATES"
    echo -e "  ${RED}Failed:${NC}         $FAILED_GATES"
    echo -e "  ${MAGENTA}Blocked:${NC}        $BLOCKED_GATES"
    echo ""

    # Calculate readiness percentage
    if [ $TOTAL_GATES -gt 0 ]; then
        readiness=$(echo "scale=1; $PASSED_GATES * 100 / $TOTAL_GATES" | bc 2>/dev/null || echo "0")
        echo -e "  ${CYAN}Readiness:${NC}      ${readiness}%"
        echo ""
    fi

    # Final verdict
    if [ $FAILED_GATES -eq 0 ] && [ $BLOCKED_GATES -eq 0 ]; then
        echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║              RELEASE GATE: APPROVED FOR DEPLOYMENT            ║${NC}"
        echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
        return 0
    elif [ $BLOCKED_GATES -gt 0 ]; then
        echo -e "${MAGENTA}╔═══════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${MAGENTA}║              RELEASE GATE: BLOCKED - CRITICAL ISSUES          ║${NC}"
        echo -e "${MAGENTA}╚═══════════════════════════════════════════════════════════════╝${NC}"
        return 2
    else
        echo -e "${YELLOW}╔═══════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${YELLOW}║              RELEASE GATE: NEEDS ATTENTION                    ║${NC}"
        echo -e "${YELLOW}╚═══════════════════════════════════════════════════════════════╝${NC}"
        return 1
    fi
}

# Main execution
main() {
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║         Flamoral Platform - Release Readiness Gate           ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  Started: $(date)"
    echo "  Project: $PROJECT_ROOT"
    echo ""

    # Run all gate checks
    check_version_control
    check_code_quality
    check_test_coverage
    check_security
    check_docker
    check_documentation
    check_infrastructure
    check_cicd
    check_monitoring
    check_environment

    # Generate and show summary
    generate_summary
    exit_code=$?

    echo ""
    echo "  Completed: $(date)"
    echo ""

    exit $exit_code
}

# Run specific gate or all
case "${1:-all}" in
    vcs)
        check_version_control
        ;;
    quality)
        check_code_quality
        ;;
    tests)
        check_test_coverage
        ;;
    security)
        check_security
        ;;
    docker)
        check_docker
        ;;
    docs)
        check_documentation
        ;;
    infra)
        check_infrastructure
        ;;
    cicd)
        check_cicd
        ;;
    monitoring)
        check_monitoring
        ;;
    env)
        check_environment
        ;;
    all|*)
        main
        ;;
esac
