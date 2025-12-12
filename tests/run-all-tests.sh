#!/bin/bash

###############################################################################
# Flamoral Dating Platform - Comprehensive Test Suite Runner
# Runs all tests in sequence and generates combined report
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPORT_DIR="./test-reports"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
REPORT_FILE="$REPORT_DIR/test-summary-$TIMESTAMP.txt"

# Create report directory
mkdir -p "$REPORT_DIR"

# Initialize report
echo "Flamoral Dating Platform - Test Suite Report" > "$REPORT_FILE"
echo "Generated: $(date)" >> "$REPORT_FILE"
echo "=========================================" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Function to print colored output
print_status() {
    local status=$1
    local message=$2

    case $status in
        "info")
            echo -e "${BLUE}[INFO]${NC} $message"
            ;;
        "success")
            echo -e "${GREEN}[SUCCESS]${NC} $message"
            ;;
        "warning")
            echo -e "${YELLOW}[WARNING]${NC} $message"
            ;;
        "error")
            echo -e "${RED}[ERROR]${NC} $message"
            ;;
    esac
}

# Function to run test suite
run_test_suite() {
    local name=$1
    local command=$2

    print_status "info" "Running $name..."
    echo "## $name" >> "$REPORT_FILE"

    if eval "$command" >> "$REPORT_FILE" 2>&1; then
        print_status "success" "$name completed successfully"
        echo "Status: PASSED" >> "$REPORT_FILE"
    else
        print_status "error" "$name failed"
        echo "Status: FAILED" >> "$REPORT_FILE"
    fi

    echo "" >> "$REPORT_FILE"
}

# Main execution
main() {
    print_status "info" "Starting Flamoral Test Suite..."
    echo ""

    # 1. Unit Tests (if they exist)
    # run_test_suite "Unit Tests" "npm run test:unit"

    # 2. Integration Tests
    print_status "info" "=== Integration Tests ==="
    run_test_suite "Integration Tests" "cd tests/integration && npm test"

    # 3. E2E Tests - Web
    print_status "info" "=== Web E2E Tests ==="
    run_test_suite "Cypress E2E Tests" "cd apps/web-app && npx cypress run"

    # 4. E2E Tests - Mobile (conditionally run if emulator/simulator is available)
    if command -v detox &> /dev/null; then
        print_status "info" "=== Mobile E2E Tests ==="
        # run_test_suite "Detox iOS Tests" "cd apps/mobile-app && detox test --configuration ios.sim.debug"
        # run_test_suite "Detox Android Tests" "cd apps/mobile-app && detox test --configuration android.emu.debug"
        print_status "warning" "Mobile E2E tests skipped (requires emulator/simulator)"
    else
        print_status "warning" "Detox not found, skipping mobile E2E tests"
    fi

    # 5. Contract Tests
    print_status "info" "=== Contract Tests ==="
    run_test_suite "Pact Contract Tests" "cd tests/contract && npm test"

    # 6. Performance Benchmarks
    print_status "info" "=== Performance Benchmarks ==="
    run_test_suite "Performance Benchmarks" "cd tests/performance && npm run benchmark"

    # 7. Load Tests (conditionally run)
    if command -v k6 &> /dev/null; then
        print_status "info" "=== Load Tests ==="
        run_test_suite "k6 Load Tests" "k6 run tests/load/k6-load-test.js --quiet"
    else
        print_status "warning" "k6 not found, skipping load tests"
    fi

    if command -v artillery &> /dev/null; then
        run_test_suite "Artillery Load Tests" "artillery run tests/load/artillery-config.yml"
    else
        print_status "warning" "Artillery not found, skipping Artillery tests"
    fi

    # 8. Security Tests (conditionally run if ZAP is available)
    if command -v zap.sh &> /dev/null || command -v zap-cli &> /dev/null; then
        print_status "info" "=== Security Tests ==="
        # run_test_suite "OWASP ZAP Security Scan" "python tests/security/zap-baseline-scan.py"
        print_status "warning" "Security tests skipped (requires manual ZAP setup)"
    else
        print_status "warning" "OWASP ZAP not found, skipping security tests"
    fi

    # 9. Chaos Tests
    print_status "info" "=== Chaos Engineering Tests ==="
    run_test_suite "Chaos Tests" "cd tests/chaos && npm run chaos"

    # 10. Accessibility Tests
    print_status "info" "=== Accessibility Tests ==="
    run_test_suite "Accessibility Tests" "cd apps/web-app && npx cypress run --spec 'cypress/e2e/accessibility.cy.ts'"

    # 11. Visual Regression Tests (conditionally run)
    if command -v backstop &> /dev/null; then
        print_status "info" "=== Visual Regression Tests ==="
        # run_test_suite "BackstopJS Visual Tests" "cd tests/visual && backstop test"
        print_status "warning" "Visual regression tests skipped (requires reference images)"
    else
        print_status "warning" "BackstopJS not found, skipping visual regression tests"
    fi

    # Summary
    echo ""
    print_status "info" "=== Test Suite Complete ==="
    print_status "info" "Report saved to: $REPORT_FILE"

    # Count passed/failed
    local passed=$(grep -c "Status: PASSED" "$REPORT_FILE" || true)
    local failed=$(grep -c "Status: FAILED" "$REPORT_FILE" || true)

    echo ""
    echo "Summary:" >> "$REPORT_FILE"
    echo "  Passed: $passed" >> "$REPORT_FILE"
    echo "  Failed: $failed" >> "$REPORT_FILE"

    print_status "info" "Tests Passed: $passed"
    print_status "info" "Tests Failed: $failed"

    if [ "$failed" -gt 0 ]; then
        print_status "error" "Some tests failed!"
        exit 1
    else
        print_status "success" "All tests passed!"
        exit 0
    fi
}

# Run main function
main "$@"
