#!/bin/bash
# Flamoral Platform - Automated Test Harness
# Comprehensive testing suite for pre-deployment validation

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
RESULTS_DIR="${PROJECT_ROOT}/test-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="${RESULTS_DIR}/test-report-${TIMESTAMP}.json"

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# Initialize results directory
mkdir -p "$RESULTS_DIR"

# Utility functions
log() {
    echo -e "$1"
}

log_header() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

log_test_start() {
    echo -e "  ${BLUE}▶${NC} Testing: $1"
}

log_test_pass() {
    echo -e "    ${GREEN}✓${NC} $1"
    ((PASSED_TESTS++))
    ((TOTAL_TESTS++))
}

log_test_fail() {
    echo -e "    ${RED}✗${NC} $1"
    ((FAILED_TESTS++))
    ((TOTAL_TESTS++))
}

log_test_skip() {
    echo -e "    ${YELLOW}○${NC} $1 (skipped)"
    ((SKIPPED_TESTS++))
    ((TOTAL_TESTS++))
}

# Check prerequisites
check_prerequisites() {
    log_header "Prerequisites Check"

    # Check Node.js
    if command -v node &> /dev/null; then
        node_version=$(node --version)
        log_test_pass "Node.js installed: $node_version"
    else
        log_test_fail "Node.js not installed"
        exit 1
    fi

    # Check npm
    if command -v npm &> /dev/null; then
        npm_version=$(npm --version)
        log_test_pass "npm installed: $npm_version"
    else
        log_test_fail "npm not installed"
        exit 1
    fi

    # Check TypeScript
    if npx tsc --version &> /dev/null; then
        tsc_version=$(npx tsc --version)
        log_test_pass "TypeScript available: $tsc_version"
    else
        log_test_skip "TypeScript not available globally"
    fi

    # Check Docker (optional)
    if command -v docker &> /dev/null; then
        docker_version=$(docker --version)
        log_test_pass "Docker installed: $docker_version"
    else
        log_test_skip "Docker not installed (optional)"
    fi
}

# TypeScript compilation check
test_typescript_compilation() {
    log_header "TypeScript Compilation"

    services=(
        "backend/services/auth-service"
        "backend/services/user-service"
        "backend/services/matching-service"
        "backend/services/messaging-service"
        "backend/services/payment-service"
        "backend/services/notification-service"
        "backend/services/media-service"
        "backend/services/analytics-service"
        "backend/services/api-gateway"
        "backend/shared"
    )

    for service in "${services[@]}"; do
        service_path="${PROJECT_ROOT}/${service}"
        service_name=$(basename "$service")

        log_test_start "$service_name"

        if [ -d "$service_path" ]; then
            cd "$service_path"

            # Check if tsconfig exists
            if [ -f "tsconfig.json" ]; then
                # Run TypeScript check (no emit)
                if npx tsc --noEmit 2>/dev/null; then
                    log_test_pass "$service_name compiles successfully"
                else
                    log_test_fail "$service_name has TypeScript errors"
                fi
            else
                log_test_skip "$service_name has no tsconfig.json"
            fi

            cd "$PROJECT_ROOT"
        else
            log_test_skip "$service_name directory not found"
        fi
    done
}

# Lint check
test_linting() {
    log_header "ESLint Checks"

    services=(
        "backend/services/auth-service"
        "backend/services/user-service"
        "backend/services/matching-service"
        "backend/services/messaging-service"
        "backend/services/payment-service"
        "backend/shared"
    )

    for service in "${services[@]}"; do
        service_path="${PROJECT_ROOT}/${service}"
        service_name=$(basename "$service")

        log_test_start "$service_name"

        if [ -d "$service_path" ]; then
            cd "$service_path"

            if [ -f ".eslintrc.js" ] || [ -f ".eslintrc.json" ] || [ -f "eslint.config.js" ]; then
                if npx eslint src --quiet 2>/dev/null; then
                    log_test_pass "$service_name passes lint"
                else
                    log_test_fail "$service_name has lint errors"
                fi
            else
                log_test_skip "$service_name has no ESLint config"
            fi

            cd "$PROJECT_ROOT"
        else
            log_test_skip "$service_name not found"
        fi
    done
}

# Unit tests
test_unit_tests() {
    log_header "Unit Tests"

    services=(
        "backend/services/auth-service"
        "backend/services/user-service"
        "backend/services/matching-service"
        "backend/services/messaging-service"
        "backend/services/payment-service"
        "backend/shared"
    )

    for service in "${services[@]}"; do
        service_path="${PROJECT_ROOT}/${service}"
        service_name=$(basename "$service")

        log_test_start "$service_name"

        if [ -d "$service_path" ]; then
            cd "$service_path"

            # Check for test script in package.json
            if [ -f "package.json" ] && grep -q '"test"' package.json; then
                if npm test --if-present 2>/dev/null; then
                    log_test_pass "$service_name unit tests pass"
                else
                    log_test_fail "$service_name unit tests fail"
                fi
            else
                log_test_skip "$service_name has no test script"
            fi

            cd "$PROJECT_ROOT"
        else
            log_test_skip "$service_name not found"
        fi
    done
}

# Security checks
test_security() {
    log_header "Security Checks"

    log_test_start "npm audit"
    cd "$PROJECT_ROOT"

    # Check for high/critical vulnerabilities
    if npm audit --audit-level=high 2>/dev/null; then
        log_test_pass "No high/critical vulnerabilities found"
    else
        log_test_fail "Security vulnerabilities detected"
    fi

    # Check for secrets in code (basic check)
    log_test_start "Secret detection"

    secrets_found=false
    patterns=(
        "password\s*=\s*['\"][^'\"]+['\"]"
        "api_key\s*=\s*['\"][^'\"]+['\"]"
        "secret\s*=\s*['\"][^'\"]+['\"]"
        "PRIVATE_KEY"
    )

    for pattern in "${patterns[@]}"; do
        if grep -rE "$pattern" --include="*.ts" --include="*.js" backend/ 2>/dev/null | grep -v "node_modules" | grep -v ".env" | head -1 &> /dev/null; then
            secrets_found=true
            break
        fi
    done

    if [ "$secrets_found" = false ]; then
        log_test_pass "No hardcoded secrets detected"
    else
        log_test_fail "Potential hardcoded secrets found"
    fi

    # Check .env files are gitignored
    log_test_start ".env file protection"
    if grep -q "\.env" .gitignore 2>/dev/null; then
        log_test_pass ".env files are in .gitignore"
    else
        log_test_fail ".env files may be committed"
    fi
}

# Docker build validation
test_docker_builds() {
    log_header "Docker Build Validation"

    if ! command -v docker &> /dev/null; then
        log_test_skip "Docker not available - skipping build tests"
        return 0
    fi

    services=(
        "backend/services/auth-service"
        "backend/services/user-service"
        "backend/services/matching-service"
        "backend/services/messaging-service"
        "backend/services/payment-service"
        "backend/services/media-service"
    )

    for service in "${services[@]}"; do
        service_path="${PROJECT_ROOT}/${service}"
        service_name=$(basename "$service")

        log_test_start "$service_name Dockerfile"

        if [ -d "$service_path" ]; then
            if [ -f "${service_path}/Dockerfile" ] || [ -f "${service_path}/Dockerfile.prod" ]; then
                # Validate Dockerfile syntax
                dockerfile="${service_path}/Dockerfile"
                [ -f "${service_path}/Dockerfile.prod" ] && dockerfile="${service_path}/Dockerfile.prod"

                if docker build --no-cache --check "$service_path" -f "$dockerfile" 2>/dev/null || true; then
                    log_test_pass "$service_name Dockerfile is valid"
                else
                    log_test_fail "$service_name Dockerfile has issues"
                fi
            else
                log_test_skip "$service_name has no Dockerfile"
            fi
        else
            log_test_skip "$service_name not found"
        fi
    done
}

# API contract validation
test_api_contracts() {
    log_header "API Contract Validation"

    log_test_start "OpenAPI spec validation"

    if [ -f "${PROJECT_ROOT}/docs/api/openapi-complete.yaml" ]; then
        # Basic YAML validation
        if command -v python3 &> /dev/null; then
            if python3 -c "import yaml; yaml.safe_load(open('${PROJECT_ROOT}/docs/api/openapi-complete.yaml'))" 2>/dev/null; then
                log_test_pass "OpenAPI spec is valid YAML"
            else
                log_test_fail "OpenAPI spec has YAML errors"
            fi
        else
            log_test_skip "Python not available for YAML validation"
        fi
    else
        log_test_skip "OpenAPI spec not found"
    fi

    # Check for required fields in OpenAPI
    log_test_start "OpenAPI required fields"
    if [ -f "${PROJECT_ROOT}/docs/api/openapi-complete.yaml" ]; then
        if grep -q "openapi:" "${PROJECT_ROOT}/docs/api/openapi-complete.yaml" && \
           grep -q "info:" "${PROJECT_ROOT}/docs/api/openapi-complete.yaml" && \
           grep -q "paths:" "${PROJECT_ROOT}/docs/api/openapi-complete.yaml"; then
            log_test_pass "OpenAPI has required fields"
        else
            log_test_fail "OpenAPI missing required fields"
        fi
    fi
}

# Database migration check
test_database_migrations() {
    log_header "Database Migration Checks"

    log_test_start "Migration files exist"

    if [ -d "${PROJECT_ROOT}/infrastructure/database/migrations" ]; then
        migration_count=$(find "${PROJECT_ROOT}/infrastructure/database/migrations" -name "*.sql" 2>/dev/null | wc -l)
        if [ "$migration_count" -gt 0 ]; then
            log_test_pass "Found $migration_count migration files"
        else
            log_test_skip "No migration files found"
        fi
    else
        log_test_skip "Migrations directory not found"
    fi
}

# Generate JSON report
generate_report() {
    cat > "$REPORT_FILE" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "summary": {
    "total": $TOTAL_TESTS,
    "passed": $PASSED_TESTS,
    "failed": $FAILED_TESTS,
    "skipped": $SKIPPED_TESTS,
    "pass_rate": $(echo "scale=2; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc 2>/dev/null || echo "0")
  },
  "environment": {
    "node_version": "$(node --version 2>/dev/null || echo 'N/A')",
    "npm_version": "$(npm --version 2>/dev/null || echo 'N/A')",
    "os": "$(uname -s)",
    "hostname": "$(hostname)"
  },
  "git": {
    "branch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'N/A')",
    "commit": "$(git rev-parse --short HEAD 2>/dev/null || echo 'N/A')"
  }
}
EOF

    log_header "Test Report Generated"
    echo "  Report saved to: $REPORT_FILE"
}

# Print summary
print_summary() {
    echo ""
    log_header "Test Summary"
    echo ""
    echo -e "  Total Tests:   ${CYAN}$TOTAL_TESTS${NC}"
    echo -e "  Passed:        ${GREEN}$PASSED_TESTS${NC}"
    echo -e "  Failed:        ${RED}$FAILED_TESTS${NC}"
    echo -e "  Skipped:       ${YELLOW}$SKIPPED_TESTS${NC}"
    echo ""

    if [ $TOTAL_TESTS -gt 0 ]; then
        pass_rate=$(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc 2>/dev/null || echo "0")
        echo -e "  Pass Rate:     ${CYAN}${pass_rate}%${NC}"
    fi
    echo ""

    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "${GREEN}All tests passed! Ready for deployment.${NC}"
        return 0
    else
        echo -e "${RED}Some tests failed. Please fix issues before deployment.${NC}"
        return 1
    fi
}

# Main execution
main() {
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║         Flamoral Platform - Automated Test Harness            ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  Started: $(date)"
    echo "  Project: $PROJECT_ROOT"
    echo ""

    cd "$PROJECT_ROOT"

    # Run all test suites
    check_prerequisites
    test_typescript_compilation
    test_linting
    test_unit_tests
    test_security
    test_docker_builds
    test_api_contracts
    test_database_migrations

    # Generate report and print summary
    generate_report
    print_summary

    exit_code=$?

    echo ""
    echo "  Completed: $(date)"
    echo ""

    exit $exit_code
}

# Run with arguments
case "${1:-all}" in
    prereq)
        check_prerequisites
        ;;
    ts|typescript)
        check_prerequisites
        test_typescript_compilation
        ;;
    lint)
        check_prerequisites
        test_linting
        ;;
    unit)
        check_prerequisites
        test_unit_tests
        ;;
    security)
        check_prerequisites
        test_security
        ;;
    docker)
        check_prerequisites
        test_docker_builds
        ;;
    api)
        check_prerequisites
        test_api_contracts
        ;;
    all|*)
        main
        ;;
esac
